import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function createHarness(response) {
  const calls = []
  const context = vm.createContext({ URLSearchParams })
  const api = new vm.SourceTextModule(await readFile(new URL('./mailTextApi.js', import.meta.url), 'utf8'), { context })
  const client = new vm.SyntheticModule(['requestJson'], function () {
    this.setExport('requestJson', async (path, options) => {
      calls.push({ path, options })
      return typeof response === 'function' ? response(path, options) : response
    })
  }, { context })
  await api.link(() => client)
  await api.evaluate()
  return { api: api.namespace, calls }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

test('looks up an exact item using the Item filter and maps the returned mail text', async () => {
  const harness = await createHarness({
    Data: [{ Id: '7', OfficeId: '4', Item: 'InVoIcE', Subject: 'Ämne', BodyHtml: '<p>Text</p>' }],
  })

  assert.deepEqual(plain(await harness.api.getMailTextByItem(' invoice ')), {
    id: 7,
    officeId: 4,
    item: 'InVoIcE',
    subject: 'Ämne',
    bodyHtml: '<p>Text</p>',
  })
  const url = new URL(harness.calls[0].path, 'http://localhost')
  assert.equal(url.pathname, '/mailtext')
  assert.equal(url.searchParams.get('Item'), 'invoice')
  assert.equal(url.searchParams.get('SearchTerm'), null)
  assert.equal(url.searchParams.get('PageSize'), '1')
})

test('returns null for missing or non-exact results and skips empty lookups', async () => {
  const empty = await createHarness({ data: [] })
  assert.equal(await empty.api.getMailTextByItem('INVOICE'), null)
  assert.equal(await empty.api.getMailTextByItem('  '), null)
  assert.equal(empty.calls.length, 1)

  const reminder = await createHarness({ data: [{ item: 'INVOICEREMINDER' }] })
  assert.equal(await reminder.api.getMailTextByItem('INVOICE'), null)
})

test('propagates request failures and rejects invalid response shapes', async () => {
  const failed = await createHarness(() => { throw new Error('Forbidden') })
  await assert.rejects(failed.api.getMailTextByItem('INVOICE'), /Forbidden/)

  const invalid = await createHarness({ message: 'Unexpected response' })
  await assert.rejects(invalid.api.getMailTextByItem('INVOICE'), /Invalid mail text response/)
})

test('existing free-text search remains independent of the exact item filter', async () => {
  const harness = await createHarness({ data: [{ id: 3, item: 'INVOICEREMINDER' }], totalRecords: 1 })
  const result = await harness.api.searchMailTexts({ searchTerm: ' invoice ' })
  const params = new URL(harness.calls[0].path, 'http://localhost').searchParams

  assert.equal(params.get('SearchTerm'), 'invoice')
  assert.equal(params.get('Item'), null)
  assert.equal(result.items[0].item, 'INVOICEREMINDER')
  assert.equal(result.totalCount, 1)
})
