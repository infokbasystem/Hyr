export function getPdfFilename(contentDisposition, kind, number, id) {
  const header = typeof contentDisposition === 'string' ? contentDisposition : ''
  const extendedMatch = header.match(/filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i)
  const extendedValue = (extendedMatch?.[1] ?? extendedMatch?.[2] ?? '').trim()
  const encoded = extendedValue.match(/^UTF-8'[^']*'(.*)$/i)?.[1]
  let filename = ''

  if (encoded) {
    try {
      filename = decodeURIComponent(encoded)
    } catch {
      filename = ''
    }
  }

  if (!filename) {
    const match = header.match(/filename\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]*))/i)
    filename = (match?.[1]?.replace(/\\(.)/g, '$1') ?? match?.[2] ?? '').trim()
  }

  const basename = filename.split(/[\\/]/).pop()?.trim()
  return basename || `${kind}_${number ?? id}.pdf`
}
