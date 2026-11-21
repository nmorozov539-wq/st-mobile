import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridgeDispatcher,handshakeContract,PROTOCOL_VERSION} from '../prototype/extension/bridge-contract.js';
import {createNativeSettingsHost} from '../prototype/extension/native-settings-host.js';
import {createNativeHostLock,nativeHostOwnsEngine} from '../prototype/extension/native-host-lock.js';

test('protocol v2 handshake is explicit and unavailable capabilities stay false',()=>{
 const value=handshakeContract({bridgeBuild:'0.9.2',sessionId:'s',adapter:{runtimeVersion:'1.19.1'}});
 assert.equal(value.protocolVersion,PROTOCOL_VERSION);assert.deepEqual(value.capabilities.nativeSettingsHost,{connection:false,presets:false});
});
test('bridge rejects malformed and unknown operations promptly',async()=>{
 const dispatch=createBridgeDispatcher({echo:value=>value});
 assert.equal((await dispatch({id:1,method:'missing'})).error.code,'UNSUPPORTED_OPERATION');
 assert.equal((await dispatch({id:'x',method:'echo'})).error.code,'INVALID_ARGUMENT');
 assert.deepEqual(await dispatch({id:2,method:'echo',argument:{ok:true}}),{id:2,result:{ok:true}});
});
function element(id){let style='display:none',classes=new Set(['closedDrawer']);return {id,className:'closedDrawer',classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},style:{setProperty(){}},getAttribute:key=>key==='style'?style:null,setAttribute:(key,value)=>{if(key==='style')style=value;},removeAttribute(){},focus(){this.focused=true;},getClientRects:()=>[]};}
test('native host owns one original surface, excludes mutations, restores styles and rejects stale close',async()=>{
 const connection=element('rm_api_block'),classes=new Set(),events=[];let busy=false;
 const required=element('main_api');const document={documentElement:{classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}},querySelector:selector=>selector==='#rm_api_block'?connection:['#main_api','#chat_completion_source'].includes(selector)?required:null};
 const host=createNativeSettingsHost({document,isBusy:()=>busy,projection:async()=>({revision:'r2'}),emit:event=>events.push(event)});
 assert.deepEqual(host.capabilities(),{connection:false,presets:false});
 busy=true;await assert.rejects(host.run({action:'open',surface:'connection'}),{code:'BUSY'});busy=false;
 const opened=await host.run({action:'open',surface:'connection'});assert.equal(opened.state,'open');assert.equal(connection.focused,true);assert.ok(classes.has('stm-native-settings-open'));
 busy=true;await assert.rejects(host.run({action:'close',surfaceId:opened.surfaceId}),{code:'SAVE_IN_FLIGHT'});busy=false;
 await assert.rejects(host.run({action:'close',surfaceId:'stale'}),{code:'STALE_SURFACE'});
 const closed=await host.run({action:'close',surfaceId:opened.surfaceId});assert.equal(closed.state,'closed');assert.equal(closed.configuration.revision,'r2');assert.equal(connection.getAttribute('style'),'display:none');assert.deepEqual(events.map(event=>event.state),['open','saving','closed']);
});
test('native close waits for verified save, rejects a second close and reconnect teardown joins it',async()=>{
 const connection=element('rm_api_block'),required=element('main_api');let finish;const settled=new Promise(resolve=>finish=resolve);
 const document={documentElement:{classList:{add(){},remove(){}}},querySelector:selector=>selector==='#rm_api_block'?connection:['#main_api','#chat_completion_source'].includes(selector)?required:null};
 const host=createNativeSettingsHost({document,isBusy:()=>false,projection:async()=>({revision:'saved'}),settle:()=>settled});
 const opened=await host.run({action:'open',surface:'connection'}),closing=host.run({action:'close',surfaceId:opened.surfaceId});
 assert.equal(host.state().state,'saving');assert.equal(nativeHostOwnsEngine(host),true);const mutation=async()=>{if(nativeHostOwnsEngine(host))throw Object.assign(Error('busy'),{code:'BUSY'});};await assert.rejects(mutation(),{code:'BUSY'});await assert.rejects(host.run({action:'close',surfaceId:opened.surfaceId}),{code:'SAVE_IN_FLIGHT'});
 const teardown=host.disconnect();finish({verified:true});const [closed,reconnected]=await Promise.all([closing,teardown]);assert.equal(closed.saved.verified,true);assert.equal(reconnected.state,'closed');assert.equal(nativeHostOwnsEngine(host),false);await mutation();
});
test('native opening rejects adapter, workspace and pending-recovery conflicts',async()=>{
 const connection=element('rm_api_block'),required=element('main_api');let workspace=false,adapter=false;
 const document={documentElement:{classList:{add(){},remove(){}}},querySelector:selector=>selector==='#rm_api_block'?connection:['#main_api','#chat_completion_source'].includes(selector)?required:null};
 const lock=createNativeHostLock({coreBusy:()=>false,workspaceBusy:()=>workspace,adapterActivity:()=>({busy:adapter})});
 const host=createNativeSettingsHost({document,isBusy:lock,projection:async()=>({})});
 workspace=true;await assert.rejects(host.run({action:'open',surface:'connection'}),{code:'BUSY'});workspace=false;adapter=true;await assert.rejects(host.run({action:'open',surface:'connection'}),{code:'BUSY'});adapter=false;
 await assert.rejects(host.run({action:'open',surface:'connection',recoveryPending:true}),{code:'BUSY'});
 const opened=await host.run({action:'open',surface:'connection'});assert.equal(opened.mode,'stm-themed-native');await host.run({action:'close',surfaceId:opened.surfaceId});
});
test('native host intercepts global keyboard shortcuts while preserving control defaults',async()=>{
 const connection=element('rm_api_block'),required=element('main_api'),listeners=new Map();connection.contains=node=>node===required;
 const document={documentElement:{classList:{add(){},remove(){}}},querySelector:selector=>selector==='#rm_api_block'?connection:['#main_api','#chat_completion_source'].includes(selector)?required:null,addEventListener:(name,listener)=>{const list=listeners.get(name)??[];list.push(listener);listeners.set(name,list);},removeEventListener:(name,listener)=>listeners.set(name,(listeners.get(name)??[]).filter(value=>value!==listener))};
 const host=createNativeSettingsHost({document,isBusy:()=>false,projection:async()=>({})}),opened=await host.run({action:'open',surface:'connection'});let mutations=0;
 const dispatch=target=>{const event={type:'keydown',target,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){this.stopped=true;}};for(const listener of listeners.get('keydown')??[]){listener(event);if(event.stopped)break;}if(!event.stopped)mutations++;return event;};
 const inside=dispatch(required);assert.equal(inside.defaultPrevented,false);assert.equal(inside.stopped,true);assert.equal(mutations,0);
 const outside=dispatch(element('send_textarea'));assert.equal(outside.defaultPrevented,true);assert.equal(outside.stopped,true);assert.equal(mutations,0);
 await host.run({action:'close',surfaceId:opened.surfaceId});dispatch(required);assert.equal(mutations,1);
});
