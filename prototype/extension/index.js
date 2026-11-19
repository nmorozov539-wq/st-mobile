import { createWorkspace } from './workspace.js?build=0.9.0';
import { createAdapter } from './adapter.js?build=0.9.0';
import { createGenerationRuntime } from './runtime.js?build=0.9.0';
import { isGenerating, isChatSaving, saveSettings } from '/script.js';

import { createConfigurationRuntime } from './configuration.js?build=0.9.0';

import { createAssetRuntime } from './assets.js?build=0.9.0';
import { createWorldInfoRuntime } from './worldinfo.js?build=0.9.0';
import { repairDoubledCards } from './card-repair.js?build=0.9.0';
import { collectDisplayScripts } from './display-regex.js?build=0.9.0';
import { createBridgeDispatcher, handshakeContract } from './bridge-contract.js?build=0.9.0';
import { createNativeSettingsHost } from './native-settings-host.js?build=0.9.0';
import { createNativeHostLock, nativeHostOwnsEngine } from './native-host-lock.js?build=0.9.0';
import { createConfigurationMigration } from './configuration-migration.js?build=0.9.0';
import { installNativeNoticeBridge } from './native-notices.js?build=0.9.0';
import { getPresetManager } from '/scripts/preset-manager.js';
import { getPresetApplicationPromise } from '/scripts/openai.js';

const getContext = () => SillyTavern.getContext();
const ctx = getContext();
const versionResponse = await fetch('/version', { headers: ctx.getRequestHeaders() });
if (!versionResponse.ok) throw new Error('Cannot read ST version.');
const versionInfo = await versionResponse.json();
const sessionId = crypto.randomUUID();
const runtime = createGenerationRuntime(getContext);
let nativeSettings,bridgePort,migrationBusy=false;
const isBusy = ({owner,excludeNative=false,excludeMigration=false}={}) => isGenerating() || isChatSaving || (!excludeNative&&nativeHostOwnsEngine(nativeSettings)) || (!excludeMigration&&migrationBusy) || [...(window.pocketExtensions?.values()??[])].some(extension=>{const state=extension.read();return state.busy && !(owner==='generation' && state.id==='summaryception' && state.waiting);});
const configuration = createConfigurationRuntime(getContext);
const workspace = createWorkspace({getContext,isBusy:()=>isBusy()||adapter.activity({ignoreExternal:true}).busy,configuration});
const adapter = createAdapter({ getContext, isBusy: options => isBusy(options) || workspace.busy(),
    supportedVersion: '1.19.0', runtimeVersion: versionInfo.pkgVersion,
    generation: runtime, configuration, assets: createAssetRuntime(getContext), worldInfo: createWorldInfoRuntime(getContext), extensions: window.pocketExtensions,
    prepareGeneration: () => workspace.prepareGeneration(),sessionId });
const configurationProjection=()=>({...configuration.read(),ownership:workspace.ownership(),sessionId,readiness:{engine:true,configured:getContext().onlineStatus!=='no_connection'}});
const readSavedSettings=async()=>{const response=await fetch('/api/settings/get',{method:'POST',headers:getContext().getRequestHeaders(),cache:'no-store'});if(!response.ok)throw Object.assign(Error('Could not verify saved migration state.'),{code:'MIGRATION_UNVERIFIED'});const data=await response.json();return JSON.parse(data.settings);};
const settleNativeSettings=async()=>{await saveSettings();const saved=await readSavedSettings(),manager=getPresetManager();if(saved.main_api!==getContext().mainApi)throw Error('The active API did not match saved settings.');return {verified:true,mainApi:saved.main_api,preset:manager?.getSelectedPresetName?.()??null};};
const nativeHostBusy=createNativeHostLock({coreBusy:isBusy,workspaceBusy:()=>workspace.busy(),adapterActivity:options=>adapter.activity(options)});
nativeSettings=createNativeSettingsHost({document,isBusy:nativeHostBusy,projection:configurationProjection,settle:settleNativeSettings,emit:event=>bridgePort?.postMessage({event}),verifiedSurfaces:{connection:true,presets:true},hostingMode:'full-native-fallback'});
const migration=createConfigurationMigration({getContext,listHistory:key=>workspace.history(key),readChat:target=>workspace.read(target),saveSettings,readSavedSettings,
    presetManager:()=>getPresetManager(),isBusy:()=>isBusy({excludeMigration:true})||workspace.busy()||adapter.activity({ignoreExternal:true}).busy,pendingOperations:()=>{try{return JSON.parse(window.parent.localStorage.getItem('pocket-tavern.pending-changes.v1')??'[]');}catch{return[];}},
    quarantinePending:async ids=>{if(!ids.length)return;const key='pocket-tavern.pending-changes.v1',items=JSON.parse(window.parent.localStorage.getItem(key)??'[]'),wanted=new Set(ids),next=items.map(item=>wanted.has(item.id)?{...item,state:'interrupted',error:'Preserved for native configuration migration; this legacy change will not be replayed.'}:item);window.parent.localStorage.setItem(key,JSON.stringify(next));const saved=JSON.parse(window.parent.localStorage.getItem(key)??'[]');if(saved.some(item=>wanted.has(item.id)&&['pending','applying'].includes(item.state)))throw Object.assign(Error('Pending configuration changes could not be quarantined.'),{code:'QUARANTINE_UNVERIFIED'});},
    applyPreset:async name=>{const manager=getPresetManager(),value=manager?.findPreset(name);if(value===undefined||value===null)throw Object.assign(Error('The active native preset cannot be selected.'),{code:'PRESET_UNVERIFIED'});await manager.selectPreset(value);await saveSettings();return manager.getSelectedPresetName();}});

window.pocketEngineBusy = () => {try{return isGenerating() || isChatSaving || nativeHostOwnsEngine(nativeSettings) || migrationBusy || workspace.busy() || adapter.activity({ignoreExternal:true}).busy || [...(window.pocketExtensions?.entries()??[])].some(([id,extension])=>id!=='summaryception' && extension.read().busy);}catch{return true;}};
window.pocketVerifyMemory = () => runtime.verifyPersistence(adapter.snapshot());
window.pocketSaveSettings = async expected => {
    await saveSettings();
    const response=await fetch('/api/settings/get',{method:'POST',headers:getContext().getRequestHeaders(),cache:'no-store'});
    if(!response.ok)throw Error('Memory settings save could not be verified.');
    const saved=JSON.parse((await response.json()).settings).extension_settings?.summaryception;
    if(!saved || Object.entries(expected).some(([key,value])=>key!=='promptPreset' && JSON.stringify(saved[key])!==JSON.stringify(value)))throw Error('Memory settings do not match the saved copy.');
};

// The engine frame is marked by its name: any query string on ST's URL makes jQuery UI load the whole
// page into the Backgrounds tab, duplicating #form_create and doubling every saved character field.
if (window.parent !== window && (window.name === 'pocket-engine' || new URLSearchParams(location.search).has('mobileRuntime'))) {
    let port;
    const methods = { workspace: arg => arg.action==='read'?workspace.read(arg.target):arg.action==='recent'?workspace.recent():arg.action==='history'?workspace.history(arg.characterKey):arg.action==='scopes'?workspace.scopes(arg.target):arg.action==='presetData'?workspace.presetData(arg.name):workspace.run(arg), handshake: async () => handshakeContract({adapter:adapter.handshake(),sessionId,bridgeBuild:'0.9.0',capabilities:{nativeSettingsHost:nativeSettings.capabilities(),configurationProjection:true,legacyConfigurationMigration:true}}), characters: () => adapter.listCharacters(),
        configurationState:arg=>{if(arg?.action!=='read')throw Object.assign(Error('Configuration state is read-only.'),{code:'INVALID_ARGUMENT'});return configurationProjection();},nativeSettings:arg=>nativeSettings.run(arg),
        configurationMigration:async arg=>{if(migrationBusy)throw Object.assign(Error('A configuration migration operation is already running.'),{code:'BUSY'});migrationBusy=true;try{return await migration.run(arg);}finally{migrationBusy=false;}},
        display: arg => collectDisplayScripts(getContext(), {characterKey: arg?.characterKey ?? null, preset: arg?.preset ?? null}),
        select: arg => adapter.selectCharacter(arg), snapshot: () => adapter.snapshot(),
        send: arg => adapter.sendMessage(arg), stop: arg => adapter.stopGeneration(arg),
        status: arg => adapter.operationStatus(arg), change: arg => adapter.changeMessage(arg),
        chats: () => adapter.listChats(), manage: arg => adapter.manageChat(arg),
        extensions: async arg => {if(arg?.action==='summarize')await workspace.prepareGeneration();else if(arg?.action==='choice')await workspace.prepareGeneration().catch(()=>{});const value=await adapter.extensions(arg);const current=getContext();return {...value,target:{characterKey:current.characters[current.characterId]?.avatar,chatId:current.chatId}};}, assets: arg => adapter.assets(arg), worldinfo: arg => adapter.worldInfo(arg), settings: () => adapter.settings(), configure: arg => adapter.configure(arg),
        activity: () => ({...adapter.activity(),locks:[...(isGenerating()?['ST generation/swipe']:[]),...(isChatSaving?['ST chat save']:[]),...(workspace.busy()?['workspace change']:[]),...[...(window.pocketExtensions?.values()??[])].filter(e=>e.read().busy).map(e=>e.read().waiting?`Memory waiting (${e.read().waitingFor??'deferred'})`:'Memory running')]}), reconcile: () => adapter.reconcile(), tokens: async arg => { const texts = Array.isArray(arg?.texts) ? arg.texts.slice(0, 100) : []; return Promise.all(texts.map(text => getContext().getTokenCountAsync(String(text ?? ''), 0))); }, reloadSaved: () => adapter.reloadSaved(), health: () => runtime.health() };
    window.addEventListener('message', async event => {
        if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'st-mobile-connect' || !event.ports[0]) return;
        try{await nativeSettings.disconnect();}catch(error){event.ports[0].postMessage({id:event.data?.id,error:{code:error.code??'SAVE_UNVERIFIED',message:error.message}});event.ports[0].close();return;}port?.close(); port = event.ports[0];bridgePort=port;
        const connectionPort = port;
        const dispatch=createBridgeDispatcher(methods);
        connectionPort.onmessage = async ({ data }) => connectionPort.postMessage(await dispatch(data));
        port.start();
        window.parent.postMessage({ type: 'st-mobile-connected' }, location.origin);
    });
    let teardownNativeNotices=()=>{};
    ctx.eventSource.on(ctx.eventTypes.APP_READY, async () => {
        try { const repaired = await repairDoubledCards(getContext); if (repaired.length) console.info('Pocket repaired doubled card fields:', repaired); }
        catch (error) { console.warn('Pocket card repair failed', error); }
        adapter.markReady(); adapter.subscribe(event => port?.postMessage({ event }));
        teardownNativeNotices();teardownNativeNotices=installNativeNoticeBridge({emit:event=>port?.postMessage({event}),context:()=>{const activity=adapter.activity({ignoreExternal:true}),target=adapter.snapshot();return{sessionId,operationId:activity.operation?.requestId??null,target:activity.operation?{characterKey:target.characterKey,chatId:target.chatId}:null,outcome:activity.operation?'failed':'failed'};}});
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
