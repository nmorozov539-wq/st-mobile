// A result from an old iframe must never disconnect its replacement.
export function createEngineMonitor({connection,probe,isReady,onActivity,onDisconnect}) {
    let running=null;
    return {
        reset(){running=null;},
        async check(){
            if(!isReady() || running)return;
            const port=connection.port;running=port;
            try{
                await probe();if(connection.port!==port)return;
                await connection.request('health',undefined,15000);if(connection.port!==port)return;
                const activity=await connection.request('activity',undefined,15000);if(connection.port!==port)return;
                await onActivity(activity);
            }catch(error){if(connection.port===port)onDisconnect(error.message);}
            finally{if(running===port)running=null;}
        },
    };
}
