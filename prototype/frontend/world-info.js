// Phase 6: World Info library page (folders, books, entries). Entry editor and Activation live in their own modules.
import {icon} from './icons.js?build=0.8.0-phase2';
import {el, btn, confirmDialog, promptDialog, menuDialog, modal, select, field, download} from './wi-ui.js?build=0.8.0-phase2';
import {createEntryEditor} from './wi-entry.js?build=0.8.0-phase2';
import {createActivationPage} from './wi-activation.js?build=0.8.0-phase2';

const REGISTRY_KEY = 'pocket-tavern.wi-folders.v1';
const MARKERS = {keyword: 'Keyword', constant: 'Always on', vectorized: 'Vector'};
const iconIn = (tag, name, className) => { const n = el(tag, '', className); n.append(icon(name)); return n; };
const iconButton = (name, onclick, className, attrs) => { const b = btn('', onclick, className, attrs); b.append(icon(name)); return b; };

export function sourceLines(sources = []) {
 const lines = [];
 for (const source of sources) {
  if (source.type === 'global') lines.push('Global');
  else if (source.type === 'character') lines.push(`Character · ${source.name} · ${source.role === 'primary' ? 'Primary' : 'Additional'}`);
  else if (source.type === 'chat') lines.push('Chat');
  else if (source.type === 'persona') lines.push(`Persona${source.name ? ` · ${source.name}` : ''}`);
 }
 return [...new Set(lines)];
}
function readRegistry() {
 try { const value = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; } catch { return []; }
}
function writeRegistry(list) { try { localStorage.setItem(REGISTRY_KEY, JSON.stringify([...new Set(list)])); } catch {} }

export function createWorldInfoPanel({rpc, action, locked, connected = () => true, notify, navigate, setSubtitle, onPage = () => true}) {
 const request = (arg, timeout = 60000) => rpc('worldinfo', arg, timeout);
 let lib = null, loading = false, failure = '', container = null, loadedAt = 0;
 // Which books and folders are open is remembered on this device, like empty folders.
 const VIEW_KEY = 'pocket-tavern.wi-view.v1';
 const savedView = (() => { try { const value = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}'); return {books: Array.isArray(value.books) ? value.books : [], folders: Array.isArray(value.folders) ? value.folders : []}; } catch { return {books: [], folders: []}; } })();
 const remember = set => { const add = set.add.bind(set), remove = set.delete.bind(set), save = () => { try { localStorage.setItem(VIEW_KEY, JSON.stringify({books: [...expanded], folders: [...openFolders]})); } catch {} }; set.add = value => { add(value); save(); return set; }; set.delete = value => { const had = remove(value); save(); return had; }; return set; };
 const expanded = remember(new Set(savedView.books)), openFolders = remember(new Set(savedView.folders)), details = new Map(), pending = new Set();
 let registry = readRegistry();

 const busy = () => locked();
 const guard = () => { if (busy()) { notify(connected() ? 'Wait for the engine to finish before changing World Info.' : 'Reconnect to the SillyTavern engine first.'); return false; } return true; };

 async function load() {
  if (loading) return;
  loading = true; failure = '';
  try {
   lib = await request({action: 'list'});
   for (const name of [...details.keys()]) if (!lib.books.some(book => book.name === name)) details.delete(name);
   await Promise.all([...expanded].filter(name => lib.books.some(book => book.name === name)).map(async name => { try { details.set(name, await request({action: 'book', name})); } catch { details.delete(name); } }));
  }
  catch (error) { failure = error.message; }
  finally { loading = false; loadedAt = Date.now(); render(); }
 }
 async function loadBook(name) {
  pending.add(name); render();
  try { details.set(name, await request({action: 'book', name})); }
  // Keep the book marked open: a failed read (engine still starting) must
  // not forget it. Books that no longer exist are simply not drawn.
  catch (error) { notify(error.message); await load(); }
  finally { pending.delete(name); render(); }
 }
 function folders() {
  const used = new Set((lib?.books ?? []).map(book => book.folder).filter(Boolean));
  return [...new Set([...registry, ...used])].sort((a, b) => a.localeCompare(b));
 }
 const bookRow = book => {
  const wrap = el('div', '', 'card wi-book'), open = expanded.has(book.name);
  const head = el('div', '', 'wi-book-head');
  const toggle = btn('', () => { if (open) expanded.delete(book.name); else { expanded.add(book.name); if (!details.has(book.name)) loadBook(book.name); } render(); }, 'wi-book-toggle', {'aria-expanded': String(open), 'aria-label': `${open ? 'Collapse' : 'Expand'} ${book.name}`});
  const caret = iconIn('span', open ? 'down' : 'right', 'wi-caret'), text = el('span', '', 'wi-book-text');
  text.append(el('strong', book.name), el('small', `${book.count} ${book.count === 1 ? 'entry' : 'entries'}${book.unreadable ? ' · unreadable' : ''}`, 'wi-count'));
  const lines = sourceLines(lib.sources[book.name]);
  if (lines.length) text.append(el('small', lines.join(' · '), 'wi-source'));
  toggle.append(caret, text);
  head.append(toggle, iconButton('more', () => action(() => bookMenu(book)), 'wi-more', {'aria-label': `Actions for ${book.name}`}));
  wrap.append(head);
  if (open) {
   const body = el('div', '', 'wi-entries'), detail = details.get(book.name);
   if (!detail) body.append(el('p', 'Loading entries…', 'wi-note'));
   else {
    for (const row of detail.entries) {
     const line = el('div', '', `wi-entry${row.disabled ? ' off' : ''}`);
     const strategy = MARKERS[row.strategy] ? row.strategy : 'keyword', label = MARKERS[strategy];
     const open = btn('', () => action(() => openEntry(book.name, row.uid)), 'wi-entry-open', {'aria-label': `Edit ${row.title}`});
     open.append(iconIn('span', strategy, `wi-mark ${row.strategy}`), el('span', row.title, 'wi-entry-title'), el('small', label, 'wi-entry-kind'));
     const check = el('input'); check.type = 'checkbox'; check.checked = !row.disabled;
     check.setAttribute('aria-label', `${row.title} enabled`);
     check.onchange = () => action(() => toggleEntry(book.name, row, check));
     line.append(open, check); body.append(line);
    }
    if (!detail.entries.length) body.append(el('p', 'This book has no entries yet.', 'wi-note'));
    const add = btn('Add entry', () => action(() => addEntry(book.name)), 'wi-add'); add.prepend(icon('plus')); body.append(add);
   }
   wrap.append(body);
  }
  return wrap;
 };
 function render() {
  if (!container?.isConnected || !onPage('wi')) return;
  const page = el('div', '', 'wi-page');
  const bar = el('div', '', 'wi-toolbar');
  bar.append(btn('Import', () => importInput.click(), 'btn secondary wi-btn'), (() => { const b = btn('Book', () => action(createBook), 'btn secondary wi-btn primary wi-primary'); b.prepend(icon('plus')); return b; })(), btn('Folder', () => action(createFolder), 'btn secondary wi-btn'));
  page.append(bar);
  if (failure) { page.append(el('p', failure, 'wi-error'), btn('Retry', load)); }
  else if (!lib) page.append(el('p', 'Loading World Info…', 'wi-note'));
  else {
   const folderNames = folders();
   for (const name of folderNames) {
    const inside = lib.books.filter(book => book.folder === name), open = openFolders.has(name);
    const row = el('div', '', 'wi-folder');
    const head = el('div', '', 'wi-folder-head');
    const toggle = btn('', () => { if (open) openFolders.delete(name); else openFolders.add(name); render(); }, 'wi-book-toggle', {'aria-expanded': String(open), 'aria-label': `${open ? 'Collapse' : 'Expand'} folder ${name}`});
    const text = el('span', '', 'wi-book-text'); text.append(el('strong', name), el('small', `${inside.length} ${inside.length === 1 ? 'book' : 'books'}`, 'wi-count'));
    toggle.append(iconIn('span', open ? 'down' : 'right', 'wi-caret'), iconIn('span', 'folder', 'wi-folder-icon'), text);
    head.append(toggle, iconButton('more', () => action(() => folderMenu(name, inside)), 'wi-more', {'aria-label': `Actions for folder ${name}`}));
    row.append(head);
    if (open) { const body = el('div', '', 'wi-folder-books'); for (const book of inside) body.append(bookRow(book)); if (!inside.length) body.append(el('p', 'Empty folder. Move books here from a book’s menu.', 'wi-note')); row.append(body); }
    page.append(row);
   }
   const loose = lib.books.filter(book => !book.folder || !folderNames.includes(book.folder));
   for (const book of loose) page.append(bookRow(book));
   if (!lib.books.length) page.append(el('p', 'No World Info books yet. Tap + Book to create one, or Import a lorebook file.', 'wi-note'));
  }
  container.replaceChildren(page);
 }
 const importInput = el('input'); importInput.type = 'file'; importInput.accept = '.json,application/json'; importInput.hidden = true;
 importInput.onchange = () => action(async () => {
  const file = importInput.files[0]; importInput.value = '';
  if (!file || !guard()) return;
  if (file.size > 20 * 1024 * 1024) { notify('That file is too large for World Info import.'); return; }
  let data; try { data = JSON.parse(await file.text()); } catch { notify('That file is not valid JSON.'); return; }
  const result = await request({action: 'importBook', name: file.name.replace(/\.[^.]+$/, ''), data});
  notify(`Imported “${result.name}”.`); expanded.add(result.name); await load();
 });
 const entry = createEntryEditor({request, action, notify, locked, visible: () => onPage('wi-entry'), back: () => navigate('wi'), setSubtitle, changed: name => { details.delete(name); if (expanded.has(name)) loadBook(name); }});
 const activation = createActivationPage({request, action, notify, locked, visible: () => onPage('wi-activation'), back: () => navigate('wi'), changed: () => load()});

 async function toggleEntry(name, row, check) {
  if (!guard()) { check.checked = !row.disabled; return; }
  const detail = details.get(name);
  try {
   const full = await request({action: 'saveEntry', name, uid: row.uid, revision: detail.revision, changes: {disable: !check.checked}});
   details.set(name, {...detail, revision: full.revision, entries: full.entries});
   const book = lib.books.find(item => item.name === name); if (book) book.enabled = full.entries.filter(item => !item.disabled).length;
  } catch (error) { check.checked = !row.disabled; if (error.code === 'STALE_BOOK') { notify('This book changed elsewhere. Reloaded.'); await loadBook(name); } else throw error; }
  render();
 }
 async function addEntry(name) {
  if (!guard()) return;
  const detail = details.get(name);
  const result = await request({action: 'addEntry', name, revision: detail.revision, changes: {comment: 'New entry'}});
  details.set(name, {...detail, revision: result.revision, entries: result.entries});
  const book = lib.books.find(item => item.name === name); if (book) book.count = result.entries.length;
  await openEntry(name, result.uid);
 }
 async function openEntry(name, uid) {
  await entry.open(name, uid);
  navigate('wi-entry');
 }
 async function createBook() {
  if (!guard()) return;
  const names = lib.books.map(book => book.name);
  const name = await promptDialog({title: 'New book', label: 'Book name', confirm: 'Create', validate: value => names.some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase()) ? 'A book with that name already exists.' : (!value.trim() || value !== value.trim() || /[\\/<>:"|?*\x00-\x1f]/.test(value) ? 'Use a name without slashes or special characters.' : '')});
  if (name === null) return;
  await request({action: 'createBook', name}); expanded.add(name); await load();
 }
 async function createFolder() {
  const name = await promptDialog({title: 'New folder', label: 'Folder name', confirm: 'Create', validate: value => !value.trim() || value.includes('/') || value.trim().length > 80 ? 'Use a name up to 80 characters without slashes.' : folders().some(item => item.toLocaleLowerCase() === value.trim().toLocaleLowerCase()) ? 'That folder already exists.' : ''});
  if (name === null) return;
  registry = [...registry, name.trim()]; writeRegistry(registry); openFolders.add(name.trim()); render();
 }
 async function bookMenu(book) {
  const isGlobal = lib.globalBooks.includes(book.name);
  const choice = await menuDialog(book.name, [
   {id: 'global', label: isGlobal ? 'Stop using globally' : 'Use globally'}, {id: 'move', label: 'Move to folder'}, {id: 'rename', label: 'Rename'},
   {id: 'duplicate', label: 'Duplicate'}, {id: 'export', label: 'Export'}, {id: 'delete', label: 'Delete', danger: true}]);
  if (!choice) return;
  if (choice === 'export') { const result = await request({action: 'export', name: book.name}); download(book.name, result.data); return; }
  if (!guard()) return;
  const fresh = async () => { const latest = await request({action: 'book', name: book.name}); details.set(book.name, latest); return latest; };
  if (choice === 'global') { await request({action: 'setGlobal', name: book.name, on: !isGlobal}); await load(); }
  else if (choice === 'move') await moveBook(book);
  else if (choice === 'rename') {
   const names = lib.books.map(item => item.name);
   const next = await promptDialog({title: 'Rename book', label: 'Book name', value: book.name, confirm: 'Rename', validate: value => value === book.name ? 'Enter a different name.' : names.some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase()) ? 'A book with that name already exists.' : (!value.trim() || value !== value.trim() || /[\\/<>:"|?*\x00-\x1f]/.test(value) ? 'Use a name without slashes or special characters.' : '')});
   if (next === null) return;
   const primary = (lib.sources[book.name] ?? []).some(source => source.type === 'character' && source.role === 'primary');
   let updatePrimaryLinks = false;
   if (primary) updatePrimaryLinks = await confirmDialog({title: 'Update character links?', text: `${book.name} is a character’s primary book. Update those characters to use “${next}”? Choose Skip to leave their cards unchanged.`, confirm: 'Update cards'});
   const current = await fresh();
   const result = await request({action: 'renameBook', name: book.name, newName: next, revision: current.revision, updatePrimaryLinks});
   const wasOpen = expanded.delete(book.name); details.delete(book.name); if (wasOpen) expanded.add(result.name);
   notify(primary && !result.primaryUpdated ? `Renamed. Character cards still point at “${book.name}”.` : 'Renamed.'); await load();
  } else if (choice === 'duplicate') { const current = await fresh(); const result = await request({action: 'duplicateBook', name: book.name, revision: current.revision}); notify(`Created “${result.name}”.`); await load(); }
  else if (choice === 'delete') {
   const lines = sourceLines(lib.sources[book.name]);
   const ok = await confirmDialog({title: `Delete “${book.name}”?`, text: `This permanently removes the book and its ${book.count} entries.${lines.length ? ` It is currently used by: ${lines.join('; ')}.` : ''} Export it first if you may want it back.`, confirm: 'Delete book', danger: true});
   if (!ok) return;
   const current = await fresh();
   await request({action: 'deleteBook', name: book.name, revision: current.revision}); expanded.delete(book.name); details.delete(book.name); notify('Book deleted.'); await load();
  }
 }
 async function moveBook(book) {
  const names = folders();
  const picker = select([['', 'No folder'], ...names.map(name => [name, name]), ['\u0000new', 'New folder…']], book.folder ?? '', () => {});
  const choice = await modal({title: `Move “${book.name}”`, body: [field('Folder', picker)], buttons: done => [btn('Cancel', () => done(null)), btn('Move', () => done(picker.value), 'btn secondary wi-btn primary wi-primary')]});
  if (choice === null) return;
  let folder = choice === '' ? null : choice;
  if (choice === '\u0000new') {
   folder = await promptDialog({title: 'New folder', label: 'Folder name', confirm: 'Create and move', validate: value => !value.trim() || value.includes('/') || value.trim().length > 80 ? 'Use a name up to 80 characters without slashes.' : ''});
   if (folder === null) return; folder = folder.trim();
  }
  await request({action: 'setFolder', names: [book.name], folder}, 120000);
  if (folder) { openFolders.add(folder); registry = [...registry, folder]; writeRegistry(registry); }
  await load();
 }
 async function folderMenu(name, inside) {
  const choice = await menuDialog(name, [{id: 'rename', label: 'Rename folder'}, {id: 'delete', label: 'Delete folder (keeps books)', danger: true}]);
  if (!choice || !guard()) return;
  if (choice === 'rename') {
   const next = await promptDialog({title: 'Rename folder', label: 'Folder name', value: name, confirm: 'Rename', validate: value => !value.trim() || value.includes('/') || value.trim().length > 80 ? 'Use a name up to 80 characters without slashes.' : value.trim() !== name && folders().some(item => item.toLocaleLowerCase() === value.trim().toLocaleLowerCase()) ? 'That folder already exists.' : ''});
   if (next === null || next.trim() === name) return;
   if (inside.length) await request({action: 'setFolder', names: inside.map(book => book.name), folder: next.trim()}, 120000);
   registry = registry.filter(item => item !== name).concat(next.trim()); writeRegistry(registry); openFolders.delete(name); openFolders.add(next.trim()); await load();
  } else {
   const ok = await confirmDialog({title: `Delete folder “${name}”?`, text: inside.length ? `Its ${inside.length} book${inside.length === 1 ? '' : 's'} will stay in your library without a folder. Nothing inside any book changes.` : 'The folder is empty.', confirm: 'Delete folder', danger: true});
   if (!ok) return;
   if (inside.length) await request({action: 'setFolder', names: inside.map(book => book.name), folder: null}, 120000);
   registry = registry.filter(item => item !== name); writeRegistry(registry); openFolders.delete(name); await load();
  }
 }

 return {
  renderLibrary(content) { container = content; if (!importInput.isConnected) document.body.append(importInput); setSubtitle(''); if (!loading && (!lib || Date.now() - loadedAt > 5000)) load(); render(); },
  renderEntry(content) { entry.render(content); },
  renderActivation(content) { activation.render(content); },
  reload: load,
  async openActivation() { await activation.open(); navigate('wi-activation'); },
  leave(page) { return page === 'wi-entry' ? entry.cancel() : page === 'wi-activation' ? activation.cancel() : (navigate('wi'), undefined); },
 };
}
