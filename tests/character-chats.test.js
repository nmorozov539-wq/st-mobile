import test from 'node:test';
import assert from 'node:assert/strict';
import {readCharacterHistory} from '../prototype/extension/character-history.js';
import {createCharacterChats} from '../prototype/frontend/character-chats.js';

test('character history is an uncapped read of the requested character, independent of active generation',async()=>{
 const native=Array.from({length:1203},(_,i)=>({file_name:`Native chat ${i}.jsonl`,mes:`Message ${i}`,last_mes:String(i).padStart(5,'0'),chat_items:i}));let calls=[];
 const rows=await readCharacterHistory('other.png',{characters:[{avatar:'generating.png'},{avatar:'other.png'}],post:async(url,arg)=>{calls.push({url,arg});return native;}});
 assert.equal(rows.length,1203);assert.equal(rows[0].chatId,'Native chat 1202');assert.equal(rows.at(-1).chatId,'Native chat 0');assert.ok(rows.every(r=>r.characterKey==='other.png'));
 assert.deepEqual(calls,[{url:'/api/characters/chats',arg:{avatar_url:'other.png'}}]);assert.equal(native[0].file_name,'Native chat 0.jsonl');
});
test('missing character, empty history and malformed history have distinct outcomes',async()=>{
 await assert.rejects(readCharacterHistory('missing',{characters:[],post:()=>assert.fail('must not request missing character')}),e=>e.code==='CHAT_NOT_FOUND');
 assert.deepEqual(await readCharacterHistory('a',{characters:[{avatar:'a'}],post:async()=>({error:true})}),[]);
 await assert.rejects(readCharacterHistory('a',{characters:[{avatar:'a'}],post:async()=>({unexpected:true})}),e=>e.code==='HISTORY_FAILED');
});

// A small DOM surface exercises delayed-read ownership without a live ST server.
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.hidden=false;this.open=false;this.scrollTop=0;this.clientHeight=400;this.style={};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(){}
 showModal(){this.open=true;}
 close(){this.open=false;}
 replaceChildren(...nodes){this.children=nodes;}
 querySelectorAll(tag){return this.children.filter(n=>n.tag===tag);}
}
test('delayed Character history cannot replace a newer editor session or reopen its selector',async()=>{
 const previous=globalThis.document,body=new Element('body'),line=new Element('button');let state={key:'a',editorSession:1,unavailable:false},resolve;
 globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>line};
 try{
  const chats=createCharacterChats({rpc:()=>new Promise(r=>resolve=r),action:fn=>fn(),readChat:()=>({characterKey:'b',chatId:'B'}),onChat:()=>assert.fail('history reads must not select'),readState:()=>state});
  const old=chats.load('a',1),resolveOld=resolve;state={key:'b',editorSession:2,unavailable:false};
  const newer=chats.load('b',2),resolveNew=resolve;
  resolveNew([{characterKey:'b',chatId:'B'},{characterKey:'b',chatId:'Other B'}]);await newer;
  assert.equal(line.textContent,'B  ⌄');assert.equal(line.hidden,false);
  resolveOld([{characterKey:'a',chatId:'Wrong A'},{characterKey:'a',chatId:'Wrong again'}]);await old;
  assert.equal(line.textContent,'B  ⌄');assert.equal(body.children[0].open,false);
 }finally{globalThis.document=previous;}
});
test('large history renders a bounded window and activity updates do not replace focused choices',async()=>{
 const previous=globalThis.document,body=new Element('body'),panel=new Element('section');let line,state={key:'a',editorSession:1,open:true,unavailable:false};
 globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>line};
 try{
  const rows=Array.from({length:1203},(_,i)=>({characterKey:'a',chatId:`Chat ${i}`}));
  const chats=createCharacterChats({rpc:async()=>rows,action:fn=>fn(),readChat:()=>({characterKey:'a',chatId:'Chat 0'}),onChat:()=>{},readState:()=>state});
  chats.render(panel,'a');line=panel.children[0];await chats.load('a',1);line.onclick();
  const dialog=body.children[0],list=dialog.children[2],choice=list.querySelectorAll('button')[0];
  assert.ok(list.querySelectorAll('button').length<25);assert.equal(choice.attributes['aria-pressed'],'true');
  state.unavailable=true;chats.update();assert.equal(list.querySelectorAll('button')[0],choice);assert.equal(choice.disabled,true);
  state.unavailable=false;chats.update();assert.equal(list.querySelectorAll('button')[0],choice);assert.equal(choice.disabled,false);
  assert.ok(list.children.at(-1).style.height.length>0);
 }finally{globalThis.document=previous;}
});
test('delayed selection owns its original session, rather than a subsequently opened Character pane',async()=>{
 const previous=globalThis.document,body=new Element('body'),panel=new Element('section');let line,state={key:'a',editorSession:1,open:true,unavailable:false},release,adopted=false;
 globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>line};
 try{
  const chats=createCharacterChats({rpc:async(_,arg)=>[{characterKey:arg.characterKey,chatId:'One'},{characterKey:arg.characterKey,chatId:'Two'}],action:fn=>fn(),readChat:()=>({characterKey:state.key,chatId:'One'}),onChat:async(_,guard)=>{await new Promise(r=>release=r);if(guard())adopted=true;},readState:()=>state});
  chats.render(panel,'a');line=panel.children[0];await chats.load('a',1);line.onclick();
  const selection=body.children[0].children[2].querySelectorAll('button')[1].onclick();
  state={key:'b',editorSession:2,open:true,unavailable:false};await chats.load('b',2);line.onclick();release();await selection;
  assert.equal(adopted,false);assert.equal(body.children[0].open,true);assert.equal(line.textContent,'One  ⌄');
 }finally{globalThis.document=previous;}
});
test('Character management without a selected chat keeps its conversation line hidden and updates safely',async()=>{
 const previous=globalThis.document,body=new Element('body'),panel=new Element('section');let line;
 globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>line};
 try{
  const chats=createCharacterChats({rpc:async()=>[{characterKey:'a',chatId:'One'},{characterKey:'a',chatId:'Two'}],action:fn=>fn(),readChat:()=>undefined,onChat:()=>assert.fail('management must not select a chat'),readState:()=>({key:'a',editorSession:1,open:true,unavailable:false})});
  chats.render(panel,'a');line=panel.children[0];await chats.load('a',1);assert.doesNotThrow(()=>chats.update());assert.equal(line.hidden,true);assert.equal(body.children[0].open,false);
 }finally{globalThis.document=previous;}
});
