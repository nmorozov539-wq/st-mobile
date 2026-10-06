import test from 'node:test';
import assert from 'node:assert/strict';
import { connectThroughST } from '../prototype/extension/connection-check.js';
const origin='http://localhost';
test('connection observes the native request without replaying or exposing provider details',async()=>{
    for(const [response,expected] of [[new Response(JSON.stringify({data:[]}),{status:200}),null],[new Response('private provider body',{status:401}),/HTTP 401/],[new Response(JSON.stringify({error:'secret must not be shown'})),/returned an error/]]){
        let calls=0;
        const original=async()=>{calls++;return response;},host={fetch:original};
        const promise=connectThroughST({host,origin,click:()=>{void host.fetch('/api/backends/chat-completions/status');},read:()=>({onlineStatus:'Valid'}),delay:()=>new Promise(resolve=>setImmediate(resolve))});
        if(expected)await assert.rejects(promise,expected);else assert.equal((await promise).onlineStatus,'Valid');
        assert.equal(calls,1);assert.equal(host.fetch,original);
    }
});
test('connection distinguishes a missing native request from a hung provider',async()=>{
    const original=()=>new Promise(()=>{}),host={fetch:original};
    await assert.rejects(connectThroughST({host,origin,click(){},read(){},delay:async()=>{}}),/did not start/);
    assert.equal(host.fetch,original);
    await assert.rejects(connectThroughST({host,origin,click:()=>{void host.fetch('/api/backends/chat-completions/status');},read(){},timeout:200,delay:async()=>{}}),/timed out/);
    assert.equal(host.fetch,original);
});
