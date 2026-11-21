// STM sends plain text replies. A preset can switch ST's tool calling on; turn it
// off for STM's own request only, then put the preset's value back.
export async function withoutTools(settings, run, save = () => {}) {
    if (!settings?.function_calling) return run();
    settings.function_calling = false;
    try { return await run(); }
    finally { settings.function_calling = true; save(); }
}
