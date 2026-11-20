// Phase 6d: global World Info activation settings. Shared across all chats; saved only after ST confirms them.
import {el, btn, checkbox, field, select, section, confirmDialog} from './wi-ui.js?build=0.9.1';

const STRATEGIES = [[0, 'Sorted evenly'], [1, 'Character lore first'], [2, 'Global lore first']];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createActivationPage({request, action, notify, locked, back, changed, visible = () => true}) {
 let orig = null, draft = null, container = null, error = '', saving = false;

 async function open() { const result = await request({action: 'activation'}); orig = result.activation; draft = structuredClone(orig); error = ''; }
 function diff() { return draft ? Object.fromEntries(Object.entries(draft).filter(([key, value]) => !same(value, orig[key]))) : {}; }
 const dirty = () => !!draft && Object.keys(diff()).length > 0;
 function sync() { const save = container?.querySelector('.wi-save'); if (save) save.disabled = locked() || saving || !dirty(); }
 function set(key, value, refresh) {
  draft[key] = value; error = '';
  if (key === 'world_info_min_activations' && value > 0) draft.world_info_max_recursion_steps = 0;
  if (key === 'world_info_max_recursion_steps' && value > 0) draft.world_info_min_activations = 0;
  if (refresh) render(); else sync();
 }
 const HARD_MAX = {world_info_depth: 1000, world_info_budget_cap: 65536};
 function slider(key, label, min, max, hint) {
  const wrap = el('div', '', 'wi-field wi-slider'); wrap.append(el('span', label));
  const limit = HARD_MAX[key] ?? max;
  const current = Number.isFinite(draft[key]) ? draft[key] : min;
  const range = el('input'); range.type = 'range'; range.min = min;
  // A value saved in SillyTavern above the comfortable range still has to be reachable on the slider.
  range.max = Math.max(max, Math.min(limit, current)); range.value = current;
  const exact = el('input'); exact.type = 'number'; exact.inputMode = 'numeric'; exact.min = min; exact.max = limit; exact.value = current;
  exact.setAttribute('aria-label', `${label} exact value`);
  const clamp = value => Math.max(min, Math.min(limit, Math.round(value)));
  const exclusive = key === 'world_info_min_activations' || key === 'world_info_max_recursion_steps';
  // Never re-render while a finger is on the slider: replacing the node cancels the drag.
  range.oninput = () => { exact.value = range.value; set(key, Number(range.value)); };
  range.onchange = () => { if (exclusive) render(); };
  exact.onchange = () => {
   if (exact.value === '' || !Number.isFinite(Number(exact.value))) exact.value = draft[key];
   const value = clamp(Number(exact.value)); exact.value = value;
   range.max = Math.max(max, value); range.value = value;
   set(key, value, exclusive);
  };
  const row = el('div', '', 'wi-slider-row'); row.append(range, exact); wrap.append(row);
  if (hint) wrap.append(el('small', hint, 'wi-hint'));
  return wrap;
 }
 function render(content) {
  if (content) container = content;
  if (!container?.isConnected || !visible()) return;
  if (!draft) { container.replaceChildren(el('p', 'Open World Info activation from the library.', 'wi-note')); return; }
  const page = el('div', '', 'wi-page wi-editor');
  page.append(el('p', 'Global · shared across all chats and characters', 'wi-scope'));
  const a = el('div', '', 'wi-section-body');
  a.append(slider('world_info_depth', 'Scan depth', 0, 100, 'How many recent messages are searched for keywords.'), slider('world_info_budget', 'Context %', 1, 100, 'Share of the context window World Info may use.'), slider('world_info_budget_cap', 'Budget cap (tokens)', 0, 8192, '0 means no cap.'), checkbox('Include names', draft.world_info_include_names, on => set('world_info_include_names', on), 'Add speaker names to the text that is scanned.'));
  page.append(section('Scanning & budget', '', true, a));
  const b = el('div', '', 'wi-section-body');
  b.append(slider('world_info_min_activations', 'Min activations', 0, 100, 'Keep scanning deeper until this many entries activate. Turns Max recursion steps off.'), slider('world_info_min_activations_depth_max', 'Max depth', 0, 100, 'Deepest message to scan when Min activations is set; 0 means the whole chat.'), slider('world_info_max_recursion_steps', 'Max recursion steps', 0, 10, 'Limits chained activations; 0 is unlimited. Turns Min activations off.'), checkbox('Recursive scan', draft.world_info_recursive, on => set('world_info_recursive', on), 'Activated entries can activate more entries.'), field('Insertion strategy', select(STRATEGIES, draft.world_info_character_strategy, value => set('world_info_character_strategy', Number(value)))));
  page.append(section('Activation & recursion', '', true, b));
  const c = el('div', '', 'wi-section-body');
  c.append(checkbox('Case-sensitive', draft.world_info_case_sensitive, on => set('world_info_case_sensitive', on)), checkbox('Match whole words', draft.world_info_match_whole_words, on => set('world_info_match_whole_words', on)), checkbox('Use group scoring', draft.world_info_use_group_scoring, on => set('world_info_use_group_scoring', on)), checkbox('Alert on overflow', draft.world_info_overflow_alert, on => set('world_info_overflow_alert', on)));
  page.append(section('Matching defaults', 'Entries can override these.', true, c));
  if (error) page.append(el('p', error, 'wi-error'));
  const footer = el('div', '', 'wi-footer');
  footer.append(btn('Cancel', () => action(cancel)), btn('Save', () => action(save), 'btn secondary wi-btn primary wi-primary wi-save'));
  page.append(footer);
  container.replaceChildren(page); sync();
 }
 async function cancel() {
  if (dirty() && !await confirmDialog({title: 'Discard changes?', text: 'Activation settings have not been saved.', confirm: 'Discard', danger: true})) return;
  draft = null; back();
 }
 async function save() {
  if (locked()) { notify('Wait for the engine to finish before saving.'); return; }
  saving = true; sync();
  try { await request({action: 'configureActivation', changes: diff()}); draft = null; notify('Activation settings saved.'); changed(); back(); }
  catch (e) { error = e.message; render(); }
  finally { saving = false; sync(); }
 }
 return {open, render, dirty, cancel, discard() { draft = null; }};
}
