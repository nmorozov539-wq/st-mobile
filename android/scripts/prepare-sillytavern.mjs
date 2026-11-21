#!/usr/bin/env node
// Prepares an unmodified SillyTavern checkout for bundling into the APK.
//
//   node scripts/prepare-sillytavern.mjs <properties file> <output dir>
//
// 1. Fetches exactly the pinned commit from the pinned repository and checks
//    that HEAD and package.json's version match the properties file.
// 2. Installs production dependencies from SillyTavern's own package-lock.json
//    (`npm ci --omit=dev`; SillyTavern's .npmrc already sets ignore-scripts).
//    Every production dependency is pure JS/WASM, so the host OS does not matter.
// 3. Removes files that are never loaded at runtime (git metadata, CI config,
//    tests, source maps, TypeScript declarations) to shrink the APK.
//    No SillyTavern source file is changed.
//
// Requires git, node and npm on PATH. Skips all work when the output is already
// prepared for the same commit and script version.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_VERSION = 1; // bump when the steps below change
const [propsFile, outArg] = process.argv.slice(2);
if (!propsFile || !outArg) {
    console.error('usage: prepare-sillytavern.mjs <properties file> <output dir>');
    process.exit(2);
}

const props = Object.fromEntries(
    fs.readFileSync(propsFile, 'utf8').split(/\r?\n/)
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }),
);
for (const key of ['version', 'repository', 'commit']) {
    if (!props[key]) throw new Error(`${propsFile}: missing ${key}`);
}

const out = path.resolve(outArg);
const stampFile = path.join(out, '.stm-prepared');
const stamp = JSON.stringify({ commit: props.commit, version: props.version, script: SCRIPT_VERSION });
if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === stamp) {
    console.log(`SillyTavern ${props.version} already prepared in ${out}`);
    process.exit(0);
}

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: out, stdio: 'inherit', ...opts });
const capture = (cmd, args) => execFileSync(cmd, args, { cwd: out, encoding: 'utf8' }).trim();

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

console.log(`Fetching SillyTavern ${props.version} (${props.commit}) from ${props.repository}`);
run('git', ['init', '-q']);
run('git', ['fetch', '-q', '--depth', '1', props.repository, props.commit]);
run('git', ['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD']);
const head = capture('git', ['rev-parse', 'HEAD']);
if (head !== props.commit) throw new Error(`Fetched commit ${head}, expected ${props.commit}`);
const pkg = JSON.parse(fs.readFileSync(path.join(out, 'package.json'), 'utf8'));
if (pkg.version !== props.version) throw new Error(`package.json says ${pkg.version}, expected ${props.version}`);

console.log('Installing production dependencies (npm ci --omit=dev)');
run('npm', ['ci', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'], {
    env: { ...process.env, npm_config_update_notifier: 'false' },
});

// Not used at runtime.
for (const rel of ['.git', '.github', '.vscode', '.gemini', 'tests', 'docker', 'colab', 'src/electron', 'data']) {
    fs.rmSync(path.join(out, rel), { recursive: true, force: true });
}
let removed = 0;
let removedBytes = 0;
const prunable = name => /\.(map|d\.ts|d\.mts|d\.cts)$/.test(name);
(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && prunable(entry.name)) {
            removedBytes += fs.statSync(full).size;
            fs.rmSync(full);
            removed += 1;
        }
    }
})(path.join(out, 'node_modules'));
console.log(`Pruned ${removed} source maps / type declarations (${(removedBytes / 1e6).toFixed(1)} MB)`);

fs.writeFileSync(stampFile, stamp);
console.log(`SillyTavern ${props.version} prepared in ${out}`);
