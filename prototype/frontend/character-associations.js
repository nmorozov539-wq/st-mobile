export function createCharacterAssociations() {
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const sheet=node('dialog');sheet.id='character-persona-info';sheet.className='character-association-sheet';sheet.setAttribute('aria-labelledby','character-persona-heading');
    // Later than the parent editor so Escape and native Back dismiss one layer.
    document.getElementById('asset-editor').after(sheet);
    sheet.addEventListener('cancel',event=>{event.preventDefault();sheet.close();});
    sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const box=sheet.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)sheet.close();});
    function show(personas){
        sheet.replaceChildren();const heading=node('h3',personas.length>1?'Linked personas':'Linked persona');heading.id='character-persona-heading';sheet.append(heading);
        const list=node('ul');for(const persona of personas){const row=node('li',persona.name);row.append(node('small',persona.available?'Linked to this character':`Saved link · persona unavailable (${persona.key})`));list.append(row);}sheet.append(list);
        sheet.append(node('p',personas.length>1?'Several native persona links exist. All are preserved. Manage these links in SillyTavern.':'This is the saved character association. Manage this link in SillyTavern.'));
        const close=node('button','Back');close.type='button';close.onclick=()=>sheet.close();sheet.append(close);sheet.showModal();
    }
    return {identity({parent,key,associations,error}){
        const line=node('button');line.type='button';line.className='character-persona-line';
        const personas=associations?.personas??[];
        const label=!key?'Save to view persona links':error||!associations?'Persona links unavailable':personas.length>1?`${personas.length} persona links`:personas.length?`Linked ${personas[0].name}`:'No linked persona';
        line.textContent=label;line.title=label;line.setAttribute('aria-label',label);line.disabled=!personas.length;line.setAttribute('aria-haspopup','dialog');line.onclick=()=>show(personas);parent.append(line);
    },lorebooks({parent,key,associations,error}){
        const section=node('section');section.className='character-lorebooks';section.setAttribute('aria-label','Saved character lorebooks');
        if(error){const status=node('p',error);status.setAttribute('role','status');section.append(status);}
        else if(!key)section.append(node('p','Save the character to view its lorebook links.'));
        else if(!associations)section.append(node('p','Lorebook links unavailable. Reopen the character to try again.'));
        else {
            const books=[...(associations.primary?[{...associations.primary,type:'Primary'}]:[]),...associations.additional.map(book=>({...book,type:'Additional'}))];
            for(const book of books){const row=node('div');row.className='character-lorebook';row.append(node('span',book.name),node('small',`${book.type}${book.available?'':' · unavailable'}`));section.append(row);}
            if(!books.length)section.append(node('p','No linked lorebooks'));
            if(associations.primary)section.append(node('p',associations.primary.available?'Primary is included in card export. Additional books remain separate.':'The primary book is unavailable; export cannot fetch its current contents. Additional books remain separate.'));
            if(associations.embedded&&!associations.primary)section.append(node('p','An embedded lorebook is saved in this card; no primary book is linked.'));
        }
        parent.append(section);
    }};
}
