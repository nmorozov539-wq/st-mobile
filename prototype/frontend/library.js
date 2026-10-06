import { presetOrder, setPromptEnabled } from './preset-order.js?build=0.5.3';
export function createLibrary({rpc,action,refresh,locked}) {
    const $=id=>document.getElementById(id);
    let kind='characters',rows=[],key=null,revision=null,draft={},portrait, uncertain=false, invalid=false, orderId=100001;
    const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    function field(parent,label,value,update,{type,rows=4}={}){
        const wrapper=node('label',label),input=node(type==='boolean'?'input':type==='number'?'input':'textarea');
        if(type==='boolean'){input.type='checkbox';input.checked=!!value;}
        else if(type==='number'){input.type='number';input.step='any';input.value=value??0;}
        else {input.rows=rows;input.value=value??'';}
        input.oninput=()=>{update(type==='boolean'?input.checked:type==='number'?Number(input.value):input.value);syncJSON();};
        wrapper.append(input);parent.append(wrapper);
    }
    const labels={temperature:'Temperature',openai_max_tokens:'Maximum reply tokens',openai_max_context:'Context token budget',stream_openai:'Stream replies',top_p:'Top P',frequency_penalty:'Frequency penalty',presence_penalty:'Presence penalty'};
    const title=s=>labels[s]??s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    function syncJSON(){$('asset-json').value=JSON.stringify(draft,null,2);}
    function renderEditor(){
        const body=$('asset-fields');body.replaceChildren();
        if(kind==='characters'){
            for(const [name,label] of [['name','Name'],['description','Description'],['personality','Personality'],['scenario','Scenario'],['first_mes','First message'],['mes_example','Example dialogue'],['system_prompt','System prompt'],['post_history_instructions','Post-history instructions'],['creator_notes','Creator notes'],['creator','Creator'],['character_version','Character version']])field(body,label,draft[name],v=>draft[name]=v,{rows:name==='name'?1:4});
            field(body,'Alternate greetings (JSON array)',JSON.stringify(draft.alternate_greetings??[],null,2),v=>{try{const a=JSON.parse(v);if(!Array.isArray(a)||a.some(x=>typeof x!=='string'))throw Error();draft.alternate_greetings=a;invalid=false;$('asset-error').textContent='';}catch{invalid=true;$('asset-error').textContent='Alternate greetings must be a JSON array of strings. Apply valid JSON before saving.';}});
            field(body,'Tags (comma separated)',(draft.tags??[]).join(', '),v=>draft.tags=v.split(',').map(x=>x.trim()).filter(Boolean));
        }else if(kind==='personas'){
            field(body,'Name',draft.name,v=>draft.name=v,{rows:1});
            for(const name of ['description','title','lorebook'])field(body,title(name),draft.descriptor[name],v=>draft.descriptor[name]=v,{rows:name==='description'?5:1});
            for(const name of ['position','depth','role'])field(body,title(name),draft.descriptor[name]??0,v=>draft.descriptor[name]=v,{type:'number'});
            body.append(node('p','Position: 0 in prompt, 2 above author note, 3 below author note, 4 at depth, 9 disabled. Role: 0 system, 1 user, 2 assistant. Use ST’s advanced editor for persona connections.'));
        }else{
            field(body,'Preset name (a new name saves a copy)',draft.name,v=>draft.name=v,{rows:1});
            body.append(node('p','Saving applies this preset in ST. Check your connection afterward. Prompt text can contain message-length and word-count instructions.'));
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
                const section=node('details');section.open=true;
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
        $('asset-portrait-label').hidden=kind==='presets';syncJSON();
    }
    async function load(){rows=await rpc('assets',{action:'list',kind});$('asset-list').replaceChildren(...rows.map(row=>{const b=node('button',row.name);b.onclick=()=>run(async()=>{key=row.key;const result=await rpc('assets',{action:'read',kind,key});revision=result.revision;draft=kind==='presets'?{name:key,preset:result.draft}:result.draft;openEditor();});return b;}));}
    function openEditor(){orderId=100001;uncertain=false;invalid=false;portrait=null;$('asset-portrait').value='';$('asset-error').textContent='';renderEditor();$('asset-editor').showModal();$('asset-editor').scrollTop=0;}
    async function run(fn){if(locked())return;await action(async()=>{try{await fn();}catch(e){$('library-error').textContent=e.message;$('asset-error').textContent=e.message;throw e;}});}
    $('library-button').onclick=()=>run(async()=>{await load();$('library-error').textContent='';$('library-panel').showModal();});
    $('close-library').onclick=()=>$('library-panel').close();$('close-asset').onclick=()=>$('asset-editor').close();
    $('library-kind').onchange=()=>run(async()=>{kind=$('library-kind').value;await load();});
    $('new-asset').onclick=()=>run(async()=>{
        key=null;revision=null;
        if(kind==='characters')draft={name:'New character',description:'',personality:'',scenario:'',first_mes:'Hello, {{user}}.',mes_example:'',creator_notes:'',system_prompt:'',post_history_instructions:'',alternate_greetings:[],tags:[],creator:'',character_version:'',extensions:{}};
        else if(kind==='personas')draft={name:'New persona',descriptor:{description:'',title:'',position:0,depth:2,role:0,lorebook:'',connections:[]}};
        else {const config=await rpc('settings'),base=config.selected.preset;draft={name:'New preset',preset:(await rpc('assets',{action:'read',kind,key:base})).draft};}
        openEditor();
    });
    $('asset-portrait').onchange=()=>portrait=$('asset-portrait').files[0];
    $('apply-asset-json').onclick=()=>{try{const data=JSON.parse($('asset-json').value);if(!data||typeof data!=='object'||Array.isArray(data)||(kind==='personas'&&!data.descriptor)||(kind==='presets'&&!data.preset))throw Error('Expected an object.');draft=data;renderEditor();$('asset-error').textContent='JSON applied to the editor.';}catch(e){$('asset-error').textContent=e.message;}};
    $('save-asset').onclick=()=>run(async()=>{
        if(invalid)throw Error('Correct the alternate greetings JSON before saving.');
        $('asset-error').textContent='Saving and checking ST’s saved data…';
        uncertain=true;
        const result=await rpc('assets',{action:'write',kind,key,revision,draft,file:portrait},60000);
        uncertain=false;
        key=result.key;$('asset-editor').close();await load();await refresh();$('library-error').textContent='Saved in ST and verified.';
    });
    $('import-asset').onclick=()=>$('asset-import').click();
    $('asset-import').onchange=()=>{const file=$('asset-import').files[0];$('asset-import').value='';if(file)run(async()=>{const result=await rpc('assets',{action:'import',kind,file},60000);await load();await refresh();$('library-error').textContent=result.note??'Imported into ST.';});};
    async function openPreset(){await run(async()=>{kind='presets';$('library-kind').value=kind;const config=await rpc('settings');key=config.selected.preset;const result=await rpc('assets',{action:'read',kind,key});revision=result.revision;draft={name:key,preset:result.draft};$('settings-panel').close();openEditor();});}
    $('edit-active-preset').onclick=openPreset;
    $('active-preset').onclick=openPreset;
    return {openPreset,setLocked(value){for(const id of ['library-panel','asset-editor'])for(const n of $(id).querySelectorAll('input,textarea,select,button'))if(!['close-library','close-asset'].includes(n.id))n.disabled=value||(n.id==='save-asset'&&uncertain);}};
}
