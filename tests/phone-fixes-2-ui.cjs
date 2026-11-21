// 0.7.15 regressions from the 0.7.14 phone test, against the isolated ST 1.19.1 fixture (8123) + mock model (8124).
const {chromium}=require(process.env.STM_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.STM_TEST_ORIGIN||'http://127.0.0.1:8123';
let passed=0;const ok=(v,n)=>{assert.ok(v,n);passed++;console.log('PASS '+n);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const title=()=>p.locator('#page-title').textContent();
 // Escape is a close request, the desktop stand-in for Android Back.
 const back=async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(600);};
 const ready=()=>p.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});

 // Straight after opening: Chats → chat → Memory, then Back walks the same way home without leaving.
 await p.goto(origin+'/st-mobile/');
 // A fresh fixture has no chats yet; start one so the Chats list has a row.
 await ready();await p.locator('[data-page="chats"]').click();await p.waitForTimeout(1000);
 if(!await p.locator('.chat-open').count()){await p.locator('#page-new-chat').click();await p.locator('.fresh-character').first().click();await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden,null,{timeout:30000});}
 await p.goto(origin+'/st-mobile/');
 const startLength=await p.evaluate(()=>history.length);
 await p.locator('[data-page="chats"]').click();await ready();
 await p.waitForSelector('.chat-open');await p.locator('.chat-open').first().click();await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden);
 await p.locator('#settings-button').click();await p.locator('#open-memory').click();await p.waitForSelector('.memory-page .memory-section');
 await back();ok(!(await p.locator('#chat-screen').isHidden()),'Back from Memory returns to the chat');
 await back();ok(await p.locator('#chat-screen').isHidden()&&await title()==='Chats','second Back returns to Chats');
 await back();ok(await title()==='STM','third Back returns Home');
 ok(await p.evaluate(()=>history.length)===startLength,'in-app pages add no browser-history entries Chrome could skip');
 await p.locator('#reconnect').click().catch(async()=>{await p.evaluate(()=>document.getElementById('reconnect').click());});await ready();
 ok(await p.evaluate(()=>history.length)===startLength,'reloading the engine adds no history entry');

 const engine=p.locator('#engine').contentFrame().locator('body');
 const health=async()=>{const r=await fetch('http://127.0.0.1:8124/health');return r.json();};
 const openFirstChat=async()=>{if(!(await p.locator('#chat-screen').isHidden()))return;await p.locator('[data-page="chats"]').click();await p.waitForSelector('.chat-open');await p.locator('.chat-open').first().click();await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden);await p.waitForTimeout(1200);if(await p.locator('#persona-choice').isVisible())await p.locator('#persona-choice [data-close]').click();};
 const send=async t=>{await p.locator('#draft').fill(t);await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#stop').hidden&&/Reply saved/.test(document.querySelector('#status').textContent),null,{timeout:60000}).catch(async e=>{throw Error(e.message+' · '+await p.locator('#status').textContent()+' · '+await p.locator('#send-error').textContent()+' · '+await p.evaluate(()=>[...document.querySelectorAll('dialog[open]')].map(d=>d.id).join(',')));});};
 const toHome=async()=>{for(let i=0;i<6;i++){if(!(await p.locator('#chat-screen').isHidden())||await title()!=='STM'||await p.locator('dialog[open]').count())await back();else break;}};

 // Earlier runs may leave Summaryception on; these checks need an idle engine.
 const memoryOff=()=>engine.evaluate(async()=>{const m=window.stmExtensions?.get('summaryception');await m?.run({action:'stop'});await m?.run({action:'settings',value:{enabled:false}}).catch(()=>{});});
 await memoryOff();await p.waitForTimeout(1500);
 // A failed earlier run may have left ST on DeepSeek; start from the custom mock endpoint.
 const customMock=()=>engine.evaluate(async()=>{const c=SillyTavern.getContext(),s=c.chatCompletionSettings;s.reverse_proxy='';if(s.chat_completion_source!=='custom'){const e=document.querySelector('#chat_completion_source');e.value='custom';e.dispatchEvent(new Event('change',{bubbles:true}));}const g=c.extensionSettings.stm?.global;if(g)g.model='st-mobile-mock';s.custom_model='st-mobile-mock';await c.saveSettings?.();document.querySelector('#api_button_openai')?.click();});
 await customMock();await p.waitForTimeout(3000);

 // Token count: older replies are counted on demand, not only new ones.
 await openFirstChat();await send('older reply for tokens');
 await p.evaluate(()=>{const key='stm.appearance.v1';const v=JSON.parse(localStorage.getItem(key)||'{}');v.details={...(v.details??{}),tokens:true};localStorage.setItem(key,JSON.stringify(v));});
 await p.reload();await ready();await openFirstChat();
 await p.waitForFunction(()=>[...document.querySelectorAll('#messages article:not(.user) .message-detail')].some(n=>/\d+ tokens/.test(n.textContent)&&!n.hidden),null,{timeout:20000});
 ok(true,'older replies show a token count');

 // Regenerating hides the old reply while the new one streams, and choosing an alternative shows no notice.
 const lastText=()=>p.locator('#messages article[data-index]').last().locator('.bubble').textContent();
 await p.locator('#draft').fill('[slow] please');await p.locator('#send').click();
 await p.waitForFunction(()=>document.querySelector('#stop').hidden&&/Reply saved|Reply stopped/.test(document.querySelector('#status').textContent),null,{timeout:90000});
 const lastIndex=await p.locator('#messages article[data-index]').last().getAttribute('data-index');
 await p.locator(`#messages article[data-index="${lastIndex}"] [aria-controls="message-menu"]`).first().click();
 await p.locator('#menu-reply').click();
 await p.waitForSelector('#messages .message.stream',{timeout:30000});
 ok(await p.locator(`#messages article[data-index="${lastIndex}"]`).isHidden(),'the reply being regenerated is hidden while the new one streams');
 await p.locator('#stop').click();
 await p.waitForFunction(()=>document.querySelector('#stop').hidden&&/Reply stopped|Reply saved/.test(document.querySelector('#status').textContent),null,{timeout:60000});
 ok(await p.locator(`#messages article[data-index="${lastIndex}"]`).isVisible(),'the reply is shown again once the new one ends');
 await send('a quick one');
 const quick=await p.locator('#messages article[data-index]').last().getAttribute('data-index');
 await p.locator(`#messages article[data-index="${quick}"] [aria-controls="message-menu"]`).first().click();await p.locator('#menu-reply').click();
 await p.waitForFunction(()=>document.querySelector('#stop').hidden&&/Reply saved/.test(document.querySelector('#status').textContent),null,{timeout:60000});
 await p.locator(`#messages article[data-index="${quick}"] [aria-label="Previous saved alternative"]`).click();await p.waitForTimeout(1500);
 ok(!/Alternative selected/.test(await p.locator('#toast-text').textContent()),'choosing an alternative shows no notice');

 // Summarize now says what happened on a short chat.
 await p.locator('#back').click();await p.locator('[data-page="chats"]').click();await p.locator('#page-new-chat').click();await p.locator('.fresh-character').first().click();
 await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden,null,{timeout:30000});await p.waitForTimeout(800);
 if(await p.locator('#persona-choice').isVisible())await p.locator('#persona-choice [data-close]').click();
 await p.locator('#settings-button').click();await p.locator('#open-memory').click();await p.waitForSelector('.memory-page .memory-section');
 const enable=p.locator('.memory-toggle input').first();if(!await enable.isChecked()){await enable.check();await p.locator('.memory-save-btn').click();await p.waitForFunction(()=>/saved/i.test(document.querySelector('#toast-text').textContent),null,{timeout:30000});}
 await p.locator('.memory-summarize-btn').click();
 await p.waitForFunction(()=>/Nothing to summarize yet|summarized|No new summary|Enable Summaryception/.test(document.querySelector('#toast-text').textContent),null,{timeout:60000});
 const said=await p.locator('#toast-text').textContent();
 ok(/Nothing to summarize yet.*latest \d+ replies/.test(said)||/Enable Summaryception/.test(said),'Summarize now reports its outcome');
 await back();await back();await memoryOff();

 // Preset import: a SillyTavern preset file is added to the list without switching the active preset.
 const presetName=`Imported ${Date.now().toString(36)}`;
 const presetFile={...JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'fixtures/library-preset.json'),'utf8')),name:undefined};
 await openFirstChat();await p.locator('#settings-button').click();await p.locator('#open-preset').click();await p.waitForSelector('#preset-panel[open]');
 await p.waitForFunction(()=>!/Loading presets/.test(document.querySelector('#preset-status').textContent),null,{timeout:30000});
 const activeBefore=await engine.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.preset_settings_openai);
 await p.locator('#preset-choose').click();
 await p.locator('#preset-import-file').setInputFiles({name:`${presetName}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(presetFile))});
 await p.waitForFunction(()=>!/^Importing /.test(document.querySelector('#preset-status').textContent),null,{timeout:60000});
 const importSaid=await p.locator('#preset-status').textContent();ok(importSaid.includes(`Imported “${presetName}”`),'preset file imports · '+importSaid);
 ok(await p.locator(`#preset-list [data-preset="${presetName}"]`).count()===1,'the imported preset is listed');
 ok(await engine.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.preset_settings_openai)===activeBefore,'importing does not switch the active preset');
 await p.locator('#preset-import-file').setInputFiles({name:`${presetName}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(presetFile))});
 await p.waitForFunction(n=>document.querySelector('#preset-status').textContent.includes(n+' (2)'),presetName,{timeout:60000});
 ok(true,'importing the same file again adds a numbered copy');
 await p.locator(`#preset-list [data-preset="${presetName}"]`).click();await p.waitForFunction(()=>!document.querySelector('#preset-main').hidden);
 ok((await p.locator('#preset-name').textContent()).includes(presetName),'the imported preset can be chosen');
 await back();await p.waitForFunction(()=>!document.querySelector('#preset-panel').open);

 // Several personas per character: linking adds, the card lists them, and a new chat asks which to use.
 const stampP=Date.now().toString(36),pa=`Ann ${stampP}`,pb=`Bea ${stampP}`;
 await toHome();
 for(const name of [pa,pb]){await p.locator('[data-page="personas"]').click();await p.getByRole('button',{name:/Create persona/}).click();await p.locator('.persona-editor-fields input').first().fill(name);await p.locator('.persona-save').click();await p.waitForTimeout(500);for(let i=0;i<5&&/Wait for the engine/.test(await p.locator('#page-content').innerText().catch(()=>''));i++){await p.waitForTimeout(2000);await p.locator('.persona-save').click();}await p.waitForFunction(n=>document.querySelector('#page-title').textContent==='Personas'&&document.querySelector('#page-content').textContent.includes(n),name,{timeout:30000}).catch(async e=>{throw Error(e.message+' · '+await title()+' · '+await p.locator('#toast-text').textContent()+' · '+(await p.locator('#page-content').innerText()).slice(0,300));});}
 const freshSeraphina=async()=>{await toHome();await p.locator('[data-page="chats"]').click();await p.locator('#page-new-chat').click();await p.locator('.fresh-character').filter({hasText:'Seraphina'}).first().click();await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden,null,{timeout:30000});await p.waitForTimeout(1500);};
 await freshSeraphina();if(await p.locator('#persona-choice').isVisible())await p.locator('#persona-choice [data-close]').click();
 const linkToCharacter=async name=>{await p.locator('#settings-button').click();await p.locator('#open-persona').click();await p.locator('.persona-list-row').filter({hasText:name}).click();
  // A save that just finished can keep the engine busy for a moment; the app asks to wait, so tap again like a user would.
  for(let i=0;i<8&&await p.locator('#chat-screen').isHidden();i++){await p.waitForTimeout(1500);if(await p.locator('#chat-screen').isHidden()&&/Wait for the engine/.test(await p.locator('#toast-text').textContent()))await p.locator('.persona-list-row').filter({hasText:name}).click();}
  await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden,null,{timeout:30000}).catch(async e=>{throw Error(e.message+' · '+await title()+' · '+await p.locator('#toast-text').textContent()+' · '+await p.locator('#status').textContent());});
  await p.locator('#settings-button').click();await p.locator('#open-persona').click();await p.getByRole('button',{name:'Link…'}).click();await p.locator('#persona-link-targets .persona-link-target').nth(1).click();await p.waitForFunction(n=>document.querySelector('#toast-text').textContent.includes(n+' linked'),name,{timeout:30000});await back();};
 await linkToCharacter(pa);await linkToCharacter(pb);
 ok(!(await p.locator('#persona-replace-confirm').isVisible()),'linking a second persona does not ask to replace the first');
 await p.locator('#name').click();await p.waitForSelector('.character-persona-line');
 const line=await p.locator('.character-persona-line').textContent();
 ok(/\d+ personas · /.test(line)&&line.includes(pa)&&line.includes(pb),'the character lists every linked persona');
 await p.locator('#close-asset').click();
 await freshSeraphina();
 await p.waitForSelector('#persona-choice[open]',{timeout:20000});
 ok((await p.locator('#persona-choice-list').textContent()).includes(pa),'a new chat asks which linked persona to use');
 await p.locator('#persona-choice-list .persona-link-target').filter({hasText:pa}).click();
 await p.waitForFunction(n=>document.querySelector('#toast-text').textContent.includes(n+' will be used in this chat'),pa,{timeout:30000});
 await p.locator('#name').click();await p.waitForSelector('.character-chat-persona');
 ok((await p.locator('.character-chat-persona').textContent()).includes(pa),'the character page shows the chat’s own persona');
 await p.locator('#close-asset').click();
 // Clean up the links so other suites see one persona per character.
 for(const name of [pa,pb]){await p.locator('#name').click();await p.locator('.character-persona-line').click();await p.locator('#character-persona-info li').filter({hasText:name}).getByRole('button',{name:'Remove link'}).click();await p.locator('#character-association-confirm').getByRole('button',{name:'Remove link'}).click();await p.waitForFunction(()=>!document.querySelector('#character-association-confirm').open,null,{timeout:30000});await p.waitForTimeout(800);if(await p.locator('#asset-editor').isVisible())await p.locator('#close-asset').click();}
 ok(true,'each persona link can be removed on its own');

 // DeepSeek: pick it in Settings, connect with a key, choose its model, and chat through it.
 // ST's DeepSeek reverse-proxy field points it at the local mock for this test.
 // ST asks once before using a reverse proxy; that confirmation is pre-answered here.
 await engine.evaluate(async()=>{const url='http://127.0.0.1:8124/v1',c=SillyTavern.getContext(),s=c.chatCompletionSettings;s.reverse_proxy=url;s.proxy_password='';const {getStringHash}=await import('/scripts/utils.js');c.accountStorage.setItem(`Proxy_SkipConfirm_${getStringHash(url)}`,'true');});
 await toHome();await p.locator('#app-settings').click();await p.waitForSelector('.sp-page');
 await p.getByRole('radio',{name:'DeepSeek'}).click();
 ok(await p.locator('.sp-field input[type=url]').count()===0&&/DeepSeek API key/.test(await p.locator('.sp-page').innerText()),'DeepSeek hides the endpoint and asks for its key');
 await p.locator('.sp-field input[type=password]').fill('sk-test-deepseek');await p.locator('.sp-primary').click();
 await p.waitForFunction(()=>/Connected to DeepSeek|Not connected/.test(document.querySelector('.sp-page').innerText)&&!document.querySelector('.sp-primary')?.disabled,null,{timeout:60000}).catch(async e=>{throw Error(e.message+' · '+await p.locator('.sp-page').innerText());});
 ok(/Connected to DeepSeek · \d+ models/.test(await p.locator('.sp-page').innerText()),'Connect loads DeepSeek models');
 const source=await engine.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.chat_completion_source);
 ok(source==='deepseek','ST now uses its DeepSeek connection');
 await p.locator('.sp-with-button select').selectOption('st-mobile-mock-alt');await p.locator('.sp-primary').click();
 await p.waitForFunction(()=>/Connected to DeepSeek/.test(document.querySelector('.sp-page').innerText)&&!document.querySelector('.sp-primary')?.disabled,null,{timeout:60000});
 await back();await openFirstChat();await send('hello deepseek');
 ok((await health()).lastRequest.model==='st-mobile-mock-alt','a chat reply goes through DeepSeek with the chosen model');
 // Back to the OpenAI-compatible mock for the other suites.
 await toHome();await p.locator('#app-settings').click();await p.waitForSelector('.sp-page');
 await p.getByRole('radio',{name:'OpenAI-compatible'}).click();await p.locator('.sp-field input[type=url]').fill('http://127.0.0.1:8124/v1');
 await p.locator('.sp-primary').click();await p.waitForFunction(()=>/Connected|Not connected/.test(document.querySelector('.sp-page').innerText)&&!document.querySelector('.sp-primary')?.disabled,null,{timeout:60000});
 await engine.evaluate(()=>{const s=SillyTavern.getContext().chatCompletionSettings;s.reverse_proxy='';});
 ok(await engine.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.chat_completion_source)==='custom','switching back restores the custom endpoint');

 ok(errors.length===0,'no page errors '+errors.join(' | '));
 console.log(`${passed} checks passed`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
