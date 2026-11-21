#!/usr/bin/env node
// package.json "version" is the single product version. This rewrites every derived
// occurrence (cache-busting ?build= strings, build constants, manifests, package names)
// and, with --check, fails when any of them has drifted.
// Android versionName/versionCode, the Node runtime and the ST revision are separate version
// systems and are deliberately not touched here.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`package.json version is not x.y.z: ${version}`);
const V = '\\d+\\.\\d+\\.\\d+';
const rules = [
  {files: /^prototype\/.*\.(js|html|css)$/, re: new RegExp(`(\\?build=)${V}`, 'g'), to: `$1${version}`},
  {files: /^prototype\/frontend\/build\.js$/, re: new RegExp(`(FRONTEND_BUILD = ')${V}(')`, 'g'), to: `$1${version}$2`},
  {files: /^phone-package\/package-staging\.cjs$/, re: new RegExp(`(PACKAGE_VERSION = ')${V}(')`, 'g'), to: `$1${version}$2`},
  {files: /^prototype\/extension\/configuration\.js$/, re: new RegExp(`(bridgeBuild: ')${V}(')`, 'g'), to: `$1${version}$2`},
  {files: /^prototype\/frontend\/settings\.js$/, re: new RegExp(`(\`STM )${V}( ·)`, 'g'), to: `$1${version}$2`},
  {files: /^prototype\/extension\/manifest\.json$/, re: new RegExp(`("version": ")${V}(")`, 'g'), to: `$1${version}$2`},
  {files: /^(scripts\/build-phone-package\.py|phone-package\/PHONE-README\.md|tests\/repair-kit\.cjs)$/, re: new RegExp(`(stm-combined-v)${V}`, 'g'), to: `$1${version}`},
  {files: /^phone-package\/PHONE-README\.md$/, re: new RegExp(`(# STM combined prototype v)${V}`, 'g'), to: `$1${version}`},
];
const files = execFileSync('git', ['ls-files'], {cwd: root, encoding: 'utf8'}).split('\n').filter(Boolean);
const check = process.argv.includes('--check'), drift = [];
for (const file of files) {
  const applicable = rules.filter(r => r.files.test(file)); if (!applicable.length) continue;
  const full = path.join(root, file); let text = fs.readFileSync(full, 'utf8'), next = text;
  for (const r of applicable) next = next.replace(r.re, r.to);
  if (next !== text) { drift.push(file); if (!check) fs.writeFileSync(full, next); }
}
if (check && drift.length) { console.error(`Version drift from package.json (${version}) in:\n  ${drift.join('\n  ')}\nRun: node scripts/sync-version.mjs`); process.exit(1); }
console.log(check ? `All derived versions match ${version}.` : `Synced ${drift.length} file(s) to ${version}.`);
