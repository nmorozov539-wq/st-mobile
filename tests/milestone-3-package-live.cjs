const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || '/home/Riv/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium} = require(playwrightPath);

const project = path.resolve(__dirname, '..');
const archive = path.resolve(process.argv[2] || path.join(project, 'dist/stm-combined-v0.9.2.zip'));
const source = path.resolve(process.argv[3] || '/home/Riv/SillyTavern');
const evidence = path.join(project, 'docs/mobile-correction-evidence');

const waitForServer = async () => {
    const deadline = Date.now() + 150000;
    while (Date.now() < deadline) {
        try { const response = await fetch('http://127.0.0.1:8123/', {cache: 'no-store'}); if (response.ok) return; } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw Error('The packaged server did not become ready within 150 seconds.');
};

(async () => {
    const root = fs.mkdtempSync(path.join(project, '.tmp-m3-package-'));
    const install = path.join(root, 'installed');
    let launcher = null, browser = null;
    const logs = [], errors = [];
    try {
        assert.equal(fs.existsSync(archive), true, `Missing package: ${archive}`);
        const unzip = spawnSync('unzip', ['-q', archive, '-d', root], {encoding: 'utf8'});
        assert.equal(unzip.status, 0, unzip.stderr || unzip.stdout);
        const kitName = fs.readdirSync(root).find(name => name.startsWith('stm-combined-v'));
        assert.ok(kitName, 'Extracted package root was not found.');
        const kit = path.join(root, kitName);
        const prepare = spawnSync(process.execPath, [path.join(kit, 'prepare.cjs'), source, install, '--mock'], {encoding: 'utf8', timeout: 180000});
        assert.equal(prepare.status, 0, `${prepare.stdout}\n${prepare.stderr}`);

        const installedManifestPath = path.join(install, 'public/scripts/extensions/third-party/st-mobile-experiment/manifest.json');
        const installedBuildPath = path.join(install, 'public/st-mobile/build.js');
        const installedManifest = JSON.parse(fs.readFileSync(installedManifestPath));
        const installedBuild = fs.readFileSync(installedBuildPath, 'utf8');
        assert.equal(installedManifest.version, require('../package.json').version);
        assert.match(installedBuild, /FRONTEND_BUILD = '0\.9\.2'/);
        assert.match(fs.readFileSync(path.join(kit, 'PHONE-README.md'), 'utf8'), /^# STM combined prototype v0\.9\.2/m);

        launcher = spawn(process.execPath, [path.join(install, 'start.cjs'), '--mock'], {cwd: install, stdio: ['ignore', 'pipe', 'pipe']});
        for (const stream of [launcher.stdout, launcher.stderr]) stream.on('data', chunk => { logs.push(String(chunk)); if (logs.length > 300) logs.shift(); });
        await waitForServer();

        browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
        const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
        let page = await context.newPage();
        const watchPage = value => value.on('pageerror', error => errors.push(error.stack || error.message));
        const ready = () => page.waitForFunction(() => {
            const tone = document.querySelector('#home-status')?.dataset.tone;
            return !document.querySelector('#settings-button')?.disabled && document.querySelector('#recovery')?.hidden && !['idle', 'wait', undefined].includes(tone);
        }, {}, {timeout: 180000});
        watchPage(page);
        await page.goto('http://127.0.0.1:8123/st-mobile/');
        await ready();

        await page.locator('#app-settings').click();
        await page.locator('#settings-migration').click();
        await page.getByRole('button', {name: 'Prepare native ownership', exact: true}).waitFor();
        const migrationRoutes = {fresh: true, pending: false, native: false};
        const frame = page.locator('#engine').contentFrame();
        await frame.locator('html').evaluate(async () => {
            const ctx = SillyTavern.getContext();
            ctx.extensionSettings.stm = {...(ctx.extensionSettings.stm ?? {}), version: 3, global: {preset: 'Default', model: 'st-mobile-mock', generation: {temperature: .73, openai_max_tokens: 515}, opaque: {retained: 'packaged-roundtrip'}}};
            const {saveSettings} = await import('/script.js');
            await saveSettings();
        });
        await page.reload(); await ready();
        await page.locator('#app-settings').click();
        await page.locator('#settings-migration').click();
        await page.getByRole('button', {name: 'Preserve legacy settings', exact: true}).click();
        await page.getByRole('button', {name: 'Download verified archive', exact: true}).waitFor({timeout: 120000});
        migrationRoutes.pending = await page.getByText('Preservation in progress', {exact: true}).isVisible();
        await page.locator('.migration-choice').first().click();
        await page.getByText('Native SillyTavern ownership', {exact: true}).waitFor({timeout: 120000});
        migrationRoutes.native = true;
        const nativeMigration = await frame.locator('html').evaluate(async () => {
            const ctx = SillyTavern.getContext(), response = await fetch('/api/settings/get', {method: 'POST', headers: ctx.getRequestHeaders(), cache: 'no-store'}), body = await response.json(), settings = JSON.parse(body.settings), migration = settings.extension_settings?.stm?.migration;
            return {ownership: migration?.ownership, checkpoint: migration?.checkpoint, legacyGlobalRetained: !!settings.extension_settings?.stm?.global};
        });
        assert.deepEqual(nativeMigration, {ownership: 'native', checkpoint: 'verified', legacyGlobalRetained: true});
        await page.locator('#page-back').click();
        await page.locator('#page-back').click();
        await page.locator('#bottom-nav [data-page="library"]').click();
        const folderName = `Packaged folder ${Date.now()}`;
        await page.locator('.folder-manage').click();
        await page.getByLabel('New folder name').fill(folderName);
        await page.getByRole('button', {name: 'Create', exact: true}).click();
        await page.waitForFunction(name => [...document.querySelectorAll('.folder-filter option')].some(option => option.textContent === name), folderName);
        await page.locator('.folder-manage').click();
        await page.getByLabel('Character to move').selectOption({index: 0});
        await page.getByLabel('Move to folder').selectOption({label: folderName});
        await page.getByRole('button', {name: 'Move character', exact: true}).click();
        await page.waitForTimeout(300);

        await page.locator('#bottom-nav [data-page="chats"]').click();
        await page.locator('#page-new-chat').click();
        await page.locator('.fresh-character').first().click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden || document.querySelector('#new-chat-confirm')?.open, {}, {timeout: 30000});
        if (await page.locator('#new-chat-confirm').isVisible()) await page.locator('#new-chat-apply').click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden, {}, {timeout: 30000});
        if (await page.locator('#persona-choice').isVisible()) await page.locator('#persona-choice [data-close]').click();
        await page.locator('#draft').fill('Packaged asset round-trip');
        await page.locator('#send').click();
        await page.waitForFunction(() => document.querySelector('#stop').hidden && document.querySelector('#status').textContent === 'Reply saved', {}, {timeout: 90000});
        assert.match(await page.locator('#messages article:not(.user) .bubble').last().textContent(), /phone bridge works/i);

        await page.locator('#back').click();
        await page.locator('#bottom-nav [data-page="home"]').click();
        await page.locator('#app-settings').click();
        await page.locator('#settings-layout').click();
        await page.getByRole('button', {name: 'Messenger', exact: true}).click();
        await page.evaluate(() => document.getElementById('page-back').click());
        await page.locator('#settings-appearance').click();
        await page.getByRole('button', {name: 'Preview Light Paper'}).click();
        await page.locator('#theme-preview-apply').click();
        await page.close();
        page = await context.newPage(); watchPage(page);
        await page.goto('http://127.0.0.1:8123/st-mobile/');
        await ready();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'paper');
        assert.equal(await page.locator('html').getAttribute('data-message-format'), 'messenger');
        await page.locator('#bottom-nav [data-page="library"]').click();
        await page.waitForFunction(name => [...document.querySelectorAll('.folder-filter option')].some(option => option.textContent === name), folderName);
        await page.getByLabel('Character folder', {exact: true}).selectOption({label: folderName});
        assert.equal(await page.locator('.character-card').count(), 1);
        await page.locator('#bottom-nav [data-page="chats"]').click();
        assert.match(await page.locator('.chat-row .preview').first().textContent(), /phone bridge works/i);
        await page.locator('.chat-open').first().click();
        await page.waitForFunction(() => !document.querySelector('#chat-screen').hidden);
        await page.screenshot({path: path.join(evidence, 'zip-installed-roundtrip-chat.png'), fullPage: true});

        const handshake = await page.evaluate(() => new Promise((resolve, reject) => {
            const frame = document.querySelector('#engine'), channel = new MessageChannel();
            const timer = setTimeout(() => reject(Error('Packaged bridge handshake timed out.')), 15000);
            channel.port1.onmessage = event => { if (event.data?.id === 1) { clearTimeout(timer); resolve(event.data.result ?? event.data.error); channel.port1.close(); } };
            channel.port1.start();
            frame.contentWindow.postMessage({type: 'st-mobile-connect'}, location.origin, [channel.port2]);
            setTimeout(() => channel.port1.postMessage({id: 1, method: 'handshake'}), 200);
        }));
        assert.equal(handshake.bridgeBuild, require('../package.json').version);
        assert.equal(handshake.protocolVersion, 2);
        assert.equal(handshake.capabilities.legacyConfigurationMigration, true);
        assert.deepEqual(errors, []);

        fs.writeFileSync(path.join(evidence, 'zip-installed-roundtrip.json'), JSON.stringify({
            archive: path.basename(archive),
            archiveSha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),
            installFlow: 'extract ZIP -> packaged prepare.cjs --mock -> installed start.cjs --mock',
            installedManifestVersion: installedManifest.version,
            frontendBuild: require('../package.json').version,
            handshake: {bridgeBuild: handshake.bridgeBuild, protocolVersion: handshake.protocolVersion, capabilities: handshake.capabilities},
            mockConversationSavedAfterReload: true,
            preferencesAfterReload: {theme: 'paper', messageFormat: 'messenger'},
            folderAfterReload: {name: folderName, assignedCharacterCount: 1},
            migrationRoutes,
            nativeMigration,
            errors,
            timestamp: new Date().toISOString(),
        }, null, 2));
    } catch (error) {
        if (logs.length) console.error(logs.join('').slice(-12000));
        throw error;
    } finally {
        if (browser) await browser.close().catch(() => {});
        if (launcher && launcher.exitCode === null) {
            launcher.kill('SIGINT');
            await Promise.race([new Promise(resolve => launcher.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 8000))]);
            if (launcher.exitCode === null) launcher.kill('SIGKILL');
        }
        try { fs.rmSync(root, {recursive: true, force: true}); } catch {}
    }
})().catch(error => { console.error(error); process.exit(1); });
