import test from 'node:test';
import assert from 'node:assert/strict';
import {canCloseEmptyCharacterView} from '../prototype/extension/asset-data.js';
import {createAssetStore} from '../prototype/extension/asset-store.js';
function fixture({badCopy=false,refuseDelete=false}={}){
 const data={name:'Card',first_mes:'Greeting',alternate_greetings:['A'],extensions:{foreign:42},character_book:{entries:[{content:'Lore'}]}};
 const cards=new Map([['card.png',structuredClone(data)]]);let calls=[],saves=0;
 const ctx={get characters(){return [...cards].map(([avatar,data])=>({avatar,name:data.name}));},getRequestHeaders:()=>({'Content-Type':'application/json'}),getCharacters:async()=>{}};
 const store=createAssetStore({getContext:()=>ctx,saveSettings:async()=>saves++,duplicateCharacter:async value=>{calls.push(['duplicate',value]);cards.set('copy.png',badCopy?{name:'Wrong'}:structuredClone(cards.get(value.avatar)));return 'copy.png';},deleteCharacter:async(key,options)=>{calls.push(['delete',key,options]);if(!refuseDelete)cards.delete(key);return true;},fetch:async(url,options)=>{const body=JSON.parse(options.body);calls.push([url,body]);if(url.endsWith('/get'))return cards.has(body.avatar_url)?Response.json({data:cards.get(body.avatar_url)}):new Response('',{status:404});if(url.endsWith('/all'))return Response.json(ctx.characters);if(url.endsWith('/chats'))return Response.json({error:true});if(url.endsWith('/export'))return Response.json({spec:'chara_card_v2',data:cards.get(body.avatar_url)});throw Error('Unexpected native endpoint');}});
 return {store,cards,calls,saves:()=>saves,data};
}
test('saved-card actions reject stale revisions before invoking native mutations',async()=>{
 const f=fixture();for(const action of ['duplicate','delete','export'])await assert.rejects(f.store.run({kind:'characters',key:'card.png',revision:'stale',action,format:'json'}),/changed/);
 assert.ok(!f.calls.some(([name])=>['duplicate','delete'].includes(name)));assert.equal(f.cards.size,1);
});
test('duplication verifies a distinct saved native copy with opaque fields retained',async()=>{
 const f=fixture();const result=await f.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(f.data),action:'duplicate'});
 assert.equal(result.key,'copy.png');assert.deepEqual(f.cards.get('copy.png'),f.data);assert.deepEqual(f.calls.find(([name])=>name==='duplicate')[1],{avatar:'card.png',silent:true});
 const bad=fixture({badCopy:true});await assert.rejects(bad.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(bad.data),action:'duplicate'}),/changed/);
});
test('deletion uses explicit chat retention and verifies actual card removal',async()=>{
 const f=fixture();await f.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(f.data),action:'delete',deleteChats:false});assert.deepEqual(f.calls.find(([name])=>name==='delete').slice(1),['card.png',{deleteChats:false}]);assert.equal(f.saves(),1);
 const bad=fixture({refuseDelete:true});await assert.rejects(bad.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(bad.data),action:'delete',deleteChats:true}),/verified/);
});
test('exports return native file bytes and reject unsupported formats',async()=>{
 const f=fixture();const result=await f.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(f.data),action:'export',format:'json'});assert.equal(result.name,'card.json');assert.deepEqual(JSON.parse(await result.file.text()).data,f.data);
 await assert.rejects(f.store.run({kind:'characters',key:'card.png',revision:JSON.stringify(f.data),action:'export',format:'exe'}),/PNG or JSON/);
});

test('native welcome view can close but temporary messages, edits and composer drafts are protected',()=>{
 const ctx={characterId:undefined,groupId:null,chat:[{is_system:false,extra:{type:'native-welcome'}},{is_system:true}],chatMetadata:{}};
 const options={welcomeMessageType:'native-welcome'};assert.equal(canCloseEmptyCharacterView(ctx,options),true);
 for(const value of [{...ctx,chat:[...ctx.chat,{is_user:true}]},{...ctx,chat:[{is_system:false,mes:'Unsaved assistant reply'}]},{...ctx,chatMetadata:{tainted:true}}])assert.throws(()=>canCloseEmptyCharacterView(value,options),/unsaved temporary/);
 assert.throws(()=>canCloseEmptyCharacterView(ctx,{...options,composerText:'Native draft'}),/unsaved temporary/);assert.equal(canCloseEmptyCharacterView({...ctx,characterId:0},options),false);assert.throws(()=>canCloseEmptyCharacterView({...ctx,chat:[{is_system:false,mes:'Unknown temporary message'}]}),/unsaved temporary/);
});
