"""Write a tiny public test card using the supplied default PNG artwork."""
import base64
import json
import pathlib
import struct
import sys
import zlib
source, destination = map(pathlib.Path, sys.argv[1:])
raw = source.read_bytes()
chunks, offset = [], 8
while offset < len(raw):
    size = struct.unpack('>I', raw[offset:offset + 4])[0]
    kind = raw[offset + 4:offset + 8]
    chunk = raw[offset:offset + 12 + size]
    if kind != b'tEXt':
        chunks.append(chunk)
    offset += 12 + size
card = {'name': 'Moss', 'description': 'A friendly little forest guide used for local prototype tests.', 'personality': 'Curious and kind', 'scenario': '', 'first_mes': 'Hello! I am Moss. Shall we test the stm?', 'mes_example': '', 'creatorcomment': 'Disposable local fixture', 'avatar': 'none', 'chat': 'Moss prototype', 'talkativeness': '0.5'}
payload = b'chara\0' + base64.b64encode(json.dumps(card).encode())
kind = b'tEXt'
chunk = struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
destination.write_bytes(raw[:8] + b''.join(chunks[:-1]) + chunk + chunks[-1])
