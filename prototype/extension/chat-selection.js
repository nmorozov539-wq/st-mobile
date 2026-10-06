// Avoid serializing ST's character editor just to change the current chat.
export async function selectSavedChat(getContext, name, request = fetch) {
    const ctx = getContext();
    const character = ctx.characters[ctx.characterId];
    const response = await request('/api/characters/merge-attributes', { method: 'POST', headers: ctx.getRequestHeaders(),
        body: JSON.stringify({ avatar: character.avatar, chat: name }) });
    if (!response.ok) throw Object.assign(new Error('Could not save the selected conversation. Refresh history before trying again.'), { code: 'CHAT_SELECTION_FAILED' });
    character.chat = name;
    await ctx.reloadCurrentChat();
    await getContext().saveChat();
}
