import {el,btn} from './wi-ui.js?build=0.9.0';

const operationId=()=>crypto.randomUUID();
const sourceLabel=record=>record?.source?.label??record?.id??'Legacy settings';

export function createConfigurationMigrationPage({rpc,notify=()=>{},onComplete=()=>{}}) {
    let inspection=null,archive=null,busy=false,failure='';
    async function inspect(){inspection=await rpc('configurationMigration',{action:'inspect'});return inspection;}
    async function preserve(){
        busy=true;failure='';try{
            const scan=await rpc('configurationMigration',{action:'scan',operationId:operationId()},120000),records=[];let offset=0,chunk;
            do{chunk=await rpc('configurationMigration',{action:'exportChunk',expectedInventoryRevision:scan.manifest.inventoryRevision,offset,limit:25},120000);records.push(...chunk.records);offset=chunk.nextOffset;}while(offset!==null);
            archive={version:1,manifest:chunk.manifest,records};
            archive=JSON.parse(JSON.stringify(archive));
            await rpc('configurationMigration',{action:'verifyArchive',operationId:operationId(),archive},120000);await inspect();notify('Legacy configuration archive verified.');
        }catch(error){failure=error.message;throw error;}finally{busy=false;}
    }
    function download(){
        if(!archive)return;const blob=new Blob([`${JSON.stringify(archive,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`pocket-configuration-${archive.manifest.inventoryRevision}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
    }
    async function commit(sourceId=null){
        if(!archive)throw Error('Preserve and verify the current legacy inventory first.');busy=true;failure='';try{
            if(sourceId)await rpc('configurationMigration',{action:'materialize',operationId:operationId(),sourceId,expectedInventoryRevision:archive.manifest.inventoryRevision},120000);
            await rpc('configurationMigration',{action:'commit',operationId:operationId(),sourceId,expectedInventoryRevision:archive.manifest.inventoryRevision},120000);await inspect();await onComplete();notify('SillyTavern now owns connection and generation settings.');
        }catch(error){failure=error.message;throw error;}finally{busy=false;}
    }
    function render(container,action){
        container.replaceChildren();const page=el('div','','migration-page');
        page.append(el('p','Pocket preserves every legacy global, character and uncapped chat configuration before native SillyTavern takes ownership. Existing records stay unchanged for rollback/export.','sp-note'));
        if(!inspection){page.append(el('p','Reading migration state…','sp-note'));container.append(page);return;}
        if(inspection.futureSchema){page.append(el('p','A newer Pocket settings schema is present. Browsing remains available, but this build will not change ownership.','sp-note err'));container.append(page);return;}
        const status=el('section','','migration-status');status.append(el('strong',inspection.ownership==='native'?'Native SillyTavern ownership':inspection.ownership==='preparing'?'Preservation in progress':'Legacy Pocket scopes'),el('small',inspection.ownership==='native'?'Opening a chat or sending no longer reapplies Pocket scopes.':'Generation stays on the legacy path until archive verification and native preset readback complete.'));page.append(status);
        if(inspection.ownership==='native'){page.append(el('p','The retained archive and legacy records are not deleted. Rollback is manual and must use a tested disposable restoration rehearsal.','sp-note'));container.append(page);return;}
        const preserveButton=btn(inspection.ownership==='preparing'?'Rescan and verify archive':inspection.legacyNamespace?'Preserve legacy settings':'Prepare native ownership',()=>action(async()=>{try{await preserve();}finally{render(container,action);}}),'btn primary sp-primary');preserveButton.disabled=busy;page.append(preserveButton);
        if(archive){page.append(btn('Download verified archive',download,'btn secondary sp-secondary'),el('p',`${archive.manifest.count} preserved record${archive.manifest.count===1?'':'s'} · ${archive.manifest.inventoryRevision.slice(0,12)}`,'sp-note'));
            const choices=archive.records.filter(record=>record.id!=='pending-configure');if(choices.length){page.append(el('h2','Choose the initial native configuration','sp-heading'),el('p','Each current copy and saved preset-bank entry is recoverable. The selected Chat Completion generation copy becomes a collision-safe native preset; legacy model overrides and unknown fields stay in the archive and are reported, not silently applied. All original records remain unchanged.','sp-note'));for(const record of choices){const row=btn('',()=>action(async()=>{try{await commit(record.id);}finally{render(container,action);}}),'migration-choice');row.disabled=busy;const copy=record.record?.copy??record.record,selection=record.record?.modelSelection,model=selection?selection.enabled?`model override retained: ${selection.value??'unset'}`:`model override disabled${selection.value?` (stored ${selection.value})`:''}`:copy?.model?`model retained: ${copy.model}`:'',text=el('span'),details=[copy?.preset??'Legacy settings',model,copy?.recoveredFromPresetBank?'saved preset-bank copy':''].filter(Boolean).join(' · ');text.append(el('strong',sourceLabel(record)),el('small',details));row.append(text,el('span','Use','migration-use'));page.append(row);}}
            else{const finish=btn('Finish native setup',()=>action(async()=>{try{await commit(null);}finally{render(container,action);}}),'btn primary sp-primary');finish.disabled=busy;page.append(finish,el('p','No legacy scoped configuration was found. This explicit action initializes native ownership without deleting anything.','sp-note'));}}
        if(failure)page.append(el('p',failure,'sp-note err'),el('p',inspection?.uncertain?'Saved ownership is being reconciled. Generation and migration stay locked until readback succeeds.':'No ownership cutover was made. Retry the scan or keep using unaffected browsing.','sp-note'));
        container.append(page);
    }
    return {inspect,render,state:()=>inspection};
}
