"""Build the shared-staging phone kit; no installed ST data included."""
from pathlib import Path
import subprocess, tempfile, zipfile
project=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='pocket-kit-') as temp:
    kit=Path(temp)/'pocket-tavern-combined-v0.9.1';kit.mkdir()
    kit.rmdir()
    commit=subprocess.run(['git','rev-parse','HEAD'],cwd=project,check=True,capture_output=True,text=True).stdout.strip()
    subprocess.run(['node',str(project/'scripts/stage-phone-package.cjs'),str(kit),commit],cwd=project,check=True)
    output=project/'dist/pocket-tavern-combined-v0.9.1.zip';output.parent.mkdir(exist_ok=True)
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
