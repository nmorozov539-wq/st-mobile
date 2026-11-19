export const PROTOCOL_VERSION = 2;

export function assertRequest(value) {
    if (!value || !Number.isInteger(value.id) || value.id < 1 || typeof value.method !== 'string' || !value.method || value.method.length > 80) {
        throw Object.assign(new Error('Malformed bridge request.'), {code:'INVALID_ARGUMENT'});
    }
    return value;
}

export function createBridgeDispatcher(methods) {
    return async value => {
        let request;
        try { request = assertRequest(value); }
        catch (error) { return {id:value?.id ?? null,error:{code:error.code,message:error.message}}; }
        if (!Object.hasOwn(methods, request.method)) return {id:request.id,error:{code:'UNSUPPORTED_OPERATION',message:`Bridge method “${request.method}” is not supported.`}};
        try { return {id:request.id,result:await methods[request.method](request.argument)}; }
        catch (error) { return {id:request.id,error:{code:error.code ?? 'ERROR',message:error.message ?? String(error)}}; }
    };
}

export function handshakeContract({bridgeBuild, sessionId, adapter, capabilities = {}}) {
    return {...adapter, bridgeBuild, protocolVersion:PROTOCOL_VERSION, sessionId,
        capabilities:{nativeSettingsHost:{connection:false,presets:false},configurationProjection:false,legacyConfigurationMigration:false,...capabilities}};
}
