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
