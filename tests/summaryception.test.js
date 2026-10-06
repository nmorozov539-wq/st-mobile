import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function fixture(request=async()=> 'The traveller reached the forest.') {
 let source=fs.readFileSync(new URL('../vendor/Extension-Summaryception/index.js',import.meta.url),'utf8');
 source=source.slice(source.indexOf('const MODULE_NAME'));
 const start=source.indexOf('(async function init()');const end=source.indexOf('})();',start)+5;source=source.slice(0,start)+source.slice(end);
 const toggles=[{identifier:'main',enabled:true},{identifier:'extra',enabled:false}];
 const ctx={extensionSettings:{summaryception:{enabled:true,verbatimTurns:1,turnsPerSummary:1}},chatMetadata:{},chat:[{is_user:false,mes:'Greeting'},{is_user:true,mes:'I travelled.'},{is_user:false,mes:'You reached the forest.'},{is_user:true,mes:'I rest.'},{is_user:false,mes:'Night falls.'}],name1:'Traveller',eventTypes:{GENERATION_STOPPED:'stop'},event_types:{GENERATION_STOPPED:'stop'},eventSource:{emit:async()=>{}},promptManager:{getPromptCollection:()=>({collection:structuredClone(toggles)}),getPromptOrderEntries:()=>toggles},saveMetadata:async()=>{},saveChat:async()=>{},setExtensionPrompt:(_,text)=>ctx.injection=text,executeSlashCommandsWithOptions:async command=>{const range=command.match(/(\d+)(?:-(\d+))?/);for(let i=Number(range[1]);i<=Number(range[2]??range[1]);i++)ctx.chat[i].is_system=command.startsWith('/hide');}};
 const chain=new Proxy(()=>{}, {get:()=>chain,apply:()=>chain});let hostBusy=false,verified=0;
 const window={parent:{},pocketExtensions:new Map(),pocketEngineBusy:()=>hostBusy,pocketSaveSettings:async()=>{},pocketVerifyMemory:async()=>{verified++;}};
 const sandbox=vm.createContext({window,location:{search:'?mobileRuntime=1'},URLSearchParams,AbortController,structuredClone,setTimeout,clearTimeout,console:{log(){},error(){}},SillyTavern:{getContext:()=>ctx},sendSummarizerRequest:request,$:()=>chain,toastr:{info:()=>chain,error(){},warning(){},success(){},clear(){}},document:{querySelector:()=>null}});
 new vm.Script(source).runInContext(sandbox);
 return {api:window.pocketExtensions.get('summaryception'),ctx,toggles,sandbox,verified:()=>verified,hostBusy:value=>hostBusy=value};
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
test('Summaryception exposes backlog choices in Pocket rather than creating a hidden dialog',async()=>{
 const f=fixture();for(let i=0;i<8;i++)f.ctx.chat.push({mes:'Older turn '+i,is_user:false});
 const running=vm.runInContext('maybeSummarizeTurns()',f.sandbox);await new Promise(resolve=>setImmediate(resolve));
 assert.ok(f.api.read().backlog.calls>1);assert.equal(f.api.read().busy,true);
 await f.api.run({action:'stop'});await running;assert.equal(f.api.read().backlog,null);assert.equal(f.api.read().busy,false);
});
