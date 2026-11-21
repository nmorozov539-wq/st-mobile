// Local fixtures only: no credentials or external provider calls.
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {createProxy}=require('../phone-package/proxy.cjs');
async function transport(){
 const requests=[];
 const server=createProxy(async(url,options)=>{
  requests.push({url,options});
  if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'fixture'}]}),{headers:{'Content-Type':'application/json'}});
  if(url.endsWith('/fail'))throw new Error('private upstream detail');
  if(url.endsWith('/wait'))return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: first\n\n'));options.signal.addEventListener('abort',()=>controller.close());}}),{headers:{'Content-Type':'text/event-stream'}});
  return new Response('data: first\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const models=await fetch(base+'/api/v1/models',{headers:{Authorization:'Bearer fixture-not-a-key'}});
  assert.equal((await models.json()).data[0].id,'fixture');
  assert.equal(requests[0].url,'https://openrouter.ai/api/v1/models');
  assert.equal(requests[0].options.impersonate,'chrome');assert.equal(requests[0].options.headers.authorization,'Bearer fixture-not-a-key');
  assert.equal(requests[0].options.headers.host,undefined);
  const response=await fetch(base+'/api/v1/chat/completions',{method:'POST',body:JSON.stringify({model:'fixture',stream:true})});
  assert.match(await response.text(),/data: first.*data: \[DONE\]/s);
  assert.equal(JSON.parse(requests[1].options.body.toString()).model,'fixture');
  const failure=await fetch(base+'/api/v1/fail');assert.equal(failure.status,502);assert.doesNotMatch(await failure.text(),/private upstream detail/);
  const stopped=await fetch(base+'/api/v1/wait');const reader=stopped.body.getReader();await reader.read();await reader.cancel();
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(requests.at(-1).options.signal.aborted,true);
  assert.equal((await fetch(base+'/other')).status,404);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 console.log('Proxy routing, credential forwarding, SSE, failure handling and cancellation passed.');
}
async function launcher(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-proxy-launch-'));
 let child;
 try{
  fs.writeFileSync(path.join(root,'.stm.json'),JSON.stringify({version:1,mode:'combined',mock:false}));
  fs.mkdirSync(path.join(root,'.stm-proxy'));
  fs.writeFileSync(path.join(root,'.stm-proxy/index.cjs'),"require('node:http').createServer((_q,r)=>r.end('proxy fixture')).listen(8001,'127.0.0.1',()=>console.log('OpenRouter TLS-proxy listening on http://127.0.0.1:8001'))");
  fs.writeFileSync(path.join(root,'server.js'),"require('node:http').createServer((_q,r)=>r.end('ST fixture')).listen(8123,'127.0.0.1',()=>console.log('ST fixture ready'))");
  child=spawn(process.execPath,[path.resolve('phone-package/start.cjs'),root,'--proxy'],{stdio:['ignore','pipe','pipe']});
  let output='';
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('launcher did not become ready')),10000);
   child.stdout.on('data',data=>{output+=data;if(output.includes('ST fixture ready')){clearTimeout(timer);resolve();}});
   child.once('exit',()=>{clearTimeout(timer);reject(Error('launcher exited: '+output));});
  });
  assert.equal(await (await fetch('http://127.0.0.1:8001')).text(),'proxy fixture');
  assert.equal(await (await fetch('http://127.0.0.1:8123')).text(),'ST fixture');
  const exited=once(child,'exit');child.kill('SIGINT');await exited;
  for(const port of [8001,8123])await assert.rejects(fetch(`http://127.0.0.1:${port}`));
  const occupied=require('node:http').createServer((_q,r)=>r.end('existing proxy'));
  occupied.listen(8001,'127.0.0.1');await once(occupied,'listening');
  try{
   child=spawn(process.execPath,[path.resolve('phone-package/start.cjs'),root,'--proxy'],{stdio:['ignore','pipe','pipe']});
   let error='';child.stderr.on('data',data=>{error+=data;});
   const [code]=await once(child,'exit');assert.notEqual(code,0);assert.match(error,/Port 8001 is busy/);
   assert.equal(await (await fetch('http://127.0.0.1:8001')).text(),'existing proxy');
   await assert.rejects(fetch('http://127.0.0.1:8123'));
  }finally{occupied.closeAllConnections();await new Promise(resolve=>occupied.close(resolve));}
 }finally{if(child&&child.exitCode===null&&!child.signalCode)child.kill('SIGTERM');fs.rmSync(root,{recursive:true,force:true});}
 console.log('Single launcher starts both services, Ctrl+C releases both ports, and a busy proxy port prevents startup without disturbing its owner.');
}
(async()=>{await transport();await launcher();})().catch(error=>{console.error(error);process.exitCode=1;});
