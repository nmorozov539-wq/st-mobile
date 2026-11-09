// Step 1 spike: a tiny HTTP server that proves Node runs inside the app.
// Not SillyTavern. Listens on 127.0.0.1 only.
'use strict';
const http = require('http');
const PORT = Number(process.argv[2]) || 8123;
const startedAt = Date.now();
let ticks = 0;
setInterval(() => { ticks += 1; }, 1000);

function status() {
  const wallSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return {
    node: process.version,
    arch: process.arch,
    platform: process.platform,
    pid: process.pid,
    pageSize: process.env.ST_ANDROID_PAGE_SIZE || null,
    uptimeSeconds: Math.floor(process.uptime()),
    wallSeconds,
    ticks,
    startedAt: new Date(startedAt).toISOString(),
  };
}

const page = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pocket Tavern engine</title>
<style>
body{margin:0;padding:24px 16px;font:16px/1.5 system-ui,sans-serif;background:#16130f;color:#efe6d8}
h1{font-size:20px;margin:0 0 16px}.big{font-size:56px;font-weight:700;margin:8px 0}
table{border-collapse:collapse;width:100%}td{padding:6px 0;border-bottom:1px solid #3a3229}
td:first-child{color:#b3a48e;width:45%}.ok{color:#8fd18f}.warn{color:#e8b765}
</style></head><body>
<h1>Pocket Tavern engine</h1>
<div>Counter (ticks once a second inside Node)</div>
<div class="big" id="ticks">…</div>
<div id="drift"></div>
<table id="t"></table>
<script>
async function poll(){
  try{
    const s=await (await fetch('/status',{cache:'no-store'})).json();
    document.getElementById('ticks').textContent=s.ticks;
    const lag=s.wallSeconds-s.ticks;
    const d=document.getElementById('drift');
    d.textContent=lag<=2?'Kept counting the whole time':'Paused for about '+lag+' s at some point';
    d.className=lag<=2?'ok':'warn';
    const rows=[['Node',s.node],['Arch',s.arch],['Platform',s.platform],['PID',s.pid],
      ['Page size',s.pageSize],['Seconds since start',s.wallSeconds],['Started at',s.startedAt]];
    document.getElementById('t').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');
  }catch(e){document.getElementById('drift').textContent='Engine not answering';}
}
poll();setInterval(poll,1000);
</script></body></html>`;

http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(status()));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(page);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[engine] ${process.version} ${process.arch} listening on 127.0.0.1:${PORT}`);
});
