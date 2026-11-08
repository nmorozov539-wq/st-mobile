// Reuse the engine's Markdown parser and HTML sanitizer. Chat HTML cannot
// create scripts, remote embeds, forms, or controls outside its own message.
// Styling follows only what the model wrote: quotes become speech, and
// out-of-character text (a line starting with OOC:, or ((double parentheses)))
// is dimmed. Nothing else is inferred.
export const OOC_LINE=/^\s*(?:\(\(\s*)?OOC\s*:/i;
export const OOC_INLINE=/(\(\([^()\n]*\)\))/g;
const BLOCKS='p,li,blockquote,div,td,th,summary';
const skip=node=>node.parentElement.closest('code,pre,.ooc');
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
export function createHTMLFormatter({converter,sanitize,document}) {
    return text => {
        const clean=sanitize(converter.makeHtml(String(text??'')),{
            ALLOWED_TAGS:['p','br','hr','strong','b','em','i','u','s','del','blockquote','pre','code','ul','ol','li','h1','h2','h3','h4','h5','h6','a','span','div','font','details','summary','table','thead','tbody','tr','th','td'],
            ALLOWED_ATTR:['href','title','color','open','start','colspan','rowspan'],
            ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,
        });
        const root=document.createElement('div');root.innerHTML=clean;
        for(const link of root.querySelectorAll('a')){
            const href=link.getAttribute('href');
            try {if(!['http:','https:'].includes(new URL(href).protocol))throw Error();link.target='_blank';link.rel='noopener noreferrer';}
            catch {link.removeAttribute('href');}
        }
        return decorate(document,root).innerHTML;
    };
}
