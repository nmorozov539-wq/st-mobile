import {icon} from './icons.js?build=0.9.2';
import {validColour} from './char-colour.js?build=0.9.2';
import {createCharacterAssociations} from './character-associations.js?build=0.9.2';
import {characterGreetings,organizeGreeting,creatorNotesDocument} from './character-data.js?build=0.9.2';

export function createCharacterEditor({format,converter,sanitize,storage=localStorage,associationOptions,colourOf=async()=>null,globalPreset=()=>''}) {
    const links=createCharacterAssociations(associationOptions);
    let mode='read',selected=0,organizing=false,cardKey=null,tagsExpanded=false;
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
    function begin(key,{fromLibrary=false}={}){
        cardKey=key;selected=0;organizing=false;tagsExpanded=false;mode='read';
        if(!key)mode='edit';
    }
    function render({body,draft,key,associations,associationError,changed,field,rerender,onActions,chats}) {
        const panel=document.getElementById('asset-editor');panel.classList.add('character-editor');
        panel.querySelector('h2').textContent='Character';
        document.getElementById('save-asset').hidden=mode!=='edit';
        document.getElementById('cancel-character').hidden=mode!=='edit';
        document.getElementById('character-savebar').hidden=mode!=='edit';
        document.getElementById('asset-portrait-label').hidden=mode!=='edit';
        document.getElementById('asset-json').closest('details').hidden=mode!=='edit';
        const back=document.getElementById('close-asset');back.replaceChildren(icon('back'));back.setAttribute('aria-label',mode==='edit'?'Cancel character edits':'Back from character');panel.querySelector('.dialog-heading').prepend(back);
        panel.querySelector('.character-modes')?.remove();panel.querySelector('.character-actions-trigger')?.remove();if(key){const overflow=button('…',onActions);overflow.className='character-actions-trigger';overflow.setAttribute('aria-label','Character actions');overflow.setAttribute('aria-controls','character-actions');overflow.setAttribute('aria-expanded',String(!document.getElementById('character-actions').hidden));panel.querySelector('.dialog-heading').append(overflow);}
        if(mode==='read'){readView({body,draft,key,associations,associationError,rerender,chats});return;}
        chats?.render(body,key);
        const identity=node('section');identity.className='character-identity';
        const portraitColumn=node('div');portraitColumn.className='character-portrait-column';
        if(key){const image=node('img');image.src=`/thumbnail?type=avatar&file=${encodeURIComponent(key)}`;image.alt='';image.className='character-portrait';portraitColumn.append(image);}
        links.identity({parent:portraitColumn,key,associations,error:associationError});identity.append(portraitColumn);
        const heading=node('div');if(mode==='edit')field(heading,'Name',draft.name,value=>draft.name=value,{rows:1,type:'text'});else heading.append(node('h3',draft.name||'Unnamed character'));
        const metadata=[draft.creator&&`by ${draft.creator}`,draft.character_version&&`v${draft.character_version}`].filter(Boolean).join(' · ');if(metadata)heading.append(node('small',metadata));
        if(mode==='read'){const tags=node('div');tags.className='character-tags';for(const value of draft.tags??[])tags.append(node('span',String(value)));heading.append(tags);}else field(heading,'Tags (comma separated)',(draft.tags??[]).join(', '),value=>draft.tags=value.split(',').map(x=>x.trim()).filter(Boolean),{rows:1,type:'text'});identity.append(heading);body.append(identity);
        if(mode==='edit'){
            // Empty is a real Automatic mode. Its swatch previews the resolved portrait/theme colour; it is never a fake saved gold.
            const own=validColour(draft.extensions?.pocket_tavern?.color),row=node('div');row.className='character-colour';
            const modeLabel=node('label');modeLabel.append(node('span','Chat colour mode'));const modeSelect=node('select');modeSelect.setAttribute('aria-label','Chat colour mode');for(const [value,text] of [['automatic','Automatic'],['custom','Custom']]){const option=node('option',text);option.value=value;option.selected=own?value==='custom':value==='automatic';modeSelect.append(option);}modeLabel.append(modeSelect);
            const label=node('label');label.append(node('span',own?'Custom colour':'Automatic preview'));const input=node('input');input.type='color';input.value=own??'#808080';input.disabled=!own;input.setAttribute('aria-label',own?'Custom chat colour':'Automatic chat colour preview');
            const note=node('small',own?'Custom override · saved only with the character':'Resolving portrait and theme colour…');let resolved=null;
            const set=value=>{const pocket={...(draft.extensions?.pocket_tavern??{})};if(value)pocket.color=value;else delete pocket.color;draft.extensions={...(draft.extensions??{}),pocket_tavern:pocket};changed();};
            input.oninput=()=>{set(input.value);note.textContent='Custom override · saved only with the character';};
            modeSelect.onchange=()=>{const custom=modeSelect.value==='custom';input.disabled=!custom;label.firstChild.textContent=custom?'Custom colour':'Automatic preview';input.setAttribute('aria-label',custom?'Custom chat colour':'Automatic chat colour preview');if(custom){const fallback=validColour(getComputedStyle(document.documentElement).getPropertyValue('--color-accent'))??'#808080';input.value=resolved??own??fallback;set(input.value);note.textContent='Custom override · saved only with the character';}else{set('');if(resolved)input.value=resolved;note.textContent=resolved?`Automatic preview · ${resolved}`:'Automatic · theme default';}};
            Promise.resolve(key?colourOf(key,''):null).then(value=>{resolved=validColour(value?.color);if(modeSelect.value==='automatic'){if(resolved)input.value=resolved;note.textContent=resolved?`Automatic preview · ${resolved}`:'Automatic · theme default';}}).catch(()=>{if(modeSelect.value==='automatic')note.textContent='Automatic · theme default';});
            label.append(input);row.append(modeLabel,label,note);body.append(row);
        }
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
        const previous=button('',()=>{selected--;rerender();});previous.append(icon('back'));previous.setAttribute('aria-label','Previous greeting');previous.disabled=selected===0;
        const next=button('',()=>{selected++;rerender();});next.append(icon('right'));next.setAttribute('aria-label','Next greeting');next.disabled=selected===items.length-1;
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
    // Read mode is the workshop: portrait, name and tags, Start chat, then one section per part of the card.
    function readView({body,draft,key,associations,associationError,rerender,chats}){
        const section=(title,className='')=>{const s=node('section');s.className=`workshop-section ${className}`.trim();if(title)s.append(node('h4',title));body.append(s);return s;};
        const reading=(parent,text)=>{const content=node('div');content.className='character-reading';content.innerHTML=text?format(text):'<p class="character-empty">Not provided</p>';parent.append(content);return content;};
        const hero=node('section');hero.className='character-hero';
        const frame=node('div');frame.className='character-hero-portrait';
        if(key){const image=node('img');image.src=`/characters/${encodeURIComponent(key)}`;image.alt='';image.onerror=()=>{image.remove();frame.textContent=(draft.name||'?').slice(0,1);};frame.append(image);}else frame.textContent=(draft.name||'?').slice(0,1);
        hero.append(frame,node('h3',draft.name||'Unnamed character'));
        const metadata=[draft.creator&&`by ${draft.creator}`,draft.character_version&&`v${draft.character_version}`].filter(Boolean).join(' · ');if(metadata)hero.append(node('small',metadata));
        if(draft.tags?.length){const tags=node('div');tags.className='character-tags';tags.classList.toggle('expanded',tagsExpanded);for(const value of draft.tags)tags.append(node('span',String(value)));hero.append(tags);if(draft.tags.length>4){const more=button(tagsExpanded?'Show less':'Show all',()=>{tagsExpanded=!tagsExpanded;rerender();});more.className='character-tags-more';hero.append(more);}}
        const actions=node('div');actions.className='character-hero-actions';
        const original=document.getElementById('start-character-chat');
        const start=button('Start chat',()=>original?.click());start.className='btn primary';start.id='character-hero-start';start.prepend(icon('chat'));start.disabled=!!original?.disabled;
        const edit=button('Edit',()=>{mode='edit';organizing=false;rerender();});edit.className='btn secondary';edit.id='character-hero-edit';edit.prepend(icon('edit'));
        actions.append(start,edit);hero.append(actions);body.append(hero);
        const savedColour=draft.extensions?.pocket_tavern?.color,own=validColour(savedColour);
        const paint=value=>{if(value?.color&&hero.isConnected){const panel=document.getElementById('asset-editor');panel.style.setProperty('--char',value.color);panel.style.setProperty('--color-character-ink',value.ink);}};
        document.getElementById('asset-editor').style.removeProperty('--char');
        document.getElementById('asset-editor').style.removeProperty('--color-character-ink');
        if(key)Promise.resolve(colourOf(key,savedColour)).then(paint).catch(()=>{});
        chats?.render(body,key);
        if(String(draft.creator_notes??'').trim()){
            const notes=node('details');notes.className='character-notes workshop-section';notes.append(node('summary',"Creator’s Notes"));
            const frame=node('iframe');frame.title=`Creator’s Notes for ${draft.name||'this character'}`;frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';frame.srcdoc=creatorNotesDocument(draft.creator_notes,{converter,sanitize,document});notes.append(frame);body.append(notes);
        }
        reading(section('Description'),draft.description);
        const greeting=section('Greeting','character-greeting');const items=characterGreetings(draft);selected=Math.min(selected,items.length-1);
        if(items.length>1){const navigation=node('div');navigation.className='character-greeting-nav';const previous=button('',()=>{selected--;rerender();});previous.append(icon('back'));previous.setAttribute('aria-label','Previous greeting');previous.disabled=selected===0;const next=button('',()=>{selected++;rerender();});next.append(icon('right'));next.setAttribute('aria-label','Next greeting');next.disabled=selected===items.length-1;const count=node('span',`${selected===0?'Main':`Alternate ${selected}`} · ${selected+1} of ${items.length}`);count.setAttribute('aria-live','polite');navigation.append(previous,count,next);greeting.append(navigation);}
        reading(greeting,items[selected]);
        links.lorebooks({parent:section('Lore','workshop-lore'),key,associations,error:associationError});
        const preset=section('Preset','workshop-preset'),scoped=draft.extensions?.pocket_tavern?.settings,own_preset=scoped?.enabled?scoped.copy?.preset:null;
        const line=node('p');line.className='workshop-line';
        if(own_preset){line.append(node('strong',own_preset),document.createTextNode(' · chosen for this character'));}else{line.append(node('strong',globalPreset()||'Your global preset'),document.createTextNode(' · the same as everywhere'));}
        preset.append(line,node('small','To change it, open a chat with this character, tap the preset chip in the header and choose This character.'));
        links.identity({parent:section('Persona','workshop-persona'),key,associations,error:associationError});
        const advanced=node('details');advanced.className='character-advanced workshop-section';advanced.append(node('summary','Advanced definitions'));
        for(const [name,label]of [['personality','Personality'],['scenario','Scenario'],['mes_example','Example dialogue'],['system_prompt','System prompt override'],['post_history_instructions','Post-history instructions']]){advanced.append(node('h4',label));reading(advanced,draft[name]);}
        body.append(advanced);
    }
    return {begin,render,updateLinks:links.update,capture:()=>({mode,selected,organizing,cardKey,tagsExpanded}),restore:value=>{({mode,selected,organizing,cardKey,tagsExpanded=false}=value);},editing:()=>mode==='edit',saved(){mode='read';organizing=false;},cancel(){mode='read';organizing=false;},back(){if(organizing){organizing=false;return true;}return false;}};
}
