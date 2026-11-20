export const FRONTEND_BUILD = '0.9.1';
export const BRIDGE_PROTOCOL = 2;
export function checkBridgeBuild(handshake) {
    if (handshake.bridgeBuild !== FRONTEND_BUILD) throw Object.assign(new Error(`Pocket Tavern ${FRONTEND_BUILD} loaded, but the engine bridge is ${handshake.bridgeBuild ?? 'an older build'}. Stop the server, run the updater from the complete new ZIP, restart it, and reload this page.`), {code:'BUILD_MISMATCH'});
    if (handshake.protocolVersion !== BRIDGE_PROTOCOL) throw Object.assign(new Error(`Pocket Tavern needs bridge protocol ${BRIDGE_PROTOCOL}; this engine reported ${handshake.protocolVersion ?? 'a legacy protocol'}. Update the complete Pocket package before changing settings.`), {code:'PROTOCOL_MISMATCH'});
}
