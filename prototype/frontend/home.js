// Home: a starting point. Continue the last chat, jump to a recent one, or pick a character.
// Status comes from known state only; nothing here sends a paid request.
import {icon} from './icons.js?build=0.8.0-phase2';
import {plainPreview} from './preview.js?build=0.8.0-phase2';

export function homeStatus({connected, initializing, generating, onlineStatus, apiChecked}) {
 const engine = initializing ? {label: 'Connecting…', tone: 'wait'} : !connected ? {label: 'Not connected', tone: 'bad'} : generating ? {label: 'Working', tone: 'ok'} : {label: 'Connected', tone: 'ok'};
 let api;
 if (!connected) api = {label: 'Not checked', tone: 'idle'};
 else if (onlineStatus && onlineStatus !== 'no_connection') api = {label: 'Connected', tone: 'ok'};
 else if (apiChecked) api = {label: 'Not connected', tone: 'bad'};
 else api = {label: 'Not checked', tone: 'idle'};
 return {engine, api};
}
// The one dot in the corner. Text shows next to it only when something needs attention.
export function homeDot({engine, api}) {
 const label = `Engine: ${engine.label} · API: ${api.label}`;
 if (engine.tone === 'wait') return {tone: 'wait', text: 'Connecting…', label};
 if (engine.tone === 'bad') return {tone: 'bad', text: 'Not connected', label};
 if (api.tone === 'bad') return {tone: 'warn', text: 'API not connected', label};
 if (api.tone === 'idle') return {tone: 'idle', text: '', label};
 return {tone: 'ok', text: '', label};
}
// Characters with recent chats first (most recent first), then the rest in library order.
export function castOrder(characters, recents, limit = 20) {
 const byKey = new Map(characters.map(c => [c.key, c])), seen = new Set(), out = [];
 for (const r of recents) { const c = byKey.get(r.characterKey); if (c && !seen.has(c.key)) { seen.add(c.key); out.push(c); } }
 for (const c of characters) if (!seen.has(c.key)) { seen.add(c.key); out.push(c); }
 return out.slice(0, limit);
}

function node(tag, text, className) {
 const e = document.createElement(tag);
 if (text != null && text !== '') e.textContent = text;
 if (className) e.className = className;
 return e;
}
function btn(text, className, onClick, glyph) {
 const b = node('button', null, className); b.type = 'button';
 if (glyph) b.append(icon(glyph));
 if (text) b.append(node('span', text));
 b.onclick = onClick;
 return b;
}
function tint(element, character, colours) {
 if (!character || !colours) return;
 colours.resolve(character).then(hex => { if (hex) element.style.setProperty('--char', hex); }).catch(() => {});
}
function section(title, link, onLink) {
 const head = node('div', null, 'home-section');
 head.append(node('h3', title));
 if (link) head.append(btn(link, 'btn quiet home-section-link', onLink));
 return head;
}

export function renderHome(content, {status, loaded, stalled, connected, characters, recents, portrait, chatDate, colours, actions}) {
 const wrap = node('div', null, 'home-page');
 content.append(wrap);
 if (!loaded) {
  const waiting = node('div', null, 'home-waiting');
  const bad = stalled && status.engine.tone !== 'ok';
  waiting.append(node('p', bad ? 'Can’t reach the engine.' : 'Opening your tavern…'));
  if (bad && actions.reconnect) waiting.append(btn('Reconnect', 'btn secondary', actions.reconnect, 'refresh'));
  wrap.append(waiting);
  return;
 }
 if (!characters.length) {
  const empty = node('div', null, 'home-empty');
  const badge = node('div', null, 'home-badge'); badge.append(icon('mug'));
  const buttons = node('div', null, 'home-empty-actions');
  const importButton = btn('Import a card', 'btn primary', actions.importCharacters, 'upload');
  const createButton = btn('Create one', 'btn secondary', actions.createCharacter, 'plus');
  importButton.disabled = createButton.disabled = !connected;
  buttons.append(importButton, createButton);
  empty.append(badge, node('h2', 'Your tavern is empty', 'home-empty-title'), node('p', 'Bring in a character card from your phone, or write one from scratch.', 'home-empty-text'), buttons);
  wrap.append(empty);
  return;
 }
 const byKey = new Map(characters.map(c => [c.key, c]));
 const nameOf = row => byKey.get(row.characterKey)?.name ?? row.characterKey.replace(/\.[a-z]+$/i, '');
 if (recents.length) {
  const row = recents[0], c = byKey.get(row.characterKey);
  const card = node('section', null, 'home-continue');
  card.setAttribute('aria-label', `Last chat: ${nameOf(row)}`);
  const top = node('div', null, 'home-continue-top');
  const who = node('div', null, 'home-continue-who');
  who.append(node('span', 'Continue', 'home-kicker'), node('strong', nameOf(row), 'home-continue-name'));
  const meta = node('span', null, 'home-continue-meta'); meta.append(node('span', row.chatId));
  const date = chatDate(row.updated); if (date) { const time = node('time', date.label); time.dateTime = date.datetime; time.title = date.title; meta.append(node('span', '·', 'home-dot-sep'), time); }
  who.append(meta);
  top.append(portrait(c), who);
  const line = node('p', plainPreview(row.preview, 320) || 'No messages yet', 'home-continue-line');
  const go = btn('Continue', 'btn primary home-continue-go', () => actions.openChat(row), 'right');
  go.setAttribute('aria-label', `Continue chat with ${nameOf(row)}`);
  card.append(top, line, go);
  card.addEventListener('click', e => { if (!e.target.closest('button')) actions.openChat(row); });
  tint(card, c, colours);
  wrap.append(card);
 } else {
  const start = node('section', null, 'home-start');
  start.append(node('h2', 'Start your first story', 'home-start-title'), node('p', 'Pick a character and their greeting will be waiting.', 'home-start-text'));
  const go = btn('Choose a character', 'btn primary', actions.startChat, 'plus'); go.disabled = !connected;
  start.append(go);
  wrap.append(start);
 }
 const more = recents.slice(1, 4);
 if (more.length) {
  const block = node('section', null, 'home-block');
  block.append(section('Recent', 'All chats', actions.allChats));
  const list = node('div', null, 'home-recent-list');
  for (const row of more) {
   const c = byKey.get(row.characterKey);
   const item = btn('', 'home-recent', () => actions.openChat(row));
   item.setAttribute('aria-label', `Open ${nameOf(row)} · ${row.chatId}`);
   const text = node('span', null, 'home-recent-text'), head = node('span', null, 'home-recent-head');
   head.append(node('strong', nameOf(row)));
   const date = chatDate(row.updated); if (date) { const time = node('time', date.label); time.dateTime = date.datetime; time.title = date.title; head.append(time); }
   text.append(head, node('span', plainPreview(row.preview, 160) || 'No messages yet', 'home-recent-line'));
   item.append(portrait(c), text);
   tint(item, c, colours);
   list.append(item);
  }
  block.append(list); wrap.append(block);
 }
 const block = node('section', null, 'home-block');
 block.append(section('Characters', 'All', actions.allCharacters));
 const cast = node('div', null, 'home-cast');
 for (const c of castOrder(characters, recents)) {
  const item = btn('', 'home-cast-item', () => actions.openCharacter(c));
  item.setAttribute('aria-label', c.name); item.title = c.name;
  item.append(portrait(c), node('span', c.name, 'home-cast-name'));
  tint(item, c, colours);
  cast.append(item);
 }
 const add = btn('', 'home-cast-item home-cast-add', actions.addCharacter);
 add.setAttribute('aria-label', 'Add a character'); add.title = 'Add a character';
 const plus = node('span', null, 'avatar'); plus.append(icon('plus'));
 add.append(plus, node('span', 'Add', 'home-cast-name'));
 cast.append(add);
 block.append(cast); wrap.append(block);
}
