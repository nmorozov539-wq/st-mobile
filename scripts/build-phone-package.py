"""Build a self-contained Node-only test kit; no installed ST data included."""
from pathlib import Path
import json, shutil, tempfile, zipfile
project=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='pocket-kit-') as temp:
    kit=Path(temp)/'pocket-tavern-combined-v0.4.5';kit.mkdir()
    for name in ('prepare-test.cjs','start-test.cjs','update-test.cjs','compatibility.cjs','session-init.mjs','PHONE-README.md','prepare.cjs','start.cjs','import-data.cjs','setup-proxy.cjs','proxy.cjs','repair-pocket.cjs'):
        shutil.copy2(project/'phone-package'/name,kit/name)
    shutil.copytree(project/'prototype/frontend',kit/'frontend')
    shutil.copytree(project/'prototype/extension',kit/'extension')
    # The old diagnostic overlay belongs to the PC experiment, not normal ST.
    bridge=kit/'extension/index.js'
    bridge.write_text(bridge.read_text().split('} else {\nconst panel')[0]+'}\n')
    manifest=kit/'extension/manifest.json';data=json.loads(manifest.read_text());data['display_name']='Pocket Tavern · phone prototype';data['version']='0.4.5';manifest.write_text(json.dumps(data,indent=2))
    html=kit/'frontend/index.html';html.write_text(html.read_text().replace('PC prototype','phone prototype').replace('LOCAL PROTOTYPE','COMBINED PROTOTYPE').replace('ST 1.19.0 · mock model','ST 1.19.0').replace('Local test: try [slow] to stop a reply, or [fail] to test recovery.','Generation and saved conversations are managed by SillyTavern.'))
    runtime=kit/'extension/runtime.js';runtime.write_text(runtime.read_text().replace('Connect ST to the local mock model first.','Open the test engine and connect it to the local mock model first.'))
    mock=kit/'mock-model.mjs';mock.write_text((project/'scripts/mock-model.js').read_text().replace('The PC bridge works!','The phone bridge works!'))
    output=project/'dist/pocket-tavern-combined-v0.4.5.zip';output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(kit.rglob('*')):
            if file.is_file(): archive.write(file,file.relative_to(kit.parent))
    print(output)
