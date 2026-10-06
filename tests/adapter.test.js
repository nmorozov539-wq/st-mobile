import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapter } from '../prototype/extension/adapter.js';
function setup() {
    let busy = false;
    const ctx = { characters: [{ avatar: 'a.png', name: '<A>' }, { avatar: 'b.png', name: 'B' }],
        characterId: 0, groupId: null, chatId: 'fixture',
        chat: [{ mes: 'hello', extra: { custom: 42 } }], chatMetadata: { unknown: true },
        async selectCharacterById(id) { this.characterId = id; } };
    const adapter = createAdapter({ getContext: () => ctx, isBusy: () => busy,
        supportedVersion: '1.19.0', runtimeVersion: '1.19.0' });
    return { ctx, adapter, setBusy(value) { busy = value; } };
}
test('readiness and version mismatch block operations', () => {
    const { adapter } = setup();
    assert.throws(() => adapter.handshake(), { code: 'NOT_READY' });
    const other = createAdapter({ getContext: () => ({}), isBusy: () => false,
        supportedVersion: '1.19.0', runtimeVersion: '1.18.0' });
    other.markReady();
    assert.throws(() => other.handshake(), { code: 'VERSION_MISMATCH' });
});
test('snapshots preserve unknown metadata without exposing mutable state', () => {
    const { adapter, ctx } = setup(); adapter.markReady();
    const snapshot = adapter.snapshot();
    assert.equal(snapshot.messages[0].extra.custom, 42);
    snapshot.messages[0].mes = 'changed'; snapshot.metadata.unknown = false;
    assert.equal(ctx.chat[0].mes, 'hello'); assert.equal(ctx.chatMetadata.unknown, true);
});
test('selection resolves stable character keys after reordering', async () => {
    const { adapter, ctx } = setup(); adapter.markReady();
    ctx.characters.reverse();
    const result = await adapter.selectCharacter('a.png');
    assert.equal(result.characterKey, 'a.png'); assert.equal(ctx.characterId, 1);
});
test('busy, removed characters, and silently refused selection are reported', async () => {
    const { adapter, ctx, setBusy } = setup(); adapter.markReady();
    setBusy(true); await assert.rejects(adapter.selectCharacter('b.png'), { code: 'BUSY' });
    setBusy(false); await assert.rejects(adapter.selectCharacter('missing.png'), { code: 'NOT_FOUND' });
    ctx.selectCharacterById = async () => {};
    await assert.rejects(adapter.selectCharacter('b.png'), { code: 'SELECTION_FAILED' });
});
test('overlapping selection is rejected and disposal invalidates the adapter', async () => {
    const { adapter, ctx } = setup(); adapter.markReady();
    let finish;
    ctx.selectCharacterById = id => new Promise(resolve => { finish = () => { ctx.characterId = id; resolve(); }; });
    const first = adapter.selectCharacter('b.png');
    await assert.rejects(adapter.selectCharacter('a.png'), { code: 'BUSY' });
    finish(); await first;
    adapter.dispose(); assert.throws(() => adapter.snapshot(), { code: 'DISPOSED' });
});

function withGeneration(overrides = {}) {
    const ctx = { characters: [{ avatar: 'a.png', name: 'A' }], characterId: 0,
        groupId: null, chatId: 'fixture', chat: [{ mes: 'greeting', is_user: false }], chatMetadata: {} };
    let count = 0;
    let listener;
    const generation = {
        validate() {},
        subscribeText(fn) { listener = fn; return () => { listener = null; }; },
        async submit(text) {
            count++;
            ctx.chat.push({ mes: text, is_user: true });
            listener('First'); listener('First second');
            ctx.chat.push({ mes: 'First second', is_user: false });
        },
        async verifyPersistence() {}, stop() { return true; }, ...overrides,
    };
    const adapter = createAdapter({ getContext: () => ctx, isBusy: () => false,
        supportedVersion: '1.19.0', runtimeVersion: '1.19.0', generation });
    adapter.markReady();
    const request = { requestId: 'request-1', text: 'hello', characterKey: 'a.png', chatId: 'fixture' };
    return { adapter, ctx, request, count: () => count };
}
test('stream replacement and successful persistence precede completion; replay does not resubmit', async () => {
    const { adapter, request, count } = withGeneration();
    const text = [];
    adapter.subscribe(event => { if (event.type === 'text.replace') text.push(event.text); });
    const result = await adapter.sendMessage(request);
    assert.equal(result.state, 'completed'); assert.equal(result.persistence, 'verified');
    assert.deepEqual(text, ['First', 'First second']);
    result.snapshot.messages[0].mes = 'mutated';
    const replay = await adapter.sendMessage(request);
    assert.equal(count(), 1); assert.equal(replay.snapshot.messages[0].mes, 'greeting');
    await assert.rejects(adapter.sendMessage({ ...request, text: 'different' }), { code: 'REQUEST_CONFLICT' });
});
test('stale targets are rejected before submitting', async () => {
    const { adapter, request, count } = withGeneration();
    await assert.rejects(adapter.sendMessage({ ...request, chatId: 'other-chat' }), { code: 'STALE_TARGET' });
    assert.equal(count(), 0);
});
test('save failure cannot be reported as completion or retried into duplicate generation', async () => {
    const { adapter, request, count } = withGeneration({ async verifyPersistence() {
        throw Object.assign(new Error('not saved'), { code: 'PERSISTENCE_MISMATCH' });
    } });
    const result = await adapter.sendMessage(request);
    assert.equal(result.state, 'failed'); assert.equal(result.persistence, 'unverified');
    assert.equal(result.error.code, 'PERSISTENCE_MISMATCH');
    await adapter.sendMessage(request); assert.equal(count(), 1);
});
test('cancellation finishes only after submission settles and save is verified', async () => {
    let finish;
    const { adapter, request, ctx } = withGeneration({ submit(text) {
        ctx.chat.push({ mes: text, is_user: true });
        return new Promise(resolve => { finish = () => { ctx.chat.push({ mes: 'partial', is_user: false }); resolve(); }; });
    } });
    const pending = adapter.sendMessage(request);
    assert.equal(adapter.stopGeneration(request.requestId).state, 'stopping');
    assert.equal(adapter.operationStatus(request.requestId).persistence, 'unverified');
    await assert.rejects(adapter.selectCharacter('a.png'), { code: 'BUSY' });
    finish();
    const result = await pending;
    assert.equal(result.state, 'cancelled'); assert.equal(result.persistence, 'verified');
    assert.equal(result.text, 'partial');
});
test('provider failure reports saved user message independently of generation failure', async () => {
    const { adapter, request, ctx } = withGeneration({ async submit(text) {
        ctx.chat.push({ mes: text, is_user: true }); throw new Error('provider offline');
    } });
    const result = await adapter.sendMessage(request);
    assert.equal(result.state, 'failed'); assert.equal(result.persistence, 'verified');
    assert.equal(result.error.message, 'provider offline');
    assert.equal(result.snapshot.messages.at(-1).mes, request.text);
});
test('overlapping sends are blocked while identical retries join the original operation', async () => {
    let finish;
    let submitted = 0;
    const { adapter, request, ctx } = withGeneration({ submit(text) {
        submitted++;
        ctx.chat.push({ mes: text, is_user: true });
        return new Promise(resolve => { finish = () => { ctx.chat.push({ mes: 'reply', is_user: false }); resolve(); }; });
    } });
    const first = adapter.sendMessage(request);
    const retry = adapter.sendMessage(request);
    await assert.rejects(adapter.sendMessage({ ...request, requestId: 'another' }), { code: 'BUSY' });
    finish();
    const results = await Promise.all([first, retry]);
    assert.equal(submitted, 1); assert.deepEqual(results[0], results[1]);
    assert.throws(() => adapter.operationStatus('unknown'), { code: 'UNKNOWN_OPERATION' });
});
test('stop cannot reclassify a finished response while persistence is being checked', async () => {
    let verified;
    const { adapter, request } = withGeneration({ verifyPersistence() {
        return new Promise(resolve => { verified = resolve; });
    } });
    const pending = adapter.sendMessage(request);
    // The mock submit is immediate; allow its promise to settle.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(adapter.operationStatus(request.requestId).state, 'verifying');
    assert.throws(() => adapter.stopGeneration(request.requestId), { code: 'NOT_ACTIVE' });
    verified(); assert.equal((await pending).state, 'completed');
});

test('edits reject stale content before mutation and verify the saved result', async () => {
    let edited = 0, verified = 0;
    const { adapter, ctx } = withGeneration({ async edit(index, text) { edited++; ctx.chat[index].mes = text; }, async verifyPersistence() { verified++; } });
    const input = { characterKey: 'a.png', chatId: 'fixture', messageId: 0, expectedMessage: JSON.stringify(ctx.chat[0]), text: 'revised' };
    await assert.rejects(adapter.changeMessage({ ...input, expectedMessage: '{}' }), { code: 'STALE_MESSAGE' });
    assert.equal(edited, 0);
    const result = await adapter.changeMessage(input);
    assert.equal(result.messages[0].mes, 'revised'); assert.equal(verified, 1);
    await assert.rejects(adapter.changeMessage(input), { code: 'STALE_MESSAGE' });
});
test('swipe selection guards bounds and only allows the last assistant message', async () => {
    let selected = 0;
    const { adapter, ctx } = withGeneration({ async selectSwipe(id) { selected++; ctx.chat[0].swipe_id = id; ctx.chat[0].mes = ctx.chat[0].swipes[id]; } });
    ctx.chat[0].swipes = ['greeting', 'other']; ctx.chat[0].swipe_id = 0;
    const input = { characterKey: 'a.png', chatId: 'fixture', messageId: 0, expectedMessage: JSON.stringify(ctx.chat[0]), swipeId: 1 };
    await assert.rejects(adapter.changeMessage({ ...input, swipeId: 2 }), { code: 'INVALID_SWIPE' });
    assert.equal(selected, 0); assert.equal((await adapter.changeMessage(input)).messages[0].mes, 'other');
});
test('alternative generation preserves original replies and deduplicates repeated requests', async () => {
    let generated = 0;
    const { adapter, ctx, request } = withGeneration({ async generateSwipe() { generated++; ctx.chat[0].swipes = ['greeting', 'alternative']; ctx.chat[0].swipe_id = 1; ctx.chat[0].mes = 'alternative'; } });
    const input = { ...request, mode: 'swipe', text: '', expectedMessage: JSON.stringify(ctx.chat[0]) };
    assert.equal((await adapter.sendMessage(input)).state, 'completed');
    await adapter.sendMessage(input); assert.equal(generated, 1); assert.equal(ctx.chat.length, 1);
});
test('a refused alternative cannot be reported as successful generation', async () => {
    const { adapter, ctx, request } = withGeneration({ async generateSwipe() {} });
    const result = await adapter.sendMessage({ ...request, mode: 'swipe', text: '', expectedMessage: JSON.stringify(ctx.chat[0]) });
    assert.equal(result.state, 'failed'); assert.equal(result.error.code, 'SWIPE_FAILED');
});
test('silently refused message changes fail, and save failures release the mutation lock', async () => {
    const { adapter, ctx } = withGeneration({ async edit() {} });
    const input = { characterKey: 'a.png', chatId: 'fixture', messageId: 0, expectedMessage: JSON.stringify(ctx.chat[0]), text: 'changed' };
    await assert.rejects(adapter.changeMessage(input), { code: 'UPDATE_FAILED' });
    assert.equal(adapter.snapshot().messages[0].mes, 'greeting');
    const other = withGeneration({ async edit(index, text) { other.ctx.chat[index].mes = text; }, async verifyPersistence() { throw new Error('disk failed'); } });
    await assert.rejects(other.adapter.changeMessage(input), /disk failed/);
    await assert.rejects(other.adapter.changeMessage(input), { code: 'STALE_MESSAGE' });
});

function withChats() {
    const fixture = withGeneration();
    let rows = [{id:'fixture'}, {id:'older'}], opened = 0;
    const generation = { verifyPersistence: async () => {}, listChats: async () => structuredClone(rows),
        openChat: async name => { opened++; fixture.ctx.chatId = name; if (!rows.some(row=>row.id===name)) rows.push({id:name}); },
        renameChat: async (old,name) => { fixture.ctx.chatId=name; rows=rows.filter(row=>row.id!==old).concat({id:name}); } };
    const adapter = createAdapter({getContext:()=>fixture.ctx,isBusy:()=>false,supportedVersion:'1.19.0',runtimeVersion:'1.19.0',generation}); adapter.markReady();
    return {...fixture,adapter,generation,opened:()=>opened};
}
test('history guards prevent nonexistent opens, name collisions and path-like filenames', async () => {
    const {adapter,opened} = withChats(); const base={characterKey:'a.png',chatId:'fixture'};
    await assert.rejects(adapter.manageChat({...base,action:'open',name:'missing'}),{code:'CHAT_NOT_FOUND'});
    await assert.rejects(adapter.manageChat({...base,action:'create',name:'older'}),{code:'NAME_EXISTS'});
    await assert.rejects(adapter.manageChat({...base,action:'rename',name:'../unsafe'}),{code:'INVALID_NAME'});
    assert.equal(opened(),0);
    assert.equal((await adapter.manageChat({...base,action:'open',name:'older'})).chatId,'older');
});
test('new and renamed chats must appear in persisted history with the old name removed', async () => {
    const {adapter}=withChats(); const base={characterKey:'a.png',chatId:'fixture'};
    assert.equal((await adapter.manageChat({...base,action:'create',name:'new'})).chatId,'new');
    assert.equal((await adapter.manageChat({...base,chatId:'new',action:'rename',name:'renamed'})).chatId,'renamed');
    const names=(await adapter.listChats()).map(row=>row.id); assert.ok(names.includes('renamed')); assert.ok(!names.includes('new'));
});
test('failed management persistence never opens or overwrites a conversation', async () => {
    const {adapter,generation,opened}=withChats(); generation.verifyPersistence=async()=>{throw new Error('unsaved');};
    await assert.rejects(adapter.manageChat({characterKey:'a.png',chatId:'fixture',action:'create',name:'new'}),/unsaved/);
    assert.equal(opened(),0);
});

test('recovery reloads saved state without saving or replaying a request and guards concurrent work', async () => {
    const ctx = {characters:[{avatar:'a.png',name:'A'}],characterId:0,groupId:null,chatId:'fixture',chat:[{mes:'unsaved partial'}],chatMetadata:{unknown:true}};
    let busy = true, reloaded = 0, verified = 0;
    const adapter = createAdapter({getContext:()=>ctx,isBusy:()=>busy,supportedVersion:'1.19.0',runtimeVersion:'1.19.0',generation:{
        reloadSavedChat:async()=>{reloaded++;ctx.chat=[{mes:'saved reply'}];},
        verifyPersistence:async snapshot=>{verified++;assert.equal(snapshot.messages[0].mes,'saved reply');},
        submit:()=>assert.fail('must never resend'),saveChat:()=>assert.fail('must never save during recovery'),
    }});
    adapter.markReady();
    await assert.rejects(adapter.reloadSaved(),{code:'BUSY'});assert.equal(reloaded,0);
    busy = false;
    assert.equal((await adapter.reloadSaved()).messages[0].mes,'saved reply');
    assert.equal(reloaded,1); assert.equal(verified,1);
});

test('configuration rejects stale revisions and shares the chat operation lock', async () => {
    const {ctx} = withGeneration(); let finish, changes=0;
    const configuration={read:()=>({revision:'current',selected:{preset:'Default'}}),change:()=>new Promise(resolve=>{changes++;finish=()=>resolve(configuration.read());})};
    const adapter=createAdapter({getContext:()=>ctx,isBusy:()=>false,supportedVersion:'1.19.0',runtimeVersion:'1.19.0',configuration});adapter.markReady();
    await assert.rejects(adapter.configure({revision:'old',kind:'preset'}),{code:'STALE_SETTINGS'});assert.equal(changes,0);
    const pending=adapter.configure({revision:'current',kind:'preset'});
    await assert.rejects(adapter.selectCharacter('a.png'),{code:'BUSY'});
    await assert.rejects(adapter.configure({revision:'current'}),{code:'BUSY'});
    finish();await pending;assert.equal(adapter.activity().busy,false);
});

test('deletion must remove the saved chat and switch to a verified replacement', async () => {
    const {adapter,ctx,generation}=withChats();
    let rows=[{id:'fixture'},{id:'older'}];generation.listChats=async()=>rows;
    generation.deleteChat=async name=>{rows=rows.filter(row=>row.id!==name);ctx.chatId='older';};
    assert.equal((await adapter.manageChat({action:'delete',characterKey:'a.png',chatId:'fixture',name:'fixture'})).chatId,'older');
    assert.ok(!(await adapter.listChats()).some(row=>row.id==='fixture'));
    generation.deleteChat=async()=>{};
    await assert.rejects(adapter.manageChat({action:'delete',characterKey:'a.png',chatId:'older',name:'older'}),{code:'DELETE_FAILED'});
});

test('reasoning streams separately from reply text and survives the completion snapshot', async () => {
    const {ctx,adapter,request}=withGeneration({subscribeText(fn){this.receive=fn;return()=>{};},async submit(text){ctx.chat.push({mes:text,is_user:true});this.receive('', 'Considering');this.receive('Answer','Considering');ctx.chat.push({mes:'Answer',is_user:false,extra:{reasoning:'Considering',reasoning_duration:1}});}});
    const events=[];adapter.subscribe(event=>events.push(event));
    const result=await adapter.sendMessage(request);
    assert.equal(events.find(event=>event.type==='text.replace').text,'');
    assert.equal(events.find(event=>event.type==='text.replace').reasoning,'Considering');
    assert.equal(result.reasoning,'Considering');assert.equal(result.snapshot.messages.at(-1).extra.reasoning,'Considering');
});
