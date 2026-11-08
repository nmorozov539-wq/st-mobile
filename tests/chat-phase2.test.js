// 0.8 phase 2: chat screen helpers that run without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {colourFromPixels,refineForChat,contrastRatio,fromHex,validColour,rgbToOklch} from '../prototype/frontend/char-colour.js';
import {normalizeAppearance} from '../prototype/frontend/appearance.js';

const BG={r:0x14,g:0x15,b:0x19};
function image(fill,size=64){const px=new Uint8ClampedArray(size*size*4);for(let i=0;i<size*size;i++){const [r,g,b,a=255]=fill(i%size,Math.floor(i/size));px.set([r,g,b,a],i*4);}return px;}

test('character colour comes from the dominant vivid hue and reads on the chat background', () => {
    // Mostly dark teal, a little noise of other hues.
    const px=image((x,y)=>(x*7+y*13)%97===0?[200,40,40]:y<20?[20,45,50]:[50,170,150]);
    const hex=colourFromPixels(px),c=fromHex(hex),lch=rgbToOklch(c);
    assert.ok(hex,'a colour is found');
    assert.ok(lch.h>150&&lch.h<210,`teal hue, got ${lch.h}`);
    assert.ok(contrastRatio(c,BG)>=4.5,'readable as text on --bg');
    assert.ok(lch.L>=.68&&lch.L<=.85,'lightened into the chat range');
});
test('a single bright highlight does not decide the colour', () => {
    const px=image((x,y)=>x===3&&y===3?[255,0,255]:[180,120,50]);
    const lch=rgbToOklch(fromHex(colourFromPixels(px)));
    assert.ok(lch.h>40&&lch.h<90,`amber wins over a one-pixel magenta, got ${lch.h}`);
});
test('grey and transparent avatars fall back to brass (null)', () => {
    assert.equal(colourFromPixels(image(()=>[128,128,128])),null);
    assert.equal(colourFromPixels(image(()=>[200,40,40,0])),null);
    assert.equal(refineForChat(null),null);
});
test('a dark saturated colour is lifted, keeping its hue', () => {
    const out=refineForChat({r:40,g:0,b:90}),lch=rgbToOklch(out);
    assert.ok(contrastRatio(out,BG)>=4.5);assert.ok(Math.abs(lch.h-rgbToOklch({r:40,g:0,b:90}).h)<6);
});
test('hand-picked colours are validated', () => {
    assert.equal(validColour('#A1B2C3'),'#a1b2c3');assert.equal(validColour(''),null);assert.equal(validColour('red'),null);assert.equal(validColour('#abc'),null);
});
test('thinking blocks setting defaults to collapsed', () => {
    assert.equal(normalizeAppearance({}).thinking,'collapsed');
    assert.equal(normalizeAppearance({thinking:'expanded'}).thinking,'expanded');
    assert.equal(normalizeAppearance({thinking:'open'}).thinking,'collapsed');
});
import {swipeSide} from '../prototype/frontend/side-panels.js';
test('side-panel swipes: direction picks the panel; short, slow or vertical drags open nothing', () => {
    assert.equal(swipeSide(-120,10),'right');
    assert.equal(swipeSide(140,-8),'left');
    assert.equal(swipeSide(40,0),null,'short and slow');
    assert.equal(swipeSide(40,0,{velocity:.9}),'left','short but fast');
    assert.equal(swipeSide(-80,70),null,'mostly vertical');
});
import {compileDisplay,applyDisplay,messageDepth,placementFor,regexFromString} from '../prototype/frontend/regex-display.js';
import {collectDisplayScripts} from '../prototype/extension/display-regex.js';
import {scopeSelector} from '../prototype/frontend/html-format.js';

const script=(over={})=>({scriptName:'s',findRegex:'/<c=([a-z]+)>(.*?)<\\/c>/gi',replaceString:'<span style="color:$1">$2</span>',trimStrings:[],placement:[2],markdownOnly:true,promptOnly:false,disabled:false,substituteRegex:0,minDepth:null,maxDepth:null,...over});
const fakeCtx=(over={})=>({extensionSettings:{regex:[script()],character_allowed_regex:['a.png'],preset_allowed_regex:{openai:['Stribog']}},characters:[{avatar:'a.png',name:'Mira',data:{extensions:{regex_scripts:[script({scriptName:'scoped',findRegex:'/{{char}}/g',substituteRegex:1,replaceString:'[{{match}}]'})]}}}],getPresetManager:()=>({getCompletionPresetByName:n=>n==='Stribog'?{extensions:{regex_scripts:[script({scriptName:'preset',findRegex:'/x/g',replaceString:'y'})]}}:undefined}),substituteParams:(t,o)=>t.replaceAll('{{char}}',o?.name2Override??'?'),...over});

test('display scripts: global, allowed character and allowed preset; prompt-only and disabled skipped', () => {
    const ctx=fakeCtx();ctx.extensionSettings.regex.push(script({scriptName:'prompt',markdownOnly:false,promptOnly:true}),script({scriptName:'off',disabled:true}));
    const {scripts}=collectDisplayScripts(ctx,{characterKey:'a.png',preset:'Stribog'});
    assert.deepEqual(scripts.map(s=>s.name),['s','scoped','preset']);
    assert.equal(scripts[1].find,'/Mira/g','{{char}} resolved for the chat character');
    assert.equal(scripts[1].replace,'[$0]','{{match}} becomes $0');
    assert.deepEqual(collectDisplayScripts(ctx,{characterKey:'b.png',preset:'Other'}).scripts.map(s=>s.name),['s'],'not allowed → not applied');
    assert.equal(collectDisplayScripts(fakeCtx({extensionSettings:{disabledExtensions:['regex'],regex:[script()]}})).scripts.length,0);
});
test('display regex runs like ST: groups, trims, placement and depth', () => {
    const compiled=compileDisplay([{...collectDisplayScripts(fakeCtx()).scripts[0]},{name:'deep',find:'/END/',replace:'',trim:[],placement:[2],minDepth:null,maxDepth:1}]);
    assert.equal(applyDisplay(compiled,'<c=red>"Hi"</c> END',{placement:2,depth:0}),'<span style="color:red">"Hi"</span> ');
    assert.equal(applyDisplay(compiled,'END',{placement:2,depth:3}),'END','maxDepth keeps older messages');
    assert.equal(applyDisplay(compiled,'<c=red>x</c>',{placement:1,depth:0}),'<c=red>x</c>','user input placement not listed');
    const trimmed=compileDisplay([{find:'/<b>(.*?)<\\/b>/',replace:'$1',trim:['!'],placement:[2],minDepth:null,maxDepth:null}]);
    assert.equal(applyDisplay(trimmed,'<b>wow!</b>',{placement:2}),'wow');
    assert.equal(regexFromString('/a/zz')?.source,'\\/a\\/zz','invalid flags → literal');
});
test('message depth counts from the end over non-system messages', () => {
    const m=[{},{is_system:true},{},{is_user:true}];
    assert.deepEqual([0,1,2,3].map(i=>messageDepth(m,i)),[2,undefined,1,0]);
    assert.equal(placementFor({is_user:true}),1);assert.equal(placementFor({extra:{type:'narrator'}}),3);assert.equal(placementFor({}),2);
});
test('message <style> rules are scoped to the message and class names renamed', () => {
    assert.equal(scopeSelector('body .a, :root, html>.b, p.note:hover','.rx-1'),'.rx-1 .rx-c-a,.rx-1,.rx-1 >.rx-c-b,.rx-1 p.rx-c-note:hover');
    assert.equal(scopeSelector('[class=".x"] q','.rx-2'),'.rx-2 [class=".x"] q');
});
