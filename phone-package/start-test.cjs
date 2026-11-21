#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn} = require('node:child_process');
const readline=require('node:readline');
const target = path.resolve(process.argv[2] || path.join(os.homedir(),'stm-phone-test'));
const probe = port => new Promise((resolve,reject)=>{
    const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is already in use. Stop the other test session before starting this one.`)));
    server.listen(port,'127.0.0.1',()=>server.close(resolve));
});
(async()=>{
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.stm-test.json')));
    if(marker.version!==1) throw Error('Unsupported test folder.');
    await probe(8123);await probe(8124);
    console.log('Starting STM. Wait for ST to finish loading.');
    console.log('Open in your PHONE browser: http://127.0.0.1:8123/st-mobile/');
    console.log('Ctrl+C stops both test servers. Your regular ST has separate data.');
    const children=[];let stopping=false;let timer;
    const stop=()=>{
        if(stopping)return;stopping=true;
        for(const child of children) if(child.exitCode===null)child.kill('SIGTERM');
        timer=setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill('SIGKILL');},4000);timer.unref();
    };
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
    const start=(args)=>{
        const child=spawn(process.execPath,args,{cwd:target,stdio:['inherit','pipe','inherit']});children.push(child);
        readline.createInterface({input:child.stdout}).on('line',line=>console.log(line.replace('http://127.0.0.1:8123/ to open SillyTavern','http://127.0.0.1:8123/st-mobile/ to open STM')));
        child.on('error',error=>{console.error(error.message);process.exitCode=1;stop();});
        child.on('exit',code=>{if(!stopping){console.error('A test server stopped. Check the output above.');process.exitCode=code||1;stop();}if(children.every(c=>c.exitCode!==null))clearTimeout(timer);});
    };
    start(['mock-model.mjs']);
    start(['server.js','--port','8123','--listen','false','--browserLaunchEnabled','false','--dataRoot',path.join(target,'data')]);
})().catch(error=>{console.error(error.message);console.error('Run prepare-test.cjs first, or supply the existing test folder as an argument.');process.exitCode=1;});
