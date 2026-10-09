export function createNewChatPanel({action,prepare,apply,available}) {
    const $=id=>document.getElementById(id);let token=0,captured=null,owner=()=>true,waiting=false,uncertain=false;
    const dialog=$('new-chat-confirm');
    function update(){
        $('new-chat-apply').disabled=waiting||uncertain||!captured||!available();
        $('new-chat-delete-current').disabled=waiting||uncertain||!captured;
        $('new-chat-apply').textContent=$('new-chat-delete-current').checked?'Start new & delete current':'Start new chat';
        $('new-chat-cancel').textContent=waiting?'Close':'Cancel';
    }
    async function open(card,guard=()=>true){
        if(waiting)return;const session=++token;owner=guard;captured=null;uncertain=false;
        $('new-chat-delete-current').checked=false;$('new-chat-target').textContent=`Start a new chat with ${card.name}?`;
        $('new-chat-current').textContent=`Current chat: “${card.target.chatId}”. The new conversation starts with the saved character’s greeting. No reply is generated.`;
        $('new-chat-status').textContent='Checking the saved chat…';dialog.showModal();waiting=true;update();
        await action(async()=>{try{
            const value=await prepare(card);
            if(token!==session||!dialog.open||!owner())return;
            captured=value;$('new-chat-status').textContent='The current chat is kept unless you choose to delete it. Deletion happens only after the new greeting is saved and verified; Undo will be available.';
        }catch(e){if(token===session&&dialog.open)$('new-chat-status').textContent=e.message;throw e;}
        finally{if(token===session){waiting=false;update();}}});
    }
    $('new-chat-delete-current').onchange=update;
    $('new-chat-cancel').onclick=()=>dialog.close();
    dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
    $('new-chat-apply').onclick=()=>action(async()=>{
        update();if($('new-chat-apply').disabled||!owner())return;
        const session=token,origin=captured,guard=owner;waiting=true;update();$('new-chat-status').textContent='Saving and verifying the new greeting…';
        try{await apply({...origin,deleteCurrent:$('new-chat-delete-current').checked},()=>token===session&&dialog.open&&guard());if(token===session)dialog.close();}
        catch(e){if(token===session){uncertain=e.code==='NEW_CHAT_UNCERTAIN'||['TIMEOUT','DISCONNECTED'].includes(e.code);$('new-chat-status').textContent=e.message;}throw e;}
        finally{if(token===session){waiting=false;update();}}
    });
    return {open,update};
}
