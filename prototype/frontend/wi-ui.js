// Shared DOM helpers for the World Info pages.
export function el(tag, text = '', className) {
 const node = document.createElement(tag);
 if (text) node.textContent = text;
 if (className) node.className = className;
 return node;
}
export function btn(label, onclick, className = 'btn secondary wi-btn', attrs = {}) {
 const node = el('button', label, className);
 node.type = 'button';
 for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
 if (onclick) node.onclick = onclick;
 return node;
}
function dialogNode(id) {
 let node = document.getElementById(id);
 if (!node) { node = document.createElement('dialog'); node.id = id; node.className = 'wi-dialog'; document.body.append(node); }
 return node;
}
/** Modal with a title, optional body nodes and buttons. Resolves with the value passed to `done`, or null when dismissed. */
export function modal({title, text, body = [], buttons}) {
 return new Promise(resolve => {
  const d = dialogNode('wi-modal');
  let result = null;
  const done = value => { result = value; d.close(); };
  const row = el('div', '', 'wi-dialog-actions');
  row.append(...buttons(done));
  d.replaceChildren(el('h3', title), ...(text ? [el('p', text)] : []), ...body, row);
  d.onclose = () => resolve(result);
  d.showModal();
 });
}
export const confirmDialog = ({title, text, confirm, danger}) => modal({title, text, buttons: done => [btn('Cancel', () => done(false)), btn(confirm, () => done(true), danger ? 'btn secondary wi-btn destructive wi-danger' : 'btn secondary wi-btn primary wi-primary')]}).then(Boolean);
export function promptDialog({title, text, label, value = '', confirm = 'Save', validate}) {
 const input = el('input'); input.value = value; input.setAttribute('aria-label', label);
 const message = el('p', '', 'wi-form-error'); message.hidden = true;
 const field = el('label', label, 'wi-field'); field.append(input);
 return modal({title, text, body: [field, message], buttons: done => {
  const ok = btn(confirm, () => { const problem = validate?.(input.value); if (problem) { message.textContent = problem; message.hidden = false; return; } done(input.value); }, 'btn secondary wi-btn primary wi-primary');
  input.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); ok.click(); } };
  return [btn('Cancel', () => done(null)), ok];
 }});
}
/** Lets the person choose one of several actions. Resolves with the chosen id. */
export const menuDialog = (title, items) => modal({title, buttons: done => items.map(item => btn(item.label, () => done(item.id), item.danger ? 'btn secondary wi-btn wi-menu-item destructive wi-danger-text' : 'btn secondary wi-btn wi-menu-item')).concat(btn('Close', () => done(null), 'btn secondary wi-btn'))});

export function checkbox(label, checked, onchange, hint) {
 const row = el('label', '', 'wi-check');
 const input = el('input'); input.type = 'checkbox'; input.checked = !!checked; input.onchange = () => onchange(input.checked);
 const text = el('span', label);
 row.append(input, text);
 if (hint) row.append(el('small', hint));
 return row;
}
export function field(label, control, hint) {
 const wrap = el('label', '', 'wi-field');
 wrap.append(el('span', label), control);
 if (hint) wrap.append(el('small', hint, 'wi-hint'));
 return wrap;
}
export function select(options, value, onchange) {
 const node = el('select');
 for (const [id, label] of options) { const option = el('option', label); option.value = String(id); node.append(option); }
 node.value = String(value);
 node.onchange = () => onchange(node.value);
 return node;
}
export function numberInput(value, onchange, {min, max, nullable = false, placeholder = ''} = {}) {
 const node = el('input'); node.type = 'number'; node.inputMode = 'numeric'; node.step = '1';
 if (min !== undefined) node.min = min; if (max !== undefined) node.max = max;
 node.placeholder = placeholder;
 node.value = value === null || value === undefined ? '' : String(value);
 node.oninput = () => {
  if (node.value === '') return onchange(nullable ? null : 0);
  const number = Number(node.value);
  if (Number.isInteger(number)) onchange(number);
 };
 return node;
}
export function section(title, summary, open, body) {
 const details = el('details', '', 'wi-section'); details.open = open;
 const head = el('summary'); head.append(el('strong', title));
 if (summary) head.append(el('small', summary));
 details.append(head, body);
 return details;
}
export function download(name, data) {
 const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
 const link = el('a'); link.href = url; link.download = `${name}.json`; document.body.append(link); link.click(); link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 10000);
}
