// Uses only the explicitly prepared mock fixture. No private ST data or paid requests.
const assert=require('node:assert/strict'),fs=require('node:fs');
const marker=JSON.parse(fs.readFileSync('/tmp/pocket-release-engine/.pocket-tavern.json'));
if(!marker.mock)throw Error('Prepared mock fixture required');
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
let passed=0;const check=(value,label)=>{assert.ok(value,label);passed++;console.log('PASS '+label);};
module.exports=(async()=>{
 const browser=await chromium.launch({headless:true});let saved;
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await p.goto('http://127.0.0.1:8123/st-mobile/');await p.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:60000});};
 const native=(fn,arg)=>p.locator('#engine').contentFrame().locator('body').evaluate(fn,arg);
 const findFields=async name=>{const scroller=p.locator('#landing');await scroller.evaluate(async e=>{e.scrollTop=0;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});for(let step=0;step<80;step++){const fields=p.locator('.character-card').filter({has:p.getByText(name,{exact:true})});const box=await fields.count()?await fields.first().boundingBox():null,area=await scroller.boundingBox();if(box&&box.y>=area.y+60&&box.y+box.height<=area.y+area.height)return fields;await scroller.evaluate(async(e,delta)=>{e.scrollTop+=delta;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);},box?box.y-(area.y+area.height/2):500);}throw Error('Fixture not found');};
 try{
 await ready();saved=await native(async()=>{const c=SillyTavern.getContext();if(c.chatCompletionSettings.custom_url!=='http://127.0.0.1:8124/v1')throw Error('Local mock provider required');const w=await import('/scripts/world-info.js');return structuredClone({personas:c.powerUserSettings.personas,descriptors:c.powerUserSettings.persona_descriptions,charLore:w.world_info.charLore});});
 const name=`! Association QA ${Date.now()}`,long='A linked persona with a very long name that must stay readable in the bottom sheet';
 const record=await native(async(_,arg)=>{const c=SillyTavern.getContext(),w=await import('/scripts/world-info.js'),u=await import('/scripts/utils.js'),s=await import('/script.js');const data={name:arg.name,description:'Association fixture',first_mes:'Hello',extensions:{world:'QA missing primary',foreign:42},creator_notes:'Notes'};const form=new FormData();form.append('avatar',new File([JSON.stringify({spec:'chara_card_v2',spec_version:'2.0',data})],'card.json',{type:'application/json'}));form.append('file_type','json');const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:form});const key=(await r.json()).file_name+'.png';await c.getCharacters();Object.assign(c.powerUserSettings.personas,{'association-one.png':arg.long,'association-two.png':'Second native persona'});Object.assign(c.powerUserSettings.persona_descriptions,{'association-one.png':{connections:[{type:'character',id:key},{type:'chat',id:'Keep chat link'}],opaque:42},'association-two.png':{connections:[{type:'character',id:key}]}});w.world_info.charLore??=[];w.world_info.charLore.push({name:u.getCharaFilename(null,{manualAvatarKey:key}),extraBooks:['QA missing additional','QA missing additional'],opaque:42});await s.saveSettings();const r2=await fetch('/api/characters/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:key})});return {key,card:(await r2.json()).data};},{name,long});
 await ready();await p.locator('[data-page="characters"]').click();await (await findFields(name)).click();await p.locator('#asset-editor').waitFor({state:'visible'});
 let release,hit;const gate=new Promise(r=>release=r),started=new Promise(r=>hit=r);
 await p.route('**/api/worldinfo/list',async route=>{hit();await gate;await route.continue();});
 try{
    await p.getByRole('button',{name:'Connect lorebook',exact:true}).click();await started;
    // This delay simulates a slow native file read, not an idle wait before Send.
    await p.waitForTimeout(1200);
    check((await p.locator('#character-lorebook-picker').innerText()).includes('Loading saved lorebooks'),'loading remains visible across normal activity polling');
    await p.locator('#character-lorebook-picker').getByRole('button',{name:'Back',exact:true}).click();check(await p.locator('#character-lorebook-picker').isHidden()&&await p.locator('#asset-editor').isVisible(),'visible Back works while native book list is loading');
    const response=p.waitForResponse(r=>r.url().endsWith('/api/worldinfo/list'));release();await response;check(await p.locator('#character-lorebook-picker').isHidden(),'late list response does not reopen a dismissed picker');
    check(errors.length===0,'no product page errors');console.log('Character association loading UI: '+passed+' checks passed');
 }finally{release();await p.unroute('**/api/worldinfo/list');}
 }finally{if(saved)await native(async(_,saved)=>{const c=SillyTavern.getContext(),w=await import('/scripts/world-info.js'),s=await import('/script.js');c.powerUserSettings.personas=saved.personas;c.powerUserSettings.persona_descriptions=saved.descriptors;if(saved.charLore===undefined)delete w.world_info.charLore;else w.world_info.charLore=saved.charLore;await s.saveSettings();},saved).catch(e=>{console.error('Fixture restoration failed',e);process.exitCode=1;});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
