// 0.7.14 regressions from the 0.7.13 phone test, against the isolated ST 1.19.0 fixture (8123) + mock model (8124).
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.POCKET_TEST_ORIGIN||'http://127.0.0.1:8123';
let passed=0;const ok=(v,n)=>{assert.ok(v,n);passed++;console.log('PASS '+n);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/st-mobile/');
 await p.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 const engine=p.locator('#engine').contentFrame().locator('body');
 const title=()=>p.locator('#page-title').textContent();
 // Escape is a close request, the desktop stand-in for Android Back.
 const back=async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(600);};
 const stamp=Date.now().toString(36);
 // Earlier suites may leave Summaryception on; these checks need an idle engine.
 await engine.evaluate(async()=>{const s=SillyTavern.getContext().extensionSettings.summaryception;if(s)s.enabled=false;await window.pocketExtensions?.get('summaryception')?.run({action:'stop'});});
 await p.waitForFunction(()=>!document.querySelector('#memory-notice')||document.querySelector('#memory-notice').hidden||!/Summarizing|Waiting|Choice/.test(document.querySelector('#memory-notice-text').textContent),null,{timeout:60000});
 await p.waitForTimeout(2500);
 const chatFile=(key,id)=>engine.evaluate(async(_,[key,id])=>{const c=SillyTavern.getContext();const r=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:key,file_name:id})});return r.json();},[key,id]);
 const fresh=async()=>{if(await p.locator('#chat-screen').isVisible())await p.locator('#back').click();await p.locator('[data-page="chats"]').click();await p.locator('#page-new-chat').click();await p.locator('.fresh-character').filter({hasText:'Seraphina'}).first().click();await p.waitForFunction(()=>!document.querySelector('#chat-screen').hidden,null,{timeout:30000}).catch(async e=>{throw Error(e.message+' · '+await p.locator('#landing-status').textContent()+' · '+await p.locator('#status').textContent());});return p.locator('#subtitle').textContent();};
 const send=async t=>{await p.locator('#draft').fill(t);await p.locator('#send').click();await p.waitForFunction(()=>document.querySelector('#stop').hidden&&/Reply saved/.test(document.querySelector('#status').textContent),null,{timeout:60000});};

 // A fresh chat for the character the engine already has open starts from its greeting only.
 const first=await fresh();await send('first chat message');
 const second=await fresh();
 const saved=await chatFile('default_Seraphina.png',second);
 ok(second!==first&&saved.length===2&&!saved[1].is_user,'fresh chat for the open character holds only its greeting');

 // Memory reads and writes the chat on screen, and its page never paints over other pages.
 await p.locator('#back').click();await p.locator('[data-page="chats"]').click();
 await p.locator('.chat-open').filter({has:p.getByText(first,{exact:true})}).first().click();
 await p.waitForFunction(id=>document.querySelector('#subtitle').textContent===id,first);
 await p.locator('#settings-button').click();await p.locator('#open-memory').click();await p.waitForSelector('.memory-page .memory-section');
 ok(await p.locator('.memory-chat-name').textContent()===first,'Memory names the chat on screen, not the engine’s last chat');
 await p.locator('#page-back').click();await p.locator('#back').click();await p.locator('[data-page="wi"]').click();await p.waitForSelector('.wi-page');
 await p.waitForTimeout(4500);
 ok(await p.locator('#page-content .memory-section').count()===0&&await p.locator('.wi-page').isVisible(),'Memory polling never paints over another page');

 // Android Back follows the on-screen back arrow and keeps unsaved World Info edits behind a prompt.
 const B=`Back ${stamp}`;
 await p.getByRole('button',{name:'+ Book'}).click();await p.locator('#wi-modal input').fill(B);await p.locator('#wi-modal').getByRole('button',{name:'Create'}).click();
 await p.waitForSelector(`.wi-book:has-text("${B}") .wi-add`);await p.locator(`.wi-book:has-text("${B}") .wi-add`).click();await p.waitForSelector('.wi-editor');
 await p.locator('.wi-editor input').first().fill('Unsaved title');
 await back();
 ok(await title()==='Entry'&&/Discard changes/.test(await p.locator('dialog[open]').first().textContent()),'Back on an edited entry asks before discarding');
 await p.locator('dialog[open]').getByRole('button',{name:'Cancel'}).click();await p.waitForTimeout(300);
 ok(await title()==='Entry'&&await p.locator('.wi-editor input').first().inputValue()==='Unsaved title','Cancel keeps the entry and its typing');
 await back();await p.locator('dialog[open]').getByRole('button',{name:'Discard'}).click();await p.waitForTimeout(400);
 ok(await title()==='World Info','Discard returns to World Info, not Home');
 await p.locator('#page-wi-activation').click();await p.waitForTimeout(400);await back();
 ok(await title()==='World Info','Back from Activation returns to World Info');

 // Saving a persona with a portrait returns to the list without an error.
 await p.locator('[data-page="personas"]').click();await p.getByRole('button',{name:/Create persona/}).click();
 const persona=`Pic ${stamp}`;await p.locator('.persona-editor-fields input').first().fill(persona);
 await p.locator('.persona-editor-avatar input[type=file]').setInputFiles({name:'a.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+tm+0AAAAASUVORK5CYII=','base64')});
 await p.locator('.persona-save').click();await p.waitForFunction(()=>document.querySelector('#page-title').textContent==='Personas',null,{timeout:30000});
 await p.waitForFunction(n=>document.querySelector('#page-content').textContent.includes(n),persona,{timeout:15000}).catch(()=>{});const toastText=await p.locator('#toast-text').textContent(),listed=await p.locator('#page-content').textContent();ok(!/draft/.test(toastText)&&listed.includes(persona),'persona with a portrait saves and returns to Personas');
 await back();ok(await title()==='Pocket Tavern','Back from a tab page goes Home');

 // Importing a card with an embedded lorebook offers to import and link it.
 const card={spec:'chara_card_v2',spec_version:'2.0',data:{name:`Lore ${stamp}`,description:'d',personality:'',scenario:'',first_mes:'Hi',mes_example:'',creator_notes:'',system_prompt:'',post_history_instructions:'',alternate_greetings:[],tags:[],creator:'',character_version:'',extensions:{},
  character_book:{name:`Book ${stamp}`,entries:[{id:0,keys:['moss'],secondary_keys:[],comment:'Moss',content:'Moss grows.',constant:false,selective:false,insertion_order:100,enabled:true,position:'before_char',extensions:{}},{id:1,keys:['fern'],secondary_keys:[],comment:'Fern',content:'Ferns.',constant:false,selective:false,insertion_order:100,enabled:true,position:'before_char',extensions:{}}]}}};
 await p.locator('[data-page="characters"]').click();await p.locator('#characters-import').click();
 await p.locator('#character-import-file').setInputFiles({name:'lore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(card))});
 await p.waitForSelector('#wi-modal[open]',{timeout:30000});
 ok(/embedded lorebook, “Book .*” \(2 entries\)/.test(await p.locator('#wi-modal').textContent()),'import offers the embedded lorebook');
 await p.locator('#wi-modal').getByRole('button',{name:'Import'}).click();await p.waitForTimeout(2500);
 await p.locator('[data-page="wi"]').click();await p.waitForSelector(`.wi-book:has-text("Book ${stamp}")`);
 ok(/2 entries[\s\S]*Primary/.test(await p.locator(`.wi-book:has-text("Book ${stamp}")`).first().textContent()),'embedded lorebook imported and linked as primary');

 // The engine reloads by itself after its frame is lost (a backgrounded Android tab).
 await p.evaluate(()=>{document.getElementById('engine').src='about:blank';});
 await p.waitForFunction(()=>/disconnected/i.test(document.querySelector('#status').textContent),null,{timeout:40000});
 await p.evaluate(()=>{const now=Date.now;Date.now=()=>now()+60000;});
 await p.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 ok(true,'engine reconnects without pressing Reconnect');

 ok(errors.length===0,'no page errors '+errors.join('|'));
 console.log(`${passed} checks passed`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
