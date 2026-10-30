// ST 1.19.0 supplies a list of masked secret metadata, not a readiness boolean.
// Inspect only activation metadata; never return or inspect the secret value.
export function hasActiveSecret(entries) {
    return Array.isArray(entries) && entries.some(entry => entry?.active === true);
}

export function providerSecretKey(source) {
    if (source === 'openrouter') return 'api_key_openrouter';
    if (source === 'custom') return 'api_key_custom';
    if (source === 'deepseek') return 'api_key_deepseek';
    throw new Error('Choose OpenRouter, DeepSeek or a custom OpenAI-compatible connection.');
}

export function validateEndpoint(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Enter the custom endpoint base URL.');
    let url;
    try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete http:// or https:// endpoint URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTP(S) base URL without credentials, query parameters, or a fragment.');
    if (/\/chat\/completions\/?$|\/models\/?$/.test(url.pathname)) throw new Error('Enter the base URL; ST adds /models and /chat/completions.');
    return value.trim().replace(/\/$/, '');
}

export async function waitForConnection({ isLoading, read, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), timeout = 30000 }) {
    for (let elapsed = 0; elapsed <= timeout; elapsed += 100) {
        if (!isLoading()) {
            const result = read();
            if (result.onlineStatus === 'no_connection' || !result.onlineStatus) throw new Error('ST could not connect. Check your saved API key and network connection, then try again.');
            return result;
        }
        await delay(100);
    }
    throw new Error('ST is still waiting for the provider. Refresh connection and models to check the result before retrying.');
}
