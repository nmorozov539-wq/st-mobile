import test from 'node:test';
import assert from 'node:assert/strict';
import {characterStatus,characterRows,chatDate} from '../prototype/frontend/libraries.js';
test('native card readiness requires name, description and main greeting without rewriting fields',()=>{
 const card={name:'Native',description:'Description',first_mes:'Greeting',extensions:{foreign:42}};assert.equal(characterStatus(card).complete,true);
 const backup=structuredClone(card);assert.deepEqual(characterStatus({...card,description:' ',first_mes:''}).missing,['description','main greeting']);assert.deepEqual(card,backup);assert.deepEqual(characterStatus({}).missing,['name','description','main greeting']);
});
test('three-column grouping preserves every native card and the final partial row',()=>{
 const cards=Array.from({length:1204},(_,i)=>({key:`Native ${i}.png`})),rows=characterRows(cards);assert.equal(rows.length,402);assert.equal(rows.at(-1).length,1);assert.deepEqual(rows.flat(),cards);assert.deepEqual(characterRows([]),[]);
});
test('list dates use actual timestamps and omit unknown values',()=>{
 const now=new Date(2026,9,9,12).getTime(),today=new Date(2026,9,9,10).getTime(),yesterday=new Date(2026,9,8,10).getTime();assert.equal(chatDate(yesterday,now).label,'Yesterday');assert.equal(chatDate(String(today),now).datetime,new Date(today).toISOString());assert.equal(chatDate('fixture',now),null);assert.equal(chatDate(undefined,now),null);assert.equal(chatDate('',now),null);assert.equal(chatDate(1e30,now),null);
});
