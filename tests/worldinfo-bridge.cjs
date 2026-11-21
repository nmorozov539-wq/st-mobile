// Exercises the World Info runtime against a real isolated ST 1.19.0 fixture (port 8123, mock model on 8124).
const {chromium}=require(process.env.STM_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.STM_TEST_ORIGIN||'http://127.0.0.1:8123';
let passed=0;const ok=(v,n)=>{assert.ok(v,n);passed++;console.log('PASS '+n);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/st-mobile/');
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Engine ready',null,{timeout:90000});
 const frame=page.locator('#engine').contentFrame().locator('body');
 const run=(argument)=>frame.evaluate(async(_,argument)=>{
  window.__wi??=(await import('/scripts/extensions/third-party/st-mobile-experiment/worldinfo.js')).createWorldInfoRuntime(()=>SillyTavern.getContext());
  try{return {ok:await window.__wi.run(argument)};}catch(e){return {error:e.code||String(e),message:e.message};}
 },argument);
 const good=async a=>{const r=await run(a);assert.ok(!r.error,`${a.action}: ${r.error} ${r.message}`);return r.ok;};
 const bad=async(a,code)=>{const r=await run(a);assert.equal(r.error,code,`${a.action} should fail with ${code}: ${JSON.stringify(r)}`);};
 const stamp=Date.now().toString(36);const B=`Bridge ${stamp}`;

 let lib=await good({action:'list'});ok(Array.isArray(lib.books)&&lib.activation,'library lists with activation');
 await good({action:'createBook',name:B});
 await bad({action:'createBook',name:B.toUpperCase()},'NAME_EXISTS');
 await bad({action:'createBook',name:'bad/name'},'INVALID_NAME');
 let book=await good({action:'book',name:B});ok(book.entries.length===0,'new book is empty');
 let r=await good({action:'addEntry',name:B,revision:book.revision,changes:{comment:'First',content:'Hello',key:['alpha']}});
 ok(r.entries.length===1&&r.uid===0,'entry added');
 r=await good({action:'addEntry',name:B,revision:r.revision,changes:{comment:'Second',constant:true}});
 ok(r.entries.length===2&&r.entries[1].strategy==='constant','constant entry added in order');
 await bad({action:'saveEntry',name:B,uid:0,revision:'stale',changes:{content:'x'}},'STALE_BOOK');
 let e=await good({action:'entry',name:B,uid:0});
 r=await good({action:'saveEntry',name:B,uid:0,revision:e.revision,keyText:'beta, /gam+a/i',keysecondaryText:'delta',changes:{selective:true,selectiveLogic:3,position:4,depth:3,role:1,probability:40,useProbability:true,scanDepth:5,sticky:2,triggers:['normal','swipe'],characterFilterNames:['Moss'],characterFilterExclude:true,matchScenario:true}});
 ok(r.fields.key.length===2&&r.fields.position===4,'entry fields saved');
 const disk=await good({action:'export',name:B});
 const d=disk.data.entries[0];
 ok(d.selectiveLogic===3&&d.depth===3&&d.role===1&&d.triggers.join()==='normal,swipe'&&d.characterFilter.isExclude&&d.characterFilter.names[0]==='Moss'&&d.matchScenario===true&&d.scanDepth===5,'saved on disk exactly');
 ok(d.key.includes('/gam+a/i'),'regex key kept');
 await bad({action:'saveEntry',name:B,uid:0,revision:r.revision,changes:{position:12}},'INVALID_ARGUMENT');
 r=await good({action:'duplicateEntry',name:B,uid:0,revision:r.revision});ok(r.entries.length===3,'entry duplicated');
 r=await good({action:'deleteEntry',name:B,uid:r.uid,revision:r.revision});ok(r.entries.length===2,'entry deleted');
 // folders
 await good({action:'setFolder',names:[B],folder:'Test folder'});
 lib=await good({action:'list'});ok(lib.books.find(x=>x.name===B)?.folder==='Test folder','folder stored in book');
 ok((await good({action:'export',name:B})).data.entries[0].key.length===2,'folder move kept entries');
 await good({action:'setFolder',names:[B],folder:null});
 // global
 let g=await good({action:'setGlobal',name:B,on:true});ok(g.globalBooks.includes(B),'global on');
 lib=await good({action:'list'});ok((lib.sources[B]||[]).some(s=>s.type==='global'),'global source shown');
 // rename keeps global
 book=await good({action:'book',name:B});const N=B+' renamed';
 r=await good({action:'renameBook',name:B,newName:N,revision:book.revision});
 lib=await good({action:'list'});ok(lib.books.some(x=>x.name===N)&&!lib.books.some(x=>x.name===B),'renamed');
 ok(lib.globalBooks.includes(N)&&!lib.globalBooks.includes(B),'global link relocated');
 // duplicate + delete
 book=await good({action:'book',name:N});
 const dup=await good({action:'duplicateBook',name:N,revision:book.revision});ok(dup.name!==N&&dup.entries.length===2,'book duplicated');
 const imp=await good({action:'importBook',name:N,data:{entries:[{keys:['k'],content:'cb',enabled:true,extensions:{},id:1}],name:'CB'}});ok(imp.name!==N&&imp.entries.length===1,'character-book import converted and renamed');
 await bad({action:'importBook',data:{nope:1}},'INVALID_ARGUMENT');
 // a hand-made or converted book may be missing fields the editor relies on
 const rough=await good({action:'importBook',name:'Rough '+stamp,data:{entries:{0:{uid:0,content:'x',key:'not-a-list',comment:null}}}});
 const roughEntry=await good({action:'entry',name:rough.name,uid:0});
 ok(Array.isArray(roughEntry.fields.key)&&Array.isArray(roughEntry.fields.triggers)&&Array.isArray(roughEntry.fields.keysecondary),'malformed entry fields come back as lists');
 ok(roughEntry.fields.comment===''&&typeof roughEntry.fields.content==='string','missing text fields come back as text');
 { const b=await good({action:'book',name:rough.name}); await good({action:'deleteBook',name:rough.name,revision:b.revision}); }
 // activation
 const before=(await good({action:'activation'})).activation;
 await bad({action:'configureActivation',changes:{world_info_depth:5000}},'INVALID_ARGUMENT');
 const a=await good({action:'configureActivation',changes:{world_info_depth:before.world_info_depth===7?8:7,world_info_case_sensitive:!before.world_info_case_sensitive}});
 ok(a.activation.world_info_depth!==before.world_info_depth,'activation saved and verified');
 await good({action:'configureActivation',changes:before});
 // cleanup
 for(const n of [N,dup.name,imp.name]){const b=await good({action:'book',name:n});await good({action:'deleteBook',name:n,revision:b.revision});}
 await good({action:'setGlobal',name:N,on:false}).catch(()=>{});
 lib=await good({action:'list'});ok(![N,dup.name,imp.name].some(n=>lib.books.some(b=>b.name===n)),'books deleted');
 ok(errors.length===0,'no page errors '+errors.join('|'));
 console.log(`${passed} checks passed`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
