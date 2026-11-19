import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveManifest,collisionSafeName,compactRevision,createConfigurationMigration,redactConfiguration} from '../prototype/extension/configuration-migration.js';

let serial=0;
const op=label=>`${label}-${++serial}`;

test('preservation archive redacts precise credentials but keeps token budgets and unknown fields',()=>{
 const records=[{id:'global',record:{model:'m',api_key:'secret',access_token:'no',max_tokens:4096,openai_max_tokens:512,token_budget:99,nested:{authorization:'hide',opaque:42}}}];
 const clean=redactConfiguration(records);assert.equal(clean[0].record.api_key,undefined);assert.equal(clean[0].record.access_token,undefined);assert.equal(clean[0].record.nested.authorization,undefined);
 assert.equal(clean[0].record.max_tokens,4096);assert.equal(clean[0].record.openai_max_tokens,512);assert.equal(clean[0].record.token_budget,99);assert.equal(clean[0].record.nested.opaque,42);
 const a=archiveManifest(records,{generatedAt:'now'}),b=archiveManifest(records,{generatedAt:'now'});assert.equal(a.inventoryRevision,b.inventoryRevision);assert.deepEqual(a.processed,['global']);
 assert.match(compactRevision(records),/^v1-[0-9a-f]{32}$/);assert.ok(JSON.stringify(a).length<500);
});
test('native legacy names never overwrite collisions',()=>{assert.equal(collisionSafeName('Pocket legacy — A',['pocket legacy — a','Pocket legacy — A (2)']),'Pocket legacy — A (3)');});

function harness({historyCount=2,failReadAt=null,namespace,mainApi='openai'}={}){
 const pocket=namespace??{version:3,foreign:'keep',global:{preset:'A',model:'legacy-model',generation:{temperature:.4,openai_max_tokens:321,max_tokens:654,unknown_sampler:{keep:true}},presetBank:[{preset:'Bank B',generation:{temperature:.8,max_tokens:777}}],opaque:true}};
 const ctx={mainApi,extensionSettings:{pocket_tavern:structuredClone(pocket)},characters:[{avatar:'a.png',name:'A',data:{extensions:{pocket_tavern:{settings:{enabled:false,copy:{preset:'B',generation:{temperature:.7}}}}}}}],chatCompletionSettings:{preset_settings_openai:'A'}};
 const history=Array.from({length:historyCount},(_,index)=>({chatId:`chat-${index}`})),chatSettings=new Map();if(historyCount)chatSettings.set(`chat-${historyCount-1}`,{enabled:true,copy:{preset:'C',generation:{temperature:.9}},foreign:'chat'});
 let disk=structuredClone(ctx.extensionSettings),historyReads=0,chatReads=0,saveMode='ok',readFailure=false,pending=[{id:'q1',argument:{action:'configure',value:{api_key:'hide',max_tokens:42}},state:'pending'},{id:'q2',argument:{action:'edit'},state:'pending'}];
 const names={},presets=[];
 const manager={getAllPresets:()=>Object.keys(names),getPresetList:()=>({preset_names:names,presets}),getCompletionPresetByName:name=>presets[names[name]],savePreset:async(name,data)=>{names[name]=presets.length;presets.push(structuredClone(data));},findPreset:name=>names[name],selectPreset:async index=>{ctx.chatCompletionSettings.preset_settings_openai=Object.keys(names).find(name=>names[name]===index);},getSelectedPresetName:()=>ctx.chatCompletionSettings.preset_settings_openai};
 const dependencies={getContext:()=>ctx,listHistory:async()=>{historyReads++;return structuredClone(history);},readChat:async target=>{chatReads++;if(target.chatId===failReadAt)throw Object.assign(Error('read failed'),{code:'CHAT_READ_FAILED'});const value=chatSettings.get(target.chatId);return {metadata:value===undefined?{}:{pocket_tavern:{settings:structuredClone(value)}}};},saveSettings:async()=>{if(saveMode==='before')throw Error('save unavailable');disk=structuredClone(ctx.extensionSettings);if(saveMode==='after')throw Error('save acknowledgement lost');},readSavedSettings:async()=>{if(readFailure)throw Error('readback unavailable');return {extension_settings:structuredClone(disk)};},pendingOperations:async()=>structuredClone(pending),quarantinePending:async ids=>{pending=pending.map(item=>ids.includes(item.id)?{...item,state:'interrupted',error:'quarantined'}:item);},presetManager:()=>manager,applyPreset:async name=>{await manager.selectPreset(names[name]);return manager.getSelectedPresetName();}};
 return {ctx,history,chatSettings,names,presets,manager,pending:()=>pending,reads:()=>({historyReads,chatReads}),failSave:mode=>saveMode=mode,failRead:value=>readFailure=value,restart:()=>createConfigurationMigration(dependencies),migration:createConfigurationMigration(dependencies)};
}
async function scanExportVerify(migration){
 const scanned=await migration.run({action:'scan',operationId:op('scan')}),records=[];let offset=0,chunk;
 do{chunk=await migration.run({action:'exportChunk',expectedInventoryRevision:scanned.manifest.inventoryRevision,offset,limit:100});records.push(...chunk.records);offset=chunk.nextOffset;}while(offset!==null);
 const archive={manifest:chunk.manifest,records};await migration.run({action:'verifyArchive',operationId:op('verify'),archive});return {scanned,archive};
}

test('migration enumerates all scopes and preset-bank choices, quarantines replay, and preserves fields faithfully',async()=>{
 const h=harness(),{scanned,archive}=await scanExportVerify(h.migration);assert.equal(scanned.recordCount,4);assert.deepEqual(scanned.journal.quarantinedPending,['q1']);assert.equal(h.pending().find(item=>item.id==='q1').state,'interrupted');assert.equal(h.ctx.extensionSettings.pocket_tavern.foreign,'keep');
 assert.ok(archive.records.some(record=>record.id==='global:preset-bank:0'));assert.equal(JSON.stringify(archive).includes('hide'),false);assert.equal(JSON.stringify(archive).includes('openai_max_tokens'),true);assert.equal(JSON.stringify(archive).includes('max_tokens'),true);
 const mapping=await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision});assert.match(mapping.name,/Pocket legacy/);assert.equal(mapping.preservedModel,'legacy-model');assert.ok(mapping.unsupported.includes('model'));assert.equal(h.presets[0].openai_max_tokens,321);assert.equal(h.presets[0].max_tokens,654);assert.deepEqual(h.presets[0].unknown_sampler,{keep:true});
 const committed=await h.migration.run({action:'commit',operationId:op('commit'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision});assert.equal(committed.ownership,'native');assert.equal(h.ctx.extensionSettings.pocket_tavern.global.preset,'A');
});

test('live inventory changes after scan or archive verification block verification and commit',async()=>{
 const edited=harness(),scan=await edited.migration.run({action:'scan',operationId:op('scan')});const first=await edited.migration.run({action:'exportChunk',expectedInventoryRevision:scan.manifest.inventoryRevision,limit:100});edited.ctx.extensionSettings.pocket_tavern.global.generation.temperature=.12;
 await assert.rejects(edited.migration.run({action:'verifyArchive',operationId:op('verify'),archive:{manifest:first.manifest,records:first.records}}),{code:'STALE_INVENTORY'});
 const added=harness(),ready=await scanExportVerify(added.migration);added.chatSettings.set('chat-0',{enabled:true,copy:{preset:'Added',generation:{temperature:.2}}});await assert.rejects(added.migration.run({action:'commit',operationId:op('commit'),expectedInventoryRevision:ready.scanned.manifest.inventoryRevision}),{code:'STALE_INVENTORY'});
 const removed=harness(),ready2=await scanExportVerify(removed.migration);delete removed.ctx.extensionSettings.pocket_tavern.global;await assert.rejects(removed.migration.run({action:'commit',operationId:op('commit'),expectedInventoryRevision:ready2.scanned.manifest.inventoryRevision}),{code:'STALE_INVENTORY'});
});

test('restart keeps initial-selection requirement, reuses verified collisions, and detects altered native presets',async()=>{
 const h=harness(),{scanned}=await scanExportVerify(h.migration);const mapping=await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision});
 const restarted=h.restart();await assert.rejects(restarted.run({action:'commit',operationId:op('commit'),expectedInventoryRevision:scanned.manifest.inventoryRevision}),{code:'INITIAL_SELECTION_REQUIRED'});
 const again=await restarted.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision});assert.equal(again.name,mapping.name);assert.equal(h.presets.length,1);
 h.presets[h.names[mapping.name]].temperature=.99;await assert.rejects(restarted.run({action:'commit',operationId:op('commit'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision}),{code:'PRESET_UNVERIFIED'});
});

test('changed sources after rescan invalidate old mappings before cutover',async()=>{
 const h=harness(),first=await scanExportVerify(h.migration),old=await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:first.scanned.manifest.inventoryRevision});h.ctx.extensionSettings.pocket_tavern.global.generation.temperature=.23;
 const second=await scanExportVerify(h.migration);await assert.rejects(h.migration.run({action:'commit',operationId:op('commit'),sourceId:'global',expectedInventoryRevision:second.scanned.manifest.inventoryRevision}),{code:'PRESET_REQUIRED'});
 const current=await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:second.scanned.manifest.inventoryRevision});assert.notEqual(current.sourceRevision,old.sourceRevision);assert.equal(h.presets.length,2);
 const done=await h.migration.run({action:'commit',operationId:op('commit'),sourceId:'global',expectedInventoryRevision:second.scanned.manifest.inventoryRevision});assert.equal(done.ownership,'native');
});

test('failed migration writes stay fail-closed until durable readback reconciles them',async()=>{
 const scanFailure=harness();scanFailure.failSave('before');await assert.rejects(scanFailure.migration.run({action:'scan',operationId:op('scan')}),{code:'MIGRATION_UNVERIFIED'});assert.equal(scanFailure.ctx.extensionSettings.pocket_tavern.migration,undefined);
 const h=harness(),ready=await scanExportVerify(h.migration);await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:ready.scanned.manifest.inventoryRevision});h.failSave('after');h.failRead(true);
 await assert.rejects(h.migration.run({action:'commit',operationId:op('commit'),sourceId:'global',expectedInventoryRevision:ready.scanned.manifest.inventoryRevision}),{code:'MIGRATION_UNCERTAIN'});assert.equal(h.ctx.extensionSettings.pocket_tavern.migration.ownership,'preparing');assert.equal(h.ctx.extensionSettings.pocket_tavern.migration.checkpoint,'uncertain');
 const blocked=await h.migration.run({action:'inspect'});assert.equal(blocked.uncertain,true);assert.equal(blocked.canCutover,false);await assert.rejects(h.migration.run({action:'scan',operationId:op('scan')}),{code:'MIGRATION_UNCERTAIN'});
 h.failRead(false);const reconciled=await h.migration.run({action:'inspect'});assert.equal(reconciled.uncertain,false);assert.equal(reconciled.ownership,'native');
});

test('v3 modelSelection disclosure wins over stale copy models for current and bank choices',async()=>{
 const h=harness();h.ctx.characters[0].data.extensions.pocket_tavern.settings={enabled:true,modelSelection:{enabled:true,value:'actual-v3-model'},copy:{preset:'B',model:'stale-copy-model',generation:{temperature:.7},presetBank:[{preset:'B saved',generation:{temperature:.6}}]}};
 const {scanned,archive}=await scanExportVerify(h.migration),bank=archive.records.find(record=>record.id==='character:a.png:preset-bank:0');assert.deepEqual(bank.record.modelSelection,{enabled:true,value:'actual-v3-model'});
 const mapping=await h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:bank.id,expectedInventoryRevision:scanned.manifest.inventoryRevision});assert.deepEqual(mapping.preservedModelSelection,{explicit:true,enabled:true,value:'actual-v3-model',copyValue:'stale-copy-model'});assert.equal(mapping.preservedModel,'actual-v3-model');
});

test('legacy Chat Completion copies cannot be falsely materialized into Text Completion',async()=>{
 const h=harness(),{scanned}=await scanExportVerify(h.migration);h.ctx.mainApi='textgenerationwebui';await assert.rejects(h.migration.run({action:'materialize',operationId:op('materialize'),sourceId:'global',expectedInventoryRevision:scanned.manifest.inventoryRevision}),{code:'API_FAMILY_UNSUPPORTED'});
});

test('scan is uncapped beyond 1000 histories and any failed history read aborts preservation',async()=>{
 const large=harness({historyCount:1105}),scanned=await large.migration.run({action:'scan',operationId:op('scan')});assert.equal(large.reads().chatReads,2210);assert.equal(scanned.recordCount,4);
 const failed=harness({historyCount:5,failReadAt:'chat-3'});await assert.rejects(failed.migration.run({action:'scan',operationId:op('scan')}),{code:'CHAT_READ_FAILED'});assert.equal(failed.ctx.extensionSettings.pocket_tavern.migration,undefined);
});

test('unknown schemas stay archived, future schemas block, and a true new install can cut over after verification',async()=>{
 const unknown=harness({namespace:{version:3,global:{preset:'Odd',generation:{temperature:.5},future_shape:{nested:['keep']}}}}),{archive}=await scanExportVerify(unknown.migration);assert.deepEqual(archive.records.find(record=>record.id==='global').record.future_shape,{nested:['keep']});
 const future=harness({namespace:{version:99,global:{preset:'Future',generation:{temperature:1}}}});await assert.rejects(future.migration.run({action:'scan',operationId:op('scan')}),{code:'UNSUPPORTED_SETTINGS'});
 const fresh=harness({historyCount:0,namespace:{version:3}});fresh.ctx.characters=[];const ready=await scanExportVerify(fresh.migration);const done=await fresh.restart().run({action:'commit',operationId:op('commit'),expectedInventoryRevision:ready.scanned.manifest.inventoryRevision});assert.equal(done.ownership,'native');assert.equal(done.journal.initialSourceId,null);
});
