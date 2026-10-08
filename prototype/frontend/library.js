import {createCharacterActions} from './character-actions.js?build=0.7.3';
import {createCharacterEditor} from './character-editor.js?build=0.7.3';
import { presetOrder, setPromptEnabled } from './preset-order.js?build=0.7.3';
export function createLibrary({rpc,action,refresh,locked,format,converter,sanitize,refreshAvailability=async()=>{},onDeleted=()=>{},onEditor=()=>{}}) {
    const $=id=>document.getElementById(id);
    const character=createCharacterEditor({format,converter,sanitize});
    const backEditor=event=>{if(kind!=='characters')return;if(cardActions.back()){event.preventDefault();return;}if(character.back()){event.preventDefault();renderEditor();}};
    $('asset-editor').addEventListener('pocket-back',backEditor);$('asset-editor').addEventListener('cancel',backEditor);
    window.addEventListener('keydown',event=>{if(event.key!=='Escape'||kind!=='characters'||[...document.querySelectorAll('dialog')].filter(dialog=>dialog.open).at(-1)!==$('asset-editor'))return;event.preventDefault();event.stopPropagation();if(event.repeat)return;const back=new Event('pocket-back',{cancelable:true});if($('asset-editor').dispatchEvent(back))$('asset-editor').close();},true);
    const cancel=document.createElement('button');cancel.id='cancel-character';cancel.textContent='Cancel';cancel.onclick=()=>$('asset-editor').close();const savebar=document.createElement('div');savebar.id='character-savebar';$('save-asset').before(savebar);savebar.append(cancel,$('save-asset'));
    let kind='characters',rows=[],key=null,revision=null,draft={},portrait, uncertain=false, invalid=false, orderId=100001,lastLocked=true,allowDrafts=false;
    const cardActions=createCharacterActions({rpc,refresh,onDeleted,action,readState:()=>({key,revision,name:revision?JSON.parse(revision).name:draft.name,dirty:!!portrait||JSON.stringify(draft)!==revision,busy:lastLocked&&allowDrafts,unavailable:lastLocked&&!allowDrafts})});
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    function field(parent,label,value,update,{type,rows=4}={}){
        const wrapper=node('label',label),input=node(['boolean','number','text'].includes(type)?'input':'textarea');
        if(type==='boolean'){input.type='checkbox';input.checked=!!value;}
        else if(type==='number'){input.type='number';input.step='any';input.value=value??0;}
        else {if(type==='text')input.type='text';else input.rows=rows;input.value=value??'';}
        input.oninput=()=>{update(type==='boolean'?input.checked:type==='number'?Number(input.value):input.value);syncJSON();};
        wrapper.append(input);parent.append(wrapper);
    }
    const labels={temperature:'Temperature',openai_max_tokens:'Maximum reply tokens',openai_max_context:'Context token budget',stream_openai:'Stream replies',top_p:'Top P',frequency_penalty:'Frequency penalty',presence_penalty:'Presence penalty'};
    const title=s=>labels[s]??s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    function syncJSON(){$('asset-json').value=JSON.stringify(draft,null,2);cardActions.update();}
    function renderEditor(){
        const body=$('asset-fields');body.replaceChildren();$('asset-editor').querySelector('.character-modes')?.remove();$('asset-editor').querySelector('.character-actions-trigger')?.remove();$('close-asset').setAttribute('aria-label','Close library editor');$('asset-editor').classList.toggle('character-editor',kind==='characters');$('asset-editor').querySelector('h2').textContent='Edit library item';$('close-asset').textContent='×';$('save-asset').hidden=false;$('character-savebar').hidden=false;$('asset-json').closest('details').hidden=false;cancel.hidden=kind!=='characters';
        if(kind==='characters'){
            character.render({body,draft,key,changed:syncJSON,field,rerender:renderEditor,onActions:cardActions.open});
        }else if(kind==='personas'){
            field(body,'Name',draft.name,v=>draft.name=v,{rows:1});
            for(const name of ['description','title','lorebook'])field(body,title(name),draft.descriptor[name],v=>draft.descriptor[name]=v,{rows:name==='description'?5:1});
            for(const name of ['position','depth','role'])field(body,title(name),draft.descriptor[name]??0,v=>draft.descriptor[name]=v,{type:'number'});
            body.append(node('p','Position: 0 in prompt, 2 above author note, 3 below author note, 4 at depth, 9 disabled. Role: 0 system, 1 user, 2 assistant. Use ST’s advanced editor for persona connections.'));
        }else{
            field(body,'Preset name (a new name saves a copy)',draft.name,v=>draft.name=v,{rows:1});
            body.append(node('p','Save the native preset file here. Pocket configuration copies stay independent; selecting the preset reloads its saved contents. Prompt text can contain message-length and word-count instructions.'));
            const data=draft.preset;
            const extra=node('details');extra.append(node('summary','Other preset parameters and connection settings'));
            for(const [name,value] of Object.entries(data))if(['number','boolean','string'].includes(typeof value))field(Object.hasOwn(labels,name)?body:extra,title(name),value,v=>data[name]=v,{type:typeof value,rows:typeof value==='string'&&value.length>100?4:1});
            body.append(extra);
            const groups=data.prompt_order??[];
            if(!groups.some(g=>String(g.character_id)===String(orderId)))orderId=groups.find(g=>String(g.character_id)==='100001')?.character_id??groups[0]?.character_id??100001;
            const scope=node('label','Prompt order');const select=node('select');
            for(const group of groups.length?groups:[{character_id:100001}]){const option=node('option',String(group.character_id)==='100001'?'Active ST chat-completion order':`Other saved order · ${group.character_id}`);option.value=group.character_id;select.append(option);}
            select.value=String(orderId);select.onchange=()=>{orderId=select.value;renderEditor();};scope.append(select);body.append(scope);
            body.append(node('p','Each switch controls whether ST includes that entry. Save to apply your changes. Other saved orders keep their own switches.'));
            const order=presetOrder(data,orderId);
            const ids=[...order.map(r=>r.identifier),...(data.prompts??[]).map(p=>p.identifier).filter(id=>!order.some(r=>r.identifier===id))];
            for(const id of ids){
                const prompt=data.prompts?.find(p=>p.identifier===id);
                const section=node('details');section.open=false;
                const enabled=order.find(r=>r.identifier===id)?.enabled===true;
                const heading=node('summary',`${prompt?.name??id} · ${enabled?'On':'Off'}`);section.append(heading);
                const label=node('label');label.className='prompt-switch';
                const toggle=node('input');toggle.type='checkbox';toggle.checked=enabled;toggle.setAttribute('aria-label',`Enable ${prompt?.name??id}`);
                const state=node('span',enabled?'On · included':'Off · excluded');
                toggle.onchange=()=>{setPromptEnabled(data,orderId,id,toggle.checked);state.textContent=toggle.checked?'On · included':'Off · excluded';heading.textContent=`${prompt?.name??id} · ${toggle.checked?'On':'Off'}`;syncJSON();};label.append(toggle,state);section.append(label);
                if(prompt&&!prompt.marker){field(section,'Prompt text',prompt.content,v=>prompt.content=v,{rows:6});field(section,'Role',prompt.role??'system',v=>prompt.role=v,{rows:1});}
                if(typeof prompt?.injection_depth==='number')field(section,'Injection depth',prompt.injection_depth,v=>prompt.injection_depth=v,{type:'number'});
                body.append(section);
            }
        }
        if(kind!=='characters')$('asset-portrait-label').hidden=kind==='presets';syncJSON();applyLocks();
    }
    async function load(){rows=await rpc('assets',{action:'list',kind});$('asset-list').replaceChildren(...rows.map(row=>{const b=node('button',row.name);b.onclick=()=>run(async()=>{key=row.key;const result=await rpc('assets',{action:'read',kind,key});revision=result.revision;draft=kind==='presets'?{name:key,preset:result.draft}:result.draft;await showEditor();});return b;}));}
    async function showEditor(options){await refreshAvailability();openEditor(options);}
    function openEditor({fromLibrary=true}={}){cardActions.back();if(kind==='characters')character.begin(key,{fromLibrary});orderId=100001;uncertain=false;invalid=false;portrait=null;$('asset-portrait').value='';$('asset-error').textContent='';renderEditor();onEditor(kind,key);$('asset-editor').showModal();$('asset-editor').scrollTop=0;}
    async function run(fn){if(locked())return;await action(async()=>{try{await fn();}catch(e){$('library-error').textContent=e.message;$('asset-error').textContent=e.message;throw e;}});}
    $('library-button').onclick=()=>run(async()=>{await load();$('library-error').textContent='';$('library-panel').showModal();});
    $('close-library').onclick=()=>$('library-panel').close();$('close-asset').onclick=()=>{if(kind==='characters'&&cardActions.back())return;if(kind==='characters'&&character.back()){renderEditor();return;}$('asset-editor').close();};
    $('library-kind').onchange=()=>run(async()=>{kind=$('library-kind').value;await load();});
    $('new-asset').onclick=()=>run(async()=>{
        key=null;revision=null;
        if(kind==='characters')draft={name:'New character',description:'',personality:'',scenario:'',first_mes:'Hello, {{user}}.',mes_example:'',creator_notes:'',system_prompt:'',post_history_instructions:'',alternate_greetings:[],tags:[],creator:'',character_version:'',extensions:{}};
        else if(kind==='personas')draft={name:'New persona',descriptor:{description:'',title:'',position:0,depth:2,role:0,lorebook:'',connections:[]}};
        else {const config=await rpc('settings'),base=config.selected.preset;draft={name:'New preset',preset:(await rpc('assets',{action:'read',kind,key:base})).draft};}
        await showEditor();
    });
    $('asset-portrait').onchange=()=>{portrait=$('asset-portrait').files[0];cardActions.update();};
    $('apply-asset-json').onclick=()=>{try{const data=JSON.parse($('asset-json').value);if(!data||typeof data!=='object'||Array.isArray(data)||(kind==='personas'&&!data.descriptor)||(kind==='presets'&&!data.preset))throw Error('Expected an object.');draft=data;renderEditor();$('asset-error').textContent='JSON applied to the editor.';}catch(e){$('asset-error').textContent=e.message;}};
    $('save-asset').onclick=()=>run(async()=>{
        if(invalid)throw Error('Correct the alternate greetings JSON before saving.');
        $('asset-error').textContent='Saving and checking ST’s saved data…';
        uncertain=true;$('save-asset').disabled=true;
        const result=await rpc('assets',{action:'write',kind,key,revision,draft,file:portrait},60000);
        uncertain=false;
        key=result.key;$('asset-editor').close();await load();await refresh();$('library-error').textContent='Saved in ST and verified.';
    });
    $('import-asset').onclick=()=>$('asset-import').click();
    $('asset-import').onchange=()=>{const file=$('asset-import').files[0];$('asset-import').value='';if(file)run(async()=>{const result=await rpc('assets',{action:'import',kind,file},60000);await load();await refresh();$('library-error').textContent=result.note??'Imported into ST.';});};
    async function openPreset(){await run(async()=>{kind='presets';$('library-kind').value=kind;const config=await rpc('settings');key=config.selected.preset;const result=await rpc('assets',{action:'read',kind,key});revision=result.revision;draft={name:key,preset:result.draft};$('settings-panel').close();await showEditor();});}
    $('edit-active-preset').onclick=openPreset;
    $('active-preset').onclick=openPreset;
    function applyLocks(){const value=lastLocked,drafting=allowDrafts;cardActions.update();for(const id of ['library-panel','asset-editor'])for(const n of $(id).querySelectorAll('input,textarea,select,button')){if(n.closest('#character-actions'))continue;if(['close-library','close-asset','character-chats','cancel-character'].includes(n.id))continue;const localDraft=kind==='characters'&&drafting&&!['save-asset','import-asset','asset-import'].includes(n.id);n.disabled=(value&&!localDraft)||(n.id==='save-asset'&&uncertain);}if($('character-work-status'))$('character-work-status').hidden=kind!=='characters';if(kind==='characters'){let status=$('character-work-status');if(!status){status=node('p');status.id='character-work-status';status.setAttribute('role','status');$('asset-fields').before(status);}status.textContent=value&&drafting?'You can read and draft here. Saving is available after the engine finishes.':'';}}
    return {openPreset,async open(value){kind=value;$('library-kind').value=value;await load();$('library-panel').showModal();},async edit(value,options){kind=options?.kind??kind;$('library-kind').value=kind;key=value;const result=await rpc('assets',{action:'read',kind,key});revision=result.revision;draft=result.draft;await showEditor(options);},setLocked(value,{drafting=false}={}){lastLocked=value;allowDrafts=drafting;applyLocks();}};
}
