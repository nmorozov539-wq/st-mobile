import test from 'node:test';
import assert from 'node:assert/strict';
import {characterAssociations} from '../prototype/extension/character-associations.js';
import {createAssetStore} from '../prototype/extension/asset-store.js';
function fixture(){return {key:'A.case.png',fileName:'A.case',card:{extensions:{world:'Missing primary',foreign:42},character_book:{entries:[]}},power:{personas:{one:'First',two:'Second'},persona_descriptions:{one:{connections:[{type:'character',id:'A.case.png'},{type:'chat',id:'chat'}],opaque:1},two:{connections:[{type:'character',id:'A.case.png'}]},other:{connections:[{type:'character',id:'other.png'}]},missing:{connections:[{type:'character',id:'A.case.png'}]}}},worldInfo:{charLore:[{name:'A.case',extraBooks:['Known','Missing','Known'],opaque:3},{name:'A.case',extraBooks:['Second']},{name:'other',extraBooks:['Foreign']}]},worldNames:['Known','Second']};}
test('association reads preserve all native persona links and ignore chat/group/other character links',()=>{
 const f=fixture(),before=structuredClone(f),result=characterAssociations(f);
 assert.deepEqual(result.personas.map(p=>p.key),['one','two','missing']);assert.equal(result.personas[2].available,false);assert.deepEqual(f,before);
});
test('primary and additional associations retain native order, missing names, duplicates and embedded data',()=>{
 const result=characterAssociations(fixture());assert.deepEqual(result.primary,{name:'Missing primary',available:false});assert.deepEqual(result.additional.map(p=>p.name),['Known','Missing','Known','Second']);assert.equal(result.additional[1].available,false);assert.equal(result.embedded,true);
 const f=fixture();f.card.extensions.world='';const empty=characterAssociations(f);assert.equal(empty.primary,null);assert.equal(empty.embedded,true);assert.equal(empty.additional.length,4);
});
test('malformed association storage is reported rather than silently simplified or changed',()=>{
 for(const alter of [f=>f.power.persona_descriptions.one.connections={},f=>f.worldInfo.charLore={},f=>f.worldInfo.charLore[0].extraBooks={},f=>f.card.extensions.world=[]]){const f=fixture();alter(f);const before=structuredClone(f);assert.throws(()=>characterAssociations(f),/could not be read/);assert.deepEqual(f,before);}
});
test('native asset read projects associations without selecting, saving or modifying the card',async()=>{
 const f=fixture();let writes=0;const store=createAssetStore({getContext:()=>({powerUserSettings:f.power,getRequestHeaders:()=>({})}),getAssociationState:()=>({worldInfo:f.worldInfo,worldNames:f.worldNames}),characterFileName:key=>{assert.equal(key,f.key);return f.fileName;},saveSettings:()=>writes++,fetch:async()=>Response.json({data:f.card})});
 const result=await store.run({action:'read',kind:'characters',key:f.key});assert.equal(result.associations.personas.length,3);assert.equal(result.revision,JSON.stringify(f.card));assert.equal(writes,0);
 f.worldInfo.charLore={};const bad=await store.run({action:'read',kind:'characters',key:f.key});assert.match(bad.associationError,/could not be read/);assert.deepEqual(bad.draft,f.card);assert.equal(writes,0);
});
