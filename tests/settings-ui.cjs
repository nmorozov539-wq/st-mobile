// Real Pocket DOM at phone width against the isolated ST 1.19.0 fixture (8123) + mock model (8124).
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const origin=process.env.POCKET_TEST_ORIGIN||'http://127.0.0.1:8123';
const out=process.env.POCKET_UI_OUTPUT||'/tmp/pocket-settings-ui';fs.mkdirSync(out,{recursive:true});
let passed=0;const ok=(v,n)=>{assert.ok(v,n);passed++;console.log('PASS '+n);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/favicon|404|ERR_|Failed to load resource/.test(m.text()))errors.push(m.text());});
 await page.goto(origin+'/st-mobile/');
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 const shot=n=>page.screenshot({path:`${out}/${n}.png`});
 // The app opens on Home; tapping Home again would resume the latest chat.
 await page.waitForSelector('.home-page');
 await page.locator('#app-settings').click();
 await page.waitForSelector('.sp-page');
 ok(await page.locator('#page-title').textContent()==='Settings','settings title');
 ok(!(await page.locator('#bottom-nav').isVisible()),'bottom nav hidden');
 ok(await page.locator('#settings-connection').isVisible()&&await page.locator('#settings-presets').isVisible()&&await page.locator('#settings-appearance').isVisible(),'grouped settings home');
 await page.locator('#settings-connection').click();await page.waitForSelector('.sp-connection');
 ok(await page.locator('#page-title').textContent()==='Connection','connection page');
 const endpoint=page.locator('.sp-field input[type=url]');
 const original=await endpoint.inputValue();
 ok(original==='http://127.0.0.1:8124/v1','real endpoint loaded: '+original);
 ok(await page.getByRole('switch',{name:'Use proxy'}).getAttribute('aria-checked')==='false','proxy off for direct endpoint');
 await shot('connection');
 await page.getByRole('switch',{name:'Use proxy'}).click();
 ok(await endpoint.inputValue()==='http://127.0.0.1:8001/api/v1','proxy on sets proxy endpoint');
 ok(/not detected/i.test(await page.locator('.sp-note.warn').textContent()),'honest message when no proxy answers');
 await page.getByRole('switch',{name:'Use proxy'}).click();
 ok(await endpoint.inputValue()===original,'proxy off restores the direct endpoint');
 await page.getByRole('button',{name:'Test message'}).click();
 await page.waitForSelector('.sp-reply',{timeout:60000});
 ok(/Test reply/.test(await page.locator('.sp-reply').textContent()),'test reply shown with model');
 await shot('test-result');
 await page.locator('.sp-primary').click();
 await page.waitForFunction(()=>/Connected|Not connected/.test(document.querySelector('.sp-page').innerText)&&!document.querySelector('.sp-primary')?.disabled,null,{timeout:60000});
 ok(true,'connect finished');
 // editing the endpoint must not steal the next tap (regression: full re-render on change)
 await endpoint.click(); await endpoint.fill(original);
 const keyField=page.locator('.sp-field input[type=password]');
 await keyField.click(); await page.keyboard.type('abc');
 ok(await page.evaluate(()=>document.activeElement?.type)==='password','focus stays in the key field after editing the endpoint');
 ok(await keyField.inputValue()==='abc','typed key text survives');
 await keyField.fill('');
 // appearance
 await page.locator('#page-back').click();await page.locator('#settings-appearance').click();
 ok(await page.getByRole('switch',{name:'Generation time'}).getAttribute('aria-checked')==='true','generation time default on');
 ok(await page.getByRole('switch',{name:'Clock timestamp'}).getAttribute('aria-checked')==='false','clock default off');
 const slider=page.getByLabel('Chat text size');
 await slider.fill('20');
 ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.sp-preview .bubble')).fontSize)==='20px','text size applies to preview live');
 await page.getByRole('button',{name:'Spacious'}).click();
 ok(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--chat-line'))==='1.95','spacing applied');
 await page.getByRole('button',{name:'Plain'}).click();
 ok(await page.evaluate(()=>document.documentElement.dataset.background)==='plain','plain background applied');
 await page.getByRole('switch',{name:'Token count'}).click();
 ok(/312 tokens/.test(await page.locator('.sp-preview').textContent()),'preview shows enabled detail');
 await shot('appearance');
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 const kept=await page.evaluate(()=>({line:document.documentElement.style.getPropertyValue('--chat-line'),bg:document.documentElement.dataset.background,font:document.documentElement.style.getPropertyValue('--chat-font')}));
 ok(kept.line==='1.95'&&kept.bg==='plain'&&kept.font==='20px','preferences persist after reload');
 // restore defaults for later runs
 await page.evaluate(()=>localStorage.removeItem('pocket-tavern.appearance.v1'));
 // The app opens on Home; tapping Home again would resume the latest chat.
 await page.waitForSelector('.home-page');await page.locator('#app-settings').click();await page.waitForSelector('.sp-page');
 await page.locator('#page-back').click();
 ok(await page.locator('#page-title').textContent()==='Pocket Tavern','back returns to Home');
 ok(errors.length===0,'no page errors '+errors.join('|'));
 console.log(`${passed} checks passed`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
