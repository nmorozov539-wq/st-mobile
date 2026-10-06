"""Offline, disposable settings fixtures. Stop the combined mock launcher first."""
import argparse, json, pathlib, shutil
parser=argparse.ArgumentParser()
parser.add_argument('target',type=pathlib.Path)
args=parser.parse_args()
target=args.target.resolve()
marker=json.loads((target/'.pocket-tavern.json').read_text())
if marker.get('mode')!='combined' or not marker.get('mock'):
    raise SystemExit('Only a combined mock fixture may be seeded. No normal user data is accepted.')
root=target/'data/default-user'
settings=json.loads((root/'settings.json').read_text())
preset=dict(settings['oai_settings'])
preset.update(temperature=0.25,preset_settings_openai='Pocket Fixture')
(root/'OpenAI Settings/Pocket Fixture.json').write_text(json.dumps(preset,indent=2))
shutil.copy2(root/'User Avatars/user-default.png',root/'User Avatars/pocket-fixture.png')
settings['power_user']['personas']['pocket-fixture.png']='Pocket Tester'
settings['power_user'].setdefault('persona_descriptions',{})['pocket-fixture.png']={
    'description':'POCKET_PERSONA_SENTINEL: You are a careful traveller.',
    'position':0,'depth':2,'role':0,'lorebook':'','title':''}
(root/'settings.json').write_text(json.dumps(settings,indent=2))
entry=next(iter(json.loads((root/'worlds/Eldoria.json').read_text())['entries'].values()))
entry.update(uid=0,key=[],keysecondary=[],constant=True,disable=False,content='POCKET_LORE_SENTINEL: Amber gates open at dawn.',comment='Pocket fixture',probability=100,useProbability=False)
(root/'worlds/Pocket Lore.json').write_text(json.dumps({'entries':{'0':entry}},indent=2))
print('Seeded Pocket Fixture, Pocket Tester and Pocket Lore in the disposable mock installation.')
