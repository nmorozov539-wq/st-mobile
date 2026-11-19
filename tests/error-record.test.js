import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyError,normalizeErrorRecord,createErrorEventStore} from '../prototype/frontend/error-record.js';
import {installNativeNoticeBridge} from '../prototype/extension/native-notices.js';

const cases=[
 [{status:401,message:'invalid API key'},'authentication'],
 [{status:403,message:'forbidden'},'permission'],
 [{status:402,message:'payment required'},'quota'],
 [{code:'insufficient_quota',message:'quota exceeded'},'quota'],
 [{status:429,message:'too many requests'},'rate_limit'],
 [{code:'MODEL_NOT_FOUND',message:'model missing'},'model_missing'],
 [{message:'maximum context length exceeded'},'context_limit'],
 [{status:503,message:'service unavailable'},'provider_failure'],
 [{code:'ENOTFOUND',message:'DNS lookup failed'},'network'],
 [{code:'TIMEOUT',message:'request timed out'},'timeout'],
 [{message:'stream closed unexpectedly'},'interrupted_stream'],
 [{code:'ENGINE_UNAVAILABLE',message:'engine stopped'},'engine_unavailable'],
 [{code:'PERSISTENCE_MISMATCH',message:'saved chat readback changed'},'save_failed'],
 [{message:'unrecognized provider shape'},'unknown'],
];

test('structured error classifier covers supported evidence without inventing quota from HTTP 429',()=>{
 for(const [value,category] of cases)assert.equal(classifyError(value).category,category,JSON.stringify(value));
 assert.match(classifyError({status:429,message:'limit'}).summary,/rate-limiting/i);assert.doesNotMatch(classifyError({status:429,message:'limit'}).summary,/credit|balance/i);
 assert.match(classifyError({status:402,message:'payment'}).summary,/payment is required/i);
});

test('normalized records are bounded, attributed and redact common credential forms',()=>{
 const record=normalizeErrorRecord({code:'TIMEOUT',message:`Authorization: Bearer-secret api_key=abc123 ${'x'.repeat(4000)}`},{operationId:'op-1',target:{characterKey:'a.png',chatId:'chat'},sessionId:'session',outcome:'uncertain'});
 assert.equal(record.operationId,'op-1');assert.equal(record.target.chatId,'chat');assert.equal(record.outcome,'uncertain');assert.equal(record.category,'timeout');assert.ok(record.detail.length<=2000);assert.doesNotMatch(record.detail,/Bearer-secret|abc123/);assert.deepEqual(record.actions,['view-saved-conversation','inspect-details']);
});

test('recent event store is bounded and deduplicates structured operation plus native notice windows',()=>{
 const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};let clock=1000;
 const store=createErrorEventStore(storage,{limit:3,now:()=>clock});
 const first=store.add({code:'TIMEOUT',message:'first'},{timestamp:new Date(clock).toISOString(),sessionId:'s',operationId:'op'});clock+=1000;
 const duplicate=store.add({code:'TIMEOUT',message:'second'},{timestamp:new Date(clock).toISOString(),sessionId:'s',operationId:'op'});assert.equal(duplicate.id,first.id);assert.equal(store.recent().length,1);
 for(let i=0;i<4;i++){clock+=6000;store.add({message:`event ${i}`},{timestamp:new Date(clock).toISOString(),sessionId:'s',operationId:`op-${i}`});}
 assert.equal(store.recent().length,3);
});

test('native toast wrapper preserves the pinned API call, emits inert bounded records and tears down',()=>{
 const calls=[],events=[],toast={error(...args){calls.push(['error',...args]);return 'toast-id';},warning(...args){calls.push(['warning',...args]);}};
 const original=toast.error,teardown=installNativeNoticeBridge({toast,emit:event=>events.push(event),context:()=>({sessionId:'s'})});
 assert.equal(toast.error('<b>provider failed</b>','API'),'toast-id');assert.deepEqual(calls[0],['error','<b>provider failed</b>','API']);assert.equal(events[0].type,'error.record');assert.doesNotMatch(events[0].record.detail,/<b>/);assert.equal(events[0].record.sessionId,'s');
 teardown();assert.equal(toast.error,original);toast.error('after');assert.equal(events.length,1);
});
