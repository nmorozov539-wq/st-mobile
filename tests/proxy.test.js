import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {setupProxy}=require('../phone-package/setup-proxy.cjs');
const {readLaunch}=require('../phone-package/start.cjs');
test('optional proxy setup copies dependencies only, preserves data and refuses mock/repeated installation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-proxy-test-'));
 try{
  const source=path.join(root,'source'),target=path.join(root,'target');
  fs.mkdirSync(path.join(source,'node_modules/wreq-js'),{recursive:true});fs.mkdirSync(target);
  fs.writeFileSync(path.join(source,'node_modules/wreq-js/package.json'),JSON.stringify({main:'index.cjs'}));
  fs.writeFileSync(path.join(source,'node_modules/wreq-js/index.cjs'),'module.exports={fetch(){}}');
  fs.writeFileSync(path.join(source,'private.json'),'DO NOT COPY');
  fs.writeFileSync(path.join(target,'.pocket-tavern.json'),JSON.stringify({version:1,mode:'combined',mock:false}));
  fs.mkdirSync(path.join(target,'data'));fs.writeFileSync(path.join(target,'data/keep'),'KEEP');
  assert.throws(()=>readLaunch(target,false,true),/not installed/);
  const destination=setupProxy(source,target);
  assert.equal(fs.existsSync(path.join(destination,'private.json')),false);
  assert.equal(fs.readFileSync(path.join(target,'data/keep'),'utf8'),'KEEP');
  assert.equal(fs.lstatSync(path.join(destination,'node_modules')).isSymbolicLink(),false);
  assert.deepEqual(readLaunch(target,false,true).ports,[8123,8001]);
  assert.deepEqual(readLaunch(target,false,true).commands[0],{source:'proxy',args:['.pocket-proxy/index.cjs']});
  assert.equal(readLaunch(target).commands.length,1);
  assert.throws(()=>setupProxy(source,target),/already installed/);
  fs.writeFileSync(path.join(target,'.pocket-tavern.json'),JSON.stringify({version:1,mode:'combined',mock:true}));
  assert.throws(()=>readLaunch(target,true,true),/cannot run in a mock/);
  assert.throws(()=>setupProxy(source,target),/normal combined/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
