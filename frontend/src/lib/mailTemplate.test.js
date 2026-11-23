import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCopyRecipients, buildMailContent, extractEmailAddresses } from './mailTemplate.js'

test('extracts and case-insensitively deduplicates addresses across separators and fields', () => {
  const values = ['  First@example.com; second@example.com,\nignored  ', null, 'FIRST@EXAMPLE.COM\tThird@example.com second@example.com']

  assert.deepEqual(extractEmailAddresses(...values), [
    'First@example.com',
    'second@example.com',
    'Third@example.com',
  ])
  assert.deepEqual(buildCopyRecipients(...values), [
    { email: 'First@example.com', doSend: false },
    { email: 'second@example.com', doSend: false },
    { email: 'Third@example.com', doSend: false },
  ])
  assert.deepEqual(extractEmailAddresses(), [])
})

test('replaces TPV and Hyr placeholders in every supported form without changing unknown tokens', () => {
  const templateText = [
    '[FAKTNR]', '[aonr]', '[FTGNAMN]',
    '[invoiceNr]', '{INVOICENR}', '{{invoiceNr}}',
    '[workorderNr]', '{workorderNr}', '{{workorderNr}}',
    '[reservationNr]', '{reservationNr}', '{{reservationNr}}',
    '[officeName]', '{officeName}', '{{OFFICENAME}}', '[unknown]',
  ].join(' | ')
  const expected = [
    '42', '42', 'Nord',
    '42', '42', '42',
    '42', '42', '42',
    '42', '42', '42',
    'Nord', 'Nord', 'Nord', '[unknown]',
  ].join(' | ')

  assert.deepEqual(buildMailContent({
    template: { subject: templateText, bodyHtml: templateText },
    kind: 'reservation',
    number: 42,
    officeName: '  Nord  ',
  }), { subject: expected, body: expected })
})

test('escapes plain text and inserted values and converts all common line endings', () => {
  const result = buildMailContent({
    template: { subject: 'Bokning [reservationNr]', bodyHtml: 'Hej [officeName] & < 7 > 2\r\nRad 2\r[reservationNr]\nSlut' },
    kind: 'reservation',
    number: 9,
    officeName: `A & <B> "'`,
  })

  assert.equal(result.subject, 'Bokning 9')
  assert.equal(result.body, 'Hej A &amp; &lt;B&gt; &quot;&#39; &amp; &lt; 7 &gt; 2<br>Rad 2<br>9<br>Slut')
})

test('preserves HTML markup and existing entities while escaping inserted values', () => {
  const result = buildMailContent({
    template: {
      subject: 'Faktura [FAKTNR]',
      bodyHtml: `<section title='[officeName]'><p>[FAKTNR] &amp; {{officeName}}</p></section>`,
    },
    kind: 'invoice',
    number: '1<&"',
    officeName: `A&B<"'>`,
  })

  assert.equal(result.subject, 'Faktura 1<&"')
  assert.equal(result.body, `<section title='A&amp;B&lt;&quot;&#39;&gt;'><p>1&lt;&amp;&quot; &amp; A&amp;B&lt;&quot;&#39;&gt;</p></section>`)
})

test('uses independent invoice and reservation fallbacks for empty template fields', () => {
  assert.deepEqual(buildMailContent({ kind: 'invoice', number: 0, officeName: ' A & B ' }), {
    subject: 'Faktura 0',
    body: 'Vänliga hälsningar A &amp; B',
  })
  assert.deepEqual(buildMailContent({
    template: { subject: ' ', bodyHtml: '\r\n' },
    kind: 'reservation',
    number: 'ABC',
    officeName: '<Nord>',
  }), {
    subject: 'Bokning ABC',
    body: 'Vänliga hälsningar &lt;Nord&gt;',
  })
  assert.deepEqual(buildMailContent({
    template: { subject: ' Egen [invoiceNr] ', bodyHtml: '' },
    kind: 'invoice',
    number: 12,
    officeName: '',
  }), { subject: 'Egen 12', body: 'Vänliga hälsningar' })
  assert.deepEqual(buildMailContent({
    template: { subject: '', bodyHtml: 'Egen text' },
    kind: 'reservation',
  }), { subject: 'Bokning', body: 'Egen text' })
})

test('does not interpret placeholder-like text inside inserted values as another placeholder', () => {
  assert.deepEqual(buildMailContent({
    template: { subject: '[FAKTNR] [officeName]', bodyHtml: '<p>[FAKTNR] [officeName]</p>' },
    kind: 'invoice',
    number: '[FTGNAMN]',
    officeName: '{invoiceNr}',
  }), {
    subject: '[FTGNAMN] {invoiceNr}',
    body: '<p>[FTGNAMN] {invoiceNr}</p>',
  })
})
