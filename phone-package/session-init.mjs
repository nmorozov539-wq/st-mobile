// Validate a fresh browser session before ST loads or saves settings.
// Only read/token and ping requests run here; no settings writes are retried.
export async function initializePocketSession(request=fetch,{attempts=3,timeoutMs=5000}={}) {
    for(let attempt=0;attempt<attempts;attempt++) {
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),timeoutMs);
        try {
            const response=await request('/csrf-token',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
            if(!response.ok)throw Error('Could not read the engine session.');
            const {token}=await response.json();
            if(typeof token!=='string'||!token)throw Error('The engine returned an invalid session token.');
            const check=await request('/api/ping',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'X-CSRF-Token':token},signal:controller.signal});
            if(check.ok)return token;
            if(check.status!==403)throw Error(`Engine session check failed (HTTP ${check.status}).`);
            // Another page may have initialized the cookie concurrently. Read
            // its current token before any settings payload is loaded/saved.
        } finally {clearTimeout(timer);}
    }
    throw Error('The engine session keeps changing. Close older engine tabs and reload. No settings were saved by this startup check.');
}
