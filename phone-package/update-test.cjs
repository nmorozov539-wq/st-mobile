#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const {patchEngine}=require('./compatibility.cjs');
function update(target,bundle=__dirname){
    target=fs.realpathSync(target);
    const combined=fs.existsSync(path.join(target,'.stm.json'));
    const marker=JSON.parse(fs.readFileSync(path.join(target,combined?'.stm.json':'.stm-test.json')));
    if(marker.version!==1||!marker.source)throw Error('This is not a recognized STM test folder.');
    const source=combined?target:fs.realpathSync(marker.source);
    const base=combined?path.join(target,'.stm-base'):source;
    if(!combined && (source===target||target.startsWith(source+path.sep)))throw Error('Refusing to update the regular ST installation.');
    for(const folder of [source,target])if(JSON.parse(fs.readFileSync(path.join(folder,'package.json'))).version!=='1.19.1')throw Error('Both engines must report ST 1.19.1.');
    for(const name of ['frontend/index.html','extension/index.js','mock-model.mjs'])if(!fs.existsSync(path.join(bundle,name)))throw Error('Incomplete phone kit. Extract the new ZIP completely.');
    const stage=fs.mkdtempSync(path.join(target,'.stm-update-'));
    const code=['public/scripts/tokenizers.js','src/server-main.js','src/fetch-patch.js','public/script.js'];
    try{
        for(const name of code){fs.mkdirSync(path.dirname(path.join(stage,name)),{recursive:true});fs.copyFileSync(path.join(base,name),path.join(stage,name));}
        // Validate every source fragment before touching installed test assets.
        patchEngine(stage,source,{cookieRoot:target});
        const backup=path.join(target,'.stm-backups',path.basename(stage));fs.mkdirSync(backup,{recursive:true});
        const proxyInstalled=combined&&fs.existsSync(path.join(target,'.stm-proxy/index.cjs'));
        const localOverlays=[['summaryception','Extension-Summaryception'],['extension','st-mobile-experiment']].filter(([bundleName,name])=>fs.existsSync(path.join(bundle,bundleName))&&fs.existsSync(path.join(target,'data/default-user/extensions',name)));
        const updates=[...localOverlays.map(([,name])=>'data/default-user/extensions/'+name),...code,'public/scripts/stm-session-init.js','public/st-mobile','public/scripts/extensions/third-party/st-mobile-experiment','public/scripts/extensions/third-party/Extension-Summaryception','mock-model.mjs', ...(combined?['start.cjs']:[]),...(proxyInstalled?['.stm-proxy/index.cjs']:[])];
        for(const name of updates){const old=path.join(target,name);if(fs.existsSync(old)){const dest=path.join(backup,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(old,dest,{recursive:true});}}
        for(const name of [...code,'public/scripts/stm-session-init.js'])fs.copyFileSync(path.join(stage,name),path.join(target,name));
        if(fs.existsSync(path.join(stage,'.stm-wasm')))fs.cpSync(path.join(stage,'.stm-wasm'),path.join(target,'.stm-wasm'),{recursive:true});
        fs.cpSync(path.join(bundle,'frontend'),path.join(target,'public/st-mobile'),{recursive:true});
        fs.cpSync(path.join(bundle,'extension'),path.join(target,'public/scripts/extensions/third-party/st-mobile-experiment'),{recursive:true});
        if(fs.existsSync(path.join(bundle,'summaryception')))fs.cpSync(path.join(bundle,'summaryception'),path.join(target,'public/scripts/extensions/third-party/Extension-Summaryception'),{recursive:true});
        for(const [bundleName,name] of localOverlays)fs.cpSync(path.join(bundle,bundleName),path.join(target,'data/default-user/extensions',name),{recursive:true});
        fs.copyFileSync(path.join(bundle,'mock-model.mjs'),path.join(target,'mock-model.mjs'));
        if(localOverlays.length)console.log('Updated recognized user-local extension code; previous code is in the backup. Chat/settings files were retained.');
        if(combined)fs.copyFileSync(path.join(bundle,'start.cjs'),path.join(target,'start.cjs'));
        if(proxyInstalled)fs.copyFileSync(path.join(bundle,'proxy.cjs'),path.join(target,'.stm-proxy/index.cjs'));
        const manifest=path.join(target,'public/scripts/extensions/third-party/st-mobile-experiment/manifest.json');
        const release=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest)).version:'unknown';
        console.log(`Installed STM ${release} into ${target}`);
        return {target,backup,release,mode:combined?'combined':'test',mock:!!marker.mock};
    } finally {fs.rmSync(stage,{recursive:true,force:true});}
}
module.exports={update};
const portFree=port=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error('Stop the test servers with Ctrl+C before updating.')));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
if(require.main===module)(async()=>{
    await portFree(8123);await portFree(8124);
    const result=update(process.argv[2]||path.join(os.homedir(),'stm-phone-test'));
    console.log('Updated test frontend and compatibility fixes. Existing chats, settings and data were preserved.');
    console.log('Previous code backup:',result.backup);
    console.log(result.mode==='combined'?`Next: cd ${JSON.stringify(result.target)} and run node start.cjs${result.mock?' --mock':''} — then reload the PHONE browser.`:'Next: node start-test.cjs — then reload the PHONE browser.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
