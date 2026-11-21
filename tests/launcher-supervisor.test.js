import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {launch,assertNoUpdate}=require('../phone-package/start.cjs');
const {JOURNAL,activeLifecycleClaims}=require('../phone-package/update-core.cjs');

function target(root,server="process.stderr.write('fatal fixture\\n');process.exit(7)") {fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'.stm.json'),JSON.stringify({version:1,mode:'combined',mock:false,dataRoot:'data',update:{installedCommit:'fixture'}}));fs.writeFileSync(path.join(root,'server.js'),server);fs.mkdirSync(path.join(root,'data'));const manifest=path.join(root,'public/scripts/extensions/third-party/st-mobile-experiment');fs.mkdirSync(manifest,{recursive:true});fs.writeFileSync(path.join(manifest,'manifest.json'),JSON.stringify({version:'0.9.2'}));return root;}

test('engine crash leaves the independent viewer alive and normal shutdown removes ownership',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-launcher-'));const install=target(root);const handle=await launch(install,false,false,{diagnosticsPort:0,portChecks:[]});try{await delay(150);assert.equal(handle.children[0].exitCode,7);const page=await fetch(handle.endpoint.origin+'/');assert.equal(page.status,200);assert.match(await page.text(),/STM engine log/);assert.equal(handle.logger.getStatus().engineState,'stopped');assert.equal(handle.logger.getStatus().exitCode,7);}finally{await handle.stop();}assert.equal(activeLifecycleClaims(root).length,0);fs.rmSync(root,{recursive:true,force:true});});

test('diagnostics-only reads retained logs without starting an engine and startup refuses unresolved updates',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-diag-only-'));const install=target(root);let handle=await launch(install,false,false,{diagnosticsOnly:true,diagnosticsPort:0,portChecks:[]});try{assert.equal(handle.children.length,0);assert.equal((await fetch(handle.endpoint.origin+'/')).status,200);}finally{await handle.stop();}fs.writeFileSync(path.join(root,JOURNAL),'{}');assert.throws(()=>assertNoUpdate(root),/needs recovery/);fs.rmSync(root,{recursive:true,force:true});});

test('Ctrl+C-equivalent shutdown terminates the owned engine child and diagnostics server',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-launch-stop-'));const install=target(root,"setInterval(()=>process.stdout.write('alive\\n'),25)");const handle=await launch(install,false,false,{diagnosticsPort:0,portChecks:[]});const pid=handle.children[0].pid;await delay(60);await handle.stop();assert.ok(handle.children[0].exitCode!==null||handle.children[0].signalCode!==null);assert.throws(()=>process.kill(pid,0));await assert.rejects(fetch(handle.endpoint.origin+'/'));fs.rmSync(root,{recursive:true,force:true});});
