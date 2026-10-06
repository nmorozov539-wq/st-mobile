"""Use fetch for ST 1.19.0 async OpenAI token counts in the isolated PC copy.
The embedded test browser drops headers from legacy AJAX requests. Keep CSRF on.
"""
import pathlib
import sys
path = pathlib.Path(sys.argv[1]) / 'public/scripts/tokenizers.js'
source = path.read_text()
old = """const data = await jQuery.ajax({
                async: true,
                type: 'POST', //
                url: tokenizerEndpoint,
                data: JSON.stringify([message]),
                dataType: 'json',
                contentType: 'application/json',
            });"""
new = """const response = await fetch(tokenizerEndpoint, {
                method: 'POST', headers: getRequestHeaders(),
                body: JSON.stringify([message]),
            });
            if (!response.ok) throw new Error(`Tokenizer request failed: HTTP ${response.status}`);
            const data = await response.json();"""
if source.count(old) != 1:
    raise SystemExit('ST tokenizer source does not match the tested 1.19.0 patch. Refusing to modify it.')
source = source.replace(old, new).replace('import { characters, event_types,', 'import { getRequestHeaders, characters, event_types,')
path.write_text(source)
