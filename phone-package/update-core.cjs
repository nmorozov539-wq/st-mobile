const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {patchEngine} = require('./compatibility.cjs');
const {hashFile,walkFiles,verifyPackage} = require('./package-staging.cjs');

const UPDATE_SCHEMA = 1;
const DATA_SCHEMA = 1;
// v2 uses unique bakery-protocol claims inside a stable directory. The old
// fixed pathname is read only for compatibility: it is never reclaimed by
// unlinking, because doing so can delete a replacement owner's live lock.
const LIFECYCLE_LOCK = '.stm-lifecycle-locks';
const UPDATE_LOCK = LIFECYCLE_LOCK;
const LAUNCHER_LOCK = LIFECYCLE_LOCK;
const LEGACY_UNIFIED_LOCK = '.stm-lifecycle.lock';
const LEGACY_UPDATE_LOCK = '.stm-update.lock';
const LEGACY_LAUNCHER_LOCK = '.stm-launcher.lock';
const JOURNAL = '.stm-update-transaction.json';
const INSTALLED_MANIFEST = '.stm-installed-manifest.json';
const UPDATER_ROOT = '.stm-updater';
const BACKUP_ROOT = '.stm-backups';

const ROOT_MANAGED = Object.freeze([
    'public/st-mobile',
    'public/scripts/extensions/third-party/st-mobile-experiment',
    'public/scripts/extensions/third-party/Extension-Summaryception',
    'public/scripts/tokenizers.js',
    'src/server-main.js',
    'src/fetch-patch.js',
    'public/script.js',
    'public/scripts/stm-session-init.js',
    '.stm-wasm',
    'mock-model.mjs',
    'start.cjs','log-supervisor.cjs','diagnostics-server.cjs','diagnostics-viewer.cjs','update-core.cjs','compatibility.cjs','package-staging.cjs',
]);

function safeRelative(name) {
    if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw Error(`Unsafe managed path: ${name}`);
    return name.split('/').join(path.sep);
}

function durableJson(file,value) {
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    const fd = fs.openSync(temporary,'wx',0o600);
    try {
        fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');
        fs.fsyncSync(fd);
    } finally {fs.closeSync(fd);}
    fs.renameSync(temporary,file);
    try {const parent=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}} catch {}
}

function readJson(file,required=true) {
    try {return JSON.parse(fs.readFileSync(file,'utf8'));}
    catch (error) {if (!required && error.code==='ENOENT') return null; throw error;}
}

function readMarker(target) {
    const markerPath=path.join(target,'.stm.json');
    const marker=readJson(markerPath);
    if (marker.version!==1 || marker.mode!=='combined' || marker.dataRoot!=='data') throw Error('Not a recognized combined STM installation.');
    if (readJson(path.join(target,'package.json')).version!=='1.19.1') throw Error('This updater supports the pinned ST 1.19.1 installation only. The installation was not changed.');
    return {marker,markerPath};
}

function processAlive(pid) {
    if (!Number.isInteger(pid) || pid<1) return false;
    try {process.kill(pid,0);return true;} catch (error) {return error.code==='EPERM';}
}

const waitSync=milliseconds=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,milliseconds);
const claimPattern=/^claim-(\d+)-([a-f0-9]+)\.json$/;
const publishingPattern=/\.publishing-(\d+)-/;

function safeLockJson(file) {
    try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
}

function legacyOwner(file,{invalidGraceMs=5000}={}) {
    try{
        const owner=safeLockJson(file);
        if(owner)return {owner,stale:!processAlive(owner.pid)};
        const age=Date.now()-fs.statSync(file).mtimeMs;
        return {owner:null,stale:age>=invalidGraceMs,invalid:true};
    }catch(error){if(error.code==='ENOENT')return null;throw error;}
}

function atomicClaim(file,value,onState=()=>{}) {
    const temporary=`${file}.publishing-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    const fd=fs.openSync(temporary,'wx',0o600);
    let renamed=false;
    try{
        onState('claim-publication-open',{temporary,fd});
        fs.writeFileSync(fd,JSON.stringify(value)+'\n');
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        onState('claim-publication-written',{temporary});
        fs.renameSync(temporary,file);renamed=true;
        try{const parent=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}}catch{}
    }finally{
        try{fs.closeSync(fd);}catch{}
        if(!renamed)try{fs.unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
}

function claimEntries(directory,{cleanup=true}={}) {
    let names;try{names=fs.readdirSync(directory);}catch(error){if(error.code==='ENOENT')return [];throw error;}
    const claims=[];
    for(const name of names){
        const file=path.join(directory,name),publishing=name.match(publishingPattern);
        if(publishing){
            if(cleanup&&!processAlive(Number(publishing[1])))try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
            continue;
        }
        const match=name.match(claimPattern);if(!match)continue;
        const pid=Number(match[1]),owner=safeLockJson(file);
        if(!processAlive(pid)){
            if(cleanup)try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
            continue;
        }
        claims.push(owner&&owner.actor===match[2]&&owner.pid===pid?{...owner,file}:{actor:match[2],pid,kind:'unknown',choosing:true,ticket:0,file,invalid:true});
    }
    return claims;
}

function removeOwnedClaim(file,actor) {
    const owner=safeLockJson(file);
    if(!owner||owner.actor!==actor||owner.pid!==process.pid)return false;
    try{fs.unlinkSync(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}
}

function activeLifecycleClaims(target) {
    return claimEntries(path.join(target,LIFECYCLE_LOCK),{cleanup:true});
}

function createExclusiveLock(file,kind,options={}) {
    return acquireLifecycleLock(path.dirname(file),kind,{...options,directory:path.basename(file)});
}

function acquireLifecycleLock(target,kind,{onState=()=>{},directory=LIFECYCLE_LOCK,choosingTimeoutMs=5000,invalidGraceMs=5000}={}) {
    const claimDirectory=path.join(target,directory);
    for(const legacy of [LEGACY_UNIFIED_LOCK,LEGACY_UPDATE_LOCK,LEGACY_LAUNCHER_LOCK]){
        const file=path.join(target,legacy),state=legacyOwner(file,{invalidGraceMs});if(!state)continue;
        if(!state.stale)throw Error(`Another STM lifecycle operation is active (${state.owner?.kind??'publishing'}, PID ${state.owner?.pid??'unknown'}).`);
        onState('legacy-stale-observed',{file,owner:state.owner,invalid:!!state.invalid});
        // Never unlink a fixed-path stale lock: another contender may already
        // have replaced it. New code coordinates in unique v2 claim paths.
    }
    fs.mkdirSync(claimDirectory,{recursive:true,mode:0o700});
    claimEntries(claimDirectory,{cleanup:true});
    const actor=crypto.randomBytes(16).toString('hex'),claim=path.join(claimDirectory,`claim-${process.pid}-${actor}.json`),startedAt=new Date().toISOString();
    onState('before-claim-publication',{claim});
    atomicClaim(claim,{schemaVersion:2,actor,kind,pid:process.pid,choosing:true,ticket:0,startedAt},onState);
    let ticket;
    try{
        ticket=1+Math.max(0,...claimEntries(claimDirectory).filter(item=>!item.choosing).map(item=>Number(item.ticket)||0));
        atomicClaim(claim,{schemaVersion:2,actor,kind,pid:process.pid,choosing:false,ticket,startedAt},onState);
        const deadline=Date.now()+choosingTimeoutMs;
        while(true){
            const choosing=claimEntries(claimDirectory).find(item=>item.actor!==actor&&item.choosing);
            if(!choosing)break;
            if(Date.now()>=deadline)throw Error(`Another STM lifecycle operation is active (${choosing.kind??'publishing'}, PID ${choosing.pid??'unknown'}).`);
            waitSync(5);
        }
        const lower=claimEntries(claimDirectory).filter(item=>item.actor!==actor&&!item.choosing).sort((a,b)=>(a.ticket-b.ticket)||a.actor.localeCompare(b.actor))[0];
        if(lower&&((lower.ticket<ticket)||(lower.ticket===ticket&&lower.actor<actor)))throw Error(`Another STM lifecycle operation is active (${lower.kind??'unknown'}, PID ${lower.pid??'unknown'}).`);
        // A legacy process may have appeared while this claim was being
        // published. A live or fresh-invalid old lock still wins.
        for(const legacy of [LEGACY_UNIFIED_LOCK,LEGACY_UPDATE_LOCK,LEGACY_LAUNCHER_LOCK]){
            const state=legacyOwner(path.join(target,legacy),{invalidGraceMs});
            if(state&&!state.stale)throw Error(`An older STM lifecycle operation is active (PID ${state.owner?.pid??'unknown'}).`);
        }
    }catch(error){removeOwnedClaim(claim,actor);throw error;}
    let released=false;
    const release=()=>{if(released)return false;released=true;return removeOwnedClaim(claim,actor);};
    release.claimPath=claim;release.actor=actor;release.ticket=ticket;
    onState('lifecycle-acquired',{claim,actor,ticket});
    return release;
}

function assertLauncherStopped(target) {
    const lock=path.join(target,LEGACY_LAUNCHER_LOCK);
    const owner=readJson(lock,false);
    if (!owner) return;
    if (processAlive(owner.pid)) throw Error(`STM is still running (launcher PID ${owner.pid}). Stop it with Ctrl+C before updating.`);
    throw Error(`STM launcher ownership is stale at ${lock}. Start and stop the launcher normally, or inspect and remove only this stale lock before updating.`);
}

function portFree(port) {
    return new Promise(resolve=>{
        const server=net.createServer();
        server.once('error',()=>resolve(false));
        server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));
    });
}

async function assertStopped(target,ports=[8123]) {
    assertLauncherStopped(target);
    for(const port of ports)if (!await portFree(port)) throw Error(`Port ${port} is busy. Stop STM before updating; a free port alone is not used as ownership proof.`);
}

function buildManagedStage(target,kit,stage) {
    const packageManifest=verifyPackage(kit);
    fs.mkdirSync(stage,{recursive:true});
    const copies=[
        ['frontend','public/st-mobile'],
        ['extension','public/scripts/extensions/third-party/st-mobile-experiment'],
        ['summaryception','public/scripts/extensions/third-party/Extension-Summaryception'],
        ['mock-model.mjs','mock-model.mjs'],
        ['start.cjs','start.cjs'],['log-supervisor.cjs','log-supervisor.cjs'],['diagnostics-server.cjs','diagnostics-server.cjs'],['diagnostics-viewer.cjs','diagnostics-viewer.cjs'],['update-core.cjs','update-core.cjs'],['compatibility.cjs','compatibility.cjs'],['package-staging.cjs','package-staging.cjs'],
    ];
    for (const [sourceName,targetName] of copies) fs.cpSync(path.join(kit,sourceName),path.join(stage,safeRelative(targetName)),{recursive:true});

    const engineFiles=['public/scripts/tokenizers.js','src/server-main.js','src/fetch-patch.js','public/script.js'];
    for (const name of engineFiles) {
        const source=path.join(target,'.stm-base',safeRelative(name));
        if (!fs.existsSync(source)) throw Error(`Installation is missing its retained ST 1.19.1 base file: ${name}`);
        const destination=path.join(stage,safeRelative(name));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);
    }
    patchEngine(stage,target,{cookieRoot:target});
    fs.copyFileSync(path.join(kit,'session-init.mjs'),path.join(stage,'public/scripts/stm-session-init.js'));

    const proxy=path.join(target,'.stm-proxy/index.cjs');
    if (fs.existsSync(proxy)) {
        fs.mkdirSync(path.join(stage,'.stm-proxy'),{recursive:true});
        fs.copyFileSync(path.join(kit,'proxy.cjs'),path.join(stage,'.stm-proxy/index.cjs'));
    }
    for (const [bundleName,installedName] of [['extension','st-mobile-experiment'],['summaryception','Extension-Summaryception']]) {
        const local=`data/default-user/extensions/${installedName}`;
        if (fs.existsSync(path.join(target,safeRelative(local)))) fs.cpSync(path.join(kit,bundleName),path.join(stage,safeRelative(local)),{recursive:true});
    }
    return {packageManifest,managedRoots:walkStageRoots(stage,target)};
}

function walkStageRoots(stage,target) {
    const roots=[...ROOT_MANAGED];
    if (fs.existsSync(path.join(stage,'.stm-proxy/index.cjs'))) roots.push('.stm-proxy/index.cjs');
    for (const name of ['st-mobile-experiment','Extension-Summaryception']) {
        const relative=`data/default-user/extensions/${name}`;
        if (fs.existsSync(path.join(stage,safeRelative(relative))) && fs.existsSync(path.join(target,safeRelative(relative)))) roots.push(relative);
    }
    return roots;
}

function manifestForStage(stage,metadata,managedRoots) {
    const files={};
    for (const root of managedRoots) {
        const absolute=path.join(stage,safeRelative(root));
        if (!fs.existsSync(absolute)) continue;
        const items=fs.statSync(absolute).isDirectory()?walkFiles(absolute):[absolute];
        for (const file of items) {
            const relative=path.relative(stage,file).split(path.sep).join('/');
            files[relative]={sha256:hashFile(file),bytes:fs.statSync(file).size};
        }
    }
    return {schemaVersion:UPDATE_SCHEMA,dataSchema:DATA_SCHEMA,...metadata,managedRoots,files};
}

function manifestForInstalled(target,managedRoots,marker) {
    const manifestPath=path.join(target,'public/scripts/extensions/third-party/st-mobile-experiment/manifest.json');let packageVersion='unknown';try{packageVersion=readJson(manifestPath).version??'unknown';}catch{}
    return manifestForStage(target,{sourceCommit:marker.update?.installedCommit??null,packageVersion,engineVersion:'1.19.1',bridgeProtocol:2,sourceUrl:marker.update?.sourceUrl??null,ref:marker.update?.ref??null},managedRoots);
}

function verifyInstalled(target,manifest) {
    for (const [relative,expected] of Object.entries(manifest.files)) {
        const file=path.join(target,safeRelative(relative));
        if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size!==expected.bytes || hashFile(file)!==expected.sha256) throw Error(`Installed file verification failed: ${relative}`);
    }
    for (const root of manifest.managedRoots) {
        const installed=path.join(target,safeRelative(root));
        if (!fs.existsSync(installed)) continue;
        const files=fs.statSync(installed).isDirectory()?walkFiles(installed):[installed];
        for (const file of files) {
            const relative=path.relative(target,file).split(path.sep).join('/');
            if (!manifest.files[relative]) throw Error(`Unmanifested managed file survived replacement: ${relative}`);
        }
    }
}

function checkpoint(name,options,journal) {
    if (options.onCheckpoint) options.onCheckpoint(name,journal);
    if (options.failAt===name || process.env.STM_UPDATE_FAIL_AT===name) throw Object.assign(Error(`Injected update failure at ${name}.`),{code:'INJECTED_FAILURE'});
}

function backupMetadata(target,backupDir,journal) {
    durableJson(path.join(backupDir,'backup-metadata.json'),{
        schemaVersion:UPDATE_SCHEMA,
        dataSchema:journal.oldManifest?.dataSchema ?? DATA_SCHEMA,
        createdAt:new Date().toISOString(),
        sourceCommit:journal.oldManifest?.sourceCommit ?? journal.oldMarker?.update?.installedCommit ?? null,
        packageVersion:journal.oldManifest?.packageVersion ?? journal.oldMarker?.update?.packageVersion ?? '0.9.1',
        managedRoots:journal.managedRoots,
        installedManifest:journal.oldManifest,
        marker:journal.oldMarker,
    });
}

function beginJournal(target,stage,manifest,kind='update') {
    const {marker}=readMarker(target);
    const transactionId=`${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    const backupDir=path.join(target,BACKUP_ROOT,transactionId);
    fs.mkdirSync(backupDir,{recursive:true});
    const journal={
        schemaVersion:UPDATE_SCHEMA,transactionId,kind,phase:'prepared',startedAt:new Date().toISOString(),
        stage,backupDir,managedRoots:manifest.managedRoots,operations:[],newManifest:manifest,
        oldManifest:readJson(path.join(target,INSTALLED_MANIFEST),false)??manifestForInstalled(target,manifest.managedRoots,marker),oldMarker:marker,
    };
    backupMetadata(target,backupDir,journal);
    durableJson(path.join(target,JOURNAL),journal);
    return journal;
}

function persistJournal(target,journal) {durableJson(path.join(target,JOURNAL),journal);}

function replaceManaged(target,journal,options={}) {
    journal.phase='replacing';persistJournal(target,journal);checkpoint('before-replace',options,journal);
    for (const root of journal.managedRoots) {
        const relative=safeRelative(root),installed=path.join(target,relative),staged=path.join(journal.stage,relative),backup=path.join(journal.backupDir,'code',relative);
        const operation={root,hadOld:fs.existsSync(installed),hasNew:fs.existsSync(staged),state:'planned',recovery:null};
        journal.operations.push(operation);persistJournal(target,journal);
        if (operation.hadOld) {operation.state='backup-intent';persistJournal(target,journal);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.renameSync(installed,backup);checkpoint(`after-backup-rename-before-journal:${root}`,options,journal);operation.state='backed-up';persistJournal(target,journal);}
        checkpoint(`after-backup:${root}`,options,journal);
        if (operation.hasNew) {operation.state='install-intent';persistJournal(target,journal);fs.mkdirSync(path.dirname(installed),{recursive:true});fs.renameSync(staged,installed);checkpoint(`after-install-rename-before-journal:${root}`,options,journal);operation.state='installed';persistJournal(target,journal);}
        checkpoint(`after-install:${root}`,options,journal);
    }
    verifyInstalled(target,journal.newManifest);
    journal.phase='verified';persistJournal(target,journal);checkpoint('after-verify',options,journal);
}

function restoreJournal(target,journal,options={}) {
    journal.phase='restoring';persistJournal(target,journal);
    for (const operation of [...journal.operations].reverse()) {
        const relative=safeRelative(operation.root),installed=path.join(target,relative),backup=path.join(journal.backupDir,'code',relative);
        operation.recovery='intent';persistJournal(target,journal);
        if(fs.existsSync(backup)){
            if(fs.existsSync(installed))fs.rmSync(installed,{recursive:true,force:true});
            checkpoint(`recovery-after-remove-before-restore:${operation.root}`,options,journal);
            fs.mkdirSync(path.dirname(installed),{recursive:true});fs.renameSync(backup,installed);
            checkpoint(`recovery-after-restore-before-journal:${operation.root}`,options,journal);
        }else if(!operation.hadOld&&fs.existsSync(installed))fs.rmSync(installed,{recursive:true,force:true});
        else if(operation.hadOld&&!fs.existsSync(installed))throw Error(`Recovery cannot find the prior managed path or its backup: ${operation.root}`);
        operation.recovery='done';persistJournal(target,journal);
    }
    if (journal.oldManifest) durableJson(path.join(target,INSTALLED_MANIFEST),journal.oldManifest); else fs.rmSync(path.join(target,INSTALLED_MANIFEST),{force:true});
    if (journal.oldMarker) durableJson(path.join(target,'.stm.json'),journal.oldMarker);
    journal.phase='restored';journal.restoredAt=new Date().toISOString();persistJournal(target,journal);
    fs.rmSync(journal.stage,{recursive:true,force:true});
    fs.rmSync(journal.backupDir,{recursive:true,force:true});
    fs.rmSync(path.join(target,JOURNAL),{force:true});
}

function recoverInterrupted(target,options={}) {
    const journal=readJson(path.join(target,JOURNAL),false);
    if (!journal) return null;
    if (journal.schemaVersion!==UPDATE_SCHEMA || !Array.isArray(journal.operations)) throw Error('Update recovery journal is not recognized. Leave the installation stopped and inspect it manually.');
    if (journal.phase==='committed') {fs.rmSync(path.join(target,JOURNAL),{force:true});return {action:'cleaned-committed',transactionId:journal.transactionId};}
    restoreJournal(target,journal,options);
    return {action:'restored',transactionId:journal.transactionId};
}

function pruneBackups(target,keep=2) {
    const root=path.join(target,BACKUP_ROOT);if(!fs.existsSync(root))return;
    const entries=fs.readdirSync(root,{withFileTypes:true}).filter(item=>item.isDirectory()&&fs.existsSync(path.join(root,item.name,'backup-metadata.json'))).map(item=>({name:item.name,time:fs.statSync(path.join(root,item.name,'backup-metadata.json')).mtimeMs})).sort((a,b)=>b.time-a.time);
    for(const entry of entries.slice(keep))fs.rmSync(path.join(root,entry.name),{recursive:true,force:true});
}

function commitTransaction(target,journal,markerUpdate,options={}) {
    durableJson(path.join(target,INSTALLED_MANIFEST),journal.newManifest);
    const marker={...journal.oldMarker,update:{...journal.oldMarker.update,...markerUpdate,installedAt:new Date().toISOString(),dataSchema:DATA_SCHEMA}};
    durableJson(path.join(target,'.stm.json'),marker);
    checkpoint('after-manifest',options,journal);
    journal.phase='committed';journal.committedAt=new Date().toISOString();persistJournal(target,journal);
    fs.rmSync(journal.stage,{recursive:true,force:true});
    fs.rmSync(path.join(target,JOURNAL),{force:true});
    pruneBackups(target,2);
    return marker;
}

function installPreparedKit(target,kit,metadata,options={}) {
    target=fs.realpathSync(target);readMarker(target);
    const updaterRoot=path.join(target,UPDATER_ROOT);fs.mkdirSync(updaterRoot,{recursive:true});
    const stage=fs.mkdtempSync(path.join(updaterRoot,'install-'));
    let journal;
    try {
        const {packageManifest,managedRoots}=buildManagedStage(target,kit,stage);
        const newManifest=manifestForStage(stage,{sourceCommit:metadata.sourceCommit,packageVersion:packageManifest.packageVersion,engineVersion:packageManifest.engineVersion,bridgeProtocol:packageManifest.bridgeProtocol,sourceUrl:metadata.sourceUrl,ref:metadata.ref},managedRoots);
        journal=beginJournal(target,stage,newManifest,'update');
        checkpoint('after-journal',options,journal);
        replaceManaged(target,journal,options);
        return {marker:commitTransaction(target,journal,{sourceUrl:metadata.sourceUrl,ref:metadata.ref,installedCommit:metadata.sourceCommit,packageVersion:packageManifest.packageVersion},options),manifest:newManifest,backup:journal.backupDir};
    } catch (error) {
        // Leave a durable journal for the next updater invocation once replacement began.
        if (!journal) fs.rmSync(stage,{recursive:true,force:true});
        throw error;
    }
}

function latestBackup(target) {
    const root=path.join(target,BACKUP_ROOT);if(!fs.existsSync(root))return null;
    return fs.readdirSync(root,{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>({dir:path.join(root,item.name),metadata:readJson(path.join(root,item.name,'backup-metadata.json'),false)})).filter(item=>item.metadata).sort((a,b)=>String(b.metadata.createdAt).localeCompare(String(a.metadata.createdAt)))[0]??null;
}

function rollback(target,options={}) {
    target=fs.realpathSync(target);const {marker}=readMarker(target);
    const selected=latestBackup(target);if(!selected)throw Error('No successful STM code backup is available to roll back. User data was not changed.');
    if (selected.metadata.dataSchema!==DATA_SCHEMA || marker.update?.dataSchema && marker.update.dataSchema!==selected.metadata.dataSchema) throw Error('Rollback crosses an unsupported data-schema boundary. Keep the installation stopped and restore from a full data backup with matching code.');
    const stage=fs.mkdtempSync(path.join(target,UPDATER_ROOT,'rollback-'));
    for(const root of selected.metadata.managedRoots){const source=path.join(selected.dir,'code',safeRelative(root));if(fs.existsSync(source))fs.cpSync(source,path.join(stage,safeRelative(root)),{recursive:true});}
    const manifest=selected.metadata.installedManifest;
    if(!manifest){fs.rmSync(stage,{recursive:true,force:true});throw Error('The selected backup predates matched installed manifests and cannot be rolled back automatically.');}
    const journal=beginJournal(target,stage,manifest,'rollback');
    try{replaceManaged(target,journal,options);const restoredMarker=selected.metadata.marker;durableJson(path.join(target,INSTALLED_MANIFEST),manifest);durableJson(path.join(target,'.stm.json'),restoredMarker);journal.phase='committed';persistJournal(target,journal);fs.rmSync(stage,{recursive:true,force:true});fs.rmSync(path.join(target,JOURNAL),{force:true});pruneBackups(target,2);return {marker:restoredMarker,manifest,backup:selected.dir};}
    catch(error){throw error;}
}

function validateRef(value) {
    if (typeof value!=='string'||!value||value.length>200||value.startsWith('-')||value.includes('..')||!/[0-9A-Za-z]/.test(value)||!/^[0-9A-Za-z._\/-]+$/.test(value)) throw Error('Invalid Git ref. Use a branch, tag or exact commit name without shell syntax.');
    return value;
}

function sanitizeRemoteUrl(value) {
    try {const url=new URL(value);if(url.protocol==='http:'||url.protocol==='https:'){url.username='';url.password='';return url.toString();}} catch {}
    return value;
}

function runGit(args,{cwd,allowFailure=false}={}) {
    const result=spawnSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    if(result.error)throw result.error;
    if(result.status!==0&&!allowFailure){const detail=(result.stderr||result.stdout||'Git failed').trim();let message=detail;if(/auth|credential|permission denied|could not read username|publickey/i.test(detail))message='Git authentication failed. Use your normal SSH agent or Git credential helper; STM does not collect credentials. '+detail;else if(/could not resolve|network|timed out|unable to access|connection/i.test(detail))message='Git network access failed. The installed version is unchanged. '+detail;throw Object.assign(Error(message),{gitStatus:result.status});}
    return result;
}

module.exports={UPDATE_SCHEMA,DATA_SCHEMA,LIFECYCLE_LOCK,UPDATE_LOCK,LAUNCHER_LOCK,LEGACY_UNIFIED_LOCK,JOURNAL,INSTALLED_MANIFEST,ROOT_MANAGED,durableJson,readJson,readMarker,processAlive,createExclusiveLock,acquireLifecycleLock,activeLifecycleClaims,assertLauncherStopped,assertStopped,portFree,buildManagedStage,manifestForStage,manifestForInstalled,verifyInstalled,recoverInterrupted,installPreparedKit,rollback,validateRef,sanitizeRemoteUrl,runGit,pruneBackups};
