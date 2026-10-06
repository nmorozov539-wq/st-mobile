const prefix = 'pocket-tavern.v1.';
export function createLocalState(storage) {
    const read = (key, fallback) => { try { const value = JSON.parse(storage.getItem(prefix + key)); return value ?? fallback; } catch { return fallback; } };
    const write = (key, value) => storage.setItem(prefix + key, JSON.stringify(value));
    const draftKey = target => target?.characterKey && target?.chatId ? JSON.stringify([target.characterKey, target.chatId]) : null;
    return {
        draftKey,
        draft(target) { const drafts = read('drafts', {}); const value = drafts[draftKey(target)]; return typeof value === 'string' ? value : ''; },
        saveDraft(target, text) {
            const key = draftKey(target); if (!key) return;
            const drafts = read('drafts', {});
            if (text) drafts[key] = text; else delete drafts[key];
            write('drafts', drafts);
        },
        moveDraft(from, to) {
            const text = this.draft(from); if (!text) return;
            if (this.draft(to)) throw new Error('The renamed conversation already has a local draft.');
            this.saveDraft(to, text); this.saveDraft(from, '');
        },
        target() { const target = read('target', null); return typeof target?.characterKey === 'string' && typeof target?.chatId === 'string' ? target : null; },
        saveTarget(target) { write('target', { characterKey: target.characterKey, chatId: target.chatId }); },
        pending() { const item = read('pending', null); return item?.version === 1 && typeof item.kind === 'string' && item.target ? item : null; },
        begin(operation) { write('pending', { version: 1, ...operation }); },
        finish() { storage.removeItem(prefix + 'pending'); },
    };
}
export function recoveryDecision(journal, sessionId, operation) {
    if (!journal) return 'ready';
    if (journal.kind !== 'send' || journal.sessionId !== sessionId || !operation) return 'review';
    if (['running', 'stopping', 'verifying'].includes(operation.state)) return 'observe';
    return operation.persistence === 'verified' ? 'settled' : 'review';
}
export function isNearBottom({ scrollHeight, scrollTop, clientHeight }, threshold = 80) {
    return scrollHeight - scrollTop - clientHeight <= threshold;
}
export function submittedUserMessage(journal, snapshot) {
    return !!(journal?.kind === 'send' && journal.argument?.mode === 'send' && Number.isInteger(journal.beforeCount) &&
        journal.target.characterKey === snapshot?.characterKey && journal.target.chatId === snapshot?.chatId &&
        snapshot.messages.slice(journal.beforeCount).some(message => message.is_user && message.mes === journal.argument.text));
}
