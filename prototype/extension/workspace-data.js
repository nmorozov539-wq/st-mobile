// Pure transforms: preserve unknown ST fields and reject edits against changed history.
export const clone = value => structuredClone(value);
export const revision = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
export function assertRevision(actual, expected) {
    if (typeof expected !== 'string' || revision(actual) !== expected) throw Object.assign(Error('This chat changed. Reload it before applying the edit.'), {code:'CONFLICT'});
}
export function invalidateMemory(snapshot, firstChanged) {
    const memory = snapshot.metadata?.summaryception;
    if (!memory || firstChanged > (memory.summarizedUpTo ?? -1)) return snapshot;
    snapshot.metadata.stm ??= {};
    snapshot.metadata.stm.memoryInvalid = {reason:'Memory needs rebuilding after history changes',at:new Date().toISOString()};
    for (const message of snapshot.messages) if (message.extra?.sc_ghosted) {
        delete message.extra.sc_ghosted;
        for(const info of message.swipe_info??[])if(info.extra?.sc_ghosted)delete info.extra.sc_ghosted;
        // Summaryception marks its own normal messages before calling ST /hide.
        // Explicit user-hidden messages retain their own flag.
        if (!message.is_hidden) message.is_system = false;
    }
    return snapshot;
}
export function alterHistory(before, change) {
    const value=clone(before);
    const id=change.messageId;
    if (change.action==='deleteMessages') {
        const ids=[...new Set(change.ids??[])].sort((a,b)=>a-b);
        if(!ids.length || ids.some(i=>!Number.isInteger(i)||i<0||i>=value.messages.length))throw Error('Choose existing messages.');
        invalidateMemory(value,ids[0]); value.messages=value.messages.filter((_,i)=>!ids.includes(i));
    } else if (change.action==='fork') {
        if(!Number.isInteger(id)||id<0||id>=value.messages.length)throw Error('Choose an existing message.');
        value.messages=value.messages.slice(0,id+1); invalidateMemory(value,id+1);
        value.metadata.integrity=change.integrity; value.metadata.main_chat=before.chatId;
    } else if (change.action==='edit') {
        if(!value.messages[id]||typeof change.text!=='string')throw Error('Choose an existing message.');
        if(value.messages[id].mes!==change.text)invalidateMemory(value,id); value.messages[id].mes=change.text;
        const m=value.messages[id];if(m.swipes?.length)m.swipes[m.swipe_id??0]=change.text;
    } else if(change.action==='swipe') {
        const m=value.messages[id];if(!m || !Number.isInteger(change.swipeId)||!m.swipes?.[change.swipeId])throw Error('Choose an existing alternative.');
        if(m.mes!==m.swipes[change.swipeId])invalidateMemory(value,id);m.swipe_id=change.swipeId;m.mes=m.swipes[change.swipeId];
        const info=m.swipe_info?.[change.swipeId];if(info){m.extra=clone(info.extra??{});m.send_date=info.send_date??m.send_date;m.gen_started=info.gen_started;m.gen_finished=info.gen_finished;}
        if(value.metadata.stm?.memoryInvalid && m.extra?.sc_ghosted){delete m.extra.sc_ghosted;if(!m.is_hidden)m.is_system=false;}
    } else throw Error('Unknown history operation.');
    value.metadata.tainted=true;return value;
}
export function effectiveScope(global,character,chat) {
    const preset=chat?.enabled&&chat.copy?{scope:'chat',copy:clone(chat.copy)}:
        character?.enabled&&character.copy?{scope:'character',copy:clone(character.copy)}:{scope:'global',copy:clone(global)};
    const model=effectiveModel(global,character,chat);
    preset.copy.model=model.value;
    return {...preset,modelScope:model.scope};
}
// Additive v2 migration: freeze the legacy model choice independently of the
// preset enabled flag. Disabled copies and all foreign fields remain intact.
export function withModelSelection(record) {
    if(!record)return record;
    const value=clone(record);
    value.modelSelection??={enabled:!!value.enabled&&!!value.copy?.model,value:value.copy?.model??null};
    return value;
}
export function effectiveModel(global,character,chat) {
    for(const [scope,record] of [['chat',chat],['character',character]]) {
        const selection=withModelSelection(record)?.modelSelection;
        if(selection?.enabled&&selection.value)return {scope,value:selection.value};
    }
    return {scope:'global',value:global.model};
}
export function settingsGuard(value) {
    const guard=typeof value==='string'?JSON.parse(value):clone(value);
    if(guard.char)guard.char=withModelSelection(guard.char);
    if(guard.chat)guard.chat=withModelSelection(guard.chat);
    return revision(guard);
}
export function switchScope(record,enabled,current) {
    const retained=withModelSelection(record)??{modelSelection:{enabled:false,value:current.model??null}};
    return { ...retained,enabled,copy:clone(record?.copy??current)};
}
// Deleting the chat ST has open: move ST to another saved chat, or close it when it
// was the character's only chat. Never create a replacement chat.
export function deletePlan({active,target,others}){
    if(active?.characterKey!==target.characterKey||active?.chatId!==target.chatId)return {};
    return others.length?{select:others[0]}:{close:true};
}
