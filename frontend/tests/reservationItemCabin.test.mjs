import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import React from 'react'
import { createServer } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'

let server
let ReservationItemCabin
let ArticleSearchInput

before(async () => {
  server = await createServer({
    configFile: false,
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
  })
  ;({ default: ReservationItemCabin } = await server.ssrLoadModule('/src/pages/operations/ReservationItemCabin.jsx'))
  ;({ default: ArticleSearchInput } = await server.ssrLoadModule('/src/components/ArticleSearchInput.jsx'))
})

after(async () => {
  await server?.close()
})

function elements(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
}

function createCabin(overrides = {}) {
  const changes = []
  const props = {
    item: {
      itemId: 10,
      reservationItemArticles: [{ articleId: 1, quantity: 1.5, unitPrice: 12.5 }, { articleId: 2, quantity: 2, unitPrice: 0 }],
    },
    index: 3,
    onChange: (...args) => changes.push(args),
    onCabinSelect: () => {},
    onRemove: () => {},
    articleOptions: [
      { id: 1, articleNr: 'A1', name: 'Included', isActive: true },
      { id: 2, articleNr: 'B2', name: 'Inactive', isActive: false },
      { id: 3, articleNr: 'C3', name: 'Extra', isActive: true },
      { id: 4, articleNr: 'D4', name: 'Unavailable', isActive: false },
    ],
    ...overrides,
  }
  let tree
  function CaptureCabin() {
    tree = ReservationItemCabin(props)
    return null
  }
  renderToStaticMarkup(React.createElement(CaptureCabin))
  const nodes = elements(tree)
  return {
    changes,
    tree,
    nodes,
    searchInputs: nodes.filter(node => node.type === ArticleSearchInput),
    addRowButton: nodes.find(node => node.type === 'button' && node.props.children === '+ Lägg till artikel'),
  }
}

test('cabin note supports multiple lines and updates the delivery note', () => {
  const { tree, nodes, changes } = createCabin({
    item: { itemId: 10, deliveryPlaceNote: 'Första raden\nAndra raden' },
  })
  const note = nodes.find(node => node.props?.label === 'Notering')
  assert.match(renderToStaticMarkup(tree), /<textarea[^>]*>Första raden\nAndra raden<\/textarea>/)
  note.props.onChange('Leverans\nAndra raden')
  assert.deepEqual(changes, [[3, 'deliveryPlaceNote', 'Leverans\nAndra raden']])
})

test('cabin shows saved article names without numbers, including inactive articles', () => {
  const { tree, searchInputs } = createCabin()
  const html = renderToStaticMarkup(tree)
  assert.equal(searchInputs.length, 0)
  assert.match(html, />Included<\/div>/)
  assert.match(html, />Inactive \(inaktiv\)<\/div>/)
  assert.doesNotMatch(html, />A1 - Included<\/div>/)
  assert.doesNotMatch(html, />B2 - Inactive/)
  assert.match(html, /1,5/)
  assert.match(html, /value="2"/)
})

test('cabin preserves numbers that are part of an article name', () => {
  const { tree } = createCabin({
    item: { itemId: 10, reservationItemArticles: [{ articleId: 101, quantity: 1 }] },
    articleOptions: [{ id: 101, articleNr: '101', name: '101 Toapåfyllning', isActive: true }],
  })
  assert.match(renderToStaticMarkup(tree), />101 Toapåfyllning<\/div>/)
})

test('selected rows remain labels while article options are unavailable', () => {
  const { tree, searchInputs } = createCabin({
    item: {
      itemId: 10,
      reservationItemArticles: [
        { articleId: 1, quantity: 1 },
        { articleId: 3, articleNr: 'C3', name: 'Extra cable', quantity: 1 },
      ],
    },
    articleOptions: [],
    isLoadingArticles: true,
  })
  const html = renderToStaticMarkup(tree)
  assert.equal(searchInputs.length, 0)
  assert.match(html, /Artikel 1/)
  assert.match(html, />Extra cable<\/div>/)
  assert.doesNotMatch(html, />C3 - Extra cable<\/div>/)
})

test('adding a row creates an invoice-style article search input and preserves existing links', () => {
  const { addRowButton, changes } = createCabin()
  addRowButton.props.onClick()
  const addedRow = changes[0][2][2]
  assert.equal(addedRow.articleId, null)
  assert.equal(addedRow.quantity, 1)
  assert.equal(addedRow.articleNr, '')
  assert.equal(addedRow.unitPrice, null)
  assert.equal(typeof addedRow._draftKey, 'string')
  assert.deepEqual(changes[0][2].slice(0, 2), [
    { articleId: 1, quantity: 1.5, unitPrice: 12.5 },
    { articleId: 2, quantity: 2, unitPrice: 0 },
  ])
  const { searchInputs } = createCabin({ item: { itemId: 10, reservationItemArticles: changes[0][2] } })
  assert.equal(searchInputs.length, 1)
  assert.equal(searchInputs[0].props.value, '')
  assert.equal(searchInputs[0].props.autoFocus, false)
  assert.equal(typeof searchInputs[0].props.onArticleSelect, 'function')
})

test('adding a row requests focus only for the new article search', () => {
  let searchInputs
  function CabinWithNewRow() {
    const [item, setItem] = React.useState({
      itemId: 10,
      reservationItemArticles: [{ _draftKey: 'existing', articleId: null }],
    })
    const tree = ReservationItemCabin({
      item,
      index: 0,
      onChange: (_index, field, value) => setItem(current => ({ ...current, [field]: value })),
      onCabinSelect: () => {},
      onRemove: () => {},
    })
    const nodes = elements(tree)
    if (item.reservationItemArticles.length === 1) {
      nodes.find(node => node.type === 'button' && node.props.children === '+ Lägg till artikel').props.onClick()
    }
    searchInputs = nodes.filter(node => node.type === ArticleSearchInput)
    return null
  }
  renderToStaticMarkup(React.createElement(CabinWithNewRow))
  assert.deepEqual(searchInputs.map(input => input.props.autoFocus), [false, true])
})

test('invoice-style article search selects a new article into the added row', () => {
  const { addRowButton, changes } = createCabin({
    item: { itemId: 10, reservationItemArticles: [{ articleId: 1, quantity: 1.5 }] },
  })
  addRowButton.props.onClick()
  const withDraft = changes[0][2]
  const { searchInputs, changes: selectionChanges } = createCabin({
    item: { itemId: 10, reservationItemArticles: withDraft },
  })
  searchInputs[0].props.onChange('C3')
  searchInputs[0].props.onArticleSelect({ id: 3, articleNr: 'C3', name: 'Extra cable', price: 19.95 })
  assert.equal(selectionChanges[1][2][1].articleId, 3)
  assert.equal(selectionChanges[1][2][1].articleNr, 'C3')
  assert.equal(selectionChanges[1][2][1].name, 'Extra cable')
  assert.equal(selectionChanges[1][2][1].quantity, 1)
  assert.equal(selectionChanges[1][2][1].unitPrice, 19.95)
  const selected = createCabin({ item: { itemId: 10, reservationItemArticles: selectionChanges[1][2] } })
  assert.equal(selected.searchInputs.length, 0)
  assert.match(renderToStaticMarkup(selected.tree), />Extra<\/div>/)
})

test('reservation article unit prices are editable independently and retain zero prices', () => {
  const { nodes, changes } = createCabin()
  const price = nodes.find(node => node.props?.['aria-label'] === 'À-pris för Included')
  assert.equal(price.props.value, 12.5)
  assert.equal(nodes.find(node => node.props?.['aria-label'] === 'À-pris för Inactive (inaktiv)').props.value, 0)
  price.props.onChange(8.76543)
  assert.deepEqual(changes[0], [3, 'reservationItemArticles', [
    { articleId: 1, quantity: 1.5, unitPrice: 8.76543 },
    { articleId: 2, quantity: 2, unitPrice: 0 },
  ]])
})

test('duplicate article selections leave the row empty and show an error', () => {
  const { addRowButton, changes } = createCabin({
    item: { itemId: 10, reservationItemArticles: [{ articleId: 1, quantity: 1.5 }] },
  })
  addRowButton.props.onClick()
  const withDraft = changes[0][2]
  const { searchInputs, changes: selectionChanges } = createCabin({
    item: { itemId: 10, reservationItemArticles: withDraft },
  })
  searchInputs[0].props.onArticleSelect({ id: 1, articleNr: 'A1', name: 'Already added' })
  assert.equal(selectionChanges[0][2][1].articleId, null)
  const { tree } = createCabin({ item: { itemId: 10, reservationItemArticles: selectionChanges[0][2] } })
  assert.match(renderToStaticMarkup(tree), /Artikeln finns redan på boden/)
})

test('removing the last article writes an explicit empty selection', () => {
  const { nodes, changes } = createCabin({
    item: { itemId: 10, reservationItemArticles: [{ articleId: 1, articleNr: 'A1', quantity: 1.5 }] },
  })
  nodes.find(node => node.props?.['aria-label'] === 'Ta bort artikel A1').props.onClick()
  assert.deepEqual(changes, [[3, 'reservationItemArticles', []]])
})

test('article editing is disabled while cabin defaults or article options are loading', () => {
  for (const loading of [{ isLoadingPrices: true }, { isLoadingArticles: true }]) {
    const { addRowButton, nodes } = createCabin(loading)
    assert.equal(addRowButton.props.disabled, true)
    assert.equal(nodes.find(node => node.props?.['aria-label'] === 'Ta bort artikel 1').props.disabled, true)
  }
  assert.equal(createCabin({ item: {} }).addRowButton.props.disabled, true)
})
