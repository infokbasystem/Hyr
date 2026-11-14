import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let saveArticle
let apiClient
let requestBody

before(async () => {
  globalThis.localStorage = { getItem: () => null }
  server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  })
  ;({ saveArticle } = await server.ssrLoadModule('/src/lib/articleApi.js'))
  ;({ default: apiClient } = await server.ssrLoadModule('/src/lib/apiClient.js'))
  apiClient.defaults.adapter = async (config) => {
    requestBody = JSON.parse(config.data)
    return { data: { ...requestBody, id: requestBody.id || 1 }, status: 200, headers: {}, config }
  }
})

after(async () => {
  await server?.close()
  delete globalThis.localStorage
})

test('saving a new article preserves empty optional account and VAT fields', async () => {
  await saveArticle({ id: null, articleNr: 'A1', name: 'Article', accountId: null, vatRateId: null })

  assert.equal(requestBody.id, 0)
  assert.equal(requestBody.accountId, null)
  assert.equal(requestBody.vatRateId, null)
})

test('saving an existing article preserves selected and cleared optional fields', async () => {
  await saveArticle({ id: 8, accountId: '12', vatRateId: '' })
  assert.equal(requestBody.id, 8)
  assert.equal(requestBody.accountId, 12)
  assert.equal(requestBody.vatRateId, null)

  await saveArticle({ id: 8, accountId: null, vatRateId: 7 })
  assert.equal(requestBody.accountId, null)
  assert.equal(requestBody.vatRateId, 7)
})
