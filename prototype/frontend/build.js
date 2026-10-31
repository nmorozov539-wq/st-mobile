export const FRONTEND_BUILD = '0.8.0-phase1.2';
export function checkBridgeBuild(handshake) {
    if (handshake.bridgeBuild !== FRONTEND_BUILD) throw Object.assign(new Error(`Pocket Tavern ${FRONTEND_BUILD} loaded, but the engine bridge is ${handshake.bridgeBuild ?? 'an older build'}. Stop the server, run the updater from the complete new ZIP, restart it, and reload this page.`), {code:'BUILD_MISMATCH'});
}
