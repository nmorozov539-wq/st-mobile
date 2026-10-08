import {selectPreset,changePresetGeneration,resetPresetToGlobal} from './preset-state.js?build=0.7.2';
import {revision} from './journal.js?build=0.7.2';

export function effectiveSettings(value) {
    const preset=value.chat?.enabled&&value.chat.copy?{scope:'chat',copy:structuredClone(value.chat.copy)}:
        value.character?.enabled&&value.character.copy?{scope:'character',copy:structuredClone(value.character.copy)}:
        {scope:'global',copy:structuredClone(value.global)};
    let modelScope='global',model=value.global.model;
    for(const scope of ['chat','character']) {
        const record=value[scope],selection=record?.modelSelection??{enabled:record?.enabled,value:record?.copy?.model};
        if(selection?.enabled&&selection.value){modelScope=scope;model=selection.value;break;}
    }
    preset.copy.model=model;
    return {...preset,modelScope};
}

const same=(a,b)=>!!a&&!!b&&a.characterKey===b.characterKey&&a.chatId===b.chatId;
export function projectSettings(value,origin,items) {
    const next=structuredClone(value);
    for(const item of items) {
        const a=item.argument;
        if(a.action!=='configure')continue;
        if(a.scope==='chat'&&!same(a.target,origin))continue;
        if(a.scope==='character'&&a.target?.characterKey!==origin?.characterKey)continue;
        if(a.kind==='scope'&&!same(a.target,origin))continue;
        const ensure=scope=>next[scope]??={enabled:false,copy:structuredClone(scope==='character'?next.global:next.character?.enabled?next.character.copy:next.global),modelSelection:{enabled:false,value:null}};
        if(a.kind==='scope') {
            ensure('chat').enabled=a.scope==='chat';
            if(a.scope!=='chat')ensure('character').enabled=a.scope==='character';
        }else if(['model','inheritModel'].includes(a.kind)) {
            if(a.scope==='global')next.global.model=a.value;
            else ensure(a.scope).modelSelection={...ensure(a.scope).modelSelection,enabled:a.kind==='model',...(a.kind==='model'?{value:a.value}:{})};
        }else {
            const record=a.scope==='global'?null:ensure(a.scope);
            if(record)record.enabled=a.kind!=='inheritPreset';
            const copy=record?.copy??next.global;
            if(a.kind==='reset')resetPresetToGlobal(copy,next.global);
            else if(a.kind==='preset')selectPreset(copy,a.value,a.previewGeneration??copy.generation);
            else if(a.kind==='generation')changePresetGeneration(copy,a.value,a.preset);
        }
    }
    next.effective=effectiveSettings(next);
    return next;
}

// Rebase only a component changed by our own verified preceding write. Never
// replace the whole guard with a new read that could conceal an external edit.
export function rebaseSettingsGuard(pending,applied,result) {
    if(pending.action!=='configure'||applied.action!=='configure')return pending.expected;
    const previous=JSON.parse(applied.expected),next=JSON.parse(pending.expected);
    for(const guard of [previous,next])for(const field of ['char','chat'])if(guard[field])guard[field].modelSelection??={enabled:!!guard[field].enabled&&!!guard[field].copy?.model,value:guard[field].copy?.model??null};
    const affected=applied.kind==='scope'?['chat',...(applied.scope!=='chat'?['character']:[])]:[applied.scope];
    for(const scope of affected) {
        const field=scope==='character'?'char':scope;
        const matches=scope==='global'||scope==='character'&&pending.target?.characterKey===applied.target?.characterKey||scope==='chat'&&same(pending.target,applied.target);
        if(matches&&revision(next[field])===revision(previous[field])) {
            if(result[scope]===undefined)delete next[field];else next[field]=structuredClone(result[scope]);
        }
    }
    return revision(next);
}
