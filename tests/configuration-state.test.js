import test from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveSecret } from '../prototype/extension/configuration-state.js';
test('key readiness requires an active ST key and never reads secret values',()=>{
    for(const state of [null,undefined,[],[{active:false}],true])assert.equal(hasActiveSecret(state),false);
    const active={active:true,get value(){assert.fail('secret values must not be inspected');}};
    assert.equal(hasActiveSecret([{active:false},active]),true);
});
