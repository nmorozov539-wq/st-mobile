import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('every derived product version matches package.json', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-version.mjs', '--check'], {encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
});
test('sync detects drift', () => {
  // Uses a throwaway edit and restores it, so the working tree is unchanged afterwards.
  const f = new URL('../prototype/frontend/build.js', import.meta.url), fs = awaitless();
  function awaitless() { return globalThis.process.getBuiltinModule('node:fs'); }
  const original = fs.readFileSync(f, 'utf8');
  try {
    fs.writeFileSync(f, original.replace(/\d+\.\d+\.\d+/, '9.9.9'));
    assert.equal(spawnSync(process.execPath, ['scripts/sync-version.mjs', '--check'], {encoding: 'utf8'}).status, 1);
  } finally { fs.writeFileSync(f, original); }
});
