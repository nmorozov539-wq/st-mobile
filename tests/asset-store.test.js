import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetStore} from '../prototype/extension/asset-store.js';
function fixture(){
 const card={name:'Original',description:'D',extensions:{foreign:{keep:7}},character_book:{entries:[{content:'Lore'}]},alternate_greetings:['A']};
 const presets=[{temperature:0.3,prompts:[{identifier:'p',name:'Manual',content:'Under 100 words.'}],prompt_order:[{order:[{identifier:'p',enabled:true}]}],foreign:{keep:7}}];
 const names={'Original preset':0};let diskCard=structuredClone(card),savedSettings,requests=0;
 const ctx={characters:[{avatar:'original.png',name:'Original'}],powerUserSettings:{personas:{'one.png':'One'},persona_descriptions:{'one.png':{description:'D',connections:[{type:'character',id:4}],foreign:7}}},getRequestHeaders:()=>({'Content-Type':'application/json'}),getCharacters:async()=>{ctx.characters[0].name=diskCard.name;}};
 const store=createAssetStore({getContext:()=>ctx,getUserAvatar:()=>'',setUserName(){},getUserAvatars:async()=>['one.png'],saveSettings:async()=>{savedSettings=structuredClone({power_user:ctx.powerUserSettings,oai_settings:{preset_settings_openai:Object.keys(names).at(-1)}});},getPresetApplicationPromise:async()=>{},getPresetManager:()=>({getPresetList:()=>({presets,preset_names:names}),savePreset:async(name,data)=>{if(!Object.hasOwn(names,name))names[name]=presets.length;presets[names[name]]=structuredClone(data);}}),fetch:async(url,options)=>{
 requests++;const data=JSON.parse(options.body);
 if(url==='/api/characters/get')return Response.json({data:structuredClone(diskCard)});
 if(url==='/api/characters/merge-attributes'){diskCard=structuredClone(data.data);return new Response('OK');}
 if(url==='/api/settings/get')return Response.json({settings:JSON.stringify(savedSettings),openai_setting_names:Object.keys(names),openai_settings:presets.map(p=>JSON.stringify(p))});
 throw Error('Unexpected endpoint: '+url);
 }});
 return {store,ctx,presets,card:()=>diskCard,requests:()=>requests};
}
test('character library writes verify opaque fields and reject a stale second editor',async()=>{
 const f=fixture(),a=await f.store.run({action:'read',kind:'characters',key:'original.png'}),b=structuredClone(a);
 a.draft.description='Updated';await f.store.run({action:'write',kind:'characters',key:'original.png',...a});
 assert.equal(f.card().description,'Updated');assert.equal(f.card().extensions.foreign.keep,7);assert.equal(f.card().character_book.entries[0].content,'Lore');
 await assert.rejects(f.store.run({action:'write',kind:'characters',key:'original.png',...b}),/changed/);assert.equal(f.card().description,'Updated');
});
test('persona edits retain native connections and verify saved settings',async()=>{
 const f=fixture(),a=await f.store.run({action:'read',kind:'personas',key:'one.png'});a.draft.name='Updated';a.draft.descriptor.description='New description';
 await f.store.run({action:'write',kind:'personas',key:'one.png',...a});
 assert.equal(f.ctx.powerUserSettings.personas['one.png'],'Updated');assert.equal(f.ctx.powerUserSettings.persona_descriptions['one.png'].connections[0].id,4);
});
test('preset copies preserve manual prompts and foreign fields, and never overwrite an import collision',async()=>{
 const f=fixture(),a=await f.store.run({action:'read',kind:'presets',key:'Original preset'});
 const data=structuredClone(a.draft);data.prompt_order[0].order[0].enabled=false;data.prompts[0].content='Under 50 words.';
 await f.store.run({action:'write',kind:'presets',key:'Original preset',revision:a.revision,draft:{name:'New preset',preset:data}});
 assert.equal(f.presets[0].prompts[0].content,'Under 100 words.');assert.equal(f.presets[1].foreign.keep,7);assert.equal(f.presets[1].prompt_order[0].order[0].enabled,false);
 await assert.rejects(f.store.run({action:'import',kind:'presets',file:new File([JSON.stringify(data)],'New preset.json')}),/already exists/);
});
test('malformed preset input is rejected before native saving',async()=>{
 const f=fixture();await assert.rejects(f.store.run({action:'import',kind:'presets',file:new File(['{"prompts":"broken"}'],'Broken.json')}),/prompts/);assert.equal(f.presets.length,1);
});
