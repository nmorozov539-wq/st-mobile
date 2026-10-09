// This read uses the requested character, independent of ST's active generation.
export async function readCharacterHistory(characterKey,{characters,post}) {
    const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
    if(!characters.some(c=>c.avatar===characterKey))fail('CHAT_NOT_FOUND','Character no longer exists.');
    const rows=await post('/api/characters/chats',{avatar_url:characterKey});
    if(rows?.error)return [];
    if(!Array.isArray(rows))fail('HISTORY_FAILED','Unexpected conversation history response.');
    return rows.map(row=>({characterKey,chatId:String(row.file_name).replace(/\.jsonl$/,''),preview:String(row.mes??''),updated:row.last_mes,messages:row.chat_items})).sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
}
