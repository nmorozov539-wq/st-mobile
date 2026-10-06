// Reuse the engine's Markdown parser and HTML sanitizer. Chat HTML cannot
// create scripts, remote embeds, forms, or controls outside its own message.
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
        const walker=document.createTreeWalker(root,4),nodes=[];
        while(walker.nextNode())if(!walker.currentNode.parentElement.closest('code,pre'))nodes.push(walker.currentNode);
        for(const node of nodes){
            const pieces=node.textContent.split(/("[^"\n]+"|“[^”\n]+”)/g);
            if(pieces.length===1)continue;
            const fragment=document.createDocumentFragment();
            for(const part of pieces){if(/^("|“)/.test(part)){const span=document.createElement('span');span.className='dialogue';span.textContent=part;fragment.append(span);}else fragment.append(document.createTextNode(part));}
            node.replaceWith(fragment);
        }
        return root.innerHTML;
    };
}
