import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineMonitor} from '../prototype/frontend/engine-monitor.js';
test('stale health failure cannot disconnect the new iframe after Reconnect',async()=>{
 let rejectProbe,disconnects=0,checks=0;const connection={port:{},async request(){return {busy:false};}};
 const monitor=createEngineMonitor({connection,isReady:()=>true,probe:()=>++checks===1?new Promise((_,reject)=>rejectProbe=reject):Promise.resolve(),onActivity(){},onDisconnect(){disconnects++;}});
 const old=monitor.check();connection.port={};monitor.reset();await monitor.check();rejectProbe(Error('old page closed'));await old;assert.equal(disconnects,0);assert.equal(checks,2);
});
test('unreachable engine is reported even when the native interface would claim busy',async()=>{
 let message;const monitor=createEngineMonitor({connection:{port:{},request(){throw Error('must not reach bridge');}},isReady:()=>true,probe:async()=>{throw Error('engine stopped');},onActivity(){},onDisconnect:m=>message=m});await monitor.check();assert.equal(message,'engine stopped');
});
