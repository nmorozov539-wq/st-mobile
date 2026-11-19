import {icon} from './icons.js?build=0.9.0';

export function createCharacterAssociations({rpc,action,readState,onSaved,editPersona,chatPersona=()=>null}) {
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    let loadingFor=null,captured=null,waiting=false,uncertain=false,mutationButtons=[],primaryButtons=[],status=null;
    const dialogs=[];
    function dialog(id,label){
        const sheet=node('dialog');sheet.id=id;sheet.className='character-association-sheet';sheet.setAttribute('aria-label',label);document.getElementById('asset-editor').after(sheet);dialogs.push(sheet);
        sheet.addEventListener('cancel',event=>{event.preventDefault();sheet.close();});
        sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const b=sheet.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)sheet.close();});return sheet;
    }
    const personaSheet=dialog('character-persona-info','Linked persona'),picker=dialog('character-lorebook-picker','Connect lorebook'),confirm=dialog('character-association-confirm','Confirm association change');
    const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};
    function update(){
        if(!dialogs.some(d=>d.open))return;
        const state=readState(),blocked=waiting||uncertain||state.busy||state.unavailable||state.key!==captured?.key;
        for(const b of mutationButtons)b.disabled=blocked;
        for(const b of primaryButtons)b.disabled=blocked||state.primaryDirty;
        if(status&&!waiting&&!uncertain&&loadingFor!==captured)status.textContent=state.busy?'Available after the engine finishes.':state.unavailable?'Reconnect and review saved work before changing links.':state.primaryDirty&&primaryButtons.length?'Save or cancel lorebook changes in the card draft first.':'';
    }
    function open(sheet,title,{closeButton=false}={}){
        for(const d of dialogs)if(d.open)d.close();sheet.replaceChildren();captured={...readState()};mutationButtons=[];primaryButtons=[];uncertain=false;sheet.setAttribute('aria-label',title);
        const header=node('div');header.className='sheet-header';header.append(node('h3',title));
        if(closeButton){const x=button('',()=>sheet.close());x.append(icon('close'));x.className='sheet-close';x.setAttribute('aria-label','Close');header.append(x);}
        sheet.append(header);status=node('p');status.setAttribute('role','status');sheet.append(status);sheet.showModal();update();
    }
    function mutateButton(sheet,label,fn,{primary=false}={}){const b=button(label,fn);mutationButtons.push(b);if(primary)primaryButtons.push(b);sheet.append(b);update();return b;}
    function back(sheet){sheet.append(button('Back',()=>sheet.close()));}
    async function perform(extra){
        update();const current=readState();if(waiting||uncertain||current.busy||current.unavailable||current.key!==captured.key||extra.type==='primary'&&current.primaryDirty)return;
        const origin={...captured};waiting=true;status.textContent='Saving and checking ST’s saved links…';update();
        await action(async()=>{try{
            const result=await rpc('assets',{kind:'characters',action:'association',key:origin.key,revision:origin.revision,associationGuard:origin.associationGuard,...extra},60000);
            await onSaved(result,origin);if(readState().key===origin.key&&readState().editorSession===origin.editorSession)for(const d of dialogs)if(d.open)d.close();
        }catch(error){uncertain=true;status.textContent=error.message+' Reopen the character and inspect saved links before another change.';throw error;}
        finally{waiting=false;update();}});
    }
    function confirmation(title,text,extra){open(confirm,title);confirm.classList.add('confirm-compact');confirm.append(node('p',text));const actions=node('div');actions.className='confirm-actions';const actionBtn=mutateButton(actions,extra.operation==='persona-unlink'?'Remove link':'Unattach',()=>perform(extra),{primary:extra.type==='primary'});actionBtn.classList.add('destructive');actions.append(button('Cancel',()=>confirm.close()));confirm.append(actions);}
    function showPersonas(personas){
        const title=personas.length>1?`${personas.length} linked personas`:`Linked persona · ${personas[0]?.name??''}`;
        open(personaSheet,title,{closeButton:true});const list=node('ul');
        for(const persona of personas){
            const row=node('li',persona.name);row.append(node('small',persona.available?'Linked to this character':`Saved link · persona unavailable (${persona.key})`));
            if(persona.available){
                const actions=node('div');actions.className='persona-link-actions';
                actions.append(button('Edit',async()=>{personaSheet.close();await action(()=>editPersona(persona.key));}));
                const removeBtn=mutateButton(actions,'Remove link',()=>confirmation(`Remove ${persona.name}’s link to ${captured.name}?`,`Remove ${persona.name}’s character link to ${captured.name}? The persona and its other links are kept.`,{operation:'persona-unlink',personaKey:persona.key}));
                removeBtn.classList.add('destructive');row.append(actions);
            }
            list.append(row);
        }
        personaSheet.append(list);
        if(personas.length>1)personaSheet.append(node('p','A chat without its own persona asks which one to use.'));
        update();
    }
    async function connect(){
        open(picker,'Connect lorebook');status.textContent='Loading saved lorebooks…';const origin=captured;loadingFor=origin;const close=button('Back',()=>picker.close());picker.append(close);
        try{const books=await rpc('assets',{kind:'characters',action:'lorebooks'});if(!picker.open||captured!==origin)return;loadingFor=null;status.textContent='';
            const list=node('div');list.className='character-book-choices';let selected=books[0]?.file_id,type='additional';
            for(const book of books){const b=button(book.file_id,()=>{selected=book.file_id;for(const child of list.children)child.setAttribute('aria-pressed',String(child===b));});b.setAttribute('aria-pressed',String(selected===book.file_id));list.append(b);}picker.append(list);
            if(!books.length){picker.append(node('p','No saved lorebooks. Create or import one in SillyTavern first.'));picker.append(close);status.textContent='';return;}
            const types=node('div');types.className='character-attachment-types';const note=node('p');
            const explain=()=>{note.textContent=type==='primary'?'Primary is included in card export. Choosing it replaces the current primary and its embedded copy.':'Additional stays separate from card export.';apply.disabled=!selected;update();};
            for(const value of ['additional','primary']){const b=button(value==='primary'?'Primary':'Additional',()=>{type=value;primaryButtons=type==='primary'?[apply]:[];for(const child of types.children)child.setAttribute('aria-pressed',String(child===b));explain();});b.setAttribute('aria-pressed',String(type===value));types.append(b);}picker.append(types,note);
            const apply=mutateButton(picker,'Connect',()=>{if(selected)perform({operation:'connect',type,name:selected});});picker.append(close);explain();
            if(!selected){mutationButtons=mutationButtons.filter(b=>b!==apply);apply.disabled=true;}
        }catch(error){if(captured!==origin||!picker.open)return;loadingFor=null;status.textContent=error.message;}
    }
    return {update,identity({parent,key,associations,error}){
        const personas=associations?.personas??[],label=!key?'Save to view persona links':error||!associations?'Persona links unavailable':personas.length>1?`${personas.length} personas · ${personas.map(p=>p.name).join(', ')}`:personas.length?`Linked ${personas[0].name}`:'No linked persona';
        const line=button(label,()=>showPersonas(personas));line.className='character-persona-line';line.title=label;line.setAttribute('aria-label',label);line.disabled=!personas.length;line.setAttribute('aria-haspopup','dialog');parent.append(line);
        // The persona locked to the open chat, which wins over character links.
        const chat=key?chatPersona():null;
        if(chat){const chatLine=node('small',`This chat · ${chat.name}`);chatLine.className='character-chat-persona';chatLine.title=`This chat uses ${chat.name}`;parent.append(chatLine);}
    },lorebooks({parent,key,associations,error}){
        const section=node('section');section.className='character-lorebooks';section.setAttribute('aria-label','Saved character lorebooks');
        if(error){const p=node('p',error);p.setAttribute('role','status');section.append(p);}
        else if(!key)section.append(node('p','Save the character to view its lorebook links.'));
        else if(!associations)section.append(node('p','Lorebook links unavailable. Reopen the character to try again.'));
        else {
            const books=[...(associations.primary?[{...associations.primary,type:'primary'}]:[]),...associations.additional.map((book,index)=>({...book,type:'additional',index}))];
            for(const book of books){const row=node('div');row.className='character-lorebook';const content=node('div');content.append(node('span',book.name),node('small',`${book.type==='primary'?'Primary · included in card export':'Additional'}${book.available?'':' · unavailable'}`));const detach=button('',()=>confirmation('Unattach lorebook',`Unattach “${book.name}” (${book.type}) from ${readState().name}?${book.type==='primary'?' Its embedded card copy is removed. Additional books will not be promoted.':''}`,{operation:'detach',type:book.type,name:book.name,index:book.index}));detach.append(icon('unlink'));detach.setAttribute('aria-label',`Unattach ${book.type} lorebook ${book.name}`);row.append(content,detach);section.append(row);}
            if(!books.length)section.append(node('p','No linked lorebooks'));
            if(associations.primary&&!associations.primary.available)section.append(node('p','The primary book is unavailable; export cannot fetch its current contents.'));
            if(associations.embedded&&!associations.primary)section.append(node('p','An embedded lorebook is saved in this card; no primary book is linked.'));
            const link=button('Connect lorebook',connect);link.className='character-connect-lorebook';section.append(link);
        }
        parent.append(section);
    }};
}
