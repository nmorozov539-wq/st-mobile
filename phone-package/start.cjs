#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {LogSupervisor}=require('./log-supervisor.cjs');
const {createDiagnosticsServer}=require('./diagnostics-server.cjs');
const {LAUNCHER_LOCK,JOURNAL,acquireLifecycleLock}=require('./update-core.cjs');

function readLaunch(target,mock=false,proxy=false,{diagnosticsOnly=false}={}){
    target=fs.realpathSync(target);
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.pocket-tavern.json')));
    if(marker.version!==1||marker.mode!=='combined')throw Error('Not a recognized combined Pocket Tavern folder.');
    if(!diagnosticsOnly&&mock!==marker.mock)throw Error(marker.mock?'This fixture requires --mock. Prepare a normal combined folder for OpenRouter.':`This is your normal install, so --mock is refused to keep test data out of it. Use a separate --mock install: unzip the Pocket Tavern ZIP, and in its folder run once: node prepare.cjs ${marker.source??'~/SillyTavern'} ~/pocket-tavern-mock --mock — then start it with: node ~/pocket-tavern-mock/start.cjs --mock`);
    if(proxy&&mock)throw Error('The real OpenRouter proxy cannot run in a mock fixture.');
    if(proxy&&!fs.existsSync(path.join(target,'.pocket-proxy/index.cjs')))throw Error('The optional proxy is not installed. Run setup-proxy.cjs with your working or-proxy folder first.');
    return {target,marker,proxy,ports:diagnosticsOnly?[]:[8123,...(mock?[8124]:[]),...(proxy?[8001]:[])],commands:diagnosticsOnly?[]:[...(proxy?[{source:'proxy',args:['.pocket-proxy/index.cjs']}]:[]),...(mock?[{source:'mock',args:['mock-model.mjs']}]:[]),{source:'engine',args:['server.js','--port','8123','--listen','false','--browserLaunchEnabled','false','--dataRoot',path.join(target,'data')]}]};
}
const portFree=port=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is busy. Stop the previous Pocket Tavern session.`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
function acquireLauncher(target){return acquireLifecycleLock(target,'Pocket launcher');}
function assertNoUpdate(target){if(fs.existsSync(path.join(target,JOURNAL)))throw Error('An interrupted Pocket update needs recovery. Keep the engine stopped and rerun update-from-git.cjs for this installation.');}

async function launch(target,mock=false,proxy=false,{diagnosticsOnly=false,diagnosticsPort=8125,loggerOptions={},serverFactory=createDiagnosticsServer,portChecks=null}={}){
    const plan=readLaunch(target,mock,proxy,{diagnosticsOnly});assertNoUpdate(plan.target);const releaseLauncher=acquireLauncher(plan.target);
    let logger,diagnostics;const children=[];let stopping=false,stopPromise;
    const stopped=child=>child.exitCode!==null||child.signalCode!==null;
    const waitForChildren=timeout=>Promise.race([Promise.all(children.map(child=>stopped(child)?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve);}))),new Promise(resolve=>setTimeout(resolve,timeout))]);
    const stop=()=>stopPromise??=(async()=>{stopping=true;for(const child of children)if(!stopped(child))child.kill('SIGTERM');await waitForChildren(4000);for(const child of children)if(!stopped(child))child.kill('SIGKILL');await waitForChildren(1000);if(diagnostics)await diagnostics.stop().catch(()=>{});if(logger){logger.setStatus({...logger.getStatus(),engineState:'stopped',intentional:true});await logger.close();}releaseLauncher();})();
    const onSignal=()=>{stop().finally(()=>{process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);});};
    process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
    try{
        for(const port of portChecks??plan.ports)await portFree(port);
        logger=new LogSupervisor(plan.target,loggerOptions);
        const manifest=path.join(plan.target,'public/scripts/extensions/third-party/st-mobile-experiment/manifest.json'),packageVersion=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest)).version:'unknown';
        logger.setStatus({engineState:diagnosticsOnly?'not started':'starting',intentional:false,exitCode:null,packageVersion,installedCommit:plan.marker.update?.installedCommit??null,engineVersion:'1.19.0',runtime:process.version,target:plan.target});
        diagnostics=serverFactory({logger,status:()=>logger.getStatus(),port:diagnosticsPort,host:'127.0.0.1'});let endpoint;
        try{endpoint=await diagnostics.start();}catch(error){throw Error(`Diagnostics could not bind to 127.0.0.1:${diagnosticsPort}: ${error.message}. Choose another explicit port with --diagnostics-port <port>.`);}
        console.log(`Private engine log: ${endpoint.privateUrl}`);
        console.log('The fragment is a local viewing capability. Do not paste it into chats or support messages.');
        if(diagnosticsOnly){console.log('Diagnostics-only mode: the SillyTavern engine was not started. Ctrl+C closes this viewer.');return{plan,logger,diagnostics,children,stop,endpoint};}
        console.log(`Installed Pocket Tavern version: ${packageVersion} · folder: ${plan.target}`);
        console.log('Starting Pocket Tavern. Open http://127.0.0.1:8123/st-mobile/ after ST finishes starting.');
        console.log('One ST server owns this installation’s data. Ctrl+C stops the session.');
        if(proxy)console.log('Optional OpenRouter proxy enabled. Choose Custom and base URL http://127.0.0.1:8001/api/v1 in Settings.');
        for(const command of plan.commands){
            let readyResolve,readyReject,deadline;const waiting=command.source==='proxy'?new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;deadline=setTimeout(()=>reject(Error('The optional proxy did not start within 15 seconds.')),15000);}):null;
            const child=spawn(process.execPath,command.args,{cwd:plan.target,stdio:['inherit','pipe','pipe']});child.pocketSource=command.source;children.push(child);
            const transform=line=>line.replace('http://127.0.0.1:8123/ to open SillyTavern','http://127.0.0.1:8123/st-mobile/ to open Pocket Tavern');
            logger.attach(child.stdout,{source:command.source,severity:'info',transform,onLine:line=>{if(line==='OpenRouter TLS-proxy listening on http://127.0.0.1:8001'){clearTimeout(deadline);readyResolve?.();}}});
            logger.attach(child.stderr,{source:command.source,severity:'error'});
            child.once('error',error=>{logger.record('launcher','error',`${command.source} failed to start: ${error.message}`);if(waiting){clearTimeout(deadline);readyReject?.(error);}if(command.source==='engine')logger.setStatus({...logger.getStatus(),engineState:'stopped',exitCode:1,reason:error.message});});
            child.once('exit',(code,signal)=>{if(waiting){clearTimeout(deadline);readyReject?.(Error('The optional proxy stopped before it was ready.'));}logger.record('launcher',stopping?'info':'error',`${command.source} exited with ${signal?`signal ${signal}`:`code ${code}`}.`);if(command.source==='engine')logger.setStatus({...logger.getStatus(),engineState:'stopped',exitCode:code,signal,intentional:stopping});});
            if(command.source==='engine')logger.setStatus({...logger.getStatus(),engineState:'running',enginePid:child.pid});
            if(waiting)await waiting;
        }
        return{plan,logger,diagnostics,children,stop,endpoint};
    }catch(error){await stop();process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);throw error;}
}
function parseArguments(values){let mock=false,proxy=false,diagnosticsOnly=false,diagnosticsPort=8125,target=null;for(let index=0;index<values.length;index++){const value=values[index];if(value==='--mock')mock=true;else if(value==='--proxy')proxy=true;else if(value==='--diagnostics-only')diagnosticsOnly=true;else if(value==='--diagnostics-port'){diagnosticsPort=Number(values[++index]);if(!Number.isInteger(diagnosticsPort)||diagnosticsPort<1||diagnosticsPort>65535)throw Error('--diagnostics-port needs a port from 1 to 65535.');}else if(value.startsWith('--'))throw Error(`Unknown option: ${value}`);else if(target)throw Error('Only one installation folder may be supplied.');else target=value;}return{target:target||__dirname,mock,proxy,diagnosticsOnly,diagnosticsPort};}
module.exports={readLaunch,launch,parseArguments,portFree,assertNoUpdate};
if(require.main===module){let options;try{options=parseArguments(process.argv.slice(2));launch(options.target,options.mock,options.proxy,options).catch(error=>{console.error(error.message);process.exitCode=1;});}catch(error){console.error(error.message);process.exitCode=1;}}
