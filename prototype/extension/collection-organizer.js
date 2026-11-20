const clone=value=>structuredClone(value);
const cleanName=value=>String(value??'').trim().replace(/\s+/g,' ').slice(0,60);
const empty=()=>({version:1,revision:0,folders:[],assignments:{}});
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
const stable=value=>{
    if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
};
function parse(raw,{allowMissing=true}={}){
    if(raw===undefined&&allowMissing)return empty();
    if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('INVALID_COLLECTION_SETTINGS','Character folder settings are malformed. Update Pocket or restore saved settings before changing folders.');
    if(!Number.isInteger(raw.version))fail('INVALID_COLLECTION_SETTINGS','Character folder settings have no supported schema version.');
    if(raw.version>1)fail('UNSUPPORTED_SETTINGS','These character folders were saved by a newer Pocket Tavern version.');
    if(raw.version!==1||!Number.isInteger(raw.revision)||raw.revision<0||!Array.isArray(raw.folders)||!raw.assignments||typeof raw.assignments!=='object'||Array.isArray(raw.assignments))fail('INVALID_COLLECTION_SETTINGS','Character folder settings are malformed.');
    const ids=new Set(),folders=raw.folders.map(folder=>{
        if(!folder||typeof folder!=='object'||Array.isArray(folder)||typeof folder.id!=='string'||!folder.id||!cleanName(folder.name)||cleanName(folder.name)!==folder.name||ids.has(folder.id))fail('INVALID_COLLECTION_SETTINGS','A saved character folder is malformed or duplicated.');
        ids.add(folder.id);return clone(folder);
    });
    for(const [key,id] of Object.entries(raw.assignments))if(!key||typeof id!=='string'||!ids.has(id))fail('INVALID_COLLECTION_SETTINGS','A saved character folder assignment is malformed.');
    return {...clone(raw),version:1,revision:raw.revision,folders,assignments:{...raw.assignments}};
}
export function createCollectionOrganizer({getContext,saveSettings,readSavedSettings,isBusy=()=>false,onBusy=()=>{}}){
    let mutating=false,uncertain=null;
    const liveRaw=()=>getContext().extensionSettings?.pocket_tavern?.collections;
    const setLive=value=>{const context=getContext(),namespace=context.extensionSettings.pocket_tavern??={version:3};if(value===undefined)delete namespace.collections;else namespace.collections=clone(value);};
    const diskRaw=async()=>{const saved=await readSavedSettings();return saved.extension_settings?.pocket_tavern?.collections;};
    const reconcile=async()=>{
        if(!uncertain)return parse(liveRaw());
        let actual;try{actual=await diskRaw();}catch{fail('COLLECTIONS_UNCERTAIN','Character folder save outcome is uncertain. Reopen after saved settings are reachable.');}
        if(stable(actual)===stable(uncertain.next)){setLive(uncertain.next);uncertain=null;return parse(actual);}
        if(stable(actual)===stable(uncertain.before)){setLive(uncertain.before);uncertain=null;return parse(actual);}
        fail('COLLECTIONS_UNCERTAIN','Character folders changed during an uncertain save. Inspect saved settings before another folder change.');
    };
    const read=async()=>clone(await reconcile());
    const persist=async(next,beforeRaw)=>{
        setLive(next);
        try{
            await saveSettings();const actual=await diskRaw();
            if(stable(actual)!==stable(next))throw Object.assign(Error('Saved character folders do not match the requested change.'),{code:'SETTINGS_UNVERIFIED'});
            uncertain=null;return clone(parse(actual));
        }catch(error){
            try{
                const actual=await diskRaw();
                if(stable(actual)===stable(next)){setLive(next);uncertain=null;return clone(parse(actual));}
                if(stable(actual)===stable(beforeRaw)){setLive(beforeRaw);uncertain=null;throw Object.assign(Error(`Character folders were not saved: ${error.message}`),{code:error.code??'SETTINGS_UNVERIFIED'});}
            }catch(readError){if(readError.code==='SETTINGS_UNVERIFIED')throw readError;}
            uncertain={before:clone(beforeRaw),next:clone(next)};setLive(next);fail('COLLECTIONS_UNCERTAIN','Character folder save outcome is uncertain. Reopen after saved settings are reachable.');
        }
    };
    const run=async argument=>{
        if(!argument||argument.action==='read'||argument.action==='reconcile')return read();
        if(mutating||uncertain||isBusy())fail('BUSY',uncertain?'Character folder save outcome is uncertain. Reconcile saved settings before another change.':'Finish the current engine operation before changing folders.');
        mutating=true;onBusy(true);
        try{
            const beforeRaw=clone(liveRaw()),actualRaw=await diskRaw(),actual=parse(actualRaw);parse(beforeRaw);
            if(stable(actualRaw)!==stable(beforeRaw)){setLive(actualRaw);fail('STALE_SETTINGS','Saved character folders changed. Reopen the filter before saving.');}
            if(argument.revision!==actual.revision)fail('STALE_SETTINGS','Character folders changed. Reopen the filter before saving.');
            const next=clone(actual),keys=new Set(getContext().characters.map(character=>character.avatar));
            if(argument.action==='create'){
                const name=cleanName(argument.name);if(!name)fail('INVALID_ARGUMENT','Enter a folder name.');if(next.folders.some(folder=>folder.name.toLocaleLowerCase()===name.toLocaleLowerCase()))fail('INVALID_ARGUMENT','A folder with that name already exists.');next.folders.push({id:crypto.randomUUID(),name});
            }else if(argument.action==='rename'){
                const folder=next.folders.find(item=>item.id===argument.id),name=cleanName(argument.name);if(!folder||!name)fail('INVALID_ARGUMENT','Choose a saved folder and enter a name.');if(next.folders.some(item=>item.id!==folder.id&&item.name.toLocaleLowerCase()===name.toLocaleLowerCase()))fail('INVALID_ARGUMENT','A folder with that name already exists.');folder.name=name;
            }else if(argument.action==='delete'){
                if(!next.folders.some(folder=>folder.id===argument.id))fail('NOT_FOUND','That folder no longer exists.');next.folders=next.folders.filter(folder=>folder.id!==argument.id);for(const [key,id] of Object.entries(next.assignments))if(id===argument.id)delete next.assignments[key];
            }else if(argument.action==='move'){
                if(!keys.has(argument.characterKey))fail('NOT_FOUND','That character no longer exists.');if(argument.folderId!==null&&!next.folders.some(folder=>folder.id===argument.folderId))fail('NOT_FOUND','That folder no longer exists.');if(argument.folderId===null)delete next.assignments[argument.characterKey];else next.assignments[argument.characterKey]=argument.folderId;
            }else fail('INVALID_ARGUMENT','Unknown folder action.');
            for(const key of Object.keys(next.assignments))if(!keys.has(key))delete next.assignments[key];
            next.revision=actual.revision+1;return await persist(next,beforeRaw);
        }finally{mutating=false;onBusy(false);}
    };
    run.busy=()=>mutating||!!uncertain;run.uncertain=()=>!!uncertain;return run;
}
