import {icon} from './icons.js?build=0.8.0-phase1.2';

export function characterStatus(card){
    const missing=[['name','name'],['description','description'],['first_mes','main greeting']].filter(([key])=>!String(card?.[key]??'').trim()).map(([,label])=>label);
    return {complete:!missing.length,missing};
}
export function characterRows(cards){return Array.from({length:Math.ceil(cards.length/3)},(_,index)=>cards.slice(index*3,index*3+3));}
export function chatDate(value,now=Date.now()){
    if(value==null||value==='')return null;
    const time=typeof value==='number'?value:typeof value==='string'&&/^\d{13}$/.test(value)?Number(value):Date.parse(String(value));
    if(!Number.isFinite(time))return null;
    const date=new Date(time),today=new Date(now),yesterday=new Date(now);if(!Number.isFinite(date.getTime()))return null;yesterday.setDate(yesterday.getDate()-1);
    const day=v=>[v.getFullYear(),v.getMonth(),v.getDate()].join('-');
    const label=day(date)===day(today)?date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):day(date)===day(yesterday)?'Yesterday':date.toLocaleDateString(undefined,{day:'numeric',month:'short',...(date.getFullYear()!==today.getFullYear()?{year:'numeric'}:{})});
    return {label,datetime:date.toISOString(),title:date.toLocaleString()};
}
export function createLibraryViews({node,button,portrait,personaPortrait,windowList,editCharacter,createCharacter,importCharacters,editPersona,createPersona,startFresh,onDelete,readCard,availability}){
    const waiting=new WeakMap();
    function completeness(c,element){
        const update=()=>{
            element.querySelector('.incomplete-badge')?.remove();
            element.setAttribute('aria-label',`Edit ${c.name}${c.complete===false?' · Incomplete':''}`);
            element.title=c.metadataError??(c.complete===false?'Incomplete character · save a name, description and main greeting':c.name);
            if(c.complete===false){const badge=node('span','!','incomplete-badge');badge.setAttribute('aria-hidden','true');element.querySelector('.avatar').append(badge);}
        };
        update();
        if(c.complete!==null)return;
        if(!waiting.has(c))waiting.set(c,readCard(c.key).then(value=>{c.complete=characterStatus(value.draft).complete;c.description=value.draft.description??'';}).catch(()=>{c.metadataError='Character details unavailable. Open to retry.';}));
        waiting.get(c).then(()=>{if(element.isConnected)update();});
    }
    function characters(content,rows){
        const tools=node('div','','library-tools'),upload=button('Import',importCharacters),create=button('Create',createCharacter);upload.prepend(icon('upload'));create.prepend(icon('plus'));upload.id='characters-import';create.id='characters-create';tools.append(upload,create);content.append(tools);
        if(!rows.length){content.append(node('p','No characters yet. Import a native card or create one.','library-empty'));return;}
        windowList(content,characterRows(rows),group=>{const row=node('div','','character-grid-row');for(const c of group){const card=button('',()=>editCharacter(c));card.className='character-card';card.dataset.key=c.key;card.append(portrait(c),node('span',c.name,'character-card-name'));completeness(c,card);row.append(card);}return row;},150);
    }
    function picker(content,rows){
        content.append(node('p','Choose a character to start a fresh conversation.','library-caption'));
        if(!rows.length){content.append(node('p','No saved characters available. Import or create one in Characters.','library-empty'));return;}
        windowList(content,rows,c=>{const b=button('',()=>startFresh(c));b.className='fresh-character';b.dataset.key=c.key;b.setAttribute('aria-label',`Start fresh chat with ${c.name}`);const text=node('span');text.append(node('strong',c.name),node('small',c.complete===false?'Incomplete · edit in Characters':plainDescription(c.description)));b.append(portrait(c),text);const update=()=>{b.dataset.incomplete=String(c.complete===false);b.disabled=!availability()||c.complete===false;text.querySelector('small').textContent=c.complete===false?'Incomplete · edit in Characters':plainDescription(c.description);};update();
            if(c.complete===null){if(!waiting.has(c))waiting.set(c,readCard(c.key).then(value=>{c.complete=characterStatus(value.draft).complete;c.description=value.draft.description??'';}).catch(()=>{}));waiting.get(c).then(()=>{if(b.isConnected)update();});}return b;},104);
    }
    function personas(content,rows,{createPersona:create,editPersona:edit}){
        const tools=node('div','','library-tools'),btn=button('Create persona',create);btn.prepend(icon('plus'));btn.id='personas-create';tools.append(btn);content.append(tools);
        if(!rows.length){content.append(node('p','No personas yet. Create one to get started.','library-empty'));return;}
        windowList(content,characterRows(rows),group=>{const row=node('div','','character-grid-row');for(const p of group){const card=button('',()=>edit(p));card.className='character-card persona-card';card.dataset.key=p.id;card.append(personaPortrait(p),node('span',p.name,'character-card-name'));row.append(card);}return row;},150);
    }
    function plainDescription(text){return String(text??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,240);}
    function chat(row,characters){
        const c=characters.find(c=>c.key===row.characterKey),outer=node('div','','chat-row'),open=button('',()=>row.open());open.className='chat-open';open.setAttribute('aria-label',`Open ${c?.name??row.characterKey} · ${row.chatId}`);
        const text=node('span','','chat-row-text'),top=node('span','','chat-row-top');top.append(node('strong',c?.name??row.characterKey));const date=chatDate(row.updated);if(date){const time=node('time',date.label);time.dateTime=date.datetime;time.title=date.title;top.append(time);}
        text.append(top,node('span',row.chatId,'chat-row-name'),node('span',String(row.preview??'').slice(0,240)||'No messages yet','preview'));open.append(portrait(c),text);
        const more=button('',()=>onDelete(row));more.className='chat-row-more';more.append(icon('more'));more.setAttribute('aria-label',`Actions for ${row.chatId}`);more.title='Delete chat · confirmation and Undo';
        const del=button('Delete',()=>onDelete(row));del.className='row-delete';del.hidden=true;del.setAttribute('aria-label',`Delete ${row.chatId}`);outer.append(open,more,del);
        let pointer,suppressClick=false;
        outer.addEventListener('pointerdown',e=>{suppressClick=false;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
        outer.addEventListener('pointercancel',()=>{pointer=null;});
        outer.addEventListener('pointerup',e=>{const from=pointer;pointer=null;if(!from||from.id!==e.pointerId||document.getSelection()?.isCollapsed===false)return;const dx=from.x-e.clientX,dy=Math.abs(from.y-e.clientY);if(Math.abs(dx)>55&&dy<35){del.hidden=dx<0;outer.classList.toggle('delete-revealed',dx>0);suppressClick=true;}});
        outer.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
        return outer;
    }
    function update(){for(const b of document.querySelectorAll('.fresh-character'))b.disabled=!availability()||b.dataset.incomplete==='true';}
    return {characters,personas,picker,chat,update};
}
