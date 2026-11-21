export async function probeEngine(request=fetch,timeoutMs=3500) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
        const response=await request(`/version?stmHealth=${Date.now()}`,{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error('Engine did not answer.');
        const version=await response.json();
        if(version.pkgVersion!=='1.19.1')throw Error('Unexpected engine version.');
        return version;
    } catch {
        throw Object.assign(new Error('Cannot reach the local engine. Start or restart SillyTavern, then reconnect. Your request will not be resent.'),{code:'ENGINE_UNAVAILABLE'});
    } finally {clearTimeout(timer);}
}
