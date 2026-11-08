// Home: a calm landing page. Status comes from known state only; nothing here sends a paid request.
import {icon} from './icons.js?build=0.8.0-phase2';
import {FRONTEND_BUILD} from './build.js?build=0.8.0-phase2';

export function homeStatus({connected, initializing, generating, onlineStatus, apiChecked}) {
 const engine = initializing ? {label: 'Connecting…', tone: 'wait'} : !connected ? {label: 'Not connected', tone: 'bad'} : generating ? {label: 'Working', tone: 'ok'} : {label: 'Connected', tone: 'ok'};
 let api;
 if (!connected) api = {label: 'Not checked', tone: 'idle'};
 else if (onlineStatus && onlineStatus !== 'no_connection') api = {label: 'Connected', tone: 'ok'};
 else if (apiChecked) api = {label: 'Not connected', tone: 'bad'};
 else api = {label: 'Not checked', tone: 'idle'};
 return {engine, api};
}
export function countText(count, capped = false) {
 if (!Number.isFinite(count) || count < 0) return '–';
 return capped ? `${count.toLocaleString()}+` : count.toLocaleString();
}

export function renderHome(content, {status, counts}) {
 const wrap = document.createElement('div'); wrap.className = 'home-page';
 const badge = document.createElement('div'); badge.className = 'home-badge'; badge.append(icon('mug'));
 const title = document.createElement('h2'); title.className = 'home-title'; title.append('A little place.', document.createElement('br'), 'A lot of stories.');
 const lead = document.createElement('p'); lead.className = 'home-lead'; lead.textContent = 'Make yourself at home.';
 wrap.append(badge, title, lead);
 const rows = document.createElement('div'); rows.className = 'home-status';
 for (const [name, glyph, item] of [['Engine', 'server', status.engine], ['API connection', 'plug', status.api]]) {
  const row = document.createElement('div'); row.className = 'home-row';
  const left = document.createElement('span'); left.append(icon(glyph), name);
  const right = document.createElement('span'); right.className = `home-state ${item.tone}`; right.textContent = item.label;
  row.append(left, right); rows.append(row);
 }
 wrap.append(rows);
 const stats = document.createElement('div'); stats.className = 'home-counts';
 for (const [label, value] of [['Characters', counts.characters], ['Chats', counts.chats], ['Personas', counts.personas]]) {
  const cell = document.createElement('div'); const number = document.createElement('strong'); number.textContent = value; const text = document.createElement('span'); text.textContent = label;
  cell.append(number, text); stats.append(cell);
 }
 wrap.append(stats);
 const foot = document.createElement('div'); foot.className = 'home-foot';
 const tag = document.createElement('span'); tag.textContent = 'Your tavern, on your phone.'; const version = document.createElement('span'); version.textContent = FRONTEND_BUILD;
 foot.append(tag, version); wrap.append(foot);
 content.append(wrap);
}
