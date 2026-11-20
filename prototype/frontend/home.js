// Home: a starting point. Continue the last chat, jump to a recent one, or pick a character.
// Status comes from known state only; nothing here sends a paid request.
import {icon} from './icons.js?build=0.9.1';
import {plainPreview} from './preview.js?build=0.9.1';

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
 colours.resolve(character).then(value => {
  if (!value?.color) return;
  element.style.setProperty('--char', value.color);
  element.style.setProperty('--color-character-ink', value.ink);
 }).catch(() => {});
}
function section(title, link, onLink) {
 const head = node('div', null, 'home-section');
 head.append(node('h3', title));
 if (link) head.append(btn(link, 'btn quiet home-section-link', onLink));
 return head;
}

export function renderHome(content, {status, loaded, stalled, connected, configuration, characters, recents, portrait, chatDate, colours, actions}) {
 const wrap = node('div', null, 'home-page');
 content.append(wrap);
 if (!loaded) {
  const waiting = node('div', null, 'home-waiting');
  const bad = stalled && status.engine.tone !== 'ok';
  waiting.append(node('p', bad ? 'Can’t reach the engine.' : 'Opening your tavern…'));
  if (bad && actions.reconnect && document.getElementById('recovery')?.hidden !== false) waiting.append(btn('Reconnect', 'btn secondary', actions.reconnect, 'refresh'));
  wrap.append(waiting);
  return;
 }
 const byKey = new Map(characters.map(c => [c.key, c]));
 const nameOf = row => byKey.get(row.characterKey)?.name ?? row.characterKey.replace(/\.[a-z]+$/i, '');
 const summary=node('section',null,'home-configuration');
 const connection=btn('', 'home-config-row', actions.connection, 'plug');connection.append(node('span',null,'home-config-text'));
 connection.querySelector('.home-config-text').append(node('small','Connection'),node('strong',configuration?.selected?.model?`${configuration.selected.source} · ${configuration.selected.model}`:status.api.label));
 const preset=btn('', 'home-config-row', actions.presets, 'sliders');preset.append(node('span',null,'home-config-text'));
 preset.querySelector('.home-config-text').append(node('small','Preset'),node('strong',configuration?.selected?.preset||'No native preset selected'));
 summary.append(connection,preset);wrap.append(summary);
 if (!characters.length) {
  const empty = node('div', null, 'home-empty');
  const badge = node('div', null, 'home-badge'); badge.append(icon('mug'));
  const buttons = node('div', null, 'home-empty-actions');
  const addButton = btn('Add a character', 'btn primary', actions.allCharacters, 'plus');
  addButton.disabled = !connected; buttons.append(addButton);
  empty.append(badge, node('h2', 'Your tavern is empty', 'home-empty-title'), node('p', 'Add a character, then start your first story.', 'home-empty-text'), buttons);
  wrap.append(empty);
  return;
 }
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
 const start=btn('Start new chat','btn secondary home-start-chat',actions.startChat,'plus');start.disabled=!connected;wrap.append(start);
}
