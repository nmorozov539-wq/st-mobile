import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeGreeting,characterGreetings} from '../prototype/frontend/character-data.js';

test('greeting organization preserves old main, duplicate alternatives and opaque native fields',()=>{
 const original={first_mes:'Main',alternate_greetings:['Same','Same','Last'],extensions:{foreign:{enabled:true}},character_book:{entries:[{unknown:42}]}};
 const updated=organizeGreeting(original,'main',2);
 assert.deepEqual(characterGreetings(updated),['Same','Main','Same','Last']);
 assert.deepEqual(original.alternate_greetings,['Same','Same','Last']);
 assert.deepEqual(updated.character_book,original.character_book);
 assert.deepEqual(updated.extensions,original.extensions);
 const moved=organizeGreeting(updated,'up',3);
 assert.deepEqual(characterGreetings(moved),['Same','Main','Last','Same']);
 assert.deepEqual(characterGreetings(organizeGreeting(moved,'down',1)),['Same','Last','Main','Same']);
});
test('greeting operations are explicit, bounded and never silently repair malformed native data',()=>{
 const card={first_mes:'Main'};assert.deepEqual(characterGreetings(organizeGreeting(card,'add')),['Main','']);
 assert.throws(()=>organizeGreeting(card,'delete',0));assert.throws(()=>organizeGreeting(card,'up',0));assert.throws(()=>organizeGreeting(card,'main',5));
 assert.throws(()=>characterGreetings({alternate_greetings:[42]}));
 assert.deepEqual(characterGreetings(organizeGreeting({first_mes:'Main',alternate_greetings:['Delete','Keep']},'delete',1)),['Main','Keep']);
});
