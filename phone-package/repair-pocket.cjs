#!/usr/bin/env node
// Recovery for the existing combined installation; never prepares/overwrites user data.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const net=require('node:net');const {spawn}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const RELEASE='0.6.2',PREFIX=`pocket-tavern-combined-v${RELEASE}/`;
async function extractKit(archive,destination,engine){
 const yauzl=require(require.resolve('yauzl',{paths:[engine]}));
 await new Promise((resolve,reject)=>yauzl.open(archive,{lazyEntries:true},(error,zip)=>{
  if(error)return reject(error);
  let count=0,total=0;
  zip.on('error',reject);zip.on('end',resolve);
  zip.on('entry',async entry=>{
   try{
    if(!entry.fileName.startsWith(PREFIX)||entry.fileName.split('/').includes('..')||entry.fileName.includes('\\'))throw Error('Unexpected ZIP layout. Use the combined v0.6.2 package.');
    if(((entry.externalFileAttributes>>>16)&0o170000)===0o120000)throw Error('The kit must not contain symbolic links.');
    total+=entry.uncompressedSize;
    if(++count>500||total>20000000||entry.uncompressedSize>5000000)throw Error('The ZIP is larger than the expected prototype kit.');
    const file=path.join(destination,entry.fileName);
    if(entry.fileName.endsWith('/'))fs.mkdirSync(file,{recursive:true});
    else{
     fs.mkdirSync(path.dirname(file),{recursive:true});
     const stream=await new Promise((done,fail)=>zip.openReadStream(entry,(error,value)=>error?fail(error):done(value)));
     await pipeline(stream,fs.createWriteStream(file,{flags:'wx',mode:0o600}));
    }
    zip.readEntry();
   }catch(error){zip.close();reject(error);}
  });zip.readEntry();
 }));
 const bundle=path.join(destination,PREFIX);
 for(const file of ['update-test.cjs','setup-proxy.cjs','proxy.cjs','start.cjs','frontend/index.html','extension/index.js'])if(!fs.existsSync(path.join(bundle,file)))throw Error(`Incomplete ZIP: missing ${file}. Download the verified v0.6.2 package again.`);
 return bundle;
}
function locateArchive(folders){
 const candidates=[];
 for(const folder of new Set(folders)){
  if(!fs.existsSync(folder))continue;
  for(const name of fs.readdirSync(folder))if(name.match(/^pocket-tavern-combined-v([\d.]+)(?:[ (\-].*)?\.zip$/)?.[1]===RELEASE){
   const file=path.join(folder,name);candidates.push({file,time:fs.statSync(file).mtimeMs});
  }
 }
 candidates.sort((a,b)=>b.time-a.time);
 if(!candidates.length)throw Error('Cannot find pocket-tavern-combined-v0.6.2.zip. Put it beside this repair script or in Downloads.');
 return candidates[0].file;
}
function locateProxy(folders){
 const source=folders.find(folder=>fs.existsSync(path.join(folder,'node_modules/wreq-js/package.json')));
 if(!source)throw Error('Cannot find the working proxy dependencies. Run: node repair-pocket.cjs /path/to/package.zip /path/to/or-proxy');
 return source;
}
const portFree=port=>new Promise((resolve,reject)=>{
 const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is busy. Stop the current Pocket Tavern and old proxy with Ctrl+C first; this script does not kill them.`)));
 server.listen(port,'127.0.0.1',()=>server.close(resolve));
});
async function repair({archive,source,target=path.join(os.homedir(),'pocket-tavern'),launch=true}={}){
 const home=os.homedir();target=fs.realpathSync(target);
 const marker=JSON.parse(fs.readFileSync(path.join(target,'.pocket-tavern.json')));
 if(marker.mode!=='combined'||marker.mock||marker.version!==1)throw Error('This repair is for an existing normal combined Pocket Tavern installation.');
 for(const port of [8123,8124,8001])await portFree(port);
 archive=archive||locateArchive([path.dirname(__filename),path.join(home,'storage/downloads'),'/storage/emulated/0/Download']);
 console.log('Using ZIP:',archive);console.log('Updating existing installation:',target);
 const stage=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-repair-'));
 try{
  const bundle=await extractKit(archive,stage,target);
  const result=require(path.join(bundle,'update-test.cjs')).update(target,bundle);
  console.log('Updated code. Existing chats/settings retained. Code backup:',result.backup);
  if(!fs.existsSync(path.join(target,'.pocket-proxy/index.cjs'))){
   source=source||locateProxy([path.join(home,'or-proxy'),path.join(home,'SillyTavern/or-proxy'),path.dirname(__filename)+'/or-proxy']);
   require(path.join(bundle,'setup-proxy.cjs')).setupProxy(source,target,bundle);
   console.log('Installed bundled proxy dependencies from:',source);
  }
  console.log('Launching with --proxy. Look for “OpenRouter TLS-proxy listening on http://127.0.0.1:8001” before ST starts.');
  console.log('After startup, RELOAD the phone browser at http://127.0.0.1:8123/st-mobile/ . Settings must show frontend and engine bridge 0.6.2; choose Custom to see the endpoint field.');
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
 if(launch){
  const child=spawn(process.execPath,[path.join(target,'start.cjs'),'--proxy'],{cwd:target,stdio:'inherit'});
  process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
  process.exitCode=code;
 }
}
module.exports={extractKit,locateArchive,locateProxy,repair};
if(require.main===module)repair({archive:process.argv[2],source:process.argv[3],target:process.argv[4]}).catch(error=>{console.error('Repair stopped:',error.message);process.exitCode=1;});
