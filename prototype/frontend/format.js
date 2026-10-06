// A deliberately small Markdown renderer. Raw HTML is always escaped.
export const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function dialogue(text) {
    return text.split(/("[^"\n]+"|“[^”\n]+”)/g).map(part => /^("|“)/.test(part) ? `<span class="dialogue">${escapeHTML(part)}</span>` : escapeHTML(part)).join('');
}
function inline(text) {
    const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
    let html = '', cursor = 0;
    for (const match of text.matchAll(pattern)) {
        html += dialogue(text.slice(cursor, match.index)); const token = match[0];
        if (token.startsWith('`')) html += `<code>${escapeHTML(token.slice(1,-1))}</code>`;
        else if (token.startsWith('**')) html += `<strong>${escapeHTML(token.slice(2,-2))}</strong>`;
        else if (token.startsWith('*')) html += `<em>${escapeHTML(token.slice(1,-1))}</em>`;
        else {
            const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
            let safe = false; try { const url = new URL(link[2]); safe = ['http:', 'https:'].includes(url.protocol); } catch { /* Render unsafe links as text. */ }
            html += safe ? `<a href="${escapeHTML(link[2])}" target="_blank" rel="noopener noreferrer">${escapeHTML(link[1])}</a>` : escapeHTML(token);
        }
        cursor = match.index + token.length;
    }
    return html + dialogue(text.slice(cursor));
}
export function formatMessage(text) {
    const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    let html = '', code = null, paragraph = [], list = null;
    const flush = () => { if (paragraph.length) { html += `<p>${paragraph.map(inline).join('<br>')}</p>`; paragraph = []; } if (list) { html += `</${list}>`; list = null; } };
    for (const line of lines) {
        if (/^\s*```/.test(line)) { flush(); if (code === null) code = []; else { html += `<pre><code>${escapeHTML(code.join('\n'))}</code></pre>`; code = null; } continue; }
        if (code !== null) { code.push(line); continue; }
        if (!line.trim()) { flush(); continue; }
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        if (heading) { flush(); html += `<h${heading[1].length+2}>${inline(heading[2])}</h${heading[1].length+2}>`; continue; }
        const item = /^\s*(?:([-*])|\d+\.)\s+(.+)$/.exec(line);
        if (item) { if (paragraph.length) flush(); const kind = item[1] ? 'ul' : 'ol'; if (list !== kind) { flush(); list = kind; html += `<${kind}>`; } html += `<li>${inline(item[2])}</li>`; continue; }
        if (/^>\s?/.test(line)) { flush(); html += `<blockquote>${inline(line.replace(/^>\s?/,''))}</blockquote>`; continue; }
        if (list) flush(); paragraph.push(line);
    }
    flush(); if (code !== null) html += `<pre><code>${escapeHTML(code.join('\n'))}</code></pre>`;
    return html;
}
