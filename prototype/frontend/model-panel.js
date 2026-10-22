import {icon} from './icons.js?build=0.7.15';

export function createModelPanel({load,select,action,windowList,openConnection}) {
    const $=id=>document.getElementById(id),dialog=$('model-picker'),list=$('model-list'),scroller=$('model-scroll');
    let state,configuration,origin,scope='chat',loading=false,renderList;
    const text=(tag,value,className)=>{const n=document.createElement(tag);n.textContent=value;if(className)n.className=className;return n;};
    const scopeName=value=>value[0].toUpperCase()+value.slice(1);
    function expand(){const expanded=dialog.classList.toggle('expanded');$('model-expand').setAttribute('aria-label',expanded?'Collapse model picker':'Expand model picker');$('model-expand').replaceChildren(icon(expanded?'down':'up'));renderList?.();}
    function render(){
        const effective=state.effective,selection=scope==='global'?{enabled:true,value:state.global.model}:state[scope]?.modelSelection;
        for(const b of $('model-scopes').querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.scope===scope));b.disabled=loading||!origin&&b.dataset.scope!=='global';}
        $('model-target').textContent=scope==='chat'?`Chat · ${origin.chatId}`:scope==='character'?`Character · ${origin.characterName}`:'Global · default for chats without an override';
        $('model-effective').textContent=effective.copy.model||'No model selected';
        $('model-source').textContent=`From ${scopeName(effective.modelScope)}`;
        const stronger=['global','character','chat'].indexOf(effective.modelScope)>['global','character','chat'].indexOf(scope);
        $('model-note').textContent=stronger?`This chat has a ${effective.modelScope} model override. Your ${scope} choice is still remembered.`:'';
        $('model-inherit').hidden=scope==='global';$('model-inherit').disabled=loading;
        $('model-inherit').setAttribute('aria-pressed',String(!selection?.enabled));
        $('model-inherit').textContent=scope==='chat'?'Use character / global selection':'Use global selection';
        const models=[...configuration.models];
        for(const id of [selection?.value,effective.copy.model])if(id&&!models.some(m=>m.id===id))models.unshift({id,name:id,unavailable:true});
        list.replaceChildren();
        renderList=windowList(list,models,model=>{
            const b=document.createElement('button');b.className='model-row';b.disabled=loading||!!model.unavailable;b.setAttribute('aria-label',model.unavailable?`${model.id} · unavailable on this connection`:`Select ${model.name}`);b.setAttribute('aria-pressed',String(!!selection?.enabled&&model.id===selection.value));
            const symbol=text('span','','model-symbol');symbol.append(icon('model'));const name=text('span',model.name,'model-row-text');name.append(text('small',model.id+(model.unavailable?' · saved, unavailable on this connection':'')));b.append(symbol,name,text('span',selection?.enabled&&model.id===selection.value?'✓':''));
            b.onclick=()=>action(()=>choose('model',model.id));return b;
        },68,scroller);
        $('model-empty').hidden=!!configuration.models.length;
        $('model-empty').textContent=configuration.models.length?'':'No available models were returned by this connection. Saved selections are retained.';
        $('model-connect').hidden=!!configuration.models.length;
    }
    async function choose(kind,value){
        if(loading)return;loading=true;render();$('model-feedback').textContent='Saving selection…';
        try{const result=await select(kind,value,scope,origin);state=result.state;configuration=result.configuration;$('model-feedback').textContent=result.pending?'Selection pending until the engine finishes.':'Selection saved';}
        catch(e){$('model-feedback').textContent=e.message;throw e;}
        finally{loading=false;render();}
    }
    $('model-expand').onclick=$('model-handle').onclick=expand;
    let startY,suppress=false;
    $('model-handle').addEventListener('pointerdown',e=>{startY=e.clientY;$('model-handle').setPointerCapture(e.pointerId);});
    $('model-handle').addEventListener('pointerup',e=>{if(Math.abs(e.clientY-startY)>30){suppress=true;if((e.clientY<startY)!==dialog.classList.contains('expanded'))expand();}});
    $('model-handle').addEventListener('click',e=>{if(suppress){suppress=false;e.stopImmediatePropagation();}},true);
    for(const b of $('model-scopes').querySelectorAll('button'))b.onclick=()=>{scope=b.dataset.scope;$('model-feedback').textContent='';scroller.scrollTop=0;render();};
    $('model-inherit').onclick=()=>action(()=>choose('inheritModel'));
    $('model-connect').onclick=()=>{dialog.close();action(openConnection);};
    return {
        async open(value){origin=value;scope=value?'chat':'global';$('model-feedback').textContent='Loading models…';dialog.showModal();$('model-chip').setAttribute('aria-expanded','true');
            list.replaceChildren();$('model-empty').hidden=true;$('model-inherit').hidden=true;
            for(const b of $('model-scopes').querySelectorAll('button'))b.disabled=true;
            try{const result=await load(origin);state=result.state;configuration=result.configuration;$('model-feedback').textContent='';render();}
            catch(e){$('model-feedback').textContent=e.message;throw e;}
        },
        update(value){if(!dialog.open||!state)return;state=value;render();},
    };
}
