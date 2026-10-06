// Observe ST's own status request. Do not send a second request or expose its body.
export async function connectThroughST({ host, click, origin, read, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), timeout = 30000 }) {
    const original = host.fetch;
    let attempted = false, settled = false, failure;
    const observed = async function(...args) {
        const input = args[0];
        const matches = new URL(typeof input === 'string' ? input : (input.url ?? String(input)), origin).pathname === '/api/backends/chat-completions/status';
        if (!matches) return original.apply(this, args);
        attempted = true;
        try {
            const response = await original.apply(this, args);
            if (!response.ok) failure = `ST’s provider check returned HTTP ${response.status}. Check the key, network, and ST console.`;
            else {
                try { if ((await response.clone().json()).error) failure = 'ST’s provider check returned an error. Check the key, network, and ST console.'; }
                catch { failure = 'ST’s provider check returned an unreadable response.'; }
            }
            return response;
        } catch (error) {
            failure = 'ST could not reach the provider. Check the phone’s network connection and ST console.';
            throw error;
        } finally { settled = true; }
    };
    host.fetch = observed;
    try {
        click();
        for (let elapsed = 0; elapsed <= timeout; elapsed += 100) {
            if (settled) {
                if (failure) throw new Error(failure);
                // Let ST consume the response and update its model selectors.
                await delay(100);
                const result = read();
                if (result.onlineStatus === 'no_connection' || !result.onlineStatus) throw new Error('ST received a response but did not establish a connection. Check its full controls and console.');
                return result;
            }
            if (!attempted && elapsed >= 2000) throw new Error('ST did not start a provider check. Open full ST controls and try connecting there; report this message.');
            await delay(100);
        }
        throw new Error('ST’s provider check timed out after 30 seconds. Refresh connection and models before retrying.');
    } finally {
        if (host.fetch === observed) host.fetch = original;
    }
}
