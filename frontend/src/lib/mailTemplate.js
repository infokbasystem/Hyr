const HTML_TAG_PATTERN = /<\/?[a-z][a-z0-9:-]*(?:\s+[^<>]*?)?\s*\/?>/i
const PLACEHOLDER_PATTERN = /\[([a-z][a-z0-9]*)\]|\{\{([a-z][a-z0-9]*)\}\}|\{([a-z][a-z0-9]*)\}/gi

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function plainTextToHtml(value) {
  return escapeHtml(value).replace(/\r\n?|\n/g, '<br>')
}

function replacePlaceholders(text, replacements, encode) {
  return String(text ?? '').replace(PLACEHOLDER_PATTERN, (match, bracketed, doubleBraced, braced) => {
    const key = (bracketed ?? doubleBraced ?? braced).toLowerCase()
    return Object.hasOwn(replacements, key) ? encode(replacements[key]) : match
  })
}

export function extractEmailAddresses(...values) {
  const seen = new Set()
  const addresses = []

  values.forEach((value) => {
    String(value ?? '').split(/[;,\s]+/).forEach((email) => {
      const key = email.toLowerCase()
      if (email.includes('@') && !seen.has(key)) {
        seen.add(key)
        addresses.push(email)
      }
    })
  })

  return addresses
}

export function buildCopyRecipients(...values) {
  return extractEmailAddresses(...values).map((email) => ({ email, doSend: false }))
}

export function buildMailContent({ template, kind, number, officeName }) {
  const numberText = number == null ? '' : String(number)
  const office = String(officeName ?? '').trim()
  const replacements = {
    faktnr: numberText,
    aonr: numberText,
    ftgnamn: office,
    invoicenr: numberText,
    workordernr: numberText,
    reservationnr: numberText,
    officename: office,
  }

  const templateSubject = String(template?.subject ?? '').trim()
  const subject = templateSubject
    ? replacePlaceholders(templateSubject, replacements, String)
    : `${kind === 'invoice' ? 'Faktura' : 'Bokning'} ${numberText}`.trim()

  const templateBody = String(template?.bodyHtml ?? '')
  const body = !templateBody.trim()
    ? plainTextToHtml(`Vänliga hälsningar ${office}`.trim())
    : HTML_TAG_PATTERN.test(templateBody)
      ? replacePlaceholders(templateBody, replacements, escapeHtml)
      : plainTextToHtml(replacePlaceholders(templateBody, replacements, String))

  return { subject, body }
}
