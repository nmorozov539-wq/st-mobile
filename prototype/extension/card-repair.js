// Pocket 0.7.14 and earlier opened ST with a query string. jQuery UI then loaded a second copy of ST's page
// into the Backgrounds tab, so every character save posted the advanced fields twice and ST stored them as
// two-item lists. The first item is the value from the real form; this puts it back as plain text.
const TOP = ['personality', 'scenario', 'mes_example', 'creatorcomment', 'talkativeness'];
const DATA = ['personality', 'scenario', 'mes_example', 'creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version'];
const text = value => Array.isArray(value) ? text(value[0]) : String(value ?? '');
// Real tag lists hold names; a doubled form field leaves an empty string beside the joined tags.
const doubledTags = value => Array.isArray(value) && value.length > 1 && value.every(tag => typeof tag === 'string') && value.includes('');
const tags = value => text(value).split(',').map(tag => tag.trim()).filter(Boolean);

export function cardRepair(card) {
    const update = {}, data = {}, extensions = {};
    for (const key of TOP) if (Array.isArray(card[key])) update[key] = text(card[key]);
    if (doubledTags(card.tags)) update.tags = tags(card.tags);
    for (const key of DATA) if (Array.isArray(card.data?.[key])) data[key] = text(card.data[key]);
    if (doubledTags(card.data?.tags)) data.tags = tags(card.data.tags);
    if (Array.isArray(card.data?.extensions?.talkativeness)) extensions.talkativeness = text(card.data.extensions.talkativeness);
    const depth = card.data?.extensions?.depth_prompt;
    const depthFix = {};
    for (const key of ['prompt', 'role']) if (Array.isArray(depth?.[key])) depthFix[key] = text(depth[key]);
    if (Object.keys(depthFix).length) extensions.depth_prompt = depthFix;
    if (Object.keys(extensions).length) data.extensions = extensions;
    if (Object.keys(data).length) update.data = data;
    return Object.keys(update).length ? update : null;
}

export async function repairDoubledCards(getContext) {
    // Kept outside pocket_tavern, whose namespace the workspace creates and versions itself.
    const ctx = getContext(), settings = ctx.extensionSettings.pocket_tavern_repairs ??= {};
    if (settings.doubledCardFields >= 1) return [];
    const post = async (url, body) => {
        const response = await fetch(url, { method: 'POST', headers: ctx.getRequestHeaders(), body: JSON.stringify(body) });
        if (!response.ok) throw Error(`${url} failed`);
        return response.json().catch(() => ({}));
    };
    const repaired = [];
    for (const avatar of ctx.characters.map(character => character.avatar).filter(Boolean)) {
        const update = cardRepair(await post('/api/characters/get', { avatar_url: avatar }));
        if (!update) continue;
        await post('/api/characters/merge-attributes', { avatar, ...update });
        if (cardRepair(await post('/api/characters/get', { avatar_url: avatar }))) throw Error(`Card repair for ${avatar} could not be verified.`);
        repaired.push(avatar);
    }
    if (repaired.length) await ctx.getCharacters();
    settings.doubledCardFields = 1;
    ctx.saveSettingsDebounced();
    return repaired;
}
