#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
function setupProxy(source,target,bundle=__dirname){
    source=fs.realpathSync(source);target=fs.realpathSync(target);
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.stm.json')));
    if(marker.version!==1||marker.mode!=='combined'||marker.mock)throw Error('Proxy setup requires a normal combined STM installation.');
    const destination=path.join(target,'.stm-proxy');
    if(fs.existsSync(destination))throw Error('The bundled proxy is already installed. Start with node start.cjs --proxy.');
    const dependencies=path.join(source,'node_modules');
    if(!fs.existsSync(path.join(dependencies,'wreq-js/package.json')))throw Error('Choose the working or-proxy folder with installed wreq-js dependencies.');
    const check=spawnSync(process.execPath,['-e',"require('wreq-js')"],{cwd:source,encoding:'utf8'});
    if(check.status!==0)throw Error('Proxy dependencies cannot load in this runtime. Set up from the working proxy folder on the same Android phone; PC and Android native modules are not interchangeable.');
    const stage=fs.mkdtempSync(path.join(target,'.proxy-setup-'));
    try{
        fs.cpSync(dependencies,path.join(stage,'node_modules'),{recursive:true,dereference:true});
        fs.copyFileSync(path.join(bundle,'proxy.cjs'),path.join(stage,'index.cjs'));
        fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'stm-openrouter-proxy',private:true,type:'commonjs'}));
        fs.renameSync(stage,destination);
    }finally{fs.rmSync(stage,{recursive:true,force:true});}
    return destination;
}
module.exports={setupProxy};
if(require.main===module){
    try{console.log('Installed optional proxy:',setupProxy(process.argv[2]||path.join(os.homedir(),'or-proxy'),process.argv[3]||path.join(os.homedir(),'stm')));console.log('Next: from STM run node start.cjs --proxy. Stop your old proxy first; both use port 8001.');}
    catch(error){console.error(error.message);process.exitCode=1;}
}
