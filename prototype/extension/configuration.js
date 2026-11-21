import { hasActiveSecret, providerSecretKey, validateEndpoint, listedModel } from './configuration-state.js?build=0.9.2';
import { connectThroughST } from './connection-check.js?build=0.9.2';
import { selectPersonaWithoutCardEdit } from './persona-selection.js?build=0.9.2';
import { testConnection } from './connection-test.js?build=0.9.2';
import { saveSettings } from '/script.js';
import { amount_gen, max_context } from '/script.js';
import { getPresetManager } from '/scripts/preset-manager.js';
import { model_list, getChatCompletionModel, getPresetApplicationPromise, sendOpenAIRequest } from '/scripts/openai.js';
import { user_avatar, setUserAvatar } from '/scripts/personas.js';
import { world_info, world_names, selected_world_info, updateWorldInfoSettings } from '/scripts/world-info.js';
import { secret_state, writeSecret, SECRET_KEYS } from '/scripts/secrets.js';
import {textgenerationwebui_settings,getTextGenServer} from '/scripts/textgen-settings.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
export function createConfigurationRuntime(getContext) {
    function changeSelect(selector, value) { const element=document.querySelector(selector); element.value=value; element.dispatchEvent(new Event('change', {bubbles:true})); }
    function changeInput(selector, value) { const element=document.querySelector(selector); element.value=value; element.dispatchEvent(new Event('input', {bubbles:true})); }
    function read() {
        const ctx = getContext(), settings = ctx.chatCompletionSettings, textCompletion=ctx.mainApi==='textgenerationwebui';
        const manager = getPresetManager(textCompletion?'textgenerationwebui':'openai');
        const presets = manager?.getAllPresets?.()??(manager ? Object.keys(manager.getPresetList().preset_names) : []);
        const textModel=textgenerationwebui_settings[`${textgenerationwebui_settings.type}_model`]??textgenerationwebui_settings.model??ctx.onlineStatus??'';
        const selected = textCompletion?{mainApi:ctx.mainApi,family:'text-completion',source:textgenerationwebui_settings.type,model:String(textModel??''),endpoint:getTextGenServer(),preset:manager?.getSelectedPresetName?.()??textgenerationwebui_settings.preset??'',persona:user_avatar,lorebooks:[...selected_world_info],thinking:false,toolCalling:false,context:max_context,response:amount_gen}:{ mainApi: ctx.mainApi,family:'chat-completion',source: settings.chat_completion_source,
            model: getChatCompletionModel() ?? '', endpoint: settings.custom_url ?? '', preset: settings.preset_settings_openai,
            persona: user_avatar, lorebooks: [...selected_world_info], thinking: !!settings.show_thoughts, toolCalling: !!settings.function_calling };
        const actions=textCompletion?{nativeConnection:true,nativePresets:true,modelRefresh:false,testGeneration:false,promptManager:false,context:true,instruct:true,formatting:true}:{nativeConnection:true,nativePresets:true,modelRefresh:true,testGeneration:true,promptManager:true,context:false,instruct:false,formatting:false};
        return { bridgeBuild: '0.9.2', selected, revision: JSON.stringify(selected), presets,
            personas: Object.entries(ctx.powerUserSettings.personas ?? {}).map(([id,name]) => { const d = ctx.powerUserSettings.persona_descriptions?.[id]; return { id, name, title: typeof d?.title === 'string' ? d.title.slice(0,120) : '', description: typeof d?.description === 'string' ? d.description.slice(0,240) : '' }; }),
            lorebooks: [...(world_names ?? [])],
            models: textCompletion?[]:model_list.map(model => ({ id: model.id, name: model.name ?? model.id })),actions,
            onlineStatus: ctx.onlineStatus, keySource: selected.source, hasProviderKey: ['custom','openrouter','deepseek'].includes(selected.source) && hasActiveSecret(secret_state[providerSecretKey(selected.source)]), hasOpenRouterKey: hasActiveSecret(secret_state[SECRET_KEYS.OPENROUTER]), tokenCounts: !!ctx.powerUserSettings?.message_token_count_enabled };
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
        // Settings sets the global model and provider. Keep Pocket's global
        // copy in step, or opening a chat would put the previous model back.
        async syncGlobalModel() {
            // While disconnected ST reports its built-in default, not a model you chose.
            const ctx = getContext();if(ctx.mainApi!=='openai')return;const global = ctx.extensionSettings.pocket_tavern?.global, model = listedModel(model_list, getChatCompletionModel());
            if (!global || !model || ctx.onlineStatus === 'no_connection' || global.model === model) return;
            global.model = model;
            await verify(saved => saved.extension_settings?.pocket_tavern?.global?.model === model);
        },
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
            } else if (kind === 'toolCalling') {
                if (typeof value !== 'boolean') fail('INVALID_ARGUMENT', 'Tool calling must be on or off.');
                const element=document.querySelector('#openai_function_calling');
                element.checked=value; element.dispatchEvent(new Event('input', {bubbles:true}));
                await verify(saved => saved.oai_settings?.function_calling === value);
            } else if (kind === 'tokenCounts') {
                if (typeof value !== 'boolean') fail('INVALID_ARGUMENT', 'Token counts must be on or off.');
                const element = document.querySelector('#messageTokensEnabled');
                if (element) { element.checked = value; element.dispatchEvent(new Event('input', { bubbles:true })); element.dispatchEvent(new Event('change', { bubbles:true })); }
                ctx.powerUserSettings.message_token_count_enabled = value;
                await verify(saved => saved.power_user?.message_token_count_enabled === value);
            } else if (kind === 'thinking') {
                if (typeof value !== 'boolean') fail('INVALID_ARGUMENT', 'Thinking visibility must be on or off.');
                settings.show_thoughts = value;
                await verify(saved => saved.oai_settings?.show_thoughts === value);
            } else if (kind === 'source') {
                if (!['openrouter', 'custom', 'deepseek'].includes(value)) fail('INVALID_ARGUMENT', 'Pocket supports OpenAI-compatible endpoints (OpenRouter, the proxy, custom) and DeepSeek.');
                if (ctx.mainApi !== 'openai') changeSelect('#main_api', 'openai');
                changeSelect('#chat_completion_source', value);
                await verify(saved => saved.main_api === 'openai' && saved.oai_settings?.chat_completion_source === value);
            } else if (kind === 'model') {
                if (typeof value !== 'string' || !value.trim() || value.length > 200 || value !== value.trim()) fail('INVALID_ARGUMENT', 'Enter a nonempty model ID without surrounding spaces.');
                if (settings.chat_completion_source === 'custom') {
                    changeInput('#custom_model_id', value);
                    await verify(saved => saved.oai_settings?.custom_model === value);
                } else if (settings.chat_completion_source === 'deepseek') {
                    // ST lists DeepSeek's models after Connect and can select only those.
                    const listed = listedModel(model_list, value);
                    if (!listed) fail('INVALID_ARGUMENT', model_list.length ? `“${value}” is not one of DeepSeek's models. Choose one from the list, or pick a model for this chat in the model panel.` : 'Connect DeepSeek first so its model list is loaded.');
                    changeSelect('#model_deepseek_select', listed);
                    await verify(saved => saved.oai_settings?.deepseek_model === listed);
                } else {
                    const listed = listedModel(model_list, value);
                    if (settings.chat_completion_source !== 'openrouter' || !listed) fail('INVALID_ARGUMENT', 'Connect OpenRouter and choose a model from its loaded list.');
                    changeSelect('#model_openrouter_select', listed);
                    await verify(saved => saved.oai_settings?.openrouter_model === listed);
                }
            } else if (kind === 'endpoint') {
                if (settings.chat_completion_source !== 'custom') fail('INVALID_ARGUMENT', 'Choose Custom before editing its endpoint.');
                const endpoint = validateEndpoint(value);
                changeInput('#custom_api_url_text', endpoint);
                await verify(saved => saved.oai_settings?.custom_url === endpoint);
            } else if (kind === 'providerKey' || kind === 'openrouterKey') {
                if (typeof value !== 'string' || !value.trim() || value.length > 1000) fail('INVALID_ARGUMENT', 'Enter a nonempty API key.');
                const key = kind === 'openrouterKey' ? SECRET_KEYS.OPENROUTER : providerSecretKey(settings.chat_completion_source);
                if (!await writeSecret(key, value.trim(), 'Pocket Tavern')) fail('SETTINGS_UNVERIFIED', 'ST could not save the key.');
            } else if (kind === 'test') {
                if (ctx.mainApi !== 'openai' || !getChatCompletionModel()) fail('INVALID_ARGUMENT', 'Choose a chat-completion model first.');
                if (settings.chat_completion_source === 'custom') validateEndpoint(settings.custom_url);
                const result = await testConnection({settings, request:sendOpenAIRequest});
                return {...read(), testResult:result};
            } else if (kind === 'connect') {
                if (ctx.mainApi !== 'openai') fail('INVALID_ARGUMENT', 'Choose a chat-completion connection first.');
                if (settings.chat_completion_source === 'custom') validateEndpoint(settings.custom_url);
                const key = providerSecretKey(settings.chat_completion_source);
                {
                    if (typeof value === 'string' && value.trim()) {
                        if (value.length > 1000) fail('INVALID_ARGUMENT', 'Enter a valid API key.');
                        if (!await writeSecret(key, value.trim(), 'Pocket Tavern')) fail('SETTINGS_UNVERIFIED', 'ST could not save the key.');
                    }
                    if (settings.chat_completion_source === 'openrouter' && !hasActiveSecret(secret_state[key])) fail('INVALID_ARGUMENT', 'Enter an OpenRouter API key, then press Connect.');
                    if (settings.chat_completion_source === 'deepseek' && !hasActiveSecret(secret_state[key])) fail('INVALID_ARGUMENT', 'Enter your DeepSeek API key, then press Connect.');
                }
                const button = document.querySelector('#api_button_openai');
                // Switching provider makes ST check the new connection by itself; let that finish first.
                for (let waited = 0; button.classList.contains('disabled') && waited < 30000; waited += 200) await new Promise(resolve => setTimeout(resolve, 200));
                if (button.classList.contains('disabled')) fail('BUSY', 'ST is already connecting. Refresh connection and models to check the result.');
                return await connectThroughST({ host: window, click: () => button.click(), origin: location.origin, read });
            } else fail('INVALID_ARGUMENT', 'Unknown settings control.');
            return read();
        },
    };
}
