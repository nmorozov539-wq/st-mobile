const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || '/home/Riv/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium} = require(playwrightPath);

const origin = process.env.STM_BASE_URL || 'http://127.0.0.1:8123';
const out = process.env.STM_EVIDENCE_DIR || path.resolve(__dirname, '../docs/mobile-correction-evidence');
fs.mkdirSync(out, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
    let page = await context.newPage();
    const errors = [], checks = [], geometry = {};
    const watch = value => value.on('pageerror', error => errors.push(error.stack || error.message));
    watch(page);
    const ready = () => page.waitForFunction(() => !document.querySelector('#settings-button')?.disabled && document.querySelector('#recovery')?.hidden, {}, {timeout: 180000});
    const shot = name => page.screenshot({path: path.join(out, name), fullPage: true});
    const navGeometry = () => page.locator('#bottom-nav').evaluate(nav => ({
        width: nav.getBoundingClientRect().width,
        template: getComputedStyle(nav).gridTemplateColumns,
        buttons: [...nav.querySelectorAll('button:not([hidden])')].map(button => ({page: button.dataset.page, ...button.getBoundingClientRect().toJSON()})),
    }));
    const messageGeometry = () => page.locator('#messages').evaluate(messages => ({
        format: document.documentElement.dataset.messageFormat,
        viewport: innerWidth,
        messages: [...messages.querySelectorAll('.message')].slice(-4).map(row => {
            const bubble = row.querySelector('.bubble'), rr = row.getBoundingClientRect(), br = bubble.getBoundingClientRect(), style = getComputedStyle(bubble);
            return {user: row.classList.contains('user'), row: {x: rr.x, width: rr.width}, bubble: {x: br.x, width: br.width, padding: style.padding, border: style.borderTopWidth, radius: style.borderRadius, background: style.backgroundColor}};
        }),
    }));
    const openChats = async () => {
        if (await page.locator('#chat-screen').isVisible()) await page.locator('#back').click();
        await page.locator('#bottom-nav [data-page="chats"]').click();
        await page.waitForFunction(() => document.querySelector('.chat-row') || document.querySelector('.list-empty:not(.list-waiting)'), {}, {timeout: 120000});
    };
    const startFresh = async () => {
        await openChats();
        await page.locator('#page-new-chat').click();
        await page.locator('.fresh-character').first().click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden || document.querySelector('#new-chat-confirm')?.open);
        if (await page.locator('#new-chat-confirm').isVisible()) await page.locator('#new-chat-apply').click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden);
        if (await page.locator('#persona-choice').isVisible()) await page.locator('#persona-choice [data-close]').click();
    };
    const openFirstChat = async () => {
        await openChats();
        await page.locator('.chat-open').first().click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden);
    };
    const send = async text => {
        await page.locator('#draft').fill(text);
        await page.locator('#send').click();
        await page.waitForFunction(() => document.querySelector('#stop').hidden && document.querySelector('#status').textContent === 'Reply saved', {}, {timeout: 90000});
    };
    const openSettings = async () => {
        if (!await page.locator('#app-settings').isVisible()) await page.locator('#bottom-nav [data-page="home"]').click();
        await page.locator('#app-settings').click();
    };

    await page.goto(`${origin}/st-mobile/`);
    await ready();
    const assetIdentity = await page.evaluate(() => ({
        frontendBuild: document.querySelector('#home-version')?.textContent,
        script: document.querySelector('script[src*="app.js"]')?.src,
        styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href),
    }));

    await page.evaluate(() => {
        const key = 'stm.layout.v1';
        const current = JSON.parse(localStorage.getItem(key) || '{}');
        localStorage.setItem(key, JSON.stringify({...current, version: 1, order: ['chats', 'wi', 'home', 'extensions', 'library'], wiPlacement: 'library', messageFormat: 'reading'}));
    });
    await page.close(); page = await context.newPage(); watch(page);
    await page.goto(`${origin}/st-mobile/`); await ready();
    for (const width of [320, 390]) {
        await page.setViewportSize({width, height: 844});
        const measured = await navGeometry(); geometry[`foldedNav${width}`] = measured;
        assert.equal(measured.buttons.length, 4);
        assert.equal(measured.buttons.some(item => item.page === 'wi'), false);
        const widths = measured.buttons.map(item => item.width);
        assert.ok(Math.max(...widths) - Math.min(...widths) < 2, `four folded destinations use equal tracks at ${width}px`);
        assert.ok(widths.reduce((sum, item) => sum + item, 0) >= measured.width - 18, `four folded destinations fill the ${width}px bar apart from its declared padding and gaps`);
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('#bottom-nav [data-page="library"]').click();
    await page.getByRole('tab', {name: 'World Info'}).click();
    await page.waitForSelector('.wi-book');
    assert.ok(await page.locator('.wi-book').count() > 0, 'folded World Info renders actual books');
    await page.locator('.wi-book-toggle').first().click();
    await page.waitForSelector('.wi-entry-open');
    await shot('folded-wi-library.png');
    const selectedTabBefore = await page.getByRole('tab', {name: 'World Info'}).getAttribute('aria-selected');
    await page.locator('.wi-entry-open').first().click();
    await page.waitForSelector('.wi-page.wi-editor');
    await page.locator('#page-back').click();
    await page.waitForSelector('.library-tabs');
    assert.equal(await page.getByRole('tab', {name: 'World Info'}).getAttribute('aria-selected'), selectedTabBefore);
    assert.ok(await page.locator('.wi-book').count() > 0);
    checks.push('Folded World Info renders native books and entry Back returns to the captured Library/WI origin');

    await startFresh();
    await send('Short geometry proof.');
    await send('Long geometry proof with enough text to wrap across multiple lines while keeping the same shared transcript controller, saved alternatives, and composer behavior.');
    geometry.reading = await messageGeometry();
    await page.locator('#back').click();
    await openSettings();
    await page.locator('#settings-layout').click();
    await page.getByRole('button', {name: 'Messenger', exact: true}).click();
    await page.locator('#page-back').click();
    await page.locator('#page-back').click();
    await openFirstChat();
    await page.waitForFunction(() => document.documentElement.dataset.messageFormat === 'messenger');
    geometry.messenger = await messageGeometry();
    if (process.env.STM_DEBUG_GEOMETRY) console.log(JSON.stringify(geometry.messenger, null, 2));
    const incoming = geometry.messenger.messages.find(item => !item.user), outgoing = geometry.messenger.messages.find(item => item.user);
    assert.ok(incoming && outgoing);
    assert.ok(incoming.bubble.width < 390 * .82 || outgoing.bubble.width < 390 * .82, 'short Messenger bubbles are content-sized');
    assert.ok(incoming.bubble.x < outgoing.bubble.x, 'incoming and outgoing Messenger bubbles have distinct alignment');
    assert.notEqual(incoming.bubble.padding, '0px');
    await shot('messenger-hearth.png');
    await page.locator('#back').click();
    await openSettings();
    await page.locator('#settings-appearance').click();
    await page.locator('.theme-card').filter({hasText: 'Nocturne Portrait'}).click();
    await page.locator('#theme-preview-apply').click();
    await page.locator('#page-back').click();
    await page.locator('#page-back').click();
    await openFirstChat();
    assert.equal(await page.locator('html').getAttribute('data-message-format'), 'messenger');
    geometry.messengerNocturne = await messageGeometry();
    await shot('messenger-nocturne.png');
    await page.close(); page = await context.newPage(); watch(page);
    await page.goto(`${origin}/st-mobile/`); await ready(); await openFirstChat();
    assert.equal(await page.locator('html').getAttribute('data-message-format'), 'messenger');
    geometry.messengerReloaded = await messageGeometry();
    checks.push('Messenger changes computed bubble size/alignment and survives priority-theme change and reload');

    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'slice-1-live.json'), JSON.stringify({assetIdentity, geometry, checks, errors, timestamp: new Date().toISOString()}, null, 2));
    await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
