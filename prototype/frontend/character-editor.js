import {createCharacterAssociations} from './character-associations.js?build=0.7.4';
import {characterGreetings,organizeGreeting,creatorNotesDocument} from './character-data.js?build=0.7.4';

export function createCharacterEditor({format,converter,sanitize,storage=localStorage}) {
    const links=createCharacterAssociations();
    let mode='read',selected=0,organizing=false,cardKey=null;
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
    function begin(key,{fromLibrary=false}={}){
        cardKey=key;selected=0;organizing=false;mode='read';
        try{mode=storage.getItem(`pocket-character-mode:${key}`)==='edit'?'edit':'read';}catch{}
        if(!key||fromLibrary)mode='edit';
    }
    function render({body,draft,key,associations,associationError,changed,field,rerender,onActions}) {
        const panel=document.getElementById('asset-editor');panel.classList.add('character-editor');
        panel.querySelector('h2').textContent='Character';
        document.getElementById('save-asset').hidden=mode!=='edit';
        document.getElementById('cancel-character').hidden=mode!=='edit';
        document.getElementById('character-savebar').hidden=mode!=='edit';
        document.getElementById('asset-portrait-label').hidden=mode!=='edit';
        document.getElementById('asset-json').closest('details').hidden=mode!=='edit';
        const back=document.getElementById('close-asset');back.textContent='‹';back.setAttribute('aria-label',mode==='edit'?'Cancel character edits':'Back from character');panel.querySelector('.dialog-heading').prepend(back);
        const tabs=node('div');tabs.className='character-modes';tabs.setAttribute('aria-label','Character view');
        for(const view of ['read','edit']){const b=button(view==='read'?'Read':'Edit',()=>{mode=view;organizing=false;try{if(cardKey)storage.setItem(`pocket-character-mode:${cardKey}`,mode);}catch{}rerender();});b.setAttribute('aria-pressed',String(mode===view));tabs.append(b);}panel.querySelector('.character-modes')?.remove();panel.querySelector('.dialog-heading').append(tabs);panel.querySelector('.character-actions-trigger')?.remove();if(key){const overflow=button('…',onActions);overflow.className='character-actions-trigger';overflow.setAttribute('aria-label','Character actions');overflow.setAttribute('aria-controls','character-actions');overflow.setAttribute('aria-expanded',String(!document.getElementById('character-actions').hidden));panel.querySelector('.dialog-heading').append(overflow);}
        const identity=node('section');identity.className='character-identity';
        const portraitColumn=node('div');portraitColumn.className='character-portrait-column';
        if(key){const image=node('img');image.src=`/thumbnail?type=avatar&file=${encodeURIComponent(key)}`;image.alt='';image.className='character-portrait';portraitColumn.append(image);}
        links.identity({parent:portraitColumn,key,associations,error:associationError});identity.append(portraitColumn);
        const heading=node('div');if(mode==='edit')field(heading,'Name',draft.name,value=>draft.name=value,{rows:1,type:'text'});else heading.append(node('h3',draft.name||'Unnamed character'));
        const metadata=[draft.creator&&`by ${draft.creator}`,draft.character_version&&`v${draft.character_version}`].filter(Boolean).join(' · ');if(metadata)heading.append(node('small',metadata));
        if(mode==='read'){const tags=node('div');tags.className='character-tags';for(const value of draft.tags??[])tags.append(node('span',String(value)));heading.append(tags);}else field(heading,'Tags (comma separated)',(draft.tags??[]).join(', '),value=>draft.tags=value.split(',').map(x=>x.trim()).filter(Boolean),{rows:1,type:'text'});identity.append(heading);body.append(identity);
        if(mode==='read'&&String(draft.creator_notes??'').trim()){
            const notes=node('details');notes.className='character-notes';notes.append(node('summary',"Creator’s Notes"));
            const frame=node('iframe');frame.title=`Creator’s Notes for ${draft.name||'this character'}`;frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';frame.srcdoc=creatorNotesDocument(draft.creator_notes,{converter,sanitize,document});notes.append(frame);body.append(notes);
        }
        links.lorebooks({parent:body,key,associations,error:associationError});
        const textField=(parent,label,name,rows=7)=>{
            if(mode==='edit')field(parent,label,draft[name],value=>draft[name]=value,{rows});
            else {parent.append(node('h4',label));const content=node('div');content.className='character-reading';content.innerHTML=draft[name]?format(draft[name]):'<p class="character-empty">Not provided</p>';parent.append(content);}
        };
        textField(body,'Description','description',10);
        const greeting=node('section');greeting.className='character-greeting';greeting.append(node('h4','Greeting'));body.append(greeting);
        const items=characterGreetings(draft);selected=Math.min(selected,items.length-1);
        const navigation=node('div');navigation.className='character-greeting-nav';
        const previous=button('‹',()=>{selected--;rerender();});previous.setAttribute('aria-label','Previous greeting');previous.disabled=selected===0;
        const next=button('›',()=>{selected++;rerender();});next.setAttribute('aria-label','Next greeting');next.disabled=selected===items.length-1;
        const count=node('span',`${selected+1} / ${items.length}`);count.setAttribute('aria-live','polite');navigation.append(previous,count,next);
        if(mode==='edit')navigation.append(button(organizing?'Done':'Organize',()=>{organizing=!organizing;rerender();}));greeting.append(navigation);
        greeting.append(node('p',selected===0?'Main greeting':'Alternate greeting'));
        if(mode==='edit')field(greeting,'Greeting text',items[selected],value=>{if(selected===0)draft.first_mes=value;else draft.alternate_greetings[selected-1]=value;},{rows:8});else {const content=node('div');content.className='character-reading';content.innerHTML=items[selected]?format(items[selected]):'<p class="character-empty">Not provided</p>';greeting.append(content);}
        if(mode==='edit'&&(organizing||items.length===1)){
            const mutate=(action,index)=>{Object.assign(draft,organizeGreeting(draft,action,index));changed();if(action==='add')selected=characterGreetings(draft).length-1;else if(action==='main')selected=0;else if(action==='delete')selected=Math.min(selected,characterGreetings(draft).length-1);rerender();};
            if(organizing){const list=node('ol');list.className='character-greeting-order';items.forEach((text,index)=>{const row=node('li');row.append(node('span',`${index===0?'Main':`Alternative ${index}`} · ${text.trim().slice(0,80)||'Empty greeting'}`));if(index){const actions=node('div');for(const [action,label]of [['up','Move up'],['down','Move down'],['main','Set as main'],['delete','Delete']]){const b=button(label,()=>mutate(action,index));b.setAttribute('aria-label',`${label} · alternative ${index}`);b.disabled=action==='up'&&index===1||action==='down'&&index===items.length-1;actions.append(b);}row.append(actions);}list.append(row);});greeting.append(list);}
            greeting.append(button('Add alternate greeting',()=>mutate('add',selected)));
        }
        const advanced=node('details');advanced.className='character-advanced';advanced.append(node('summary','Advanced definitions'));
        for(const [name,label]of [['personality','Personality'],['scenario','Scenario'],['mes_example','Example dialogue'],['system_prompt','System prompt override'],['post_history_instructions','Post-history instructions']])textField(advanced,label,name);
        if(mode==='edit'){const metadata=node('details');metadata.append(node('summary',"Creator’s metadata"));for(const [name,label]of [['creator_notes',"Creator’s Notes · raw source"],['creator','Creator'],['character_version','Character version']])field(metadata,label,draft[name],value=>draft[name]=value,{rows:name==='creator_notes'?8:1});advanced.append(metadata);}body.append(advanced);
    }
    return {begin,render,back(){if(organizing){organizing=false;return true;}return false;}};
}
