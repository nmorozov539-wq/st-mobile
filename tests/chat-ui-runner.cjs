// Owns only a prepared mock fixture. Run with port 8123 free and mock 8124 running.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),net=require('node:net');
const fixture=process.env.STM_TEST_ENGINE||'/tmp/stm-release-engine';
const output=process.env.STM_UI_OUTPUT||'/tmp/stm-chat-ui';
let server,exited;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){
 await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(Error('Port 8123 is occupied; this runner never kills an existing engine.')));probe.listen(8123,'127.0.0.1',()=>probe.close(resolve));});
 const log=fs.openSync(path.join(output,'engine-log.txt'),'a');
 server=spawn(process.execPath,['server.js','--port','8123','--listen','false','--browserLaunchEnabled','false'],{cwd:fixture,stdio:['ignore',log,log]});fs.closeSync(log);
 exited=new Promise(resolve=>server.once('exit',resolve));
 for(let i=0;i<600;i++){if(server.exitCode!==null)throw Error('Fixture engine failed to start; inspect engine-log.txt.');try{const r=await fetch('http://127.0.0.1:8123/csrf-token');if(r.ok)return;}catch{}await pause(100);}
 throw Error('Fixture startup timed out.');
}
async function stop(){if(!server||server.exitCode!==null)return;server.kill('SIGINT');await exited;}
(async()=>{
 const marker=JSON.parse(fs.readFileSync(path.join(fixture,'.stm.json')));
 if(marker.mode!=='combined'||!marker.mock||JSON.parse(fs.readFileSync(path.join(fixture,'package.json'))).version!=='1.19.1')throw Error('Only an isolated prepared ST 1.19.1 mock fixture is permitted.');
 fs.mkdirSync(output,{recursive:true});process.env.STM_TEST_RESTART='1';
 global.stmStopTestEngine=stop;global.stmStartTestEngine=start;
 process.on('exit',()=>{if(server?.exitCode===null)server.kill('SIGINT');});
 try{await start();await require('./chat-ui.cjs');}finally{await stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
