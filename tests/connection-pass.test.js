import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {listedModel} from '../prototype/extension/configuration-state.js';
import {deletePlan} from '../prototype/extension/workspace-data.js';
import {withoutTools} from '../prototype/extension/generation-tools.js';
import {createJournal,failureOutcome,adoptLeftovers,LEFTOVER_ERROR} from '../prototype/frontend/journal.js';
const require=createRequire(import.meta.url);

test('model names match the loaded list regardless of capitals, and keep the list spelling',()=>{
    const models=[{id:'DeepSeek-V4-Flash'},{id:'DeepSeek-V4-Pro'}];
    assert.equal(listedModel(models,'deepseek-v4-flash'),'DeepSeek-V4-Flash');
    assert.equal(listedModel(models,'DeepSeek-V4-Pro'),'DeepSeek-V4-Pro');
    assert.equal(listedModel(models,'deepseek-flash'),undefined);
    assert.equal(listedModel([],'deepseek-v4-flash'),undefined);
    assert.equal(listedModel([{id:'a'},{id:'A'}],'A'),'A');
    assert.equal(listedModel(models,''),undefined);
});
test('deleting a chat never creates a replacement chat',()=>{
    const target={characterKey:'a.png',chatId:'one'};
    assert.deepEqual(deletePlan({active:{characterKey:'b.png',chatId:'x'},target,others:[]}),{});
    assert.deepEqual(deletePlan({active:target,target,others:['two']}),{select:'two'});
    assert.deepEqual(deletePlan({active:target,target,others:[]}),{close:true});
});
test('a preset with tool calling still sends, without tools, and keeps the preset value',async()=>{
    const settings={function_calling:true};let seen,saved=0;
    await withoutTools(settings,async()=>{seen=settings.function_calling;},()=>saved++);
    assert.equal(seen,false);assert.equal(settings.function_calling,true);assert.equal(saved,1);
    await assert.rejects(withoutTools(settings,async()=>{throw Error('provider failed');}),/provider failed/);
    assert.equal(settings.function_calling,true);
    const off={function_calling:false};await withoutTools(off,async()=>{seen=off.function_calling;},()=>saved++);
    assert.equal(seen,false);assert.equal(saved,1);
});
test('only an interrupted save waits for Retry or Discard; other failures are dropped at once',()=>{
    assert.equal(failureOutcome('BUSY'),'wait');
    for(const code of ['TIMEOUT','DISCONNECTED','ENGINE_UNAVAILABLE'])assert.equal(failureOutcome(code),'interrupted');
    for(const code of ['INVALID_ARGUMENT','CONFLICT','CHAT_NOT_FOUND',undefined])assert.equal(failureOutcome(code),'failed');
});
test('changes left from an earlier session, including the old review queue, wait for the person and are never lost',()=>{
    const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
    const journal=createJournal(storage);
    journal.add({sessionId:'old',argument:{action:'deleteChat'},label:'Delete conversation',state:'conflict',error:'Connect DeepSeek first so its model list is loaded.'});
    journal.add({sessionId:'old',argument:{action:'configure'},label:'Preset entry'});
    journal.add({sessionId:'new',argument:{action:'edit'},label:'Edit message'});
    journal.adopt('new');
    const items=journal.read();
    assert.equal(items.length,3);
    assert.deepEqual(items.map(i=>i.state),['interrupted','interrupted','pending']);
    assert.ok(items.slice(0,2).every(i=>i.error===LEFTOVER_ERROR));
    assert.deepEqual(items.map(i=>i.argument.action),['deleteChat','configure','edit']);
    assert.deepEqual(adoptLeftovers([{state:'applying',sessionId:'new'}],'new')[0].state,'interrupted');
});
test('the --mock refusal on a normal install names the exact commands for a separate mock install',()=>{
    const {readLaunch}=require('../phone-package/start.cjs');
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-mock-message-'));
    try{
        fs.writeFileSync(path.join(root,'.stm.json'),JSON.stringify({version:1,mode:'combined',mock:false,source:'/home/me/SillyTavern'}));
        assert.throws(()=>readLaunch(root,true),error=>/separate --mock/.test(error.message)&&error.message.includes('node prepare.cjs /home/me/SillyTavern ~/stm-mock --mock')&&error.message.includes('start.cjs --mock'));
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});
