#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PACKAGE_VERSION = '0.9.1';
const ENGINE_VERSION = '1.19.0';
const BRIDGE_PROTOCOL = 2;

const PACKAGE_ENTRIES = Object.freeze([
    ...['prepare-test.cjs','start-test.cjs','update-test.cjs','update-from-git.cjs','update-core.cjs','compatibility.cjs','session-init.mjs','PHONE-README.md','prepare.cjs','start.cjs','log-supervisor.cjs','diagnostics-server.cjs','diagnostics-viewer.cjs','import-data.cjs','setup-proxy.cjs','proxy.cjs','repair-pocket.cjs','package-staging.cjs'].map(name => ({source:`phone-package/${name}`, destination:name})),
    {source:'prototype/frontend', destination:'frontend'},
    {source:'prototype/extension', destination:'extension'},
    {source:'vendor/Extension-Summaryception', destination:'summaryception'},
    {source:'LICENSE', destination:'LICENSE'},
    {source:'THIRD_PARTY_NOTICES.md', destination:'THIRD_PARTY_NOTICES.md'},
]);

function hashFile(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function walkFiles(root) {
    const output = [];
    function visit(folder) {
        for (const entry of fs.readdirSync(folder, {withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name))) {
            const file = path.join(folder, entry.name);
            if (entry.isSymbolicLink()) throw Error(`Package staging refuses symbolic links: ${path.relative(root,file)}`);
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile()) output.push(file);
        }
    }
    visit(root);
    return output;
}

function copyEntry(source, destination) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) fs.cpSync(source, destination, {recursive:true, errorOnExist:true, force:false});
    else {
        fs.mkdirSync(path.dirname(destination), {recursive:true});
        fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    }
}

function replaceExact(source, oldText, newText, label) {
    if (!source.includes(oldText)) throw Error(`Cannot stage ${label}: the selected source no longer matches the tested package transform.`);
    return source.replace(oldText, newText);
}

function replaceOptional(source, oldText, newText) {
    return source.includes(oldText) ? source.replace(oldText,newText) : source;
}

function transformPackage(destination) {
    const bridge = path.join(destination,'extension/index.js');
    const bridgeSource = fs.readFileSync(bridge,'utf8');
    const boundary = '} else {\nconst panel';
    if (!bridgeSource.includes(boundary)) throw Error('Cannot stage extension/index.js: diagnostic-overlay boundary not found.');
    fs.writeFileSync(bridge, bridgeSource.split(boundary)[0] + '}\n');

    const manifestPath = path.join(destination,'extension/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    manifest.display_name = 'Pocket Tavern · phone prototype';
    manifest.version = PACKAGE_VERSION;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest,null,2) + '\n');

    const htmlPath = path.join(destination,'frontend/index.html');
    let html = fs.readFileSync(htmlPath,'utf8');
    for (const [from,to] of [
        ['PC prototype','phone prototype'],
        ['LOCAL PROTOTYPE','COMBINED PROTOTYPE'],
        ['ST 1.19.0 · mock model','ST 1.19.0'],
        ['Local test: try [slow] to stop a reply, or [fail] to test recovery.','Generation and saved conversations are managed by SillyTavern.'],
    ]) html = replaceOptional(html,from,to);
    fs.writeFileSync(htmlPath,html);

    const runtimePath = path.join(destination,'extension/runtime.js');
    fs.writeFileSync(runtimePath, replaceOptional(fs.readFileSync(runtimePath,'utf8'),'Connect ST to the local mock model first.','Open the test engine and connect it to the local mock model first.'));

    const mockSource = path.join(destination,'mock-model.mjs');
    // mock-model.mjs is generated from the repository script, not copied as a package entry.
    fs.writeFileSync(mockSource, replaceExact(fs.readFileSync(path.join(destination,'.package-source-mock-model.js'),'utf8'),'The PC bridge works!','The phone bridge works!','mock model'));
    fs.rmSync(path.join(destination,'.package-source-mock-model.js'));
}

function verifyMatchedBuild(destination) {
    const build = fs.readFileSync(path.join(destination,'frontend/build.js'),'utf8');
    const buildVersion = build.match(/FRONTEND_BUILD\s*=\s*['"]([^'"]+)/)?.[1];
    const protocol = Number(build.match(/BRIDGE_PROTOCOL\s*=\s*(\d+)/)?.[1]);
    const manifest = JSON.parse(fs.readFileSync(path.join(destination,'extension/manifest.json'),'utf8'));
    if (buildVersion !== PACKAGE_VERSION || manifest.version !== PACKAGE_VERSION) throw Error(`Package build mismatch: frontend ${buildVersion ?? 'unknown'}, bridge ${manifest.version ?? 'unknown'}, expected ${PACKAGE_VERSION}.`);
    if (protocol !== BRIDGE_PROTOCOL) throw Error(`Package bridge protocol mismatch: ${protocol || 'unknown'}, expected ${BRIDGE_PROTOCOL}.`);
}

function writePackageManifest(destination,{sourceCommit=null}={}) {
    const files = {};
    for (const file of walkFiles(destination)) {
        const relative = path.relative(destination,file).split(path.sep).join('/');
        if (relative === 'pocket-package-manifest.json') continue;
        files[relative] = {sha256:hashFile(file), bytes:fs.statSync(file).size};
    }
    const manifest = {
        schemaVersion:1,
        packageVersion:PACKAGE_VERSION,
        engineVersion:ENGINE_VERSION,
        bridgeProtocol:BRIDGE_PROTOCOL,
        sourceCommit,
        files,
    };
    fs.writeFileSync(path.join(destination,'pocket-package-manifest.json'), JSON.stringify(manifest,null,2) + '\n');
    return manifest;
}

function verifyPackage(destination) {
    const manifestPath = path.join(destination,'pocket-package-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    if (manifest.schemaVersion !== 1 || manifest.packageVersion !== PACKAGE_VERSION || manifest.engineVersion !== ENGINE_VERSION || manifest.bridgeProtocol !== BRIDGE_PROTOCOL) throw Error('Package manifest compatibility metadata is invalid.');
    for (const [relative,expected] of Object.entries(manifest.files)) {
        const file = path.resolve(destination,relative);
        if (!file.startsWith(path.resolve(destination) + path.sep) || !fs.statSync(file).isFile()) throw Error(`Package manifest path is invalid: ${relative}`);
        if (fs.statSync(file).size !== expected.bytes || hashFile(file) !== expected.sha256) throw Error(`Package file verification failed: ${relative}`);
    }
    const actual = walkFiles(destination).map(file => path.relative(destination,file).split(path.sep).join('/')).filter(name => name !== 'pocket-package-manifest.json').sort();
    const recorded = Object.keys(manifest.files).sort();
    if (JSON.stringify(actual) !== JSON.stringify(recorded)) throw Error('Package contains files outside its manifest.');
    verifyMatchedBuild(destination);
    return manifest;
}

function stagePackage(sourceRoot,destination,{sourceCommit=null}={}) {
    sourceRoot = fs.realpathSync(sourceRoot);
    destination = path.resolve(destination);
    if (fs.existsSync(destination)) throw Error(`Package staging destination already exists: ${destination}`);
    fs.mkdirSync(destination,{recursive:true});
    try {
        for (const entry of PACKAGE_ENTRIES) {
            const source = path.join(sourceRoot,entry.source);
            if (!fs.existsSync(source)) throw Error(`Missing package source: ${entry.source}`);
            copyEntry(source,path.join(destination,entry.destination));
        }
        fs.copyFileSync(path.join(sourceRoot,'scripts/mock-model.js'),path.join(destination,'.package-source-mock-model.js'));
        transformPackage(destination);
        verifyMatchedBuild(destination);
        const manifest = writePackageManifest(destination,{sourceCommit});
        verifyPackage(destination);
        return manifest;
    } catch (error) {
        fs.rmSync(destination,{recursive:true,force:true});
        throw error;
    }
}

module.exports={PACKAGE_VERSION,ENGINE_VERSION,BRIDGE_PROTOCOL,PACKAGE_ENTRIES,hashFile,walkFiles,stagePackage,verifyPackage};

if (require.main === module) {
    const source = process.argv[2] || path.resolve(__dirname,'..');
    const destination = process.argv[3];
    const sourceCommit = process.argv[4] || null;
    if (!destination) {
        console.error('Usage: node package-staging.cjs <source-root> <destination> [source-commit]');
        process.exitCode = 2;
    } else {
        try { stagePackage(source,destination,{sourceCommit}); console.log(destination); }
        catch (error) { console.error(error.message); process.exitCode=1; }
    }
}
