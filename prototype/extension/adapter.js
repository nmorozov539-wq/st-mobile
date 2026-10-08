// ST behavior lives in the runtime bindings; this module owns operation tracking.
export function createAdapter({ getContext, isBusy, supportedVersion, runtimeVersion, generation, configuration, assets, extensions }) {
    let ready = false;
    let selecting = false;
    let disposed = false;
    let active = null;
    const operations = new Map();
    const listeners = new Set();
    const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
    const clone = value => structuredClone(value);
    const emit = event => {
        for (const listener of listeners) {
            try { listener(clone(event)); } catch { /* Consumers cannot break ST execution. */ }
        }
    };
    const context = () => {
        if (disposed) fail('DISPOSED', 'Adapter has been disposed.');
        if (!ready) fail('NOT_READY', 'Wait for SillyTavern to finish loading.');
        if (runtimeVersion !== supportedVersion) fail('VERSION_MISMATCH', `Expected ST ${supportedVersion}; found ${runtimeVersion}.`);
        return getContext();
    };
    const snapshot = () => {
        const ctx = context();
        return clone({ characterKey: ctx.characters[ctx.characterId]?.avatar ?? null,
            groupId: ctx.groupId ?? null, chatId: ctx.chatId ?? null,
            messages: ctx.chat, metadata: ctx.chatMetadata,
            presentation: { personaName: ctx.name1 || "You", preset: ctx.chatCompletionSettings?.preset_settings_openai || "None" } });
    };
    const api = {
        markReady() { ready = true; },
        dispose() { disposed = true; listeners.clear(); },
        subscribe(listener) {
            context();
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        handshake() {
            context();
            return { protocolVersion: 1, supportedSTVersion: supportedVersion, runtimeVersion,
                capabilities: ['characters.list', 'characters.select', 'chat.snapshot', 'chats.list', 'chats.open', 'chats.create', 'chats.rename', 'chats.delete', 'runtime.activity', ...(configuration ? ['settings.read', 'settings.change'] : []), ...(assets?['library.read','library.write','library.import']:[]), ...(extensions?.size?['extensions.read','extensions.control']:[]),
                    ...(generation ? ['generation.send', 'generation.stop', 'generation.status', 'message.edit', 'swipes.select', 'swipes.generate'] : [])] };
        },
        listCharacters() {
            return context().characters.map(character => ({ key: character.avatar, name: character.name }));
        },
        snapshot,
        async selectCharacter(key) {
            const ctx = context();
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current generation or save before switching.');
            if (typeof key !== 'string' || !key) fail('INVALID_ARGUMENT', 'A character key is required.');
            const index = ctx.characters.findIndex(character => character.avatar === key);
            if (index < 0) fail('NOT_FOUND', 'Character is no longer available. Refresh the list.');
            selecting = true;
            try {
                await ctx.selectCharacterById(index, { switchMenu: false });
                const after = context();
                if (after.groupId || after.characters[after.characterId]?.avatar !== key) {
                    fail('SELECTION_FAILED', 'ST did not switch to the requested character.');
                }
                return snapshot();
            } finally { selecting = false; }
        },
        async reconcile() {
            const current = snapshot();
            if (selecting || active || isBusy()) fail('BUSY', 'Wait for the engine to finish before verifying saved changes.');
            if (!current.characterKey || current.groupId) fail('NO_CHAT', 'Choose a single-character conversation first.');
            await generation.verifyPersistence(current);
            return current;
        },
        async reloadSaved() {
            const before = snapshot();
            if (selecting || active || isBusy()) fail('BUSY', 'Wait for the engine to finish before reloading saved changes.');
            if (!before.characterKey || before.groupId) fail('NO_CHAT', 'Choose a single-character conversation first.');
            selecting = true;
            try {
                await generation.reloadSavedChat();
                const after = snapshot();
                if (after.characterKey !== before.characterKey || after.chatId !== before.chatId) fail('STALE_TARGET', 'The conversation changed while reloading.');
                await generation.verifyPersistence(after);
                return after;
            } finally { selecting = false; }
        },
        settings() { context(); if (!configuration) fail('UNSUPPORTED', 'Settings are unavailable.'); return clone(configuration.read()); },
        async configure(argument) {
            context();
            if (!configuration) fail('UNSUPPORTED', 'Settings are unavailable.');
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current operation before changing settings.');
            if (!argument || argument.revision !== configuration.read().revision) fail('STALE_SETTINGS', 'Settings changed. Reopen the settings panel first.');
            selecting = true;
            try { return clone(await configuration.change(argument)); }
            finally { selecting = false; }
        },
        async extensions(argument) {
            context();
            const extension=extensions?.get(argument?.id);
            if(!extension)fail('UNSUPPORTED','This extension has no Pocket integration installed.');
            if(['read','stop','choice'].includes(argument.action))return clone(await extension.run(argument));
            if(selecting||active||isBusy())fail('BUSY','Finish the current engine operation first.');
            selecting=true;
            try{return clone(await extension.run(argument));}finally{selecting=false;}
        },
        async assets(argument) {
            context();
            if (!assets) fail('UNSUPPORTED', 'Library editing is unavailable.');
            if (['read','list','export'].includes(argument?.action)) return clone(await assets.run(argument));
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current operation first.');
            selecting = true;
            try { return clone(await assets.run(argument)); } finally { selecting = false; }
        },
        activity({ignoreExternal=false} = {}) { context(); return { busy: !!(selecting || active || (!ignoreExternal && isBusy())), operation: active ? clone(active.status) : null }; },
        async listChats() {
            const before = snapshot();
            if (before.groupId || !before.characterKey) fail('NO_CHAT', 'Choose a character first.');
            return generation.listChats(before.characterKey);
        },
        async manageChat({ action, characterKey, chatId, name }) {
            const before = snapshot();
            if (!generation) fail('UNSUPPORTED', 'Chat management is unavailable.');
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current operation first.');
            if (before.groupId || !before.characterKey || before.characterKey !== characterKey || before.chatId !== chatId) fail('STALE_TARGET', 'The selected conversation changed. Refresh first.');
            if (!['open', 'create', 'rename', 'delete'].includes(action) || typeof name !== 'string' || !name.trim() || name !== name.trim() || name.length > 120 || /[\\/<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name)) fail('INVALID_NAME', 'Use a chat name without slashes, special filename characters, or trailing dots.');
            selecting = true;
            try {
                await generation.verifyPersistence(before);
                const chats = await generation.listChats(characterKey);
                const exists = chats.some(chat => chat.id === name);
                if (action === 'delete') {
                    if (name !== chatId || !exists) fail('CHAT_NOT_FOUND', 'Only the current saved conversation can be deleted.');
                    await generation.deleteChat(name);
                    const after = snapshot(), saved = await generation.listChats(characterKey);
                    if (saved.some(chat => chat.id === name) || after.chatId === name || after.characterKey !== characterKey || after.groupId) fail('DELETE_FAILED', 'Cannot verify the deleted conversation and its replacement.');
                    await generation.verifyPersistence(after);
                    return after;
                }
                if (action === 'open' && !exists) fail('CHAT_NOT_FOUND', 'That conversation no longer exists. Refresh the history.');
                if (action !== 'open' && chats.some(chat => chat.id.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('NAME_EXISTS', 'A conversation with that name already exists.');
                if (action === 'rename') await generation.renameChat(chatId, name);
                else await generation.openChat(name);
                const after = snapshot();
                if (after.characterKey !== characterKey || after.chatId !== name || after.groupId) fail('CHAT_CHANGE_FAILED', 'ST did not open the requested conversation.');
                await generation.verifyPersistence(after);
                const saved = await generation.listChats(characterKey);
                if (!saved.some(chat => chat.id === name) || (action === 'rename' && saved.some(chat => chat.id === chatId))) fail('CHAT_CHANGE_FAILED', 'Cannot verify the conversation change in saved history.');
                return after;
            } finally { selecting = false; }
        },
        async changeMessage({ characterKey, chatId, messageId, expectedMessage, text, swipeId }) {
            const before = snapshot();
            if (!generation) fail('UNSUPPORTED', 'Message runtime is not installed.');
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current operation first.');
            if (before.groupId || before.characterKey !== characterKey || before.chatId !== chatId) fail('STALE_TARGET', 'Refresh the selected chat first.');
            if (!Number.isInteger(messageId) || !before.messages[messageId] || JSON.stringify(before.messages[messageId]) !== expectedMessage) fail('STALE_MESSAGE', 'The message changed. Refresh before editing.');
            selecting = true;
            try {
                if (swipeId !== undefined) {
                    if (messageId !== before.messages.length - 1 || before.messages[messageId].is_user || !Number.isInteger(swipeId) || swipeId < 0 || swipeId >= (before.messages[messageId].swipes?.length ?? 0)) fail('INVALID_SWIPE', 'Choose an existing alternative on the last assistant reply.');
                    await generation.selectSwipe(swipeId);
                } else {
                    if (typeof text !== 'string' || !text.trim()) fail('INVALID_ARGUMENT', 'Message text cannot be empty.');
                    await generation.edit(messageId, text);
                }
                const after = snapshot();
                if (after.characterKey !== characterKey || after.chatId !== chatId || after.messages.length !== before.messages.length) fail('TARGET_CHANGED', 'The chat changed during the update.');
                if (swipeId !== undefined ? after.messages[messageId].swipe_id !== swipeId : after.messages[messageId].mes !== text) fail('UPDATE_FAILED', 'ST did not apply the requested message update.');
                await generation.verifyPersistence(after);
                return after;
            } finally { selecting = false; }
        },
        operationStatus(requestId) {
            context();
            const operation = operations.get(requestId);
            if (!operation) fail('UNKNOWN_OPERATION', 'Unknown request ID in this runtime session. Do not automatically resend after a restart.');
            return clone(operation.status);
        },
        async sendMessage({ requestId, text, characterKey, chatId, mode = "send", expectedMessage }) {
            context();
            if (!generation) fail('UNSUPPORTED', 'Generation runtime is not installed.');
            if (typeof requestId !== 'string' || !requestId || requestId.length > 128 ||
                typeof text !== 'string' || (mode === 'send' && !text.trim()) || !['send', 'swipe'].includes(mode)) fail('INVALID_ARGUMENT', 'A request ID and nonempty message are required.');
            const signature = JSON.stringify([text, characterKey, chatId, mode, expectedMessage]);
            const existing = operations.get(requestId);
            if (existing) {
                if (existing.signature !== signature) fail('REQUEST_CONFLICT', 'This request ID was already used with different arguments.');
                await existing.promise;
                return clone(existing.status);
            }
            if (selecting || active || isBusy()) fail('BUSY', 'Finish the current operation first.');
            const before = snapshot();
            if (before.groupId || !before.characterKey || !before.chatId) fail('NO_CHAT', 'Select a single-character chat first.');
            if (before.characterKey !== characterKey || before.chatId !== chatId) fail('STALE_TARGET', 'The selected chat changed. Read it again before sending.');
            generation.validate(text);
            if (mode === 'swipe' && JSON.stringify(before.messages.at(-1)) !== expectedMessage) fail('STALE_MESSAGE', 'The reply changed. Refresh before generating an alternative.');
            // Bound memory without discarding deduplication records during a session.
            if (operations.size >= 100) fail('SESSION_LIMIT', 'Prototype session limit reached. Reload and read the saved chat before sending a new request.');
            const operation = { signature, status: { requestId, state: 'running', persistence: 'unverified', text: '', reasoning: '' }, promise: null };
            active = operation;
            operations.set(requestId, operation);
            operation.promise = (async () => {
                let submissionError;
                let unsubscribe = () => {};
                try {
                    unsubscribe = generation.subscribeText((text, reasoning = '') => {
                        operation.status.text = String(text);
                        operation.status.reasoning = String(reasoning);
                        emit({ type: 'text.replace', ...operation.status });
                    });
                    // submit must use ST's composer path, not append a second user message.
                    try { await (mode === 'swipe' ? generation.generateSwipe() : generation.submit(text)); } catch (error) { submissionError = error; }
                    const cancelled = operation.status.state === 'stopping';
                    operation.status.state = 'verifying';
                    emit({ type: 'operation.verifying', ...operation.status });
                    if (isBusy({owner:'generation'})) fail('RUNTIME_BUSY', 'ST is still busy after submission. Completion is unverified.');
                    const after = snapshot();
                    if (after.characterKey !== characterKey || after.chatId !== chatId || after.groupId) {
                        fail('TARGET_CHANGED', 'The active chat changed during generation.');
                    }
                    const added = after.messages.slice(before.messages.length);
                    const userMessages = added.filter(message => message.is_user);
                    const answers = (mode === 'swipe' ? after.messages.slice(-1) : added).filter(message => !message.is_user && !message.is_system && message.mes?.trim());
                    if (mode === 'send' && userMessages.length !== 1) fail('SUBMISSION_FAILED', 'ST did not append exactly one user message.');
                    if (mode === 'swipe' && !cancelled && !submissionError) {
                        const oldReply = before.messages.at(-1), newReply = after.messages.at(-1);
                        const oldSwipes = oldReply.swipes ?? [oldReply.mes];
                        if (after.messages.length !== before.messages.length || newReply.swipes?.length !== oldSwipes.length + 1 || oldSwipes.some((value, index) => newReply.swipes[index] !== value)) fail('SWIPE_FAILED', 'ST did not preserve the old alternatives and add exactly one reply.');
                    }
                    operation.status.text = answers.at(-1)?.mes ?? operation.status.text;
                    operation.status.reasoning = answers.at(-1)?.extra?.reasoning ?? operation.status.reasoning;
                    operation.status.snapshot = after;
                    // Readback runs even after provider failure, so saved user/partial messages are reported honestly.
                    await generation.verifyPersistence(after);
                    operation.status.persistence = 'verified';
                    if (submissionError && !cancelled) throw submissionError;
                    if (!answers.length && !cancelled) fail('NO_REPLY', 'ST did not produce an assistant reply.');
                    operation.status.state = cancelled ? 'cancelled' : 'completed';
                } catch (error) {
                    operation.status.state = 'failed';
                    operation.status.error = { code: error.code ?? 'GENERATION_FAILED', message: error.message ?? String(error) };
                } finally {
                    unsubscribe();
                    active = null;
                    emit({ type: 'operation.finished', ...operation.status });
                }
            })();
            emit({ type: 'operation.started', ...operation.status });
            await operation.promise;
            return clone(operation.status);
        },
        stopGeneration(requestId) {
            context();
            if (!active || active.status.requestId !== requestId) fail('NOT_ACTIVE', 'This request is no longer generating.');
            if (active.status.state === 'stopping') return clone(active.status);
            if (active.status.state !== 'running') fail('NOT_ACTIVE', 'Generation has ended; the saved result is being verified.');
            if (!generation.stop()) fail('NOT_STOPPABLE', 'ST has not started a cancellable generation yet. Try again when text starts arriving.');
            active.status.state = 'stopping';
            emit({ type: 'operation.stopping', ...active.status });
            return clone(active.status);
        },
    };
    return api;
}
