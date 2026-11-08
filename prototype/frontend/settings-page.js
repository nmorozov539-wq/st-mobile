// Settings page: Connection and Appearance & reading. Connection writes reuse the verified `configure` bridge actions.
import {el, btn} from './wi-ui.js?build=0.8.0-phase1.2';
import {icon} from './icons.js?build=0.8.0-phase1.2';
import {normalizeAppearance, SPACING, TEXT_SIZE} from './appearance.js?build=0.8.0-phase1.2';
import {FRONTEND_BUILD} from './build.js?build=0.8.0-phase1.2';

export const PROXY_ENDPOINT = 'http://127.0.0.1:8001/api/v1';
export const DEFAULT_DIRECT = 'https://openrouter.ai/api/v1';
const DIRECT_KEY = 'pocket-tavern.direct-endpoint.v1';
const MANUAL = '\u0000manual';
export const sameEndpoint = (a, b) => String(a ?? '').trim().replace(/\/+$/, '') === String(b ?? '').trim().replace(/\/+$/, '');

export function createSettingsPage({onChecked=()=>{},rpc, action, locked, notify, reconnect, connected, adoptSnapshot, getAppearance, setAppearance, probeProxy, visible = () => true}) {
 let tab = 'connection', config = null, container = null;
 let form = null, message = '', messageKind = '', working = false, proxyUp = null, showKey = false, failure = '';

 const saveDirect = value => { try { if (value && !sameEndpoint(value, PROXY_ENDPOINT)) localStorage.setItem(DIRECT_KEY, value); } catch {} };
 const directEndpoint = () => { try { return localStorage.getItem(DIRECT_KEY) || DEFAULT_DIRECT; } catch { return DEFAULT_DIRECT; } };
 const say = (text, kind = '') => { message = text; messageKind = kind; };

 async function load() {
  failure = '';
  try {
   config = await rpc('settings');
   const selected = config.selected;
   form = {provider: selected.source === 'deepseek' ? 'deepseek' : 'custom', endpoint: selected.endpoint ?? '', key: '', model: selected.model ?? '', manual: false};
  } catch (error) { config = null; failure = error.message; }
  say('');
  render();
  refreshProxy();
 }
 async function refreshProxy() { try { proxyUp = await probeProxy(); } catch { proxyUp = false; } render(); }

 const proxyOn = () => sameEndpoint(form.endpoint, PROXY_ENDPOINT);
 function fieldBlock(label, control, side, hint) {
  const wrap = el('label', '', 'sp-field'); const head = el('span', '', 'sp-field-head'); head.append(el('span', label));
  if (side) head.append(typeof side === 'string' ? el('small', side) : side);
  wrap.append(head, control); if (hint) wrap.append(el('small', hint, 'sp-note'));
  return wrap;
 }
 async function persist(kind, value) {
  config = await rpc('configure', {kind, value, revision: config.revision}, 45000);
  return config;
 }
 async function run(label, work) {
  if (!connected()) { notify('Reconnect to the SillyTavern engine first.'); return; }
  if (locked()) { notify('Wait for the engine to finish before changing the connection.'); return; }
  working = true; say(label); render();
  try { await work(); await adoptSnapshot(); }
  catch (error) { say(error.message, 'err'); try { config = await rpc('settings'); } catch {} }
  finally { working = false; render(); }
 }
 const deepseek = () => form.provider === 'deepseek';
 async function saveConnection() {
  const selected = config.selected;
  if (deepseek()) {
   // DeepSeek's key and model list live in ST's own DeepSeek slot.
   if (selected.source !== 'deepseek') await persist('source', 'deepseek');
   if (form.model && form.model !== config.selected.model && config.models.some(item => item.id === form.model)) await persist('model', form.model);
   return;
  }
  if (selected.source !== 'custom') await persist('source', 'custom');
  if (!sameEndpoint(form.endpoint, config.selected.endpoint)) await persist('endpoint', form.endpoint.trim());
  if (form.model && form.model !== config.selected.model) await persist('model', form.model.trim());
 }
 const connect = () => run('Saving and checking the connection…', async () => {
  await saveConnection(); const key = form.key; form.key = '';
  await persist('connect', key); onChecked();
  say(`Endpoint answered · ${config.models.length} models loaded`, config.onlineStatus === 'no_connection' ? 'err' : 'ok');
  if (config.onlineStatus === 'no_connection') say(deepseek() ? 'Not connected. DeepSeek refused the request: check the API key and your balance.' : 'Not connected. Check the endpoint, key and that the proxy is running.', 'err');
  else if (deepseek()) say(`Connected to DeepSeek · ${config.models.length} models loaded`, 'ok');
  else if (!deepseek()) {
   // A model list is public on OpenRouter, so a wrong key still "connects".
   const verdict = await checkKey(form.endpoint, key);
   if (verdict === false) say('The endpoint answered, but the provider rejected this API key. Paste the correct key and press Connect again.', 'err');
   else if (verdict === true) say(`Connected · key accepted · ${config.models.length} models loaded`, 'ok');
   else if (!key) say(`Endpoint answered · ${config.models.length} models loaded. Test message checks the saved key.`, 'ok');
  }
  form.endpoint = config.selected.endpoint ?? ''; form.model = config.selected.model ?? '';
 });
 const testMessage = () => run('Sending a tiny test message (up to 64 output tokens)…', async () => {
  await saveConnection();
  if (form.key.trim()) { await persist('providerKey', form.key); form.key = ''; }
  await persist('test'); onChecked();
  say('', ''); form.reply = config.testResult ? {model: config.selected.model, text: config.testResult.reply} : null;
 });
 // OpenRouter (directly or through the local proxy) has a free key check; other
 // providers return null and keep the plain result. Only a newly typed key can be checked.
 async function checkKey(endpoint, key) {
  if (!key?.trim() || !(/openrouter\.ai/.test(endpoint) || sameEndpoint(endpoint, PROXY_ENDPOINT))) return null;
  const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 8000);
  try {
   const response = await fetch(`${String(endpoint).trim().replace(/\/+$/, '')}/key`, {headers: {Authorization: `Bearer ${key.trim()}`}, signal: stop.signal, cache: 'no-store'});
   if (response.status === 401 || response.status === 403) return false;
   return response.ok ? true : null;
  } catch { return null; } finally { clearTimeout(timer); }
 }
 const refreshModels = () => run('Refreshing the model list…', async () => {
  await saveConnection(); const key = form.key; form.key = ''; await persist('connect', key);
  say(config.onlineStatus === 'no_connection' ? 'Not connected. The model list could not be refreshed.' : `Models refreshed · ${config.models.length} available`, config.onlineStatus === 'no_connection' ? 'err' : 'ok');
 });

 // Direct DeepSeek: no endpoint or proxy, just the key and DeepSeek's own model list.
 function deepseekFields(page) {
  const listed = config.selected.source === 'deepseek' ? config.models : [];
  page.append(keyField(page, 'DeepSeek API key', 'Create one at platform.deepseek.com → API keys.'));
  const picker = el('select'); picker.disabled = !listed.length;
  if (!listed.length) { const option = el('option', 'Connect to load DeepSeek models'); option.value = ''; picker.append(option); }
  for (const item of listed) { const option = el('option', item.name); option.value = item.id; picker.append(option); }
  if (listed.length) picker.value = listed.some(item => item.id === form.model) ? form.model : listed[0].id;
  form.model = picker.value; picker.onchange = () => { form.model = picker.value; };
  const modelRow = el('div', '', 'sp-with-button'); modelRow.append(fieldBlock('Global model', picker));
  modelRow.append(btn('', () => refreshModels(), 'sp-icon-btn', {'aria-label': 'Refresh model list'})); modelRow.lastChild.append(icon('refresh')); page.append(modelRow);
  page.append(el('p', 'Default model for chats without their own selection. Reasoner models think before replying.', 'sp-note'));
  connectAndTest(page);
 }
 function keyField(page, label, hint) {
  // A saved key belongs to the provider it was saved for.
  const saved = config.hasProviderKey && (form.provider === 'deepseek') === (config.selected.source === 'deepseek');
  const key = el('input'); key.type = showKey ? 'text' : 'password'; key.autocomplete = 'off'; key.value = form.key;
  key.placeholder = saved ? 'Saved key · Leave blank to keep' : 'Paste API key'; key.oninput = () => { form.key = key.value; };
  const keyRow = el('div', '', 'sp-with-button'); keyRow.append(fieldBlock(label, key, '', hint));
  const eye = btn('', () => {
   if (!form.key && saved) { notify('The saved key stays hidden inside SillyTavern. The eye shows a key you type here.'); return; }
   showKey = !showKey; render();
  }, 'sp-icon-btn', {'aria-label': showKey ? 'Hide API key' : 'Show API key', 'aria-pressed': String(showKey)});
  eye.append(icon(showKey ? 'eyeOff' : 'eye')); keyRow.append(eye);
  return keyRow;
 }
 function connectionTab(page) {
  const selected = config.selected, custom = selected.source === 'custom';
  const engine = el('div', '', 'sp-engine'); const text = el('div'); text.append(el('strong', 'SillyTavern engine'), el('small', connected() ? 'Connected · Local' : 'Not connected'));
  const re = btn('', () => reconnect(), 'btn quiet sp-link'); re.append(icon('reply'), ' Reconnect'); engine.append(text, re);
  const providerNote = deepseek() ? (selected.source === 'deepseek' ? 'DeepSeek · direct' : 'Connect switches to DeepSeek.') : custom ? 'Custom · OpenAI-compatible' : `Currently ${selected.source}. Connect switches to Custom · OpenAI-compatible.`;
  page.append(engine, el('h2', 'Chat Completion', 'sp-heading'), el('p', providerNote, 'sp-sub'));
  const providers = el('div', '', 'segmented sp-segmented'); providers.setAttribute('role', 'radiogroup'); providers.setAttribute('aria-label', 'Provider');
  for (const [value, label] of [['custom', 'OpenAI-compatible'], ['deepseek', 'DeepSeek']]) providers.append(btn(label, () => {
   if (form.provider === value) return;
   form.provider = value; form.manual = false; form.reply = null;
   // The other provider's model list doesn't apply; Connect loads the right one.
   form.model = value === config.selected.source || (value === 'custom' && config.selected.source !== 'deepseek') ? config.selected.model ?? '' : '';
   say(value === 'deepseek' ? 'Paste your DeepSeek API key, then Connect.' : 'Endpoint settings · Ready to connect', 'ok'); render();
  }, 'sp-segment', {role: 'radio', 'aria-checked': String(form.provider === value)}));
  page.append(providers);
  if (deepseek()) { deepseekFields(page); return; }

  const row = el('div', '', 'sp-switch-row'); row.append(el('span', 'Use proxy'));
  const toggle = btn('', () => {
   if (proxyOn()) form.endpoint = directEndpoint(); else { saveDirect(form.endpoint); form.endpoint = PROXY_ENDPOINT; }
   say('Endpoint switched · Ready to connect', 'ok'); render();
  }, 'toggle sp-switch', {role: 'switch', 'aria-checked': String(proxyOn()), 'aria-label': 'Use proxy'});
  row.append(toggle); page.append(row);
  page.append(el('p', proxyUp === null ? 'Checking proxy…' : proxyOn() ? (proxyUp ? 'Proxy running' : 'Proxy not detected. Start Pocket Tavern with the proxy, then Connect.') : (proxyUp ? 'Proxy available' : 'Proxy stopped'), `sp-note ${proxyOn() && proxyUp === false ? 'warn' : ''}`));

  const endpoint = el('input'); endpoint.type = 'url'; endpoint.value = form.endpoint; endpoint.autocomplete = 'off'; endpoint.spellcheck = false;
  const side = el('small', proxyOn() ? 'Proxy' : 'Direct');
  endpoint.oninput = () => {
   form.endpoint = endpoint.value;
   side.textContent = proxyOn() ? 'Proxy' : 'Direct';
   toggle.setAttribute('aria-checked', String(proxyOn()));
  };
  endpoint.onchange = () => saveDirect(endpoint.value);
  page.append(fieldBlock('API endpoint', endpoint, side, 'Base URL, without /chat/completions.'));

  page.append(keyField(page, 'API key'));

  const models = [...config.models]; if (form.model && !models.some(item => item.id === form.model)) models.unshift({id: form.model, name: form.model});
  const picker = el('select');
  for (const item of models) { const option = el('option', item.name); option.value = item.id; picker.append(option); }
  const manual = el('option', 'Enter a model ID…'); manual.value = MANUAL; picker.append(manual);
  picker.value = form.manual ? MANUAL : (form.model || (models[0]?.id ?? MANUAL));
  picker.onchange = () => { if (picker.value === MANUAL) form.manual = true; else { form.manual = false; form.model = picker.value; } render(); };
  const modelRow = el('div', '', 'sp-with-button'); modelRow.append(fieldBlock('Global model', picker));
  modelRow.append(btn('', () => refreshModels(), 'sp-icon-btn', {'aria-label': 'Refresh model list'})); modelRow.lastChild.append(icon('refresh')); page.append(modelRow);
  if (form.manual || (!models.length)) {
   const id = el('input'); id.value = form.model; id.placeholder = 'Provider’s exact model ID'; id.autocomplete = 'off'; id.spellcheck = false; id.oninput = () => { form.model = id.value; };
   page.append(fieldBlock('Model ID', id));
  }
  // The manual entry also sits at the end of the model list, which is easy to miss on a long list.
  if (models.length) page.append(btn(form.manual ? 'Choose from the list instead' : 'Type a model ID instead', () => { form.manual = !form.manual; if (!form.manual && !models.some(item => item.id === form.model)) form.model = models[0].id; render(); }, 'btn quiet sp-link sp-manual'));
  page.append(el('p', 'Default model for chats without their own selection.', 'sp-note'));

  connectAndTest(page);
 }
 function connectAndTest(page) {
  const connectButton = btn('', connect, 'btn primary sp-primary', working ? {disabled: ''} : {}); connectButton.append(icon('link'), ' Connect');
  page.append(connectButton);
  const known = config.onlineStatus === 'no_connection' ? 'Not connected' : `Connected · ${config.models.length} models loaded`;
  page.append(el('p', message || known, `sp-note ${message ? messageKind : (config.onlineStatus === 'no_connection' ? '' : 'ok')}`), el('p', 'Saves connection settings and checks access.', 'sp-note'), el('hr', '', 'sp-rule'));
  const test = btn('', testMessage, 'btn secondary sp-secondary', working ? {disabled: ''} : {}); test.append(icon('chat'), ' Test message');
  page.append(test, el('p', `Using ${form.model || config.selected.model || 'no model selected'}`, 'sp-note'), el('p', 'Sends a small generation request. Provider charges may apply.', 'sp-note'));
  if (form.reply) page.append(el('div', `Test reply · ${form.reply.model} ${form.reply.text}`, 'sp-reply'));
  page.append(el('p', `Pocket Tavern ${FRONTEND_BUILD} · engine bridge ${config.bridgeBuild ?? 'older build — update and restart ST'}`, 'sp-note'));
 }

 // SillyTavern stores a reply's token count only when its own "Message token
 // count" option is on, so switching the detail on here turns that on too.
 async function enableTokenCounts() {
  if (!connected() || locked()) { notify('Token counts start once the engine is idle. Switch the detail off and on again then.'); return; }
  try { config = await rpc('settings'); if (config.tokenCounts) return; await persist('tokenCounts', true); notify('New replies will include their token count.'); }
  catch (error) { notify(`Could not turn on token counts in SillyTavern: ${error.message}`); }
 }
 function appearanceTab(page) {
  const value = getAppearance();
  const commit = next => { setAppearance(normalizeAppearance({...value, ...next, details: {...value.details, ...(next.details ?? {})}})); render(); };
  const head = el('div', '', 'sp-slider-head'); head.append(el('span', 'Chat text size'), el('span', `${value.textSize} px`));
  const slider = el('input'); slider.type = 'range'; slider.min = TEXT_SIZE.min; slider.max = TEXT_SIZE.max; slider.step = 1; slider.value = value.textSize; slider.setAttribute('aria-label', 'Chat text size');
  slider.oninput = () => { setAppearance({...value, textSize: Number(slider.value)}); head.lastChild.textContent = `${slider.value} px`; updatePreview(); };
  slider.onchange = () => render();
  page.append(head, slider);
  const segmented = (title, name, options) => {
   const group = el('div', '', 'segmented sp-seg'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', title);
   for (const [id, label] of options) group.append(btn(label, () => commit({[name]: id}), '', {'aria-pressed': String(value[name] === id)}));
   page.append(el('p', title, 'sp-label'), group);
  };
  segmented('Line spacing', 'spacing', [['compact', 'Compact'], ['normal', 'Normal'], ['spacious', 'Spacious']]);
  segmented('Background', 'background', [['plain', 'Plain'], ['gradient', 'Gradient']]);
  segmented('Thinking blocks', 'thinking', [['collapsed', 'Collapsed'], ['expanded', 'Expanded']]);
  page.append(el('hr', '', 'sp-rule'), el('p', 'Message details', 'sp-label'));
  const flags = [['time', 'Generation time', 'Time taken to finish each reply.'], ['clock', 'Clock timestamp', ''], ['model', 'Model name', 'Tap the name to see it in full.'], ['tokens', 'Token count', 'SillyTavern saves counts only on replies written while this is on.']];
  for (const [name, label, hint] of flags) {
   const row = el('div', '', 'sp-switch-row'); row.append(el('span', label), btn('', () => { const on = !value.details[name]; commit({details: {[name]: on}}); if (name === 'tokens' && on) enableTokenCounts(); }, 'toggle sp-switch', {role: 'switch', 'aria-checked': String(value.details[name]), 'aria-label': label}));
   page.append(row); if (hint) page.append(el('p', hint, 'sp-note'));
  }
  page.append(el('p', 'Live preview', 'sp-preview-title'));
  const preview = el('div', '', 'sp-preview');
  const detailBits = () => { const d = getAppearance().details; return [d.time && [icon('timer'), '8.4s'], d.clock && ['9:41 PM'], d.model && ['deepseek-chat'], d.tokens && ['312 tokens']].filter(Boolean); };
  const line = el('p', '', 'sp-note');
  preview.append(el('p', 'Seraphina', 'who'), Object.assign(el('p', 'She smiles, tracing a faded line through the mountains.', 'bubble'), {style: 'font-style:italic'}), Object.assign(el('p', '', 'bubble'), {innerHTML: '<span class="dialogue">“Here. But we should leave before dawn. We have a long road ahead.”</span>'}), line);
  const you = el('div', '', 'user-bubble'); you.append(el('p', 'You', 'who'), Object.assign(el('p', '', 'bubble'), {innerHTML: '<span class="dialogue">“Then we’d better get some sleep.”</span>'})); preview.append(you);
  function updatePreview() { const bits = detailBits(); line.replaceChildren(...(bits.length ? bits.flatMap((bit, i) => i ? [' · ', ...bit] : bit) : ['No message details'])); }
  updatePreview(); page.append(preview, el('p', 'Changes apply across Pocket Tavern. The preview uses sample text; real details appear only when a saved reply has them.', 'sp-note'));
 }
 function render(content) {
  if (content) container = content;
  if (!container?.isConnected || !visible()) return;
  const page = el('div', '', 'sp-page');
  const tabs = el('div', '', 'sp-tabs'); tabs.setAttribute('role', 'tablist');
  for (const [id, label] of [['connection', 'Connection'], ['appearance', 'Appearance & reading']]) tabs.append(btn(label, () => { tab = id; render(); }, '', {role: 'tab', 'aria-selected': String(tab === id)}));
  page.append(tabs);
  if (tab === 'appearance') appearanceTab(page);
  else if (failure) { page.append(el('p', failure, 'sp-note err'), btn('Try again', () => load(), 'btn secondary sp-secondary'), el('p', 'Reading preferences on the other tab work without the engine.', 'sp-note')); }
  else if (!config) page.append(el('p', 'Loading connection settings…', 'sp-note'));
  else connectionTab(page);
  container.replaceChildren(page);
 }
 return {render, open: load, reload: () => action(load), setTab(next) { tab = next; }};
}
