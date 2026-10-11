// Validation and lossless data projection shared by the mobile library and tests.
export function safeObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected a JSON object.');
    const visit = item => {
        if (!item || typeof item !== 'object') return;
        for (const [key, child] of Object.entries(item)) {
            if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('Unsupported JSON property.');
            visit(child);
        }
    };
    visit(value); return structuredClone(value);
}
export function assetName(value) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 120 || /[\\/<>:"|?*\x00-\x1f]/.test(value) || /[. ]$/.test(value)) throw Error('Use a name without filename punctuation or trailing spaces/dots.');
    return value;
}
export function characterUpdate(key, draft) {
    const data = safeObject(draft); assetName(data.name);
    const update = { avatar:key, data };
    for (const field of ['name','description','personality','scenario','first_mes','mes_example']) update[field] = data[field] ?? '';
    return update;
}
export function assertUnchanged(current, revision) {
    if (JSON.stringify(current) !== revision) throw Object.assign(Error('This item changed. Reopen it before saving.'), {code:'STALE_ASSET'});
}
export function personaRecord(power, key) {
    return {name:power.personas?.[key] ?? '', descriptor:structuredClone(power.persona_descriptions?.[key] ?? {})};
}

export function containsData(actual, expected) {
    if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&expected.every((v,i)=>containsData(actual[i],v));
    if(expected&&typeof expected==='object')return !!actual&&Object.entries(expected).every(([k,v])=>Object.hasOwn(actual,k)&&containsData(actual[k],v));
    return Object.is(actual,expected);
}
export function validatePreset(value) {
    const data=safeObject(value);
    if(data.prompts!==undefined && (!Array.isArray(data.prompts)||data.prompts.some(p=>!p||typeof p.identifier!=='string'||(p.content!==undefined&&typeof p.content!=='string'))))throw Error('Preset prompts must be an array of identified prompt blocks.');
    if(data.prompt_order!==undefined && (!Array.isArray(data.prompt_order)||data.prompt_order.some(g=>!Array.isArray(g.order)||g.order.some(p=>!p||typeof p.identifier!=='string'||typeof p.enabled!=='boolean'))))throw Error('Preset prompt order must contain identified on/off toggles.');
    if(!data.prompts && !Object.keys(data).some(k=>['temperature','openai_max_tokens','chat_completion_source'].includes(k)))throw Error('This does not look like an ST chat-completion preset.');
    return data;
}

// Native welcome messages are UI scaffolding; temporary conversations are data.
export function canCloseEmptyCharacterView(ctx,{welcomeMessageType,composerText='',operation='deleting a character'}={}) {
    if(ctx.characterId!==undefined||ctx.groupId)return false;
    const changed=ctx.chatMetadata?.tainted||composerText.trim()||ctx.chat.some(message=>message.is_user||!message.is_system&&!(welcomeMessageType&&message.extra?.type===welcomeMessageType));
    if(changed)throw Error(`ST has an unsaved temporary conversation. Save or close it in the native interface before ${operation}.`);
    return true;
}
