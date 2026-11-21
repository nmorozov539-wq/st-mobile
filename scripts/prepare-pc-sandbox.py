"""Copy ST code and defaults only. Never copy user data or configuration."""
import argparse
import json
import pathlib
import shutil
import tempfile
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('source', type=pathlib.Path)
parser.add_argument('--mock-model', action='store_true', help='Configure fresh sandbox defaults for the local mock model')
args = parser.parse_args()
source = args.source.resolve()
project = pathlib.Path(__file__).resolve().parents[1]
if json.loads((source / 'package.json').read_text()).get('version') != '1.19.1':
    raise SystemExit('This prototype requires the tested ST package version 1.19.1.')
target = pathlib.Path(tempfile.mkdtemp(prefix='st-mobile-pc-'))
for name in ('public', 'src', 'default'):
    shutil.copytree(source / name, target / name)
for name in ('package.json', 'server.js', 'webpack.config.js'):
    if (source / name).exists():
        shutil.copy2(source / name, target / name)
(target / 'node_modules').symlink_to(source / 'node_modules', target_is_directory=True)
shutil.copy2(source / 'default/config.yaml', target / 'config.yaml')
shutil.copytree(project / 'prototype/extension', target / 'public/scripts/extensions/third-party/st-mobile-experiment')
shutil.copytree(project / 'prototype/frontend', target / 'public/st-mobile')
if args.mock_model:
    settings_path = target / 'default/content/settings.json'
    settings = json.loads(settings_path.read_text())
    settings['firstRun'] = False
    settings['username'] = 'Tester'
    settings['main_api'] = 'openai'
    settings.setdefault('oai_settings', {}).update({
        'chat_completion_source': 'custom', 'custom_url': 'http://127.0.0.1:8124/v1',
        'custom_model': 'st-mobile-mock', 'stream_openai': True, 'function_calling': False,
        'openai_max_context': 32000, 'openai_max_tokens': 1024,
    })
    settings.setdefault('power_user', {}).update({'auto_connect': True, 'auto_swipe': False})
    settings['power_user'].setdefault('auto_continue', {})['enabled'] = False
    settings_path.write_text(json.dumps(settings, indent=2))
subprocess.run([sys.executable, str(project / 'scripts/patch-pc-tokenizer.py'), str(target)], check=True)
fixture_directory = target / 'data/default-user/characters'
fixture_directory.mkdir(parents=True, exist_ok=True)
subprocess.run([sys.executable, str(project / 'scripts/test-character.py'), str(source / 'default/content/default_Seraphina.png'), str(fixture_directory / 'Moss.png')], check=True)
print(target)
