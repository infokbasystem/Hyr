import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server
let PlacementSummary

before(async () => {
  server = await createServer({
    configFile: false,
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
  })
  ;({ default: PlacementSummary } = await server.ssrLoadModule('/src/components/PlacementSummary.jsx'))
})

after(async () => {
  await server?.close()
})

for (const { name, reservation, emptyText } of [
  { name: 'a pinned location', reservation: { placementLatitude: 57.7, placementLongitude: 11.97 } },
  { name: 'no location', reservation: {}, emptyText: 'Ingen plats vald' },
  { name: 'an address without coordinates', reservation: { placementStreet: 'Testgatan 1' }, emptyText: 'Ingen position vald' },
]) {
  test(`placement summary opens the editor for ${name}`, () => {
    let opens = 0
    const tree = PlacementSummary({ reservation, onOpen: () => { opens += 1 } })
    const button = tree.props.children.find((child) => child?.type === 'button')

    assert.ok(button)
    assert.equal(button.props.type, 'button')
    assert.equal(button.props['aria-haspopup'], 'dialog')
    assert.equal(button.props['aria-label'], 'Öppna placering')
    button.props.onClick()
    assert.equal(opens, 1)

    if (emptyText) assert.match(renderToStaticMarkup(tree), new RegExp(emptyText))
  })
}
