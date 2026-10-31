#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const readline=require('node:readline');
function readLaunch(target, mock=false, proxy=false){
    target=fs.realpathSync(target);
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.pocket-tavern.json')));
    if(marker.version!==1||marker.mode!=='combined')throw Error('Not a recognized combined Pocket Tavern folder.');
    if(mock!==marker.mock)throw Error(marker.mock?'This fixture requires --mock. Prepare a normal combined folder for OpenRouter.':`This is your normal install, so --mock is refused to keep test data out of it. Use a separate --mock install: unzip the Pocket Tavern ZIP, and in its folder run once: node prepare.cjs ${marker.source??'~/SillyTavern'} ~/pocket-tavern-mock --mock — then start it with: node ~/pocket-tavern-mock/start.cjs --mock`);
    if(proxy&&mock)throw Error('The real OpenRouter proxy cannot run in a mock fixture.');
    if(proxy&&!fs.existsSync(path.join(target,'.pocket-proxy/index.cjs')))throw Error('The optional proxy is not installed. Run setup-proxy.cjs with your working or-proxy folder first.');
    // The data path is deliberately fixed inside this installation.
    return {target,proxy,ports:[8123,...(mock?[8124]:[]),...(proxy?[8001]:[])],commands:[...(proxy?[['.pocket-proxy/index.cjs']]:[]),...(mock?[['mock-model.mjs']]:[]),['server.js','--port','8123','--listen','false','--browserLaunchEnabled','false','--dataRoot',path.join(target,'data')]]};
}
const portFree=port=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is busy. Stop the previous Pocket Tavern session.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
async function launch(target,mock,proxy){
    const plan=readLaunch(target,mock,proxy);
    for(const port of plan.ports)await portFree(port);
    const manifest=path.join(plan.target,'public/scripts/extensions/third-party/st-mobile-experiment/manifest.json');
    if(fs.existsSync(manifest))console.log(`Installed Pocket Tavern version: ${JSON.parse(fs.readFileSync(manifest)).version} · folder: ${plan.target}`);
    console.log('Starting Pocket Tavern. Open http://127.0.0.1:8123/st-mobile/ after ST finishes starting.');
    console.log('One ST server owns this installation’s data. Ctrl+C stops the session.');
    if(proxy)console.log('Optional OpenRouter proxy enabled. Choose Custom and base URL http://127.0.0.1:8001/api/v1 in Settings.');
    const children=[];let stopping=false,timer;
    const stop=()=>{if(stopping)return;stopping=true;for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');timer=setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill('SIGKILL');},4000);timer.unref();};
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
    for(const args of plan.commands){
        const child=spawn(process.execPath,args,{cwd:plan.target,stdio:['inherit','pipe','inherit']});children.push(child);
        let ready;
        const waiting=args[0]==='.pocket-proxy/index.cjs'?new Promise((resolve,reject)=>{
            const deadline=setTimeout(()=>reject(Error('The optional proxy did not start within 15 seconds.')),15000);
            ready=()=>{clearTimeout(deadline);resolve();};
            child.once('exit',()=>{clearTimeout(deadline);reject(Error('The optional proxy stopped before it was ready.'));});
            child.once('error',error=>{clearTimeout(deadline);reject(error);});
        }):null;
        readline.createInterface({input:child.stdout}).on('line',line=>{console.log(line.replace('http://127.0.0.1:8123/ to open SillyTavern','http://127.0.0.1:8123/st-mobile/ to open Pocket Tavern'));if(line==='OpenRouter TLS-proxy listening on http://127.0.0.1:8001')ready?.();});
        child.on('error',error=>{console.error(error.message);process.exitCode=1;stop();});
        child.on('exit',code=>{if(!stopping){console.error('The engine stopped. See the error above.');process.exitCode=code||1;stop();}if(children.every(item=>item.exitCode!==null))clearTimeout(timer);});
        if(waiting){try{await waiting;}catch(error){stop();throw error;}}
        if(stopping)break;
    }
}
module.exports={readLaunch};
if(require.main===module){const argumentsList=process.argv.slice(2);const mock=argumentsList.includes('--mock'),proxy=argumentsList.includes('--proxy');const target=argumentsList.find(argument=>!['--mock','--proxy'].includes(argument))||__dirname;launch(target,mock,proxy).catch(error=>{console.error(error.message);process.exitCode=1;});}
