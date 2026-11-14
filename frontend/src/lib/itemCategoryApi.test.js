import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function createHarness(response) {
  const calls = []
  const context = vm.createContext({ URLSearchParams })
  const api = new vm.SourceTextModule(await readFile(new URL('./itemCategoryApi.js', import.meta.url), 'utf8'), { context })
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

test('category article IDs survive save and load, including an explicit empty selection', async () => {
  const harness = await createHarness((_path, options) => ({ id: 1, ...options.body }))
  const saved = await harness.api.saveItemCategory({ name: 'Category', articleIds: [2, 3] })
  assert.deepEqual(plain(saved.articleIds), [2, 3])
  assert.deepEqual(plain(harness.calls[0].options.body.articleIds), [2, 3])
  await harness.api.saveItemCategory({ id: 1, articleIds: [] })
  assert.deepEqual(plain(harness.calls[1].options.body.articleIds), [])

  const read = await createHarness({ Id: 1, ArticleIds: [2, 3] })
  assert.deepEqual(plain((await read.api.getItemCategoryById(1)).articleIds), [2, 3])
})

test('category saves without article IDs preserve compatibility with older callers', async () => {
  const harness = await createHarness({ id: 1 })
  await harness.api.saveItemCategory({ id: 1, name: 'Rename only' })
  assert.equal('articleIds' in plain(harness.calls[0].options.body), false)
  assert.equal('articles' in plain(harness.calls[0].options.body), false)
})

test('category quantities survive saving and loading, including clearing all rows', async () => {
  const harness = await createHarness((_path, options) => ({ id: 1, ...options.body }))
  const articles = [{ articleId: 2, quantity: 1.23456 }, { articleId: 3, quantity: 2 }]
  const saved = await harness.api.saveItemCategory({ name: 'Category', articles })
  assert.deepEqual(plain(harness.calls[0].options.body.articles), articles)
  assert.deepEqual(plain(saved.articles), articles)

  await harness.api.saveItemCategory({ id: 1, articles: [] })
  assert.deepEqual(plain(harness.calls[1].options.body.articles), [])

  const read = await createHarness({ Id: 1, Articles: [{ ArticleId: 2, Quantity: 1.5 }] })
  assert.deepEqual(plain((await read.api.getItemCategoryById(1)).articles), [{ articleId: 2, quantity: 1.5 }])
})

test('legacy article IDs load as rows with quantity one', async () => {
  const harness = await createHarness({ id: 1, articleIds: [2, 3] })
  assert.deepEqual(plain((await harness.api.getItemCategoryById(1)).articles), [
    { articleId: 2, quantity: 1 },
    { articleId: 3, quantity: 1 },
  ])
})

test('category form options map article labels and surface request failures', async () => {
  const harness = await createHarness({ articles: [{ id: 2, articleNr: 'A2', name: 'Article', isActive: false, price: 12.34567 }] })
  assert.deepEqual(plain(await harness.api.getItemCategoryFormOptions()), {
    articles: [{ id: 2, articleNr: 'A2', name: 'Article', isActive: false, price: 12.34567 }],
  })
  assert.equal(harness.calls[0].path, '/itemcategory/form-options')
  const failed = await createHarness(() => { throw new Error('Forbidden') })
  await assert.rejects(failed.api.getItemCategoryFormOptions(), /Forbidden/)
})
