import {icon} from './icons.js?build=0.9.2';

export function generationDuration(message) {
    if(message.is_user||!message.gen_started||!message.gen_finished)return null;
    const start=new Date(message.gen_started).getTime(),finish=new Date(message.gen_finished).getTime();
    if(!Number.isFinite(start)||!Number.isFinite(finish)||finish<start)return null;
    return `${((finish-start)/1000).toFixed(1)}s`;
}
export function alternativeIntent(message,index,count,direction) {
    if(!message||message.is_user||message.is_system&&!message.extra?.sc_ghosted)return null;
    const total=message.swipes?.length??1,current=message.swipe_id??0;
    if(direction>0&&current===total-1&&index===count-1&&index>0&&!message.is_system)return {generate:true};
    if(total<2)return null;
    return {swipeId:(current+direction+total)%total};
}

export function createChatControls({onBack,atRoot=()=>false}) {
    const $=id=>document.getElementById(id);
    const dialogs=[...document.querySelectorAll('dialog')];
    let restoreFocus,explanationTimer;
    const viewport=()=>{const v=window.visualViewport;return {left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};};
    function close(dialog,focus=true){if(!dialog.open)return;dialog.close();if(focus&&dialog.classList.contains('menu-dialog')&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});}
    // Long-press on any icon-only button shows its name. Delegated, so it
    // covers buttons created later too. A hold suppresses the click it ends.
    const iconOnly=node=>{const b=node?.closest?.('button,[role=button]');return b&&!b.disabled&&!b.textContent.trim()&&(b.title||b.getAttribute('aria-label'))?b:null;};
    let hold=null,suppress=null;
    function showLabel(button){const label=$('icon-explanation');(button.closest('dialog')??document.body).append(label);label.textContent=button.title||button.getAttribute('aria-label');label.hidden=false;clearTimeout(explanationTimer);explanationTimer=setTimeout(()=>label.hidden=true,3500);}
    document.addEventListener('pointerdown',e=>{clearTimeout(hold?.timer);hold=null;const target=iconOnly(e.target);if(!target)return;hold={target,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{suppress=target;showLabel(target);},550)};},true);
    document.addEventListener('pointermove',e=>{if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>10){clearTimeout(hold.timer);hold=null;}},true);
    for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>{clearTimeout(hold?.timer);hold=null;},true);
    document.addEventListener('click',e=>{if(suppress&&suppress.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}suppress=null;},true);
    document.addEventListener('contextmenu',e=>{if(iconOnly(e.target))e.preventDefault();},true);
    for(const node of document.querySelectorAll('[data-icon]'))node.replaceChildren(icon(node.dataset.icon));
    const dismiss=()=>{const open=dialogs.filter(d=>d.open).at(-1);if(open){const event=new Event('stm-back',{cancelable:true});if(open.dispatchEvent(event))close(open);return true;}return false;};
    for(const dialog of dialogs) {
        dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(dialog.classList.contains('menu-dialog')||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(dialog);});
        dialog.addEventListener('cancel',()=>{if(dialog.classList.contains('menu-dialog')&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});});
        dialog.addEventListener('close',()=>{for(const trigger of document.querySelectorAll('[aria-controls]'))if(trigger.getAttribute('aria-controls')===dialog.id)trigger.setAttribute('aria-expanded','false');$('icon-explanation').hidden=true;document.querySelectorAll('.menu-selected').forEach(n=>n.classList.remove('menu-selected'));});
    }
    // Drop-down menus: right-aligned under their trigger, or above it when
    // the space below runs out; always inside the visible viewport.
    function placeMenu(dialog,trigger){
        const v=viewport(),r=trigger.getBoundingClientRect(),menu=dialog.querySelector('.drop-menu');
        menu.style.maxHeight=`${Math.max(160,v.height-16)}px`;
        const width=menu.offsetWidth,height=menu.offsetHeight;
        const left=Math.max(v.left+8,Math.min(v.left+v.width-width-8,r.right-width));
        const below=r.bottom+4+height<=v.top+v.height-8;
        const top=below?r.bottom+4:Math.max(v.top+8,r.top-4-height);
        menu.style.left=`${left}px`;menu.style.top=`${top}px`;
    }
    function openMenu(id,trigger){const d=$(id);if(d.open){close(d);return;}restoreFocus=trigger;d.showModal();placeMenu(d,trigger);trigger.setAttribute('aria-expanded','true');d.querySelector('button:not([hidden]):not(:disabled)')?.focus({preventScroll:true});}
    const resize=()=>{for(const d of dialogs.filter(d=>d.open&&d.classList.contains('menu-dialog')))if(restoreFocus?.isConnected)placeMenu(d,restoreFocus);};
    window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
    // A browser-history sentinel lets Android/browser Back dismiss UI before
    // leaving the app. Keyboard Back may first be handled by Android's IME.
    // Chrome skips history entries that were added without a user gesture, so
    // entries are only pushed while the user is interacting: on each forward
    // navigation, each opened dialog, and (owed) on the next tap after a Back
    // that stayed inside the app. Extra entries are harmless; missing ones
    // would let Back leave the app from a sub-page.
    //
    // Where the browser has CloseWatcher (Chrome 120+, so every current
    // Android Chrome), Back is taken by a watcher instead: Chrome still marks
    // pushed entries as skippable on its own heuristics, and one Back could
    // then jump past several pages and leave the app. A watcher is armed
    // whenever the app is off Home or a dialog is open, and re-armed after
    // each Back it handles. Back closes the top dialog first, as before.
    const watching=typeof window.CloseWatcher==='function';
    let watcher=null,syncQueued=false;
    function sync(){
        if(!watching||syncQueued)return;
        syncQueued=true;
        queueMicrotask(()=>{
            syncQueued=false;
            if(atRoot()&&!dialogs.some(d=>d.open)){watcher?.destroy();watcher=null;return;}
            if(watcher)return;
            try{watcher=new CloseWatcher();}catch{watcher=null;return;}
            const own=watcher;
            // A dialog opened without a tap shares this watcher's group, so
            // one Back closes both; that Back belongs to the dialog alone.
            // Its native close runs first, before the dialog's close event.
            own.onclose=()=>{if(watcher===own)watcher=null;if([...shown].some(d=>!d.open)){sync();return;}backing=true;try{dismiss()||onBack();}finally{backing=false;}sync();};
        });
    }
    const shown=new Set();
    for(const dialog of dialogs)dialog.addEventListener('close',sync);
    let backing=false,owed=0;
    const push=()=>{if(!watching)history.pushState({stmNavigation:'app'},'');};
    const pay=()=>{for(;owed>0;owed--)push();};
    for(const type of ['pointerdown','keydown'])window.addEventListener(type,pay,true);
    const showModal=HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal=function(...args){const result=showModal.apply(this,args);if(!shown.has(this)){shown.add(this);this.addEventListener('close',()=>shown.delete(this),{once:true});}if(!backing)push();sync();return result;};
    if(!history.state?.stmNavigation)history.replaceState({stmNavigation:'base'},'');
    window.addEventListener('popstate',()=>{backing=true;let handled;try{handled=dismiss()||onBack();}finally{backing=false;}if(handled)owed++;else history.back();});
    return {openMenu,close,dismiss,sync,step(){if(!backing)push();}};
}
