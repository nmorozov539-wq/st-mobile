const SURFACES = {
    connection:{roots:['#rm_api_block'],required:['#main_api','#chat_completion_source'],popups:['body > .select2-container--open','#dialogue_popup[style*="display: block"]','.popup[style*="display: block"]']},
    presets:{roots:['#left-nav-panel'],required:['#ai_response_configuration'],popups:['#completion_prompt_manager_popup[style*="display: block"]','body > .select2-container--open','#dialogue_popup[style*="display: block"]','.popup[style*="display: block"]']},
};
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};

export function createNativeSettingsHost({document, isBusy, projection, settle=async()=>({}), emit=()=>{}, verifiedSurfaces={}, hostingMode='full-native-fallback'}) {
    let session=null, sequence=0;
    const state=()=>session?{state:session.closing?'saving':'open',surface:session.surface,surfaceId:session.id,mode:session.mode,roots:session.roots.map(node=>node.id||node.className)}:{state:'closed'};
    function rootsFor(surface){return (SURFACES[surface]?.roots??[]).map(selector=>document.querySelector(selector)).filter(Boolean);}
    function available(surface){return rootsFor(surface).length===(SURFACES[surface]?.roots.length??0)&&(SURFACES[surface]?.required??[]).every(selector=>document.querySelector(selector));}
    function visiblePopups(active=session){return active?SURFACES[active.surface].popups.map(selector=>document.querySelector(selector)).filter(node=>node&&node.getClientRects?.().length):[];}
    function allowed(node,active=session){return !!active&&active.roots.some(root=>root===node||root.contains?.(node))||visiblePopups(active).some(root=>root===node||root.contains?.(node));}
    function blockOutside(event){if(!allowed(event.target)){event.preventDefault?.();event.stopImmediatePropagation?.();event.stopPropagation?.();if(event.type==='focusin')session?.roots[0].focus?.({preventScroll:true});}}
    function blockKeyboard(event){if(!allowed(event.target))event.preventDefault?.();event.stopImmediatePropagation?.();event.stopPropagation?.();}
    function installGuard(active){
        const style=document.createElement?.('style');if(style){style.dataset.pocketNativeGuard='';style.textContent='html.pocket-native-settings-open body *{pointer-events:none!important}html.pocket-native-settings-open #rm_api_block,html.pocket-native-settings-open #rm_api_block *,html.pocket-native-settings-open #left-nav-panel,html.pocket-native-settings-open #left-nav-panel *,html.pocket-native-settings-open .select2-container--open,html.pocket-native-settings-open .select2-container--open *,html.pocket-native-settings-open #completion_prompt_manager_popup,html.pocket-native-settings-open #completion_prompt_manager_popup *,html.pocket-native-settings-open #dialogue_popup,html.pocket-native-settings-open #dialogue_popup *,html.pocket-native-settings-open .popup[style*="display: block"],html.pocket-native-settings-open .popup[style*="display: block"] *{pointer-events:auto!important}';document.head?.append?.(style);active.guardStyle=style;}
        active.guardEvents=['pointerdown','click','touchstart','submit','input','change','focusin'];for(const name of active.guardEvents)document.addEventListener?.(name,blockOutside,true);
        active.keyGuardEvents=['keydown','keyup','keypress'];for(const name of active.keyGuardEvents)document.addEventListener?.(name,blockKeyboard,true);
    }
    function removeGuard(active){active.guardStyle?.remove?.();for(const name of active.guardEvents??[])document.removeEventListener?.(name,blockOutside,true);for(const name of active.keyGuardEvents??[])document.removeEventListener?.(name,blockKeyboard,true);}
    function restore(active){
        removeGuard(active);
        for(const item of active.styles){item.node.className=item.className;item.node.setAttribute('style',item.style);if(item.tabindex===null)item.node.removeAttribute('tabindex');else item.node.setAttribute('tabindex',item.tabindex);}
        document.documentElement.classList.remove('pocket-native-settings-open');
    }
    async function close(expectedId,{force=false}={}){
        if(!session)return state();if(expectedId&&expectedId!==session.id)fail('STALE_SURFACE','This native settings session is no longer active.');
        const active=session;
        if(active.closing){if(force&&active.closePromise)return active.closePromise;fail('SAVE_IN_FLIGHT','Native settings are still saving. Wait before leaving.');}
        if(!force&&isBusy({excludeNative:true}))fail('SAVE_IN_FLIGHT','Native settings are still saving. Wait before leaving.');
        active.closing=true;emit({type:'nativeSettings.changed',...state()});
        active.closePromise=(async()=>{let saved;try{saved=await settle(active.surface);}catch(error){active.closing=false;active.closePromise=null;fail('SAVE_UNVERIFIED',`Native settings could not be verified before closing: ${error.message}`);}
            restore(active);session=null;const configuration=await projection();emit({type:'nativeSettings.changed',surfaceId:active.id,state:'closed'});return {...state(),configuration,saved};})();
        return active.closePromise;
    }
    function dismiss(popup){
        const control=popup.querySelector?.('#completion_prompt_manager_popup_close_button,#completion_prompt_manager_popup_entry_form_close,[data-dismiss],.dialogue_close,.popup-button-close');if(control){control.click?.();return !popup.getClientRects?.().length;}
        if(popup.matches?.('.select2-container--open')){const jq=document.defaultView?.jQuery;try{jq?.('.select2-hidden-accessible').select2('close');}catch{}return !popup.getClientRects?.().length;}
        return false;
    }
    return {
        capabilities(){return {connection:!!verifiedSurfaces.connection&&available('connection'),presets:!!verifiedSurfaces.presets&&available('presets')};},
        state,
        async run(argument={}){
            if(argument.action==='read')return state();
            if(argument.action==='open'){
                if(session)return argument.surfaceId===session.id?state():fail('NATIVE_SETTINGS_ACTIVE','Close the current native settings page first.');
                if(!SURFACES[argument.surface])fail('INVALID_ARGUMENT','Choose Connection or Presets.');
                if(argument.recoveryPending||isBusy())fail('BUSY','Finish generation, saving, recovery review or Memory work before opening native settings.');
                const roots=rootsFor(argument.surface);if(!available(argument.surface))fail('NATIVE_SURFACE_UNAVAILABLE',`The original ${argument.surface} controls are unavailable in this ST build.`);
                const styles=roots.map(node=>({node,style:node.getAttribute('style')??'',tabindex:node.getAttribute('tabindex'),className:node.className}));
                for(const node of roots){node.classList.remove('closedDrawer');node.classList.add('openDrawer');for(const [name,value] of [['display','block'],['visibility','visible'],['pointer-events','auto'],['position','fixed'],['inset','0'],['width','100vw'],['max-width','none'],['height','100vh'],['max-height','none'],['overflow','auto'],['z-index','50000']])node.style.setProperty(name,value,'important');node.setAttribute('tabindex','-1');}
                document.documentElement.classList.add('pocket-native-settings-open');
                session={id:`native-${++sequence}`,surface:argument.surface,mode:hostingMode,roots,styles,closing:false};installGuard(session);
                emit({type:'nativeSettings.changed',...state()});roots[0].focus?.({preventScroll:true});return state();
            }
            if(argument.action==='back'){
                if(!session) return state();
                if(argument.surfaceId&&argument.surfaceId!==session.id)fail('STALE_SURFACE','This native settings session is no longer active.');
                const popup=visiblePopups()[0];
                if(popup){if(!dismiss(popup))fail('NATIVE_LAYER_UNHANDLED','The active native settings layer could not be closed safely.');session.roots[0].focus?.({preventScroll:true});return {...state(),nestedClosed:true};}
                return close(argument.surfaceId);
            }
            if(argument.action==='close')return close(argument.surfaceId);
            fail('INVALID_ARGUMENT','Unknown native-settings action.');
        },
        async disconnect(){if(session)return close(session.id,{force:true});return state();},
    };
}
