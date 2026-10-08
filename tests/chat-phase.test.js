import test from 'node:test';
import assert from 'node:assert/strict';
import {withModelSelection,effectiveScope,switchScope,settingsGuard,revision} from '../prototype/extension/workspace-data.js';
import {effectiveSettings,projectSettings,rebaseSettingsGuard} from '../prototype/frontend/scoped-settings.js';
import {generationDuration,alternativeIntent} from '../prototype/frontend/chat-controls.js';

const global={model:'global-model',preset:'A',generation:{temperature:.7,foreign:{keep:true}}};
const target={characterKey:'a.png',chatId:'one'},other={...target,chatId:'two'};
const legacy=()=>({enabled:true,foreign:{keep:true},copy:{model:'legacy',preset:'B',generation:{temperature:.3,unknown:'keep'}}});
test('model migration retains enabled and disabled legacy selections without mutating opaque fields',()=>{
    const original=legacy(),migrated=withModelSelection(original);
    assert.equal(effectiveScope(global,original).copy.model,'legacy');
    assert.deepEqual(migrated.copy,original.copy);assert.deepEqual(migrated.foreign,original.foreign);assert.equal(original.modelSelection,undefined);
    assert.deepEqual(withModelSelection(migrated),migrated);
    const disabled=withModelSelection({...original,enabled:false});assert.equal(disabled.modelSelection.value,'legacy');assert.equal(disabled.modelSelection.enabled,false);
    assert.equal(effectiveScope(global,disabled).copy.model,'global-model');
});
test('preset scope changes and resets retain independent model scope; model inheritance retains preset fields',()=>{
    const char=withModelSelection(legacy()),chat=switchScope(null,true,global);
    chat.copy.preset='Chat preset';assert.equal(effectiveScope(global,char,chat).modelScope,'character');
    const switched=switchScope(char,false,global);assert.equal(effectiveScope(global,switched,chat).copy.model,'legacy');
    const value={global,character:char,chat,effective:effectiveScope(global,char,chat)};
    const inherited=projectSettings(value,target,[{argument:{action:'configure',scope:'character',kind:'inheritModel',target}}]);
    assert.equal(inherited.effective.copy.model,'global-model');assert.equal(inherited.effective.copy.preset,'Chat preset');assert.equal(inherited.character.copy.generation.unknown,'keep');
    const local=projectSettings(inherited,target,[{argument:{action:'configure',scope:'chat',kind:'model',value:'chat-model',target}}]);
    assert.equal(local.effective.modelScope,'chat');assert.equal(local.effective.scope,'chat');assert.equal(local.character.modelSelection.value,'legacy');
    const reset=projectSettings(local,target,[{argument:{action:'configure',scope:'chat',kind:'reset',target}}]);assert.equal(reset.effective.copy.model,'chat-model');assert.equal(reset.effective.copy.preset,'A');
});
test('model-only override does not enable a preset and queued choices remain on their originating target',()=>{
    const value={global,character:withModelSelection({...legacy(),enabled:false}),chat:undefined};value.effective=effectiveSettings(value);
    const item={argument:{action:'configure',scope:'chat',kind:'model',target,value:'new'}};
    const projected=projectSettings(value,target,[item]);assert.equal(projected.chat.enabled,false);assert.equal(projected.effective.scope,'global');assert.equal(projected.effective.copy.model,'new');
    assert.equal(projectSettings(value,other,[item]).effective.copy.model,'global-model');
    assert.deepEqual(projected.effective,effectiveScope(projected.global,projected.character,projected.chat));
});
test('settings queue rebases verified shared components across targets and preserves unrelated conflicts',()=>{
    const char=withModelSelection(legacy()),expected=revision({global,char});
    const applied={action:'configure',scope:'global',kind:'model',target:null,expected:revision({global}),value:'changed'};
    const result={global:{...global,model:'changed'}};
    const rebased=rebaseSettingsGuard({action:'configure',target,expected},applied,result);
    assert.deepEqual(JSON.parse(rebased),{global:result.global,char});
    const external={...global,model:'external'};
    assert.equal(JSON.parse(rebaseSettingsGuard({action:'configure',target,expected:revision({global:external,char})},applied,result)).global.model,'external');
    const localApplied={action:'configure',scope:'chat',kind:'model',target,expected:revision({global,chat:legacy()})};
    const untouched=revision({global,chat:withModelSelection(legacy())});assert.equal(rebaseSettingsGuard({action:'configure',target:other,expected:untouched},localApplied,{chat:{enabled:false}}),untouched);
});
test('v1 durable settings guards migrate compatibly but still detect changed native fields',()=>{
    const old={global,char:legacy(),chat:{...legacy(),enabled:false}};
    assert.equal(settingsGuard(revision(old)),revision({...old,char:withModelSelection(old.char),chat:withModelSelection(old.chat)}));
    assert.notEqual(settingsGuard(revision(old)),settingsGuard(revision({...old,char:{...old.char,foreign:{keep:false}}})));
});
test('only a deliberate forward overswipe of an eligible final reply generates',()=>{
    const message={mes:'one',swipes:['one','two'],swipe_id:1};
    assert.deepEqual(alternativeIntent(message,3,4,1),{generate:true});
    assert.deepEqual(alternativeIntent(message,1,4,1),{swipeId:0});
    assert.deepEqual(alternativeIntent({...message,swipe_id:0},3,4,-1),{swipeId:1});
    assert.equal(alternativeIntent({...message,is_user:true},3,4,1),null);
    assert.equal(alternativeIntent({mes:'greeting'},0,1,1),null);
    assert.equal(alternativeIntent({mes:'hidden',is_system:true},3,4,1),null);
});
test('generation duration uses valid actual metadata and does not invent details',()=>{
    const message={gen_started:'2026-10-08T10:00:00Z',gen_finished:'2026-10-08T10:00:07.200Z'};
    assert.equal(generationDuration(message),'7.2s');
    for(const m of [{},{...message,is_user:true},{...message,gen_started:'invalid'},{...message,gen_finished:'2026-10-08T09:00:00Z'}])assert.equal(generationDuration(m),null);
});
