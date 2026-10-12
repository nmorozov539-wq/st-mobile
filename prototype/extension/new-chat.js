import {assertPersisted,canonical} from './persistence.js?build=0.7.13';
import {assetName,assertUnchanged} from './asset-data.js?build=0.7.13';

const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
const headerFields=value=>{const header={...value.header};delete header.chat_metadata;return header;};
export function assertChatUnchanged(before,current){
    assertPersisted(before,[{...current.header,chat_metadata:current.metadata},...current.messages]);
    if(canonical(headerFields(before))!==canonical(headerFields(current)))fail('CONFLICT','The saved chat header changed. Refresh before starting another chat.');
}
// Mirrors ST 1.19 Author's Note initialization, using the native settings captured
// before loading. Existing values and every other metadata key remain exact.
export function initializedChatSnapshot(before,note={}){
    const metadata=structuredClone(before.metadata);
    const defaults={note_prompt:note.default??'',note_interval:note.defaultInterval??1,note_position:note.defaultPosition??1,note_depth:note.defaultDepth??4,note_role:note.defaultRole??0};
    for(const [key,value] of Object.entries(defaults))metadata[key]=metadata[key]??value;
    return {...before,metadata};
}
export function validateNewChatCard(card){
    assetName(card.name);
    if(!String(card.description??'').trim()||!String(card.first_mes??'').trim())fail('INCOMPLETE_CARD','This character is incomplete. Save a name, description and main greeting before starting a chat.');
}

// ST creates the greeting. Nothing here sends a model request or retries a write.
export async function startNewChat(arg,{read,readCard,activate,createNative,verifyNative,deleteSaved}){
    const {target,before,newChatId,operationId,cardRevision,deleteCurrent}=arg;
    const hasSource=!!target?.chatId;
    if(!target?.characterKey||(hasSource&&(before?.characterKey!==target.characterKey||before?.chatId!==target.chatId||!Array.isArray(before?.messages)||!before?.metadata))||(!hasSource&&(before!=null||deleteCurrent))||typeof deleteCurrent!=='boolean'||typeof operationId!=='string'||!operationId||typeof cardRevision!=='string')fail('INVALID_ARGUMENT','Choose a saved source chat and an explicit deletion choice.');
    assetName(newChatId);
    if(hasSource&&newChatId===target.chatId)fail('INVALID_ARGUMENT','A fresh chat needs a different name.');
    const fresh={characterKey:target.characterKey,chatId:newChatId};
    const guardCard=async()=>{const card=await readCard(target.characterKey);assertUnchanged(card,cardRevision);validateNewChatCard(card);};
    let sourceBefore=before;
    const guardSource=async()=>{const current=await read(target);assertChatUnchanged(sourceBefore,current);return current;};
    await guardCard();if(hasSource)await guardSource();
    try{await read(fresh);fail('NAME_EXISTS','That new chat already exists. Review it before starting another.');}catch(e){if(e.code!=='CHAT_NOT_FOUND')throw e;}
    let started=false;
    try{
        // Loading itself can save native defaults/header data. Keep the durable
        // backup and require review if any acknowledgement is lost from here.
        started=true;
        if(hasSource){
            const initialized=await activate(target);
            if(initialized)sourceBefore=initialized;
            await guardSource();
        }
        await guardCard();
        await createNative(fresh,{id:operationId,source:target,deleteRequested:deleteCurrent});
        let saved=await verifyNative(fresh);
        if(saved.metadata.pocket_tavern?.newChat?.id!==operationId||saved.messages.length!==1||saved.messages[0].is_user||saved.messages[0].is_system||!String(saved.messages[0].mes??'').trim())fail('GREETING_NOT_VERIFIED','The new greeting could not be verified. The old chat has been kept.');
        if(!deleteCurrent)return {snapshot:saved};
        await guardSource();
        // A final native read verifies the replacement immediately before deletion.
        saved=await verifyNative(fresh);
        await guardSource();
        await deleteSaved(target);
        try{await read(target);fail('DELETE_NOT_VERIFIED','The old chat still exists. Inspect saved work before continuing.');}catch(e){if(e.code!=='CHAT_NOT_FOUND')throw e;}
        return {snapshot:saved,deleted:true,undo:{before,after:null}};
    }catch(e){if(started)fail('NEW_CHAT_UNCERTAIN',`${e.message} Review saved chats before another attempt. Nothing will be repeated automatically.`);throw e;}
}
