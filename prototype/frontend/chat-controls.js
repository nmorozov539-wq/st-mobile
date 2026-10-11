import {icon} from './icons.js?build=0.7.10';

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

export function createChatControls({onBack}) {
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
    if(!history.state?.pocketNavigation){history.replaceState({pocketNavigation:'base'},'');history.pushState({pocketNavigation:'app'},'');}
    window.addEventListener('popstate',()=>{const handled=dismiss()||onBack();if(handled)history.pushState({pocketNavigation:'app'},'');else if(history.state?.pocketNavigation==='base')history.back();});
    return {openFan,close,dismiss};
}
