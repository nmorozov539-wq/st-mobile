import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {LogSupervisor}=require('../phone-package/log-supervisor.cjs');
const {createDiagnosticsServer,js}=require('../phone-package/diagnostics-server.cjs');

async function authenticate(endpoint,capability){const response=await fetch(endpoint.origin+'/session',{method:'POST',headers:{Origin:endpoint.origin,'Content-Type':'application/json'},body:JSON.stringify({token:capability})});assert.equal(response.status,204);return response.headers.get('set-cookie').split(';')[0];}
const hostileHost=(port)=>new Promise((resolve,reject)=>{const request=http.request({host:'127.0.0.1',port,path:'/api/status',headers:{Host:'evil.invalid'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});request.on('error',reject);request.end();});

test('diagnostics service requires fragment exchange, strict origin/host and a private cookie for logs and export',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-diag-'));let now=1000;const logger=new LogSupervisor(root);logger.record('engine','error','<script>alert(1)</script>');logger.record('engine','error','Authorization: Bearer abc123 {"api_key":"json-secret"}');logger.setStatus({engineState:'stopped',exitCode:7});const service=createDiagnosticsServer({logger,port:0,clock:()=>now,sessionLifetimeMs:5000,exportLifetimeMs:500});
 try{const endpoint=await service.start();assert.match(endpoint.privateUrl,/#token=/);assert.match(js,/history\.replaceState/);
  assert.equal((await fetch(endpoint.origin+'/api/status')).status,401);
  assert.equal((await fetch(endpoint.origin+'/session',{method:'POST',headers:{Origin:'http://evil.invalid','Content-Type':'application/json'},body:JSON.stringify({token:service.capability})})).status,403);
  assert.equal(await hostileHost(endpoint.port),421);
  const cookie=await authenticate(endpoint,service.capability),headers={Cookie:cookie};
  const logs=await(await fetch(endpoint.origin+'/api/logs?cursor=0',{headers})).json();assert.equal(logs.records[0].text,'<script>alert(1)</script>');
  assert.equal((await fetch(endpoint.origin+'/api/logs?path=/etc/passwd',{headers})).status,200);
  assert.equal((await fetch(endpoint.origin+'/api/status',{headers:{...headers,Origin:'http://evil.invalid'}})).status,403);
  assert.equal((await fetch(endpoint.origin+'/api/export',{method:'POST',headers:{...headers,Origin:'http://evil.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
  const preview=await(await fetch(endpoint.origin+'/api/export-preview',{method:'POST',headers:{...headers,Origin:endpoint.origin,'Content-Type':'application/json'},body:'{}'})).json();assert.match(preview.bundle.reminder,/conversation text/);assert.equal(preview.bundle.status.exitCode,7);assert.doesNotMatch(JSON.stringify(preview.bundle),/abc123|json-secret/);logger.record('engine','info','after preview');const exportRequest=()=>fetch(endpoint.origin+'/api/export',{method:'POST',headers:{...headers,Origin:endpoint.origin,'Content-Type':'application/json'},body:JSON.stringify({snapshotId:preview.snapshotId})});const downloaded=await(await exportRequest()).json();assert.deepEqual(downloaded,preview.bundle);assert.deepEqual(await(await exportRequest()).json(),preview.bundle);assert.equal((await fetch(endpoint.origin+'/api/export',{method:'POST',headers:{...headers,Origin:endpoint.origin,'Content-Type':'application/json'},body:'{}'})).status,409);
  now=1600;assert.equal((await exportRequest()).status,409);now=7000;assert.equal((await fetch(endpoint.origin+'/api/status',{headers})).status,401);
 }finally{await service.stop();await logger.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('viewer polls crash status, resets changed sessions and bounds browser rows and selections',()=>{assert.match(js,/await status\(\)/);assert.match(js,/data\.sessionId!==logSession/);assert.match(js,/MAX_ROWS=1000/);assert.match(js,/selected\.delete/);assert.match(js,/latestCursor<cursor/);});
