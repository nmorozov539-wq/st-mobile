// Phase 5: full-page Summaryception memory panel.
// Renders into #page-content when page === 'memory'. All writes go through the
// verified extension actions (settings, snippet, clear, import, repair, reset).
import {icon} from './icons.js?build=0.8.0-phase3';
const EDITABLE = ['enabled', 'pauseSummarization', 'verbatimTurns', 'turnsPerSummary', 'snippetsPerLayer', 'snippetsPerPromotion', 'maxLayers', 'disableGhosting', 'summarizerResponseLength', 'promptPreset', 'summarizerUserPrompt', 'summarizerSystemPrompt', 'injectionTemplate', 'stripPatterns', 'savedCustomPrompts', 'debugMode', 'traceMode'];

// Summarize now always says what it did; a short chat has nothing to summarize yet.
export function summaryNotice({replies, verbatim, changed}) {
 if (replies <= verbatim) return `Nothing to summarize yet. Memory keeps the latest ${verbatim} replies word for word and summarizes older ones; this chat has ${replies}.`;
 return changed ? 'Older replies summarized into memory.' : 'No new summary was written. Check Saved memories or the summarizer connection.';
}
export function createMemoryPanel({visible = () => true, rpc, action, connected, onBusy, onState = () => {}, onStopRequested = () => {}, notify = () => {}, refresh, locked}) {
 let current, loaded = false, wasBusy = false, pendingSettings = null, lastPolled = '', lastLocked = null, activeLayer = 0, promptName = '';
 const request = arg => rpc('extensions', {id: 'summaryception', ...arg}, 180000);
 const sectionStates = new Map();

 function el(tag, text = '', className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
 }
 const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

 // ---------- state ----------
 function statusText(value) {
  if (value.needsRebuild) return 'Memory needs rebuilding after history changes';
  if (value.failure) return value.failure;
  if (value.busy) return value.backlog ? 'Memory · Choice needed' : value.waiting ? 'Memory · Waiting' : 'Memory · Working';
  return 'Ready · Memory is up to date';
 }
 function layerSummary(value) {
  const layers = value.memory?.layers ?? [];
  const total = layers.reduce((n, l) => n + (l?.length ?? 0), 0);
  return total ? `${total} snippet${total !== 1 ? 's' : ''} across ${layers.length} layer${layers.length !== 1 ? 's' : ''}` : 'No summaries yet';
 }
 function changes(value) {
  if (!pendingSettings) return {};
  return Object.fromEntries(EDITABLE.filter(k => !same(pendingSettings[k], value.settings[k])).map(k => [k, pendingSettings[k]]));
 }
 function adopt(value) {
  lastPolled = JSON.stringify(value);
  current = value;
  onState(value);
  onBusy(value.busy);
  return value;
 }
 async function reread() {
  const value = adopt(await request({action: 'read'}));
  renderIfVisible(value);
  return value;
 }
 // Runs a verified extension write, then refreshes the chat and this page.
 const mutate = (arg, message) => action(async () => {
  try { await request(arg); await refresh(); await reread(); if (message) notify(message); }
  catch (e) { await reread().catch(() => {}); throw e; }
 });
 function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 const readFile = accept => new Promise(resolve => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept;
  input.onchange = async () => resolve(input.files[0] ? await input.files[0].text() : null);
  input.addEventListener('cancel', () => resolve(null));
  input.click();
 });

 // ---------- dialogs ----------
 function dialog(id) {
  let d = document.getElementById(id);
  if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'memory-dialog'; document.body.append(d); }
  return d;
 }
 function confirmDialog({title, text, confirm, danger = false}) {
  return new Promise(resolve => {
   const d = dialog('memory-confirm');
   let result = false;
   const ok = el('button', confirm, danger ? 'btn destructive memory-danger' : 'btn primary memory-primary');
   const cancel = el('button', 'Cancel');
   ok.onclick = () => { result = true; d.close(); };
   cancel.onclick = () => d.close();
   const actions = el('div', '', 'memory-dialog-actions');
   actions.append(cancel, ok);
   d.replaceChildren(el('h3', title), el('p', text), actions);
   d.onclose = () => resolve(result);
   d.showModal();
  });
 }
 function editDialog(text) {
  return new Promise(resolve => {
   const d = dialog('memory-edit');
   let result = null;
   const area = el('textarea');
   area.rows = 9; area.value = text;
   const label = el('label', 'Summary', 'memory-field');
   label.append(area);
   const save = el('button', 'Save', 'btn primary memory-primary');
   const cancel = el('button', 'Cancel');
   const sync = () => { save.disabled = !area.value.trim(); };
   area.oninput = sync; sync();
   save.onclick = () => { result = area.value.trim(); d.close(); };
   cancel.onclick = () => d.close();
   const actions = el('div', '', 'memory-dialog-actions');
   actions.append(cancel, save);
   d.replaceChildren(el('h3', 'Edit memory snippet'), label, actions);
   d.onclose = () => resolve(result);
   d.showModal();
  });
 }

 // ---------- shared catch-up card (page and chat) ----------
 function choiceCard(value) {
  if (!value?.backlog) return null;
  const card = el('div', '', 'card memory-catchup-card');
  card.append(el('strong', 'Catch up on older turns?'));
  card.append(el('p', `${value.backlog.turns} older turns need summarizing. Catching up takes about ${value.backlog.calls} summary request${value.backlog.calls !== 1 ? 's' : ''}, plus any layer promotions.`));
  const choose = (kind, label, note) => {
   const btn = el('button', label, kind === 'cancel' ? 'memory-catchup-cancel' : 'memory-catchup-option');
   btn.onclick = () => action(async () => {
    try { await request(kind === 'cancel' ? {action: 'stop'} : {action: 'choice', value: kind}); if (kind === 'cancel') onStopRequested(); await reread(); }
    catch (e) { await reread().catch(() => {}); throw e; }
   });
   card.append(btn);
   if (note) card.append(el('small', note, 'memory-catchup-note'));
  };
  choose('catchup', 'Summarize all older turns');
  choose('partial', 'Summarize one batch');
  choose('skip', 'Skip older turns', 'Skipping leaves those turns out of future summaries.');
  choose('cancel', 'Cancel');
  return card;
 }

 // ---------- page ----------
 function render(content, value) {
  current = value;
  onState(value);
  content.replaceChildren();
  content.className = 'memory-page';
  const off = value.busy || locked();
  const offline = !connected();
  const settings = pendingSettings ?? value.settings;
  const modern = value.settings.injectionTemplate !== undefined;
  const dirty = () => Object.keys(changes(value)).length > 0;
  const edit = (key, v) => { if (!pendingSettings) pendingSettings = {...value.settings}; pendingSettings[key] = v; updateSaveBtn(); };

  const statusLine = el('p', statusText(value), 'memory-status');
  statusLine.setAttribute('role', 'status');
  content.append(statusLine);
  if (value.target?.chatId) content.append(el('p', value.target.chatId, 'memory-chat-name'));

  const toggle = (label, key) => {
   const wrap = el('label', '', 'memory-toggle');
   const box = el('input');
   box.type = 'checkbox'; box.checked = !!settings[key]; box.disabled = off;
   box.onchange = () => edit(key, box.checked);
   wrap.append(box, ' ' + label);
   return wrap;
  };
  const numberField = (label, key, min = 1) => {
   const wrap = el('label', label, 'memory-field');
   const input = el('input');
   input.type = 'number'; input.min = min; input.inputMode = 'numeric'; input.step = 1;
   input.value = settings[key] ?? ''; input.disabled = off;
   input.oninput = () => { const n = Number(input.value); if (input.value !== '' && Number.isInteger(n) && n >= min) edit(key, n); };
   wrap.append(input);
   return wrap;
  };
  const textField = (label, key, {rows = 5, readOnly = false, map = v => v, show = v => v ?? ''} = {}) => {
   const wrap = el('label', label, 'memory-field');
   const area = el('textarea');
   area.rows = rows; area.value = show(settings[key]); area.disabled = off; area.readOnly = readOnly;
   area.oninput = () => edit(key, map(area.value));
   wrap.append(area);
   return {wrap, area};
  };

  content.append(toggle('Enable Summaryception', 'enabled'), toggle('Pause summarization', 'pauseSummarization'));
  content.append(el('small', 'Pause new summaries; keep existing memories in use.', 'memory-hint'));

  const summarizeBtn = el('button', '', 'btn primary memory-summarize-btn');
  summarizeBtn.append(icon('zap'), 'Summarize now');
  summarizeBtn.disabled = off;
  summarizeBtn.onclick = () => action(async () => {
   try {
    const result = (await request({action: 'summarize'}))?.summaryResult; await refresh(); await reread();
    if (result) notify(summaryNotice(result));
   }
   catch (e) { await reread().catch(() => {}); throw e; }
  });
  content.append(summarizeBtn);

  if (value.busy) {
   const stopBtn = el('button', 'Stop summarizing', 'btn destructive memory-stop-btn');
   stopBtn.onclick = () => action(async () => { onStopRequested(); await request({action: 'stop'}); await reread(); });
   content.append(stopBtn);
  }
  const card = choiceCard(value);
  if (card) content.append(card);

  // Saved memories
  content.append(memorySection('Saved memories', `This chat · ${layerSummary(value)}`, 'memory-saved', () => savedMemories(value, off)));

  // Injection preview
  content.append(memorySection('Injection preview', 'The memory text sent with your conversation', 'memory-injection', () => {
   const box = el('div', '', 'memory-injection-box');
   const text = value.injection;
   if (text === undefined) box.append(el('p', 'Preview needs the updated Summaryception extension. Restart the engine after updating.', 'memory-placeholder'));
   else if (!text) box.append(el('p', value.settings.enabled ? 'Nothing is injected yet: this chat has no summaries.' : 'Summaryception is disabled, so nothing is injected.', 'memory-placeholder'));
   else box.append(el('pre', text, 'memory-injection-text'));
   const refreshBtn = el('button', 'Refresh', 'btn secondary memory-secondary'); refreshBtn.prepend(icon('refresh'));
   refreshBtn.disabled = offline;
   refreshBtn.onclick = () => action(async () => { await reread(); });
   box.append(refreshBtn);
   return box;
  }));

  content.append(el('p', 'Configuration · Global', 'memory-config-divider'));

  // Turns & layers
  content.append(memorySection('Turns & layers', `Keep ${settings.verbatimTurns ?? '?'} recent turns · Summarize in batches of ${settings.turnsPerSummary ?? '?'}`, 'memory-turns', () => {
   const box = el('div');
   box.append(numberField('Recent assistant turns kept verbatim', 'verbatimTurns'), numberField('Turns per summary batch', 'turnsPerSummary'), numberField('Snippets per layer', 'snippetsPerLayer'), numberField('Snippets per promotion', 'snippetsPerPromotion'));
   if (modern) {
    box.append(numberField('Maximum layer depth', 'maxLayers'));
    box.append(toggle('Disable message hiding', 'disableGhosting'), el('small', 'Summarized messages stay visible to the model instead of being hidden.', 'memory-hint'));
   } else box.append(el('small', 'Layer depth and message hiding need the updated Summaryception extension.', 'memory-hint'));
   return box;
  }));

  // Summarizer prompts
  const presetNames = {narrative: 'Narrative', gamestate: 'Game state', custom: 'Custom'};
  content.append(memorySection('Summarizer prompts', `${presetNames[settings.promptPreset] ?? settings.promptPreset ?? 'Unknown'} · System, summary & wrapper`, 'memory-prompts', () => promptsSection({settings, off, modern, edit, textField, value})));

  // Summarizer connection
  const source = value.settings.connectionSource;
  const usable = !source || source === 'default';
  content.append(memorySection('Summarizer connection', usable ? 'Use the main ST connection' : `Set to ${source} in full ST`, 'memory-connection', () => {
   const box = el('div');
   box.append(el('p', usable ? 'Summaries use the main ST connection, including its proxy.' : `Summaryception is set to "${source}". Pocket can only summarize through the main ST connection; your other connection settings are kept.`, 'memory-hint'));
   if (!usable) {
    const useMain = el('button', 'Use the main ST connection', 'btn secondary memory-secondary');
    useMain.disabled = off;
    useMain.onclick = () => mutate({action: 'settings', value: {connectionSource: 'default'}}, 'Using the main ST connection');
    box.append(useMain);
   }
   box.append(numberField('Summary output token limit (0 uses the preset)', 'summarizerResponseLength', 0));
   box.append(el('small', 'Separate endpoints, API keys and models stay in full ST. Pocket never stores another provider’s key.', 'memory-hint'));
   return box;
  }));

  // Layer statistics
  content.append(memorySection('Layer statistics', layerSummary(value), 'memory-stats', () => {
   const table = el('table', '', 'memory-stats-table');
   const rows = (value.memory?.layers ?? []).map((l, i) => [`Layer ${i}`, `${l?.length ?? 0} snippet${l?.length === 1 ? '' : 's'}`]);
   rows.push(['Recent verbatim turns', String(settings.verbatimTurns ?? '?')]);
   for (const [a, b] of rows) { const tr = el('tr'); tr.append(el('td', a), el('td', b)); table.append(tr); }
   return table;
  }));

  // Maintenance
  content.append(memorySection('Maintenance', 'Import, export, repair & clear memory', 'memory-maintenance', () => {
   const box = el('div');
   box.append(el('h4', 'Memory for this conversation', 'memory-subhead'));
   const row = el('div', '', 'memory-button-row');
   const button = (label, fn, {danger = false, disabled = off} = {}) => {
    const b = el('button', label, danger ? 'btn destructive memory-danger-outline' : 'btn secondary memory-secondary');
    b.disabled = disabled || !modern;
    b.onclick = fn;
    row.append(b);
    return b;
   };
   button('Import memory', () => action(async () => {
    const text = await readFile('.json,application/json');
    if (text === null) return;
    let data;
    try { data = JSON.parse(text); } catch { throw Error('That file is not valid JSON.'); }
    if (!await confirmDialog({title: 'Replace this memory?', text: 'Importing replaces the saved memory for this conversation and re-hides the summarized messages. Export first if you want a backup.', confirm: 'Import'})) return;
    await mutate({action: 'import', value: {data}}, 'Memory imported');
   }));
   button('Export memory', () => action(async () => {
    const result = await request({action: 'export'});
    download(`summaryception_${(value.target?.chatId ?? 'chat').replace(/[^\w.-]+/g, '_')}.json`, JSON.stringify(result.exported, null, 2), 'application/json');
    notify('Memory exported');
   }), {disabled: offline});
   button('Repair orphans', () => mutate({action: 'repair'}, 'Memory checked'));
   button('Clear memory', () => action(async () => {
    if (!await confirmDialog({title: 'Clear memory?', text: 'This deletes every saved summary for this conversation and shows the hidden messages again. Your chat messages are not deleted.', confirm: 'Clear memory', danger: true})) return;
    await mutate({action: 'clear'}, 'Memory cleared');
   }), {danger: true});
   box.append(row);
   box.append(el('small', 'Repair removes snippets that belong to a branch that no longer exists. After history edits, Clear memory lets Summarize now rebuild it.', 'memory-hint'));
   box.append(el('h4', 'Global configuration', 'memory-subhead'));
   if (modern) {
    box.append(toggle('Debug logging', 'debugMode'), toggle('Trace logging', 'traceMode'));
    const reset = el('button', 'Reset to defaults', 'memory-link-danger');
    reset.disabled = off;
    reset.onclick = () => action(async () => {
     if (!await confirmDialog({title: 'Reset to defaults?', text: 'Resets turns, prompts, wrapper, strip patterns, output limit and logging. Saved memories, saved custom prompts and connection settings are kept.', confirm: 'Reset', danger: true})) return;
     pendingSettings = null;
     await mutate({action: 'reset'}, 'Settings reset to defaults');
    });
    box.append(reset);
   } else box.append(el('small', 'These controls need the updated Summaryception extension.', 'memory-hint'));
   return box;
  }));

  content.append(el('p', 'Configuration applies to all chats. Saved memories belong to this conversation.', 'memory-footer'));

  const saveBar = el('div', '', 'memory-savebar');
  const saveBtn = el('button', 'Save settings', 'btn primary memory-save-btn');
  saveBtn.disabled = !dirty() || off;
  saveBtn.onclick = () => action(async () => {
   const delta = changes(value);
   if (!Object.keys(delta).length) return;
   try {
    await request({action: 'settings', value: delta});
    pendingSettings = null;
    await reread();
    notify('Memory settings saved in ST');
   } catch (e) { await reread().catch(() => {}); throw e; }
  });
  saveBar.append(saveBtn);
  content.append(saveBar);
  function updateSaveBtn() { saveBtn.disabled = !dirty() || off; }
 }

 function promptsSection({settings, off, modern, edit, textField, value}) {
  const box = el('div');
  const presetWrap = el('label', 'Prompt preset', 'memory-field');
  const select = el('select');
  for (const [id, label] of [['narrative', 'Narrative'], ['gamestate', 'Game state'], ['custom', 'Custom']]) { const o = el('option', label); o.value = id; select.append(o); }
  select.value = settings.promptPreset ?? 'narrative'; select.disabled = off;
  presetWrap.append(select);
  box.append(presetWrap);
  const isCustom = () => select.value === 'custom';
  const user = textField('Summary prompt', 'summarizerUserPrompt', {rows: 8, readOnly: !isCustom()});
  select.onchange = () => { edit('promptPreset', select.value); user.area.readOnly = !isCustom(); manager.hidden = !isCustom(); };

  // saved custom prompts
  const manager = el('div', '', 'memory-prompt-manager');
  manager.hidden = !isCustom();
  if (modern) {
   const saved = settings.savedCustomPrompts ?? {};
   const names = Object.keys(saved).sort();
   const slotWrap = el('label', 'Saved prompts', 'memory-field');
   const slot = el('select');
   const none = el('option', '— Load a saved prompt —'); none.value = ''; slot.append(none);
   for (const n of names) { const o = el('option', n); o.value = n; slot.append(o); }
   slot.disabled = off || !names.length;
   slotWrap.append(slot);
   const row = el('div', '', 'memory-button-row');
   const load = el('button', 'Load', 'btn secondary memory-secondary'), del = el('button', 'Delete', 'btn destructive memory-danger-outline');
   load.disabled = del.disabled = off;
   load.onclick = () => { if (!slot.value) return; user.area.value = saved[slot.value]; edit('summarizerUserPrompt', saved[slot.value]); promptName = slot.value; };
   del.onclick = () => action(async () => {
    if (!slot.value) return;
    if (!await confirmDialog({title: `Delete "${slot.value}"?`, text: 'The saved prompt is removed when you press Save settings.', confirm: 'Delete', danger: true})) return;
    const next = {...saved}; delete next[slot.value];
    edit('savedCustomPrompts', next); renderIfVisible(current);
   });
   row.append(load, del);
   const nameWrap = el('label', 'Prompt name', 'memory-field');
   const nameInput = el('input'); nameInput.type = 'text'; nameInput.maxLength = 80; nameInput.value = promptName; nameInput.disabled = off;
   nameInput.oninput = () => { promptName = nameInput.value; };
   nameWrap.append(nameInput);
   const row2 = el('div', '', 'memory-button-row');
   const saveP = el('button', 'Save prompt', 'btn secondary memory-secondary'), imp = el('button', 'Import', 'btn secondary memory-secondary'), exp = el('button', 'Export', 'btn secondary memory-secondary');
   saveP.disabled = imp.disabled = off;
   saveP.onclick = () => { const n = promptName.trim(); if (!n || !user.area.value.trim()) { notify('Enter a prompt name and some prompt text.'); return; } edit('savedCustomPrompts', {...saved, [n]: user.area.value}); renderIfVisible(current); };
   imp.onclick = () => action(async () => { const text = await readFile('.txt,.md,text/plain'); if (text === null) return; user.area.value = text; edit('summarizerUserPrompt', text); });
   exp.onclick = () => { if (!user.area.value.trim()) { notify('The prompt is empty.'); return; } download(`${(promptName.trim() || 'summary-prompt').replace(/[^\w.-]+/g, '_')}.txt`, user.area.value, 'text/plain'); };
   row2.append(saveP, imp, exp);
   manager.append(slotWrap, row, nameWrap, row2, el('small', 'Saved prompts are stored with your Summaryception settings after Save settings.', 'memory-hint'));
  }
  box.append(manager, user.wrap);
  if (modern) {
   box.append(textField('System prompt', 'summarizerSystemPrompt', {rows: 4}).wrap);
   box.append(textField('Injection wrapper', 'injectionTemplate', {rows: 6, map: v => v}).wrap);
   box.append(el('small', 'The wrapper must contain {{summary}}; it marks where the memory text goes.', 'memory-hint'));
   box.append(textField('Strip patterns (one per line)', 'stripPatterns', {rows: 5, map: v => v.split('\n').filter(l => l.trim()), show: v => (v ?? []).join('\n')}).wrap);
  } else box.append(el('small', 'System prompt, wrapper and strip patterns need the updated Summaryception extension.', 'memory-hint'));
  box.append(el('small', 'A built-in preset replaces the summary prompt when saved. Choose Custom to edit it.', 'memory-hint'));
  return box;
 }

 function savedMemories(value, off) {
  const layers = value.memory?.layers ?? [];
  const wrap = el('div', '', 'memory-saved-wrap');
  if (!layers.some(l => l?.length)) { wrap.append(el('p', 'No summaries in this conversation yet.', 'memory-placeholder')); return wrap; }
  if (activeLayer >= layers.length) activeLayer = 0;
  const tabs = el('div', '', 'memory-layer-tabs');
  layers.forEach((layer, i) => {
   const tab = el('button', `Layer ${i} · ${layer?.length ?? 0}`);
   tab.type = 'button';
   tab.setAttribute('aria-pressed', String(i === activeLayer));
   tab.onclick = () => { activeLayer = i; renderIfVisible(current); };
   tabs.append(tab);
  });
  wrap.append(tabs);
  const blocked = off || value.needsRebuild || value.settings.injectionTemplate === undefined;
  (layers[activeLayer] ?? []).forEach((snippet, index) => {
   const card = el('article', '', 'card memory-snippet');
   const range = Array.isArray(snippet.turnRange) ? `Messages ${snippet.turnRange[0] + 1}–${snippet.turnRange[1] + 1}` : '';
   const when = snippet.timestamp ? new Date(snippet.timestamp).toLocaleString() : '';
   if (range || when) card.append(el('small', [range, when].filter(Boolean).join(' · ')));
   card.append(el('p', snippet.text ?? ''));
   const row = el('div', '', 'memory-snippet-actions');
   const target = {layer: activeLayer, index, expected: snippet.text};
   const editBtn = el('button', 'Edit', 'btn secondary memory-secondary');
   editBtn.onclick = () => action(async () => {
    const text = await editDialog(snippet.text);
    if (text === null || text === snippet.text) return;
    await mutate({action: 'snippet', value: {op: 'edit', ...target, text}}, 'Snippet saved');
   });
   row.append(editBtn);
   if (snippet.turnRange) {
    const redo = el('button', 'Regenerate', 'btn secondary memory-secondary');
    redo.onclick = () => action(async () => {
     if (!await confirmDialog({title: 'Regenerate this memory?', text: `Summarizes ${range.toLowerCase()} again with your summarizer. This sends a request that may cost money, and replaces the current text.`, confirm: 'Regenerate'})) return;
     await mutate({action: 'snippet', value: {op: 'regenerate', ...target}}, 'Snippet regenerated');
    });
    row.append(redo);
   }
   const del = el('button', 'Delete', 'btn destructive memory-danger-outline');
   del.onclick = () => action(async () => {
    if (!await confirmDialog({title: 'Delete this memory?', text: 'The snippet is removed from the injected memory. Your chat messages are not deleted.', confirm: 'Delete', danger: true})) return;
    await mutate({action: 'snippet', value: {op: 'delete', ...target}}, 'Snippet deleted');
   });
   row.append(del);
   for (const b of row.children) b.disabled = blocked;
   card.append(row);
   wrap.append(card);
  });
  if (value.needsRebuild) wrap.append(el('small', 'Editing is paused until memory is rebuilt. Use Maintenance › Clear memory, then Summarize now.', 'memory-hint'));
  return wrap;
 }

 function memorySection(title, subtitle, key, build) {
  const details = document.createElement('details');
  details.className = 'memory-section';
  if (sectionStates.get(key)) details.open = true;
  details.ontoggle = () => sectionStates.set(key, details.open);
  const summary = document.createElement('summary');
  summary.append(el('strong', title));
  if (subtitle) summary.append(el('small', subtitle));
  details.append(summary, build());
  return details;
 }

 function renderIfVisible(value) {
  const content = document.getElementById('page-content');
  if (visible() && content?.classList.contains('memory-page') && value) render(content, value);
 }
 const typing = () => {
  const content = document.getElementById('page-content');
  return content?.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
 };

 // ---------- polling ----------
 async function poll() {
  if (!connected()) return;
  try {
   const value = await request({action: 'read'});
   const changed = JSON.stringify(value) !== lastPolled;
   lastPolled = JSON.stringify(value);
   current = value;
   onState(value);
   onBusy(value.busy);
   if (changed && !typing()) renderIfVisible(value);
   if (wasBusy && !value.busy) await refresh();
   wasBusy = value.busy;
  } catch { onBusy(false); }
 }
 setInterval(poll, 2000);

 return {
  setLocked(value) {
   if (lastLocked === value) return;
   lastLocked = value;
   if (current && !typing()) renderIfVisible(current);
  },
  setAvailable() {},
  loaded: () => loaded,
  choiceCard,
  renderPage(content) {
   if (!current) {
    content.replaceChildren();
    content.className = 'memory-page';
    content.append(el('p', 'Loading memory state…', 'memory-status'));
    request({action: 'read'}).then(value => { loaded = true; adopt(value); if (visible()) render(content, value); })
     .catch(e => { if (!visible()) return; content.replaceChildren(); content.append(el('p', e.message, 'memory-status')); });
    return;
   }
   render(content, current);
   poll();
  },
  async open() {
   pendingSettings = null;
   try { loaded = true; adopt(await request({action: 'read'})); } catch { /* the page shows its loading or error state */ }
  }
 };
}
