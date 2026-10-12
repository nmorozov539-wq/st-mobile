// Settings page: Connection and Appearance & reading. Connection writes reuse the verified `configure` bridge actions.
import {el, btn} from './wi-ui.js?build=0.7.13';
import {icon} from './icons.js?build=0.7.13';
import {normalizeAppearance, SPACING, TEXT_SIZE} from './appearance.js?build=0.7.13';
import {FRONTEND_BUILD} from './build.js?build=0.7.13';

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
   form = {endpoint: selected.endpoint ?? '', key: '', model: selected.model ?? '', manual: false};
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
 async function saveConnection() {
  const selected = config.selected;
  if (selected.source !== 'custom') await persist('source', 'custom');
  if (!sameEndpoint(form.endpoint, config.selected.endpoint)) await persist('endpoint', form.endpoint.trim());
  if (form.model && form.model !== config.selected.model) await persist('model', form.model.trim());
 }
 const connect = () => run('Saving and checking the connection…', async () => {
  await saveConnection(); const key = form.key; form.key = '';
  await persist('connect', key); onChecked();
  say(`Connected · ${config.models.length} models loaded`, config.onlineStatus === 'no_connection' ? 'err' : 'ok');
  if (config.onlineStatus === 'no_connection') say('Not connected. Check the endpoint, key and that the proxy is running.', 'err');
  form.endpoint = config.selected.endpoint ?? ''; form.model = config.selected.model ?? '';
 });
 const testMessage = () => run('Sending a tiny test message (up to 16 output tokens)…', async () => {
  await saveConnection();
  if (form.key.trim()) { await persist('providerKey', form.key); form.key = ''; }
  await persist('test'); onChecked();
  say('', ''); form.reply = config.testResult ? {model: config.selected.model, text: config.testResult.reply} : null;
 });
 const refreshModels = () => run('Refreshing the model list…', async () => {
  await saveConnection(); const key = form.key; form.key = ''; await persist('connect', key);
  say(config.onlineStatus === 'no_connection' ? 'Not connected. The model list could not be refreshed.' : `Models refreshed · ${config.models.length} available`, config.onlineStatus === 'no_connection' ? 'err' : 'ok');
 });

 function connectionTab(page) {
  const selected = config.selected, custom = selected.source === 'custom';
  const engine = el('div', '', 'sp-engine'); const text = el('div'); text.append(el('strong', 'SillyTavern engine'), el('small', connected() ? 'Connected · Local' : 'Not connected'));
  const re = btn('', () => reconnect(), 'sp-link'); re.append(icon('reply'), ' Reconnect'); engine.append(text, re);
  page.append(engine, el('h2', 'Chat Completion', 'sp-heading'), el('p', custom ? 'Custom · OpenAI-compatible' : `Currently ${selected.source}. Saving switches to Custom · OpenAI-compatible.`, 'sp-sub'));

  const row = el('div', '', 'sp-switch-row'); row.append(el('span', 'Use proxy'));
  const toggle = btn('', () => {
   if (proxyOn()) form.endpoint = directEndpoint(); else { saveDirect(form.endpoint); form.endpoint = PROXY_ENDPOINT; }
   say('Endpoint switched · Ready to connect', 'ok'); render();
  }, 'sp-switch', {role: 'switch', 'aria-checked': String(proxyOn()), 'aria-label': 'Use proxy'});
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

  const key = el('input'); key.type = showKey ? 'text' : 'password'; key.autocomplete = 'off'; key.value = form.key;
  key.placeholder = config.hasProviderKey ? 'Saved key · Leave blank to keep' : 'Paste API key'; key.oninput = () => { form.key = key.value; };
  const keyRow = el('div', '', 'sp-with-button'); keyRow.append(fieldBlock('API key', key));
  keyRow.append(btn('👁', () => { showKey = !showKey; render(); }, 'sp-icon-btn', {'aria-label': showKey ? 'Hide API key' : 'Show API key'})); page.append(keyRow);

  const models = [...config.models]; if (form.model && !models.some(item => item.id === form.model)) models.unshift({id: form.model, name: form.model});
  const picker = el('select');
  for (const item of models) { const option = el('option', item.name); option.value = item.id; picker.append(option); }
  const manual = el('option', 'Enter a model ID…'); manual.value = MANUAL; picker.append(manual);
  picker.value = form.manual ? MANUAL : (form.model || (models[0]?.id ?? MANUAL));
  picker.onchange = () => { if (picker.value === MANUAL) form.manual = true; else { form.manual = false; form.model = picker.value; } render(); };
  const modelRow = el('div', '', 'sp-with-button'); modelRow.append(fieldBlock('Global model', picker));
  modelRow.append(btn('', () => refreshModels(), 'sp-icon-btn', {'aria-label': 'Refresh model list'})); modelRow.lastChild.append(icon('reply')); page.append(modelRow);
  if (form.manual || (!models.length)) {
   const id = el('input'); id.value = form.model; id.placeholder = 'Provider’s exact model ID'; id.autocomplete = 'off'; id.spellcheck = false; id.oninput = () => { form.model = id.value; };
   page.append(fieldBlock('Model ID', id));
  }
  page.append(el('p', 'Default model for chats without their own selection.', 'sp-note'));

  const connectButton = btn('', connect, 'sp-primary', working ? {disabled: ''} : {}); connectButton.append(icon('link'), ' Connect');
  page.append(connectButton);
  const known = config.onlineStatus === 'no_connection' ? 'Not connected' : `Connected · ${config.models.length} models loaded`;
  page.append(el('p', message || known, `sp-note ${message ? messageKind : (config.onlineStatus === 'no_connection' ? '' : 'ok')}`), el('p', 'Saves connection settings and checks access.', 'sp-note'), el('hr', '', 'sp-rule'));
  const test = btn('', testMessage, 'sp-secondary', working ? {disabled: ''} : {}); test.append(icon('chat'), ' Test message');
  page.append(test, el('p', `Using ${form.model || config.selected.model || 'no model selected'}`, 'sp-note'), el('p', 'Sends a small generation request. Provider charges may apply.', 'sp-note'));
  if (form.reply) page.append(el('div', `Test reply · ${form.reply.model} ${form.reply.text}`, 'sp-reply'));
  page.append(el('p', `Pocket Tavern ${FRONTEND_BUILD} · engine bridge ${config.bridgeBuild ?? 'older build — update and restart ST'}`, 'sp-note'));
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
   const group = el('div', '', 'sp-seg'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', title);
   for (const [id, label] of options) group.append(btn(label, () => commit({[name]: id}), '', {'aria-pressed': String(value[name] === id)}));
   page.append(el('p', title, 'sp-label'), group);
  };
  segmented('Line spacing', 'spacing', [['compact', 'Compact'], ['normal', 'Normal'], ['spacious', 'Spacious']]);
  segmented('Background', 'background', [['plain', 'Plain'], ['gradient', 'Gradient']]);
  page.append(el('hr', '', 'sp-rule'), el('p', 'Message details', 'sp-label'));
  const flags = [['time', 'Generation time', 'Time taken to finish each reply.'], ['clock', 'Clock timestamp', ''], ['model', 'Model icon', 'Tap the icon to see the full model name.'], ['tokens', 'Token count', 'Shown only when the saved reply has one.']];
  for (const [name, label, hint] of flags) {
   const row = el('div', '', 'sp-switch-row'); row.append(el('span', label), btn('', () => commit({details: {[name]: !value.details[name]}}), 'sp-switch', {role: 'switch', 'aria-checked': String(value.details[name]), 'aria-label': label}));
   page.append(row); if (hint) page.append(el('p', hint, 'sp-note'));
  }
  page.append(el('p', 'Live preview', 'sp-preview-title'));
  const preview = el('div', '', 'sp-preview');
  const detailBits = () => { const d = getAppearance().details; return [d.time && '⏱ 8.4s', d.clock && '9:41 PM', d.model && '✦', d.tokens && '312 tokens'].filter(Boolean).join('  ·  '); };
  const line = el('p', '', 'sp-note');
  preview.append(el('p', 'Seraphina', 'who'), Object.assign(el('p', 'She smiles, tracing a faded line through the mountains.', 'bubble'), {style: 'font-style:italic'}), el('p', '“Here. But we should leave before dawn. We have a long road ahead.”', 'bubble'), line);
  const you = el('div', '', 'user-bubble'); you.append(el('p', 'You', 'who'), el('p', '“Then we’d better get some sleep.”', 'bubble')); preview.append(you);
  function updatePreview() { line.textContent = detailBits() || 'No message details'; }
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
  else if (failure) { page.append(el('p', failure, 'sp-note err'), btn('Try again', () => load(), 'sp-secondary'), el('p', 'Reading preferences on the other tab work without the engine.', 'sp-note')); }
  else if (!config) page.append(el('p', 'Loading connection settings…', 'sp-note'));
  else connectionTab(page);
  container.replaceChildren(page);
 }
 return {render, open: load, reload: () => action(load), setTab(next) { tab = next; }};
}
