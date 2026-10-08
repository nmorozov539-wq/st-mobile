import {icon} from './icons.js?build=0.7.1';
import {presetOrder,setPromptEnabled} from './preset-order.js?build=0.7.1';
import {revision} from './journal.js?build=0.7.1';

const triggers=[['normal','Normal reply'],['swipe','New alternative'],['continue','Continue'],['regenerate','Regenerate'],['impersonate','Impersonate'],['quiet','Quiet generation']];
const labels={temperature:'Temperature',openai_max_tokens:'Reply token limit',openai_max_context:'Context token budget',top_p:'Top P'};
export function createPresetPanel({load,change,action,available}) {
    const $=id=>document.getElementById(id),dialog=$('preset-panel');
    const node=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
    let origin,scope,state,configuration,fields=[],view='main',busy=false,entry,entryBase,entryCopy,feedback='';
    const copy=()=>scope==='global'?state.global:state[scope]?.copy??(scope==='character'?state.global:state.character?.enabled?state.character.copy:state.global);
    function show(next){view=next;for(const name of ['main','picker','editor'])$('preset-'+name).hidden=name!==next;$('preset-heading').textContent=next==='picker'?'Choose preset':next==='editor'?'Edit entry':'Preset';$('preset-scroll').scrollTop=0;}
    function lock(){for(const n of dialog.querySelectorAll('input,select,textarea,button'))if(n.id!=='preset-back'&&n.id!=='entry-cancel')n.disabled=busy||!state||!available();for(const n of $('preset-scopes').querySelectorAll('button'))n.disabled=busy||!origin&&n.dataset.scope!=='global';for(const b of $('preset-list').querySelectorAll('button'))if(!configuration?.presets.includes(b.dataset.preset))b.disabled=true;if(entry?.marker)$('entry-role').disabled=true;for(const b of $('preset-entries').querySelectorAll('button'))if(b.dataset.missing==='true')b.disabled=true;}
    async function refresh(){const result=await load(origin);state=result.state;configuration=result.configuration;fields=result.fields;}
    async function save(kind,value,expectedPreset=copy().preset){
        if(busy||!available())return false;
        busy=true;feedback='Saving…';lock();$('preset-status').textContent=feedback;
        try{const result=await change(kind,value,scope,origin,expectedPreset);state=result.state;configuration=result.configuration;fields=result.fields;feedback=result.pending?'Changes pending until the engine finishes.':'Changes saved';return true;}
        catch(e){feedback=e.message;throw e;}
        finally{busy=false;render();}
    }
    function generationField(name,value){
        const wrap=node('label',labels[name]??name.replaceAll('_',' '),'preset-field');
        const input=node(typeof value==='object'||typeof value==='string'&&value.length>100?'textarea':'input');
        input.dataset.setting=name;input.setAttribute('aria-label',labels[name]??name.replaceAll('_',' '));
        if(input.tagName==='INPUT'){input.type=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':'text';input.step='any';if(input.type==='checkbox')input.checked=value;else input.value=value??'';}
        else input.value=typeof value==='object'?JSON.stringify(value,null,2):value;
        if(name==='temperature'){input.min='0';input.max='2';}
        if(['openai_max_tokens','openai_max_context'].includes(name)){input.min='1';input.step='1';}
        const preset=copy().preset,capturedScope=scope;let last=input.type==='checkbox'?input.checked:input.value;
        input.onchange=()=>action(async()=>{
            const raw=input.type==='checkbox'?input.checked:input.value;if(raw===last)return;
            if(input.checkValidity&&!input.checkValidity()){input.reportValidity();return;}
            let next;try{next=typeof value==='object'?JSON.parse(raw):typeof value==='number'?Number(raw):raw;}catch{feedback='Enter valid JSON for '+name;renderStatus();return;}
            if(typeof value==='number'&&(!raw.trim()||!Number.isFinite(next))){feedback='Enter a finite number for '+name;renderStatus();return;}
            if(capturedScope!==scope)return;
            last=raw;await save('generation',{[name]:next},preset);
        });wrap.append(input);return wrap;
    }
    function renderStatus(){$('preset-status').textContent=feedback;}
    function render(){
        if(!state){renderStatus();lock();return;}
        const selected=copy(),record=scope==='global'?null:state[scope],inherited=!!record&&!record.enabled||scope!=='global'&&!record;
        for(const b of $('preset-scopes').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.scope===scope));
        const stronger=['global','character','chat'].indexOf(state.effective.scope)>['global','character','chat'].indexOf(scope);
        $('scope-note').textContent=(scope==='chat'?`Chat · ${origin.chatId}`:scope==='character'?`Character · ${origin.characterName}`:'Global · defaults for chats without overrides')+(inherited?' · Inheriting; choosing or editing creates a separate preset.':'')+(stronger?` · This chat currently uses its ${state.effective.scope} preset override.`:'');
        $('preset-inherit').hidden=scope==='global';$('preset-inherit').textContent=scope==='chat'?'Use character / global preset':'Use global preset';$('preset-inherit').setAttribute('aria-pressed',String(inherited));
        $('preset-name').textContent=selected.preset??'No preset selected';
        const remembered=selected.presetBank?.some(item=>item.preset===selected.preset);
        $('preset-modified').textContent=!configuration.presets.includes(selected.preset)?'Saved selection · native preset unavailable':remembered?'Scope adjustments remembered':inherited?'Inherited settings · retained local choices remain saved':'Current scope settings';
        $('preset-fields').replaceChildren();const data=selected.generation??{};
        for(const name of ['temperature','openai_max_tokens','openai_max_context','top_p'])if(Object.hasOwn(data,name))$('preset-fields').append(generationField(name,data[name]));
        const advanced=node('details');advanced.append(node('summary','More generation parameters'));
        const allowed=new Set(fields.map(f=>f.name));
        for(const [name,value]of Object.entries(data))if(allowed.has(name)&&!['prompts','prompt_order',...Object.keys(labels)].includes(name))advanced.append(generationField(name,value));
        if(scope!=='global'){const reset=node('button','Reset this preset scope to Global');reset.onclick=()=>action(async()=>{if(confirm(`Replace the current ${scope} preset and adjustments for ${scope==='chat'?origin.chatId:origin.characterName} with Global settings? Other remembered presets and model selection are kept.`))await save('reset');});advanced.append(reset);}$('preset-fields').append(advanced);
        const order=presetOrder(data),prompts=data.prompts??[],ids=[...order.map(r=>r.identifier),...prompts.map(p=>p.identifier).filter(id=>!order.some(r=>r.identifier===id))];
        $('preset-count').textContent=`${ids.length} entries`;$('preset-entries').replaceChildren();
        for(const id of ids){const prompt=prompts.find(p=>p.identifier===id),enabled=order.find(r=>r.identifier===id)?.enabled===true,row=node('div','','preset-entry'+(enabled?'':' off')),open=node('button','','preset-entry-name'),text=node('span',prompt?.name??id);open.append(text,icon('right'));open.dataset.missing=String(!prompt);open.disabled=!prompt;open.onclick=()=>openEntry(id);
            const label=node('label','','preset-toggle'),toggle=node('input');toggle.type='checkbox';toggle.checked=enabled;toggle.setAttribute('aria-label',`Enable ${prompt?.name??id}`);toggle.onchange=()=>action(async()=>{const value=structuredClone(copy().generation);setPromptEnabled(value,100001,id,toggle.checked);await save('generation',{prompt_order:value.prompt_order});});label.append(toggle);row.append(open,label);$('preset-entries').append(row);}
        $('preset-list').replaceChildren();const names=[...configuration.presets];for(const saved of selected.presetBank??[])if(!names.includes(saved.preset))names.push(saved.preset);if(selected.preset&&!names.includes(selected.preset))names.unshift(selected.preset);
        for(const name of names){const b=node('button','','preset-choice'),text=node('span',name),saved=selected.presetBank?.some(item=>item.preset===name),missing=!configuration.presets.includes(name);text.append(node('small',missing?'Saved selection · unavailable':saved?'Scope adjustments remembered':'Saved ST preset'));b.append(text,node('span',name===selected.preset?'✓':''));b.setAttribute('aria-pressed',String(name===selected.preset));b.disabled=missing;b.dataset.preset=name;b.onclick=()=>action(async()=>{if(await save('preset',name)){show('main');render();}});$('preset-list').append(b);}
        renderStatus();lock();for(const b of $('preset-list').querySelectorAll('button'))if(!configuration.presets.includes(b.dataset.preset))b.disabled=true;
    }
    function behavior(){$('entry-depth-fields').hidden=$('entry-position').value!=='1';$('entry-triggers').hidden=$('entry-all').checked;}
    function openEntry(id){
        entryCopy=structuredClone(copy());entry=entryCopy.generation.prompts.find(p=>p.identifier===id);entryBase=structuredClone(entry);if(!entry)return;
        $('entry-name').value=entry.name??id;for(const [field,value]of [['entry-role',entry.role??'system'],['entry-position',String(entry.injection_position??0)]]){const select=$(field);for(const option of [...select.querySelectorAll('[data-retained]')])option.remove();if(![...select.options].some(o=>o.value===value)){const option=node('option',value+' · saved value');option.value=value;option.dataset.retained='true';select.append(option);}}$('entry-role').value=entry.role??'system';$('entry-text').value=entry.content??'';$('entry-text-field').hidden=!!entry.marker;$('entry-marker').hidden=!entry.marker;
        $('entry-position').value=String(entry.injection_position??0);$('entry-depth').value=entry.injection_depth??4;$('entry-order').value=entry.injection_order??100;$('entry-all').checked=!entry.injection_trigger?.length;
        $('entry-triggers').replaceChildren();for(const [value,name]of [...triggers,...(entry.injection_trigger??[]).filter(value=>!triggers.some(t=>t[0]===value)).map(value=>[value,value+' · saved trigger'])]){const label=node('label',name,'preset-check'),input=node('input');input.type='checkbox';input.value=value;input.checked=entry.injection_trigger?.includes(value)??false;label.prepend(input);$('entry-triggers').append(label);}
        $('entry-protection').hidden=!['main','jailbreak'].includes(id);$('entry-protect').checked=!!entry.forbid_overrides;$('entry-behavior').open=false;$('entry-error').textContent='';behavior();show('editor');lock();
    }
    $('entry-position').onchange=$('entry-all').onchange=behavior;
    $('entry-cancel').onclick=()=>{show('main');render();};
    $('entry-apply').onclick=()=>action(async()=>{
        const prompt=structuredClone(entry),set=(field,value,fallback)=>{if(revision(value)!==revision(entryBase[field]??fallback))prompt[field]=value;};
        if(!$('entry-name').value.trim()){$('entry-error').textContent='Enter an entry name.';return;}
        set('name',$('entry-name').value,entry.identifier);
        if(!entry.marker){set('role',$('entry-role').value,'system');set('content',$('entry-text').value,'');}
        if($('entry-position').value!==String(entryBase.injection_position??0))set('injection_position',Number($('entry-position').value),0);
        if($('entry-position').value==='1'){for(const id of ['entry-depth','entry-order'])if(!$(id).reportValidity()||!$(id).value.trim())return;if($('entry-depth').value!==String(entryBase.injection_depth??4))set('injection_depth',Number($('entry-depth').value),4);if($('entry-order').value!==String(entryBase.injection_order??100))set('injection_order',Number($('entry-order').value),100);}
        const chosen=[...$('entry-triggers').querySelectorAll('input:checked')].map(n=>n.value);
        if(!$('entry-all').checked&&!chosen.length){$('entry-error').textContent='Choose a generation type, or use All generation types.';return;}
        const nextTriggers=$('entry-all').checked?[]:chosen;if(revision([...nextTriggers].sort())!==revision([...(entryBase.injection_trigger??[])].sort()))set('injection_trigger',nextTriggers,[]);
        if(!$('entry-protection').hidden)set('forbid_overrides',$('entry-protect').checked,false);
        const current=copy();if(current.preset!==entryCopy.preset||revision(current.generation.prompts.find(p=>p.identifier===entry.identifier))!==revision(entryBase)){$('entry-error').textContent='This entry changed. Cancel and reopen it before saving.';return;}
        const prompts=structuredClone(current.generation.prompts),index=prompts.findIndex(p=>p.identifier===entry.identifier);prompts[index]=prompt;
        if(await save('generation',{prompts},entryCopy.preset)){show('main');render();}
    });
    for(const b of $('preset-scopes').querySelectorAll('button'))b.onclick=()=>{scope=b.dataset.scope;feedback='';render();};
    $('preset-choose').onclick=()=>{show('picker');render();};
    $('preset-inherit').onclick=()=>action(()=>save('inheritPreset'));
    $('preset-back').onclick=()=>{if(view==='main')dialog.close();else{show('main');render();}};
    dialog.addEventListener('cancel',e=>{if(view!=='main'){e.preventDefault();show('main');render();}});
    dialog.addEventListener('pocket-back',e=>{if(view!=='main'){e.preventDefault();show('main');render();}});
    return {setAvailable(){lock();},async open(value){origin=value;state=null;configuration=null;$('preset-fields').replaceChildren();$('preset-entries').replaceChildren();$('preset-list').replaceChildren();$('preset-name').textContent='';scope=origin?'chat':'global';feedback='Loading presets…';dialog.showModal();show('main');busy=true;lock();renderStatus();try{await refresh();feedback='';}catch(e){feedback=e.message;throw e;}finally{busy=false;render();}},update(value,pending){if(!dialog.open||!state)return;state=value;if(view==='main')render();if(pending!==undefined){feedback=pending?'Changes pending until the engine finishes.':'Changes saved';renderStatus();}}};
}
