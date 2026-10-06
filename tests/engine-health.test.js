import test from 'node:test';
import assert from 'node:assert/strict';
import {probeEngine} from '../prototype/frontend/engine-health.js';
test('direct health check requires a fresh valid server response rather than cached iframe state',async()=>{
    const result=await probeEngine(async(url,options)=>{
        assert.match(url,/^\/version\?pocketHealth=/);assert.equal(options.cache,'no-store');assert.ok(options.signal);
        return {ok:true,json:async()=>({pkgVersion:'1.19.0'})};
    });assert.equal(result.pkgVersion,'1.19.0');
    for(const request of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>({pkgVersion:'wrong'})})]){
        await assert.rejects(probeEngine(request),{code:'ENGINE_UNAVAILABLE'});
    }
});
test('a server that stops answering is bounded by a deadline',async()=>{
    await assert.rejects(probeEngine(async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))),5),{code:'ENGINE_UNAVAILABLE'});
});
