// Real STM DOM at phone width against the isolated ST 1.19.1 fixture (8123).
const {chromium}=require(process.env.STM_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const origin=process.env.STM_TEST_ORIGIN||'http://127.0.0.1:8123';
const out=process.env.STM_UI_OUTPUT||'/tmp/stm-home-ui';fs.mkdirSync(out,{recursive:true});
let passed=0;const ok=(v,n)=>{assert.ok(v,n);passed++;console.log('PASS '+n);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/st-mobile/');
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 // The app opens on Home; tapping Home again would resume the latest chat.
 await page.waitForSelector('.home-page');
 await page.waitForSelector('.home-page');
 const text=await page.locator('.home-page').innerText();
 ok(!/A little place|Make yourself at home/.test(text),'no splash tagline');
 ok(await page.locator('#home-status').getAttribute('data-tone')==='ok'||await page.locator('#home-status').getAttribute('data-tone')==='idle','status dot shows a calm state');
 ok(/0\.\d+\.\d+/.test(await page.locator('#home-version').innerText()),'version in the corner');
 ok(await page.locator('.home-continue, .home-start').count()===1,'Continue card or first-story card');
 ok(await page.locator('.home-cast-item').count()>=2,'portrait row with at least one character and +');
 const previews=await page.locator('.home-continue-line, .home-recent-line').allInnerTexts();
 ok(previews.every(v=>!/[*`<>]|^#|\]\(/.test(v)),'previews have no markdown or tags');
 ok(await page.locator('#bottom-nav [data-page="home"]').getAttribute('class').then(c=>/current/.test(c||'')),'Home highlighted in nav');
 await page.screenshot({path:`${out}/home.png`});
 await page.locator('#app-settings').click();await page.waitForSelector('.sp-page');
 ok(await page.locator('#page-title').textContent()==='Settings','gear opens Settings');
 await page.locator('#page-back').click();await page.waitForSelector('.home-page');
 ok(true,'back returns to Home');
 ok(errors.length===0,'no page errors '+errors.join('|'));
 console.log(`${passed} checks passed`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
