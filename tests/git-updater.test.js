import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {prepare}=require('../phone-package/prepare-test.cjs');
const {PACKAGE_ENTRIES,stagePackage}=require('../phone-package/package-staging.cjs');
const {JOURNAL,LAUNCHER_LOCK,LEGACY_UNIFIED_LOCK,INSTALLED_MANIFEST,sanitizeRemoteUrl,validateRef,installPreparedKit,recoverInterrupted,acquireLifecycleLock,activeLifecycleClaims}=require('../phone-package/update-core.cjs');
const {updateFromGit}=require('../phone-package/update-from-git.cjs');

function command(cwd,args,env={}){
    const result=spawnSync(args[0],args.slice(1),{cwd,encoding:'utf8',env:{...process.env,...env}});
    if(result.status!==0)throw Error(`${args.join(' ')} failed: ${result.stderr||result.stdout}`);
    return result.stdout.trim();
}

function copyPackageSource(destination){
    for(const entry of PACKAGE_ENTRIES){
        const source=path.resolve(entry.source),target=path.join(destination,entry.source);
        fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(source,target,{recursive:true});
    }
    fs.mkdirSync(path.join(destination,'scripts'),{recursive:true});fs.copyFileSync('scripts/mock-model.js',path.join(destination,'scripts/mock-model.js'));
}

function makeRemote(root){
    const work=path.join(root,'source'),remote=path.join(root,'remote.git');fs.mkdirSync(work);copyPackageSource(work);
    fs.writeFileSync(path.join(work,'prototype/frontend/obsolete-updater-fixture.txt'),'revision one\n');
    command(work,['git','init','-b','dev']);command(work,['git','add','.']);command(work,['git','commit','-m','revision one'],{GIT_AUTHOR_NAME:'STM Test',GIT_AUTHOR_EMAIL:'test@example.invalid',GIT_COMMITTER_NAME:'STM Test',GIT_COMMITTER_EMAIL:'test@example.invalid'});
    const first=command(work,['git','rev-parse','HEAD']);
    command(root,['git','clone','--bare',work,remote]);
    return {work,remote,first,advance(label='revision two'){
        fs.rmSync(path.join(work,'prototype/frontend/obsolete-updater-fixture.txt'),{force:true});
        fs.appendFileSync(path.join(work,'prototype/frontend/index.html'),`\n<!-- ${label} -->\n`);
        command(work,['git','add','.']);command(work,['git','commit','-m',label],{GIT_AUTHOR_NAME:'STM Test',GIT_AUTHOR_EMAIL:'test@example.invalid',GIT_COMMITTER_NAME:'STM Test',GIT_COMMITTER_EMAIL:'test@example.invalid'});
        command(work,['git','push',remote,'dev']);return command(work,['git','rev-parse','HEAD']);
    }};
}

function engineSource(root){
    const source=path.join(root,'engine');
    for(const dir of ['public/scripts','src','default/content','node_modules/@jsquash/png/codec'])fs.mkdirSync(path.join(source,dir),{recursive:true});
    fs.writeFileSync(path.join(source,'package.json'),JSON.stringify({version:'1.19.1'}));fs.writeFileSync(path.join(source,'server.js'),'// fixture');
    fs.writeFileSync(path.join(source,'public/scripts/tokenizers.js'),`import { characters, event_types, other } from "/script.js";\nconst data = await jQuery.ajax({\n                async: true,\n                type: 'POST', //\n                url: tokenizerEndpoint,\n                data: JSON.stringify([message]),\n                dataType: 'json',\n                contentType: 'application/json',\n            });`);
    fs.writeFileSync(path.join(source,'src/server-main.js'),`name: getCookieSessionName(),\napp.get('/csrf-token', (req, res) => {\n        res.json({\n            'token': csrfSyncProtection.generateToken(req),\n        });\n    });`);
    fs.writeFileSync(path.join(source,'public/script.js'),`async function firstLoadInit() {\nconst tokenResponse = await fetch('/csrf-token');\n        const tokenData = await tokenResponse.json();\n        token = tokenData.token;\n}`);
    fs.writeFileSync(path.join(source,'src/fetch-patch.js'),`const filePath = path.resolve(fileURLToPath(url));\n    const isUnderServerDirectory = isPathUnderParent(serverDirectory, filePath);\nif (!isUnderServerDirectory) throw new Error("Requested file path is outside of the server directory.");`);
    fs.writeFileSync(path.join(source,'node_modules/@jsquash/png/codec/test.wasm'),'WASM');fs.writeFileSync(path.join(source,'default/config.yaml'),'fixture: default');fs.writeFileSync(path.join(source,'default/content/settings.json'),'{}');return source;
}

function installation(root,sharedKit=null){
    const source=engineSource(root),kit=sharedKit??path.join(root,'initial-kit'),target=path.join(root,'installation');
    if(!sharedKit)stagePackage(path.resolve('.'),kit,{sourceCommit:'baseline'});prepare(source,target,kit,{combined:true,mock:true});
    fs.mkdirSync(path.join(target,'data/default-user/chats'),{recursive:true});fs.writeFileSync(path.join(target,'data/default-user/chats/keep.jsonl'),'PRIVATE CHAT');
    return {target,dataHash:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,'data/default-user/chats/keep.jsonl'))).digest('hex')};
}

function dataHash(target){return crypto.createHash('sha256').update(fs.readFileSync(path.join(target,'data/default-user/chats/keep.jsonl'))).digest('hex');}

test('Git updater installs exact revisions, removes stale managed files, no-ops and rolls back matched code',async()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-git-update-'));
    try{
        const remote=makeRemote(root),install=installation(root);
        const first=await updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]});
        assert.equal(first.kind,'updated');assert.equal(first.commit,remote.first);assert.equal(dataHash(install.target),install.dataHash);
        assert.equal(fs.readFileSync(path.join(install.target,'public/st-mobile/obsolete-updater-fixture.txt'),'utf8'),'revision one\n');
        const noop=await updateFromGit({target:install.target,source:null,ref:null,ports:[]});assert.equal(noop.kind,'noop');
        const secondCommit=remote.advance();
        const second=await updateFromGit({target:install.target,source:null,ref:null,ports:[]});assert.equal(second.commit,secondCommit);
        assert.equal(fs.existsSync(path.join(install.target,'public/st-mobile/obsolete-updater-fixture.txt')),false);
        assert.equal(dataHash(install.target),install.dataHash);
        const rolled=await updateFromGit({target:install.target,rollback:true,ref:null,source:null,ports:[]});
        assert.equal(rolled.kind,'rollback');assert.equal(rolled.marker.update.installedCommit,remote.first);
        assert.equal(fs.readFileSync(path.join(install.target,'public/st-mobile/obsolete-updater-fixture.txt'),'utf8'),'revision one\n');
        assert.equal(dataHash(install.target),install.dataHash);
        assert.equal(fs.readdirSync(path.join(install.target,'.stm-backups')).filter(name=>fs.existsSync(path.join(install.target,'.stm-backups',name,'backup-metadata.json'))).length<=2,true);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('interrupted replacement is restored before the next Git update and never changes user data',async()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-git-recover-'));
    try{
        const remote=makeRemote(root),install=installation(root);
        await assert.rejects(updateFromGit({target:install.target,source:remote.remote,ref:'dev',failAt:'after-install:public/st-mobile',ports:[]}),/Injected update failure/);
        assert.equal(fs.existsSync(path.join(install.target,JOURNAL)),true);assert.equal(dataHash(install.target),install.dataHash);
        const recovered=await updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]});
        assert.equal(recovered.recovery.action,'restored');assert.equal(recovered.commit,remote.first);assert.equal(fs.existsSync(path.join(install.target,JOURNAL)),false);assert.equal(dataHash(install.target),install.dataHash);
        assert.equal(JSON.parse(fs.readFileSync(path.join(install.target,INSTALLED_MANIFEST))).sourceCommit,remote.first);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('the first Git update can roll back to a compatible pre-manifest baseline code set',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-first-rollback-'));try{const remote=makeRemote(root),install=installation(root),baseline=fs.readFileSync(path.join(install.target,'public/st-mobile/index.html'),'utf8');await updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]});const result=await updateFromGit({target:install.target,rollback:true,ref:null,source:null,ports:[]});assert.equal(result.kind,'rollback');assert.equal(fs.readFileSync(path.join(install.target,'public/st-mobile/index.html'),'utf8'),baseline);assert.equal(JSON.parse(fs.readFileSync(path.join(install.target,'.stm.json'))).update,undefined);assert.equal(dataHash(install.target),install.dataHash);}finally{fs.rmSync(root,{recursive:true,force:true});}});

test('updater validates refs, strips URL credentials, refuses live ownership and leaves a dirty source checkout untouched',async()=>{
    assert.equal(sanitizeRemoteUrl('https://person:secret@example.com/repo.git'),'https://example.com/repo.git');
    assert.throws(()=>validateRef('--upload-pack=bad'),/Invalid Git ref/);assert.throws(()=>validateRef('../dev'),/Invalid Git ref/);
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-git-guards-'));
    try{
        const remote=makeRemote(root),install=installation(root),dirty=path.join(remote.work,'personal-note.txt');fs.writeFileSync(dirty,'do not discard');
        const release=acquireLifecycleLock(install.target,'STM launcher');
        await assert.rejects(updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]}),/lifecycle operation is active/);
        release();
        await updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]});
        assert.equal(fs.readFileSync(dirty,'utf8'),'do not discard');
        const before=JSON.parse(fs.readFileSync(path.join(install.target,'.stm.json'))).update.installedCommit;
        await assert.rejects(updateFromGit({target:install.target,source:path.join(root,'missing-remote.git'),ref:'dev',ports:[]}),/Git failed|does not appear|network access failed/i);
        assert.equal(JSON.parse(fs.readFileSync(path.join(install.target,'.stm.json'))).update.installedCommit,before);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('every journaled install checkpoint restores the prior matched code and user data after interruption',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-checkpoints-')),kit=path.join(root,'kit');
    try{
        stagePackage(path.resolve('.'),kit,{sourceCommit:'checkpoint-new'});
        const discoveryRoot=path.join(root,'discovery');fs.mkdirSync(discoveryRoot);const discovery=installation(discoveryRoot,kit),checkpoints=[];
        installPreparedKit(discovery.target,kit,{sourceCommit:'checkpoint-new',sourceUrl:'local',ref:'dev'},{onCheckpoint:name=>checkpoints.push(name)});
        assert.ok(checkpoints.includes('after-journal')&&checkpoints.includes('after-manifest')&&checkpoints.some(name=>name.startsWith('after-backup:'))&&checkpoints.some(name=>name.startsWith('after-install:')));
        for(const [index,checkpoint] of [...new Set(checkpoints)].entries()){
            const caseRoot=path.join(root,`case-${index}`);fs.mkdirSync(caseRoot);try{const current=installation(caseRoot,kit),managed=path.join(current.target,'public/st-mobile/index.html'),sentinel=`\n<!-- old ${checkpoint} -->\n`;fs.appendFileSync(managed,sentinel);const before=fs.readFileSync(managed,'utf8');
            assert.throws(()=>installPreparedKit(current.target,kit,{sourceCommit:'checkpoint-new',sourceUrl:'local',ref:'dev'},{failAt:checkpoint}),/Injected update failure/);
            assert.equal(fs.existsSync(path.join(current.target,JOURNAL)),true);const recovery=recoverInterrupted(current.target);assert.equal(recovery.action,'restored');assert.equal(fs.readFileSync(managed,'utf8'),before);assert.equal(dataHash(current.target),current.dataHash);}finally{fs.rmSync(caseRoot,{recursive:true,force:true});}
        }
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('recovery is idempotent when interrupted between filesystem reconciliation and journal persistence',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-recovery-checkpoints-')),kit=path.join(root,'kit');
    try{
        stagePackage(path.resolve('.'),kit,{sourceCommit:'recovery-new'});const install=installation(root,kit),managed=path.join(install.target,'public/st-mobile/index.html');fs.appendFileSync(managed,'\n<!-- recovery-old -->\n');const before=fs.readFileSync(managed,'utf8');
        assert.throws(()=>installPreparedKit(install.target,kit,{sourceCommit:'recovery-new',sourceUrl:'local',ref:'dev'},{failAt:'after-install-rename-before-journal:public/st-mobile'}),/Injected update failure/);
        assert.throws(()=>recoverInterrupted(install.target,{failAt:'recovery-after-remove-before-restore:public/st-mobile'}),/Injected update failure/);assert.equal(fs.existsSync(path.join(install.target,JOURNAL)),true);
        assert.equal(recoverInterrupted(install.target).action,'restored');assert.equal(fs.readFileSync(managed,'utf8'),before);assert.equal(dataHash(install.target),install.dataHash);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('stale lifecycle ownership is reclaimed and an interrupted updater recovers automatically',async()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-stale-lifecycle-'));
    try{
        const remote=makeRemote(root),install=installation(root);await assert.rejects(updateFromGit({target:install.target,source:remote.remote,ref:'dev',failAt:'after-install-rename-before-journal:public/st-mobile',ports:[]}),/Injected update failure/);
        fs.writeFileSync(path.join(install.target,LEGACY_UNIFIED_LOCK),JSON.stringify({kind:'STM update',pid:2147483647}));
        const result=await updateFromGit({target:install.target,source:remote.remote,ref:'dev',ports:[]});assert.equal(result.recovery.action,'restored');assert.equal(result.commit,remote.first);assert.equal(dataHash(install.target),install.dataHash);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('launcher and updater contend on one atomic installation lifecycle lock',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-lifecycle-race-'));try{const release=acquireLifecycleLock(root,'STM launcher');assert.throws(()=>acquireLifecycleLock(root,'STM update'),/lifecycle operation is active/);release();const updateRelease=acquireLifecycleLock(root,'STM update');assert.throws(()=>acquireLifecycleLock(root,'STM launcher'),/lifecycle operation is active/);updateRelease();}finally{fs.rmSync(root,{recursive:true,force:true});}});

const waitForFile=async(file,timeout=5000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(fs.existsSync(file))return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error(`Timed out waiting for ${file}`);};
const waitForExit=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
const worker=(root,{id,pauseStage='none',mode='normal',hold=true}={})=>{
    const directory=path.join(root,'barriers');fs.mkdirSync(directory,{recursive:true});
    const paths={signal:path.join(directory,`${id}.signal`),resume:path.join(directory,`${id}.resume`),hold:path.join(directory,`${id}.hold`),result:path.join(directory,`${id}.result`)};
    if(!hold)fs.writeFileSync(paths.hold,'go');
    const child=spawn(process.execPath,[path.resolve('tests/fixtures/lifecycle-lock-worker.cjs'),root,`STM ${id}`,paths.signal,paths.resume,paths.hold,paths.result,pauseStage,mode],{stdio:['ignore','pipe','pipe']});
    return {child,paths,exit:waitForExit(child)};
};

test('multiprocess stale observation cannot steal or unlink a replacement lifecycle owner',async()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-lifecycle-stale-race-'));
    try{
        fs.writeFileSync(path.join(root,LEGACY_UNIFIED_LOCK),JSON.stringify({kind:'old lifecycle owner',pid:2147483647}));
        const a=worker(root,{id:'A',pauseStage:'legacy-stale-observed'}),b=worker(root,{id:'B',pauseStage:'legacy-stale-observed',hold:false});
        await Promise.all([waitForFile(a.paths.signal),waitForFile(b.paths.signal)]);
        fs.writeFileSync(a.paths.resume,'go');await waitForFile(`${a.paths.result}.acquired`);
        const aOwner=JSON.parse(fs.readFileSync(`${a.paths.result}.acquired`));
        fs.writeFileSync(b.paths.resume,'go');await waitForFile(b.paths.result);
        const bResult=JSON.parse(fs.readFileSync(b.paths.result));assert.equal(bResult.status,'failed');assert.match(bResult.message,/lifecycle operation is active/);
        const live=activeLifecycleClaims(root);assert.equal(live.length,1);assert.equal(live[0].pid,aOwner.pid);assert.equal(fs.existsSync(aOwner.claimPath),true);
        fs.writeFileSync(a.paths.hold,'go');await waitForFile(a.paths.result);assert.deepEqual(JSON.parse(fs.readFileSync(a.paths.result)),{status:'released',removed:true});
        await Promise.all([a.exit,b.exit]);assert.equal(activeLifecycleClaims(root).length,0);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('partial publication, dead owners and ownership-bound release recover without deleting replacements',async()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-lifecycle-publication-'));
    try{
        const partial=worker(root,{id:'partial',pauseStage:'claim-publication-open',mode:'partial',hold:false});await waitForFile(partial.paths.signal);
        const publication=JSON.parse(fs.readFileSync(partial.paths.signal));assert.equal(fs.readFileSync(publication.temporary,'utf8'),'{"pid":');
        partial.child.kill('SIGKILL');await partial.exit;
        const recovered=acquireLifecycleLock(root,'STM recovered');assert.equal(fs.existsSync(publication.temporary),false);assert.equal(activeLifecycleClaims(root).length,1);recovered();assert.equal(activeLifecycleClaims(root).length,0);

        const dead=worker(root,{id:'dead'});await waitForFile(`${dead.paths.result}.acquired`);dead.child.kill('SIGKILL');await dead.exit;
        const afterDeath=acquireLifecycleLock(root,'STM after death');assert.equal(activeLifecycleClaims(root).length,1);afterDeath();assert.equal(activeLifecycleClaims(root).length,0);

        const release=acquireLifecycleLock(root,'STM release owner');
        fs.writeFileSync(release.claimPath,JSON.stringify({schemaVersion:2,actor:'replacement',kind:'replacement',pid:process.pid,choosing:false,ticket:release.ticket}));
        assert.equal(release(),false);assert.equal(fs.existsSync(release.claimPath),true);fs.unlinkSync(release.claimPath);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});
