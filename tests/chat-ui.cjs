// Real Pocket DOM + isolated ST 1.19.0 + local mock only. Never use user data.
// POCKET_PLAYWRIGHT_MODULE points at an installed Playwright package.
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.POCKET_TEST_ORIGIN||'http://127.0.0.1:8123';
const output=process.env.POCKET_UI_OUTPUT||'/tmp/pocket-chat-ui';
fs.mkdirSync(output,{recursive:true});
let browser,page,passed=0;
const check=(value,name)=>{assert.ok(value,name);passed++;console.log(`PASS ${name}`);};
const health=async()=>{const r=await fetch('http://127.0.0.1:8124/health');assert.ok(r.ok);return r.json();};
const native=async(fn,arg)=>page.locator('#engine').contentFrame().locator('body').evaluate(fn,arg);
const ready=()=>page.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:60000});
const read=target=>native(async(_,target)=>{const ctx=SillyTavern.getContext();const r=await fetch('/api/chats/get',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({avatar_url:target.characterKey,file_name:target.chatId})});return r.json();},target);
const queued=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-tavern.pending-changes.v1')||'[]'));
const drained=()=>page.waitForFunction(()=>JSON.parse(localStorage.getItem('pocket-tavern.pending-changes.v1')||'[]').length===0&&!document.querySelector('#send').hidden&&document.querySelector('#review').hidden&&!['Applying changes…','Changes pending'].includes(document.querySelector('#pending-status').textContent),null,{timeout:60000});
async function openChat(name){if(await page.locator('#chat-screen').isVisible())await page.locator('#back').click();await page.locator('[data-page="chats"]').click();await page.locator('.chat-open').filter({has:page.getByText(name,{exact:true})}).first().click();await page.waitForFunction(name=>!document.querySelector('#chat-screen').hidden&&document.querySelector('#subtitle').textContent===name,name);}
async function menu(index){const selector=index===undefined?'.byline button':`article[data-index="${index}"] .byline button`;await page.locator(selector).last().click();await page.waitForFunction(()=>document.querySelector('#message-menu').open);}
async function chooseModel(scope,id){await page.locator(`#model-scopes [data-scope="${scope}"]`).click();const row=page.getByRole('button',{name:`Select ${id}`,exact:true});for(let i=0;i<40&&await row.count()===0;i++)await page.locator('#model-scroll').evaluate(async e=>{e.scrollTop+=Math.max(60,e.clientHeight*.8);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await row.click();await page.waitForFunction(()=>/Selection (saved|pending)/.test(document.querySelector('#model-feedback').textContent));}
async function send(text){await page.locator('#draft').fill(text);await page.locator('#send').click();}
async function saved(){await page.waitForFunction(()=>document.querySelector('#status').textContent==='Reply saved'&&!document.querySelector('#send').hidden,null,{timeout:60000});}
async function touchSwipe(){await page.evaluate(()=>{window.pocketTouchAudit=[];const start=performance.now();for(const name of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,e=>window.pocketTouchAudit.push({name:e.type,time:Math.round(performance.now()-start),x:e.clientX,y:e.clientY,target:e.target.tagName,selected:!!getSelection()?.toString()}),{capture:true});});if(await page.locator('#jump').isVisible())await page.locator('#jump').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const box=await page.locator('article[data-index]').last().locator('.bubble').boundingBox(),pane=await page.locator('#messages').boundingBox();const y=Math.max(pane.y+20,Math.min(pane.y+pane.height-25,box.y+box.height-25)),x=Math.min(300,box.x+box.width-30);assert.ok(y>=box.y&&y<=box.y+box.height,'gesture hits visible latest reply text');const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*24,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();console.log('TOUCH '+JSON.stringify(await page.evaluate(()=>window.pocketTouchAudit)));}

const run=(async()=>{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/st-mobile/');await ready();
 const fixture=await native(async()=>{
  const ctx=SillyTavern.getContext();if(ctx.chatCompletionSettings.custom_url!=='http://127.0.0.1:8124/v1')throw Error('Refusing non-mock provider');
  const memory=window.pocketExtensions?.get('summaryception');if(!memory)throw Error('Install adapted Summaryception in the fixture');
  await memory.run({action:'settings',value:{enabled:false}});
  const c=ctx.characters.find(c=>c.name==='Moss');if(!c)throw Error('Isolated Moss fixture missing');
  const stamp=crypto.randomUUID().slice(0,6),base=structuredClone(ctx.extensionSettings.pocket_tavern.global);
  const post=async(url,body)=>{const r=await fetch(url,{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(body)});if(!r.ok)throw Error(`${url}: ${r.status}`);return r.text();};
  const legacy={enabled:true,foreign:{keep:'character'},copy:{...base,model:'st-mobile-mock-alt',generation:{...base.generation,temperature:.43}}};
  await post('/api/characters/merge-attributes',{avatar:c.avatar,data:{extensions:{pocket_tavern:{settings:legacy,foreign:'namespace'}}}});
  const names=['A','B','Unavailable','Long'].map(n=>`Chat phase ${n} ${stamp}`),targets=names.map(chatId=>({characterKey:c.avatar,chatId}));
  const greeting={name:'Moss',is_user:false,mes:'Fixture greeting',send_date:'fixture-greeting',extra:{foreign:'greeting'}};
  const reply={name:'Moss',is_user:false,mes:'Saved fixture reply with native selection.',send_date:'fixture-reply',swipes:['Saved fixture reply with native selection.','Second saved fixture reply.'],swipe_id:0,gen_started:'2026-10-08T10:00:00Z',gen_finished:'2026-10-08T10:00:02Z',swipe_info:[{gen_started:'2026-10-08T10:00:00Z',gen_finished:'2026-10-08T10:00:02Z',extra:{foreign:'swipe'}},{extra:{foreign:'other'}}],extra:{foreign:'reply',reasoning:'Actual fixture reasoning'}};
  for(let i=0;i<targets.length;i++){
    const metadata={integrity:crypto.randomUUID(),foreign:{keep:'chat'},pocket_tavern:{settings:{enabled:i!==1,foreign:'record',copy:{...base,model:i===2?'saved/unavailable-model':'st-mobile-mock',generation:{...base.generation,temperature:.31}}}}};
    if(i===1)metadata.summaryception={layers:[[{text:'Retained fixture memory'}]],summarizedUpTo:0,ghostedIndices:[0]};
    const stableGreeting={...greeting,swipes:[greeting.mes],swipe_id:0,swipe_info:[{send_date:greeting.send_date,extra:{...greeting.extra}}]};
    const messages=i===3?Array.from({length:200},(_,j)=>({...greeting,is_user:j%2===1,send_date:`long-${j}`,mes:`Message ${j}. `+'Long reading fixture. '.repeat(8)})):[i===1?stableGreeting:greeting,{name:'Tester',is_user:true,mes:'Fixture user',send_date:'fixture-user',...(i===1?{extra:{}}:{})},reply];
    await post('/api/chats/save',{avatar_url:c.avatar,file_name:targets[i].chatId,chat:[{chat_metadata:metadata},...messages]});
  }
  ctx.extensionSettings.pocket_tavern.version=1;const {saveSettings}=await import('/script.js');await saveSettings();
  return {targets,names,base,legacy};
 });
 const [a,b,unavailable,long]=fixture.targets;
 await page.reload();await ready();
 check(await native(()=>SillyTavern.getContext().extensionSettings.pocket_tavern.version===3),'v1 global namespace migrates to v3 in native ST');
 await openChat(a.chatId);
 check(await page.locator('#subtitle').textContent()===a.chatId,'multi-chat header shows only chat name');
 check(await page.locator('#model-chip').textContent()==='st-mobile-mock','legacy chat model selection retained');
 const firstCount=(await health()).requests;
 await send('[slow] first-click chat phase');
 await page.waitForFunction(()=>document.querySelector('.stream .bubble')?.textContent.length>10);
 check((await health()).requests===firstCount+1,'first-click Send submits exactly once without an idle wait');
 await page.locator('#model-chip').click();await page.waitForFunction(()=>document.querySelector('#model-list button'));
 await chooseModel('chat','st-mobile-mock-alt');
 await chooseModel('global','st-mobile-mock-1');
 await chooseModel('character','st-mobile-mock-2');
 await page.locator('#model-scopes [data-scope="chat"]').click();await page.locator('#model-inherit').click();await page.waitForFunction(()=>document.querySelector('#model-feedback').textContent.includes('pending'));
 check((await queued()).length===4,'four model scope changes are durably queued while generation owns ST');
 check(await native(()=>SillyTavern.getContext().chatCompletionSettings.custom_model)==='st-mobile-mock','queued changes do not mutate native in-flight model');
 await page.keyboard.press('Escape');await menu(2);await page.locator('#menu-edit').click();await page.getByRole('textbox',{name:'Edit message text',exact:true}).fill('Queued edit of earlier reply');await page.locator('.inline-edit-actions').getByRole('button',{name:'Save',exact:true}).click();check(await native(()=>SillyTavern.getContext().chat[2].mes)==='Saved fixture reply with native selection.','queued history edit does not mutate captured in-flight prompt');
 if(await page.locator('#model-picker').isVisible())await page.keyboard.press('Escape');await openChat(b.chatId);await page.locator('#draft').fill('Independent unsent B draft');
 await page.locator('#model-chip').click();await page.waitForFunction(()=>document.querySelector('#model-list button'));await chooseModel('chat','st-mobile-mock-3');await page.keyboard.press('Escape');
 check(await native((_,a)=>SillyTavern.getContext().chatId===a.chatId,a),'browsing, drafting and scoped choices in B preserve generating target A');
 await page.locator('#stop').click();await drained();
 check((await health()).requests===firstCount+1,'Stop and pending model settlement never replay generation');
 const savedA=await read(a),savedB=await read(b);
 check(savedA.at(-1).mes.length>0&&!savedA.at(-1).is_user,'Stop retains and verifies partial reply on A');check(savedA[3].mes==='Queued edit of earlier reply','queued earlier edit applies while preserving new generation');
 check(await page.locator('#draft').inputValue()==='Independent unsent B draft','draft B survives completion of generation A');
 check(savedB[0].chat_metadata.pocket_tavern.settings.enabled===false&&savedB[0].chat_metadata.pocket_tavern.settings.modelSelection.value==='st-mobile-mock-3','chat model override does not enable preset copy or lose disabled settings');
 check(savedA[0].chat_metadata.pocket_tavern.settings.modelSelection.enabled===false&&savedA[0].chat_metadata.pocket_tavern.settings.copy.generation.temperature===.31,'inherit model preserves A preset adjustments');
 check(savedB[0].chat_metadata.foreign.keep==='chat','model migration preserves unknown chat metadata');
 await openChat(a.chatId);await send('normal alternatives');await saved();
 check((await health()).lastRequest.model==='st-mobile-mock-2','next request uses independent character model after queued inheritance');if(await page.locator('#jump').isVisible())await page.locator('#jump').click();await page.screenshot({path:`${output}/chat.png`});await page.locator('#settings-button').click();await page.screenshot({path:`${output}/gear.png`});await page.keyboard.press('Escape');
 const beforeAlt=(await health()).requests;
 await menu();await page.locator('#menu-reply').click();await saved();
 check((await read(a)).at(-1).swipes.length===2,'accessible another-reply action retains saved alternative');
 await page.getByRole('button',{name:'Previous saved alternative',exact:true}).last().click();await drained();
 check((await read(a)).at(-1).swipe_id===0,'saved alternative arrow verifies selection');
 await page.getByRole('button',{name:'Next saved alternative',exact:true}).last().click();await drained();
 check((await health()).requests===beforeAlt+1,'saved alternative arrows never generate a paid request');
 await touchSwipe();await saved();
 check((await read(a)).at(-1).swipes.length===3&&(await health()).requests===beforeAlt+2,'deliberate touch overswipe beyond final saved alternative generates once');
 await menu(2);check(await page.locator('#menu-reply').isHidden(),'older message fan excludes another-reply action');await page.keyboard.press('Escape');
 await menu();await page.locator('#menu-edit').click();await page.getByRole('textbox',{name:'Edit message text',exact:true}).fill('Edited saved reply with <script>unsafe</script> text');await page.locator('.inline-edit-actions').getByRole('button',{name:'Save',exact:true}).click();await drained();
 check((await read(a)).at(-1).mes==='Edited saved reply with <script>unsafe</script> text','inline editor verifies saved native text');
 await menu();await page.locator('#menu-copy').click();await page.waitForFunction(()=>document.querySelector('#copy-fallback').open||document.querySelector('#toast-text').textContent==='Copied');
 if(await page.locator('#copy-fallback').isVisible()){check(await page.locator('#copy-text').inputValue()===(await read(a)).at(-1).mes,'clipboard fallback exposes selectable whole message');await page.keyboard.press('Escape');}else check(true,'clipboard copy completes');
 const beforeDelete=await read(a);await menu();await page.locator('#menu-delete').click();
 check((await page.locator('#delete-target').textContent()).includes(a.chatId),'delete confirmation identifies saved target');
 await page.locator('#confirm-delete').click();await drained();check((await read(a)).length===beforeDelete.length-1,'message deletion persists');
 await page.locator('#undo').click();await drained();check((await read(a)).length===beforeDelete.length,'message Undo restores saved history');
 await menu();await page.locator('#menu-select').click();check(await page.locator('#selection-bar').isVisible(),'multi-select remains accessible through message fan');const multiBefore=await read(a);await page.getByRole('checkbox',{name:'Select message 2',exact:true}).check();await page.locator('#delete-selected').click();await page.locator('#confirm-delete').click();await drained();check((await read(a)).length===multiBefore.length-2,'multi-delete persists both selected messages');await page.locator('#undo').click();await drained();check((await read(a)).length===multiBefore.length,'multi-delete Undo restores complete original history');check(await native(()=>SillyTavern.getContext().chat.length)===multiBefore.length-1,'Undo synchronizes restored history into native runtime before next switch');
 const original=await read(a);await menu(2);await page.locator('#menu-fork').click();await page.waitForFunction(()=>document.querySelector('#subtitle').textContent.includes(' · fork '));await drained();
 const forkSource=await read(a);assert.deepEqual({messages:forkSource.slice(1),metadata:forkSource[0].chat_metadata},{messages:original.slice(1),metadata:original[0].chat_metadata});check(true,'fork preserves original saved messages and metadata');
 check(await page.locator('#subtitle').textContent()!==a.chatId,'fork switches only to persisted destination');
 await openChat(b.chatId);await menu(0);await page.locator('#menu-edit').click();await page.getByRole('textbox',{name:'Edit message text',exact:true}).fill('Changed summarized greeting');await page.locator('.inline-edit-actions').getByRole('button',{name:'Save',exact:true}).click();await drained();
 check(await page.locator('#memory-notice').isVisible()&&(await page.locator('#memory-notice-text').textContent()).includes('needs rebuilding'),'history edit keeps invalid Memory visible in chat');
 check((await read(b))[0].chat_metadata.summaryception.layers[0][0].text==='Retained fixture memory','invalidated Memory contents retained');await page.locator('#undo').click();await drained();
 check(!(await read(b))[0].chat_metadata.pocket_tavern.memoryInvalid,'Undo restores valid Memory metadata with history');
 await openChat(unavailable.chatId);await page.locator('#model-chip').click();await page.waitForFunction(()=>document.querySelector('#model-list button'));
 check((await page.locator('#model-effective').textContent())==='saved/unavailable-model'&&(await page.locator('#model-list').innerText()).includes('saved, unavailable'),'unavailable saved model remains visible without replacement');
 await page.locator('#model-expand').click();const fixedBefore=await page.locator('.model-fixed').boundingBox();await page.locator('#model-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);const fixedAfter=await page.locator('.model-fixed').boundingBox();
 check(fixedBefore.y===fixedAfter.y&&await page.locator('#model-effective').isVisible(),'expanded model list scrolls independently of scope and effective information');
 check(await page.locator('#model-list button').count()<30,'model list DOM remains bounded');
 await page.mouse.click(8,20);await page.waitForFunction(()=>!document.querySelector('#model-picker').open);check(true,'outside tap dismisses model panel');await page.locator('#model-chip').click();await page.waitForFunction(()=>document.querySelector('#model-list button'));await page.evaluate(()=>history.back());await page.waitForFunction(()=>!document.querySelector('#model-picker').open);check(await page.locator('#chat-screen').isVisible(),'browser Back dismisses model panel before leaving chat');
 await page.locator('#settings-button').click();await page.evaluate(()=>history.back());await page.waitForFunction(()=>!document.querySelector('#chat-settings').open);check(await page.locator('#chat-screen').isVisible(),'browser Back dismisses gear fan');
 await openChat(long.chatId);check(await page.locator('article[data-index]').count()<35,'long chat keeps bounded message DOM');
 await page.locator('#messages').evaluate(e=>e.scrollTop=Math.max(0,e.scrollHeight-e.clientHeight-120));const scroll=await page.locator('#messages').evaluate(e=>e.scrollTop);await page.locator('#settings-button').click();await page.keyboard.press('Escape');check(Math.abs((await page.locator('#messages').evaluate(e=>e.scrollTop))-scroll)<2,'opening menus preserves reading position');
 const bubble=page.locator('article[data-index] .bubble').first();await bubble.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);const s=getSelection();s.removeAllRanges();s.addRange(r);});await page.waitForTimeout(1100);
 check(await page.evaluate(()=>getSelection().toString().length>0&&!document.querySelector('#message-menu').open),'text selection survives without hold-to-open behavior');await page.evaluate(()=>getSelection().removeAllRanges());
 for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});if(await page.locator('#jump').isVisible())await page.locator('#jump').click();await menu();
    const rects=await page.locator('#message-menu .curved-fan button').evaluateAll(es=>es.filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
    check(rects.every(r=>r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=844),'message fan stays inside '+width+'px viewport');
    check(rects.every(r=>r.width>=48&&r.height>=48)&&rects.every((r,i)=>rects.every((s,j)=>i===j||Math.hypot(r.x-s.x,r.y-s.y)>=48)),'fan touch targets remain separated at '+width+'px');
    await page.screenshot({path:`${output}/actions-${width}.png`});await page.keyboard.press('Escape');
    check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'no horizontal page overflow at '+width+'px');
 }
 await page.setViewportSize({width:390,height:420});await page.locator('#model-chip').click();await page.waitForFunction(()=>document.querySelector('#model-list button'));check(await page.locator('#model-scroll').evaluate(e=>e.clientHeight>50),'model list remains usable with reduced keyboard-like viewport');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await openChat(a.chatId);await page.locator('#name').click();await page.locator('#character-chats').click();check(await page.locator('#history').isVisible()&&(await page.locator('#chat-list').innerText()).includes(a.chatId),'existing Conversations destination remains available through character fields');await page.keyboard.press('Escape');await page.locator('#settings-button').click();await page.locator('#open-preset').click();await page.locator('#preset-panel').waitFor({state:'visible'});check(await page.locator('#preset-panel').isVisible(),'gear Preset retains working destination');await page.keyboard.press('Escape');
 await page.locator('#settings-button').click();await page.locator('#open-persona').click();await page.locator('#setting-persona').waitFor({state:'visible'});check(await page.locator('#setting-persona').isVisible(),'gear Persona retains current native picker destination');await page.keyboard.press('Escape');
 await page.locator('#settings-button').click();await page.locator('#open-memory').click();await page.locator('#memory-panel').waitFor({state:'visible'});check(await page.locator('#memory-panel').isVisible(),'gear Memory retains adapted Summaryception destination');await page.keyboard.press('Escape');
 await send('[fail] explicit error fixture');await page.waitForFunction(()=>!document.querySelector('#send-error').hidden&&!document.querySelector('#send').hidden,null,{timeout:60000});check(await page.locator('#send-error').isVisible(),'provider failure remains visible after native save settlement');
 await page.screenshot({path:`${output}/error.png`}).catch(()=>{});
 if(process.env.POCKET_TEST_RESTART){const requests=(await health()).requests;await send('[slow] restart recovery fixture');await page.waitForFunction(()=>document.querySelector('.stream .bubble')?.textContent.length>10);fs.writeFileSync(`${output}/restart-ready.json`,JSON.stringify({target:a,requests:requests+1}));console.log('RESTART_READY');await global.pocketStopTestEngine?.();await page.waitForFunction(()=>document.querySelector('#recovery-title').textContent==='Engine disconnected'&&document.querySelector('#draft').disabled,null,{timeout:60000});check(true,'engine shutdown exposes disabled recovery state');check(await page.locator('#review').isDisabled(),'review stays disabled until the replacement connection is ready');fs.writeFileSync(`${output}/restart-offline.json`,'offline');await global.pocketStartTestEngine?.();for(let i=0;i<300;i++){try{const r=await fetch(origin+'/csrf-token');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}await page.locator('#reconnect').click();await page.waitForFunction(()=>!document.querySelector('#review').hidden,null,{timeout:60000});await page.locator('#review').click();await page.waitForFunction(()=>document.querySelector('#recovery').hidden,null,{timeout:60000});check((await health()).requests===requests+1,'reconnect and review never replay the interrupted request');check((await read(a)).some(m=>m.mes==='[slow] restart recovery fixture'),'recovery reads the saved originating user message');await send('after explicit reconnect review');await saved();check((await health()).requests===requests+2,'first explicit send after recovery succeeds once');}
 check(errors.length===0,'no frontend JavaScript page errors');const result={passed,targets:fixture.targets,errors,output,restart:!!process.env.POCKET_TEST_RESTART};fs.writeFileSync(`${output}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 await browser.close();
})().catch(async e=>{console.error(e);if(page){console.error(await page.locator('#status').textContent({timeout:2000}).catch(()=>'(page unavailable)'));const pending=await queued();fs.writeFileSync(`${output}/pending-failure.json`,JSON.stringify(pending,null,2));console.error(pending.map(i=>({state:i.state,scope:i.argument.scope,kind:i.argument.kind,target:i.argument.target,value:i.argument.value,error:i.error})));console.error(await native(async(_,items)=>{const {createWorkspace}=await import('/scripts/extensions/third-party/st-mobile-experiment/workspace.js');const w=createWorkspace({getContext:()=>SillyTavern.getContext(),isBusy:()=>true,configuration:{}});const diff=(a,b,path='')=>{if(JSON.stringify(a)===JSON.stringify(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path+'.'+k));return [{path,before:a,actual:b}];};const out=[];for(const i of items){const v=await w.scopes(i.argument.target);out.push({kind:i.argument.kind,scope:i.argument.scope,diff:diff(JSON.parse(i.argument.expected),JSON.parse(v.revision))});}return out;},pending).catch(e=>`Diagnostic unavailable: ${e.message}`));await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});}await browser?.close();process.exit(1);});
module.exports=run;
