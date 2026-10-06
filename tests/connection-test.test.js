import test from 'node:test';
import assert from 'node:assert/strict';
import {testConnection} from '../prototype/extension/connection-test.js';
import {safeObject,characterUpdate,assertUnchanged,personaRecord} from '../prototype/extension/asset-data.js';
test('health message caps output, omits conversation, and restores settings',async()=>{
 const settings={openai_max_tokens:2048,n:3};
 const result=await testConnection({settings,request:async(type,messages)=>{
 assert.equal(type,'quiet');assert.deepEqual(messages,[{role:'user',content:'Reply with OK.'}]);assert.equal(settings.openai_max_tokens,16);assert.equal(settings.n,1);
 return {model:'fixture',choices:[{message:{content:'OK'}}]};}});
 assert.equal(result.reply,'OK');assert.deepEqual(settings,{openai_max_tokens:2048,n:3});
});
test('health failure and timeout restore settings and never retry',async()=>{
 const settings={openai_max_tokens:1024};let calls=0;
 await assert.rejects(testConnection({settings,request:async()=>{calls++;throw Error('offline');}}),/offline/);
 await assert.rejects(testConnection({settings,timeout:5,request:async(_,__,signal)=>{calls++;await new Promise(resolve=>signal.addEventListener('abort',resolve));return {};}}),/timed out/);
 assert.equal(calls,2);assert.deepEqual(settings,{openai_max_tokens:1024});
});
test('character edits preserve opaque extensions and embedded lorebooks without sharing references',()=>{
 const draft={name:'Fixture',extensions:{foreign:{value:7}},character_book:{entries:[{content:'Lore'}]},alternate_greetings:['One','Two']};
 const result=characterUpdate('Fixture.png',draft);assert.deepEqual(result.data,draft);result.data.extensions.foreign.value=8;assert.equal(draft.extensions.foreign.value,7);
 assert.throws(()=>safeObject(JSON.parse('{"__proto__": {"x":1}}')));assert.throws(()=>assertUnchanged({name:'changed'},JSON.stringify(draft)),/changed/);
 assert.throws(()=>characterUpdate('f.png',{name:'../bad'}));
});
test('persona projections retain connections and foreign settings',()=>{
 const power={personas:{'one.png':'One'},persona_descriptions:{'one.png':{description:'D',connections:[{id:1}],foreign:true}}};
 assert.deepEqual(personaRecord(power,'one.png'),{name:'One',descriptor:power.persona_descriptions['one.png']});
});
