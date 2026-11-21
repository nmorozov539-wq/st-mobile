import {revision} from './workspace-data.js?build=0.9.2';

const SECRET_FIELDS=new Set(['apikey','api_key','api-key','api_secret','client_secret','secret','password','authorization','cookie','access_token','refresh_token','auth_token','bearer_token']);
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const clone=value=>structuredClone(value);
export function compactRevision(value){const text=revision(value),seeds=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35],parts=seeds.map(seed=>{let hash=seed>>>0;for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');});return `v1-${parts.join('')}`;}

export function redactConfiguration(value) {
    if(Array.isArray(value))return value.map(redactConfiguration);
    if(!value||typeof value!=='object')return value;
    return Object.fromEntries(Object.entries(value).filter(([key])=>!SECRET_FIELDS.has(String(key).toLocaleLowerCase())).map(([key,item])=>[key,redactConfiguration(item)]));
}
export function archiveManifest(records,{generatedAt=new Date().toISOString()}={}) {
    const sanitized=records.map(record=>redactConfiguration(record));
    return {version:1,kind:'stm-configuration-preservation',generatedAt,inventoryRevision:compactRevision(sanitized),count:sanitized.length,
        processed:sanitized.map(record=>record.id),skipped:[],failed:[]};
}
export function collisionSafeName(base,names) {
    const existing=new Set((names??[]).map(name=>String(name).toLocaleLowerCase()));
    if(!existing.has(base.toLocaleLowerCase()))return base;
    for(let index=2;index<10000;index++){const value=`${base} (${index})`;if(!existing.has(value.toLocaleLowerCase()))return value;}
    fail('NAME_COLLISION','Could not create a unique native preset name.');
}
export function createConfigurationMigration({getContext,listHistory,readChat,saveSettings,readSavedSettings,presetManager,applyPreset,pendingOperations=()=>[],quarantinePending=async ids=>{if(ids.length)fail('QUARANTINE_UNAVAILABLE','Pending configuration changes could not be quarantined safely.');},isBusy=()=>false}) {
    let inventory=null,uncertain=null;
    const completed=new Map();
    const namespace=()=>getContext().extensionSettings.stm??null;
    const writableNamespace=()=>getContext().extensionSettings.stm??={version:3};
    const journal=()=>namespace()?.migration??{version:1,ownership:'legacy',checkpoint:'unscanned',mappings:{}};
    async function reconcile(){const saved=await readSavedSettings(),actual=saved.extension_settings?.stm?.migration;if(actual)writableNamespace().migration=clone(actual);else if(namespace()?.migration)delete writableNamespace().migration;uncertain=null;return actual??{version:1,ownership:'legacy',checkpoint:'unscanned',mappings:{}};}
    async function persist(next){const before=clone(namespace()?.migration??null);writableNamespace().migration=clone(next);try{await saveSettings();const saved=await readSavedSettings(),actual=saved.extension_settings?.stm?.migration;if(revision(actual)!==revision(next))fail('MIGRATION_UNVERIFIED','Migration progress could not be verified in saved settings.');uncertain=null;return clone(next);}catch(error){try{const actual=await reconcile();if(revision(actual)===revision(next))return clone(next);throw Object.assign(Error(`Migration progress was not saved: ${error.message}`),{code:'MIGRATION_UNVERIFIED'});}catch(readError){if(readError.code==='MIGRATION_UNVERIFIED')throw readError;uncertain={before,next,error:error.message,readbackError:readError.message};writableNamespace().migration={...(before??{version:1,mappings:{}}),ownership:'preparing',checkpoint:'uncertain',uncertain:true};fail('MIGRATION_UNCERTAIN','Migration save outcome is uncertain. Engine configuration stays locked until saved settings can be read back.');}}}
    function addRecoverable(records,base){
        records.push(base);
        const copy=base.record?.copy??base.record;
        for(const [index,item] of (Array.isArray(copy?.presetBank)?copy.presetBank:[]).entries())if(item&&typeof item.preset==='string'&&item.generation&&typeof item.generation==='object')records.push({
            id:`${base.id}:preset-bank:${index}`,source:{...base.source,kind:'preset-bank',label:`${base.source.label} · saved ${item.preset}`,parentId:base.id},
            record:{preset:item.preset,model:copy.model??null,modelSelection:clone(base.record?.modelSelection??null),generation:clone(item.generation),recoveredFromPresetBank:true},
        });
    }
    async function enumerate(){
        const ctx=getContext(),records=[];
        const stm=namespace()??{};
        if(stm.global)addRecoverable(records,{id:'global',source:{kind:'global',label:'Global',family:'chat-completion'},record:clone(stm.global)});
        for(const character of ctx.characters??[]){
            const settings=character.data?.extensions?.stm?.settings;
            if(settings!==undefined)addRecoverable(records,{id:`character:${character.avatar}`,source:{kind:'character',key:character.avatar,label:character.name||character.avatar,family:'chat-completion'},record:clone(settings)});
            for(const row of await listHistory(character.avatar)){
                const chat=await readChat({characterKey:character.avatar,chatId:row.chatId});
                const value=chat.metadata?.stm?.settings;
                if(value!==undefined)addRecoverable(records,{id:`chat:${character.avatar}:${row.chatId}`,source:{kind:'chat',characterKey:character.avatar,chatId:row.chatId,label:`${character.name||character.avatar} · ${row.chatId}`,family:'chat-completion'},record:clone(value)});
            }
        }
        const pending=(await pendingOperations()).filter(item=>item?.argument?.action==='configure').map(item=>({id:item.id??revision(item),argument:clone(item.argument),state:item.state??'pending'}));
        return {records:redactConfiguration(records),pending:redactConfiguration(pending)};
    }
    const archivedRecords=value=>[...value.records,{id:'pending-configure',source:{kind:'pending',label:'Pending configuration operations'},record:value.pending}];
    const inventoryManifest=value=>archiveManifest(archivedRecords(value),{generatedAt:journal().manifest?.generatedAt});
    const chosenCopy=record=>record?.record?.copy??record?.record;
    function modelDisclosure(source){const copy=chosenCopy(source),selection=source?.record?.modelSelection;if(selection&&typeof selection==='object')return {explicit:true,enabled:!!selection.enabled,value:selection.value??null,copyValue:copy?.model??null};return {explicit:false,enabled:copy?.model!==undefined&&copy?.model!==null,value:copy?.model??null,copyValue:copy?.model??null};}
    async function liveInventory(expectedRevision){
        const value=await enumerate(),manifest=inventoryManifest(value),stored=journal().inventoryRevision;
        if((expectedRevision&&manifest.inventoryRevision!==expectedRevision)||(stored&&manifest.inventoryRevision!==stored))fail('STALE_INVENTORY','Legacy configuration changed. Rescan and verify a new archive before continuing.');
        inventory=value;return {value,manifest};
    }
    function completion(manager,name){return manager.getCompletionPresetByName?.(name)??(()=>{const list=manager.getPresetList();const index=list.preset_names?.[name];return index===undefined?undefined:list.presets?.[index];})();}
    async function operation(argument,work){
        const mutating=['scan','verifyArchive','materialize','commit'].includes(argument.action);
        if(!mutating)return work();
        if(typeof argument.operationId!=='string'||!argument.operationId)fail('INVALID_ARGUMENT','A migration operation ID is required.');
        const fingerprint=compactRevision({...argument,operationId:undefined});
        const previous=completed.get(argument.operationId);
        if(previous){if(previous.fingerprint!==fingerprint)fail('OPERATION_CONFLICT','This migration operation ID was already used for different input.');return clone(previous.result);}
        const result=await work();completed.set(argument.operationId,{fingerprint,result:clone(result)});return result;
    }
    return {
        async run(argument={}){
          return operation(argument,async()=>{
            if(argument.action==='inspect'){
                if(uncertain)try{await reconcile();}catch{}
                const current=journal(),future=Number(namespace()?.version??1)>3;
                return {journal:clone(current),ownership:current.ownership,legacyNamespace:!!namespace()?.global,futureSchema:future,uncertain:!!uncertain,canBrowse:true,canCutover:!uncertain&&!future&&current.checkpoint==='archive-verified'};
            }
            if(uncertain)fail('MIGRATION_UNCERTAIN','Migration save outcome is uncertain. Reopen this page after saved settings are reachable.');
            if(argument.action==='scan'){
                if(isBusy())fail('BUSY','Finish current engine work before scanning configuration.');
                if(Number(namespace()?.version??1)>3)fail('UNSUPPORTED_SETTINGS','A newer STM settings schema blocks configuration cutover.');
                inventory=await enumerate();const pendingIds=inventory.pending.map(item=>item.id);await quarantinePending(pendingIds);inventory=await enumerate();const manifest=archiveManifest(archivedRecords(inventory));
                const current={...journal(),version:1,ownership:'preparing',checkpoint:'scanned',inventoryRevision:manifest.inventoryRevision,manifest,legacyRecordCount:inventory.records.length,sourceIds:inventory.records.map(item=>item.id),quarantinedPending:pendingIds,mappings:journal().mappings??{}};
                await persist(current);return {journal:current,manifest,recordCount:inventory.records.length,pendingCount:inventory.pending.length};
            }
            if(argument.action==='exportChunk'){
                const {value,manifest}=await liveInventory(argument.expectedInventoryRevision),all=archivedRecords(value),offset=Math.max(0,Number(argument.offset)||0),limit=Math.min(100,Math.max(1,Number(argument.limit)||25));
                return {version:1,manifest,offset,records:clone(all.slice(offset,offset+limit)),nextOffset:offset+limit<all.length?offset+limit:null,complete:offset+limit>=all.length};
            }
            if(argument.action==='verifyArchive'){
                const {manifest:current}=await liveInventory(journal().inventoryRevision),records=redactConfiguration(argument.archive?.records??[]),manifest=argument.archive?.manifest;
                if(!manifest||manifest.kind!=='stm-configuration-preservation'||manifest.inventoryRevision!==current.inventoryRevision||manifest.count!==current.count||manifest.count!==records.length||compactRevision(records)!==manifest.inventoryRevision)fail('ARCHIVE_INVALID','The preservation archive is incomplete or no longer matches the live legacy inventory.');
                const next={...journal(),ownership:'preparing',checkpoint:'archive-verified',archiveRevision:compactRevision({manifest,records}),archiveVerifiedAt:new Date().toISOString()};await persist(next);return {journal:next,archiveRevision:next.archiveRevision,recordCount:records.length};
            }
            if(argument.action==='materialize'){
                if(isBusy())fail('BUSY','Finish current engine work before creating a native preset.');
                if(!journal().archiveRevision||!['archive-verified','verified'].includes(journal().checkpoint))fail('PRESERVATION_REQUIRED','Verify the complete preservation archive before creating a native preset.');
                const {value}=await liveInventory(argument.expectedInventoryRevision);if(getContext().mainApi!=='openai')fail('API_FAMILY_UNSUPPORTED','Legacy STM copies are Chat Completion presets. Switch to a Chat Completion connection before materializing one.');
                const source=value.records.find(record=>record.id===argument.sourceId);if(!source)fail('NOT_FOUND','The selected legacy configuration no longer exists.');
                const copy=chosenCopy(source),manager=presetManager();if(!manager?.savePreset)fail('UNSUPPORTED_OPERATION','The active API has no writable native preset manager.');
                const sourceRevision=compactRevision(source.record),existing=journal().mappings?.[source.id];if(existing&&existing.sourceRevision===sourceRevision&&existing.api===getContext().mainApi&&manager.getAllPresets?.().includes(existing.name)){const saved=completion(manager,existing.name);if(saved&&compactRevision(saved)===existing.nativeRevision)return clone(existing);}
                const names=manager.getAllPresets?.()??Object.keys(manager.getPresetList?.().preset_names??{}),sourcePreset=String(copy?.preset??'Settings'),base=`STM legacy — ${source.source.label} — ${sourcePreset}`;
                const data=clone(copy?.generation??{});if(!Object.keys(data).length)fail('UNSUPPORTED_OPERATION','This legacy record has no fields that map to the active native preset manager.');
                let name=names.find(candidate=>(candidate===base||candidate.startsWith(`${base} (`))&&compactRevision(completion(manager,candidate))===compactRevision(data)),saved=name?completion(manager,name):null;
                if(!name){name=collisionSafeName(base,names);await manager.savePreset(name,data);saved=completion(manager,name);}if(compactRevision(saved)!==compactRevision(data))fail('PRESET_UNVERIFIED','The native preset did not match the materialized legacy record.');
                const unsupported=Object.keys(copy??{}).filter(key=>!['preset','generation','presetBank','modelSelection','recoveredFromPresetBank'].includes(key));if((copy?.model!==undefined||source?.record?.modelSelection)&&!unsupported.includes('model'))unsupported.push('model');
                const preservedModelSelection=modelDisclosure(source),mapping={sourceId:source.id,sourceRevision,name,api:'openai',family:'chat-completion',nativeRevision:compactRevision(saved),unsupported,preservedModel:preservedModelSelection.value,preservedModelSelection,recoveredFromPresetBank:!!copy?.recoveredFromPresetBank};
                const next={...journal(),mappings:{...(journal().mappings??{}),[source.id]:mapping}};await persist(next);return mapping;
            }
            if(argument.action==='commit'){
                if(isBusy())fail('BUSY','Finish current engine work before native ownership cutover.');
                const current=journal();if(argument.expectedInventoryRevision!==current.inventoryRevision)fail('STALE_INVENTORY','Rescan before native ownership cutover.');
                if(!current.archiveRevision||!['archive-verified','verified'].includes(current.checkpoint))fail('PRESERVATION_REQUIRED','Verify the complete preservation archive before cutover.');
                const {value}=await liveInventory(argument.expectedInventoryRevision);
                if(argument.sourceId){const source=value.records.find(record=>record.id===argument.sourceId);if(!source)fail('STALE_INVENTORY','The chosen legacy configuration no longer exists.');const mapping=current.mappings?.[argument.sourceId];if(!mapping)fail('PRESET_REQUIRED','Materialize the chosen initial configuration first.');if(mapping.sourceRevision!==compactRevision(source.record))fail('PRESET_REQUIRED','The chosen legacy configuration changed after materialization. Create its native preset again.');if(mapping.api!==getContext().mainApi)fail('API_CHANGED','The active API changed after native preset creation. Reopen migration and choose again.');const manager=presetManager(),saved=completion(manager,mapping.name);if(!saved||compactRevision(saved)!==mapping.nativeRevision)fail('PRESET_UNVERIFIED','The materialized native preset changed before cutover. Recreate or choose it again.');const selected=await applyPreset(mapping.name);if(selected!==mapping.name)fail('PRESET_UNVERIFIED','The chosen native preset was not selected after readback.');}
                else if(value.records.length||Number(current.legacyRecordCount)>0)fail('INITIAL_SELECTION_REQUIRED','Choose an initial native configuration.');
                const next={...current,ownership:'native',checkpoint:'verified',committedAt:new Date().toISOString(),initialSourceId:argument.sourceId??null};await persist(next);return {journal:next,ownership:'native'};
            }
            fail('INVALID_ARGUMENT','Unknown configuration-migration action.');
          });
        }
    };
}
