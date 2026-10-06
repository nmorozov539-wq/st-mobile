import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSavedChat } from '../prototype/extension/chat-selection.js';
test('chat selection only updates the chat attribute and reloads after server acknowledgement', async () => {
    const character = {avatar:'moss.png',chat:'old',data:{system_prompt:'Preserve me',extensions:{custom:1}}};
    const calls = [];
    const ctx = {characters:[character],characterId:0,getRequestHeaders:()=>({'X-CSRF-Token':'fixture'}),reloadCurrentChat:async()=>calls.push(['reload',character.chat]),saveChat:async()=>calls.push(['save',character.chat])};
    await selectSavedChat(()=>ctx,'new',async(url,options)=>{calls.push(['request',url,JSON.parse(options.body)]); assert.equal(character.chat,'old'); return {ok:true};});
    assert.deepEqual(calls,[['request','/api/characters/merge-attributes',{avatar:'moss.png',chat:'new'}],['reload','new'],['save','new']]);
    assert.deepEqual(character.data,{system_prompt:'Preserve me',extensions:{custom:1}});
});
test('refused chat pointer updates never reload or mutate the in-memory card', async () => {
    const character = {avatar:'moss.png',chat:'old'};
    const ctx = {characters:[character],characterId:0,getRequestHeaders:()=>({}),reloadCurrentChat:async()=>assert.fail('must not reload'),saveChat:async()=>assert.fail('must not save')};
    await assert.rejects(selectSavedChat(()=>ctx,'new',async()=>({ok:false})),{code:'CHAT_SELECTION_FAILED'});
    assert.equal(character.chat,'old');
});
