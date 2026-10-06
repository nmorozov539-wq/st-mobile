#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const readline=require('node:readline');
function readLaunch(target, mock=false){
    target=fs.realpathSync(target);
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.pocket-tavern.json')));
    if(marker.version!==1||marker.mode!=='combined')throw Error('Not a recognized combined Pocket Tavern folder.');
    if(mock!==marker.mock)throw Error(marker.mock?'This fixture requires --mock. Prepare a normal combined folder for OpenRouter.':'This folder uses real-provider settings. Use a separate --mock fixture for mock testing.');
    // The data path is deliberately fixed inside this installation.
    return {target,ports:mock?[8123,8124]:[8123],commands:[...(mock?[['mock-model.mjs']]:[]),['server.js','--port','8123','--listen','false','--browserLaunchEnabled','false','--dataRoot',path.join(target,'data')]]};
}
const portFree=port=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is busy. Stop the previous Pocket Tavern session.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
async function launch(target,mock){
    const plan=readLaunch(target,mock);
    for(const port of plan.ports)await portFree(port);
    console.log('Starting Pocket Tavern. Open http://127.0.0.1:8123/st-mobile/ after ST finishes starting.');
    console.log('One ST server owns this installation’s data. Ctrl+C stops the session.');
    const children=[];let stopping=false,timer;
    const stop=()=>{if(stopping)return;stopping=true;for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');timer=setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill('SIGKILL');},4000);timer.unref();};
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
    for(const args of plan.commands){
        const child=spawn(process.execPath,args,{cwd:plan.target,stdio:['inherit','pipe','inherit']});children.push(child);
        readline.createInterface({input:child.stdout}).on('line',line=>console.log(line.replace('http://127.0.0.1:8123/ to open SillyTavern','http://127.0.0.1:8123/st-mobile/ to open Pocket Tavern')));
        child.on('error',error=>{console.error(error.message);process.exitCode=1;stop();});
        child.on('exit',code=>{if(!stopping){console.error('The engine stopped. See the error above.');process.exitCode=code||1;stop();}if(children.every(item=>item.exitCode!==null))clearTimeout(timer);});
    }
}
module.exports={readLaunch};
if(require.main===module){const argumentsList=process.argv.slice(2);const mock=argumentsList.includes('--mock');const target=argumentsList.find(argument=>argument!=='--mock')||__dirname;launch(target,mock).catch(error=>{console.error(error.message);process.exitCode=1;});}
