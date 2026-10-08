import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectPreset,changePresetGeneration,resetPresetToGlobal} from '../prototype/extension/preset-state.js';
import {projectSettings,rebaseSettingsGuard} from '../prototype/frontend/scoped-settings.js';
import {revision,withModelSelection} from '../prototype/extension/workspace-data.js';
test('preset memory preserves legacy adjustments, arbitrary names, opaque fields and independent models',()=>{
 const copy={preset:'A',model:'original-model',foreign:{keep:true},generation:{temperature:.31,prompts:[{identifier:'x',content:'local A',foreign:42}]}};
 const nativeB={temperature:.8,prompts:[{identifier:'x',content:'native B'}]};
 selectPreset(copy,'__proto__',nativeB);changePresetGeneration(copy,{temperature:.72},'__proto__');
 selectPreset(copy,'A',{temperature:1});assert.equal(copy.generation.temperature,.31);assert.equal(copy.generation.prompts[0].foreign,42);
 selectPreset(copy,'__proto__',{temperature:1});assert.equal(copy.generation.temperature,.72);assert.equal(copy.model,'original-model');assert.deepEqual(copy.foreign,{keep:true});
 assert.throws(()=>changePresetGeneration(copy,{temperature:1},'A'),{code:'CONFLICT'});
 nativeB.prompts[0].content='external';assert.equal(copy.generation.prompts[0].content,'native B');
 assert.equal(readFileSync(new URL('../prototype/frontend/preset-state.js',import.meta.url),'utf8'),readFileSync(new URL('../prototype/extension/preset-state.js',import.meta.url),'utf8'),'both independently served module copies use identical transforms');
});
test('queued A/edit/B/edit/A keeps per-preset memory and target independent during generation',()=>{
 const a={characterKey:'c',chatId:'a'},b={characterKey:'c',chatId:'b'},base={preset:'A',model:'global',generation:{temperature:.3,prompt_order:[]}};
 const original={global:base,character:withModelSelection({enabled:false,copy:base,modelSelection:{enabled:true,value:'character-model'}})};
 const items=[{kind:'generation',preset:'A',value:{temperature:.4}},{kind:'preset',value:'B',previewGeneration:{temperature:.8}},{kind:'generation',preset:'B',value:{temperature:.6}},{kind:'preset',value:'A',previewGeneration:{temperature:.9}}].map(argument=>({argument:{action:'configure',scope:'chat',target:a,...argument}}));
 const projected=projectSettings(original,a,items);assert.equal(projected.chat.copy.generation.temperature,.4);assert.equal(projected.chat.copy.presetBank.find(p=>p.preset==='B').generation.temperature,.6);assert.equal(projected.effective.copy.model,'character-model');assert.equal(original.chat,undefined);
 assert.equal(projectSettings(original,b,items).chat,undefined);
 const guard=revision({global:base,char:original.character});
 const rebased=rebaseSettingsGuard({action:'configure',target:a,scope:'chat',expected:guard},{action:'configure',target:a,scope:'chat',kind:'generation',expected:guard},projected);
 assert.deepEqual(JSON.parse(rebased).chat,projected.chat);
 const inherit=projectSettings(projected,a,[{argument:{action:'configure',target:a,scope:'chat',kind:'inheritPreset'}}]);assert.equal(inherit.chat.enabled,false);assert.deepEqual(inherit.chat.copy,projected.chat.copy);assert.equal(inherit.effective.copy.model,'character-model');
});
test('creating character preset copy while chat overrides does not copy the stronger chat',()=>{
 const global={preset:'G',model:'m',generation:{temperature:.1}},chat=withModelSelection({enabled:true,copy:{preset:'C',model:'m',generation:{temperature:.9}}});
 const result=projectSettings({global,chat},{characterKey:'c',chatId:'a'},[{argument:{action:'configure',scope:'character',target:{characterKey:'c',chatId:'a'},kind:'generation',preset:'G',value:{temperature:.2}}}]);
 assert.equal(result.character.copy.preset,'G');assert.equal(result.character.copy.generation.temperature,.2);assert.equal(result.effective.copy.preset,'C');
});

test('explicit reset retains other preset memories, independent model and opaque scope fields',()=>{
 const copy={preset:'A',model:'kept',foreign:42,generation:{temperature:.3}};
 selectPreset(copy,'B',{temperature:.8});changePresetGeneration(copy,{temperature:.7},'B');
 resetPresetToGlobal(copy,{preset:'A',model:'other',generation:{temperature:.1}});
 assert.equal(copy.generation.temperature,.1);assert.equal(copy.model,'kept');assert.equal(copy.foreign,42);
 selectPreset(copy,'B',{temperature:1});assert.equal(copy.generation.temperature,.7);
});
