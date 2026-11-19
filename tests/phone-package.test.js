import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {prepare}=require('../phone-package/prepare-test.cjs');
const {update}=require('../phone-package/update-test.cjs');
const {patchEngine}=require('../phone-package/compatibility.cjs');
test('phone preparation isolates data and config, preserves source, and refuses repeat or wrong-version installation',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-installer-test-'));
    try {
        const source=path.join(root,'engine'),target=path.join(root,'test'),bundle=path.join(root,'bundle');
        for(const dir of ['public','src','default/content','node_modules','data']) fs.mkdirSync(path.join(source,dir),{recursive:true});
        fs.writeFileSync(path.join(source,'package.json'),JSON.stringify({version:'1.19.0'}));
        fs.writeFileSync(path.join(source,'server.js'),'// fixture');
        fs.mkdirSync(path.join(source,'public/scripts'),{recursive:true});
        fs.writeFileSync(path.join(source,'public/scripts/tokenizers.js'),"import { characters, event_types, other } from \"/script.js\";\nconst data = await jQuery.ajax({\n                async: true,\n                type: 'POST', //\n                url: tokenizerEndpoint,\n                data: JSON.stringify([message]),\n                dataType: 'json',\n                contentType: 'application/json',\n            });");
        const sourceServer="name: getCookieSessionName(),\napp.get('/csrf-token', (req, res) => {\n        res.json({\n            'token': csrfSyncProtection.generateToken(req),\n        });\n    });";
        fs.writeFileSync(path.join(source,'src/server-main.js'),sourceServer);
        fs.writeFileSync(path.join(source,'public/script.js'),"async function firstLoadInit() {\nconst tokenResponse = await fetch('/csrf-token');\n        const tokenData = await tokenResponse.json();\n        token = tokenData.token;\n}");
        fs.writeFileSync(path.join(source,'src/fetch-patch.js'),"const filePath = path.resolve(fileURLToPath(url));\n    const isUnderServerDirectory = isPathUnderParent(serverDirectory, filePath);\nif (!isUnderServerDirectory) throw new Error(\"Requested file path is outside of the server directory.\");");
        fs.mkdirSync(path.join(source,'node_modules/@jsquash/png/codec'),{recursive:true});
        fs.writeFileSync(path.join(source,'node_modules/@jsquash/png/codec/test.wasm'),'WASM FIXTURE');
        fs.writeFileSync(path.join(source,'default/config.yaml'),'fixture: default');
        fs.writeFileSync(path.join(source,'default/content/settings.json'),'{}');
        fs.writeFileSync(path.join(source,'config.yaml'),'PRIVATE CONFIG');
        fs.writeFileSync(path.join(source,'data/secret.json'),'PRIVATE DATA');
        for(const dir of ['frontend','extension']) {fs.mkdirSync(path.join(bundle,dir),{recursive:true});fs.writeFileSync(path.join(bundle,dir,'index.js'),'// fixture');}
        fs.writeFileSync(path.join(bundle,'mock-model.mjs'),'// fixture');
        fs.writeFileSync(path.join(bundle,'start.cjs'),'// fixture launcher');
        for(const name of ['log-supervisor.cjs','diagnostics-server.cjs','diagnostics-viewer.cjs','update-core.cjs','compatibility.cjs','package-staging.cjs'])fs.copyFileSync(path.resolve('phone-package',name),path.join(bundle,name));
        fs.writeFileSync(path.join(bundle,'proxy.cjs'),'// updated proxy fixture');
        fs.writeFileSync(path.join(bundle,'frontend/index.html'),'fixture page');
        const alias=path.join(root,'source-alias');fs.symlinkSync(source,alias,'dir');
        assert.throws(()=>prepare(source,path.join(alias,'nested-copy'),bundle),/outside your regular ST/);
        assert.equal(fs.existsSync(path.join(source,'nested-copy')),false);
        prepare(source,target,bundle);
        assert.equal(fs.existsSync(path.join(target,'data')),false);
        assert.equal(fs.readFileSync(path.join(target,'config.yaml'),'utf8'),'fixture: default');
        assert.equal(fs.readFileSync(path.join(source,'data/secret.json'),'utf8'),'PRIVATE DATA');
        assert.equal(fs.readFileSync(path.join(source,'config.yaml'),'utf8'),'PRIVATE CONFIG');
        assert.equal(fs.existsSync(path.join(source,'public/st-mobile')),false);
        assert.equal(fs.realpathSync(path.join(target,'node_modules')),path.join(source,'node_modules'));
        const settings=JSON.parse(fs.readFileSync(path.join(target,'default/content/settings.json')));
        assert.equal(settings.oai_settings.custom_url,'http://127.0.0.1:8124/v1');
        fs.writeFileSync(path.join(target,'keep.txt'),'keep');
        fs.mkdirSync(path.join(target,'data'),{recursive:true});fs.writeFileSync(path.join(target,'data/chat.jsonl'),'SAVED CHAT');
        fs.writeFileSync(path.join(target,'config.yaml'),'USER TEST CONFIG');
        const serverBefore=fs.readFileSync(path.join(target,'src/server-main.js'),'utf8');
        assert.match(serverBefore,/pocket-tavern-test-/);
        assert.match(serverBefore,/Cache-Control.*no-store/);
        assert.match(fs.readFileSync(path.join(target,'public/script.js'),'utf8'),/token = await initializePocketSession/);
        assert.ok(fs.existsSync(path.join(target,'public/scripts/pocket-session-init.js')));
        assert.match(fs.readFileSync(path.join(target,'public/scripts/tokenizers.js'),'utf8'),/headers: getRequestHeaders/);
        assert.equal(fs.readFileSync(path.join(target,'.pocket-wasm/png/codec/test.wasm'),'utf8'),'WASM FIXTURE');
        assert.match(fs.readFileSync(path.join(target,'src/fetch-patch.js'),'utf8'),/if \(!isUnderServerDirectory\) throw/);
        const result=update(target,bundle);
        assert.equal(fs.readFileSync(path.join(target,'data/chat.jsonl'),'utf8'),'SAVED CHAT');
        assert.equal(fs.readFileSync(path.join(target,'config.yaml'),'utf8'),'USER TEST CONFIG');
        assert.equal(fs.readFileSync(path.join(target,'src/server-main.js'),'utf8'),serverBefore);
        assert.ok(fs.existsSync(path.join(result.backup,'src/server-main.js')));
        assert.equal(fs.readFileSync(path.join(source,'src/server-main.js'),'utf8'),sourceServer);
        const combined=path.join(root,'combined');
        prepare(source,combined,bundle,{combined:true,copyDependencies:true,mock:false});
        assert.ok(!fs.lstatSync(path.join(combined,'node_modules')).isSymbolicLink());
        assert.equal(JSON.parse(fs.readFileSync(path.join(combined,'default/content/settings.json'))).oai_settings.chat_completion_source,'openrouter');
        assert.equal(fs.existsSync(path.join(combined,'data')),false);
        const {readLaunch}=require('../phone-package/start.cjs');
        assert.equal(readLaunch(combined).commands.length,1);
        assert.deepEqual(readLaunch(combined).ports,[8123]);
        assert.throws(()=>readLaunch(combined,true),/separate --mock/);
        fs.mkdirSync(path.join(combined,'data/default-user'),{recursive:true});
        fs.writeFileSync(path.join(combined,'data/default-user/settings.json'),'USER SETTINGS');
        fs.mkdirSync(path.join(combined,'.pocket-proxy/node_modules'),{recursive:true});
        fs.writeFileSync(path.join(combined,'.pocket-proxy/index.cjs'),'// old proxy');
        fs.writeFileSync(path.join(combined,'.pocket-proxy/node_modules/keep'),'DEPENDENCIES');
        const combinedResult=update(combined,bundle);
        assert.equal(fs.readFileSync(path.join(combined,'data/default-user/settings.json'),'utf8'),'USER SETTINGS');
        assert.ok(fs.existsSync(path.join(combinedResult.backup,'start.cjs')));
        assert.equal(fs.readFileSync(path.join(combined,'.pocket-proxy/index.cjs'),'utf8'),'// updated proxy fixture');
        assert.equal(fs.readFileSync(path.join(combined,'.pocket-proxy/node_modules/keep'),'utf8'),'DEPENDENCIES');
        assert.equal(fs.readFileSync(path.join(combinedResult.backup,'.pocket-proxy/index.cjs'),'utf8'),'// old proxy');
        // A combined update uses its retained unpatched source and own dependencies.
        fs.writeFileSync(path.join(source,'public/script.js'),'changed source');
        update(combined,bundle);
                // A changed source must fail before updating any existing test code/data.
        fs.writeFileSync(path.join(source,'public/scripts/tokenizers.js'),'unfamiliar');
        assert.throws(()=>update(target,bundle),/Refusing to patch/);
        assert.equal(fs.readFileSync(path.join(target,'data/chat.jsonl'),'utf8'),'SAVED CHAT');
        assert.equal(fs.readFileSync(path.join(target,'src/server-main.js'),'utf8'),serverBefore);

        assert.throws(()=>prepare(source,target,bundle),/already exists/);
        assert.equal(fs.readFileSync(path.join(target,'keep.txt'),'utf8'),'keep');
        fs.writeFileSync(path.join(source,'package.json'),JSON.stringify({version:'1.18.0'}));
        const invalid=path.join(root,'invalid');assert.throws(()=>prepare(source,invalid,bundle),/requires ST 1.19.0/);
        assert.equal(fs.existsSync(invalid),false);
    } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('data import preserves standard files, leaves source untouched and refuses merging',()=>{
    const {importData}=require('../phone-package/import-data.cjs');
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'pocket-import-test-'));
    try{
        const source=path.join(root,'old/data/default-user'),target=path.join(root,'combined');
        fs.mkdirSync(source,{recursive:true});fs.mkdirSync(target);
        fs.writeFileSync(path.join(source,'settings.json'),'{}');fs.mkdirSync(path.join(source,'chats'));fs.writeFileSync(path.join(source,'chats/test.jsonl'),'ST CHAT');
        fs.writeFileSync(path.join(target,'.pocket-tavern.json'),JSON.stringify({version:1,mode:'combined',mock:false}));fs.writeFileSync(path.join(target,'package.json'),JSON.stringify({version:'1.19.0'}));
        const linked=path.join(root,'linked-target'),outside=path.join(root,'outside');fs.mkdirSync(linked);fs.mkdirSync(outside);
        fs.copyFileSync(path.join(target,'.pocket-tavern.json'),path.join(linked,'.pocket-tavern.json'));fs.copyFileSync(path.join(target,'package.json'),path.join(linked,'package.json'));fs.symlinkSync(outside,path.join(linked,'data'),'dir');
        assert.throws(()=>importData(source,linked),/must not be a symlink/);assert.equal(fs.existsSync(path.join(outside,'default-user')),false);
        const destination=importData(source,target);
        assert.equal(fs.readFileSync(path.join(destination,'chats/test.jsonl'),'utf8'),'ST CHAT');assert.equal(fs.readFileSync(path.join(source,'chats/test.jsonl'),'utf8'),'ST CHAT');
        assert.throws(()=>importData(source,target),/already has user data/);
        assert.equal(fs.readFileSync(path.join(destination,'chats/test.jsonl'),'utf8'),'ST CHAT');
    }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('repair reports a stalled update instead of exiting quietly as success',async()=>{
    const {guardUnsettled}=require('../phone-package/repair-pocket.cjs');let beforeExit,messages=[];
    guardUnsettled(new Promise(()=>{}),{listen:handler=>beforeExit=handler,fail:message=>messages.push(message)});beforeExit();assert.match(messages[0],/Repair stopped: the update stalled/);
    messages=[];await guardUnsettled(Promise.reject(Error('bad zip')),{listen:()=>{},fail:message=>messages.push(message)});assert.match(messages[0],/Repair stopped: bad zip/);
    messages=[];await guardUnsettled(Promise.resolve(),{listen:()=>{},fail:message=>messages.push(message)});assert.deepEqual(messages,[]);
});
