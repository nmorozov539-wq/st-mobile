export function createSettingsPanel({ rpc, action, adoptSnapshot, status, locked }) {
    const $ = id => document.getElementById(id);
    let configuration, panelLocked=true;
    function setLocked(value) {
        panelLocked=value;
        for(const element of $('settings-panel').querySelectorAll('input,select,button')) if(element.id!=='close-settings') element.disabled=value;
        $('setting-model').disabled=value || configuration?.selected.source!=='openrouter' || !configuration?.models.length;
    }
    const choices = (id, rows, selected) => {
        const select = $(id); select.replaceChildren();
        for (const row of rows) {
            const option = document.createElement('option'); option.value = row.id; option.textContent = row.name;
            option.selected = Array.isArray(selected) ? selected.includes(row.id) : row.id === selected;
            select.append(option);
        }
    };
    function render(value) {
        configuration = value;
        $('settings-build').textContent = `Pocket Tavern 0.4.3 · engine bridge ${value.bridgeBuild ?? 'older build — update and restart ST'}`;
        const selected = value.selected;
        $('setting-source').value = selected.source;
        choices('setting-preset', value.presets.map(name => ({ id:name, name })), selected.preset);
        choices('setting-persona', value.personas, selected.persona);
        choices('setting-model', value.models, selected.model);
        choices('setting-lorebooks', value.lorebooks.map(name => ({ id:name, name })), selected.lorebooks);
        $('setting-model').disabled = selected.source !== 'openrouter' || !value.models.length;
        $('setting-thinking').checked = selected.thinking;
        setLocked(panelLocked);
        $('connection-state').textContent = `${value.onlineStatus === 'no_connection' ? 'Not connected' : 'ST connection: '+value.onlineStatus} · OpenRouter key ${value.hasOpenRouterKey ? 'saved in ST' : 'not configured'}`;
    }
    async function change(kind, value) {
        if (locked()) throw new Error('Finish or review the current conversation before changing settings.');
        $('settings-error').textContent = '';
        if (kind === 'connect') $('settings-error').textContent = 'Starting connection check…';
        if (kind === 'connect') $('connection-state').textContent = 'Connecting to ST’s selected provider…';
        try {
            render(await rpc('configure', { kind, value, revision: configuration.revision }, 45000));
            if (kind === 'connect') $('settings-error').textContent = `Connection check finished: ${configuration.onlineStatus}. ${configuration.models.length} models loaded.`;
            await adoptSnapshot();
            status(kind === 'connect' ? 'ST connection checked' : 'Settings change saved by ST');
        } catch (error) {
            $('settings-error').textContent = error.message;
            // A failed response may follow a completed write. Read again, never replay it.
            try { render(await rpc('settings')); } catch { /* Keep the original failure visible. */ }
            throw error;
        }
    }
    $('settings-button').onclick = () => action(async () => { render(await rpc('settings')); $('settings-error').textContent = ''; $('settings-panel').showModal(); $('settings-panel').scrollTop = 0; });
    $('close-settings').onclick = () => { $('setting-key').value = ''; $('settings-panel').close(); };
    $('settings-panel').addEventListener('close', () => { $('setting-key').value = ''; });
    $('refresh-settings').onclick = () => action(async () => render(await rpc('settings')));
    for (const [id,kind] of [['setting-source','source'],['setting-preset','preset'],['setting-persona','persona'],['setting-model','model']]) {
        $(id).onchange = () => action(() => change(kind, $(id).value));
    }
    $('setting-thinking').onchange = () => action(() => change('thinking', $('setting-thinking').checked));
    $('apply-lorebooks').onclick = () => action(() => change('lorebooks', [...$('setting-lorebooks').selectedOptions].map(option => option.value)));
    $('clear-lorebooks').onclick = () => action(() => change('lorebooks', []));
    $('connect-model').onclick = () => {
        const value = $('setting-key').value; $('setting-key').value = '';
        return action(() => change('connect', value));
    };
    $('save-key').onclick = () => {
        const value = $('setting-key').value; $('setting-key').value = '';
        action(() => change('openrouterKey', value));
    };
    return {setLocked};
}
