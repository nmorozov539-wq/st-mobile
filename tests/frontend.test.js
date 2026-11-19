import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalState, recoveryDecision, isNearBottom, submittedUserMessage } from '../prototype/frontend/state.js';
import { formatMessage } from '../prototype/frontend/format.js';
import { RuntimeConnection } from '../prototype/frontend/transport.js';
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value), removeItem: key => map.delete(key) }; };
const a = { characterKey: 'a.png', chatId: 'first' }, b = { characterKey: 'a.png', chatId: 'second' }, c = { characterKey: 'b.png', chatId: 'first' };
test('drafts stay isolated per character and conversation and survive app recreation', () => {
    const storage = memory(), state = createLocalState(storage);
    state.saveDraft(a,'A'); state.saveDraft(b,'B'); state.saveDraft(c,'C');
    const restored = createLocalState(storage);
    assert.equal(restored.draft(a),'A'); assert.equal(restored.draft(b),'B'); assert.equal(restored.draft(c),'C');
    restored.moveDraft(a, { ...a, chatId: 'renamed' }); assert.equal(restored.draft(a),''); assert.equal(restored.draft({...a,chatId:'renamed'}),'A');
    assert.throws(() => restored.moveDraft(c,b), /already has a local draft/);
});
test('corrupt local state fails safely and a request journal survives reload', () => {
    const storage = memory(); storage.setItem('pocket-tavern.v1.pending','invalid');
    const state = createLocalState(storage); assert.equal(state.pending(),null);
    state.begin({kind:'send',target:a,sessionId:'old',argument:{requestId:'one'}});
    assert.equal(createLocalState(storage).pending().argument.requestId,'one');
    state.finish(); assert.equal(state.pending(),null);
});
test('recovery watches same-session requests but never replays unknown or restarted writes', () => {
    const journal = {kind:'send',sessionId:'one',target:a};
    assert.equal(recoveryDecision(journal,'one',{state:'running'}),'observe');
    assert.equal(recoveryDecision(journal,'one',{state:'failed',persistence:'verified'}),'settled');
    assert.equal(recoveryDecision(journal,'two',{state:'completed',persistence:'verified'}),'review');
    assert.equal(recoveryDecision(journal,'one',null),'review');
    assert.equal(recoveryDecision({...journal,kind:'rename'},'one',null),'review');
});
test('review only recognizes newly saved user text in the original conversation', () => {
    const journal = {kind:'send',target:a,argument:{mode:'send',text:'same'},beforeCount:1};
    assert.equal(submittedUserMessage(journal,{...a,messages:[{is_user:true,mes:'same'}]}),false);
    assert.equal(submittedUserMessage(journal,{...a,messages:[{}, {is_user:true,mes:'same'}]}),true);
    assert.equal(submittedUserMessage(journal,{...b,messages:[{}, {is_user:true,mes:'same'}]}),false);
});
test('Markdown renders useful structure while escaping HTML and unsafe links', () => {
    const formatted = formatMessage('**bold** and *emphasis*\n\n- one\n- two\n\n```js\n<script>alert(1)</script>\n```\n\n[good](https://example.com) [bad](javascript:alert)');
    assert.match(formatted, /<strong>bold<\/strong>/); assert.match(formatted, /<em>emphasis<\/em>/);
    assert.match(formatted, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
    assert.match(formatted, /&lt;script&gt;/); assert.doesNotMatch(formatted, /<script|href="javascript:/);
    assert.match(formatted, /rel="noopener noreferrer"/);
    const malicious = formatMessage('<img src=x onerror=alert(1)> [x](https://x.test/"onmouseover="evil)');
    assert.doesNotMatch(malicious, /<img|"onmouseover=/); assert.match(malicious,/&quot;/);
    assert.match(formatMessage('```\nunfinished'), /<pre><code>unfinished<\/code><\/pre>/);
});
test('scroll following distinguishes reading older messages from staying at the bottom', () => {
    assert.equal(isNearBottom({scrollHeight:2000,scrollTop:100,clientHeight:500}),false);
    assert.equal(isNearBottom({scrollHeight:2000,scrollTop:1470,clientHeight:500}),false);
    assert.equal(isNearBottom({scrollHeight:2000,scrollTop:1498,clientHeight:500}),false);
    assert.equal(isNearBottom({scrollHeight:2000,scrollTop:1499.5,clientHeight:500}),true);
    assert.equal(isNearBottom({scrollHeight:2000,scrollTop:1500,clientHeight:500}),true);
});
function port() { return { sent:[], start(){}, close(){this.closed=true;}, postMessage(data){this.sent.push(data);} }; }
test('transport rejects interrupted calls and ignores responses from the old connection', async () => {
    const connection = new RuntimeConnection(), old = port(), fresh = port(); connection.connect(old);
    const pending = connection.request('manage',{name:'new'}); const rejected = assert.rejects(pending,{code:'DISCONNECTED'});
    connection.connect(fresh); await rejected;
    const next = connection.request('snapshot');
    old.onmessage({data:{id:fresh.sent[0].id,result:'old'}});
    fresh.onmessage({data:{id:fresh.sent[0].id,result:'fresh'}}); assert.equal(await next,'fresh');
    assert.equal(connection.pending.size,0); connection.disconnect();
});
test('transport timeouts preserve uncertainty and generation events extend the deadline', async () => {
    const connection = new RuntimeConnection(), current = port(); connection.connect(current);
    await assert.rejects(connection.request('manage',{},5),{code:'TIMEOUT'});
    const pending = connection.request('send',{requestId:'one'},100);
    current.onmessage({data:{event:{type:'text.replace',requestId:'one',text:'hello'}}});
    current.onmessage({data:{id:current.sent.at(-1).id,result:{state:'completed'}}});
    assert.equal((await pending).state,'completed'); connection.disconnect();
});

import {checkBridgeBuild,FRONTEND_BUILD,BRIDGE_PROTOCOL} from '../prototype/frontend/build.js';
test('mixed frontend and engine releases fail before any chat request',()=>{
 assert.doesNotThrow(()=>checkBridgeBuild({bridgeBuild:FRONTEND_BUILD,protocolVersion:BRIDGE_PROTOCOL}));
 for(const handshake of [{},{bridgeBuild:'0.5.0'}])assert.throws(()=>checkBridgeBuild(handshake),{code:'BUILD_MISMATCH'});
 assert.throws(()=>checkBridgeBuild({bridgeBuild:FRONTEND_BUILD,protocolVersion:1}),{code:'PROTOCOL_MISMATCH'});
});
