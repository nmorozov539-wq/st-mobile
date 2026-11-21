import test from 'node:test';
import assert from 'node:assert/strict';
import {cardRepair, repairDoubledCards} from '../prototype/extension/card-repair.js';
const doubled={personality:['',''],scenario:['Woods','old'],tags:['',''],talkativeness:['0.5','0.5'],creatorcomment:['Notes',''],data:{creator:['Otis',''],creator_notes:['Notes',''],tags:['fantasy, healer',''],description:'kept',extensions:{talkativeness:['0.5','0.5'],depth_prompt:{prompt:['',''],role:['system','system'],depth:4}}}};
test('doubled card fields go back to the first, live form value',()=>{
 assert.deepEqual(cardRepair(doubled),{personality:'',scenario:'Woods',tags:[],talkativeness:'0.5',creatorcomment:'Notes',data:{creator:'Otis',creator_notes:'Notes',tags:['fantasy','healer'],extensions:{talkativeness:'0.5',depth_prompt:{prompt:'',role:'system'}}}});
});
test('healthy cards and real tag lists are left alone',()=>{
 assert.equal(cardRepair({personality:'',tags:['fantasy','healer'],data:{creator:'Otis',tags:['a'],extensions:{depth_prompt:{prompt:'',role:'system'}}}}),null);
});
test('repair runs once, merges only damaged cards, verifies, and reloads characters',async()=>{
 const cards={'a.png':structuredClone(doubled),'b.png':{personality:'',data:{}}},merged=[];let reloaded=0,saved=0;
 globalThis.fetch=async(url,{body})=>{const value=JSON.parse(body);if(url==='/api/characters/get')return {ok:true,json:async()=>structuredClone(cards[value.avatar_url])};const {avatar,...update}=value;merged.push(avatar);const card=cards[avatar];for(const [k,v] of Object.entries(update))if(k!=='data')card[k]=v;card.data={...card.data,...update.data,extensions:{...card.data.extensions,...update.data.extensions,depth_prompt:{...card.data.extensions.depth_prompt,...update.data.extensions.depth_prompt}}};return {ok:true,json:async()=>({})};};
 const ctx={extensionSettings:{},characters:[{avatar:'a.png'},{avatar:'b.png'}],getRequestHeaders:()=>({}),getCharacters:async()=>{reloaded++;},saveSettingsDebounced:()=>{saved++;}};
 assert.deepEqual(await repairDoubledCards(()=>ctx),['a.png']);
 assert.deepEqual(merged,['a.png']);assert.equal(reloaded,1);assert.equal(saved,1);assert.equal(ctx.extensionSettings.stm_repairs.doubledCardFields,1);
 assert.equal(cards['a.png'].data.extensions.depth_prompt.depth,4);
 assert.deepEqual(await repairDoubledCards(()=>ctx),[]);assert.deepEqual(merged,['a.png']);
});
