import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAlternative} from '../prototype/extension/alternative.js';
const fixture=generate=>{const ctx={chat:[{is_user:true,mes:'question'},{is_user:false,mes:'original',extra:{reasoning:'old thought'}}],generate,updateMessageBlock(){},async saveChat(){ctx.saved=structuredClone(ctx.chat);}};return ctx;};
test('explicit new reply uses native generation once and preserves the old reply and reasoning',async()=>{
 let calls=0;const ctx=fixture(async type=>{calls++;assert.equal(type,'swipe');const m=ctx.chat.at(-1);assert.equal(m.swipe_id,1);m.swipes.push('new');m.mes='new';});
 await generateAlternative(ctx,()=>{});assert.equal(calls,1);assert.deepEqual(ctx.saved.at(-1).swipes,['original','new']);assert.equal(ctx.saved.at(-1).swipe_info[0].extra.reasoning,'old thought');
});
test('provider failure before alternative text restores the exact original message and selection',async()=>{
 const ctx=fixture(async()=>{throw Error('provider offline');});const original=structuredClone(ctx.chat);
 await assert.rejects(generateAlternative(ctx,()=>{}),/provider offline/);assert.deepEqual(ctx.chat,original);assert.deepEqual(ctx.saved,original);
});
test('stopped partial alternative is saved instead of discarded',async()=>{
 const ctx=fixture(async()=>{const m=ctx.chat.at(-1);m.swipes[1]='partial';m.mes='partial';});await generateAlternative(ctx,()=>{});assert.equal(ctx.saved.at(-1).swipes[1],'partial');
});
test('alternative refuses a user-last chat without changing it or invoking the model',async()=>{
 const ctx=fixture(()=>{throw Error('must not generate');});ctx.chat.pop();const original=structuredClone(ctx.chat);await assert.rejects(generateAlternative(ctx,()=>{}),{code:'INVALID_SWIPE'});assert.deepEqual(ctx.chat,original);
});
