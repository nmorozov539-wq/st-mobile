import { checkBridgeBuild } from './build.js?build=0.5.2';
import { createLocalState, recoveryDecision, isNearBottom, submittedUserMessage } from './state.js?build=0.5.2';
import { RuntimeConnection } from './transport.js?build=0.5.2';
import { formatMessage } from './format.js?build=0.5.2';
import { createSettingsPanel } from './settings.js?build=0.5.2';
import { probeEngine } from './engine-health.js?build=0.5.2';
import { createMemoryPanel } from './memory.js?build=0.5.2';
import { createLibrary } from './library.js?build=0.5.2';
const $ = id => document.getElementById(id);
const state = createLocalState(localStorage);
let snapshot, characters = [], chats = [], busy = true, connected = false, sessionId;
let requestId, stream, editing, naming, reviewRequired = false, initializing = false;
let settingsPanel, library, memoryPanel, memoryBusy=false;
let streamReasoning = '';
let renderedTarget, streamFrame, streamText = '', observingTimer, healthRunning = false, healthEpoch = 0;
const connection = new RuntimeConnection(onEvent);
const rpc = (method, argument, timeout) => connection.request(method, argument, timeout);
const targetOf = value => value?.characterKey ? { characterKey: value.characterKey, chatId: value.chatId } : null;
const status = text => { $('status').textContent = text; };
const el = (tag, text = '', className) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
function saveDraft() { if (!snapshot) return; state.saveDraft(snapshot, $('draft').value); }
function controls() {
    const locked = busy || memoryBusy || !connected || reviewRequired;
    memoryPanel?.setAvailable(connected);memoryPanel?.setLocked(locked);
    $('settings-button').disabled = locked;
    settingsPanel?.setLocked(locked);
    library?.setLocked(locked);
    $('library-button').disabled = locked;
    $('active-preset').disabled = locked;
    $('send').disabled = locked || !snapshot?.characterKey || !$('draft').value.trim();
    $('draft').disabled = busy || !snapshot?.characterKey;
    $('refresh').disabled = busy || !connected;
    $('history-button').disabled = busy || !connected || !snapshot?.characterKey;
    $('new-chat').disabled = locked || !snapshot?.characterKey;
    $('delete-chat').disabled = locked || !snapshot?.chatId;
    $('rename-chat').disabled = locked || !snapshot?.chatId;
    document.querySelectorAll('#characters button').forEach(button => button.disabled = busy || memoryBusy || !connected);
    document.querySelectorAll('.message-tools button').forEach(button => button.disabled = locked);
    $('stop').hidden = !requestId; $('send').hidden = !!requestId;
    $('reconnect').hidden = connected && !reviewRequired; $('reconnect').disabled = initializing;
    $('reconnect').textContent = connected ? 'Reload engine' : 'Reconnect';
    $('review').hidden = !reviewRequired || !connected; $('review').disabled = busy || !snapshot?.characterKey;
    $('recovery').hidden = connected && !reviewRequired;
}
function recovery(text, title = 'Review the saved conversation') {
    $('recovery-title').textContent = title; $('recovery-detail').textContent = text; controls();
}
async function action(fn) {
    if (busy) return;
    busy = true; controls();
    try { await fn(); }
    catch (error) { status(error.message); if (['DISCONNECTED', 'TIMEOUT', 'ENGINE_UNAVAILABLE'].includes(error.code)) disconnected(error.message); }
    finally { busy = !!observingTimer; controls(); }
}
function portrait(character, large = false) {
    const node = el('span', character?.name?.slice(0,1) ?? '✦', `avatar ${large ? 'large' : ''}`);
    if (character) {
        const image = document.createElement('img'); image.src = `/characters/${encodeURIComponent(character.key)}`;
        image.alt = `${character.name} portrait`; image.loading = 'lazy';
        image.onerror = () => image.remove(); node.append(image);
    }
    return node;
}
function target(messageId) { return { ...targetOf(snapshot), messageId, expectedMessage: JSON.stringify(snapshot.messages[messageId]) }; }
function follow(force = false) {
    if (force) { $('messages').scrollTop = $('messages').scrollHeight; $('jump').hidden = true; }
    else $('jump').hidden = isNearBottom($('messages'));
}
function thinking(text, duration) {
    const details = el('details', '', 'thinking'); details.hidden = !text;
    details.append(el('summary', `Thinking${Number.isFinite(duration) ? ' · '+(duration/1000).toFixed(1)+'s' : ''}`));
    const body = el('div', '', 'thinking-body'); body.innerHTML = formatMessage(text); details.append(body); return details;
}
function render({ forceBottom = false } = {}) {
    const previousTop = $('messages').scrollTop, nearBottom = isNearBottom($('messages'));
    const currentTarget = state.draftKey(snapshot), changed = renderedTarget !== currentTarget;
    const character = characters.find(c => c.key === snapshot?.characterKey);
    $('name').textContent = character?.name ?? 'Welcome to the tavern';
    $('avatar').replaceChildren(portrait(character, true));
    $('active-persona').textContent = `Persona: ${snapshot?.presentation?.personaName ?? 'You'}`;
    $('active-preset').textContent = `Preset: ${snapshot?.presentation?.preset ?? 'None'}`;
    $('subtitle').textContent = snapshot?.chatId ?? 'Choose a character to begin'; $('subtitle').title = snapshot?.chatId ?? '';
    $('characters').replaceChildren(...characters.map(c => {
        const button = el('button', '', c.key === snapshot?.characterKey ? 'selected' : '');
        button.append(portrait(c), el('span', c.name));
        button.onclick = () => action(async () => { saveDraft(); status(`Opening ${c.name}…`); adopt(await rpc('select', c.key, 45000)); await loadHistory(); status('Conversation loaded'); }); return button;
    }));
    if (!snapshot?.characterKey) { controls(); return; }
    $('messages').replaceChildren();
    snapshot.messages.forEach((message, index) => {
        const article = el('article', '', `message ${message.is_user ? 'user' : ''}`);
        const bubble = el('div', '', 'bubble'); bubble.innerHTML = formatMessage(message.mes);
        article.append(el('div', message.is_user ? (snapshot?.presentation?.personaName || message.name || 'You') : (message.name ?? character?.name), 'byline'), thinking(message.extra?.reasoning ?? '', message.extra?.reasoning_duration), bubble);
        const tools = el('div', '', 'message-tools');
        const edit = el('button', 'Edit'); edit.onclick = () => { editing = target(index); $('edit-text').value = message.mes; $('editor').returnValue = ''; $('editor').showModal(); }; tools.append(edit);
        if (index === snapshot.messages.length - 1 && !message.is_user && !message.is_system) {
            const count = message.swipes?.length ?? 1, current = message.swipe_id ?? 0;
            const previous = el('button', '←'); previous.setAttribute('aria-label', 'Previous alternative');
            const next = el('button', '→'); next.setAttribute('aria-label', 'Next alternative');
            const choose = offset => action(() => mutate('edit', () => rpc('change', { ...target(index), swipeId: (current+offset+count)%count }), 'Alternative selected · saved chat verified'));
            previous.onclick = () => choose(-1); next.onclick = () => choose(1);
            const generate = el('button', '+ New reply'); generate.onclick = () => generateReply('swipe');
            tools.append(previous, el('span', `${current+1} / ${count}`), next, generate);
        }
        article.append(tools); $('messages').append(article);
    });
    renderedTarget = currentTarget; controls();
    if (changed || forceBottom || nearBottom) follow(true); else { $('messages').scrollTop = previousTop; follow(); }
}
function adopt(value) {
    const changed = state.draftKey(snapshot) !== state.draftKey(value);
    snapshot = value; state.saveTarget(value);
    if (changed) $('draft').value = state.draft(value);
    render();
}
async function loadHistory() {
    chats = snapshot?.characterKey ? await rpc('chats') : []; renderHistory();
}
function renderHistory() {
    $('chat-list').replaceChildren(...chats.map(chat => {
        const button = el('button', '', chat.id === snapshot.chatId ? 'current' : '');
        button.append(el('strong', chat.id), el('span', `${chat.messages} message${chat.messages === 1 ? '' : 's'} · ${chat.preview.slice(0,120)}`, 'muted'));
        button.onclick = () => action(async () => {
            saveDraft(); status('Opening conversation…');
            adopt(await rpc('manage', { action: 'open', ...targetOf(snapshot), name: chat.id }, 45000));
            await loadHistory(); $('history').close(); status(reviewRequired ? 'Saved conversation loaded. Check it before resuming.' : 'Conversation loaded · saved chat verified');
        }); return button;
    }));
    if (!chats.length) $('chat-list').append(el('p', 'No saved conversations yet.'));
    controls();
}
function knownRejection(error) { return ['INVALID_NAME','NAME_EXISTS','STALE_TARGET','STALE_MESSAGE','BUSY','CHAT_NOT_FOUND','INVALID_ARGUMENT','INVALID_SWIPE','NO_CONNECTION','UNSUPPORTED_COMMAND','ATTACHMENT_PENDING','AUTOMATIC_GENERATION','TOOLS_ENABLED','COMPOSER_BUSY','SESSION_LIMIT'].includes(error.code); }
async function mutate(kind, operation, success, options = {}) {
    if (reviewRequired || !connected) throw new Error('Review the saved conversation before changing it.');
    const before = targetOf(snapshot); saveDraft();
    state.begin({ kind, sessionId, target: before });
    try {
        const result = await operation();
        if (options.rename) state.moveDraft(before, targetOf(result));
        adopt(result); state.finish(); await loadHistory(); status(success);
    } catch (error) {
        if (knownRejection(error)) state.finish();
        else { reviewRequired = true; recovery('The change may already be saved. Refresh or open history and inspect the conversation before trying again.'); }
        throw error;
    }
}
function makeStream(text = '') {
    stream = el('article', '', 'message stream'); const bubble = el('div', '', 'bubble'); bubble.innerHTML = formatMessage(text);
    stream.append(el('div', 'Reply arriving…', 'byline'), thinking(streamReasoning), bubble); $('messages').append(stream); follow(true);
}
function onEvent(event) {
    if (event.requestId !== requestId) return;
    if (event.type === 'text.replace' && stream) {
        streamText = event.text; streamReasoning = event.reasoning ?? ''; $('stop').disabled = event.state !== 'running';
        if (!streamFrame) streamFrame = requestAnimationFrame(() => {
            streamFrame = null; if (!stream) return;
            const near = isNearBottom($('messages')); stream.querySelector('.bubble').innerHTML = formatMessage(streamText);
            const details = stream.querySelector('.thinking'); details.hidden = !streamReasoning; details.querySelector('.thinking-body').innerHTML = formatMessage(streamReasoning);
            near ? follow(true) : follow();
        });
    }
    if (event.type === 'operation.verifying') { $('stop').disabled = true; status('Checking the saved conversation…'); }
}
function applyOperation(result, journal) {
    if (result.snapshot) adopt(result.snapshot);
    if (result.persistence === 'verified') {
        if (journal?.argument?.mode === 'send' && state.draft(journal.target) === journal.argument.text) {
            state.saveDraft(journal.target, ''); if (state.draftKey(snapshot) === state.draftKey(journal.target)) $('draft').value = '';
        }
        state.finish(); reviewRequired = false;
    } else { reviewRequired = true; recovery('The reply may not be saved completely. Inspect the conversation before sending again.'); }
    if (result.error?.code === 'ENGINE_UNAVAILABLE') { disconnected(result.error.message); return; }
    status(`${result.state === 'completed' ? 'Reply complete' : result.state === 'cancelled' ? 'Reply stopped' : 'Reply failed'} · saved chat ${result.persistence}${result.error ? ' · '+result.error.message : ''}`);
}
function showSendError(error) {
    const text = `${error.code ? error.code + ': ' : ''}${error.message || 'Could not send the message.'}`;
    $('send-error').textContent = text; $('send-error').hidden = false;
    console.error('[Pocket Tavern] Send failed:', error.code || 'ERROR', error.message);
}
async function generateReply(mode = 'send') {
    if (busy || reviewRequired || !connected || (mode === 'send' && !$('draft').value.trim())) return;
    $('send-error').hidden = true;
    await action(async () => {
        try {
            saveDraft(); const nextRequestId = crypto.randomUUID();
            const argument = { requestId: nextRequestId, text: mode === 'send' ? $('draft').value : '', mode,
                ...targetOf(snapshot), expectedMessage: mode === 'swipe' ? JSON.stringify(snapshot.messages.at(-1)) : undefined };
            const journal = { kind: 'send', sessionId, target: targetOf(snapshot), argument, beforeCount: snapshot.messages.length };
            state.begin(journal); requestId = nextRequestId; controls(); status('Waiting for the model…'); $('stop').disabled = true; streamReasoning = ''; makeStream();
            try { const result = await rpc('send', argument, 180000); applyOperation(result, journal); if(result.error)showSendError(result.error); await loadHistory(); }
            catch (error) {
                if (knownRejection(error)) state.finish();
                else { reviewRequired = true; recovery('Your request may already be saved. Reconnect, read the conversation, and check it before sending again.'); }
                throw error;
            } finally { requestId = null; stream = null; render(); }
        } catch(error) { showSendError(error); throw error; }
    });
}
function disconnected(message) {
    healthEpoch++; connected = false; busy = false; clearTimeout(observingTimer); observingTimer = null;
    connection.disconnect(message); requestId = null; stream = null;
    reviewRequired = !!state.pending(); recovery(message, 'Engine disconnected'); status('Engine disconnected · your local drafts are kept'); controls();
}
async function restoreTarget(desired) {
    if (!desired || !characters.some(c => c.key === desired.characterKey)) return;
    if (snapshot?.characterKey !== desired.characterKey) adopt(await rpc('select', desired.characterKey, 45000));
    await loadHistory();
    if (snapshot.chatId !== desired.chatId && chats.some(chat => chat.id === desired.chatId)) adopt(await rpc('manage', { action: 'open', ...targetOf(snapshot), name: desired.chatId }, 45000));
}
async function observe(journal, operation) {
    busy = true; requestId = journal.argument.requestId;
    if (!stream) { streamReasoning = operation.reasoning ?? ''; makeStream(operation.text); }
    else onEvent({ type: 'text.replace', ...operation });
    controls();
    $('stop').disabled = operation.state !== 'running' || !(operation.text || operation.reasoning);
    observingTimer = setTimeout(async () => {
        observingTimer = null;
        try {
            const current = await rpc('status', requestId);
            if (recoveryDecision(journal, sessionId, current) === 'observe') { await observe(journal, current); }
            else { requestId = null; stream = null; applyOperation(current, journal); busy = false; render(); await loadHistory(); controls(); }
        } catch (error) { disconnected(error.message); }
    }, 1000);
}
async function initialize() {
    if (initializing) return;
    healthEpoch++; initializing = true; busy = true; controls();
    try {
        const channel = new MessageChannel(); connection.connect(channel.port1);
        $('engine').contentWindow.postMessage({ type: 'st-mobile-connect' }, location.origin, [channel.port2]);
        const handshake = await rpc('handshake', undefined, 5000); checkBridgeBuild(handshake); await rpc('health', undefined, 7000);
        sessionId = handshake.sessionId; connected = true;
        characters = await rpc('characters'); snapshot = await rpc('snapshot');
        const journal = state.pending(), activity = await rpc('activity');
        let operation;
        if (journal?.kind === 'send' && journal.sessionId === sessionId) { try { operation = await rpc('status', journal.argument.requestId); } catch { /* Unknown operations always require review. */ } }
        const decision = recoveryDecision(journal, sessionId, operation);
        reviewRequired = decision === 'review';
        if (reviewRequired && !activity.busy && snapshot?.characterKey) snapshot = await rpc('reloadSaved', undefined, 45000);
        if (!activity.busy) await restoreTarget(journal?.target ?? state.target());
        $('draft').value = state.draft(snapshot); render();
        if (snapshot?.characterKey) await loadHistory();
        if (decision === 'observe') { reviewRequired = false; await observe(journal, operation); status('Reconnected to the existing reply. Watching its saved result…'); }
        else if (decision === 'settled') { applyOperation(operation, journal); render(); }
        else if (decision === 'review') { recovery('The app or engine restarted during a change. Nothing was resent. Open history and read the saved conversation, then confirm below.'); status('Review the saved conversation before resuming'); }
        else if (activity.busy) { reviewRequired = true; recovery('The engine is still busy. Wait for it to finish, then refresh before resuming.'); }
        else status(snapshot?.characterKey ? 'Reconnected · saved conversation loaded' : 'Engine ready · choose a character');
    } catch (error) { disconnected(error.message); throw error; }
    finally { initializing = false; busy = !!observingTimer; controls(); }
}
$('draft').oninput = () => { try { saveDraft(); } catch { status('Local draft storage is full or unavailable. Keep a copy before switching.'); } controls(); };
$('composer').onsubmit = event => { event.preventDefault(); generateReply(); };
$('draft').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); generateReply(); } };
$('stop').onclick = async () => { try { $('stop').disabled = true; await rpc('stop', requestId); status('Stopping and saving the partial reply…'); } catch (error) { status(error.message); if (connected) $('stop').disabled = false; } };
$('refresh').onclick = () => action(async () => { adopt(await rpc(reviewRequired ? 'reloadSaved' : 'snapshot', undefined, 45000)); await loadHistory(); status(reviewRequired ? 'Saved state refreshed. Inspect it before resuming.' : 'Conversation refreshed'); });
$('history-button').onclick = () => action(async () => { await loadHistory(); $('history').showModal(); });
$('close-history').onclick = () => $('history').close();
function nameChat(kind) {
    naming = kind; $('chat-name-title').textContent = kind === 'rename' ? 'Rename conversation' : 'New conversation';
    $('chat-name-input').value = kind === 'rename' ? snapshot.chatId : `Conversation ${new Date().toLocaleDateString()} ${crypto.randomUUID().slice(0,6)}`.replaceAll('/','-');
    $('chat-name').returnValue = ''; $('chat-name').showModal(); $('chat-name-input').select();
}
let deleting;
$('delete-chat').onclick = () => { deleting = targetOf(snapshot); $('delete-name').textContent = snapshot.chatId; $('delete-confirm').returnValue = ''; $('delete-confirm').showModal(); };
$('delete-confirm').addEventListener('close', () => { if ($('delete-confirm').returnValue !== 'delete') return; action(async () => {
    const old = deleting;
    await mutate('delete', () => rpc('manage', { action:'delete', ...old, name:old.chatId }, 45000), 'Conversation deleted · replacement saved');
    state.saveDraft(old, ''); $('history').close();
}); });
$('new-chat').onclick = () => nameChat('create'); $('rename-chat').onclick = () => nameChat('rename');
$('chat-name').addEventListener('close', () => { if ($('chat-name').returnValue !== 'save') return; action(async () => {
    const name = $('chat-name-input').value.trim();
    if (naming === 'rename' && state.draft({ ...targetOf(snapshot), chatId: name })) throw new Error('That name already has a local draft. Choose another name.');
    await mutate(naming, () => rpc('manage', { action: naming, ...targetOf(snapshot), name }, 45000), naming === 'rename' ? 'Conversation renamed · saved chat verified' : 'New conversation created · saved chat verified', { rename: naming === 'rename' });
    $('history').close();
}); });
$('editor').addEventListener('close', () => { if ($('editor').returnValue === 'save') action(() => mutate('edit', () => rpc('change', { ...editing, text: $('edit-text').value }), 'Message edited · saved chat verified')); });
$('messages').onscroll = () => follow(); $('jump').onclick = () => follow(true);
$('reconnect').onclick = async () => {
    if (connected && reviewRequired) {
        try { saveDraft(); } catch (error) { status(error.message); return; }
        disconnected('Reloading the engine page. Saved changes will be read before resuming; nothing will be resent.');
        $('engine').src = `/?mobileRuntime=1&reconnect=${Date.now()}`; return;
    }
    try { saveDraft(); await initialize(); }
    catch { status('Restarting the connection. Your request will not be resent.'); $('engine').src = `/?mobileRuntime=1&reconnect=${Date.now()}`; }
};
$('review').onclick = () => action(async () => {
    const current = await rpc('activity'); if (current.busy) throw new Error('The engine is still busy. Wait before resuming.');
    adopt(await rpc('reconcile'));
    const journal = state.pending();
    if (submittedUserMessage(journal, snapshot) && state.draft(journal.target) === journal.argument.text) { state.saveDraft(journal.target, ''); $('draft').value = ''; }
    state.finish(); reviewRequired = false; recovery(''); status('Saved conversation checked · ready to continue');
});
window.addEventListener('message', event => {
    if (event.source !== $('engine').contentWindow || event.origin !== location.origin || event.data?.type !== 'st-mobile-ready') return;
    initialize().catch(() => {});
});
window.addEventListener('beforeunload', () => { try { saveDraft(); } catch { /* The UI already reports storage failures. */ } });
async function checkHealth() {
    if (!connected || initializing || healthRunning) return;
    healthRunning = true; const epoch = healthEpoch;
    try {
        // A fresh server read does not depend on the iframe remaining alive.
        await probeEngine();
        if (epoch === healthEpoch && connected) await rpc('health', undefined, 5000);
    } catch (error) { if (epoch === healthEpoch && connected) disconnected(error.message); }
    finally { healthRunning = false; }
}
setInterval(checkHealth, 3000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkHealth(); });
window.addEventListener('pageshow', checkHealth);
setTimeout(() => { if (!connected && !initializing) { busy = false; recovery('The local engine has not started yet. Start the test tavern, then reconnect.', 'Waiting for the engine'); } }, 25000);
settingsPanel = createSettingsPanel({ rpc, action, adoptSnapshot: async () => adopt(await rpc('snapshot')), status, locked: () => !connected || reviewRequired });
controls(); recovery('The local engine is starting…', 'Connecting');

library = createLibrary({rpc,action,locked:()=>!connected||reviewRequired,refresh:async()=>{characters=await rpc('characters');adopt(await rpc('snapshot'));await loadHistory();}});

memoryPanel=createMemoryPanel({rpc,action,locked:()=>busy||!connected||reviewRequired,connected:()=>connected,onBusy:value=>{memoryBusy=value;controls();},refresh:async()=>{adopt(await rpc('snapshot'));}});
