import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server
let ReservationItemLift
let ArticleSearchInput

before(async () => {
  server = await createServer({
    configFile: false,
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
  })
  ;({ default: ReservationItemLift } = await server.ssrLoadModule('/src/pages/operations/ReservationItemLift.jsx'))
  ;({ default: ArticleSearchInput } = await server.ssrLoadModule('/src/components/ArticleSearchInput.jsx'))
})

after(async () => {
  await server?.close()
})

function elements(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
}

function createLift(overrides = {}) {
  const changes = []
  const selections = []
  const removals = []
  const tree = ReservationItemLift({
    item: {
      itemId: 10,
      itemName: 'L10',
      category: 'Saxlift',
      reservationItemArticles: [{ articleId: 1, articleNr: 'A1', quantity: 2, unitPrice: 0 }],
    },
    index: 3,
    onChange: (...args) => changes.push(args),
    onLiftSelect: (...args) => selections.push(args),
    onRemove: (...args) => removals.push(args),
    liftOptions: [],
    articleOptions: [
      { id: 1, name: 'Included', isActive: true },
      { id: 2, name: 'Extra', isActive: true },
    ],
    ...overrides,
  })
  const nodes = elements(tree)
  return { tree, nodes, changes, selections, removals }
}

test('lift card exposes cabin-style selection, prices and booking fields', () => {
  const { tree, nodes, changes, selections, removals } = createLift()
  const html = renderToStaticMarkup(tree)
  for (const heading of ['Bokningsinfo', 'Priser', 'Artiklar', 'TA BORT LIFT']) {
    assert.ok(html.includes(heading))
  }
  const liftSelect = nodes.find(node => node.props?.label === 'Lift')
  assert.deepEqual(liftSelect.props.items, [{ id: 10, name: 'L10', category: 'Saxlift' }])
  liftSelect.props.onChange(11)
  nodes.find(node => node.props?.label === 'Pris/dag').props.onChange(123.45)
  nodes.find(node => node.props?.label === 'Notering').props.onChange('Leverans\nAndra raden')
  nodes.find(node => node.props?.label === 'Hämtningsplats').props.onChange('Depån')
  nodes.find(node => node.props?.label === 'Debitkategori').props.onChange(4)
  nodes.find(node => node.props?.label === 'Incheckad').props.onChange(true)
  nodes.find(node => node.type === 'button' && node.props.children === 'TA BORT LIFT').props.onClick()
  assert.deepEqual(selections, [[3, 11]])
  assert.deepEqual(changes, [
    [3, 'pricePerDay', 123.45],
    [3, 'deliveryPlaceNote', 'Leverans\nAndra raden'],
    [3, 'pickupPlaceNote', 'Depån'],
    [3, 'debitCategoryId', 4],
    [3, 'isCheckedIn', true],
  ])
  assert.deepEqual(removals, [[3]])
})

test('lift articles support adding, editing and removing a booking-specific price', () => {
  const { nodes, changes } = createLift()
  assert.equal(nodes.find(node => node.props?.['aria-label'] === 'À-pris för Included').props.value, 0)
  nodes.find(node => node.type === 'button' && node.props.children === '+ Lägg till artikel').props.onClick()
  const rowsWithDraft = changes[0][2]
  const next = createLift({ item: { itemId: 10, reservationItemArticles: rowsWithDraft } })
  const search = next.nodes.find(node => node.type === ArticleSearchInput)
  search.props.onArticleSelect({ id: 2, articleNr: 'B2', name: 'Extra', price: 19.95 })
  const selectedRows = next.changes[0][2]
  assert.equal(selectedRows[1].articleId, 2)
  assert.equal(selectedRows[1].unitPrice, 19.95)
  const selected = createLift({ item: { itemId: 10, reservationItemArticles: selectedRows } })
  selected.nodes.find(node => node.props?.['aria-label'] === 'À-pris för Extra').props.onChange(8.5)
  assert.equal(selected.changes[0][2][1].unitPrice, 8.5)
  selected.nodes.find(node => node.props?.['aria-label'] === 'Ta bort artikel B2').props.onClick()
  assert.equal(selected.changes[1][2].length, 1)
})

test('duplicate lift articles are rejected and missing prices remain empty', () => {
  const lift = createLift()
  lift.nodes.find(node => node.type === 'button' && node.props.children === '+ Lägg till artikel').props.onClick()
  const withDraft = createLift({ item: { itemId: 10, reservationItemArticles: lift.changes[0][2] } })
  const search = withDraft.nodes.find(node => node.type === ArticleSearchInput)
  search.props.onArticleSelect({ id: 1, articleNr: 'A1', name: 'Included' })
  const duplicate = createLift({ item: { itemId: 10, reservationItemArticles: withDraft.changes[0][2] } })
  assert.match(renderToStaticMarkup(duplicate.tree), /Artikeln finns redan på liften/)
  search.props.onArticleSelect({ id: 2, articleNr: 'B2', name: 'Extra', price: null })
  assert.equal(withDraft.changes[1][2][1].unitPrice, null)
})

test('lift articles cannot be edited while their defaults are loading', () => {
  const lift = createLift({
    item: { itemId: 10, reservationItemArticles: [{ _draftKey: 'draft', articleId: null }] },
    isLoadingPrices: true,
    isLoadingLifts: true,
  })
  assert.equal(lift.nodes.find(node => node.props?.label === 'Lift').props.disabled, true)
  assert.equal(lift.nodes.find(node => node.props?.label === 'Pris/dag').props.disabled, true)
  assert.equal(lift.nodes.find(node => node.type === 'fieldset').props.disabled, true)
  assert.equal(lift.nodes.find(node => node.type === 'button' && node.props.children === '+ Lägg till artikel').props.disabled, true)
  lift.nodes.find(node => node.type === ArticleSearchInput).props.onArticleSelect({ id: 2, price: 10 })
  assert.deepEqual(lift.changes, [])
})
