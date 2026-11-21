import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function fixture(request=async()=> 'The traveller reached the forest.', {stm=true}={}) {
 let source=fs.readFileSync(new URL('../vendor/Extension-Summaryception/index.js',import.meta.url),'utf8');
 source=source.slice(source.indexOf('const MODULE_NAME'));
 const start=source.indexOf('(async function init()');const end=source.indexOf('})();',start)+5;source=source.slice(0,start)+source.slice(end);
 const toggles=[{identifier:'main',enabled:true},{identifier:'extra',enabled:false}];
 const ctx={extensionSettings:{summaryception:{enabled:true,verbatimTurns:1,turnsPerSummary:1}},chatMetadata:{},chat:[{is_user:false,mes:'Greeting'},{is_user:true,mes:'I travelled.'},{is_user:false,mes:'You reached the forest.'},{is_user:true,mes:'I rest.'},{is_user:false,mes:'Night falls.'}],name1:'Traveller',eventTypes:{GENERATION_STOPPED:'stop'},event_types:{GENERATION_STOPPED:'stop'},eventSource:{emit:async()=>{}},promptManager:{getPromptCollection:()=>({collection:structuredClone(toggles)}),getPromptOrderEntries:()=>toggles},saveMetadata:async()=>{},saveChat:async()=>{},setExtensionPrompt:(_,text)=>ctx.injection=text,executeSlashCommandsWithOptions:async command=>{const range=command.match(/(\d+)(?:-(\d+))?/);for(let i=Number(range[1]);i<=Number(range[2]??range[1]);i++)ctx.chat[i].is_system=command.startsWith('/hide');}};
 const chain=new Proxy(()=>{}, {get:()=>chain,apply:()=>chain});let hostBusy=false,verified=0;
 const window={parent:{},stmExtensions:new Map(),stmEngineBusy:()=>hostBusy,stmSaveSettings:async()=>{},stmVerifyMemory:async()=>{verified++;}};
 if(!stm)window.parent=window;
 const sandbox=vm.createContext({window,location:{search:'?mobileRuntime=1'},URLSearchParams,AbortController,structuredClone,setTimeout,clearTimeout,console:{log(){},error(){}},SillyTavern:{getContext:()=>ctx},sendSummarizerRequest:request,$:()=>chain,toastr:{info:()=>chain,error(){},warning(){},success(){},clear(){}},document:{querySelector:()=>null}});
 new vm.Script(source).runInContext(sandbox);
 return {api:window.stmExtensions.get('summaryception'),ctx,toggles,sandbox,verified:()=>verified,hostBusy:value=>hostBusy=value};
}
test('Summaryception uses native metadata, ghosts without deleting, injects memory, and restores prompt toggles',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;assert.equal(f.toggles[0].enabled,false);return 'The traveller reached the forest.';});
 const before=f.ctx.chat.map(m=>m.mes);await f.api.run({action:'summarize'});
 assert.deepEqual(f.ctx.chat.map(m=>m.mes),before);assert.equal(calls,2);
 assert.equal(f.ctx.chatMetadata.summaryception.layers[0].length,2);assert.equal(f.ctx.chat[0].extra.sc_ghosted,true);assert.equal(f.ctx.chat.at(-1).is_system,undefined);
 assert.match(f.ctx.injection,/traveller reached/);assert.deepEqual(f.toggles.map(t=>t.enabled),[true,false]);assert.equal(f.api.read().busy,false);assert.equal(f.verified(),1);
});
test('Summaryception stop retains the lock until the actual ST request unwinds and prevents another batch',async()=>{
 let release,calls=0;const f=fixture(async()=>{calls++;await new Promise(resolve=>release=resolve);throw Error('Stopped');});
 const running=f.api.run({action:'summarize'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.api.read().busy,true);await f.api.run({action:'stop'});assert.equal(f.api.read().busy,true);
 await assert.rejects(f.api.run({action:'settings',value:{enabled:false}}),/busy/);
 release();await running;assert.equal(f.api.read().busy,false);assert.equal(calls,1);assert.deepEqual(f.toggles.map(t=>t.enabled),[true,false]);assert.equal(f.ctx.chatMetadata.summaryception.layers[0].length,0);
});
test('Summaryception exposes backlog choices in STM rather than creating a hidden dialog',async()=>{
 const f=fixture();for(let i=0;i<8;i++)f.ctx.chat.push({mes:'Older turn '+i,is_user:false});
 const running=vm.runInContext('maybeSummarizeTurns()',f.sandbox);await new Promise(resolve=>setImmediate(resolve));
 assert.ok(f.api.read().backlog.calls>1);assert.equal(f.api.read().busy,true);
 await f.api.run({action:'stop'});await running;assert.equal(f.api.read().backlog,null);assert.equal(f.api.read().busy,false);
});
test('invalidated memory remains readable but cannot inject or run automatic/manual paid summaries',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return 'unused';});
 f.ctx.chatMetadata.summaryception={layers:[[{text:'Written memory'}]],summarizedUpTo:0,ghostedIndices:[]};
 vm.runInContext('updateInjection()',f.sandbox);assert.match(f.ctx.injection,/Written memory/);
 f.ctx.chatMetadata.stm={memoryInvalid:{reason:'changed history'}};
 vm.runInContext('updateInjection()',f.sandbox);assert.equal(f.ctx.injection,'');
 await vm.runInContext('maybeSummarizeTurns()',f.sandbox);assert.equal(calls,0);
 await assert.rejects(f.api.run({action:'summarize'}),/needs rebuilding/);assert.equal(calls,0);
 assert.equal(f.api.read().needsRebuild,true);assert.equal(f.api.read().memory.layers[0][0].text,'Written memory');
});

test('invalid-memory automatic guard also applies when the combined native ST frontend is opened',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return 'unused';},{stm:false});
 f.ctx.chatMetadata.stm={memoryInvalid:{reason:'changed history'}};
 await vm.runInContext('maybeSummarizeTurns()',f.sandbox);
 await vm.runInContext('repairIfBranched()',f.sandbox);
 assert.equal(calls,0);
});

test('deferred automatic Memory owns the engine until stopped, without issuing a model request',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return 'unused';});f.hostBusy(true);
 await vm.runInContext('maybeSummarizeTurns()',f.sandbox);
 assert.equal(f.api.read().waiting,true);assert.equal(f.api.read().busy,true);
 await f.api.run({action:'stop'});assert.equal(f.api.read().busy,false);
 await new Promise(resolve=>setTimeout(resolve,550));assert.equal(calls,0);
});
test('deferred automatic Memory cannot run against a different chat',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return 'unused';});f.ctx.chatId='original';f.hostBusy(true);
 await vm.runInContext('maybeSummarizeTurns()',f.sandbox);
 f.ctx.chatId='other';f.hostBusy(false);
 await new Promise(resolve=>setTimeout(resolve,550));
 assert.equal(calls,0);assert.equal(f.api.read().busy,false);assert.match(f.api.read().failure,/chat changed/);
});
test('ordinary chat activation never reserves Memory for a no-op branch repair',async()=>{
 const f=fixture();f.hostBusy(true);f.ctx.chatMetadata.summaryception={summarizedUpTo:1,layers:[]};await vm.runInContext('repairIfBranched()',f.sandbox);assert.equal(f.api.read().busy,false);assert.equal(f.verified(),0);
});
test('native greeting events never start STM Memory requests, even with zero verbatim turns',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return 'Fixture summary';});
 f.ctx.extensionSettings.summaryception.verbatimTurns=0;f.ctx.chat=[{is_user:false,is_system:false,mes:'Native greeting'}];
 vm.runInContext("onMessageReceived(0, 'first_message')",f.sandbox);await new Promise(setImmediate);
 assert.equal(calls,0);assert.equal(f.verified(),0);assert.equal(f.ctx.chatMetadata.summaryception,undefined);
 // The greeting remains part of context when a later real assistant turn triggers Memory.
 f.ctx.chat.push({is_user:true,mes:'Actual user turn'},{is_user:false,mes:'Actual generated reply'});
 vm.runInContext("onMessageReceived(2)",f.sandbox);await new Promise(setImmediate);
 assert.ok(calls>0);
});

test('STM snippet actions edit, regenerate and delete only the expected saved snippet and verify persistence',async()=>{
 let text='First summary.';const f=fixture(async()=>text);await f.api.run({action:'summarize'});
 const read=()=>f.api.read().memory.layers[0],verified=f.verified();
 await assert.rejects(f.api.run({action:'snippet',value:{op:'edit',layer:0,index:0,expected:'stale',text:'x'}}),/changed/);
 await assert.rejects(f.api.run({action:'snippet',value:{op:'edit',layer:0,index:0,expected:read()[0].text,text:'  '}}),/empty/);
 await f.api.run({action:'snippet',value:{op:'edit',layer:0,index:0,expected:read()[0].text,text:'Edited by hand.'}});
 assert.equal(read()[0].text,'Edited by hand.');assert.match(f.ctx.injection,/Edited by hand/);assert.equal(f.verified(),verified+1);
 text='Regenerated summary.';await f.api.run({action:'snippet',value:{op:'regenerate',layer:0,index:1,expected:read()[1].text}});
 assert.equal(read()[1].text,'Regenerated summary.');assert.equal(read()[1].regenerated,true);assert.equal(read()[0].text,'Edited by hand.');
 await f.api.run({action:'snippet',value:{op:'delete',layer:0,index:0,expected:'Edited by hand.'}});
 assert.equal(read().length,1);assert.equal(f.api.read().busy,false);
});
test('STM clear resets memory, unghosts messages and lifts the rebuild block; export/import round-trips safely',async()=>{
 const f=fixture();await f.api.run({action:'summarize'});
 const exported=(await f.api.run({action:'export'})).exported;assert.equal(exported.layers[0].length,2);
 await f.api.run({action:'clear'});assert.equal(f.api.read().memory.layers.flat().length,0);assert.equal(f.ctx.chat[0].extra?.sc_ghosted,undefined);assert.equal(f.ctx.injection??'','');
 await f.api.run({action:'import',value:{data:exported}});assert.equal(f.api.read().memory.layers[0].length,2);assert.equal(f.ctx.chat[0].extra.sc_ghosted,true);
 await assert.rejects(f.api.run({action:'import',value:{data:{layers:[[{text:''}]]}}}),/invalid snippet/);
 await assert.rejects(f.api.run({action:'import',value:{data:{layers:[],summarizedUpTo:99}}}),/longer conversation/);
 f.ctx.chatMetadata.stm={memoryInvalid:{reason:'changed history'},keep:1};
 await assert.rejects(f.api.run({action:'snippet',value:{op:'delete',layer:0,index:0,expected:'x'}}),/Clear memory first/);
 await f.api.run({action:'clear'});assert.equal(f.api.read().needsRebuild,false);assert.equal(f.ctx.chatMetadata.stm.keep,1);
});
test('STM settings accept the full configuration surface, reject unsafe values and reset to defaults',async()=>{
 const f=fixture();
 await f.api.run({action:'settings',value:{maxLayers:7,debugMode:true,stripPatterns:['<x>'],injectionTemplate:'[m] {{summary}}',savedCustomPrompts:{Mine:'text'},disableGhosting:true}});
 const s=f.api.read().settings;assert.equal(s.maxLayers,7);assert.equal(JSON.stringify(s.stripPatterns),'["<x>"]');assert.equal(s.savedCustomPrompts.Mine,'text');
 for(const bad of [{injectionTemplate:'no marker'},{maxLayers:0},{connectionSource:'openai'},{stripPatterns:['']},{savedCustomPrompts:[]},{unknown:1}])await assert.rejects(f.api.run({action:'settings',value:bad}));
 await f.api.run({action:'reset'});const r=f.api.read().settings;assert.equal(r.maxLayers,5);assert.equal(r.debugMode,false);assert.ok(r.stripPatterns.length>1);assert.equal(r.savedCustomPrompts.Mine,'text');
});
