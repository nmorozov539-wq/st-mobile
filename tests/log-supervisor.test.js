import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {PassThrough} from 'node:stream';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {LogSupervisor}=require('../phone-package/log-supervisor.cjs');

test('log supervisor captures both streams, split Unicode, huge lines, redaction, rotation and restart history',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-logs-'));try{
  const logger=new LogSupervisor(root,{maxFileBytes:700,maxLineBytes:64,ringLimit:100});const stdout=new PassThrough(),stderr=new PassThrough(),terminal={value:'',write(value){this.value+=value;}};
  logger.attach(stdout,{source:'engine',severity:'info',terminal});logger.attach(stderr,{source:'engine',severity:'error',terminal});
  const emoji=Buffer.from('ready 😀\n');stdout.write(emoji.subarray(0,8));stdout.write(emoji.subarray(8));stderr.write('Authorization: Bearer abc123\nAuthorization: Basic dXNlcjpwYXNz\n{"api_key":"json-secret","password":"quoted-secret"}\n');stdout.end('x'.repeat(10*1024*1024));stderr.end();
  for(let index=0;index<80;index++)logger.record('proxy','info',`line ${index} ${'z'.repeat(30)}`);await logger.flush();
  const records=logger.read({cursor:0,limit:100}).records;assert.ok(records.some(row=>row.text==='ready 😀'));assert.ok(records.some(row=>row.severity==='error'&&row.text.includes('[redacted]')));assert.doesNotMatch(JSON.stringify(records),/abc123|dXNlcjpwYXNz|json-secret|quoted-secret/);assert.ok(records.some(row=>/line truncated/.test(row.text)));assert.ok(fs.existsSync(path.join(root,'.pocket-logs/runtime.ndjson.1')));assert.equal(fs.statSync(path.join(root,'.pocket-logs')).mode&0o777,0o700);await logger.close();
  const restarted=new LogSupervisor(root,{maxFileBytes:700,ringLimit:100});assert.ok(restarted.read({cursor:0,limit:100}).records.length>0);await restarted.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('cursor reads report truncation without exposing arbitrary files',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-ring-'));try{const logger=new LogSupervisor(root,{ringLimit:3});for(let index=0;index<6;index++)logger.record('engine','info',`row ${index}`);const page=logger.read({cursor:1,limit:10});assert.equal(page.truncated,true);assert.deepEqual(page.records.map(row=>row.text),['row 3','row 4','row 5']);await logger.close();}finally{fs.rmSync(root,{recursive:true,force:true});}});
