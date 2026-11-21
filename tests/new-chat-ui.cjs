// Isolated ST 1.19.0 fixture and mock provider only. Never run against personal ST.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.STM_PLAYWRIGHT_MODULE||'playwright');
fs.mkdirSync('/tmp/stm-new-chat-ui',{recursive:true});
let browser,p,passed=0;const check=(value,name)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
module.exports=(async()=>{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const native=(fn,arg)=>p.locator('#engine').contentFrame().locator('body').evaluate(fn,arg);
 const ready=async()=>{await p.goto('http://127.0.0.1:8123/st-mobile/');await p.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:60000});};
 const health=async()=>fetch('http://127.0.0.1:8124/health').then(r=>r.json());
 await ready();
 const fixture=await native(async()=>{
  const ctx=SillyTavern.getContext();if(ctx.chatCompletionSettings.custom_url!=='http://127.0.0.1:8124/v1')throw Error('Only the mock provider is permitted');
  await window.stmExtensions.get('summaryception').run({action:'settings',value:{enabled:false}});
  const post=async(url,body)=>{const r=await fetch(url,{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(body)});if(!r.ok)throw Error(url+': '+r.status);return r.json();};
  const moss=ctx.characters.find(c=>c.name==='Moss');if(!moss)throw Error('Missing isolated Moss fixture');
  const existing=await post('/api/characters/get',{avatar_url:moss.avatar}),card=structuredClone(existing.data),stamp=Date.now();
  Object.assign(card,{name:`! New chat QA ${stamp}`,description:'Native workflow fixture',first_mes:'Native main greeting',alternate_greetings:['Native alternative greeting'],character_book:undefined,extensions:{foreign:{keep:42}}});
  const form=new FormData();form.append('avatar',new File([JSON.stringify({spec:'chara_card_v2',spec_version:'2.0',data:card})],'workflow.json',{type:'application/json'}));form.append('file_type','json');
  const imported=await fetch('/api/characters/import',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form});const result=await imported.json();if(!imported.ok||!result.file_name)throw Error('Fixture import failed');
  await ctx.getCharacters();const key=result.file_name+'.png',names=['Keep','Delete','Failure','Stale','BadSave'].map(s=>`! New chat ${s} ${stamp}`);
  const metadata={integrity:crypto.randomUUID(),foreign:{keep:'opaque'},summaryception:{layers:[[{text:'Old retained Memory'}]],summarizedUpTo:0,ghostedIndices:[]}};
  const message={name:card.name,is_user:false,is_system:false,mes:'Original saved greeting',send_date:'fixture',swipe_id:0,swipes:['Original saved greeting'],swipe_info:[{send_date:'fixture',extra:{foreign:42}}],extra:{foreign:42},foreign:{native:true}};
  for(const name of names)await post('/api/chats/save',{avatar_url:key,file_name:name,chat:[{user_name:'unused',character_name:'unused',unknown_header:{keep:42},chat_metadata:structuredClone(metadata)},structuredClone(message)]});
  return {key,names,name:card.name};
 });
 // Reload discovers the synthetic chats through the ordinary frontend bridge.
 await ready();const requests=(await health()).requests;
 // Exercise a retained native configuration that could summarize a greeting.
 await native(async()=>{const c=SillyTavern.getContext();Object.assign(c.extensionSettings.summaryception,{enabled:true,pauseSummarization:false,verbatimTurns:0,turnsPerSummary:1});const {saveSettings}=await import('/script.js');await saveSettings();});
 const read=chatId=>native(async(_,arg)=>{const c=SillyTavern.getContext();const r=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:arg.key,file_name:arg.chatId})});if(!r.ok)throw Error('Read failed');return r.json();},{key:fixture.key,chatId});
 const openChat=async chatId=>{if(await p.locator('#chat-screen').isVisible())await p.locator('#back').click();await p.locator('[data-page="chats"]').click();await p.locator('.chat-open').filter({has:p.getByText(chatId,{exact:true})}).first().click();await p.waitForFunction(id=>document.querySelector('#subtitle').textContent===id,chatId);};
 const confirm=async()=>{await p.locator('#avatar').click();await p.getByRole('button',{name:'Character actions',exact:true}).click();await p.locator('#character-new-chat').click();await p.waitForFunction(()=>document.querySelector('#new-chat-confirm').open&&!document.querySelector('#new-chat-apply').disabled);};
 const settled=async()=>{await p.waitForFunction(()=>!document.querySelector('#new-chat-confirm').open&&document.querySelector('#status').textContent==='New chat saved · greeting ready'||document.querySelector('#new-chat-confirm').open&&!document.querySelector('#new-chat-apply').disabled&&document.querySelector('#new-chat-status').textContent!=='Saving and verifying the new greeting…',null,{timeout:60000});if(await p.locator('#new-chat-confirm').isVisible())throw Error(await p.locator('#new-chat-status').textContent());};
 const recover=async()=>{await p.locator('#new-chat-cancel').click();if(await p.locator('#asset-editor').isVisible())await p.locator('#close-asset').click();await p.locator('#review').click();await p.locator('#queue-review').waitFor({state:'visible'});};
 await openChat(fixture.names[0]);await confirm();check(!await p.locator('#new-chat-delete-current').isChecked(),'optional deletion is off by default');
 await p.locator('#new-chat-cancel').click();check(await p.locator('#asset-editor').isVisible(),'Cancel returns to Character');check((await read(fixture.names[0])).length===2,'Cancel keeps the saved source');
 await p.locator('#close-asset').click();await confirm();await p.locator('#new-chat-apply').click();await settled();const keptNew=await p.locator('#subtitle').textContent();
 let saved=await read(keptNew);check(saved.length===2&&saved[1].mes==='Native main greeting','fresh chat contains the actual native main greeting');check(saved[1].swipes[1]==='Native alternative greeting','native saved greeting alternatives are retained');
 check(!JSON.stringify(saved[0].chat_metadata.summaryception??{}).includes('Old retained Memory')&&!saved[0].chat_metadata.stm.settings,'new chat inherits settings without copying old chat Memory');
 let source=await read(fixture.names[0]);check(source[0].unknown_header.keep===42&&source[1].extra.foreign===42&&source[1].foreign.native,'starting a chat preserves unknown native source/header fields');check(source[0].chat_metadata.summaryception.layers[0][0].text==='Old retained Memory','kept source retains its Memory');
 check((await health()).requests===requests,'new-chat selection makes no AI request');
 await openChat(fixture.names[1]);const old=await read(fixture.names[1]);await confirm();await p.locator('#new-chat-delete-current').check();check(await p.locator('#new-chat-apply').textContent()==='Start new & delete current','confirmation clearly names both actions');
 await p.locator('#new-chat-apply').click();await settled();const replacement=await p.locator('#subtitle').textContent();check((await read(fixture.names[1])).length===0,'optional deletion removes the captured source');check((await read(replacement)).length===2,'replacement greeting is persisted before old chat deletion');
 await p.locator('#undo').click();await p.waitForFunction(()=>document.querySelector('#status').textContent==='Changes applied',null,{timeout:60000});source=await read(fixture.names[1]);
 check(source[0].unknown_header.keep===old[0].unknown_header.keep&&source[1].foreign.native,'Undo restores unknown header and message fields');check(JSON.stringify(source[0].chat_metadata.summaryception)===JSON.stringify(old[0].chat_metadata.summaryception),'Undo restores original valid Memory');check((await read(replacement)).length===2,'Undo also keeps the new chat');
 // Simulate deletion completing on ST while the acknowledgement is lost.
 await openChat(fixture.names[2]);await confirm();await p.locator('#new-chat-delete-current').check();let deleteCalls=0;
 await p.route('**/api/chats/delete',async route=>{const body=route.request().postDataJSON();if(body.avatar_url===fixture.key&&body.chatfile===fixture.names[2]+'.jsonl'){deleteCalls++;await route.fetch();await route.abort('connectionfailed');}else await route.continue();});
 await p.locator('#new-chat-apply').click();await p.waitForFunction(()=>document.querySelector('#new-chat-status').textContent.includes('Nothing will be repeated automatically'),null,{timeout:60000});
 check(await p.locator('#new-chat-apply').isDisabled(),'uncertain mutation disables a repeat attempt');check((await read(fixture.names[2])).length===0,'lost acknowledgement happens after actual native deletion');
 const pending=await p.evaluate(()=>JSON.parse(localStorage.getItem('stm.pending-changes.v1')));check(pending.length===1&&pending[0].argument.before.header.unknown_header.keep===42,'durable pending work contains the full restoration copy');
 const uncertainNew=pending[0].argument.newChatId;check((await read(uncertainNew)).length===2,'unacknowledged operation has a real saved replacement');await p.unroute('**/api/chats/delete');
 await ready();check(await p.locator('#review').isVisible(),'reload requires explicit saved-work review');check(deleteCalls===1&&(await health()).requests===requests,'restart does not replay deletion or issue a paid request');
 await p.locator('#review').click();await p.getByRole('button',{name:'Restore old chat',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#queue-review').open,null,{timeout:60000});
 source=await read(fixture.names[2]);check(source.length===2&&source[0].unknown_header.keep===42,'restart review restores the deleted source and opaque header');check((await read(uncertainNew)).length===2,'restart recovery leaves the replacement intact');
 // An independently changed saved source invalidates the captured confirmation.
 await openChat(fixture.names[3]);await confirm();await native(async(_,arg)=>{const c=SillyTavern.getContext(),headers=c.getRequestHeaders();let r=await fetch('/api/chats/get',{method:'POST',headers,body:JSON.stringify({avatar_url:arg.key,file_name:arg.chatId})});const rows=await r.json();rows[0].chat_metadata.foreign.updated='external';r=await fetch('/api/chats/save',{method:'POST',headers,body:JSON.stringify({avatar_url:arg.key,file_name:arg.chatId,chat:rows})});if(!r.ok)throw Error('Fixture external save failed');},{key:fixture.key,chatId:fixture.names[3]});
 await p.locator('#new-chat-apply').click();await p.waitForFunction(()=>!document.querySelector('#new-chat-apply').disabled&&document.querySelector('#new-chat-status').textContent.includes('Saved chat does not match'),null,{timeout:60000});
 check((await read(fixture.names[3]))[0].chat_metadata.foreign.updated==='external','stale confirmation preserves independent native edits');check((await p.evaluate(()=>JSON.parse(localStorage.getItem('stm.pending-changes.v1')))).length===0,'pre-write conflict is not queued for a later automatic attempt');
 await p.locator('#new-chat-cancel').click();await p.locator('#close-asset').click();
 // New saved readback is corrupted only in transit; persistence mismatch keeps source.
 await openChat(fixture.names[4]);await confirm();await p.locator('#new-chat-delete-current').check();
 await p.route('**/api/chats/get',async route=>{const body=route.request().postDataJSON();if(body.avatar_url!==fixture.key||!body.file_name.startsWith('Conversation ')){await route.continue();return;}const response=await route.fetch(),rows=await response.json();if(rows[0]?.chat_metadata?.stm?.newChat){rows[1].mes='Corrupted readback fixture';await route.fulfill({response,json:rows});}else await route.fulfill({response});});
 await p.locator('#new-chat-apply').click();await p.waitForFunction(()=>document.querySelector('#new-chat-status').textContent.includes('Nothing will be repeated automatically'),null,{timeout:60000});await p.unroute('**/api/chats/get');
 check((await read(fixture.names[4])).length===2,'failed greeting verification preserves the old source');await recover();await p.getByRole('button',{name:'Discard this change',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#queue-review').open);
 // First-click Send, browsing ownership and Stop against the resulting native card.
 await native(async()=>{await window.stmExtensions.get('summaryception').run({action:'settings',value:{enabled:false}});});
 await openChat(fixture.names[0]);await p.locator('#draft').fill('[slow] workflow generation ownership');await p.locator('#send').click();await p.locator('#avatar').click();await p.getByRole('button',{name:'Character actions',exact:true}).click();
 check(await p.locator('#character-new-chat').isDisabled(),'first-click generation blocks new-chat writes without idle waits');await p.keyboard.press('Escape');await p.locator('.character-chat-line').click();await p.getByRole('button',{name:keptNew,exact:true}).click();await p.locator('#close-asset').click();await p.locator('#stop').click();await p.waitForFunction(()=>['Reply saved','Reply stopped'].includes(document.querySelector('#status').textContent),null,{timeout:60000});
 check((await read(fixture.names[0])).length>=3&&(await read(keptNew)).length===2,'selector browsing and Stop retain captured generation ownership');
 for(const width of [320,390,430]){await p.setViewportSize({width,height:844});await confirm();const box=await p.locator('#new-chat-confirm').boundingBox();check(box.x>=0&&box.x+box.width<=width,`confirmation fits ${width}px`);await p.screenshot({path:`/tmp/stm-new-chat-ui/confirmation-${width}.png`});await p.keyboard.press('Escape');check(await p.locator('#asset-editor').isVisible(),`Back dismisses only confirmation at ${width}px`);await p.locator('#close-asset').click();}
 check(errors.length===0,'no frontend page errors');fs.mkdirSync('/tmp/stm-new-chat-ui',{recursive:true});fs.writeFileSync('/tmp/stm-new-chat-ui/result.json',JSON.stringify({passed,fixture,errors},null,2));await browser.close();console.log(`${passed} new-chat UI checks passed`);
})().catch(async e=>{if(p){fs.mkdirSync('/tmp/stm-new-chat-ui',{recursive:true});await p.screenshot({path:'/tmp/stm-new-chat-ui/failure.png'}).catch(()=>{});console.error(await p.evaluate(()=>({status:document.querySelector('#status').textContent,confirmation:document.querySelector('#new-chat-status').textContent,pending:localStorage.getItem('stm.pending-changes.v1')})).catch(()=>null));}if(browser)await browser.close();throw e;});
