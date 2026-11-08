// World Info bridge for Pocket. Uses ST's own save/entry helpers and verifies every write by reading the file back.
import {
    world_info, selected_world_info, saveWorldInfo, createWorldInfoEntry, duplicateWorldInfoEntry, deleteWorldInfoEntry,
    getFreeWorldName, deleteWorldInfo, updateWorldInfoList, updateWorldInfoSettings, getWorldInfoSettings, setWIOriginalDataValue,
    deleteWIOriginalDataValue, originalWIDataKeyMap, newWorldInfoEntryTemplate, splitKeywordsAndRegexes, convertCharacterBook, worldInfoCache,
} from '/scripts/world-info.js';
import { saveSettings, saveMetadata } from '/script.js';
import {
    bookRevision, validBookName, validFolderName, folderOf, ENTRY_RULES, checkEntryChanges, applyEntryChanges, nextDisplayIndex,
    summarizeBook, checkActivationChanges, checkImportedBook, ACTIVATION_RULES,
} from './worldinfo-data.js?build=0.8.0';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const clone = value => structuredClone(value);
const ACTIVATION_KEYS = Object.keys(ACTIVATION_RULES);

export function createWorldInfoRuntime(getContext) {
    const post = (url, body = {}) => fetch(url, { method: 'POST', headers: getContext().getRequestHeaders(), body: JSON.stringify(body), cache: 'no-store' });
    async function files() {
        const response = await post('/api/worldinfo/list');
        if (!response.ok) fail('LIST_FAILED', 'Could not read the saved World Info books.');
        return (await response.json()).map(item => ({ name: item.file_id, folder: folderOf(item.extensions) }));
    }
    async function fetchBook(name) {
        const response = await post('/api/worldinfo/get', { name });
        if (!response.ok) fail('NOT_FOUND', 'Could not read that World Info book.');
        const data = await response.json();
        if (!data || typeof data !== 'object' || !data.entries || typeof data.entries !== 'object') fail('NOT_FOUND', 'That World Info book is unreadable.');
        return data;
    }
    async function existing(name) {
        if (typeof name !== 'string' || !name) fail('INVALID_ARGUMENT', 'Choose a World Info book.');
        const list = await files();
        if (!list.some(item => item.name === name)) fail('NOT_FOUND', 'That book no longer exists. Refresh the library.');
        return list;
    }
    async function openBook(name, revision) {
        await existing(name);
        const data = await fetchBook(name);
        if (revision !== undefined && bookRevision(data) !== revision) fail('STALE_BOOK', 'This book changed. Reload it before editing.');
        return data;
    }
    async function writeBook(name, data) {
        const expected = bookRevision(data);
        await saveWorldInfo(name, data, true);
        let saved;
        try { saved = await fetchBook(name); } catch { saved = null; }
        if (!saved || bookRevision(saved) !== expected) {
            worldInfoCache.delete(name);
            fail('SAVE_UNVERIFIED', 'The book could not be verified after saving. Reload it and check the saved entries.');
        }
        return saved;
    }
    async function mapLimit(items, limit, fn) {
        const out = new Array(items.length); let next = 0;
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const index = next++; out[index] = await fn(items[index]); } }));
        return out;
    }
    const activation = () => {
        const all = getWorldInfoSettings();
        return Object.fromEntries(ACTIVATION_KEYS.map(key => [key, all[key]]));
    };
    function sources() {
        const ctx = getContext(), found = {}, add = (book, source) => { if (book) (found[book] ??= []).push(source); };
        for (const name of selected_world_info) add(name, { type: 'global' });
        for (const character of ctx.characters ?? []) add(character.data?.extensions?.world, { type: 'character', name: character.name, role: 'primary' });
        for (const row of world_info.charLore ?? []) {
            const character = (ctx.characters ?? []).find(c => c.avatar?.replace(/\.[^.]+$/, '') === row.name);
            for (const book of row.extraBooks ?? []) add(book, { type: 'character', name: character?.name ?? row.name, role: 'additional' });
        }
        add(ctx.chatMetadata?.world_info, { type: 'chat', name: ctx.chatId ?? '' });
        const power = ctx.powerUserSettings ?? {};
        add(power.persona_description_lorebook, { type: 'persona', name: ctx.name1 ?? '' });
        for (const [avatar, descriptor] of Object.entries(power.persona_descriptions ?? {})) if (descriptor?.lorebook && descriptor.lorebook !== power.persona_description_lorebook) add(descriptor.lorebook, { type: 'persona', name: power.personas?.[avatar] ?? avatar });
        return found;
    }
    async function listAll() {
        const items = await files();
        const counts = await mapLimit(items, 6, async item => {
            try { const rows = Object.values((await fetchBook(item.name)).entries); return { count: rows.length, enabled: rows.filter(entry => !entry?.disable).length }; }
            catch { return { count: 0, enabled: 0, unreadable: true }; }
        });
        return { books: items.map((item, index) => ({ ...item, ...counts[index] })), sources: sources(), activation: activation(), globalBooks: [...selected_world_info] };
    }
    const LIST_FIELDS = ['key', 'keysecondary', 'triggers'];
    function fullEntry(entry) {
        const fields = {};
        for (const field of Object.keys(ENTRY_RULES)) fields[field] = clone(entry[field] ?? newWorldInfoEntryTemplate[field] ?? null);
        for (const field of LIST_FIELDS) fields[field] = Array.isArray(fields[field]) ? fields[field].filter(item => typeof item === 'string') : [];
        for (const field of ['comment', 'content', 'group', 'automationId', 'outletName']) if (typeof fields[field] !== 'string') fields[field] = '';
        fields.delayUntilRecursion = typeof entry.delayUntilRecursion === 'boolean' ? Number(entry.delayUntilRecursion) : (entry.delayUntilRecursion ?? 0);
        const filter = entry.characterFilter && typeof entry.characterFilter === 'object' ? entry.characterFilter : {};
        fields.characterFilterNames = [...(filter.names ?? [])];
        fields.characterFilterExclude = !!filter.isExclude;
        return { uid: entry.uid, fields, tagFilterCount: (filter.tags ?? []).length };
    }
    function syncOriginal(data, uid, touched) {
        const entry = data.entries[uid];
        for (const field of touched) {
            if (field === 'disable') setWIOriginalDataValue(data, uid, 'enabled', !entry.disable);
            else if (field === 'characterFilter') setWIOriginalDataValue(data, uid, 'character_filter', entry.characterFilter);
            else if (Object.hasOwn(originalWIDataKeyMap, field)) setWIOriginalDataValue(data, uid, originalWIDataKeyMap[field], entry[field]);
        }
    }
    async function relocateLinks(oldName, newName, updatePrimaryLinks) {
        const ctx = getContext(), power = ctx.powerUserSettings ?? {};
        const swap = list => list.map(name => name === oldName ? newName : name);
        const selected = swap(selected_world_info);
        if (selected.some((name, i) => name !== selected_world_info[i])) { updateWorldInfoSettings({}, selected); Object.assign(world_info, { globalSelect: [...selected] }); }
        for (const row of world_info.charLore ?? []) if (row.extraBooks?.includes(oldName)) row.extraBooks = [...new Set(swap(row.extraBooks))];
        if (power.persona_description_lorebook === oldName) power.persona_description_lorebook = newName;
        for (const descriptor of Object.values(power.persona_descriptions ?? {})) if (descriptor?.lorebook === oldName) descriptor.lorebook = newName;
        if (ctx.chatMetadata?.world_info === oldName) { ctx.chatMetadata.world_info = newName; await saveMetadata(); }
        let primary = 0;
        if (updatePrimaryLinks) {
            for (const character of ctx.characters ?? []) {
                if (character.data?.extensions?.world !== oldName) continue;
                const response = await post('/api/characters/merge-attributes', { avatar: character.avatar, data: { extensions: { world: newName } } });
                if (!response.ok) fail('LINK_UPDATE_FAILED', `Could not update ${character.name}'s primary lorebook link. The book was renamed; fix that link in the character.`);
                await ctx.getOneCharacter?.(character.avatar);
                primary++;
            }
        }
        await saveSettings();
        return primary;
    }
    async function verifyActivation(clean) {
        await saveSettings();
        const response = await post('/api/settings/get');
        if (!response.ok) fail('SETTINGS_UNVERIFIED', 'Could not verify the saved activation settings.');
        const saved = JSON.parse((await response.json()).settings).world_info_settings ?? {};
        if (Object.entries(clean).some(([key, value]) => saved[key] !== value)) fail('SETTINGS_UNVERIFIED', 'The saved activation settings do not match. Reopen the page before continuing.');
    }
    const bookReply = async (name, data) => ({ name, revision: bookRevision(data), entries: summarizeBook(data) });

    return {
        async run(argument) {
            const { action, name } = argument ?? {};
            switch (action) {
                case 'list': return listAll();
                case 'activation': return { activation: activation() };
                case 'book': { await existing(name); const data = await fetchBook(name); return { ...await bookReply(name, data), folder: folderOf(data.extensions) }; }
                case 'entry': {
                    const data = await openBook(name); const entry = data.entries[argument.uid];
                    if (!entry) fail('ENTRY_NOT_FOUND', 'That entry no longer exists. Reload the book.');
                    return { name, revision: bookRevision(data), ...fullEntry(entry) };
                }
                case 'export': { await existing(name); return { name, data: await fetchBook(name) }; }
                case 'saveEntry': {
                    const data = await openBook(name, argument.revision);
                    const changes = { ...argument.changes };
                    if (typeof argument.keyText === 'string') changes.key = splitKeywordsAndRegexes(argument.keyText);
                    if (typeof argument.keysecondaryText === 'string') changes.keysecondary = splitKeywordsAndRegexes(argument.keysecondaryText);
                    checkEntryChanges(changes);
                    const touched = applyEntryChanges(data, argument.uid, changes);
                    syncOriginal(data, argument.uid, touched);
                    const saved = await writeBook(name, data);
                    return { ...await bookReply(name, saved), ...fullEntry(saved.entries[argument.uid]) };
                }
                case 'addEntry': {
                    const data = await openBook(name, argument.revision);
                    const index = nextDisplayIndex(data);
                    const entry = createWorldInfoEntry(name, data);
                    if (!entry) fail('ENTRY_FAILED', 'ST could not create another entry in this book.');
                    entry.displayIndex = index;
                    if (argument.changes) { const touched = applyEntryChanges(data, entry.uid, argument.changes); syncOriginal(data, entry.uid, touched); }
                    const saved = await writeBook(name, data);
                    return { ...await bookReply(name, saved), uid: entry.uid };
                }
                case 'duplicateEntry': {
                    const data = await openBook(name, argument.revision);
                    const index = nextDisplayIndex(data);
                    const entry = duplicateWorldInfoEntry(data, argument.uid);
                    if (!entry) fail('ENTRY_NOT_FOUND', 'That entry no longer exists. Reload the book.');
                    entry.displayIndex = index;
                    const saved = await writeBook(name, data);
                    return { ...await bookReply(name, saved), uid: entry.uid };
                }
                case 'deleteEntry': {
                    const data = await openBook(name, argument.revision);
                    if (!await deleteWorldInfoEntry(data, argument.uid, { silent: true })) fail('ENTRY_NOT_FOUND', 'That entry no longer exists. Reload the book.');
                    deleteWIOriginalDataValue(data, argument.uid);
                    return bookReply(name, await writeBook(name, data));
                }
                case 'createBook': {
                    const list = await files(); validBookName(name, list.map(item => item.name));
                    const saved = await writeBook(name, { entries: {} });
                    await updateWorldInfoList();
                    return { name, ...await bookReply(name, saved) };
                }
                case 'importBook': {
                    const list = (await files()).map(item => item.name);
                    const book = checkImportedBook(argument.data, convertCharacterBook);
                    let target = typeof name === 'string' && name.trim() ? name.trim() : 'Imported book';
                    target = target.replace(/[\\/<>:"|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').slice(0, 120) || 'Imported book';
                    if (list.some(other => other.toLocaleLowerCase() === target.toLocaleLowerCase())) target = getFreeWorldName(target) ?? fail('NAME_EXISTS', 'Could not find a free name for this book.');
                    validBookName(target, list);
                    const saved = await writeBook(target, book);
                    await updateWorldInfoList();
                    return { name: target, ...await bookReply(target, saved) };
                }
                case 'duplicateBook': {
                    const list = await existing(name); const data = await openBook(name, argument.revision);
                    const copy = getFreeWorldName(name) ?? fail('NAME_EXISTS', 'Could not find a free name for the copy.');
                    validBookName(copy, list.map(item => item.name));
                    const saved = await writeBook(copy, clone(data));
                    await updateWorldInfoList();
                    return { name: copy, ...await bookReply(copy, saved) };
                }
                case 'renameBook': {
                    const list = await existing(name); const data = await openBook(name, argument.revision);
                    validBookName(argument.newName, list.map(item => item.name), { ignore: name });
                    if (argument.newName === name) fail('INVALID_NAME', 'Enter a different name.');
                    const saved = await writeBook(argument.newName, data);
                    const removed = await post('/api/worldinfo/delete', { name });
                    if (!removed.ok) fail('RENAME_INCOMPLETE', 'The renamed copy was saved, but the old book could not be removed. Delete the old book yourself.');
                    worldInfoCache.delete(name);
                    await updateWorldInfoList();
                    const primaryUpdated = await relocateLinks(name, argument.newName, !!argument.updatePrimaryLinks);
                    return { name: argument.newName, primaryUpdated, ...await bookReply(argument.newName, saved) };
                }
                case 'deleteBook': {
                    await existing(name); await openBook(name, argument.revision);
                    await updateWorldInfoList();
                    if (!await deleteWorldInfo(name)) fail('DELETE_FAILED', 'ST could not delete that book.');
                    if ((await files()).some(item => item.name === name)) fail('DELETE_FAILED', 'The book is still saved. Reload the library.');
                    await saveSettings();
                    return { deleted: name };
                }
                case 'setFolder': {
                    if (!Array.isArray(argument.names) || !argument.names.length || argument.names.length > 500) fail('INVALID_ARGUMENT', 'Choose books to move.');
                    const folder = argument.folder === null ? null : validFolderName(argument.folder);
                    const done = [];
                    for (const book of argument.names) {
                        await existing(book);
                        const data = await fetchBook(book);
                        const extensions = data.extensions && typeof data.extensions === 'object' && !Array.isArray(data.extensions) ? data.extensions : {};
                        if (folder === null) delete extensions.folder; else extensions.folder = folder;
                        data.extensions = extensions;
                        try { await writeBook(book, data); done.push(book); }
                        catch (error) { throw Object.assign(error, { message: `${error.message} (${done.length} of ${argument.names.length} books were updated.)` }); }
                    }
                    return { updated: done };
                }
                case 'setGlobal': {
                    await existing(name);
                    const current = [...selected_world_info], next = argument.on ? [...new Set([...current, name])] : current.filter(item => item !== name);
                    updateWorldInfoSettings({}, next);
                    Object.assign(world_info, { globalSelect: [...next] });
                    await saveSettings();
                    const response = await post('/api/settings/get');
                    const saved = JSON.parse((await response.json()).settings).world_info_settings?.world_info?.globalSelect;
                    if (JSON.stringify(saved) !== JSON.stringify(next)) fail('SETTINGS_UNVERIFIED', 'The global selection could not be verified.');
                    return { globalBooks: next };
                }
                case 'configureActivation': {
                    const clean = checkActivationChanges(argument.changes, activation());
                    updateWorldInfoSettings(clean);
                    await verifyActivation(clean);
                    return { activation: activation() };
                }
                default: fail('UNSUPPORTED', 'Unknown World Info operation.');
            }
        },
    };
}
