import {icon} from './icons.js?build=0.7.15';

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
    function close(dialog,focus=true){if(!dialog.open)return;dialog.close();if(focus&&dialog.classList.contains('fan-dialog')&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});}
    function explain(button){
        let held=false,timer;
        button.addEventListener('pointerdown',()=>{held=false;timer=setTimeout(()=>{held=true;button.closest('dialog')?.append($('icon-explanation'));$('icon-explanation').textContent=button.title;$('icon-explanation').hidden=false;clearTimeout(explanationTimer);explanationTimer=setTimeout(()=>$('icon-explanation').hidden=true,3500);},550);});
        for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,()=>clearTimeout(timer));
        button.addEventListener('click',e=>{if(held){e.preventDefault();e.stopImmediatePropagation();held=false;}},true);
    }
    for(const button of document.querySelectorAll('[data-icon]')){button.replaceChildren(icon(button.dataset.icon));if(button.title)explain(button);}
    const dismiss=()=>{const open=dialogs.filter(d=>d.open).at(-1);if(open){const event=new Event('pocket-back',{cancelable:true});if(open.dispatchEvent(event))close(open);return true;}return false;};
    for(const dialog of dialogs) {
        dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(dialog.classList.contains('fan-dialog')||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(dialog);});
        dialog.addEventListener('cancel',()=>{if(dialog.classList.contains('fan-dialog')&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});});
        dialog.addEventListener('close',()=>{for(const trigger of document.querySelectorAll('[aria-controls]'))if(trigger.getAttribute('aria-controls')===dialog.id)trigger.setAttribute('aria-expanded','false');$('icon-explanation').hidden=true;document.querySelectorAll('.fan-selected').forEach(n=>n.classList.remove('fan-selected'));});
    }
    function placeFan(dialog,trigger,type) {
        const v=viewport(),r=trigger.getBoundingClientRect(),fan=dialog.querySelector('.curved-fan');
        const buttons=[...fan.querySelectorAll('button')].filter(b=>!b.hidden);
        const points=type==='gear'?[[0,0],[34,48],[88,68]]:[[0,0],[10,50],[38,92],[80,120],[130,130],[180,120]];
        const width=(type==='gear'?136:buttons.length>5?228:178)+2,height=type==='gear'?118:180;
        const left=Math.max(v.left+8,Math.min(v.left+v.width-width-8,r.right-width));
        const below=r.top+height+8<v.top+v.height;
        const top=Math.max(v.top+8,Math.min(v.top+v.height-height-8,type==='gear'?r.bottom+8:below?r.top:r.top-height+48));
        fan.style.left=`${left}px`;fan.style.top=`${top}px`;fan.style.width=`${width}px`;fan.style.height=`${height}px`;
        buttons.forEach((b,i)=>{b.style.left=`${points[i][0]}px`;b.style.top=`${type==='message'&&!below?height-48-points[i][1]:points[i][1]}px`;});
    }
    function openFan(id,trigger,type){const d=$(id);if(d.open){close(d);return;}restoreFocus=trigger;d.showModal();placeFan(d,trigger,type);trigger.setAttribute('aria-expanded','true');d.querySelector('button:not([hidden]):not(:disabled)')?.focus({preventScroll:true});}
    const resize=()=>{for(const d of dialogs.filter(d=>d.open&&d.classList.contains('fan-dialog')))if(restoreFocus?.isConnected)placeFan(d,restoreFocus,d.id==='chat-settings'?'gear':'message');};
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
    const push=()=>{if(!watching)history.pushState({pocketNavigation:'app'},'');};
    const pay=()=>{for(;owed>0;owed--)push();};
    for(const type of ['pointerdown','keydown'])window.addEventListener(type,pay,true);
    const showModal=HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal=function(...args){const result=showModal.apply(this,args);if(!shown.has(this)){shown.add(this);this.addEventListener('close',()=>shown.delete(this),{once:true});}if(!backing)push();sync();return result;};
    if(!history.state?.pocketNavigation)history.replaceState({pocketNavigation:'base'},'');
    window.addEventListener('popstate',()=>{backing=true;let handled;try{handled=dismiss()||onBack();}finally{backing=false;}if(handled)owed++;else history.back();});
    return {openFan,close,dismiss,sync,step(){if(!backing)push();}};
}
