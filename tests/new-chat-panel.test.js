import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewChatPanel} from '../prototype/frontend/new-chat-panel.js';
function fixture(){
 const nodes=new Map();for(const id of ['new-chat-confirm','new-chat-apply','new-chat-delete-current','new-chat-cancel','new-chat-target','new-chat-current','new-chat-status'])nodes.set(id,{open:false,disabled:false,checked:false,textContent:'',addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}});
 const previous=globalThis.document;globalThis.document={getElementById:id=>nodes.get(id)};
 return {nodes,restore:()=>globalThis.document=previous,card:{name:'Native',target:{characterKey:'native.png',chatId:'Source'}},origin:{target:{characterKey:'native.png',chatId:'Source'},before:{messages:[]},newChatId:'Fresh',operationId:'owned'}};
}
test('Back during a delayed read never arms a hidden confirmation',async()=>{
 const f=fixture();let release;
 try{const panel=createNewChatPanel({action:fn=>fn(),prepare:()=>new Promise(r=>release=r),apply:()=>assert.fail('No mutation allowed'),available:()=>true});const pending=panel.open(f.card);f.nodes.get('new-chat-cancel').onclick();release(f.origin);await pending;assert.equal(f.nodes.get('new-chat-confirm').open,false);assert.equal(f.nodes.get('new-chat-apply').disabled,true);}
 finally{f.restore();}
});
test('duplicate clicks and lost acknowledgements cannot replay the mutation',async()=>{
 const f=fixture();let release,calls=0,error;
 try{
  const panel=createNewChatPanel({action:async fn=>{try{return await fn();}catch(e){error=e;}},prepare:async()=>f.origin,apply:async()=>{calls++;await new Promise(r=>release=r);throw Object.assign(Error('Review saved work'),{code:'NEW_CHAT_UNCERTAIN'});},available:()=>true});
  await panel.open(f.card);assert.equal(f.nodes.get('new-chat-delete-current').checked,false);
  const first=f.nodes.get('new-chat-apply').onclick();await f.nodes.get('new-chat-apply').onclick();assert.equal(calls,1);release();await first;assert.equal(error.code,'NEW_CHAT_UNCERTAIN');assert.equal(f.nodes.get('new-chat-apply').disabled,true);await f.nodes.get('new-chat-apply').onclick();assert.equal(calls,1);
 }finally{f.restore();}
});
test('confirmation shows an explicit combined action and captures the chosen source',async()=>{
 const f=fixture();let argument;
 try{
  const panel=createNewChatPanel({action:fn=>fn(),prepare:async()=>f.origin,apply:async value=>argument=value,available:()=>true});await panel.open(f.card);f.nodes.get('new-chat-delete-current').checked=true;f.nodes.get('new-chat-delete-current').onchange();assert.equal(f.nodes.get('new-chat-apply').textContent,'Start new & delete current');await f.nodes.get('new-chat-apply').onclick();assert.equal(argument.deleteCurrent,true);assert.equal(argument.target.chatId,'Source');assert.equal(argument.newChatId,'Fresh');
 }finally{f.restore();}
});
