import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EmailModal from '../src/components/EmailModal';
import { PdfEmailComposer } from '../src/components/PdfPanel';
import { PdfProvider, usePdf } from '../src/contexts/PdfContext';
import apiClient from '../src/lib/apiClient';
import '../src/index.css';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalPost = apiClient.post;
const originalRequest = apiClient.request;
const originalFetch = window.fetch;
const sourceUrl = URL.createObjectURL(new Blob(['%PDF-1.4\noriginal bytes'], { type: 'application/pdf' }));
const fetchObjectUrl = (input, ...args) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('blob:')) throw new Error('Tests may fetch only local object URLs');
    return originalFetch(input, ...args);
};
const defaultProps = {
    initialSubject: 'Faktura',
    initialBody: '<p>Hej</p>',
    receiverList: [{ email: 'to@example.test', doSend: true }],
    ccMailList: [],
    sourceAttachmentUrl: sourceUrl,
    sourceAttachmentName: 'Faktura 42',
    invoiceId: 42,
};
const layoutProps = {
    initialSubject: 'Er faktura',
    initialBody: 'Hej. Bifogat finner ni er faktura 9<br><br>Mvh',
    ccMailList: [
        { email: 'info@example.test', doSend: false },
        { email: 'admin@example.test', doSend: false },
    ],
    sourceAttachmentName: 'invoice_9.pdf',
};
let calls = [];
let postImplementation = async () => ({ status: 200, data: { message: 'Skickat' } });

apiClient.post = (...args) => {
    calls.push(args);
    return postImplementation(...args);
};
window.fetch = fetchObjectUrl;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
    assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
}

async function waitFor(predicate, message) {
    for (let attempt = 0; attempt < 150; attempt += 1) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(message);
}

async function mount(overrides = {}) {
    const host = document.getElementById('root');
    const root = createRoot(host);
    let props = { ...defaultProps, ...overrides };
    await act(async () => root.render(<React.StrictMode><EmailModal {...props} /></React.StrictMode>));
    return {
        async update(changes) {
            props = { ...props, ...changes };
            await act(async () => root.render(<React.StrictMode><EmailModal {...props} /></React.StrictMode>));
        },
        async unmount() { await act(async () => root.unmount()); },
    };
}

async function mountComposer(overrides = {}) {
    const root = createRoot(document.getElementById('root'));
    const props = {
        document: { kind: 'invoice', id: 42, number: 42, customerId: 17 },
        sourceUrl,
        sourceName: 'invoice_42.pdf',
        userEmail: 'user@example.test',
        ...overrides,
    };
    await act(async () => root.render(<React.StrictMode><PdfEmailComposer {...props} /></React.StrictMode>));
    return { async unmount() { await act(async () => root.unmount()); } };
}

function pendingDefaultsRequests() {
    const createDeferred = () => {
        let resolve;
        let reject;
        const promise = new Promise((resolvePromise, rejectPromise) => {
            resolve = resolvePromise;
            reject = rejectPromise;
        });
        return { promise, resolve, reject };
    };
    const requests = { customer: createDeferred(), office: createDeferred(), template: createDeferred() };
    apiClient.request = ({ url }) => {
        if (url === '/customer/17') return requests.customer.promise;
        if (url === '/office/company-info') return requests.office.promise;
        if (url.startsWith('/mailtext?')) return requests.template.promise;
        throw new Error(`Unexpected request: ${url}`);
    };
    return requests;
}

async function resolveDefaults(requests) {
    await act(async () => {
        requests.customer.resolve({ data: { email: 'customer@example.test' } });
        requests.office.resolve({ data: { name: 'Testkontor', email: 'office@example.test' } });
        requests.template.resolve({ data: { data: [{ item: 'INVOICE', subject: 'Mall [FAKTNR]', bodyHtml: '<p>Hej från [FTGNAMN]</p>' }] } });
    });
}

function dialog() {
    const element = document.querySelector('[role="dialog"]');
    assert(element, 'Dialog is missing');
    return element;
}

function byLabel(label) {
    const element = dialog().querySelector(`[aria-label="${label}"]`);
    assert(element, `Missing control: ${label}`);
    return element;
}

function button(text) {
    const element = Array.from(dialog().querySelectorAll('button')).find((candidate) => candidate.textContent.trim() === text);
    assert(element, `Missing button: ${text}`);
    return element;
}

async function click(element) {
    await act(async () => { element.click(); });
}

async function setValue(element, value) {
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function selectAll(editor) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function fileTransfer(...files) {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    return transfer;
}

window.__measureEmailComposerLayout = async () => {
    const component = await mount(layoutProps);
    const modal = dialog().getBoundingClientRect();
    const editor = byLabel('Meddelande').getBoundingClientRect();
    const toolbar = byLabel('Textformatering');
    const centers = Array.from(toolbar.children, (element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2;
    });
    const measurements = {
        modalWidth: modal.width,
        modalTop: modal.top,
        editorHeight: editor.height,
        toolbarCenterSpread: Math.max(...centers) - Math.min(...centers),
        toolbarScrollWidth: toolbar.scrollWidth,
        toolbarClientWidth: toolbar.clientWidth,
    };
    await component.unmount();
    return measurements;
};

async function scenario(name, run) {
    window.__emailComposerTestProgress = name;
    calls = [];
    postImplementation = async () => ({ status: 200, data: { message: 'Skickat' } });
    await run();
    results.names.push(name);
    results.passed += 1;
}

const results = { passed: 0, names: [], error: null };
try {
    await scenario('two-column layout', async () => {
        const component = await mount(layoutProps);
        const grid = dialog().querySelector('form > div.grid');
        assert(getComputedStyle(grid).gridTemplateColumns.split(' ').length === 2, 'The desktop composer is not two columns');
        const modal = dialog().getBoundingClientRect();
        const editor = byLabel('Meddelande').getBoundingClientRect();
        assert(Math.abs(modal.width - 921.6) < 1 && Math.abs(modal.top - 72) < 1, 'Desktop modal size or position differs from TPV');
        assert(Math.abs(editor.width - 469.02) < 1 && Math.abs(editor.height - 259.2) < 1, 'Desktop editor size differs from TPV');
        await component.unmount();
    });

    await scenario('composer opens immediately without a loading dialog', async () => {
        const requests = pendingDefaultsRequests();
        const component = await mountComposer();
        assert(!document.body.textContent.includes('Hämtar e-postuppgifter'), 'A loading screen flashed before the composer');
        assert(!dialog().textContent.includes('Markera minst en mottagare'), 'A missing-recipient warning flashed while defaults were loading');
        assert(button('Skicka').disabled, 'Sending should wait for defaults or manual continuation');
        await resolveDefaults(requests);
        await waitFor(() => byLabel('Mottagare 1').value === 'customer@example.test', 'Customer defaults were not applied');
        assert(dialog().querySelector('#email-modal-subject').value === 'Mall 42', 'Template subject was not applied');
        assert(byLabel('Meddelande').textContent.includes('Hej från Testkontor'), 'Template body was not applied');
        assert(byLabel('Kopia 1').value === 'office@example.test' && byLabel('Kopia 2').value === 'user@example.test', 'Copy defaults were not applied');
        assert(!button('Skicka').disabled && !dialog().textContent.includes('Hämtar e-postuppgifter'), 'Fast defaults left a loading indication or disabled send');
        await component.unmount();
    });

    await scenario('reservation defaults load into the open composer', async () => {
        const requests = pendingDefaultsRequests();
        const component = await mountComposer({
            document: { kind: 'reservation', id: 73, number: 73, customerId: 17, email: 'booking@example.test; duplicate@example.test' },
        });
        assert(byLabel('Mottagare 1').value === 'booking@example.test' && button('Skicka').disabled, 'Available reservation addresses were not shown while loading');
        await act(async () => {
            requests.customer.resolve({ data: { email: 'duplicate@example.test; customer@example.test' } });
            requests.office.resolve({ data: { name: 'Testkontor', email: 'office@example.test' } });
            requests.template.resolve({ data: { data: [{ item: 'RESERVATION', subject: 'Bokning [AONR]', bodyHtml: '' }] } });
        });
        await waitFor(() => dialog().querySelector('[aria-label="Mottagare 3"]')?.value === 'customer@example.test', 'Reservation customer defaults were not applied');
        assert(byLabel('Mottagare 2').value === 'duplicate@example.test' && byLabel('Mottagare 4').value === '', 'Reservation addresses were not deduplicated');
        assert(dialog().querySelector('#email-modal-subject').value === 'Bokning 73' && !button('Skicka').disabled, 'Reservation template or send state was incorrect');
        await component.unmount();
    });

    await scenario('late defaults preserve edited fields', async () => {
        const requests = pendingDefaultsRequests();
        const component = await mountComposer();
        await setValue(dialog().querySelector('#email-modal-subject'), 'Eget ämne');
        await setValue(byLabel('Mottagare 1'), 'manual@example.test');
        await click(byLabel('Skicka till mottagare 1'));
        const editor = byLabel('Meddelande');
        await act(async () => {
            editor.innerHTML = '<p>Egen text</p>';
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await waitFor(() => dialog().textContent.includes('Fortsätt manuellt'), 'Slow loading did not offer manual continuation');
        await resolveDefaults(requests);
        await waitFor(() => byLabel('Kopia 1').value === 'office@example.test', 'Untouched copy defaults were not applied');
        assert(dialog().querySelector('#email-modal-subject').value === 'Eget ämne', 'Late template replaced the edited subject');
        assert(byLabel('Mottagare 1').value === 'manual@example.test', 'Late defaults replaced an edited recipient');
        assert(editor.textContent === 'Egen text', 'Late template replaced the edited message');
        assert(!button('Skicka').disabled && !dialog().textContent.includes('Hämtar e-postuppgifter'), 'Loading did not finish');
        await component.unmount();
    });

    await scenario('manual continuation ignores late defaults', async () => {
        const requests = pendingDefaultsRequests();
        const component = await mountComposer();
        await setValue(byLabel('Mottagare 1'), 'manual@example.test');
        await click(byLabel('Skicka till mottagare 1'));
        await waitFor(() => dialog().textContent.includes('Fortsätt manuellt'), 'Manual continuation did not appear');
        await click(button('Fortsätt manuellt'));
        assert(!button('Skicka').disabled && dialog().textContent.includes('Alla e-postuppgifter har inte hämtats'), 'Manual continuation was not enabled with a warning');
        await setValue(dialog().querySelector('#email-modal-subject'), 'Manuellt ämne');
        await resolveDefaults(requests);
        assert(dialog().querySelector('#email-modal-subject').value === 'Manuellt ämne' && byLabel('Mottagare 1').value === 'manual@example.test', 'Late defaults changed manual entries');
        assert(byLabel('Kopia 1').value === 'user@example.test', 'Late defaults changed the manual copy list');
        await component.unmount();
    });

    await scenario('closing while defaults load ignores the result', async () => {
        const requests = pendingDefaultsRequests();
        let closed = 0;
        const component = await mountComposer({ onClose: () => { closed += 1; } });
        await click(byLabel('Stäng'));
        assert(closed === 1, 'The composer could not be closed while defaults were loading');
        await component.unmount();
        await resolveDefaults(requests);
        assert(!document.querySelector('[role="dialog"]'), 'A late response reopened the closed composer');
    });

    await scenario('defaults errors remain visible in the composer', async () => {
        const requests = pendingDefaultsRequests();
        const component = await mountComposer();
        await act(async () => {
            requests.customer.reject(new Error('customer unavailable'));
            requests.office.resolve({ data: { name: 'Testkontor', email: 'office@example.test' } });
            requests.template.reject(new Error('template unavailable'));
        });
        await waitFor(() => dialog().textContent.includes('Kundens e-postadress kunde inte hämtas'), 'Customer lookup failure was not shown');
        assert(dialog().textContent.includes('E-postmallen kunde inte hämtas'), 'Template lookup failure was not shown');
        assert(byLabel('Kopia 1').value === 'office@example.test', 'Available defaults were discarded');
        await component.unmount();
    });

    await scenario('safe template and paste formatting', async () => {
        const component = await mount({
            initialBody: '<p><strong>Hej</strong><script>window.__unsafe = true</script><img src=x onerror="window.__unsafe = true"><a href="javascript:alert(1)">länk</a><span style="font-weight:700;font-size:20px;text-decoration:underline;background-image:url(https://bad.example/x)">text</span></p><ul><li>punkt</li></ul>',
        });
        const editor = byLabel('Meddelande');
        assert(editor.querySelector('strong') && editor.querySelector('ul li'), 'Safe template formatting was lost');
        assert(!editor.querySelector('script, img, [onerror]'), 'Unsafe template markup reached the editor');
        assert(!editor.innerHTML.includes('javascript:') && !editor.innerHTML.includes('background'), 'Unsafe URL or CSS reached the editor');
        const styled = editor.querySelector('span');
        assert(styled.style.fontWeight === '700' && styled.style.fontSize === '20px' && styled.style.textDecorationLine === 'underline', 'Supported inline formatting was lost');

        selectAll(editor);
        const clipboard = new DataTransfer();
        clipboard.setData('text/html', '<b>Inklistrad</b><img src=x onerror="window.__unsafe = true"><a href="javascript:alert(1)">länk</a>');
        clipboard.setData('text/plain', 'Inklistrad länk');
        await act(async () => editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard })));
        assert(editor.querySelector('b') && !editor.querySelector('img') && !editor.innerHTML.includes('javascript:'), 'Pasted HTML was not safely preserved');
        selectAll(editor);
        const droppedHtml = new DataTransfer();
        droppedHtml.setData('text/html', '<i onclick="window.__unsafe = true">Släppt</i><img src=x onerror="window.__unsafe = true">');
        await act(async () => editor.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: droppedHtml })));
        assert(editor.querySelector('i') && !editor.querySelector('img, [onclick]'), 'Dropped HTML was not safely preserved');
        assert(!window.__unsafe, 'Injected template or paste code executed');
        await component.unmount();
    });

    await scenario('rich-text toolbar commands', async () => {
        const component = await mount();
        const editor = byLabel('Meddelande');
        for (const [title, tag] of [['Fet', 'b'], ['Kursiv', 'i'], ['Understruken', 'u']]) {
            selectAll(editor);
            await click(dialog().querySelector(`button[title="${title}"]`));
            assert(editor.querySelector(tag), `${title} did not format the selection`);
        }
        selectAll(editor);
        await click(dialog().querySelector('button[title="Punktlista"]'));
        assert(editor.querySelector('ul li'), 'Unordered list was not created');
        selectAll(editor);
        await click(dialog().querySelector('button[title="Numrerad lista"]'));
        assert(editor.querySelector('ol li'), 'Ordered list was not created');
        selectAll(editor);
        await act(async () => {
            const select = byLabel('Textstorlek');
            select.value = '4';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert(editor.querySelector('font[size="4"]'), 'Font size was not preserved');
        selectAll(editor);
        await click(button('Rensa format'));
        assert(!editor.querySelector('b, i, u, font'), 'Clear formatting did not remove inline formatting');
        assert(editor.textContent.includes('Hej'), 'Clear formatting removed text');
        await component.unmount();
    });

    await scenario('recipients and ordered attachments in multipart', async () => {
        let sent;
        let closed = 0;
        const serverData = { message: 'Skickat', invoiceStatusUpdated: false, warning: 'Status kunde inte uppdateras' };
        postImplementation = async () => ({ status: 200, data: serverData });
        const component = await mount({
            receiverList: [
                { email: ' to@example.test ', doSend: true },
                { email: 'ignored@example.test', doSend: false },
            ],
            ccMailList: [{ email: 'cc@example.test', doSend: true }],
            onSent: (result) => { sent = result; },
            onClose: () => { closed += 1; },
        });
        await setValue(byLabel('Mottagare 3'), 'other@example.test');
        await click(byLabel('Skicka till mottagare 3'));
        await click(byLabel('Ta bort mottagare 2'));
        const picker = dialog().querySelector('input[type="file"]');
        const picked = new File(['picked bytes'], 'picked.txt', { type: 'text/plain', lastModified: 1 });
        const selected = fileTransfer(picked, picked);
        await act(async () => {
            picker.files = selected.files;
            picker.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert(dialog().querySelectorAll('input[aria-label^="Filnamn för bilaga"]').length === 1, 'Duplicate picked files were not deduplicated');
        await setValue(byLabel('Filnamn för bilaga 1'), 'renamed.txt');
        const dropped = fileTransfer(new File(['drop bytes'], 'drop.txt', { lastModified: 2 }));
        await act(async () => byLabel('Bilagor').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dropped })));
        const pasted = fileTransfer(new File(['paste bytes'], 'paste.txt', { lastModified: 3 }));
        await act(async () => byLabel('Meddelande').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: pasted })));
        assert(dialog().querySelectorAll('input[aria-label^="Filnamn för bilaga"]').length === 3, 'Dropped or pasted file was not added');
        await click(byLabel('Ta bort bilaga drop.txt'));
        await click(button('Skicka'));
        await waitFor(() => closed === 1, 'Successful send did not close the dialog');

        assert(calls.length === 1 && calls[0][0] === '/email/send' && calls[0].length === 2, 'Unexpected POST or manual multipart headers');
        const form = calls[0][1];
        equal(JSON.parse(form.get('receivers')), [
            { email: 'to@example.test', doSend: true },
            { email: 'other@example.test', doSend: true },
        ], 'Incorrect To recipients');
        equal(JSON.parse(form.get('ccRecipients')), [{ email: 'cc@example.test', doSend: true }], 'Incorrect CC recipients');
        assert(form.get('invoiceId') === '42' && !form.has('reservationId'), 'Wrong document identifiers');
        const files = form.getAll('files');
        equal(files.map((file) => file.name), ['Faktura 42', 'renamed.txt', 'paste.txt'], 'Wrong attachment order or names');
        equal(await Promise.all(files.map((file) => file.text())), ['%PDF-1.4\noriginal bytes', 'picked bytes', 'paste bytes'], 'Attachment bytes changed');
        assert(sent.warning === serverData.warning && sent.response === serverData && sent.invoiceId === 42 && sent.reservationId === null, 'Server response or document IDs were not forwarded');
        await component.unmount();
    });

    await scenario('warnings and validation', async () => {
        const component = await mount({ receiverList: [], sourceAttachmentUrl: '', initialWarning: 'Kunde inte hämta standardvärden.' });
        assert(button('Skicka').disabled, 'Missing recipient and PDF must disable sending');
        assert(dialog().textContent.includes('Kunde inte hämta standardvärden.') && dialog().textContent.includes('Ingen PDF är laddad'), 'Missing initial/PDF warning');
        await component.update({ receiverList: [{ email: 'cc@example.test', doSend: true }], sourceAttachmentUrl: sourceUrl, isStale: true });
        assert(button('Skicka').disabled && dialog().textContent.includes('inaktuell'), 'Stale PDF must disable sending');
        await setValue(byLabel('Mottagare 1'), 'edited@example.test');
        await component.update({ receiverList: [{ email: 'cc@example.test', doSend: true }] });
        assert(byLabel('Mottagare 1').value === 'edited@example.test', 'Equivalent defaults reset the edited recipient');
        await component.update({ isStale: false, invoiceId: 42, reservationId: 7 });
        assert(!button('Skicka').disabled, 'Correctable document ID error should be reported on submit');
        await click(button('Skicka'));
        assert(calls.length === 0 && dialog().textContent.includes('vilket dokument'), 'Multiple document IDs were not rejected');
        await component.update({ invoiceId: null, reservationId: 7, receiverList: [{ email: 'felaktig', doSend: true }] });
        await click(button('Skicka'));
        assert(calls.length === 0 && dialog().textContent.includes('e-postadresserna'), 'Invalid selected address was not rejected');
        await component.unmount();
    });

    await scenario('CC-only reservation and unselected invalid addresses', async () => {
        let closed = 0;
        const component = await mount({
            receiverList: [{ email: 'invalid address', doSend: false }],
            ccMailList: [{ email: 'copy@example.test', doSend: true }],
            invoiceId: null,
            reservationId: 73,
            onClose: () => { closed += 1; },
        });
        assert(!button('Skicka').disabled, 'A selected CC recipient should enable sending');
        await click(button('Skicka'));
        await waitFor(() => closed === 1, 'CC-only reservation was not sent');
        const form = calls[0][1];
        assert(form.get('reservationId') === '73' && !form.has('invoiceId'), 'Wrong reservation identifier');
        equal(JSON.parse(form.get('receivers')), [{ email: 'invalid address', doSend: false }], 'Unselected address changed');
        equal(JSON.parse(form.get('ccRecipients')), [{ email: 'copy@example.test', doSend: true }], 'Selected CC was not sent');
        await component.unmount();
    });

    await scenario('stale during PDF loading cancels delivery', async () => {
        let resolveSource;
        window.fetch = () => new Promise((resolve) => { resolveSource = resolve; });
        const component = await mount();
        await click(button('Skicka'));
        await waitFor(() => Boolean(resolveSource), 'PDF fetch did not start');
        await component.update({ isStale: true });
        await act(async () => resolveSource(new Response(new Blob(['%PDF-1.4\npdf']), { status: 200 })));
        await waitFor(() => dialog().textContent.includes('inaktuell') && !dialog().textContent.includes('Skickar...'), 'Stale loading did not finish');
        assert(calls.length === 0, 'Stale PDF was submitted after loading');
        await component.unmount();
        window.fetch = fetchObjectUrl;
    });

    await scenario('duplicate submissions and dismissal while sending', async () => {
        let resolvePost;
        let closed = 0;
        postImplementation = () => new Promise((resolve) => { resolvePost = resolve; });
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();
        const component = await mount({ onClose: () => { closed += 1; } });
        const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        await act(async () => dialog().querySelector('#email-modal-subject').dispatchEvent(enter));
        assert(enter.defaultPrevented, 'Enter in a single-line input can accidentally send mail');
        await act(async () => {
            byLabel('Stäng').focus();
            byLabel('Stäng').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        });
        assert(document.activeElement === button('Skicka'), 'Focus escaped the dialog with Shift+Tab');
        await act(async () => {
            button('Skicka').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        });
        assert(document.activeElement === byLabel('Stäng'), 'Focus escaped the dialog with Tab');
        const form = dialog().querySelector('form');
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await waitFor(() => calls.length === 1, 'Send did not reach the stub');
        assert(button('Skickar...').disabled && button('Avbryt').disabled && byLabel('Stäng').disabled, 'Sending controls were not disabled');
        await act(async () => {
            dialog().parentElement.click();
            dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        assert(calls.length === 1 && closed === 0, 'Duplicate submission or dismissal occurred while sending');
        await act(async () => resolvePost({ status: 200, data: { message: 'Skickat' } }));
        await waitFor(() => closed === 1, 'Confirmed send did not close');
        await component.unmount();
        assert(document.activeElement === trigger, 'Focus was not restored after closing');
        trigger.remove();
    });

    await scenario('safe source, size, server and network errors', async () => {
        let closed = 0;
        const component = await mount({ onClose: () => { closed += 1; } });
        window.fetch = async () => new Response('', { status: 404 });
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('Kunde inte läsa'), 'Source fetch failure was not shown');
        assert(calls.length === 0 && closed === 0, 'Source failure sent mail or closed dialog');
        window.fetch = async () => new Response('<html>error</html>', { status: 200 });
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('Kunde inte läsa') && !dialog().textContent.includes('Skickar...'), 'Invalid PDF was not rejected');
        assert(calls.length === 0, 'A non-PDF source was submitted');
        window.fetch = fetchObjectUrl;
        postImplementation = async () => { throw { response: { status: 413, data: 'private server detail' } }; };
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('25 000 000 byte'), '413 error was not shown');
        assert(!dialog().textContent.includes('private server detail') && closed === 0, 'Unsafe error leaked or closed dialog');
        postImplementation = async () => { throw { response: { status: 503, data: { message: 'E-posttjänsten är inte korrekt konfigurerad.' } } }; };
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('E-posttjänsten är inte korrekt konfigurerad.'), 'SMTP configuration error was not shown');
        postImplementation = async () => { throw { response: { status: 503 } }; };
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('Kontrollera utskicken'), 'Uncertain delivery warning was not shown');
        postImplementation = async () => { throw new Error('private network detail'); };
        await click(button('Skicka'));
        await waitFor(() => calls.length === 4 && dialog().textContent.includes('Kontrollera utskicken') && !dialog().textContent.includes('Skickar...'), 'Network uncertainty was not shown');
        assert(!dialog().textContent.includes('private network detail') && closed === 0, 'Network details leaked or dialog closed');
        await component.unmount();
    });

    await scenario('oversized attachments are rejected before posting', async () => {
        const component = await mount();
        const picker = dialog().querySelector('input[type="file"]');
        await act(async () => {
            picker.files = fileTransfer(new File([new Uint8Array(25_000_000)], 'large.bin')).files;
            picker.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('25 000 000 byte'), 'Oversized attachment warning was not shown');
        assert(calls.length === 0, 'Oversized attachments were posted');
        await component.unmount();
    });

    await scenario('callback exceptions cannot cause a retry', async () => {
        let attemptedClose = 0;
        const component = await mount({
            onSent: async () => { throw new Error('callback failed'); },
            onClose: () => { attemptedClose += 1; throw new Error('close failed'); },
        });
        await click(button('Skicka'));
        await waitFor(() => attemptedClose === 1, 'Close was not attempted after callback failure');
        await waitFor(() => dialog().textContent.includes('E-postmeddelandet har skickats'), 'Accepted delivery was not shown as successful');
        assert(button('Skickat').disabled && !dialog().textContent.includes('Kontrollera utskicken'), 'Callback failure was presented as a send failure');
        await act(async () => dialog().querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        assert(calls.length === 1, 'Accepted delivery could be resubmitted');
        await component.unmount();
    });

    await scenario('synchronous callback failure preserves accepted-send confirmation', async () => {
        let closed = 0;
        const component = await mount({
            onSent: () => { throw new Error('callback failed'); },
            onClose: () => { closed += 1; },
        });
        await click(button('Skicka'));
        await waitFor(() => dialog().textContent.includes('skickades, men sidan kunde inte uppdateras'), 'Callback warning was not shown');
        assert(button('Skickat').disabled && closed === 0 && calls.length === 1, 'Accepted delivery became retryable or its warning was hidden');
        await component.unmount();
    });

    await scenario('pending success notification does not trap the dialog', async () => {
        let closed = 0;
        const component = await mount({
            onSent: () => new Promise(() => {}),
            onClose: () => { closed += 1; },
        });
        await click(button('Skicka'));
        await waitFor(() => closed === 1, 'A pending success callback prevented closing');
        assert(calls.length === 1, 'A pending success callback caused another send');
        await component.unmount();
    });

    await scenario('preview request identity, stale edits and URL cleanup', async () => {
        const host = document.getElementById('root');
        const root = createRoot(host);
        const originalRevoke = URL.revokeObjectURL;
        const revoked = [];
        let pdf;
        URL.revokeObjectURL = (url) => {
            revoked.push(url);
            originalRevoke.call(URL, url);
        };
        function Probe() {
            pdf = usePdf();
            return null;
        }
        try {
            await act(async () => root.render(<PdfProvider><Probe /></PdfProvider>));
            const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
            let first;
            let second;
            await act(async () => {
                first = pdf.beginPdfPreview({ kind: 'invoice', id: 1 });
                second = pdf.beginPdfPreview({ kind: 'reservation', id: 2 });
                pdf.markStale();
                assert(!pdf.finishPdfPreview(first, blob, 'old.pdf'), 'An older preview replaced the current document');
                assert(pdf.finishPdfPreview(second, blob, 'current.pdf'), 'The current preview was discarded');
            });
            assert(pdf.pdfDocument.id === 2 && pdf.pdfFilename === 'current.pdf' && pdf.isStale, 'Edits during preview loading were lost');
            const firstUrl = pdf.pdfUrl;
            let third;
            await act(async () => {
                third = pdf.beginPdfPreview({ kind: 'invoice', id: 3 });
                assert(pdf.finishPdfPreview(third, blob, 'new.pdf'), 'Replacement preview failed');
            });
            assert(revoked.includes(firstUrl) && !pdf.isStale, 'Replacing a preview did not release its URL or clear stale state');
            const secondUrl = pdf.pdfUrl;
            await act(async () => pdf.closePdfPreview());
            assert(revoked.includes(secondUrl), 'Closing the preview did not release its URL');
            assert(!pdf.finishPdfPreview(third, blob, 'late.pdf'), 'A closed preview was reopened by a late response');
        } finally {
            await act(async () => root.unmount());
            URL.revokeObjectURL = originalRevoke;
        }
    });
} catch (error) {
    results.error = `${error?.message || error}\n${error?.stack || ''}`;
} finally {
    apiClient.post = originalPost;
    apiClient.request = originalRequest;
    window.fetch = originalFetch;
    URL.revokeObjectURL(sourceUrl);
    window.__emailComposerTestResult = results;
}
