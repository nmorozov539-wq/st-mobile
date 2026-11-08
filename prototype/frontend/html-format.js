// Reuse the engine's Markdown parser and HTML sanitizer. Chat HTML cannot
// create scripts, remote embeds, forms, or controls outside its own message.
// Styling follows only what the model wrote: quotes become speech, and
// out-of-character text (a line starting with OOC:, or ((double parentheses)))
// is dimmed. Nothing else is inferred.
export const OOC_LINE=/^\s*(?:\(\(\s*)?OOC\s*:/i;
export const OOC_INLINE=/(\(\([^()\n]*\)\))/g;
const BLOCKS='p,li,blockquote,div,td,th,summary';
const skip=node=>node.parentElement.closest('code,pre,style,.ooc');
function wrapText(document,root,pattern,make){
    const walker=document.createTreeWalker(root,4),nodes=[];
    while(walker.nextNode())if(!skip(walker.currentNode))nodes.push(walker.currentNode);
    for(const node of nodes){
        const pieces=node.textContent.split(pattern);
        if(pieces.length===1)continue;
        const fragment=document.createDocumentFragment();
        pieces.forEach((part,i)=>{if(!part)return;fragment.append(i%2?make(part):document.createTextNode(part));});
        node.replaceWith(fragment);
    }
}
// A line is the run of nodes between <br>s inside one block. An OOC line is
// wrapped whole (its trailing <br> becomes the wrapper's own line break).
function markOocLines(document,root){
    for(const block of root.querySelectorAll(BLOCKS)){
        if(block.closest('code,pre'))continue;
        let line=[];
        const flush=br=>{
            const text=line.map(n=>n.textContent).join('');
            if(line.length&&OOC_LINE.test(text)&&!line.some(n=>n.nodeType===1&&n.matches(BLOCKS))){
                const span=document.createElement('span');span.className='ooc ooc-line';
                line[0].before(span);span.append(...line);br?.remove();
            }
            line=[];
        };
        for(const child of [...block.childNodes]){if(child.nodeName==='BR')flush(child);else line.push(child);}
        flush(null);
    }
}
export function decorate(document,root){
    markOocLines(document,root);
    wrapText(document,root,OOC_INLINE,part=>{const span=document.createElement('span');span.className='ooc';span.textContent=part;return span;});
    wrapText(document,root,/("[^"\n]+"|“[^”\n]+”)/g,part=>{const span=document.createElement('span');span.className='dialogue';span.textContent=part;return span;});
    return root;
}
// Styled HTML from display regex or the model (levels 1 and 2): style
// attributes pass a CSS filter, <style> blocks are rewritten so their rules
// only reach their own message, and scripts, forms, embeds and anything that
// loads from the network stay blocked. Images only from ST's own server.
const BLOCKED_VALUE=/url\s*\(|expression\s*\(|javascript:|@import|-moz-binding|behavior\s*:/i;
const BLOCKED_PROPERTY=/^(behavior|-moz-binding|content-visibility)$/i;
function cleanDeclarations(style){
    const keep=[];
    for(let i=0;i<style.length;i++){
        const name=style[i],value=style.getPropertyValue(name),priority=style.getPropertyPriority(name);
        if(BLOCKED_PROPERTY.test(name)||BLOCKED_VALUE.test(value))continue;
        if(name==='position'&&/fixed|sticky/i.test(value))continue;
        keep.push(`${name}:${value}${priority?' !important':''}`);
    }
    return keep.join(';');
}
export function cleanStyleAttribute(element){
    const text=cleanDeclarations(element.style);
    if(text)element.setAttribute('style',text);else element.removeAttribute('style');
}
// Splits a selector list at top-level commas (not inside :is(...) or [..]).
function splitSelectors(text){const out=[];let depth=0,quote=null,start=0;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote)quote=null;continue;}if(c==='"'||c==="'")quote=c;else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&!depth){out.push(text.slice(start,i));start=i+1;}}out.push(text.slice(start));return out.map(x=>x.trim()).filter(Boolean);}
// Message classes are renamed (rx-c-name) so model HTML can never pick up
// the app's own rules, and its own <style> rules are renamed to match.
const CLASS_PREFIX='rx-c-';
const renameClasses=selector=>selector.replace(/(\[[^\]]*\]|"[^"]*"|'[^']*')|\.(-?[_a-zA-Z][\w-]*)/g,(all,kept,name)=>kept??`.${CLASS_PREFIX}${name}`);
export function scopeSelector(selector,scope){
    return splitSelectors(renameClasses(selector)).map(part=>{
        const rest=part.replace(/^(?::root|html|body)(?=$|[\s>+~.:#\[])/i,'');
        if(rest===part)return `${scope} ${part}`;
        if(!rest.trim())return scope;
        return /^[\s>+~]/.test(rest)?`${scope} ${rest.trim()}`:`${scope}${rest}`;
    }).join(',');
}
function scopeRules(rules,scope){
    let css='';
    for(const rule of rules){
        if(rule.selectorText!==undefined&&rule.style){const body=cleanDeclarations(rule.style);if(body)css+=`${scopeSelector(rule.selectorText,scope)}{${body}}`;}
        else if(rule.media&&rule.cssRules)css+=`@media ${rule.media.mediaText}{${scopeRules(rule.cssRules,scope)}}`;
        else if(rule.name!==undefined&&rule.cssRules){let frames='';for(const frame of rule.cssRules){const body=cleanDeclarations(frame.style);if(body)frame&&(frames+=`${frame.keyText}{${body}}`);}css+=`@keyframes ${rule.name}{${frames}}`;}
        // @import, @font-face, @page and anything else are dropped.
    }
    return css;
}
let scopeCount=0;
function parseSheet(document,text){
    const view=document.defaultView;text=text.replace(/@import[^;]*;?/gi,'');
    if(view?.CSSStyleSheet&&'replaceSync' in view.CSSStyleSheet.prototype){try{const sheet=new view.CSSStyleSheet();sheet.replaceSync(text);return sheet.cssRules;}catch{}}
    const probe=document.createElement('style');probe.textContent=text;document.head.append(probe);const rules=[...(probe.sheet?.cssRules??[])];probe.remove();return rules;
}
export function createHTMLFormatter({converter,sanitize,document}) {
    return text => {
        const clean=sanitize(converter.makeHtml(String(text??'')),{
            ALLOWED_TAGS:['p','br','hr','strong','b','em','i','u','s','del','ins','mark','small','sub','sup','q','cite','abbr','kbd','blockquote','pre','code','ul','ol','li','h1','h2','h3','h4','h5','h6','a','span','div','section','article','header','footer','aside','figure','figcaption','center','font','details','summary','table','thead','tbody','tfoot','tr','th','td','caption','img','style'],
            ALLOWED_ATTR:['href','title','color','open','start','colspan','rowspan','style','class','src','alt','width','height','align'],
            ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,FORCE_BODY:true,
        });
        const root=document.createElement('div');root.innerHTML=clean;
        for(const link of root.querySelectorAll('a')){
            const href=link.getAttribute('href');
            try {if(!['http:','https:'].includes(new URL(href).protocol))throw Error();link.target='_blank';link.rel='noopener noreferrer';}
            catch {link.removeAttribute('href');}
        }
        for(const image of root.querySelectorAll('img')){const src=image.getAttribute('src')??'';if(!/^\/(?!\/)/.test(src)||/^\/api\//i.test(src))image.remove();else image.loading='lazy';}
        for(const element of root.querySelectorAll('[style]'))cleanStyleAttribute(element);
        for(const element of root.querySelectorAll('[class]'))element.className=element.className.split(/\s+/).filter(Boolean).map(name=>CLASS_PREFIX+name).join(' ');
        const sheets=[...root.querySelectorAll('style')];
        if(sheets.length){
            const scope=`rx-${++scopeCount}`,css=sheets.map(sheet=>scopeRules(parseSheet(document,sheet.textContent),`.${scope}`)).join('');
            sheets.forEach(sheet=>sheet.remove());
            const wrapper=document.createElement('div');wrapper.className=`rx-scope ${scope}`;wrapper.append(...root.childNodes);
            if(css){const style=document.createElement('style');style.textContent=css;wrapper.prepend(style);}
            root.append(wrapper);
        }
        return decorate(document,root).innerHTML;
    };
}
