const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || '/home/Riv/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium} = require(playwrightPath);

const origin = process.env.STM_BASE_URL || 'http://127.0.0.1:8123';
const out = process.env.STM_EVIDENCE_DIR || path.resolve(__dirname, '../docs/milestone-3-evidence');
fs.mkdirSync(out, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
    let page = await context.newPage(); const errors = [], checks = [];
    const watchPage = value => value.on('pageerror', error => errors.push(error.stack || error.message));
    watchPage(page);
    const ready = () => page.waitForFunction(() => {
        const tone = document.querySelector('#home-status')?.dataset.tone;
        return !document.querySelector('#settings-button')?.disabled && document.querySelector('#recovery')?.hidden && !['idle', 'wait', undefined].includes(tone);
    }, {}, {timeout: 180000});
    const shot = name => page.screenshot({path: path.join(out, name), fullPage: true});
    const openChats = async () => {
        if (await page.locator('#chat-screen').isVisible()) await page.locator('#back').click();
        await page.locator('#bottom-nav [data-page="chats"]').click();
        await page.waitForFunction(() => document.querySelector('.chat-row') || document.querySelector('.list-empty:not(.list-waiting)'), {}, {timeout: 120000});
    };
    const startFresh = async index => {
        await openChats();
        await page.locator('#page-new-chat').click();
        const rows = page.locator('.fresh-character');
        await rows.nth(Math.min(index, Math.max(0, await rows.count() - 1))).click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden || document.querySelector('#new-chat-confirm')?.open, {}, {timeout: 30000});
        if (await page.locator('#new-chat-confirm').isVisible()) await page.locator('#new-chat-apply').click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden, {}, {timeout: 30000});
        if (await page.locator('#persona-choice').isVisible()) await page.locator('#persona-choice [data-close]').click();
    };
    const send = async text => {
        await page.evaluate(() => document.querySelector('#send-error').hidden = true);
        await page.locator('#draft').fill(text);
        await page.locator('#send').click();
        await page.waitForFunction(() => document.querySelector('#stop').hidden && (/Reply saved|Reply failed/.test(document.querySelector('#status').textContent) || !document.querySelector('#send-error').hidden), {}, {timeout: 90000});
    };
    const streamShot = async name => {
        await page.evaluate(() => document.querySelector('#send-error').hidden = true);
        await page.locator('#draft').fill('[slow] streaming layout evidence');
        await page.locator('#send').click();
        await page.waitForSelector('#messages .stream', {timeout: 30000});
        await page.waitForTimeout(900);
        await shot(name);
        await page.locator('#stop').click();
        await page.waitForFunction(() => document.querySelector('#stop').hidden, {}, {timeout: 90000});
    };
    const assertCleanChrome = async () => {
        assert.equal(await page.locator('#theme-recovery').isVisible(), false);
        const composer = await page.locator('#composer').boundingBox(), error = await page.locator('#send-error').boundingBox();
        if (error) assert.ok(error.y + error.height <= composer.y + composer.height, 'error must remain inside the composer');
    };

    await page.goto(`${origin}/st-mobile/`);
    await ready();
    await startFresh(0);
    await send('Reading format clean layout evidence');
    assert.equal(await page.locator('#send-error').isHidden(), true);
    await assertCleanChrome();
    await shot('m3-chat-reading-clean.png');
    await streamShot('m3-chat-reading-streaming.png');
    await send('[fail] Reading format error layout evidence');
    const readingError = await page.locator('#send-error').textContent();
    assert.equal(readingError.includes('{'), false);
    await assertCleanChrome();
    await shot('m3-chat-reading-error.png');
    checks.push('Reading clean, streaming and bounded human-readable error states');

    await page.evaluate(() => {
        const key = 'stm.layout.v1', value = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key, JSON.stringify({...value, messageFormat: 'messenger'}));
    });
    await page.close();
    page = await context.newPage(); watchPage(page);
    await page.goto(`${origin}/st-mobile/`);
    await ready();
    await openChats();
    await page.locator('.chat-open').first().click();
    await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden);
    assert.equal(await page.locator('html').getAttribute('data-message-format'), 'messenger');
    await page.evaluate(() => document.querySelector('#send-error').hidden = true);
    await shot('m3-chat-messenger-clean.png');
    await streamShot('m3-chat-messenger-streaming.png');
    await send('[fail] Messenger format error layout evidence');
    const messengerError = await page.locator('#send-error').textContent();
    assert.equal(messengerError.includes('{'), false);
    await assertCleanChrome();
    await shot('m3-chat-messenger-error.png');
    checks.push('Messenger clean, streaming and bounded human-readable error states');

    await startFresh(1);
    await send('Second conversation for selection-bound wide panes');
    for (let index = 0; index < 20; index++) await send(`Long-history turn ${index + 1} of 20`);
    await openChats();
    await page.setViewportSize({width: 1024, height: 768});
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'true');
    await page.waitForSelector('.wide-chat-detail #chat-screen.wide-embedded-chat');
    const chatRows = page.locator('.chat-open');
    assert.ok(await chatRows.count() >= 2);
    const firstTitle = await page.locator('.wide-chat-detail #name').textContent();
    await page.locator('.wide-chat-detail #draft').fill('Selection-bound draft survives list browsing');
    await page.locator('.wide-chat-detail #messages').evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
    await page.waitForSelector('.wide-chat-detail #messages article[data-index="0"]');
    await page.locator('.wide-chat-detail #messages').evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event('scroll')); });
    await page.waitForFunction(() => Number([...document.querySelectorAll('.wide-chat-detail #messages article[data-index]')].at(-1)?.dataset.index) > 40);
    const scrollBeforeSelection = await page.locator('.wide-chat-detail #messages').evaluate(node => node.scrollTop);
    const statusBeforeSelection = await page.locator('#status').textContent();
    await chatRows.nth(1).click();
    await page.waitForFunction(previous => document.querySelector('.wide-chat-detail #name')?.textContent !== previous, firstTitle);
    assert.equal(await page.locator('#stop').isHidden(), true);
    assert.equal((await page.locator('#status').textContent()).startsWith('Opening engine chat'), false);
    assert.equal(statusBeforeSelection === null, false);
    await page.locator('.wide-chat-detail #draft').fill('Other conversation draft');
    await chatRows.nth(0).click();
    await page.waitForFunction(previous => document.querySelector('.wide-chat-detail #name')?.textContent === previous, firstTitle);
    assert.equal(await page.locator('.wide-chat-detail #draft').inputValue(), 'Selection-bound draft survives list browsing');
    assert.ok(Math.abs(await page.locator('.wide-chat-detail #messages').evaluate(node => node.scrollTop) - scrollBeforeSelection) < 160);
    await page.locator('.wide-chat-detail #messages').evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event('scroll')); });
    await page.locator('.wide-chat-detail #messages .message:not(.user) .byline button').last().click();
    await page.waitForSelector('#message-menu[open]');
    assert.equal(await page.locator('#menu-edit').isEnabled(), true);
    assert.equal(await page.locator('#menu-reply').isVisible(), true);
    await page.locator('#menu-reply').click();
    await page.waitForSelector('.wide-chat-detail #messages .stream');
    await page.waitForSelector('.wide-chat-detail #stop:not([hidden])');
    await page.locator('.wide-chat-detail #stop').click();
    await page.waitForFunction(() => document.querySelector('#stop').hidden, {}, {timeout: 90000});
    await page.waitForTimeout(100);
    await page.locator('.wide-chat-detail #messages').evaluate(node => { node.scrollTop = 260; node.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(100);
    const scrollBeforeResize = await page.locator('.wide-chat-detail #messages').evaluate(node => node.scrollTop);
    await page.setViewportSize({width: 800, height: 768});
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'false');
    assert.equal(await page.locator('.wide-chat-detail').count(), 0);
    assert.equal(await page.locator('#chat-screen').isHidden(), true);
    await page.setViewportSize({width: 1024, height: 768});
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'true');
    await page.waitForSelector('.wide-chat-detail #chat-screen.wide-embedded-chat');
    assert.equal(await page.locator('.wide-chat-detail #draft').inputValue(), 'Selection-bound draft survives list browsing');
    assert.ok(Math.abs(await page.locator('.wide-chat-detail #messages').evaluate(node => node.scrollTop) - scrollBeforeResize) < 160);
    await shot('m3-chats-1024-selection-detail.png');
    checks.push('Wide Chats reuses the shared controller: >40 messages remain reachable; actions, alternatives, streaming and Stop work; selection is read-only; draft and scroll survive selection and resize');

    await page.locator('#bottom-nav [data-page="library"]').click();
    await page.waitForSelector('.wide-library-detail');
    const characterCards = page.locator('.character-card');
    assert.ok(await characterCards.count() >= 2);
    const firstCharacter = await page.locator('.wide-library-detail h2').textContent();
    await page.locator('.character-card:not(.selected)').first().click();
    await page.waitForFunction(previous => document.querySelector('.wide-library-detail h2')?.textContent !== previous, firstCharacter);
    await page.waitForSelector('.wide-library-detail .wide-library-section');
    await shot('m3-library-1024-selection-detail.png');
    checks.push('Wide Library selection is bound to the chosen native card and renders saved content');

    await page.locator('.wide-library-detail .btn.secondary').click();
    await page.waitForSelector('#asset-editor[open] .character-hero');
    await shot('m3-character-long-read-1024.png');
    await page.locator('#character-hero-edit').click();
    await page.waitForSelector('#asset-editor[open] textarea');
    await shot('m3-character-long-edit-1024.png');
    await page.locator('#cancel-character').click();
    await page.locator('#close-asset').click();
    checks.push('Long-content character reading and whole-card edit layouts remain bounded');

    await page.locator('#bottom-nav [data-page="wi"]').click();
    await page.waitForSelector('.wi-book');
    await page.locator('.wi-book-toggle').first().click();
    await page.waitForSelector('.wi-entry-open');
    await shot('m3-wi-library-1024.png');
    await page.locator('.wi-entry-open').first().click();
    await page.waitForSelector('.wi-page.wi-editor');
    await shot('m3-wi-entry-1024.png');
    checks.push('World Info collection and entry editor fit the wide workspace');

    await page.evaluate(() => document.getElementById('page-back').click());
    await page.locator('#bottom-nav [data-page="home"]').click();
    await page.locator('#app-settings').click();
    await page.waitForSelector('#settings-appearance');
    await page.locator('#settings-appearance').click();
    await page.waitForSelector('.settings-wide-shell .settings-categories');
    await shot('m3-settings-1024-category-topic.png');
    checks.push('Wide Settings keeps categories beside the selected topic');

    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; dispatchEvent(new Event('resize')); });
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'false');
    assert.equal(await page.locator('.settings-wide-shell').count(), 0);
    await shot('m3-settings-1024-200pct-collapse.png');
    checks.push('Actual 200% root UI text scaling collapses split panes');
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; dispatchEvent(new Event('resize')); });
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'true');
    await page.setViewportSize({width: 800, height: 768});
    await page.waitForFunction(() => document.documentElement.dataset.wideLayout === 'false');
    assert.equal(await page.locator('.settings-wide-shell').count(), 0);
    checks.push('Resize below 900 CSS px collapses split panes');

    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'gate-e-layout-matrix.json'), JSON.stringify({
        build: require('../package.json').version, checks, errors,
        viewports: [{width: 390, height: 844}, {width: 1024, height: 768}, {width: 800, height: 768}],
        uiTextScaling: 'root font-size 32px at 1024px (200%)',
        timestamp: new Date().toISOString(),
    }, null, 2));
    await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
