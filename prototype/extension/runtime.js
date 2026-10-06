import { sendTextareaMessage, swipe, syncMesToSwipe } from '/script.js';
import { hasPendingFileAttachment } from '/scripts/chats.js';
import { isExecutingCommandsFromChatInput } from '/scripts/slash-commands.js';
import { SWIPE_STATE, SWIPE_DIRECTION } from '/scripts/constants.js';
import { assertPersisted } from './persistence.js';
import { selectSavedChat } from './chat-selection.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
export function createGenerationRuntime(getContext) {
    const loadChat = name => selectSavedChat(getContext, name);
    const composer = () => {
        const element = document.querySelector('#send_textarea');
        if (!element) fail('NO_COMPOSER', 'ST composer is not available.');
        return element;
    };
    return {
        async health() {
            const ctx = getContext();
            let response;
            try { response = await fetch('/api/ping', { method: 'POST', headers: ctx.getRequestHeaders(), signal: AbortSignal.timeout(4000) }); }
            catch { fail('ENGINE_UNAVAILABLE', 'Cannot reach the local engine. Start or restart SillyTavern, then reconnect. Your request will not be resent.'); }
            if (!response.ok) fail('ENGINE_UNAVAILABLE', 'The engine session expired or restarted. Reconnect to read your saved chat.');
            return { onlineStatus: ctx.onlineStatus };
        },
        async listChats(characterKey) {
            const ctx = getContext();
            const response = await fetch('/api/characters/chats', { method: 'POST', headers: ctx.getRequestHeaders(),
                body: JSON.stringify({ avatar_url: characterKey }) });
            if (!response.ok) fail('HISTORY_FAILED', 'Could not read conversation history.');
            const rows = await response.json();
            if (rows?.error) return [];
            if (!Array.isArray(rows)) fail('HISTORY_FAILED', 'Unexpected conversation history response.');
            return rows.map(row => ({ id: row.file_name.replace(/\.jsonl$/, ''), preview: String(row.mes ?? ''),
                messages: row.chat_items ?? 0, updated: row.last_mes ?? null })).sort((a,b) => String(b.updated).localeCompare(String(a.updated)));
        },
        async openChat(name) {
            const ctx = getContext();
            await ctx.saveChat();
            await loadChat(name);
        },
        async reloadSavedChat() { await getContext().reloadCurrentChat(); },
        async renameChat(oldName, newName) {
            const ctx = getContext();
            await ctx.saveChat();
            const response = await fetch('/api/chats/rename', { method: 'POST', headers: ctx.getRequestHeaders(),
                body: JSON.stringify({ avatar_url: ctx.characters[ctx.characterId].avatar, is_group: false,
                    original_file: oldName + '.jsonl', renamed_file: newName + '.jsonl' }) });
            const result = await response.json();
            if (!response.ok || result.error || result.sanitizedFileName !== newName) fail('RENAME_FAILED', 'The conversation could not be renamed. Refresh history before trying again.');
            await loadChat(newName);
        },
        validate(text) {
            const ctx = getContext();
            if (ctx.onlineStatus === 'no_connection') fail('NO_CONNECTION', 'Connect ST to the local mock model first.');
            if (text.trimStart().startsWith('/')) fail('UNSUPPORTED_COMMAND', 'This experiment accepts ordinary text; slash commands come later.');
            if (composer().value.trim()) fail('COMPOSER_BUSY', 'ST already has a draft. Clear it or send it from ST before using the experiment.');
            if (hasPendingFileAttachment()) fail('ATTACHMENT_PENDING', 'Remove ST’s pending attachment before using this text-only experiment.');
            if (isExecutingCommandsFromChatInput || ctx.swipe.state() !== SWIPE_STATE.NONE) fail('BUSY', 'Finish the current command or swipe edit first.');
            if (ctx.powerUserSettings.auto_continue.enabled || ctx.powerUserSettings.auto_swipe) fail('AUTOMATIC_GENERATION', 'Disable auto-continue and auto-swipe for this single-reply experiment.');
            if (ctx.chatCompletionSettings.function_calling) fail('TOOLS_ENABLED', 'Disable tool calling for this text-only experiment.');
        },
        async edit(messageId, text) {
            const ctx = getContext();
            if (ctx.swipe.state() !== SWIPE_STATE.NONE) fail('BUSY', 'Finish the engine swipe or edit first.');
            ctx.chat[messageId].mes = text;
            ctx.chatMetadata.tainted = true;
            syncMesToSwipe(messageId);
            await ctx.eventSource.emit(ctx.eventTypes.MESSAGE_EDITED, messageId);
            ctx.updateMessageBlock(messageId, ctx.chat[messageId]);
            await ctx.eventSource.emit(ctx.eventTypes.MESSAGE_UPDATED, messageId);
            await ctx.saveChat();
        },
        async selectSwipe(swipeId) {
            await swipe(null, SWIPE_DIRECTION.RIGHT, { forceSwipeId: swipeId, forceDuration: 0 });
            await getContext().saveChat();
        },
        async generateSwipe() {
            const ctx = getContext();
            const message = ctx.chat.at(-1);
            if (!message || message.is_user || message.is_system || ctx.chat.length < 2) fail('INVALID_SWIPE', 'Send a message before generating an alternative.');
            await swipe(null, SWIPE_DIRECTION.RIGHT, { forceSwipeId: message.swipes?.length ?? 1, forceDuration: 0 });
            await getContext().saveChat();
        },
        async submit(text) {
            const element = composer();
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            try { await sendTextareaMessage(); }
            finally {
                // Clear only our untouched draft; do not delete edits made elsewhere.
                if (element.value === text) {
                    element.value = '';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        },
        subscribeText(listener) {
            const ctx = getContext();
            ctx.eventSource.on(ctx.eventTypes.STREAM_TOKEN_RECEIVED, listener);
            return () => ctx.eventSource.removeListener(ctx.eventTypes.STREAM_TOKEN_RECEIVED, listener);
        },
        stop() { return getContext().stopGeneration(); },
        async verifyPersistence(snapshot) {
            const ctx = getContext();
            const response = await fetch('/api/chats/get', { method: 'POST', headers: ctx.getRequestHeaders(),
                body: JSON.stringify({ avatar_url: snapshot.characterKey, file_name: snapshot.chatId }) });
            if (response.status === 403) fail('ENGINE_UNAVAILABLE', 'The engine session expired. Reload the engine page before checking saved changes.');
            if (!response.ok) fail('PERSISTENCE_READ_FAILED', `Cannot verify saved chat (HTTP ${response.status}).`);
            assertPersisted(snapshot, await response.json());
        },
    };
}
