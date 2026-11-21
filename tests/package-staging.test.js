import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {readFileSync as __r} from 'node:fs';
const PRODUCT_VERSION=JSON.parse(__r(new URL('../package.json',import.meta.url),'utf8')).version;
const require=createRequire(import.meta.url);
const {PACKAGE_ENTRIES,stagePackage,verifyPackage}=require('../phone-package/package-staging.cjs');

test('shared phone staging produces a complete matched and licensed manifest',()=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'stm-package-stage-'));
    const staged=path.join(root,'kit');
    try {
        const manifest=stagePackage(path.resolve('.'),staged,{sourceCommit:'0123456789abcdef'});
        assert.equal(manifest.sourceCommit,'0123456789abcdef');
        assert.equal(manifest.packageVersion,PRODUCT_VERSION);
        assert.equal(manifest.engineVersion,'1.19.1');
        assert.equal(manifest.bridgeProtocol,2);
        assert.ok(manifest.files['LICENSE']);
        assert.ok(manifest.files['THIRD_PARTY_NOTICES.md']);
        assert.ok(manifest.files['frontend/LICENSE-lucide.txt']);
        assert.equal(JSON.parse(fs.readFileSync(path.join(staged,'extension/manifest.json'))).version,PRODUCT_VERSION);
        assert.match(fs.readFileSync(path.join(staged,'frontend/build.js'),'utf8'),/FRONTEND_BUILD = '0\.9\.2'/);
        assert.doesNotMatch(fs.readFileSync(path.join(staged,'extension/index.js'),'utf8'),/const panel/);
        assert.equal(verifyPackage(staged).sourceCommit,'0123456789abcdef');
        fs.appendFileSync(path.join(staged,'frontend/build.js'),'\nchanged');
        assert.throws(()=>verifyPackage(staged),/verification failed/);
    } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('ZIP builder delegates its asset boundary to the shared staging definition',()=>{
    const builder=fs.readFileSync('scripts/build-phone-package.py','utf8');
    assert.match(builder,/stage-phone-package\.cjs/);
    for(const entry of PACKAGE_ENTRIES) assert.ok(entry.source && entry.destination);
    assert.doesNotMatch(builder,/copytree|shutil\.copy/);
});
