import test from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveSecret, waitForConnection, providerSecretKey, validateEndpoint } from '../prototype/extension/configuration-state.js';
import { createSettingsPanel } from '../prototype/frontend/settings.js';
test('key readiness requires an active ST key and never reads secret values',()=>{
    for(const state of [null,undefined,[],[{active:false}],true])assert.equal(hasActiveSecret(state),false);
    const active={active:true,get value(){assert.fail('secret values must not be inspected');}};
    assert.equal(hasActiveSecret([{active:false},active]),true);
});
test('custom and OpenRouter use distinct ST secret slots and endpoint base paths',()=>{
    assert.equal(providerSecretKey('custom'),'api_key_custom');
    assert.equal(providerSecretKey('openrouter'),'api_key_openrouter');
    assert.throws(()=>providerSecretKey('unknown'));
    assert.equal(validateEndpoint(' http://127.0.0.1:8001/api/v1/ '),'http://127.0.0.1:8001/api/v1');
    for(const value of ['', 'localhost:8001', 'file:///tmp', 'http://localhost/v1/chat/completions', 'https://user:pass@example.com/v1'])assert.throws(()=>validateEndpoint(value));
});
test('custom Connect saves endpoint and manual model before connecting and reports its own key slot',async()=>{
    const previous=globalThis.document,nodes=new Map(),calls=[];
    const node=id=>{
        if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',replaceChildren(){},append(){},querySelectorAll(){return[];},addEventListener(){},showModal(){}});
        return nodes.get(id);
    };
    globalThis.document={getElementById:node,createElement:()=>({})};
    const config={revision:'r',selected:{source:'custom',endpoint:'http://localhost:8124/v1',model:'old',lorebooks:[]},presets:[],personas:[],models:[],lorebooks:[],onlineStatus:'no_connection',hasOpenRouterKey:true,hasProviderKey:false};
    try{
        createSettingsPanel({rpc:async(method,arg)=>{
            if(method==='configure'){
                calls.push(arg);
                if(arg.kind==='endpoint')config.selected.endpoint=arg.value;
                if(arg.kind==='model')config.selected.model=arg.value;
            }return config;
        },action:fn=>fn(),adoptSnapshot:async()=>{},status(){},locked:()=>false});
        await node('settings-button').onclick();
        assert.match(node('connection-state').textContent,/Custom endpoint key not configured/);
        node('setting-endpoint').value='http://localhost:8001/api/v1';
        node('setting-custom-model').value='fixture/model';
        node('setting-key').value='fixture-key-not-real';
        await node('connect-model').onclick();
        assert.deepEqual(calls.map(call=>[call.kind,call.value]),[['endpoint','http://localhost:8001/api/v1'],['model','fixture/model'],['connect','fixture-key-not-real']]);
        assert.equal(node('setting-key').value,'');
    }finally{globalThis.document=previous;}
});
test('connection waits for ST to finish and exposes failure and timeout', async()=>{
    let ticks=0;
    const result={onlineStatus:'Valid',models:[{id:'test-model'}]};
    assert.equal(await waitForConnection({isLoading:()=>ticks<3,read:()=>result,delay:async()=>{ticks++;}}),result);
    assert.equal(ticks,3);
    await assert.rejects(waitForConnection({isLoading:()=>false,read:()=>({onlineStatus:'no_connection'})}),/could not connect/);
    await assert.rejects(waitForConnection({isLoading:()=>true,read:()=>result,delay:async()=>{},timeout:200}),/still waiting/);
});
test('Connect sends the entered key and clears the input without requiring Save', async()=>{
    const previous=globalThis.document, nodes=new Map(), calls=[];
    const node=id=>{
        if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',replaceChildren(){},append(){},querySelectorAll(){return[];},addEventListener(){},showModal(){}});
        return nodes.get(id);
    };
    globalThis.document={getElementById:node,createElement:()=>({})};
    const config={revision:'r',selected:{source:'openrouter',lorebooks:[]},presets:[],personas:[],models:[],lorebooks:[],onlineStatus:'no_connection',hasOpenRouterKey:false};
    try{
        createSettingsPanel({rpc:async(method,arg)=>{calls.push({method,arg});return config;},action:fn=>fn(),adoptSnapshot:async()=>{},status(){},locked:()=>false});
        await node('settings-button').onclick();
        node('setting-key').value='fixture-key-not-real';
        await node('connect-model').onclick();
        await new Promise(resolve=>setImmediate(resolve));
        assert.equal(calls.find(call=>call.method==='configure').arg.value,'fixture-key-not-real');
        assert.equal(node('setting-key').value,'');
    }finally{globalThis.document=previous;}
});
