#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {stagePackage}=require('./package-staging.cjs');
const {acquireLifecycleLock,readMarker,assertStopped,recoverInterrupted,installPreparedKit,rollback,validateRef,sanitizeRemoteUrl,runGit}=require('./update-core.cjs');

function parseArguments(values) {
    const result={ref:null,target:null,source:null,rollback:false};
    for(let index=0;index<values.length;index++){
        const value=values[index];
        if(value==='--rollback')result.rollback=true;
        else if(['--target','--ref','--source'].includes(value)){const next=values[++index];if(!next||next.startsWith('--'))throw Error(`${value} needs a value.`);result[value.slice(2)]=next;}
        else throw Error(`Unknown argument: ${value}`);
    }
    if(!result.target)throw Error('Usage: node phone-package/update-from-git.cjs --target <installation> [--ref <branch/tag/commit>] [--source <remote>] [--rollback]');
    if(result.rollback&&(result.ref||result.source))throw Error('--rollback cannot be combined with --ref or --source.');
    return result;
}

function repositoryOrigin(repository=path.resolve(__dirname,'..')) {
    const result=runGit(['remote','get-url','origin'],{cwd:repository,allowFailure:true});
    if(result.status!==0)throw Error('This checkout has no origin remote. Supply --source <SSH/HTTPS/local remote> once.');
    return result.stdout.trim();
}

function prepareCheckout(target,source,ref) {
    const root=path.join(target,'.pocket-updater'),gitDir=path.join(root,'source.git'),checkout=path.join(root,`checkout-${crypto.randomBytes(5).toString('hex')}`);
    fs.mkdirSync(root,{recursive:true});
    if(!fs.existsSync(gitDir))runGit(['init','--bare',gitDir]);
    runGit([`--git-dir=${gitDir}`,'fetch','--force','--tags',source,ref],{cwd:root});
    const commit=runGit([`--git-dir=${gitDir}`,'rev-parse','--verify','FETCH_HEAD^{commit}'],{cwd:root}).stdout.trim();
    if(!/^[0-9a-f]{40,64}$/i.test(commit))throw Error('Git did not resolve the selected ref to an exact commit.');
    runGit([`--git-dir=${gitDir}`,'worktree','add','--detach',checkout,commit],{cwd:root});
    return {root,gitDir,checkout,commit,cleanup(){runGit([`--git-dir=${gitDir}`,'worktree','remove','--force',checkout],{cwd:root,allowFailure:true});fs.rmSync(checkout,{recursive:true,force:true});}};
}

async function updateFromGit(options) {
    const target=fs.realpathSync(options.target);readMarker(target);
    const releaseLock=acquireLifecycleLock(target,'Pocket update');
    try {
        await assertStopped(target,options.ports);
        const recovery=recoverInterrupted(target,options.recoveryOptions);
        const {marker}=readMarker(target);
        if(options.rollback)return {kind:'rollback',recovery,...rollback(target,options)};
        const ref=validateRef(options.ref||marker.update?.ref||'dev');
        const rawSource=options.source||marker.update?.sourceUrl||repositoryOrigin();
        const source=sanitizeRemoteUrl(rawSource);
        if(!source)throw Error('A Git source is required.');
        const checkout=prepareCheckout(target,source,ref);
        try {
            if(marker.update?.installedCommit===checkout.commit)return {kind:'noop',recovery,target,commit:checkout.commit,ref,sourceUrl:source};
            const kit=path.join(checkout.root,`kit-${checkout.commit.slice(0,12)}-${crypto.randomBytes(4).toString('hex')}`);
            try {
                stagePackage(checkout.checkout,kit,{sourceCommit:checkout.commit});
                const result=installPreparedKit(target,kit,{sourceCommit:checkout.commit,sourceUrl:source,ref},options);
                return {kind:'updated',recovery,target,commit:checkout.commit,ref,sourceUrl:source,...result};
            } finally {fs.rmSync(kit,{recursive:true,force:true});}
        } finally {checkout.cleanup();}
    } finally {releaseLock();}
}

module.exports={parseArguments,repositoryOrigin,prepareCheckout,updateFromGit};

if(require.main===module){
    (async()=>{
        const options=parseArguments(process.argv.slice(2));
        const result=await updateFromGit(options);
        if(result.recovery?.action==='restored')console.log(`Recovered interrupted update ${result.recovery.transactionId} before continuing.`);
        if(result.kind==='noop')console.log(`Pocket Tavern is already at ${result.commit}. No files changed.`);
        else if(result.kind==='rollback')console.log(`Rolled back Pocket code to ${result.marker.update?.installedCommit??'the previous matched build'}. User data was not changed.`);
        else console.log(`Installed Pocket Tavern ${result.marker.update.packageVersion} from ${result.commit}.`);
        console.log(`Target: ${result.target??path.resolve(options.target)}`);
        console.log(`Next: cd ${JSON.stringify(path.resolve(options.target))} && node start.cjs`);
    })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
