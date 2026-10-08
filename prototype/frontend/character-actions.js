export function createCharacterActions({rpc,refresh,readState,onDeleted,action}) {
    const $=id=>document.getElementById(id);let captured=null,waiting=false,uncertain=false,returnScroll=0;
    function update(){
        if($('character-actions').hidden&&!$('character-delete-confirm').open)return;
        const current=readState(),dirty=!current.key||current.dirty;
        for(const format of ['png','json'])$(`character-export-${format}`).disabled=waiting||uncertain||dirty||current.unavailable;
        for(const id of ['character-duplicate','character-delete','character-delete-apply'])$(id).disabled=waiting||uncertain||dirty||current.busy||current.unavailable;
        $('character-actions-note').textContent=dirty?'Save or cancel your draft before using saved-card actions.':current.busy?'Exports use the saved card. Duplicate and Delete are available after the engine finishes.':'These actions use your saved card. Exports and duplicates do not include your chats.';
        $('character-delete-chats').disabled=waiting||uncertain;
    }
    function back(){if($('character-actions').hidden)return false;$('character-actions').hidden=true;$('asset-editor').scrollTop=returnScroll;document.querySelector('.character-actions-trigger')?.setAttribute('aria-expanded','false');return true;}
    $('character-actions-close').onclick=back;
    function open(){if(back()||waiting)return;const value=readState();if(!value.key)return;captured={key:value.key,revision:value.revision};waiting=false;uncertain=false;$('character-actions-target').textContent=value.name;$('character-actions-status').textContent='';returnScroll=$('asset-editor').scrollTop;$('character-actions').hidden=false;$('asset-editor').scrollTop=0;update();document.querySelector('.character-actions-trigger')?.setAttribute('aria-expanded','true');}
    async function perform(kind,extra={}){
        if(waiting||uncertain||!captured)return;
        update();const id=kind==='export'?`character-export-${extra.format}`:kind==='delete'?'character-delete-apply':'character-duplicate';if($(id).disabled)return;
        const origin={...captured};waiting=true;update();const status=kind==='delete'?$('character-delete-status'):$('character-actions-status');status.textContent=kind==='export'?'Exporting saved card…':'Checking ST’s saved result…';
        await action(async()=>{try{
            const result=await rpc('assets',{kind:'characters',action:kind,...origin,...extra},60000);
            if(kind==='export'){
                if(!(result.file instanceof Blob)||!result.file.size)throw Error('The exported file is unavailable.');
                const url=URL.createObjectURL(result.file),link=document.createElement('a');link.href=url;link.download=result.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='Saved-card export ready.';
            }else if(kind==='duplicate'){await refresh();status.textContent='Duplicate saved in the character library. Your current chat stays selected.';}
            else{if(readState().key===origin.key){$('character-delete-confirm').close();$('character-actions').hidden=true;$('asset-editor').close();$('library-panel').close();}onDeleted(origin.key);await refresh();}
        }catch(error){uncertain=kind!=='export';status.textContent=error.message+(uncertain?' Reopen the card and inspect saved work before another action.':'');throw error;}
        finally{waiting=false;update();}});
    }
    for(const format of ['png','json'])$(`character-export-${format}`).onclick=()=>perform('export',{format});
    $('character-duplicate').onclick=()=>perform('duplicate');
    $('character-delete').onclick=()=>{update();if($('character-delete').disabled)return;$('character-delete-target').textContent=`Delete ${readState().name}?`;$('character-delete-key').textContent=`Card file: ${captured.key}`;$('character-delete-chats').checked=false;$('character-delete-status').textContent='';$('character-delete-confirm').showModal();};
    $('character-delete-confirm').addEventListener('cancel',event=>{event.preventDefault();$('character-delete-confirm').close();});
    $('character-delete-cancel').onclick=()=>$('character-delete-confirm').close();
    $('character-delete-apply').onclick=()=>perform('delete',{deleteChats:$('character-delete-chats').checked});
    return {open,update,back};
}
