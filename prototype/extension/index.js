import { createAdapter } from './adapter.js?build=phone2';
import { createGenerationRuntime } from './runtime.js?build=phone2';
import { isGenerating, isChatSaving } from '/script.js';

const getContext = () => SillyTavern.getContext();
const ctx = getContext();
const versionResponse = await fetch('/version', { headers: ctx.getRequestHeaders() });
if (!versionResponse.ok) throw new Error('Cannot read ST version.');
const versionInfo = await versionResponse.json();
const sessionId = crypto.randomUUID();
const runtime = createGenerationRuntime(getContext);
const adapter = createAdapter({ getContext, isBusy: () => isGenerating() || isChatSaving,
    supportedVersion: '1.19.0', runtimeVersion: versionInfo.pkgVersion,
    generation: runtime });

if (window.parent !== window && new URLSearchParams(location.search).has('mobileRuntime')) {
    let port;
    const methods = { handshake: () => ({ ...adapter.handshake(), sessionId }), characters: () => adapter.listCharacters(),
        select: arg => adapter.selectCharacter(arg), snapshot: () => adapter.snapshot(),
        send: arg => adapter.sendMessage(arg), stop: arg => adapter.stopGeneration(arg),
        status: arg => adapter.operationStatus(arg), change: arg => adapter.changeMessage(arg),
        chats: () => adapter.listChats(), manage: arg => adapter.manageChat(arg),
        activity: () => adapter.activity(), reconcile: () => adapter.reconcile(), reloadSaved: () => adapter.reloadSaved(), health: () => runtime.health() };
    window.addEventListener('message', event => {
        if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'st-mobile-connect' || !event.ports[0]) return;
        port?.close(); port = event.ports[0];
        const connectionPort = port;
        connectionPort.onmessage = async ({ data }) => {
            if (!Object.hasOwn(methods, data?.method)) return;
            try { connectionPort.postMessage({ id: data.id, result: await methods[data.method](data.argument) }); }
            catch (error) { connectionPort.postMessage({ id: data.id, error: { code: error.code ?? 'ERROR', message: error.message } }); }
        };
        port.start();
        window.parent.postMessage({ type: 'st-mobile-connected' }, location.origin);
    });
    ctx.eventSource.on(ctx.eventTypes.APP_READY, () => {
        adapter.markReady(); adapter.subscribe(event => port?.postMessage({ event }));
        window.parent.postMessage({ type: 'st-mobile-ready' }, location.origin);
    });
} else {
const panel = document.createElement('section');
panel.id = 'st-mobile-experiment';
panel.style.cssText = 'position:fixed;right:12px;top:12px;width:min(400px,90vw);max-height:88vh;overflow:auto;z-index:30000;background:#161b22;color:#eee;border:1px solid #69778a;border-radius:12px;padding:16px;box-shadow:0 8px 30px #0008;font:14px system-ui';
const title = document.createElement('strong');
title.textContent = 'ST Mobile · PC bridge experiment';
const note = document.createElement('p');
note.textContent = 'Sandbox test: send ordinary text, watch the reply, or stop it. Use [slow] for cancellation and [fail] to test an error.';
const status = document.createElement('p');
status.textContent = 'Waiting for ST…';
status.setAttribute('role', 'status');
const select = document.createElement('select');
select.setAttribute('aria-label', 'Character');
select.style.cssText = 'width:100%;color:#eee;background:#252d39;padding:8px';
const output = document.createElement('pre');
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:20vh;overflow:auto;font-size:12px';
const buttons = document.createElement('div');
buttons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:12px 0';
const toggle = document.createElement('button');
toggle.textContent = 'Mobile experiment';
toggle.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:30000;padding:10px;background:#252d39;color:white;border:1px solid #69778a;border-radius:8px';
toggle.onclick = () => { panel.hidden = !panel.hidden; };
const draft = document.createElement('textarea');
draft.setAttribute('aria-label', 'Experiment message');
draft.placeholder = 'Type a test message…';
draft.style.cssText = 'width:100%;min-height:60px;box-sizing:border-box;background:#252d39;color:white;padding:8px';
const reply = document.createElement('p');
reply.id = 'st-mobile-reply';
reply.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:20vh;overflow:auto';
const generationButtons = document.createElement('div');
generationButtons.style.cssText = buttons.style.cssText;
let ready = false;
let running = false;
let lastRequest = null;
const controls = [];
function styledButton(label) {
    const element = document.createElement('button');
    element.textContent = label;
    element.style.cssText = 'padding:8px;background:#252d39;color:white;border:1px solid #69778a;border-radius:6px';
    return element;
}
const stop = styledButton('Stop reply');
stop.disabled = true;
stop.onclick = () => {
    try { adapter.stopGeneration(lastRequest.requestId); status.textContent = 'Stopping…'; stop.disabled = true; }
    catch (error) { status.textContent = `${error.code}: ${error.message}`; }
};
function setControls() {
    controls.forEach(control => { control.disabled = !ready || running; });
    select.disabled = !ready || running;
    draft.disabled = !ready || running;
}
async function run(action) {
    if (running) return;
    running = true; setControls();
    try {
        const result = await action();
        output.textContent = JSON.stringify(result, null, 2);
        status.textContent = result?.state
            ? `${result.state} · saved chat ${result.persistence}${result.error ? ` · ${result.error.message}` : ''}`
            : 'Done';
    } catch (error) { status.textContent = `${error.code ?? 'ERROR'}: ${error.message}`; }
    finally { running = false; stop.disabled = true; setControls(); }
}
function button(parent, label, action) {
    const element = styledButton(label);
    element.disabled = true;
    element.onclick = () => run(action);
    controls.push(element); parent.append(element);
}
button(buttons, 'Refresh characters', () => {
    const characters = adapter.listCharacters();
    select.replaceChildren();
    for (const character of characters) {
        const option = document.createElement('option');
        option.value = character.key; option.textContent = character.name; select.append(option);
    }
    return { count: characters.length };
});
button(buttons, 'Select character', () => adapter.selectCharacter(select.value));
button(buttons, 'Read current chat', () => adapter.snapshot());
button(generationButtons, 'Send message', async () => {
    const target = adapter.snapshot();
    lastRequest = { requestId: crypto.randomUUID(), text: draft.value,
        characterKey: target.characterKey, chatId: target.chatId };
    const operation = await adapter.sendMessage(lastRequest);
    if (operation.persistence === 'verified') draft.value = '';
    return operation;
});
generationButtons.append(stop);
button(generationButtons, 'Replay last request', () => {
    if (!lastRequest) throw new Error('Send a message first.');
    return adapter.sendMessage(lastRequest);
});
panel.append(title, note, status, select, buttons, draft, generationButtons, reply, output);
document.body.append(panel, toggle);
ctx.eventSource.on(ctx.eventTypes.APP_READY, () => {
    adapter.markReady();
    try {
        output.textContent = JSON.stringify(adapter.handshake(), null, 2);
        status.textContent = 'Connected to ST 1.19.0'; ready = true;
        adapter.subscribe(event => {
            if (event.type === 'text.replace') { reply.textContent = event.text; stop.disabled = false; }
            if (event.type === 'operation.started') { reply.textContent = ''; status.textContent = 'Generating…'; }
            if (event.type === 'operation.verifying') { stop.disabled = true; status.textContent = 'Checking saved chat…'; }
            if (event.type === 'operation.finished') { stop.disabled = true; reply.textContent = event.text; }
        });
        setControls();
    } catch (error) { status.textContent = error.message; }
});

}
