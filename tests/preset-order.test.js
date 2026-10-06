import test from 'node:test';
import assert from 'node:assert/strict';
import {presetOrder,setPromptEnabled} from '../prototype/frontend/preset-order.js';
test('entry toggles modify ST active order and preserve other orders and metadata',()=>{
 const p={prompt_order:[{character_id:100000,order:[{identifier:'main',enabled:false}]},{character_id:100001,extra:'keep',order:[{identifier:'main',enabled:true,foreign:42},{identifier:'history',enabled:true}]}]};
 setPromptEnabled(p,'100001','main',false);assert.equal(presetOrder(p)[0].enabled,false);assert.equal(presetOrder(p)[0].foreign,42);
 setPromptEnabled(p,100001,'main',true);assert.equal(presetOrder(p)[0].enabled,true);assert.equal(presetOrder(p,100000)[0].enabled,false);
 setPromptEnabled(p,100001,'new',true);assert.deepEqual(presetOrder(p).map(x=>x.identifier),['main','history','new']);assert.equal(p.prompt_order[1].extra,'keep');
});
test('missing prompt order can be created without removing preset fields',()=>{const p={temperature:.7};setPromptEnabled(p,100001,'main',true);assert.equal(presetOrder(p)[0].enabled,true);assert.equal(p.temperature,.7);});
