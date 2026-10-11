import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
// A module with one stray typographic quote stops the whole app from loading, so every shipped module must parse.
for(const dir of ['prototype/frontend','prototype/extension']){
 for(const name of fs.readdirSync(new URL(`../${dir}/`,import.meta.url)).filter(n=>n.endsWith('.js'))){
  test(`${dir}/${name} is valid JavaScript`,()=>{
   const source=fs.readFileSync(new URL(`../${dir}/${name}`,import.meta.url),'utf8');
   const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
  });
 }
}
