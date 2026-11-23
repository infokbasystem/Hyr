import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createServer } from 'vite';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function findChrome() {
    const candidates = [
        process.env.CHROME_BIN,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ].filter(Boolean);
    for (const candidate of candidates) {
        try {
            await access(candidate, constants.X_OK);
            return candidate;
        } catch {
            // Try the next installed browser.
        }
    }
    return null;
}

function chromeEndpoint(process) {
    return new Promise((resolveEndpoint, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
        process.stderr.on('data', (chunk) => {
            output += chunk.toString();
            const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) {
                clearTimeout(timer);
                resolveEndpoint(match[1]);
            }
        });
        process.once('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
        process.once('exit', (code) => {
            clearTimeout(timer);
            reject(new Error(`Chrome exited before starting (${code})`));
        });
    });
}

async function connect(endpoint) {
    const socket = new WebSocket(endpoint);
    await new Promise((resolveOpen, reject) => {
        socket.addEventListener('open', resolveOpen, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (!message.id || !pending.has(message.id)) return;
        const { resolveRequest, rejectRequest } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rejectRequest(new Error(message.error.message));
        else resolveRequest(message.result);
    });
    return {
        call(method, params = {}, sessionId) {
            const id = ++nextId;
            socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
            return new Promise((resolveRequest, rejectRequest) => pending.set(id, { resolveRequest, rejectRequest }));
        },
        close() { socket.close(); },
    };
}

test('email composer behavior in a real browser without sending mail', { timeout: 90000 }, async (t) => {
    if (typeof WebSocket !== 'function') {
        t.skip('A Node version with native WebSocket is required');
        return;
    }
    const executable = await findChrome();
    if (!executable) {
        t.skip('Chrome/Chromium not installed; set CHROME_BIN to run the component tests');
        return;
    }

    const profile = await mkdtemp(resolve(tmpdir(), 'hyr-email-composer-'));
    let server;
    let browser;
    let connection;
    try {
        server = await createServer({
            configFile: false,
            root: frontend,
            cacheDir: resolve(profile, 'vite-cache'),
            appType: 'custom',
            logLevel: 'error',
            plugins: [react(), tailwindcss()],
            server: {
                host: '127.0.0.1',
                port: 0,
                hmr: false,
            },
        });
        server.middlewares.use('/__email-composer-test', (_request, response) => {
            response.setHeader('content-type', 'text/html');
            response.end(`<!doctype html><html><body><div id="root"></div>
                <script>window.addEventListener('error', e => { window.__emailComposerTestResult = { error: e.message, passed: 0, names: [] }; });</script>
                <script type="module" src="/tests/emailComposerHarness.jsx" onerror="window.__emailComposerTestResult = { error: 'Harness failed to load', passed: 0, names: [] }"></script>
                </body></html>`);
        });
        await server.listen();
        const port = server.httpServer.address().port;

        browser = spawn(executable, [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-component-update',
            '--disable-crash-reporter',
            '--disable-extensions',
            '--disable-sync',
            '--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE 127.0.0.1, EXCLUDE localhost',
            '--remote-debugging-address=127.0.0.1',
            '--remote-debugging-port=0',
            `--user-data-dir=${profile}`,
        ], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, TMPDIR: profile } });
        connection = await connect(await chromeEndpoint(browser));
        const { targetId } = await connection.call('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await connection.call('Target.attachToTarget', { targetId, flatten: true });
        await connection.call('Runtime.enable', {}, sessionId);
        await connection.call('Page.enable', {}, sessionId);
        await connection.call('Emulation.setDeviceMetricsOverride', {
            width: 1358, height: 768, deviceScaleFactor: 1, mobile: false,
        }, sessionId);
        await connection.call('Page.navigate', { url: `http://127.0.0.1:${port}/__email-composer-test` }, sessionId);

        let result;
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            const evaluation = await connection.call('Runtime.evaluate', {
                expression: 'window.__emailComposerTestResult || null',
                returnByValue: true,
            }, sessionId);
            result = evaluation.result.value;
            if (result) break;
            await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        }
        if (!result) {
            const details = await connection.call('Runtime.evaluate', {
                expression: '({url: location.href, ready: document.readyState, progress: window.__emailComposerTestProgress, text: document.body.innerText.slice(0, 1000)})',
                returnByValue: true,
            }, sessionId);
            assert.fail(`Browser component tests did not finish: ${JSON.stringify(details.result.value)}`);
        }
        assert.equal(result.error, null, result.error);
        assert.ok(result.passed >= 6, `Only ${result.passed} browser scenarios ran`);
        t.diagnostic(`${result.passed} browser scenarios passed: ${result.names.join(', ')}`);

        await connection.call('Emulation.setDeviceMetricsOverride', {
            width: 375, height: 812, deviceScaleFactor: 1, mobile: false,
        }, sessionId);
        const narrow = await connection.call('Runtime.evaluate', {
            expression: 'window.__measureEmailComposerLayout()',
            returnByValue: true,
            awaitPromise: true,
        }, sessionId);
        assert.equal(narrow.exceptionDetails, undefined, JSON.stringify(narrow.exceptionDetails));
        const layout = narrow.result.value;
        assert.ok(Math.abs(layout.modalWidth - 345) < 1 && Math.abs(layout.modalTop - 72) < 1, `Narrow modal differs from TPV: ${JSON.stringify(layout)}`);
        assert.ok(Math.abs(layout.editorHeight - 259.2) < 1, `Narrow editor differs from TPV: ${JSON.stringify(layout)}`);
        assert.ok(layout.toolbarCenterSpread < 1 && layout.toolbarScrollWidth <= layout.toolbarClientWidth, `Narrow toolbar wraps or clips controls: ${JSON.stringify(layout)}`);
        t.diagnostic('TPV-sized desktop and narrow layouts verified');
    } finally {
        if (connection) {
            try { await connection.call('Browser.close'); } catch { /* Chrome may already have exited. */ }
            connection.close();
        }
        if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
            browser.kill('SIGTERM');
            await new Promise((resolveExit) => {
                browser.once('exit', resolveExit);
                setTimeout(resolveExit, 5000).unref();
            });
        }
        try {
            if (server) await server.close();
        } finally {
            await rm(profile, { recursive: true, force: true });
        }
    }
});
