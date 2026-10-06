// ST 1.19.0 supplies a list of masked secret metadata, not a readiness boolean.
// Inspect only activation metadata; never return or inspect the secret value.
export function hasActiveSecret(entries) {
    return Array.isArray(entries) && entries.some(entry => entry?.active === true);
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
