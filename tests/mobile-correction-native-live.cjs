const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/home/Riv/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const origin = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8123';
const out = process.env.POCKET_EVIDENCE_DIR || path.resolve(__dirname, '../docs/mobile-correction-evidence');
const width = Number(process.env.POCKET_NATIVE_WIDTH || 390), theme = process.env.POCKET_NATIVE_THEME || 'hearth', suffix = `${theme}-${width}`;
fs.mkdirSync(out, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext({viewport: {width, height: 844}, hasTouch: true, isMobile: true});
    await context.addInitScript(selected => localStorage.setItem('pocket-tavern.themes.v1', JSON.stringify({version:1,selected,themes:[]})), theme);
    const page = await context.newPage(), errors = [], checks = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.goto(`${origin}/st-mobile/`);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Engine ready', {}, {timeout: 120000});
    const frame = page.locator('#engine').contentFrame();
    const shot = name => page.screenshot({path: path.join(out, name), fullPage: true});
    const nativeState = selector => frame.locator(selector).evaluate(root => {
        const style = getComputedStyle(root), rect = root.getBoundingClientRect(), preset = document.documentElement.classList.contains('pocket-native-presets');
        const activeRoots = preset ? [document.querySelector('#left-nav-panel'), document.querySelector('#AdvancedFormatting')] : [document.querySelector('#rm_api_block')];
        const other = [...document.querySelectorAll('#top-settings-holder>.drawer')].filter(node => !activeRoots.some(active => active && node.contains(active)));
        const unrelated = other.filter(node => { const value=getComputedStyle(node);return value.display !== 'none' && value.visibility !== 'hidden' && node.getClientRects().length; }).map(node => node.id || node.className);
        return {rect: rect.toJSON(), position: style.position, background: style.backgroundColor, color: style.color, font: style.fontFamily,
            themeStyle: !!document.querySelector('style[data-pocket-native-theme]'), unrelatedVisible: unrelated.length > 0, unrelated};
    });
    const switchFamily = family => frame.locator('html').evaluate(async (_root, family) => {
        const $ = globalThis.$, script = await import('/script.js'), {saveSettings} = script;
        if (family === 'cc') {
            $('#main_api').val('openai').trigger('change');
            for (let i = 0; i < 30 && SillyTavern.getContext().mainApi !== 'openai'; i++) await new Promise(resolve => setTimeout(resolve, 100));
            const ctx = SillyTavern.getContext();
            const settings = ctx.chatCompletionSettings; settings.reverse_proxy = '';
            $('#chat_completion_source').val('custom').trigger('change'); settings.custom_url = 'http://127.0.0.1:8124/v1'; settings.custom_model = 'st-mobile-mock';
            await saveSettings(); $('#api_button_openai').trigger('click');
        } else {
            $('#main_api').val('textgenerationwebui').trigger('change');
            for (let i = 0; i < 30 && SillyTavern.getContext().mainApi !== 'textgenerationwebui'; i++) await new Promise(resolve => setTimeout(resolve, 100));
            $('#textgen_type').val('generic').trigger('change'); $('#generic_api_url_text').val('http://127.0.0.1:8124').trigger('input').trigger('change');
            await saveSettings(); $('#api_button_textgenerationwebui').trigger('click');
        }
        for (let i = 0; i < 60 && SillyTavern.getContext().onlineStatus === 'no_connection'; i++) await new Promise(resolve => setTimeout(resolve, 100));
        await saveSettings();
    }, family);
    const startFresh = async () => {
        await page.locator('#bottom-nav [data-page="chats"]').click();
        await page.locator('#page-new-chat').click();
        await page.locator('.fresh-character').first().click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden || document.querySelector('#new-chat-confirm')?.open);
        if (await page.locator('#new-chat-confirm').isVisible()) await page.locator('#new-chat-apply').click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden);
        if (await page.locator('#persona-choice').isVisible()) await page.locator('#persona-choice [data-close]').click();
    };

    await switchFamily('cc');
    await page.locator('.home-config-row').filter({hasText: 'Connection'}).click();
    await page.waitForSelector('#engine.native-engine');
    const connection = await nativeState('#rm_api_block');
    if (process.env.POCKET_DEBUG_NATIVE) console.log(JSON.stringify(connection, null, 2));
    assert.equal(connection.themeStyle, true);
    assert.equal(connection.unrelatedVisible, false);
    assert.equal(connection.position, 'absolute');
    assert.ok(connection.rect.width <= width && connection.rect.width > width-90 && connection.rect.height > 400);
    assert.equal(await frame.locator('html').evaluate(() => window.pocketEngineBusy()), true);
    const endpoint=frame.locator('#custom_api_url_text');await endpoint.fill('http://127.0.0.1:8124/v1/');await endpoint.dispatchEvent('change');
    await shot(`native-connection-${suffix}.png`);
    await page.locator('#page-back').click();
    await page.waitForFunction(() => !document.querySelector('#engine').classList.contains('native-engine') && document.querySelector('#page-title')?.textContent === 'Pocket Tavern');
    assert.equal(await page.locator('#page-title').textContent(), 'Pocket Tavern');
    await page.locator('.home-config-row').filter({hasText:'Connection'}).click();await page.waitForSelector('#engine.native-engine');assert.equal(await frame.locator('#custom_api_url_text').inputValue(),'http://127.0.0.1:8124/v1/');await page.locator('#page-back').click();await page.waitForFunction(()=>!document.querySelector('#engine').classList.contains('native-engine'));
    checks.push('Home Connection opens original controls immediately inside a Pocket-themed content region and Back returns Home');

    await startFresh();
    assert.equal(await page.locator('#active-persona').isHidden(), true);
    assert.equal(await page.locator('#active-preset').isHidden(), true);
    assert.equal(await page.locator('#model-chip').evaluate(node => node.closest('#composer')?.id), 'composer');
    await page.locator('#settings-button').click();
    await page.locator('#open-preset').click();
    await page.waitForSelector('#engine.native-engine');
    const presets = await nativeState('#left-nav-panel');
    assert.equal(presets.themeStyle, true);
    assert.equal(presets.unrelatedVisible, false);
    const edit = frame.locator('.prompt-manager-edit-action').first();
    if (process.env.POCKET_DEBUG_NATIVE) console.log(await frame.locator('html').evaluate(() => ({api: SillyTavern.getContext().mainApi, left: {display: getComputedStyle(document.querySelector('#left-nav-panel')).display, rect: document.querySelector('#left-nav-panel').getBoundingClientRect().toJSON()}, actionCount: document.querySelectorAll('.prompt-manager-edit-action').length, first: document.querySelector('.prompt-manager-edit-action') ? {display: getComputedStyle(document.querySelector('.prompt-manager-edit-action')).display, visibility: getComputedStyle(document.querySelector('.prompt-manager-edit-action')).visibility, rect: document.querySelector('.prompt-manager-edit-action').getBoundingClientRect().toJSON()} : null})));
    await edit.waitFor({state: 'visible', timeout: 30000}); await edit.click();
    if (process.env.POCKET_DEBUG_NATIVE) { await page.waitForTimeout(500); console.log(await frame.locator('#completion_prompt_manager_popup').evaluate(node => ({className: node.className, style: node.getAttribute('style'), display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility, rect: node.getBoundingClientRect().toJSON(), parent: {id: node.parentElement?.id, display: getComputedStyle(node.parentElement).display}}))); }
    await frame.locator('#completion_prompt_manager_popup').waitFor({state: 'visible'});
    const nameField=frame.locator('#completion_prompt_manager_popup_entry_form_name'),baseName=(await nameField.inputValue()).replace(/ \[Pocket [^\]]+\]$/,'');const savedName=`${baseName} [Pocket ${suffix}]`;await nameField.fill(savedName);await frame.locator('#completion_prompt_manager_popup_entry_form_save').click();await frame.locator('#completion_prompt_manager_popup').waitFor({state:'hidden'});await edit.click();await frame.locator('#completion_prompt_manager_popup').waitFor({state:'visible'});assert.equal(await nameField.inputValue(),savedName);
    await shot(`native-cc-prompt-${suffix}.png`);
    await page.locator('#page-back').click();
    assert.equal(await page.locator('#engine').evaluate(node => node.classList.contains('native-engine')), true);
    await frame.locator('#completion_prompt_manager_popup').waitFor({state: 'hidden'});
    await page.locator('#page-back').click();
    await page.waitForFunction(() => !document.querySelector('#engine').classList.contains('native-engine'));
    assert.equal(await page.locator('#chat-screen').isVisible(), true);
    checks.push('Chat preset menu directly opens native CC controls; prompt popup is Pocket-themed and nested Back closes child before returning Chat');

    await switchFamily('tc');
    await page.locator('#back').click();
    await page.locator('#bottom-nav [data-page="home"]').click();
    await page.locator('.home-config-row').filter({hasText: 'Preset'}).click();
    await page.waitForSelector('#engine.native-engine');
    await frame.locator('[data-pocket-native-tab="formatting"]').click();
    await frame.locator('#ContextSettings').waitFor({state: 'visible', timeout: 30000});
    assert.equal(await frame.locator('#InstructSettingsColumn').isVisible(), true);
    const tc = await nativeState('#left-nav-panel');
    assert.equal(tc.themeStyle, true); assert.equal(tc.unrelatedVisible, false);
    const depth=frame.locator('#context_story_string_depth');if(await depth.isVisible()){const before=await depth.inputValue(),next=before==='1'?'2':'1';await depth.fill(next);await depth.dispatchEvent('change');await page.locator('#page-back').click();await page.waitForFunction(()=>!document.querySelector('#engine').classList.contains('native-engine'));await page.locator('.home-config-row').filter({hasText:'Preset'}).click();await page.waitForSelector('#engine.native-engine');await frame.locator('[data-pocket-native-tab="formatting"]').click();assert.equal(await frame.locator('#context_story_string_depth').inputValue(),next);}
    await shot(`native-tc-formatting-${suffix}.png`);
    await page.locator('#page-back').click();
    await page.waitForFunction(() => !document.querySelector('#engine').classList.contains('native-engine'));
    await switchFamily('cc');
    checks.push('Text Completion Presets directly exposes the real sampler/context/instruct controls in the same Pocket host');

    const visibleErrors = await page.locator('#toast:not([hidden]), #send-error:not([hidden]), [role="alert"]:visible').allTextContents();
    assert.deepEqual(visibleErrors.filter(text => /could not|failed|error/i.test(text)), []);
    const identity = await page.evaluate(() => ({frontendBuild: document.querySelector('#home-version')?.textContent, script: document.querySelector('script[src*="app.js"]')?.src, styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href)}));
    assert.match(identity.frontendBuild ?? '', /0\.9\.1/);
    assert.match(identity.script ?? '', /build=0\.9\.1/);
    fs.writeFileSync(path.join(out, `native-live-${suffix}.json`), JSON.stringify({identity, theme, viewport:{width,height:844}, connection, presets, tc, checks, errors, visibleErrors, timestamp: new Date().toISOString()}, null, 2));
    await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
