import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPersonaWithoutCardEdit } from '../prototype/extension/persona-selection.js';
test('persona selection suppresses the blank-chat character editor and preserves metadata',async()=>{
    for(const metadata of [{unknown:42},{tainted:false,unknown:42},{tainted:true,unknown:42}]){
        const before=structuredClone(metadata);let saved=0;
        const ctx={chatMetadata:metadata,saveChat:async()=>{saved++;assert.deepEqual(metadata,before);}};
        await selectPersonaWithoutCardEdit(()=>ctx,async()=>assert.equal(metadata.tainted,true),'persona');
        assert.deepEqual(metadata,before);assert.equal(saved,1);
    }
});
test('persona failure restores the greeting guard and does not save a partial change',async()=>{
    const metadata={unknown:42};let saved=0;
    await assert.rejects(selectPersonaWithoutCardEdit(()=>({chatMetadata:metadata,saveChat:async()=>saved++}),async()=>{throw Error('selection failed');},'persona'),/selection failed/);
    assert.deepEqual(metadata,{unknown:42});assert.equal(saved,0);
});
