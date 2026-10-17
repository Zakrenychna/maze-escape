const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { resolve, join } = require('node:path');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const assert = require('node:assert/strict');

// Run with CHROME_PATH set to a Chromium executable.
const profile = mkdtempSync(join(tmpdir(), 'maze-smoke-'));
const browser = spawn(process.env.CHROME_PATH, ['--headless', '--no-sandbox',
    '--remote-debugging-port=9337', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
(async () => {
    let pages;
    for (let attempt = 0; attempt < 40; attempt++) {
        try { pages = await (await fetch('http://localhost:9337/json')).json(); break; }
        catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert(pages?.length, 'Chromium did not start');
    socket = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise(r => socket.addEventListener('open', r, { once: true }));
    let id = 0;
    const pending = new Map(), errors = [];
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    });
    const call = (method, params = {}) => new Promise(r => {
        pending.set(++id, r); socket.send(JSON.stringify({ id, method, params }));
    });
    await call('Runtime.enable');
    await call('Page.navigate', { url: pathToFileURL(resolve('index.html')).href });
    await new Promise(r => setTimeout(r, 1500));
    const result = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true,
        expression: `(async () => {
            for (const file of ['maze-atlas.png', 'props-atlas.png', 'outdoor-atlas.png']) {
                const image = new Image(); image.src = 'assets/' + file;
                await image.decode();
                if (image.naturalWidth !== image.naturalHeight) throw Error(file + ' must be square');
            }
            document.getElementById('regularMode').click();
            document.getElementById('enterMazeBtn').click();
            await new Promise(r => setTimeout(r, 700));
            return { canvas: document.getElementById('gameCanvas').width, css: document.styleSheets.length };
        })()` });
    assert(!result.result.exceptionDetails, JSON.stringify(result.result.exceptionDetails));
    assert(result.result.result.value.canvas > 0);
    assert(result.result.result.value.css > 0);
    if (process.env.SCREENSHOT_PATH) {
        const screenshot = await call('Page.captureScreenshot', { format: 'png' });
        writeFileSync(process.env.SCREENSHOT_PATH, Buffer.from(screenshot.result.data, 'base64'));
    }
    await call('Runtime.evaluate', { expression: `document.getElementById('halloweenMode').click()` });
    await new Promise(r => setTimeout(r, 700));
    assert.deepEqual(errors, []);
    console.log('PASS: assets, CSS, regular maze and Halloween render without runtime errors');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    socket?.close(); browser.kill();
    browser.once('exit', () => rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
});
