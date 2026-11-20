const SURFACES = {
    connection:{roots:['#rm_api_block'],required:['#main_api','#chat_completion_source'],popups:['body > .select2-container--open','#dialogue_popup[style*="display: block"]','.popup[style*="display: block"]']},
    presets:{roots:['#left-nav-panel','#AdvancedFormatting'],required:['#ai_response_configuration','#ContextSettings','#InstructSettingsColumn'],popups:['#completion_prompt_manager_popup[style*="display: block"]','body > .select2-container--open','#dialogue_popup[style*="display: block"]','.popup[style*="display: block"]']},
};
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};

export function createNativeSettingsHost({document, isBusy, projection, settle=async()=>({}), emit=()=>{}, verifiedSurfaces={}, hostingMode='pocket-themed-native'}) {
    let session=null, sequence=0;
    const state=()=>session?{state:session.closing?'saving':'open',surface:session.surface,surfaceId:session.id,mode:session.mode,roots:session.roots.map(node=>node.id||node.className)}:{state:'closed'};
    function rootsFor(surface){return (SURFACES[surface]?.roots??[]).map(selector=>document.querySelector(selector)).filter(Boolean);}
    function available(surface){return rootsFor(surface).length===(SURFACES[surface]?.roots.length??0)&&(SURFACES[surface]?.required??[]).every(selector=>document.querySelector(selector));}
    function visiblePopups(active=session){return active?SURFACES[active.surface].popups.map(selector=>document.querySelector(selector)).filter(node=>{if(!node||!node.getClientRects?.().length)return false;const value=document.defaultView?.getComputedStyle?.(node);return !value||(value.display!=='none'&&value.visibility!=='hidden');}):[];}
    function allowed(node,active=session){return !!active&&(active.roots.some(root=>root===node||root.contains?.(node))||active.paneTabs===node||active.paneTabs?.contains?.(node)||visiblePopups(active).some(root=>root===node||root.contains?.(node)));}
    function blockOutside(event){if(!allowed(event.target)){event.preventDefault?.();event.stopImmediatePropagation?.();event.stopPropagation?.();if(event.type==='focusin')session?.roots[0].focus?.({preventScroll:true});}}
    function blockKeyboard(event){if(!allowed(event.target))event.preventDefault?.();event.stopImmediatePropagation?.();event.stopPropagation?.();}
    function installGuard(active){
        const style=document.createElement?.('style');if(style){style.dataset.pocketNativeGuard='';style.textContent='html.pocket-native-settings-open body *{pointer-events:none!important}html.pocket-native-settings-open #rm_api_block,html.pocket-native-settings-open #rm_api_block *,html.pocket-native-settings-open #left-nav-panel,html.pocket-native-settings-open #left-nav-panel *,html.pocket-native-settings-open #AdvancedFormatting,html.pocket-native-settings-open #AdvancedFormatting *,html.pocket-native-settings-open [data-pocket-native-tabs],html.pocket-native-settings-open [data-pocket-native-tabs] *,html.pocket-native-settings-open .select2-container--open,html.pocket-native-settings-open .select2-container--open *,html.pocket-native-settings-open #completion_prompt_manager_popup,html.pocket-native-settings-open #completion_prompt_manager_popup *,html.pocket-native-settings-open #dialogue_popup,html.pocket-native-settings-open #dialogue_popup *,html.pocket-native-settings-open .popup[style*="display: block"],html.pocket-native-settings-open .popup[style*="display: block"] *{pointer-events:auto!important}';document.head?.append?.(style);active.guardStyle=style;}
        active.guardEvents=['pointerdown','click','touchstart','submit','input','change','focusin'];for(const name of active.guardEvents)document.addEventListener?.(name,blockOutside,true);
        active.keyGuardEvents=['keydown','keyup','keypress'];for(const name of active.keyGuardEvents)document.addEventListener?.(name,blockKeyboard,true);
    }
    function presentationCss(value={}){
        const safe=(input,fallback)=>{const text=String(input??'').trim();return text&&text.length<80&&/^[#(),.%\w\s\/-]+$/.test(text)?text:fallback;};
        const colors=value.colors??{},size=Math.min(24,Math.max(12,Number.parseFloat(value.textSize)||16));
        return `html.pocket-native-settings-open{--pt-canvas:${safe(colors.canvas,'#141519')};--pt-surface:${safe(colors.surface,'#1d1f24')};--pt-raised:${safe(colors.raised,'#262930')};--pt-text:${safe(colors.text,'#f2ede3')};--pt-muted:${safe(colors.muted,'#aaa49a')};--pt-border:${safe(colors.border,'#45413b')};--pt-accent:${safe(colors.accent,'#c99548')};--pt-on-accent:${safe(colors.onAccent,'#15120d')};--pt-focus:${safe(colors.focus,'#edb85f')};font-size:${size}px;color-scheme:${String(value.theme).includes('paper')?'light':'dark'}}
html.pocket-native-settings-open body{margin:0!important;padding:0!important;overflow:hidden!important;background:var(--pt-canvas)!important;color:var(--pt-text)!important;font-family:Rubik,system-ui,sans-serif!important;font-size:1rem!important}
html.pocket-native-settings-open body>*:not(#top-settings-holder):not([data-pocket-native-tabs]){visibility:hidden!important}
html.pocket-native-settings-open body>*:has(#completion_prompt_manager_popup),html.pocket-native-settings-open body>*:has(#dialogue_popup),html.pocket-native-settings-open body>*:has(.popup[style*="display: block"]){visibility:visible!important;z-index:60000!important}
html.pocket-native-settings-open :is(.select2-container--open,#completion_prompt_manager_popup,#dialogue_popup,.popup[style*="display: block"]),html.pocket-native-settings-open :is(.select2-container--open,#completion_prompt_manager_popup,#dialogue_popup,.popup[style*="display: block"]) *{visibility:visible!important}
html.pocket-native-settings-open #top-settings-holder{position:fixed!important;inset:0!important;display:block!important;width:100%!important;height:100vh!important;margin:0!important;padding:0!important;background:var(--pt-canvas)!important}
html.pocket-native-settings-open #top-settings-holder>.drawer{display:none!important}
html.pocket-native-connection #top-settings-holder>.drawer:has(#rm_api_block),html.pocket-native-presets #top-settings-holder>.drawer:has(#left-nav-panel),html.pocket-native-presets #top-settings-holder>.drawer:has(#AdvancedFormatting){position:fixed!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;transform:none!important}
html.pocket-native-settings-open :is(#rm_api_block,#left-nav-panel,#AdvancedFormatting){box-sizing:border-box!important;min-height:100vh!important;margin:0!important;padding:14px!important;background:var(--pt-canvas)!important;color:var(--pt-text)!important;box-shadow:none!important;border:0!important;transform:none!important}
html.pocket-native-presets :is(#left-nav-panel,#AdvancedFormatting){padding-top:66px!important}
html.pocket-native-settings-open [data-pocket-native-tabs]{position:fixed!important;visibility:visible!important;z-index:999999!important;inset:0 0 auto!important;height:54px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:4px!important;padding:6px!important;background:var(--pt-canvas)!important;border-bottom:1px solid var(--pt-border)!important}
html.pocket-native-settings-open [data-pocket-native-tabs] button{visibility:visible!important;min-height:42px!important;border:1px solid var(--pt-border)!important;border-radius:10px!important;background:var(--pt-raised)!important;color:var(--pt-text)!important;font:600 .86rem Rubik,system-ui,sans-serif!important}
html.pocket-native-settings-open [data-pocket-native-tabs] button[aria-selected=true]{border-color:var(--pt-accent)!important;color:var(--pt-accent)!important}
html.pocket-native-settings-open :is(#left-nav-panelheader,#lm_button_panel_pin_div,#clickSlidersTips,#left-nav-panel>a.topRightInset){display:none!important}
html.pocket-native-settings-open :is(.scrollableInner,#ai_response_configuration){height:auto!important;max-height:none!important;overflow:visible!important;background:transparent!important}
html.pocket-native-settings-open :is(h2,h3,h4,.inline-drawer-header){color:var(--pt-text)!important;font-family:Rubik,system-ui,sans-serif!important}
html.pocket-native-settings-open :is(label,.range-block-title,.flex-container,.toggle-description){color:var(--pt-text)!important}
html.pocket-native-settings-open :is(small,.notes,.menu_button,.toggle-description){color:var(--pt-muted)!important}
html.pocket-native-settings-open :is(input:not([type=checkbox]):not([type=range]),textarea,select,.select2-selection){box-sizing:border-box!important;min-height:42px!important;border:1px solid var(--pt-border)!important;border-radius:10px!important;background:var(--pt-raised)!important;color:var(--pt-text)!important;box-shadow:none!important;font:inherit!important}
html.pocket-native-settings-open input[type=checkbox]{box-sizing:border-box!important;width:22px!important;height:22px!important;min-width:22px!important;min-height:22px!important;margin:0 8px 0 0!important;accent-color:var(--pt-accent)!important}
html.pocket-native-settings-open input[type=range]{min-height:34px!important;accent-color:var(--pt-accent)!important}
html.pocket-native-settings-open :is(button,.menu_button,.drawer-icon,.inline-drawer-toggle){min-height:42px!important;border:1px solid var(--pt-border)!important;border-radius:10px!important;background:var(--pt-raised)!important;color:var(--pt-text)!important;box-shadow:none!important}
html.pocket-native-settings-open :is(button,.menu_button,.drawer-icon,.inline-drawer-toggle):focus-visible,html.pocket-native-settings-open :is(input,textarea,select):focus-visible{outline:2px solid var(--pt-focus)!important;outline-offset:2px!important}
html.pocket-native-settings-open :is(.inline-drawer,.range-block,.prompt-manager-prompt,.completion_prompt_manager_list_entry){border-color:var(--pt-border)!important;border-radius:12px!important;background:var(--pt-surface)!important;box-shadow:none!important}
html.pocket-native-settings-open :is(.select2-container--open,#completion_prompt_manager_popup,#dialogue_popup,.popup[style*="display: block"]){background:var(--pt-surface)!important;color:var(--pt-text)!important;border-color:var(--pt-border)!important}
html.pocket-native-settings-open #completion_prompt_manager_popup{position:fixed!important;inset:0!important;box-sizing:border-box!important;width:100%!important;height:100vh!important;max-width:none!important;max-height:none!important;padding:14px!important;overflow:auto!important;border:0!important;border-radius:0!important;z-index:800000!important}
html.pocket-native-settings-open #completion_prompt_manager_popup_edit{min-height:100%!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form{display:flex!important;flex-direction:column!important;gap:14px!important;min-width:0!important;min-height:calc(100vh - 28px)!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form>.flex-container{display:grid!important;grid-template-columns:1fr!important;gap:12px!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form_control{box-sizing:border-box!important;width:100%!important;min-width:0!important;margin:0!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form_control label{display:block!important;margin:0 0 5px!important;line-height:1.35!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form_control :is(input:not([type=checkbox]),select,textarea){box-sizing:border-box!important;width:100%!important;max-width:100%!important}
html.pocket-native-settings-open #completion_prompt_manager_popup_entry_form_injection_trigger{min-height:82px!important}
html.pocket-native-settings-open #completion_prompt_manager_popup_entry_form_prompt{min-height:220px!important;line-height:1.5!important;resize:vertical!important}
html.pocket-native-settings-open .checkbox_label{display:flex!important;align-items:center!important;min-height:44px!important}
html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form_footer{position:sticky!important;bottom:0!important;display:flex!important;justify-content:flex-end!important;gap:10px!important;margin-top:auto!important;padding:10px 0!important;background:var(--pt-surface)!important}
@media(max-width:340px){html.pocket-native-settings-open #completion_prompt_manager_popup{padding:10px!important}html.pocket-native-settings-open .completion_prompt_manager_popup_entry_form{min-height:calc(100vh - 20px)!important}}
${value.reducedMotion?'html.pocket-native-settings-open *,html.pocket-native-settings-open *::before,html.pocket-native-settings-open *::after{animation:none!important;transition:none!important}':''}`;
    }
    function installPresentation(active,value){const style=document.createElement?.('style');if(!style)return;style.dataset.pocketNativeTheme='';style.textContent=presentationCss(value);document.head?.append?.(style);active.presentationStyle=style;}
    function installPaneTabs(active){if(active.surface!=='presets'||active.roots.length<2||!document.createElement)return;const nav=document.createElement('div');nav.dataset.pocketNativeTabs='';nav.setAttribute('role','tablist');const labels=['Generation','Formatting'];const show=index=>{active.roots.forEach((root,i)=>root.style.setProperty('display',i===index?'block':'none','important'));[...nav.children].forEach((button,i)=>button.setAttribute('aria-selected',String(i===index)));active.roots[index].focus?.({preventScroll:true});};labels.forEach((label,index)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.pocketNativeTab=label.toLowerCase();button.setAttribute('role','tab');button.addEventListener('click',()=>show(index));nav.append(button);});document.body?.append?.(nav);active.paneTabs=nav;show(0);}
    function removeGuard(active){active.guardStyle?.remove?.();active.presentationStyle?.remove?.();active.paneTabs?.remove?.();for(const name of active.guardEvents??[])document.removeEventListener?.(name,blockOutside,true);for(const name of active.keyGuardEvents??[])document.removeEventListener?.(name,blockKeyboard,true);}
    function restore(active){
        removeGuard(active);
        for(const item of active.styles){item.node.className=item.className;item.node.setAttribute('style',item.style);if(item.tabindex===null)item.node.removeAttribute('tabindex');else item.node.setAttribute('tabindex',item.tabindex);}
        document.documentElement.classList.remove('pocket-native-settings-open','pocket-native-connection','pocket-native-presets');
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
        const controls=[...(popup.querySelectorAll?.('#completion_prompt_manager_popup_close_button,#completion_prompt_manager_popup_entry_form_close,[data-dismiss],.dialogue_close,.popup-button-close')??[])],control=controls.find(node=>node.getClientRects?.().length)||controls[0];if(control){control.click?.();return true;}
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
                for(const node of roots){node.classList.remove('closedDrawer');node.classList.add('openDrawer');for(const [name,value] of [['display','block'],['visibility','visible'],['pointer-events','auto'],['position','absolute'],['inset','0'],['width','100%'],['max-width','none'],['height','100vh'],['max-height','none'],['overflow','auto'],['z-index','1']])node.style.setProperty(name,value,'important');node.setAttribute('tabindex','-1');}
                document.documentElement.classList.add('pocket-native-settings-open',`pocket-native-${argument.surface}`);
                session={id:`native-${++sequence}`,surface:argument.surface,mode:hostingMode,roots,styles,closing:false};installPresentation(session,argument.presentation);installPaneTabs(session);installGuard(session);
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
