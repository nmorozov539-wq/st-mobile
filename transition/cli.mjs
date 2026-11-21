#!/usr/bin/env node
// Usage: node transition/cli.mjs http://127.0.0.1:8000 > stm-st-data.json
// Read-only. Pass COOKIE="name=value" if ST requires a login session.
import {fetchStData} from './fetch-st.js';
let cookie = process.env.COOKIE ?? '';
const withJar = async (u, o) => {
  const r = await fetch(u, {...o, headers: {...o?.headers, ...(cookie ? {Cookie: cookie} : {})}});
  const sc = r.headers.getSetCookie?.() ?? []; if (sc.length) cookie = [cookie, ...sc.map(c => c.split(';')[0])].filter(Boolean).join('; ');
  return r;
};
const base = process.argv[2]; if (!base) { console.error('Usage: cli.mjs <ST url>'); process.exit(2); }
console.log(JSON.stringify(await fetchStData(base.replace(/\/$/, ''), {fetchImpl: withJar}), null, 1));
