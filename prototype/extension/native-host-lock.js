export function createNativeHostLock({coreBusy,workspaceBusy,adapterActivity}) {
    return options=>!!coreBusy(options)||!!workspaceBusy()||!!adapterActivity({ignoreExternal:true})?.busy;
}
export function nativeHostOwnsEngine(host){return !!host&&host.state().state!=='closed';}
