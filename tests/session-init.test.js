import test from 'node:test';
import assert from 'node:assert/strict';
import {initializePocketSession} from '../phone-package/session-init.mjs';
test('startup reads an uncached token and validates it before returning it to ST',async()=>{
    const calls=[];
    const token=await initializePocketSession(async(url,options)=>{
        calls.push({url,options});assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');
        return url==='/csrf-token'?{ok:true,json:async()=>({token:'fresh'})}:{ok:true};
    });
    assert.equal(token,'fresh');assert.deepEqual(calls.map(x=>x.url),['/csrf-token','/api/ping']);
    assert.equal(calls[1].options.headers['X-CSRF-Token'],'fresh');
});
test('a startup cookie race rereads the current token without retrying a settings write',async()=>{
    const calls=[];let tokens=0;
    const token=await initializePocketSession(async(url,options)=>{
        calls.push(url);
        if(url==='/csrf-token')return {ok:true,json:async()=>({token:++tokens===1?'stale':'current'})};
        assert.equal(url,'/api/ping');return options.headers['X-CSRF-Token']==='current'?{ok:true}:{ok:false,status:403};
    });
    assert.equal(token,'current');assert.deepEqual(calls,['/csrf-token','/api/ping','/csrf-token','/api/ping']);
});
test('persistent token rejection stops startup after a bounded number of checks',async()=>{
    let checks=0;
    await assert.rejects(initializePocketSession(async url=>url==='/csrf-token'?{ok:true,json:async()=>({token:'rejected'})}:(checks++,{ok:false,status:403})),/keeps changing/);
    assert.equal(checks,3);
});
test('startup refuses missing tokens and other server failures rather than saving with an invalid session',async()=>{
    await assert.rejects(initializePocketSession(async()=>({ok:true,json:async()=>({token:null})})),/invalid session token/);
    await assert.rejects(initializePocketSession(async url=>url==='/csrf-token'?{ok:true,json:async()=>({token:'valid'})}:{ok:false,status:500}),/HTTP 500/);
    await assert.rejects(initializePocketSession(async()=>{throw Error('offline');}),/offline/);
});
test('startup session checks abort if the server never answers',async()=>{
    await assert.rejects(initializePocketSession(async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')))),{timeoutMs:5}),/timeout/);
});
