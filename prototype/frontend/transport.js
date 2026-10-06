export class RuntimeConnection {
    constructor(onEvent = () => {}) { this.onEvent = onEvent; this.sequence = 0; this.pending = new Map(); this.port = null; }
    connect(port) {
        this.disconnect('The engine connection changed. Review saved changes before retrying.');
        this.port = port;
        port.onmessage = ({ data }) => {
            if (this.port !== port) return;
            if (data.event) {
                const item = [...this.pending.values()].find(item => item.method === 'send' && item.argument.requestId === data.event.requestId);
                if (item) item.arm();
                this.onEvent(data.event); return;
            }
            const item = this.pending.get(data.id); if (!item) return;
            clearTimeout(item.timer); this.pending.delete(data.id);
            data.error ? item.reject(Object.assign(new Error(data.error.message), { code: data.error.code })) : item.resolve(data.result);
        };
        port.start();
    }
    request(method, argument, timeout = 12000) {
        if (!this.port) return Promise.reject(Object.assign(new Error('Engine disconnected. Reconnect to inspect the saved conversation.'), { code: 'DISCONNECTED' }));
        const id = ++this.sequence, port = this.port;
        return new Promise((resolve, reject) => {
            const item = { resolve, reject, method, argument, timer: null, arm: () => {
                clearTimeout(item.timer);
                item.timer = setTimeout(() => { this.pending.delete(id); reject(Object.assign(new Error('The engine did not answer. Changes may already be saved; reconnect and review before retrying.'), { code: 'TIMEOUT' })); }, timeout);
            } };
            this.pending.set(id, item); item.arm();
            try { port.postMessage({ id, method, argument }); }
            catch { this.disconnect('The engine connection closed. Review saved changes before retrying.'); }
        });
    }
    disconnect(message = 'Engine disconnected.') {
        this.port?.close(); this.port = null;
        for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(Object.assign(new Error(message), { code: 'DISCONNECTED' })); }
        this.pending.clear();
    }
}
