import test from 'node:test';
import assert from 'node:assert/strict';
import {startNewChat,assertChatUnchanged,initializedChatSnapshot} from '../prototype/extension/new-chat.js';

function fixture(){
 const source={characterKey:'character.png',chatId:'Original'},fresh={characterKey:source.characterKey,chatId:'Fresh'},card={name:'Native',description:'Description',first_mes:'Native greeting',extensions:{foreign:true}};
 const before={...source,header:{user_name:'Native user',unknown:{keep:42}},messages:[{is_user:false,mes:'Original greeting',extra:{foreign:'keep'}}],metadata:{integrity:'old',summaryception:{layers:[[{text:'Retained memory'}]]},foreign:{keep:true},stm:{settings:{enabled:true,copy:{model:'old scoped model'}}}}};
 const files=new Map([['Original',structuredClone(before)]]),events=[];let active='Original';
 const read=async target=>{events.push('read:'+target.chatId);if(!files.has(target.chatId))throw Object.assign(Error('Not found'),{code:'CHAT_NOT_FOUND'});return structuredClone(files.get(target.chatId));};
 const deps={read,readCard:async()=>structuredClone(card),activate:async target=>{active=target.chatId;events.push('activate:'+active);},createNative:async(target,receipt)=>{events.push('create:'+target.chatId);active=target.chatId;files.set(target.chatId,{...target,header:{unknown:'native header'},messages:[{is_user:false,is_system:false,mes:card.first_mes,swipes:[card.first_mes,'Native alternative'],extra:{native:'preserved'}}],metadata:{integrity:'new',stm:{newChat:receipt}}});},verifyNative:async target=>{assert.equal(active,target.chatId);events.push('verify:'+target.chatId);return read(target);},deleteSaved:async target=>{events.push('delete:'+target.chatId);files.delete(target.chatId);}};
 const arg={action:'newChat',target:source,before:structuredClone(before),cardRevision:JSON.stringify(card),newChatId:fresh.chatId,operationId:'owned',deleteCurrent:false};
 return {arg,deps,files,events,before,card,get active(){return active;}};
}
test('fresh native greeting is verified without old deletion or copied chat settings/Memory',async()=>{
 const f=fixture(),result=await startNewChat(f.arg,f.deps);
 assert.equal(result.snapshot.chatId,'Fresh');assert.deepEqual(result.snapshot.messages[0].swipes,['Native greeting','Native alternative']);assert.equal(result.snapshot.messages[0].extra.native,'preserved');
 assert.equal(result.snapshot.metadata.summaryception,undefined);assert.equal(result.snapshot.metadata.stm.settings,undefined);assert.deepEqual(f.files.get('Original'),f.before);assert.equal(result.undo,undefined);assert.equal(f.active,'Fresh');assert.ok(!f.events.some(e=>e.startsWith('delete:')));
});
test('optional deletion follows two independent native verifications and retains a complete Undo copy',async()=>{
 const f=fixture();f.arg.deleteCurrent=true;const result=await startNewChat(f.arg,f.deps);
 assert.equal(f.files.has('Original'),false);assert.equal(f.active,'Fresh');assert.deepEqual(result.undo,{before:f.before,after:null});assert.equal(result.deleted,true);
 const deletion=f.events.indexOf('delete:Original');assert.ok(deletion>f.events.indexOf('create:Fresh'));assert.equal(f.events.slice(0,deletion).filter(e=>e==='verify:Fresh').length,2);assert.equal(f.events.at(-1),'read:Original');
});
test('existing new-chat filename is never opened, overwritten or automatically retried',async()=>{
 const f=fixture();f.files.set('Fresh',{...f.before,chatId:'Fresh'});
 await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NAME_EXISTS');assert.ok(!f.events.some(e=>e.startsWith('activate:')||e.startsWith('create:')));assert.equal(f.files.get('Fresh').messages[0].mes,'Original greeting');
});
test('incomplete cards, stale card revisions and invalid deletion choices fail before any mutation',async()=>{
 for(const mutate of [f=>{f.card.first_mes=' ';f.arg.cardRevision=JSON.stringify(f.card);},f=>{f.card.description=' ';f.arg.cardRevision=JSON.stringify(f.card);},f=>{f.card.extensions.foreign=false;},f=>{f.arg.deleteCurrent=undefined;}]){
  const f=fixture();mutate(f);await assert.rejects(startNewChat(f.arg,f.deps));assert.ok(!f.events.some(e=>e.startsWith('activate:')||e.startsWith('create:')||e.startsWith('delete:')));
 }
});
test('source messages, Memory, opaque metadata and unknown header fields all guard deletion',async()=>{
 for(const mutate of [v=>v.messages[0].mes='changed',v=>v.metadata.summaryception.layers=[],v=>v.metadata.foreign.keep=false,v=>v.header.unknown.keep=99]){
  const f=fixture();mutate(f.files.get('Original'));await assert.rejects(startNewChat(f.arg,f.deps));assert.ok(!f.events.some(e=>e.startsWith('create:')||e.startsWith('delete:')));
 }
 const f=fixture(),native=f.deps.createNative;f.arg.deleteCurrent=true;f.deps.createNative=async(...args)=>{await native(...args);f.files.get('Original').header.unknown.keep=99;};
 await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.equal(f.files.has('Original'),true);assert.equal(f.files.has('Fresh'),true);assert.ok(!f.events.includes('delete:Original'));
});
test('failed greeting persistence or ownership checks always keep the old chat',async()=>{
 for(const corrupt of [v=>v.metadata.stm.newChat.id='not-owned',v=>v.messages=[],v=>v.messages[0].is_user=true,v=>v.messages[0].mes=' ']){
  const f=fixture(),native=f.deps.createNative;f.arg.deleteCurrent=true;f.deps.createNative=async(...args)=>{await native(...args);corrupt(f.files.get('Fresh'));};
  await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.equal(f.files.has('Original'),true);assert.ok(!f.events.includes('delete:Original'));
 }
 const f=fixture();f.arg.deleteCurrent=true;f.deps.verifyNative=async()=>{throw Error('Save mismatch');};await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.equal(f.files.has('Original'),true);
});
test('unacknowledged deletion preserves durable recovery arguments and never replays creation',async()=>{
 const f=fixture();f.arg.deleteCurrent=true;const original=structuredClone(f.arg);f.deps.deleteSaved=async target=>{f.files.delete(target.chatId);throw Error('Disconnected after deletion');};
 await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.deepEqual(f.arg,original);assert.equal(f.files.has('Fresh'),true);assert.equal(f.files.has('Original'),false);assert.deepEqual(f.arg.before,f.before);
 await assert.rejects(startNewChat(f.arg,f.deps));assert.equal(f.events.filter(e=>e==='create:Fresh').length,1);
});
test('a BUSY result after creation begins becomes explicit uncertainty instead of a queued retry',async()=>{
 const f=fixture();f.deps.createNative=async()=>{throw Object.assign(Error('Engine became busy'),{code:'BUSY'});};await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.equal(f.files.has('Original'),true);
});
test('ST empty timer initialization is equivalent, while nonempty timers remain guarded',()=>{
 const f=fixture(),current=structuredClone(f.before);current.metadata.timedWorldInfo={sticky:{},cooldown:{}};assert.doesNotThrow(()=>assertChatUnchanged(f.before,current));current.metadata.timedWorldInfo.sticky.book=42;assert.throws(()=>assertChatUnchanged(f.before,current));
});

test('native Author’s Note initialization uses actual defaults without accepting edits',()=>{
 const f=fixture(),expected=initializedChatSnapshot(f.before,{default:'Native note',defaultDepth:7});
 assert.equal(expected.metadata.note_prompt,'Native note');assert.equal(expected.metadata.note_depth,7);assert.equal(f.before.metadata.note_prompt,undefined);
 assert.doesNotThrow(()=>assertChatUnchanged(expected,structuredClone(expected)));
 for(const change of [v=>v.metadata.note_depth=8,v=>v.metadata.foreign.keep=false,v=>v.header.unknown.keep=9]){const current=structuredClone(expected);change(current);assert.throws(()=>assertChatUnchanged(expected,current));}
 const existing=structuredClone(f.before);existing.metadata.note_depth=2;assert.equal(initializedChatSnapshot(existing,{defaultDepth:7}).metadata.note_depth,2);
});
test('native initialization becomes the exact post-load source guard without changing the durable backup',async()=>{
 const f=fixture();f.arg.deleteCurrent=true;
 f.deps.activate=async()=>{const initialized=initializedChatSnapshot(f.before,{default:'Native setting'});f.files.set('Original',structuredClone(initialized));return initialized;};
 const result=await startNewChat(f.arg,f.deps);assert.deepEqual(result.undo.before,f.before);assert.equal(f.arg.before.metadata.note_prompt,undefined);
 const conflict=fixture();conflict.arg.deleteCurrent=true;conflict.deps.activate=async()=>{const expected=initializedChatSnapshot(conflict.before);const changed=structuredClone(expected);changed.metadata.note_depth=99;conflict.files.set('Original',changed);return expected;};
 await assert.rejects(startNewChat(conflict.arg,conflict.deps));assert.equal(conflict.files.has('Original'),true);assert.ok(!conflict.events.some(e=>e.startsWith('create:')));
});

test('uncertain native source loading retains the full backup before greeting creation',async()=>{
 const f=fixture(),backup=structuredClone(f.arg);
 f.deps.activate=async()=>{throw Error('Native source save acknowledgement lost');};
 await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='NEW_CHAT_UNCERTAIN');assert.deepEqual(f.arg,backup);assert.ok(!f.events.some(e=>e.startsWith('create:')||e.startsWith('delete:')));
});

test('fresh-character creation needs no source, never opens an old chat and never deletes one',async()=>{
 const f=fixture();f.arg.target={characterKey:f.arg.target.characterKey};f.arg.before=null;
 const result=await startNewChat(f.arg,f.deps);assert.equal(result.snapshot.chatId,'Fresh');assert.deepEqual(f.files.get('Original'),f.before);assert.ok(!f.events.some(e=>e.startsWith('activate:')||e.startsWith('delete:')));
 const first=fixture();first.files.delete('Original');first.arg.target={characterKey:first.arg.target.characterKey};first.arg.before=null;await startNewChat(first.arg,first.deps);assert.equal(first.files.size,1);
});
test('source-free creation cannot request deletion or carry an unrelated source snapshot',async()=>{
 for(const mutate of [f=>f.arg.deleteCurrent=true,f=>f.arg.before=f.before]){const f=fixture();f.arg.target={characterKey:f.arg.target.characterKey};f.arg.before=null;mutate(f);await assert.rejects(startNewChat(f.arg,f.deps),e=>e.code==='INVALID_ARGUMENT');assert.ok(!f.events.some(e=>e.startsWith('create:')));}
});
