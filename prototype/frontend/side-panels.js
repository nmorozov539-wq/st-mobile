// Side panels opened by a horizontal swipe that starts on the chat header or
// composer: model and preset slide in from the right (swipe left), persona
// from the left (swipe right). Swipes on messages stay for
// alternate replies, and swipes from the screen edge stay Android's Back,
// so a swipe that starts within EDGE px of either edge is ignored.
export const EDGE=24,START=18,OPEN=60;
/** Which panel a finished horizontal drag opens, or null. */
export function swipeSide(dx,dy,{velocity=0}={}){
    if(Math.abs(dx)<START||Math.abs(dx)<Math.abs(dy)*1.6)return null;
    if(Math.abs(dx)<OPEN&&Math.abs(velocity)<.5)return null;
    return dx<0?'right':'left';
}
export function createSidePanels({zones,panels,canOpen=()=>true,onOpen=()=>{}}){
    let drag=null,suppress=false;
    const width=panel=>panel.querySelector('.side-sheet').getBoundingClientRect().width||320;
    const setOffset=(panel,x)=>{panel.querySelector('.side-sheet').style.transform=x?`translateX(${x}px)`:'';panel.style.setProperty('--side-fade',String(1-Math.min(1,Math.abs(x)/width(panel))));};
    function open(side,{animate=true}={}){
        const panel=panels[side];if(!panel||!canOpen())return;
        onOpen(side,panel);if(!panel.open)panel.showModal();
        panel.classList.toggle('animating',animate);setOffset(panel,0);
        panel.querySelector('button:not([hidden]):not(:disabled)')?.focus({preventScroll:true});
    }
    function startDrag(e){
        if(e.pointerType!=='touch'||!canOpen()||e.clientX<EDGE||e.clientX>innerWidth-EDGE)return;
        const t=e.target;if(t.closest('textarea')&&document.activeElement===t.closest('textarea'))return;
        drag={x:e.clientX,y:e.clientY,at:performance.now(),side:null,panel:null};
    }
    function moveDrag(e){
        if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!drag.side){
            if(Math.abs(dy)>START&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}
            if(Math.abs(dx)<START||Math.abs(dx)<Math.abs(dy)*1.6)return;
            drag.side=dx<0?'right':'left';drag.panel=panels[drag.side];
            onOpen(drag.side,drag.panel);if(!drag.panel.open)drag.panel.showModal();
            drag.panel.classList.remove('animating');drag.w=width(drag.panel);
        }
        e.preventDefault();
        const reveal=Math.min(drag.w,Math.max(0,drag.side==='right'?-dx:dx));
        setOffset(drag.panel,(drag.side==='right'?1:-1)*(drag.w-reveal));
    }
    function endDrag(e){
        const d=drag;drag=null;if(!d?.side)return;
        suppress=true;setTimeout(()=>suppress=false,0);
        const dx=e.clientX-d.x,velocity=dx/Math.max(1,performance.now()-d.at);
        d.panel.classList.add('animating');
        if(swipeSide(dx,e.clientY-d.y,{velocity})===d.side)open(d.side);
        else{setOffset(d.panel,(d.side==='right'?1:-1)*d.w);setTimeout(()=>{if(d.panel.open)d.panel.close();setOffset(d.panel,0);},180);}
    }
    for(const zone of zones){zone.addEventListener('pointerdown',startDrag);zone.style.touchAction='pan-y';}
    window.addEventListener('pointermove',moveDrag,{passive:false});
    window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',()=>{if(drag?.panel?.open){drag.panel.close();setOffset(drag.panel,0);}drag=null;});
    // A swipe never also taps the button it started on.
    for(const zone of zones)zone.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();}},true);
    // Swiping a panel back toward its edge closes it.
    for(const [side,panel] of Object.entries(panels)){
        let back=null;
        panel.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')back={x:e.clientX,y:e.clientY};});
        panel.addEventListener('click',e=>{if(e.target===panel)panel.close();});
        panel.addEventListener('pointerup',e=>{if(!back)return;const dx=e.clientX-back.x,dy=e.clientY-back.y;back=null;if(Math.abs(dx)>OPEN&&Math.abs(dx)>Math.abs(dy)*1.6&&(side==='right'?dx>0:dx<0))panel.close();});
    }
    return {open,close(){for(const p of Object.values(panels))if(p.open)p.close();}};
}
