const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const tokenizerOld=`const data = await jQuery.ajax({
                async: true,
                type: 'POST', //
                url: tokenizerEndpoint,
                data: JSON.stringify([message]),
                dataType: 'json',
                contentType: 'application/json',
            });`;
const tokenizerNew=`const response = await fetch(tokenizerEndpoint, {
                method: 'POST', headers: getRequestHeaders(),
                body: JSON.stringify([message]),
            });
            if (!response.ok) throw new Error(\`Tokenizer request failed: HTTP \${response.status}\`);
            const data = await response.json();`;
function replaceExact(source,oldText,newText,label){
    if(source.includes(newText))return source;
    if(source.split(oldText).length!==2)throw Error(`${label} source does not match tested ST 1.19.0. Refusing to patch it.`);
    return source.replace(oldText,newText);
}
function patchEngine(target,source,{apply=true,cookieRoot=target}={}){
    const read=name=>fs.readFileSync(path.join(target,name),'utf8');
    const cookieName='pocket-tavern-test-'+crypto.createHash('sha256').update(fs.realpathSync(cookieRoot)).digest('hex').slice(0,12);
    let tokenizers=replaceExact(read('public/scripts/tokenizers.js'),tokenizerOld,tokenizerNew,'Tokenizer');
    if(!tokenizers.includes('import { getRequestHeaders, characters, event_types,')) tokenizers=replaceExact(tokenizers,'import { characters, event_types,','import { getRequestHeaders, characters, event_types,','Tokenizer imports');
    let server=read('src/server-main.js');
    const cookieNew=`name: '${cookieName}',`;
    // Each test folder keeps a stable cookie name across restarts and updates.
    server=replaceExact(server,'name: getCookieSessionName(),',cookieNew,'Session cookie');
    let client=read('public/script.js');
    const sessionOld=`const tokenResponse = await fetch('/csrf-token');
        const tokenData = await tokenResponse.json();
        token = tokenData.token;`;
    const sessionNew=`token = await initializePocketSession();`;
    client=replaceExact(client,sessionOld,sessionNew,'Startup session');
    const sessionImport="import { initializePocketSession } from './scripts/pocket-session-init.js';";
    if(!client.includes(sessionImport))client=sessionImport+'\n'+client;
    const tokenRouteOld=`app.get('/csrf-token', (req, res) => {
        res.json({
            'token': csrfSyncProtection.generateToken(req),
        });
    });`;
    const tokenRouteNew=`app.get('/csrf-token', (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.vary('Cookie');
        res.json({
            'token': csrfSyncProtection.generateToken(req),
        });
    });`;
    server=replaceExact(server,tokenRouteOld,tokenRouteNew,'Token response cache');
    const wasm=[];
    const dependencies=path.join(source,'node_modules/@jsquash');
    function scan(folder){
        if(!fs.existsSync(folder))return;
        for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
            const file=path.join(folder,entry.name);
            if(entry.isDirectory())scan(file);
            else if(entry.isFile()&&entry.name.endsWith('.wasm')){
                const relative=path.join('.pocket-wasm',path.relative(dependencies,file));
                wasm.push({file,real:fs.realpathSync(file),relative});
            }
        }
    }
    scan(dependencies);
    const aliases={};for(const item of wasm){aliases[path.resolve(item.file)]=item.relative;aliases[item.real]=item.relative;}
    let fetchPatch=read('src/fetch-patch.js');
    const fetchOld=`const filePath = path.resolve(fileURLToPath(url));
    const isUnderServerDirectory = isPathUnderParent(serverDirectory, filePath);`;
    const fetchNew=`let filePath = path.resolve(fileURLToPath(url));
    // Only exact codec WASM files copied into this test server are aliased.
    const pocketWasmAliases = ${JSON.stringify(aliases)};
    if (Object.hasOwn(pocketWasmAliases, filePath)) filePath = path.join(serverDirectory, pocketWasmAliases[filePath]);
    const isUnderServerDirectory = isPathUnderParent(serverDirectory, filePath);`;
    // An update uses the original copied file before regenerating aliases.
    fetchPatch=replaceExact(fetchPatch,fetchOld,fetchNew,'Codec fetch');
    if(apply){
        for(const item of wasm){const dest=path.join(target,item.relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(item.file,dest);}
        fs.writeFileSync(path.join(target,'public/scripts/tokenizers.js'),tokenizers);
        fs.writeFileSync(path.join(target,'src/server-main.js'),server);
        fs.writeFileSync(path.join(target,'public/script.js'),client);
        fs.copyFileSync(path.join(__dirname,'session-init.mjs'),path.join(target,'public/scripts/pocket-session-init.js'));
        fs.writeFileSync(path.join(target,'src/fetch-patch.js'),fetchPatch);
    }
    return {cookieName,wasmFiles:wasm.length};
}
module.exports={patchEngine,replaceExact};
