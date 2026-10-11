// Drives the real prototype/frontend/memory.js against a stub Summaryception extension. No ST, keys or paid requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const root=path.join(__dirname,'..','prototype','frontend'),fixture=path.join(__dirname,'fixtures','memory-harness.html');
module.exports=(async()=>{
const server=http.createServer((q,r)=>{const name=q.url.split('?')[0].slice(1);const f=name==='memory.js'||name==='memory.css'?path.join(root,name):name===''||name==='harness.html'?fixture:null;if(!f||!fs.existsSync(f)){r.statusCode=404;return r.end();}r.setHeader('content-type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');r.end(fs.readFileSync(f));}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))logs.push('CONSOLE '+m.text())});
let fails=0;const check=(ok,msg,extra)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok&&extra!==undefined)console.log('   got',typeof extra==='string'?extra:JSON.stringify(extra));if(!ok)fails++;};
await page.goto(`http://127.0.0.1:${port}/harness.html`);await page.waitForFunction(()=>window.ready);
const $=(s,o)=>page.locator(s,o),calls=()=>page.evaluate(()=>window.fake.calls.filter(c=>c.action!=='read').map(({id,...c})=>c));
const section=t=>$('details.memory-section',{has:page.locator('summary',{hasText:t})});
const open=async t=>{const d=section(t);if(!(await d.getAttribute('open')!==null))await d.locator('summary').click();return d;};

check((await $('.memory-status').textContent()).startsWith('Ready'),'status line shows Ready');
check((await $('.memory-section').count())===7,'seven collapsible sections');
// saved memories
let d=await open('Saved memories');
check((await d.locator('.memory-layer-tabs button').allTextContents()).join()==='Layer 0 · 2,Layer 1 · 1','layer tabs with counts');
check((await d.locator('.memory-snippet').count())===2,'layer 0 has two snippet cards');
await d.locator('.memory-snippet').first().getByText('Edit',{exact:true}).click();
check(await $('#memory-edit').isVisible(),'edit dialog opens');
await $('#memory-edit textarea').fill('One, edited.');await $('#memory-edit').getByText('Save',{exact:true}).click();
await page.waitForTimeout(150);
check(JSON.stringify((await calls()).at(-1))===JSON.stringify({action:'snippet',value:{op:'edit',layer:0,index:0,expected:'One.',text:'One, edited.'}}),'edit sends expected-text guarded request',(await calls()));
check((await $('.memory-snippet').first().textContent()).includes('One, edited.'),'edited text shown after reread');
check(await page.evaluate(()=>window.fake.refreshes)>=1,'chat refresh requested after write');
// layer 1 has no regenerate
await d.locator('.memory-layer-tabs button').nth(1).click();
check((await $('.memory-snippet').first().getByText('Regenerate').count())===0,'promoted snippets cannot be regenerated');
await $('.memory-layer-tabs button').nth(0).click();
// regenerate
await $('.memory-snippet').nth(1).getByText('Regenerate').click();
check((await $('#memory-confirm h3').textContent())==='Regenerate this memory?','regenerate asks first (cost warning)');
await $('#memory-confirm').getByText('Cancel').click();await page.waitForTimeout(100);
check((await calls()).filter(c=>c.action==='snippet').length===1,'cancelled regenerate sends nothing');
await $('.memory-snippet').nth(1).getByText('Regenerate').click();await $('#memory-confirm').getByRole('button',{name:'Regenerate',exact:true}).click();await page.waitForTimeout(150);
check((await $('.memory-snippet').nth(1).textContent()).includes('Regenerated.'),'regenerate replaces text');
// delete
await $('.memory-snippet').first().getByText('Delete').click();await $('#memory-confirm').getByRole('button',{name:'Delete',exact:true}).click();await page.waitForTimeout(150);
check((await $('.memory-snippet').count())===1,'delete removes one snippet');
// injection preview
d=await open('Injection preview');
check((await d.locator('.memory-injection-text').textContent()).includes('Promoted.'),'injection preview shows block');
await page.evaluate(()=>{window.fake.state.injection='<ctx>CHANGED</ctx>'});await d.getByText('Refresh').click();await page.waitForTimeout(100);
check((await d.locator('.memory-injection-text').textContent()).includes('CHANGED'),'preview refresh rereads');
// turns & layers + save diff
d=await open('Turns & layers');
check(await $('.memory-save-btn').isDisabled(),'save disabled until a change');
await d.locator('label',{hasText:'Recent assistant turns'}).locator('input').fill('12');
await d.locator('label',{hasText:'Maximum layer depth'}).locator('input').fill('7');
check(await $('.memory-save-btn').isEnabled(),'edit enables save');
await page.evaluate(()=>window.fake.calls.length=0);await $('.memory-save-btn').click();await page.waitForTimeout(150);
check(JSON.stringify((await calls())[0])===JSON.stringify({action:'settings',value:{verbatimTurns:12,maxLayers:7}}),'save sends only changed keys',(await calls()));
check(await $('.memory-save-btn').isDisabled(),'save disabled again after saving');
// prompts
d=await open('Summarizer prompts');
const userArea=d.locator('label',{hasText:'Summary prompt'}).locator('textarea');
check(await userArea.evaluate(n=>n.readOnly),'built-in preset prompt is read-only');
await d.locator('label',{hasText:'Prompt preset'}).locator('select').selectOption('custom');
check(!(await userArea.evaluate(n=>n.readOnly))&&await d.locator('.memory-prompt-manager').isVisible(),'custom unlocks editing and shows prompt manager');
await d.locator('.memory-prompt-manager select').selectOption('Mine');await d.getByRole('button',{name:'Load',exact:true}).click();
check((await userArea.inputValue())==='my saved','Load puts the saved prompt in the editor');
await d.locator('label',{hasText:'Prompt name'}).locator('input').fill('Second');await d.getByRole('button',{name:'Save prompt',exact:true}).click();
d=await open('Summarizer prompts');
check((await d.locator('.memory-prompt-manager select option').allTextContents()).join('|').includes('Second'),'Save prompt adds to the list (draft)');
await d.locator('label',{hasText:'Injection wrapper'}).locator('textarea').fill('[mem] {{summary}}');
await d.locator('label',{hasText:'Strip patterns'}).locator('textarea').fill('<a>\n\n<b>');
await page.evaluate(()=>window.fake.calls.length=0);await $('.memory-save-btn').click();await page.waitForTimeout(150);
const sv=(await calls())[0].value;
check(sv.promptPreset==='custom'&&sv.summarizerUserPrompt==='my saved'&&sv.savedCustomPrompts.Second==='my saved'&&sv.injectionTemplate==='[mem] {{summary}}'&&JSON.stringify(sv.stripPatterns)==='["<a>","<b>"]','prompt edits saved as one verified delta');
// connection
d=await open('Summarizer connection');
check((await d.textContent()).includes('main ST connection'),'connection section explains the main connection');
// stats
d=await open('Layer statistics');
check((await d.locator('tr').count())>=3,'statistics table rows');
// maintenance
d=await open('Maintenance');
const [dl]=await Promise.all([page.waitForEvent('download'),d.getByRole('button',{name:'Export memory'}).click()]);
check(dl.suggestedFilename()==='summaryception_Chat_1.json','export downloads a named JSON file');
const exported=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));check(Array.isArray(exported.layers),'exported file holds layers');
const [chooser]=await Promise.all([page.waitForEvent('filechooser'),d.getByRole('button',{name:'Import memory'}).click()]);
await chooser.setFiles({name:'m.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({layers:[[{text:'Imported.'}]],summarizedUpTo:1}))});
await page.waitForSelector('#memory-confirm[open]');check((await $('#memory-confirm h3').textContent())==='Replace this memory?','import confirms replacement');
await page.evaluate(()=>window.fake.calls.length=0);await $('#memory-confirm').getByRole('button',{name:'Import',exact:true}).click();await page.waitForTimeout(200);
check((await calls())[0].action==='import','import sends parsed data');
await d.getByRole('button',{name:'Repair orphans'}).click();await page.waitForTimeout(100);
check((await calls()).some(c=>c.action==='repair'),'repair sends request');
await d.getByRole('button',{name:'Clear memory'}).click();
check((await $('#memory-confirm h3').textContent())==='Clear memory?','clear shows confirmation');
await $('#memory-confirm').getByRole('button',{name:'Cancel'}).click();await page.waitForTimeout(100);
check(!(await calls()).some(c=>c.action==='clear'),'cancel leaves memory untouched');
await d.getByRole('button',{name:'Clear memory'}).click();await $('#memory-confirm').getByRole('button',{name:'Clear memory',exact:true}).click();await page.waitForTimeout(200);
check((await calls()).some(c=>c.action==='clear')&&(await section('Saved memories').textContent()).includes('No summaries yet'),'clear empties memory');
await d.getByRole('button',{name:'Reset to defaults'}).click();await $('#memory-confirm').getByRole('button',{name:'Reset',exact:true}).click();await page.waitForTimeout(150);
check((await calls()).some(c=>c.action==='reset'),'reset sends request');
// catch-up choice card
await page.evaluate(()=>{window.fake.state.busy=true;window.fake.state.backlog={turns:18,calls:6};});await page.waitForTimeout(2300);
check((await $('.memory-status').textContent())==='Memory · Choice needed'&&await $('.memory-catchup-card').isVisible(),'backlog shows the catch-up card');
await $('.memory-catchup-option',{hasText:'Summarize one batch'}).click();await page.waitForTimeout(150);
check(JSON.stringify((await calls()).at(-1))===JSON.stringify({action:'choice',value:'partial'}),'choice sends partial',(await calls()));
await page.evaluate(()=>{window.fake.state.busy=false;});await page.waitForTimeout(2300);
// polling must not steal focus
d=await open('Turns & layers');const f=d.locator('label',{hasText:'Snippets per layer'}).locator('input');await f.focus();await f.fill('25');
await page.evaluate(()=>{window.fake.state.failure='x';});await page.waitForTimeout(2300);
check(await f.evaluate(n=>n===document.activeElement)&&(await f.inputValue())==='25','background poll does not steal focus or reset typing');

check(!logs.length,'no browser errors'+(logs.length?': '+logs.join(' | '):''));check(!(await page.evaluate(()=>window.fake.errors)).length,'no swallowed action errors');
await browser.close();server.close();
if(fails)throw Error(fails+' memory page check(s) failed');
console.log('Memory page UI checks passed.');
})();
