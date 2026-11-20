import {icon} from './icons.js?build=0.9.1';
import {plainPreview} from './preview.js?build=0.9.1';

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
// Characters page: search, tag filter and sort, applied before the grid is laid out.
export const CHARACTER_SORTS={recent:'Recent',name:'Name',added:'Newest'};
export function arrangeCharacters(cards,{query='',tags=[],tag='',sort='recent',recents=[]}={}){
    if(tag&&!tags.length)tags=[tag];
    const q=String(query).trim().toLocaleLowerCase(),rank=new Map();
    recents.forEach((r,i)=>{if(!rank.has(r.characterKey))rank.set(r.characterKey,i);});
    let rows=cards.filter(c=>(!q||String(c.name??'').toLocaleLowerCase().includes(q)||(c.tags??[]).some(t=>t.toLocaleLowerCase().includes(q)))&&tags.every(tagName=>(c.tags??[]).includes(tagName)));
    const byName=(a,b)=>String(a.name??'').localeCompare(String(b.name??''),undefined,{sensitivity:'base'});
    if(sort==='name')rows=[...rows].sort(byName);
    else if(sort==='added')rows=[...rows].sort((a,b)=>(b.added??0)-(a.added??0)||byName(a,b));
    else rows=[...rows].sort((a,b)=>(rank.get(a.key)??Infinity)-(rank.get(b.key)??Infinity)||byName(a,b));
    return [...rows.filter(c=>c.fav),...rows.filter(c=>!c.fav)];
}
export function characterTags(cards){const count=new Map();for(const c of cards)for(const t of c.tags??[])count.set(t,(count.get(t)??0)+1);return [...count].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([t])=>t);}
export function chatGroups(rows){const groups=new Map();for(const r of rows){if(!groups.has(r.characterKey))groups.set(r.characterKey,[]);groups.get(r.characterKey).push(r);}return [...groups].map(([characterKey,chats])=>({characterKey,chats}));}
export function chunk(rows,size){return Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,i*size+size));}
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
    function characters(content,rows,options={}){
        const {view='cards',sort='recent',tags:activeTags=[],folder='all',folders=[],assignments={},query='',recents=[],onView,onSort,onTags,onFolder,onManage,onSelect,selectedKey}=options;
        if(!rows.length){const empty=node('div','','list-empty');empty.append(node('strong','No characters yet'),node('span','Import a card from your phone, or create one from scratch.'));const actions=node('div','','list-empty-actions'),up=button('Import a card',importCharacters),make=button('Create one',createCharacter);up.className='btn primary';make.className='btn secondary';up.prepend(icon('upload'));make.prepend(icon('plus'));actions.append(up,make);empty.append(actions);content.append(empty);return;}
        const bar=node('div','','list-controls');
        const sortSelect=node('select','','field list-sort');sortSelect.setAttribute('aria-label','Sort characters');for(const [value,label] of Object.entries(CHARACTER_SORTS)){const o=node('option',label);o.value=value;o.selected=value===sort;sortSelect.append(o);}sortSelect.onchange=()=>onSort?.(sortSelect.value);
        const views=node('div','','segmented list-view');views.setAttribute('role','group');views.setAttribute('aria-label','Layout');
        for(const [value,glyph,label] of [['cards','grid','Cards'],['circles','circles','Circles']]){const b=button('',()=>onView?.(value));b.append(icon(glyph));b.setAttribute('aria-label',label);b.title=label;b.setAttribute('aria-pressed',String(view===value));views.append(b);}
        const folderSelect=node('select','','field folder-filter');folderSelect.setAttribute('aria-label','Character folder');for(const [value,label] of [['all','All characters'],['unfiled','Unfiled'],...folders.map(item=>[item.id,item.name])]){const option=node('option',label);option.value=value;option.selected=value===folder;folderSelect.append(option);}folderSelect.onchange=()=>onFolder?.(folderSelect.value);
        const filter=button(activeTags.length?`Filters · ${activeTags.length}`:'Filter',()=>dialog.showModal());filter.className='btn secondary list-filter';filter.prepend(icon('tag'));
        const manage=button('',()=>manageDialog.showModal());manage.className='btn secondary folder-manage';manage.append(icon('folder'));manage.setAttribute('aria-label','Manage character folders');manage.title='Manage character folders';
        bar.append(sortSelect,folderSelect,filter,manage,views);content.append(bar);
        const allTags=characterTags(rows);
        const dialog=node('dialog','','collection-filter-sheet'),form=node('form','','collection-filter-form');form.method='dialog';form.append(node('h2','Filter characters'),node('p','Match all selected tags.','library-caption'));const search=node('input','','field');search.type='search';search.placeholder='Search tags';search.setAttribute('aria-label','Search tags');const choices=node('div','','filter-choices');let draft=[...activeTags];const draw=()=>{const q=search.value.trim().toLocaleLowerCase();choices.replaceChildren(...allTags.filter(name=>!q||name.toLocaleLowerCase().includes(q)).map(name=>{const label=node('label','','filter-choice'),input=node('input');input.type='checkbox';input.checked=draft.includes(name);input.onchange=()=>{draft=input.checked?[...new Set([...draft,name])]:draft.filter(value=>value!==name);};label.append(input,node('span',name));return label;}));};search.oninput=draw;draw();const actions=node('div','','sheet-actions'),cancel=button('Cancel',()=>dialog.close()),clear=button('Clear',()=>{draft=[];draw();}),apply=button('Apply',()=>{onTags?.(draft);dialog.close();});cancel.type=clear.type=apply.type='button';apply.className='btn primary';actions.append(cancel,clear,apply);form.append(search,choices,actions);dialog.append(form);content.append(dialog);
        if(activeTags.length){const summary=node('div','','filter-summary');summary.append(node('span',`${activeTags.length} active filter${activeTags.length===1?'':'s'}`));const clear=button('Clear',()=>onTags?.([]));clear.className='btn quiet';summary.append(clear);content.append(summary);}
        const folderRows=rows.filter(card=>folder==='all'||(folder==='unfiled'?!assignments[card.key]:assignments[card.key]===folder));
        const shown=arrangeCharacters(folderRows,{query,tags:activeTags,sort,recents});
        if(!shown.length){const empty=node('div','','list-empty');empty.append(node('strong',rows.length?'No matching characters':'No characters yet'),node('span',query||activeTags.length||folder!=='all'?'Try clearing search or filters.':'Import a card from your phone, or create one from scratch.'));if(query||activeTags.length||folder!=='all'){const reset=button('Clear filters',()=>{onTags?.([]);onFolder?.('all');});reset.className='btn secondary';empty.append(reset);}content.append(empty);}
        const manageDialog=node('dialog','','collection-filter-sheet'),manageForm=node('form','','collection-filter-form');manageForm.method='dialog';manageForm.append(node('h2','Character folders'),node('p','Folders organize cards only; deleting one never deletes a character.','library-caption'));
        const newName=node('input','','field');newName.placeholder='New folder name';newName.setAttribute('aria-label','New folder name');const createFolder=button('Create',()=>{if(newName.value.trim())onManage?.('create',{name:newName.value});});createFolder.type='button';const createRow=node('div','','folder-action-row');createRow.append(newName,createFolder);manageForm.append(createRow);
        if(folders.length){const chosen=node('select','','field');chosen.setAttribute('aria-label','Folder to rename or delete');for(const item of folders){const option=node('option',item.name);option.value=item.id;chosen.append(option);}const rename=button('Rename',()=>{const name=globalThis.prompt?.('New folder name',folders.find(item=>item.id===chosen.value)?.name??'');if(name?.trim())onManage?.('rename',{id:chosen.value,name});}),remove=button('Delete',()=>{if(globalThis.confirm?.('Delete this folder? Characters will become Unfiled.'))onManage?.('delete',{id:chosen.value});});rename.type=remove.type='button';const folderRow=node('div','','folder-action-row');folderRow.append(chosen,rename,remove);manageForm.append(folderRow);}
        const characterChoice=node('select','','field');characterChoice.setAttribute('aria-label','Character to move');for(const card of rows){const option=node('option',card.name);option.value=card.key;characterChoice.append(option);}const destination=node('select','','field');destination.setAttribute('aria-label','Move to folder');for(const [value,label] of [['','Unfiled'],...folders.map(item=>[item.id,item.name])]){const option=node('option',label);option.value=value;destination.append(option);}const move=button('Move character',()=>onManage?.('move',{characterKey:characterChoice.value,folderId:destination.value||null}));move.type='button';const moveRow=node('div','','folder-move');moveRow.append(characterChoice,destination,move);manageForm.append(moveRow);const done=button('Done',()=>manageDialog.close());done.type='button';manageForm.append(done);manageDialog.append(manageForm);content.append(manageDialog);
        const circles=view==='circles',per=circles?3:(globalThis.matchMedia?.('(min-width: 900px)').matches?3:2);
        windowList(content,chunk(shown,per),group=>{const row=node('div','',circles?'character-grid-row circles':'character-grid-row cards');for(const c of group){const card=button('',()=>onSelect?onSelect(c):editCharacter(c));card.className=circles?'character-card':'character-card tall';card.dataset.key=c.key;card.setAttribute('aria-pressed',String(c.key===selectedKey));card.classList.toggle('selected',c.key===selectedKey);card.append(portrait(c));if(c.fav){const star=node('span','','fav-star');star.append(icon('star'));star.setAttribute('aria-hidden','true');card.querySelector('.avatar').append(star);}card.append(node('span',c.name,'character-card-name'));if(!circles&&c.tags?.length){const t=node('span','','character-card-tags');for(const name of c.tags.slice(0,2))t.append(node('span',name,'chip'));card.append(t);}completeness(c,card);row.append(card);}return row;},circles?150:296);
    }
    function picker(content,rows){
        content.append(node('p','Choose a character to start a fresh conversation.','library-caption'));
        if(!rows.length){content.append(node('p','No saved characters available. Import or create one in Characters.','library-empty'));return;}
        windowList(content,rows,c=>{const b=button('',()=>startFresh(c));b.className='fresh-character';b.dataset.key=c.key;b.setAttribute('aria-label',`Start fresh chat with ${c.name}`);const text=node('span');text.append(node('strong',c.name),node('small',c.complete===false?'Incomplete · edit in Characters':plainDescription(c.description)));b.append(portrait(c),text);const update=()=>{b.dataset.incomplete=String(c.complete===false);b.disabled=!availability()||c.complete===false;text.querySelector('small').textContent=c.complete===false?'Incomplete · edit in Characters':plainDescription(c.description);};update();
            if(c.complete===null){if(!waiting.has(c))waiting.set(c,readCard(c.key).then(value=>{c.complete=characterStatus(value.draft).complete;c.description=value.draft.description??'';}).catch(()=>{}));waiting.get(c).then(()=>{if(b.isConnected)update();});}return b;},104);
    }
    function personas(content,rows,{createPersona:create,editPersona:edit,current,query='',onSelect,selectedKey}){
        if(!rows.length){const empty=node('div','','list-empty');empty.append(node('strong','No personas yet'),node('span','A persona is who you are in a chat: a name, a portrait and a short description.'));const b=button('Create persona',create);b.className='btn primary';b.prepend(icon('plus'));const actions=node('div','','list-empty-actions');actions.append(b);empty.append(actions);content.append(empty);return;}
        const q=String(query).trim().toLocaleLowerCase(),shown=q?rows.filter(p=>`${p.name} ${p.title??''}`.toLocaleLowerCase().includes(q)):rows;
        if(!shown.length){content.append(node('p',`No personas match “${query}”.`,'library-empty'));return;}
        windowList(content,shown,p=>{const row=button('',()=>onSelect?onSelect(p):edit(p));row.className='persona-row';row.dataset.key=p.id;row.setAttribute('aria-label',`${onSelect?'Select':'Edit'} persona ${p.name}`);row.setAttribute('aria-pressed',String(p.id===selectedKey));row.classList.toggle('selected',p.id===selectedKey);const text=node('span','','persona-row-text');text.append(node('strong',p.name),node('span',p.title||plainPreview(p.description,140)||'No description','persona-row-line'));row.append(personaPortrait(p),text);if(p.id===current){const mark=node('span','Current','chip persona-current-chip');row.append(mark);}return row;},76);
    }
    function plainDescription(text){return plainPreview(text,240);}
    function chat(row,characters){
        const c=characters.find(c=>c.key===row.characterKey),outer=node('div','','chat-row'),open=button('',()=>row.open());open.className='chat-open';open.setAttribute('aria-label',`${row.selecting?'Select':'Open'} ${c?.name??row.characterKey} · ${row.chatId}`);open.setAttribute('aria-pressed',String(!!row.selected));outer.classList.toggle('selected',!!row.selected);
        const text=node('span','','chat-row-text'),top=node('span','','chat-row-top');top.append(node('strong',row.inGroup?row.chatId:c?.name??row.characterKey));const date=chatDate(row.updated);if(date){const time=node('time',date.label);time.dateTime=date.datetime;time.title=date.title;top.append(time);}
        text.append(top);if(row.showChatName!==false&&!row.inGroup)text.append(node('span',row.chatId,'chat-row-name'));text.append(node('span',plainPreview(row.preview)||'No messages yet','preview'));if(!row.inGroup)open.append(portrait(c));open.append(text);if(row.inGroup)outer.classList.add('in-group');
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
