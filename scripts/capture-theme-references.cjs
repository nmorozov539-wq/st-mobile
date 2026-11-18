const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),write=process.argv.includes('--write');
const output=write?path.join(root,'docs/theme-references'):'/tmp/pocket-theme-references';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname),file=path.resolve(root,`.${pathname}`);
 if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data);});
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const open=async id=>{await page.goto(`http://127.0.0.1:${server.address().port}/tests/fixtures/theme-reference.html?theme=${id}`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');};
  for(const [id,name] of [['hearth','hearth-chat.png'],['paper','light-paper-chat.png']]){
   for(const viewport of [{width:320,height:640},{width:390,height:844},{width:430,height:844},{width:768,height:1024}]){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce',colorScheme:id==='paper'?'light':'dark'});await open(id);
    await page.evaluate(()=>document.documentElement.style.setProperty('--chat-font','24px'));
    const result=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth+1,motion:getComputedStyle(document.documentElement).getPropertyValue('--motion-fast').trim(),scheme:getComputedStyle(document.documentElement).colorScheme}));
    if(!result.fits||result.motion!=='0ms'||result.scheme!== (id==='paper'?'light':'dark'))throw Error(`${id} failed ${viewport.width}px stress: ${JSON.stringify(result)}`);
   }
   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference',colorScheme:id==='paper'?'light':'dark'});await open(id);await page.screenshot({path:path.join(output,name)});
  }
  if(errors.length)throw Error(`Page errors: ${errors.join(' | ')}`);
 }
 finally{await browser.close();server.close();}
 console.log(output);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
