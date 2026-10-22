// Phase 6c: World Info entry editor. Sends only the fields the person changed, guarded by the book revision.
import {el, btn, checkbox, field, select, numberInput, section, modal, confirmDialog} from './wi-ui.js?build=0.7.14';

export const POSITIONS = [[0, 'Before character definitions'], [1, 'After character definitions'], [2, 'Top of Author’s Note'], [3, 'Bottom of Author’s Note'], [4, 'At depth'], [5, 'Before example messages'], [6, 'After example messages'], [7, 'Outlet']];
export const LOGIC = [[0, 'AND ANY'], [3, 'AND ALL'], [1, 'NOT ALL'], [2, 'NOT ANY']];
const TRIGGERS = [['normal', 'Normal'], ['continue', 'Continue'], ['impersonate', 'Impersonate'], ['swipe', 'Swipe'], ['regenerate', 'Regenerate'], ['quiet', 'Quiet']];
const ROLES = [[0, 'System'], [1, 'User'], [2, 'Assistant']];
const TRI = [['', 'Use global setting'], ['true', 'Yes'], ['false', 'No']];
const MATCH = [['matchPersonaDescription', 'Persona description'], ['matchCharacterDescription', 'Character description'], ['matchCharacterPersonality', 'Character personality'], ['matchCharacterDepthPrompt', 'Character depth prompt'], ['matchScenario', 'Scenario'], ['matchCreatorNotes', 'Creator’s notes']];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function strategyOf(fields) { return fields.constant ? 'constant' : fields.vectorized ? 'vectorized' : 'keyword'; }

const clampInput = (node, value, min, max) => { const clamped = Math.min(max, Math.max(min, value)); if (clamped !== value) node.value = clamped; return clamped; };

export function createEntryEditor({request, action, notify, locked, back, setSubtitle, changed, visible = () => true}) {
 let state = null, container = null, saving = false;

 async function open(name, uid) {
  const result = await request({action: 'entry', name, uid});
  const keyText = (result.fields.key ?? []).join(', '), secondaryText = (result.fields.keysecondary ?? []).join(', ');
  state = {name, uid, revision: result.revision, orig: result.fields, keyText, secondaryText, tagFilterCount: result.tagFilterCount, draft: structuredClone(result.fields), draftKey: keyText, draftSecondary: secondaryText, error: ''};
 }
 function changes() {
  if (!state) return {};
  const out = {};
  for (const [name, value] of Object.entries(state.draft)) {
   if (name === 'key' || name === 'keysecondary') continue;
   if (!same(value, state.orig[name])) out[name] = value;
  }
  if (out.constant === true) out.vectorized = false;
  if (out.vectorized === true) out.constant = false;
  if (state.draft.probability !== state.orig.probability && out.useProbability === undefined) out.useProbability = true;
  return out;
 }
 const dirty = () => !!state && (state.draftKey !== state.keyText || state.draftSecondary !== state.secondaryText || Object.keys(changes()).length > 0);
 const set = (name, value, refresh = false) => { state.draft[name] = value; state.error = ''; if (refresh) render(); else sync(); };
 function sync() { const save = container?.querySelector('.wi-save'); if (save) save.disabled = locked() || saving || !dirty(); }

 function render(content) {
  if (content) container = content;
  if (!container?.isConnected || !visible()) return;
  if (!state) { container.replaceChildren(el('p', 'Choose an entry from a World Info book.', 'wi-note')); return; }
  setSubtitle(`${state.name} · UID ${state.uid}`);
  const d = state.draft, page = el('div', '', 'wi-page wi-editor');

  const title = el('input'); title.value = d.comment; title.maxLength = 5000; title.oninput = () => set('comment', title.value);
  page.append(field('Title / memo', title));

  const strategy = select([['keyword', '● Keyword'], ['constant', '◆ Always on'], ['vectorized', '▲ Vectorized']], strategyOf(d), value => { d.constant = value === 'constant'; d.vectorized = value === 'vectorized'; state.error = ''; render(); });
  const position = select(POSITIONS, d.position, value => set('position', Number(value), true));
  const row1 = el('div', '', 'wi-row'); row1.append(field('Strategy', strategy), field('Position', position)); page.append(row1);
  if (d.position === 4) { const depth = el('div', '', 'wi-row'); depth.append(field('Depth', numberInput(d.depth, v => set('depth', v), {min: 0, max: 10000})), field('Role', select(ROLES, d.role, v => set('role', Number(v))))); page.append(depth); }
  if (d.position === 7) { const outlet = el('input'); outlet.value = d.outletName; outlet.maxLength = 200; outlet.oninput = () => set('outletName', outlet.value); page.append(field('Outlet name', outlet, 'Used by {{outlet::name}} macros.')); }
  const row2 = el('div', '', 'wi-row'); row2.append(field('Order', numberInput(d.order, v => set('order', v), {min: -100000000, max: 100000000})), field('Trigger %', (() => { const node = numberInput(d.probability, v => set('probability', clampInput(node, v, 0, 100)), {min: 0, max: 100}); return node; })())); page.append(row2);
  page.append(checkbox('Enabled', !d.disable, on => set('disable', !on)));

  if (strategyOf(d) !== 'constant') {
   const keys = el('textarea'); keys.rows = 2; keys.value = state.draftKey; keys.placeholder = 'keyword, another keyword, /regex/i'; keys.oninput = () => { state.draftKey = keys.value; state.error = ''; sync(); };
   page.append(field('Primary keywords', keys, 'Separate with commas. Use /pattern/flags for regular expressions.'));
   const secondary = el('textarea'); secondary.rows = 2; secondary.value = state.draftSecondary; secondary.oninput = () => { state.draftSecondary = secondary.value; state.error = ''; sync(); };
   const logicRow = el('div', '', 'wi-row'); logicRow.append(field('Logic', select(LOGIC, d.selectiveLogic, v => set('selectiveLogic', Number(v)))), field('Optional filter', secondary)); page.append(logicRow);
  }

  const overrides = el('div', '', 'wi-section-body');
  overrides.append(field('Scan depth', numberInput(d.scanDepth, v => set('scanDepth', v), {min: 0, max: 1000, nullable: true, placeholder: 'Global'}), 'Empty uses the global scan depth.'));
  for (const [name, label] of [['caseSensitive', 'Case-sensitive'], ['matchWholeWords', 'Match whole words'], ['useGroupScoring', 'Use group scoring']]) overrides.append(field(label, select(TRI, d[name] === null ? '' : String(d[name]), v => set(name, v === '' ? null : v === 'true'))));
  overrides.append(el('p', 'Also scan:', 'wi-subhead'));
  for (const [name, label] of MATCH) overrides.append(checkbox(label, d[name], on => set(name, on)));
  page.append(section('Per-entry overrides', '', false, overrides));

  const flags = el('div', '', 'wi-checks');
  flags.append(checkbox('Non-recursable', d.excludeRecursion, on => set('excludeRecursion', on), 'Not activated by other entries’ text.'), checkbox('Prevent further recursion', d.preventRecursion, on => set('preventRecursion', on), 'Its text will not activate other entries.'),
   checkbox('Delay until recursion', d.delayUntilRecursion > 0, on => set('delayUntilRecursion', on ? Math.max(1, state.orig.delayUntilRecursion) : 0, true)), checkbox('Ignore budget', d.ignoreBudget, on => set('ignoreBudget', on), 'Inserted even when the budget is full.'));
  if (d.delayUntilRecursion > 0) flags.append(field('Recursion level', numberInput(d.delayUntilRecursion, v => set('delayUntilRecursion', Math.max(1, v)), {min: 1, max: 100000})));
  page.append(flags);

  const text = el('textarea', '', 'wi-content'); text.rows = 8; text.value = d.content; text.oninput = () => set('content', text.value);
  const head = el('div', '', 'wi-content-head'); head.append(el('span', 'Content'), btn('⤢', () => expand(text), 'wi-more', {'aria-label': 'Expand content'}));
  const contentField = el('div', '', 'wi-field'); contentField.append(head, text); page.append(contentField);

  const timing = el('div', '', 'wi-section-body');
  const group = el('input'); group.value = d.group; group.maxLength = 200; group.oninput = () => set('group', group.value);
  timing.append(field('Inclusion group', group, 'Entries in the same group compete; one wins.'), checkbox('Prioritise this entry in its group', d.groupOverride, on => set('groupOverride', on)), field('Group weight', numberInput(d.groupWeight, v => set('groupWeight', v), {min: 0, max: 100000})));
  for (const [name, label] of [['sticky', 'Sticky (messages)'], ['cooldown', 'Cooldown (messages)'], ['delay', 'Delay (messages)']]) timing.append(field(label, numberInput(d[name], v => set(name, v), {min: 0, max: 100000, nullable: true, placeholder: 'Off'})));
  page.append(section('Inclusion group & timing', '', false, timing));

  const filters = el('div', '', 'wi-section-body');
  const names = el('input'); names.value = d.characterFilterNames.join(', '); names.placeholder = 'Character names, comma separated';
  names.oninput = () => set('characterFilterNames', names.value.split(',').map(item => item.trim()).filter(Boolean));
  filters.append(field('Characters', names, state.tagFilterCount ? `${state.tagFilterCount} tag filter${state.tagFilterCount === 1 ? '' : 's'} on this entry are kept and can be edited in SillyTavern.` : 'Leave empty to apply to every character.'), checkbox('Exclude these characters instead', d.characterFilterExclude, on => set('characterFilterExclude', on)));
  filters.append(el('p', 'Generation types (none selected = all):', 'wi-subhead'));
  for (const [id, label] of TRIGGERS) filters.append(checkbox(label, d.triggers.includes(id), on => set('triggers', TRIGGERS.map(item => item[0]).filter(item => item === id ? on : d.triggers.includes(item)))));
  const automation = el('input'); automation.value = d.automationId; automation.maxLength = 200; automation.oninput = () => set('automationId', automation.value);
  filters.append(field('Automation ID', automation));
  page.append(section('Character & generation filters', '', false, filters));

  if (state.error) page.append(el('p', state.error, 'wi-error'));
  const footer = el('div', '', 'wi-footer');
  footer.append(btn('Cancel', () => action(cancel)), btn('Save', () => action(save), 'wi-btn wi-primary wi-save'));
  page.append(footer);
  container.replaceChildren(page); sync();
 }
 async function expand(source) {
  const area = el('textarea', '', 'wi-expanded'); area.value = source.value;
  const result = await modal({title: 'Entry content', body: [area], buttons: done => [btn('Cancel', () => done(null)), btn('Use text', () => done(area.value), 'wi-btn wi-primary')]});
  if (result !== null) { state.draft.content = result; source.value = result; sync(); }
 }
 async function cancel() {
  if (dirty() && !await confirmDialog({title: 'Discard changes?', text: 'Your edits to this entry have not been saved.', confirm: 'Discard', danger: true})) return;
  state = null; back();
 }
 async function save() {
  if (locked()) { notify('Wait for the engine to finish before saving.'); return; }
  saving = true; sync();
  try {
   const payload = {action: 'saveEntry', name: state.name, uid: state.uid, revision: state.revision, changes: changes()};
   if (state.draftKey !== state.keyText) payload.keyText = state.draftKey;
   if (state.draftSecondary !== state.secondaryText) { payload.keysecondaryText = state.draftSecondary; payload.changes.selective = !!state.draftSecondary.trim(); }
   const result = await request(payload);
   const name = state.name; state = null; changed(name); notify('Entry saved.'); back();
   return result;
  } catch (error) {
   if (error.code === 'STALE_BOOK') state.error = 'This book changed somewhere else. Copy your edits, go back, and reopen the entry.';
   else state.error = error.message;
   render();
  } finally { saving = false; sync(); }
 }
 return {open, render, dirty, cancel, discard() { state = null; }};
}
