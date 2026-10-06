import { hasActiveSecret } from './configuration-state.js';
import { selectPersonaWithoutCardEdit } from './persona-selection.js';
import { saveSettings } from '/script.js';
import { getPresetManager } from '/scripts/preset-manager.js';
import { model_list, getChatCompletionModel, getPresetApplicationPromise } from '/scripts/openai.js';
import { user_avatar, setUserAvatar } from '/scripts/personas.js';
import { world_info, world_names, selected_world_info, updateWorldInfoSettings } from '/scripts/world-info.js';
import { secret_state, writeSecret, SECRET_KEYS } from '/scripts/secrets.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
export function createConfigurationRuntime(getContext) {
    function changeSelect(selector, value) { const element=document.querySelector(selector); element.value=value; element.dispatchEvent(new Event('change', {bubbles:true})); }
    function read() {
        const ctx = getContext(), settings = ctx.chatCompletionSettings;
        const manager = getPresetManager('openai');
        const presets = manager ? Object.keys(manager.getPresetList().preset_names) : [];
        const selected = { mainApi: ctx.mainApi, source: settings.chat_completion_source,
            model: getChatCompletionModel() ?? '', preset: settings.preset_settings_openai,
            persona: user_avatar, lorebooks: [...selected_world_info], thinking: !!settings.show_thoughts };
        return { selected, revision: JSON.stringify(selected), presets,
            personas: Object.entries(ctx.powerUserSettings.personas ?? {}).map(([id,name]) => ({ id, name })),
            lorebooks: [...(world_names ?? [])],
            models: model_list.map(model => ({ id: model.id, name: model.name ?? model.id })),
            onlineStatus: ctx.onlineStatus, hasOpenRouterKey: hasActiveSecret(secret_state[SECRET_KEYS.OPENROUTER]) };
    }
    async function verify(check) {
        await saveSettings();
        const ctx = getContext();
        const response = await fetch('/api/settings/get', { method: 'POST', headers: ctx.getRequestHeaders(), cache: 'no-store' });
        if (!response.ok) fail('SETTINGS_UNVERIFIED', 'Could not verify saved settings. Reopen settings before continuing.');
        const data = await response.json(), settings = JSON.parse(data.settings);
        if (!check(settings)) fail('SETTINGS_UNVERIFIED', 'The saved settings do not match the change. Reopen settings before continuing.');
    }
    return {
        read,
        async change({ kind, value }) {
            const ctx = getContext(), settings = ctx.chatCompletionSettings;
            if (kind === 'preset') {
                const manager = getPresetManager('openai'), preset = manager?.findPreset(value);
                if (preset === undefined || preset === null) fail('INVALID_ARGUMENT', 'Choose an existing chat-completion preset.');
                const select = document.querySelector('#settings_preset_openai');
                select.value = preset;
                select.dispatchEvent(new Event('change', { bubbles:true }));
                await getPresetApplicationPromise();
                if (read().selected.preset !== value) fail('PRESET_FAILED', 'ST did not apply the selected preset. Reopen settings before continuing.');
                await verify(saved => saved.oai_settings?.preset_settings_openai === value);
            } else if (kind === 'persona') {
                if (!Object.hasOwn(ctx.powerUserSettings.personas ?? {}, value)) fail('INVALID_ARGUMENT', 'Choose an existing persona.');
                await selectPersonaWithoutCardEdit(getContext, setUserAvatar, value);
                await verify(saved => saved.user_avatar === value);
            } else if (kind === 'lorebooks') {
                if (!Array.isArray(value) || new Set(value).size !== value.length || value.some(name => !world_names.includes(name))) fail('INVALID_ARGUMENT', 'Choose existing global lorebooks.');
                updateWorldInfoSettings({}, value);
                // ST normally copies the selection into this field in its debounced saver.
                Object.assign(world_info, { globalSelect: [...value] });
                await verify(saved => JSON.stringify(saved.world_info_settings?.world_info?.globalSelect) === JSON.stringify(value));
            } else if (kind === 'thinking') {
                if (typeof value !== 'boolean') fail('INVALID_ARGUMENT', 'Thinking visibility must be on or off.');
                settings.show_thoughts = value;
                await verify(saved => saved.oai_settings?.show_thoughts === value);
            } else if (kind === 'source') {
                if (!['openrouter', 'custom'].includes(value)) fail('INVALID_ARGUMENT', 'This prototype supports OpenRouter and the custom test connection.');
                if (ctx.mainApi !== 'openai') changeSelect('#main_api', 'openai');
                changeSelect('#chat_completion_source', value);
                await verify(saved => saved.main_api === 'openai' && saved.oai_settings?.chat_completion_source === value);
            } else if (kind === 'model') {
                if (settings.chat_completion_source !== 'openrouter' || !model_list.some(model => model.id === value)) fail('INVALID_ARGUMENT', 'Connect OpenRouter and choose a model from its loaded list.');
                changeSelect('#model_openrouter_select', value);
                await verify(saved => saved.oai_settings?.openrouter_model === value);
            } else if (kind === 'openrouterKey') {
                if (typeof value !== 'string' || !value.trim() || value.length > 1000) fail('INVALID_ARGUMENT', 'Enter a nonempty OpenRouter key.');
                if (!await writeSecret(SECRET_KEYS.OPENROUTER, value.trim(), 'Pocket Tavern')) fail('SETTINGS_UNVERIFIED', 'ST could not save the key.');
            } else if (kind === 'connect') {
                if (ctx.mainApi !== 'openai') fail('INVALID_ARGUMENT', 'Choose a chat-completion connection first.');
                document.querySelector('#api_button_openai').click();
            } else fail('INVALID_ARGUMENT', 'Unknown settings control.');
            return read();
        },
    };
}
