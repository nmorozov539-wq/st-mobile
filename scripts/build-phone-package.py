"""Build a self-contained Node-only test kit; no installed ST data included."""
from pathlib import Path
import json, shutil, tempfile, zipfile
project=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='pocket-kit-') as temp:
    kit=Path(temp)/'pocket-tavern-combined-v0.8.0-phase1';kit.mkdir()
    for name in ('prepare-test.cjs','start-test.cjs','update-test.cjs','compatibility.cjs','session-init.mjs','PHONE-README.md','prepare.cjs','start.cjs','import-data.cjs','setup-proxy.cjs','proxy.cjs','repair-pocket.cjs'):
        shutil.copy2(project/'phone-package'/name,kit/name)
    shutil.copytree(project/'prototype/frontend',kit/'frontend')
    shutil.copytree(project/'prototype/extension',kit/'extension')
    shutil.copytree(project/'vendor/Extension-Summaryception',kit/'summaryception')
    # The old diagnostic overlay belongs to the PC experiment, not normal ST.
    bridge=kit/'extension/index.js'
    bridge.write_text(bridge.read_text().split('} else {\nconst panel')[0]+'}\n')
    manifest=kit/'extension/manifest.json';data=json.loads(manifest.read_text());data['display_name']='Pocket Tavern · phone prototype';data['version']='0.8.0-phase1';manifest.write_text(json.dumps(data,indent=2))
    html=kit/'frontend/index.html';html.write_text(html.read_text().replace('PC prototype','phone prototype').replace('LOCAL PROTOTYPE','COMBINED PROTOTYPE').replace('ST 1.19.0 · mock model','ST 1.19.0').replace('Local test: try [slow] to stop a reply, or [fail] to test recovery.','Generation and saved conversations are managed by SillyTavern.'))
    runtime=kit/'extension/runtime.js';runtime.write_text(runtime.read_text().replace('Connect ST to the local mock model first.','Open the test engine and connect it to the local mock model first.'))
    mock=kit/'mock-model.mjs';mock.write_text((project/'scripts/mock-model.js').read_text().replace('The PC bridge works!','The phone bridge works!'))
    output=project/'dist/pocket-tavern-combined-v0.8.0-phase1.zip';output.parent.mkdir(exist_ok=True)
    # The phone extracts with ST's yauzl 2.10, which stalls on a deflated entry
    # larger than 64 KiB compressed. Already-compressed files (fonts, images)
    # are stored as they are, and the build stops if any other entry would hit the limit.
    stored={'.woff2','.png','.jpg','.webp','.zip'}
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(kit.rglob('*')):
            if file.is_file(): archive.write(file,file.relative_to(kit.parent),compress_type=zipfile.ZIP_STORED if file.suffix in stored else zipfile.ZIP_DEFLATED)
        large=[i.filename for i in archive.infolist() if i.compress_type==zipfile.ZIP_DEFLATED and i.compress_size>60000]
    if large: output.unlink(); raise SystemExit('Deflated entries too large for the phone extractor: '+', '.join(large))
    print(output)
