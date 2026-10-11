import {renderRange} from './journal.js?build=0.7.9';

// History is read without activating ST. A captured editor session owns each read.
export function createCharacterChats({rpc,action,readChat,onChat,readState}) {
    let origin=null,rows=[],loading=false,error='',request=0,switching=false;
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const button=(text,fn)=>{const n=node('button',text);n.type='button';n.onclick=fn;return n;};
    const dialog=node('dialog');dialog.id='character-chat-picker';dialog.setAttribute('aria-labelledby','character-chat-heading');
    const heading=node('div');heading.className='dialog-heading';const title=node('h2','Choose conversation');title.id='character-chat-heading';
    const close=button('Done',()=>dialog.close());close.setAttribute('aria-label','Close conversation selector');heading.append(title,close);
    const status=node('p');status.setAttribute('role','status');const list=node('div');list.className='character-chat-choices';list.tabIndex=0;list.setAttribute('aria-label','Saved conversations · scroll for more');
    dialog.append(heading,status,list);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    const current=()=>origin&&readState().open!==false&&readState().key===origin.key&&readState().editorSession===origin.session;
    async function load(key,session){
        const token=++request;origin={key,session};rows=[];loading=true;error='';switching=false;dialog.close();update();
        try{const result=await rpc('workspace',{action:'history',characterKey:key});if(token!==request||!current())return;rows=result;}
        catch(e){if(token!==request||!current())return;error=e.message;}
        finally{if(token===request&&current()){loading=false;update();}}
    }
    function update(){
        const line=document.querySelector('.character-chat-line');if(!line||!current())return;
        const chat=readChat(),same=chat?.characterKey===origin.key;
        line.hidden=!same||(!loading&&!error&&rows.length<2);
        line.disabled=loading||readState().unavailable;
        line.textContent=loading?'Reading conversations…':error?'Conversations unavailable · retry':(chat?.chatId??'Choose conversation')+'  ⌄';
        line.setAttribute('aria-label',error?'Retry reading conversations':`Choose conversation · ${chat?.chatId??''}`);
        if(dialog.open)for(const b of list.querySelectorAll('button'))b.disabled=switching||readState().unavailable;
    }
    function paint(){
        status.textContent=error||`${rows.length} saved conversations. Switching here keeps your Character draft. Any reply already running continues in its original chat.`;
        const range=renderRange(rows.length,list.scrollTop,list.clientHeight||400,{},72,4);list.replaceChildren();
        const spacer=height=>{const n=node('div');n.style.height=height+'px';n.setAttribute('aria-hidden','true');return n;};
        list.append(spacer(range.before));
        for(const row of rows.slice(range.start,range.end)){
            const b=button(row.chatId,()=>action(async()=>{
                if(switching||!current()||readState().unavailable)return;
                const selected={...origin},version=request;
                const ownsSelection=()=>version===request&&dialog.open&&readState().open!==false&&readState().key===selected.key&&readState().editorSession===selected.session;
                switching=true;paint();
                try{await onChat(row,ownsSelection);if(ownsSelection()){dialog.close();update();}}
                catch(e){if(ownsSelection()){error=e.message;status.textContent=error;}throw e;}
                finally{if(version===request){switching=false;if(dialog.open)paint();}}
            }));
            b.className='character-chat-choice';b.disabled=switching||readState().unavailable;b.setAttribute('aria-pressed',String(readChat()?.characterKey===row.characterKey&&readChat()?.chatId===row.chatId));list.append(b);
        }
        list.append(spacer(range.after));
    }
    let frame;list.onscroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);};
    function render(body,key){if(!key)return;const line=button('',()=>{if(error){load(origin.key,origin.session);return;}list.scrollTop=0;dialog.showModal();paint();});line.className='character-chat-line';line.hidden=true;line.setAttribute('aria-haspopup','dialog');line.setAttribute('aria-controls',dialog.id);body.append(line);update();}
    return {load,render,update,dismiss:()=>dialog.close()};
}
