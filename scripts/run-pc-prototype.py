"""Start an isolated ST + local mock model; Ctrl+C stops both."""
import argparse
import pathlib
import shutil
import subprocess
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=pathlib.Path, default=pathlib.Path('/home/Riv/SillyTavern'))
args = parser.parse_args()
project = pathlib.Path(__file__).resolve().parents[1]
node = shutil.which('node')
if not node:
    raise SystemExit('Node.js is required (use the version installed for ST).')
sandbox = pathlib.Path(subprocess.check_output([
    sys.executable, str(project / 'scripts/prepare-pc-sandbox.py'), str(args.source), '--mock-model',
], text=True).strip())
print(f'Sandbox: {sandbox}\nOpen http://127.0.0.1:8123/st-mobile/ when ST finishes starting.\nCtrl+C stops both servers. Your original ST data is untouched.', flush=True)
processes = []
try:
    processes.append(subprocess.Popen([node, str(project / 'scripts/mock-model.js')], cwd=project))
    processes.append(subprocess.Popen([node, 'server.js', '--port', '8123', '--listen', 'false', '--browserLaunchEnabled', 'false'], cwd=sandbox))
    while all(process.poll() is None for process in processes):
        time.sleep(0.5)
    raise SystemExit('A server stopped. Check the output above; ports 8123 and 8124 must be free.')
except KeyboardInterrupt:
    print('\nStopping prototype servers…', flush=True)
finally:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
