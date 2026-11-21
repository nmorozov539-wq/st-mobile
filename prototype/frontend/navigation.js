export const TOP_LEVEL_ROUTES = new Set(['home', 'chats', 'library', 'wi', 'extensions']);
export const FOCUSED_ROUTES = new Set(['chat', 'new-chat', 'character-detail', 'character-edit', 'persona-editor', 'persona-picker', 'wi-entry', 'wi-activation', 'settings']);

export function normalizeRoute(route) {
    if (!route || typeof route.name !== 'string') return {name: 'home', origin: null, section: null, topic: null};
    const name = TOP_LEVEL_ROUTES.has(route.name) || FOCUSED_ROUTES.has(route.name) ? route.name : 'home';
    return {name, origin: typeof route.origin === 'string' ? route.origin : null,
        section: ['characters', 'personas', 'wi'].includes(route.section) ? route.section : null,
        topic: ['connection', 'presets', 'appearance', 'layout', 'about', 'migration'].includes(route.topic) ? route.topic : null};
}

export function createNavigation(initial = {name: 'home'}) {
    let current = normalizeRoute(initial), layers = [], listeners = new Set();
    const notify = () => listeners.forEach(listener => listener(snapshot()));
    const snapshot = () => ({route: {...current}, layers: layers.map(layer => ({...layer}))});
    return {
        snapshot,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        go(route) { current = normalizeRoute(route); layers = []; notify(); return snapshot(); },
        openLayer(layer) { if (!layer?.id) throw new Error('A layer ID is required.'); layers.push({...layer}); notify(); return snapshot(); },
        closeLayer() { const closed = layers.pop() ?? null; if (closed) notify(); return closed; },
        back() {
            if (layers.length) return {handled: true, kind: 'layer', value: this.closeLayer()};
            if (current.name === 'settings' && current.topic) { current = {...current, topic: null}; notify(); return {handled: true, kind: 'route', value: snapshot()}; }
            if (current.name === 'library' && current.section && current.section !== 'characters') { current = {...current, section: 'characters'}; notify(); return {handled: true, kind: 'route', value: snapshot()}; }
            if (FOCUSED_ROUTES.has(current.name)) { current = normalizeRoute({name: current.origin || (current.name === 'chat' ? 'chats' : 'home')}); notify(); return {handled: true, kind: 'route', value: snapshot()}; }
            if (current.name !== 'home') { current = normalizeRoute({name: 'home'}); notify(); return {handled: true, kind: 'route', value: snapshot()}; }
            return {handled: false};
        },
    };
}
