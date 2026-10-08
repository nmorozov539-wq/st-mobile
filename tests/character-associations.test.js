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

import {associationRevision,removeCharacterPersona,changeAdditionalBooks} from '../prototype/extension/character-associations.js';
test('targeted persona unlink retains every unrelated connection and opaque descriptor field',()=>{
 const power={personas:{one:'First'},persona_descriptions:{one:{description:'Keep',opaque:{keep:42},connections:[{type:'chat',id:'Keep'},{type:'group',id:'Keep'},{type:'character',id:'card.png',opaque:1},{type:'character',id:'other.png'}]}},default_persona:'one'};
 const before=structuredClone(power),next=removeCharacterPersona(power,'card.png','one');assert.deepEqual(next,{...power.persona_descriptions.one,connections:[power.persona_descriptions.one.connections[0],power.persona_descriptions.one.connections[1],power.persona_descriptions.one.connections[3]]});assert.deepEqual(power,before);
 power.persona_descriptions.two={connections:[{type:'character',id:'card.png'}]};assert.throws(()=>removeCharacterPersona(power,'card.png','one'),/Multiple/);
});
test('additional detach removes one explicit duplicate and preserves opaque and unrelated native rows',()=>{
 const world={charLore:[{name:'card',extraBooks:['A','A','B'],opaque:42},{name:'other',extraBooks:['Other'],opaque:9}]},before=structuredClone(world);
 const next=changeAdditionalBooks(world,'card',{operation:'detach',name:'A',index:1});assert.deepEqual(next,[{name:'card',extraBooks:['A','B'],opaque:42},before.charLore[1]]);assert.deepEqual(world,before);
 assert.throws(()=>changeAdditionalBooks(world,'card',{operation:'detach',name:'B',index:1}),/changed/);assert.throws(()=>changeAdditionalBooks(world,'card',{operation:'connect',name:'A'}),/already/);
 const last=changeAdditionalBooks({charLore:[{name:'card',extraBooks:['A'],opaque:42}]},'card',{operation:'detach',name:'A',index:0});assert.deepEqual(last,[{name:'card',extraBooks:[],opaque:42}]);
});
test('ambiguous duplicate additional-record storage cannot be simplified by a mutation',()=>{
 const f=fixture();assert.throws(()=>changeAdditionalBooks(f.worldInfo,f.fileName,{operation:'detach',name:'Known',index:0}),/Multiple native/);
});
function mutationFixture(){
 const f=fixture();f.power.persona_descriptions={one:f.power.persona_descriptions.one};f.worldInfo.charLore=f.worldInfo.charLore.slice(0,1);
 let disk=structuredClone({power_user:f.power,world_info_settings:{world_info:f.worldInfo}}),writes=0;
 const store=createAssetStore({getContext:()=>({powerUserSettings:f.power,getRequestHeaders:()=>({})}),getAssociationState:()=>({worldInfo:f.worldInfo,worldNames:f.worldNames}),characterFileName:()=>f.fileName,saveSettings:async()=>{writes++;disk=structuredClone({power_user:f.power,world_info_settings:{world_info:f.worldInfo}});},fetch:async(url)=>{if(url==='/api/settings/get')return Response.json({settings:JSON.stringify(disk)});if(url==='/api/characters/get')return Response.json({data:f.card});if(url==='/api/worldinfo/list')return Response.json([{file_id:'Known'}]);throw Error('Unexpected write '+url);}});
 const arg={kind:'characters',action:'association',key:f.key,revision:JSON.stringify(f.card),associationGuard:associationRevision(f.power,f.worldInfo)};
 return {f,store,arg,writes:()=>writes,disk};
}
test('shared association guards reject stale live or disk settings before saving',async()=>{
 const a=mutationFixture();a.f.power.personas.one='Changed';await assert.rejects(a.store.run({...a.arg,operation:'persona-unlink',personaKey:'one'}),/associations changed/);assert.equal(a.writes(),0);
 const b=mutationFixture();b.disk.power_user.personas.one='External';await assert.rejects(b.store.run({...b.arg,operation:'persona-unlink',personaKey:'one'}),/pending or external/);assert.equal(b.writes(),0);
 const c=mutationFixture();await assert.rejects(c.store.run({...c.arg,revision:'stale',operation:'persona-unlink',personaKey:'one'}),/changed/);assert.equal(c.writes(),0);
});
test('persona and additional mutations verify saved settings and return fresh association guards',async()=>{
 const a=mutationFixture(),before=structuredClone(a.f.power),result=await a.store.run({...a.arg,operation:'persona-unlink',personaKey:'one'});assert.equal(a.writes(),1);assert.equal(result.associations.personas.length,0);assert.deepEqual(a.f.power.persona_descriptions.one,{...before.persona_descriptions.one,connections:[{type:'chat',id:'chat'}]});assert.equal(result.associationRevision,associationRevision(a.f.power,a.f.worldInfo));
 const b=mutationFixture(),r=await b.store.run({...b.arg,operation:'detach',type:'additional',name:'Known',index:2});assert.deepEqual(r.associations.additional.map(x=>x.name),['Known','Missing']);assert.equal(b.f.worldInfo.charLore[0].opaque,3);
});
test('missing lorebook cannot be connected or written under a working-looking selection',async()=>{
 const f=mutationFixture();await assert.rejects(f.store.run({...f.arg,operation:'connect',type:'primary',name:'Unavailable'}),/no longer available/);assert.equal(f.writes(),0);
});
