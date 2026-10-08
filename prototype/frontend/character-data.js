// Greetings belong to the card, never to the saved chat or generation queue.
export function characterGreetings(card) {
    const alternatives=card.alternate_greetings??[];
    if(!Array.isArray(alternatives)||alternatives.some(value=>typeof value!=='string'))throw Error('Alternate greetings must be an array of strings. Use Advanced JSON to repair this card.');
    return [String(card.first_mes??''),...alternatives];
}
export function organizeGreeting(card,action,index=0) {
    const items=characterGreetings(card);
    if(!Number.isInteger(index)||index<0||index>=items.length)throw Error('This greeting no longer exists.');
    if(action==='add')items.push('');
    else if(action==='main'){const [value]=items.splice(index,1);items.unshift(value);}
    else if(action==='delete'){if(index===0)throw Error('Choose another main greeting before deleting this one.');items.splice(index,1);}
    else if(action==='up'||action==='down'){
        const destination=index+(action==='up'?-1:1);
        if(index===0||destination<=0||destination>=items.length)throw Error('Only alternate greetings can move. Choose Set as main to replace the main greeting.');
        [items[index],items[destination]]=[items[destination],items[index]];
    }else throw Error('Unknown greeting action.');
    return {...card,first_mes:items[0],alternate_greetings:items.slice(1)};
}
export function creatorNotesDocument(source,{converter,sanitize,document}) {
    // CSS stays inside an opaque-origin sandbox. CSP also blocks network fetches.
    const root=document.createElement('template');
    root.innerHTML=sanitize(`<div>${converter.makeHtml(String(source??''))}</div>`,{ADD_TAGS:['style'],ADD_ATTR:['style'],FORBID_TAGS:['script','iframe','object','embed','form','input','button','meta','link','base'],ALLOW_DATA_ATTR:false});
    for(const link of root.content.querySelectorAll('a'))link.removeAttribute('href');
    for(const image of root.content.querySelectorAll('img')){image.removeAttribute('srcset');if(!/^data:image\//i.test(image.getAttribute('src')??''))image.removeAttribute('src');}
    return '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\'; base-uri \'none\'"><style>html{color-scheme:dark}body{margin:12px;color:#dce1eb;font:15px/1.6 system-ui;overflow-wrap:anywhere}img,table{max-width:100%}pre{white-space:pre-wrap}</style></head><body>'+root.innerHTML+'</body></html>';
}
