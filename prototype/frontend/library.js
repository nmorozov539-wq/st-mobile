import {icon} from './icons.js?build=0.8.0-phase1.2';
import {characterStatus} from './libraries.js?build=0.8.0-phase1.2';
import {createCharacterChats} from './character-chats.js?build=0.8.0-phase1.2';
import {createCharacterActions} from './character-actions.js?build=0.8.0-phase1.2';
import {createCharacterEditor} from './character-editor.js?build=0.8.0-phase1.2';
import { presetOrder, setPromptEnabled } from './preset-order.js?build=0.8.0-phase1.2';
export function createLibrary({rpc,action,refresh,locked,format,converter,sanitize,refreshAvailability=async()=>{},onDeleted=()=>{},onEditor=()=>{},readChat=()=>null,onChat=async()=>{},onStartChat=async()=>{},onStartFresh=async()=>{},personaName=id=>id}) {
    const $=id=>document.getElementById(id);
    const chats=createCharacterChats({rpc,action,readChat,onChat,readState:()=>({key,editorSession,open:$('asset-editor').open,unavailable:lastLocked&&!allowDrafts})});
    const character=createCharacterEditor({format,converter,sanitize,associationOptions:{rpc,action,readState:associationState,onSaved:associationSaved,editPersona:editRelatedPersona,chatPersona:()=>{const chat=readChat(),id=chat?.characterKey===key?chat.metadata?.persona:null;return id?{key:id,name:personaName(id)}:null;}}});
    const backEditor=event=>{if(kind!=='characters')return;if(cardActions.back()){event.preventDefault();return;}if(character.back()){event.preventDefault();renderEditor();}};
    $('asset-editor').addEventListener('pocket-back',backEditor);$('asset-editor').addEventListener('cancel',backEditor);
    window.addEventListener('keydown',event=>{if(event.key!=='Escape'||kind!=='characters'||[...document.querySelectorAll('dialog')].filter(dialog=>dialog.open).at(-1)!==$('asset-editor'))return;event.preventDefault();event.stopPropagation();if(event.repeat)return;const back=new Event('pocket-back',{cancelable:true});if($('asset-editor').dispatchEvent(back))$('asset-editor').close();},true);
    const cancel=document.createElement('button');cancel.id='cancel-character';cancel.textContent='Cancel';cancel.onclick=()=>$('asset-editor').close();const savebar=document.createElement('div');savebar.id='character-savebar';$('save-asset').before(savebar);const start=document.createElement('button');start.id='start-character-chat';start.textContent='Start chat';start.onclick=()=>run(()=>{if(start.disabled)return;const origin={key,session:editorSession,revision};return onStartFresh({key,name:revision?JSON.parse(revision).name:draft.name,cardRevision:revision},()=>kind==='characters'&&key===origin.key&&editorSession===origin.session&&revision===origin.revision&&!portrait&&JSON.stringify(draft)===origin.revision&&$('asset-editor').open);});savebar.append(start,cancel,$('save-asset'));
    let editorSession=0,editorFromLibrary=true;
    let savedAssociationRevision=null,savedAssociationCard={},primaryDraftDirty=false;
    let associations=null,associationError='',associationGuard=null,returnCharacter=null;
    let kind='characters',rows=[],key=null,revision=null,draft={},portrait, uncertain=false, invalid=false, orderId=100001,lastLocked=true,allowDrafts=false;
    const cardActions=createCharacterActions({rpc,refresh,onDeleted,action,onStartChat:origin=>onStartChat(origin,()=>key===origin.key&&editorSession===origin.editorSession&&$('asset-editor').open),readState:()=>({key,revision,editorSession,target:readChat()?.characterKey===key?{characterKey:key,chatId:readChat().chatId}:null,name:revision?JSON.parse(revision).name:draft.name,dirty:!!portrait||JSON.stringify(draft)!==revision,busy:lastLocked&&allowDrafts,unavailable:lastLocked&&!allowDrafts})});
    function associationCard(){if(savedAssociationRevision!==revision){savedAssociationRevision=revision;savedAssociationCard=revision?JSON.parse(revision):{};}return savedAssociationCard;}
    function associationState(){
        const saved=associationCard();
        return {key,revision,associationGuard,editorSession,name:saved.name??draft.name,busy:lastLocked&&allowDrafts,unavailable:lastLocked&&!allowDrafts,primaryDirty:primaryDraftDirty};
    }
    async function associationSaved(result,origin){
        await refreshAvailability();
        if(kind!=='characters'||key!==origin.key||editorSession!==origin.editorSession)return;
        const previous=JSON.parse(revision);if(JSON.stringify(previous.extensions?.world)!==JSON.stringify(result.draft.extensions?.world)||JSON.stringify(previous.character_book)!==JSON.stringify(result.draft.character_book)){
            draft.extensions={...draft.extensions,world:result.draft.extensions?.world??''};
            if(Object.hasOwn(result.draft,'character_book'))draft.character_book=structuredClone(result.draft.character_book);else delete draft.character_book;
        }
        revision=result.revision;associations=result.associations;associationGuard=result.associationRevision;associationError=result.associationError??'';
        const scroll=$('asset-editor').scrollTop;renderEditor();$('asset-editor').scrollTop=scroll;
    }
    async function editRelatedPersona(personaKey){
        const origin=key,session=editorSession;const result=await rpc('assets',{kind:'personas',action:'read',key:personaKey});
        if(kind!=='characters'||key!==origin||editorSession!==session)return;
        returnCharacter={key,revision,draft,portrait,associations,associationError,associationGuard,uncertain,mode:character.capture(),scroll:$('asset-editor').scrollTop};
        editorSession++;kind='personas';key=personaKey;revision=result.revision;draft=result.draft;portrait=null;$('asset-portrait').value='';uncertain=false;renderEditor();onEditor(kind,key);
    }
    async function resumeCharacter(){
        if(!returnCharacter)return;const old=returnCharacter;returnCharacter=null;
        const resumeSession=++editorSession;kind='characters';({key,revision,draft,portrait,associations,associationError,associationGuard,uncertain}=old);character.restore(old.mode);
        try{const result=await rpc('assets',{kind:'characters',action:'read',key});if(kind!=='characters'||key!==old.key||editorSession!==resumeSession)return;associations=result.associations;associationGuard=result.associationRevision;associationError=result.associationError??'';}catch(error){if(editorSession!==resumeSession)return;associationError=error.message;}
        if(kind!=='characters'||key!==old.key||editorSession!==resumeSession)return;
        if(portrait){try{const files=new DataTransfer();files.items.add(portrait);$('asset-portrait').files=files.files;}catch{$('asset-error').textContent=`Portrait draft retained: ${portrait.name}`;}}else $('asset-portrait').value='';
        await refreshAvailability();if(kind!=='characters'||key!==old.key||editorSession!==resumeSession)return;renderEditor();onEditor(kind,key);$('asset-editor').showModal();$('asset-editor').scrollTop=old.scroll;chats.load(key,editorSession);
    }
    $('asset-editor').addEventListener('close',()=>{chats.dismiss();if(returnCharacter)resumeCharacter().catch(error=>{$('asset-error').textContent=error.message;});});
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
    function updateCompleteness(){if(kind!=='characters')return;const value=characterStatus(draft),dirty=!!portrait||JSON.stringify(draft)!==revision;let message=$('character-incomplete');if(!message){message=node('p');message.id='character-incomplete';message.setAttribute('role','status');$('asset-fields').prepend(message);}message.hidden=value.complete;message.textContent='Incomplete · missing '+value.missing.join(', ');start.hidden=!editorFromLibrary;start.dataset.key=key??'';start.dataset.session=String(editorSession);start.disabled=lastLocked||!key||dirty||!value.complete||uncertain;start.title=dirty?'Save or cancel the draft before starting a fresh chat.':'Start a fresh conversation with the saved greeting.';$('save-asset').disabled=lastLocked||uncertain||!String(draft.name??'').trim();}
    function syncJSON(){const saved=associationCard();primaryDraftDirty=kind==='characters'&&(JSON.stringify(draft.extensions?.world)!==JSON.stringify(saved.extensions?.world)||JSON.stringify(draft.character_book)!==JSON.stringify(saved.character_book));$('asset-json').value=JSON.stringify(draft,null,2);cardActions.update();character.updateLinks();updateCompleteness();}
    function renderEditor(){
        const body=$('asset-fields');body.replaceChildren();$('asset-editor').querySelector('.character-modes')?.remove();$('asset-editor').querySelector('.character-actions-trigger')?.remove();$('close-asset').setAttribute('aria-label','Close library editor');$('asset-editor').classList.toggle('character-editor',kind==='characters');$('asset-editor').querySelector('h2').textContent='Edit library item';$('close-asset').replaceChildren(icon('close'));$('save-asset').hidden=false;$('character-savebar').hidden=false;$('asset-json').closest('details').hidden=false;cancel.hidden=kind!=='characters';
        if(kind==='characters'){
            character.render({body,draft,key,associations,associationError,changed:syncJSON,field,rerender:renderEditor,onActions:cardActions.open,chats});
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
        if(kind!=='characters')start.hidden=true;
        if(kind!=='characters')$('asset-portrait-label').hidden=kind==='presets';syncJSON();applyLocks();
    }
    async function load(){rows=await rpc('assets',{action:'list',kind});$('asset-list').replaceChildren(...rows.map(row=>{const b=node('button',row.name);b.onclick=()=>run(async()=>{key=row.key;const result=await rpc('assets',{action:'read',kind,key});associations=result.associations??null;associationError=result.associationError??'';associationGuard=result.associationRevision??null;revision=result.revision;draft=kind==='presets'?{name:key,preset:result.draft}:result.draft;await showEditor();});return b;}));}
    async function showEditor(options){await refreshAvailability();openEditor(options);}
    function openEditor({fromLibrary=true}={}){editorFromLibrary=fromLibrary;editorSession++;cardActions.back();if(kind==='characters')character.begin(key,{fromLibrary});orderId=100001;uncertain=false;invalid=false;portrait=null;$('asset-portrait').value='';$('asset-error').textContent='';renderEditor();onEditor(kind,key);$('asset-editor').showModal();$('asset-editor').scrollTop=0;if(kind==='characters')chats.load(key,editorSession);}
    async function run(fn){if(locked())return;await action(async()=>{try{await fn();}catch(e){$('library-error').textContent=e.message;$('asset-error').textContent=e.message;throw e;}});}
    $('library-button').onclick=()=>run(async()=>{await load();$('library-error').textContent='';$('library-panel').showModal();});
    $('close-library').onclick=()=>$('library-panel').close();$('close-asset').onclick=()=>{if(kind==='characters'&&cardActions.back())return;if(kind==='characters'&&character.back()){renderEditor();return;}$('asset-editor').close();};
    $('library-kind').onchange=()=>run(async()=>{kind=$('library-kind').value;await load();});
    async function createAsset(){
        key=null;revision=null;associations=null;associationError='';associationGuard=null;
        if(kind==='characters')draft={name:'',description:'',personality:'',scenario:'',first_mes:'',mes_example:'',creator_notes:'',system_prompt:'',post_history_instructions:'',alternate_greetings:[],tags:[],creator:'',character_version:'',extensions:{}};
        else if(kind==='personas')draft={name:'New persona',descriptor:{description:'',title:'',position:0,depth:2,role:0,lorebook:'',connections:[]}};
        else {const config=await rpc('settings'),base=config.selected.preset;draft={name:'New preset',preset:(await rpc('assets',{action:'read',kind,key:base})).draft};}
        await showEditor();
    }
    $('new-asset').onclick=()=>run(createAsset);
    $('asset-portrait').onchange=()=>{portrait=$('asset-portrait').files[0];cardActions.update();character.updateLinks();updateCompleteness();};
    $('apply-asset-json').onclick=()=>{try{const data=JSON.parse($('asset-json').value);if(!data||typeof data!=='object'||Array.isArray(data)||(kind==='personas'&&!data.descriptor)||(kind==='presets'&&!data.preset))throw Error('Expected an object.');draft=data;renderEditor();$('asset-error').textContent='JSON applied to the editor.';}catch(e){$('asset-error').textContent=e.message;}};
    $('save-asset').onclick=()=>run(async()=>{
        if(invalid)throw Error('Correct the alternate greetings JSON before saving.');
        const origin={kind,key,session:editorSession};
        $('asset-error').textContent='Saving and checking ST’s saved data…';
        uncertain=true;$('save-asset').disabled=true;
        const result=await rpc('assets',{action:'write',kind,key,revision,draft,file:portrait},60000);
        if(kind!==origin.kind||key!==origin.key||editorSession!==origin.session){await refreshAvailability();await refresh();return;}
        uncertain=false;
        key=result.key;const returning=!!returnCharacter;if(returning)await resumeCharacter();else $('asset-editor').close();if(!returning)await load();await refresh();$('library-error').textContent='Saved in ST and verified.';
    });
    $('import-asset').onclick=()=>$('asset-import').click();
    $('asset-import').onchange=()=>{const file=$('asset-import').files[0];$('asset-import').value='';if(file)run(async()=>{const result=await rpc('assets',{action:'import',kind,file},60000);await load();await refresh();$('library-error').textContent=result.note??'Imported into ST.';});};
    async function openPreset(){await run(async()=>{kind='presets';$('library-kind').value=kind;const config=await rpc('settings');key=config.selected.preset;const result=await rpc('assets',{action:'read',kind,key});associations=result.associations??null;associationError=result.associationError??'';associationGuard=result.associationRevision??null;revision=result.revision;draft={name:key,preset:result.draft};$('settings-panel').close();await showEditor();});}
    $('edit-active-preset').onclick=openPreset;
    $('active-preset').onclick=openPreset;
    function applyLocks(){const value=lastLocked,drafting=allowDrafts;cardActions.update();character.updateLinks();chats.update();for(const id of ['library-panel','asset-editor'])for(const n of $(id).querySelectorAll('input,textarea,select,button')){if(n.closest('#character-actions')||n.closest('.character-lorebooks')||n.classList.contains('character-persona-line')||n.classList.contains('character-chat-line'))continue;if(['close-library','close-asset','character-chats','cancel-character'].includes(n.id))continue;const localDraft=kind==='characters'&&drafting&&!['save-asset','import-asset','asset-import'].includes(n.id);n.disabled=(value&&!localDraft)||(n.id==='save-asset'&&uncertain);}if($('character-work-status'))$('character-work-status').hidden=kind!=='characters';if(kind==='characters'){let status=$('character-work-status');if(!status){status=node('p');status.id='character-work-status';status.setAttribute('role','status');$('asset-fields').before(status);}status.textContent=value&&drafting?'You can read and draft here. Saving is available after the engine finishes.':'';updateCompleteness();}}
    return {openPreset,async createCharacter(){kind='characters';await createAsset();},async importCharacter(file){if(lastLocked)throw Error('Wait for the engine before importing a character.');const result=await rpc('assets',{action:'import',kind:'characters',file},60000);await refresh();return result;},async open(value){kind=value;$('library-kind').value=value;await load();$('library-panel').showModal();},async edit(value,options){kind=options?.kind??kind;$('library-kind').value=kind;key=value;const result=await rpc('assets',{action:'read',kind,key});associations=result.associations??null;associationError=result.associationError??'';associationGuard=result.associationRevision??null;revision=result.revision;draft=result.draft;await showEditor(options);},setLocked(value,{drafting=false}={}){lastLocked=value;allowDrafts=drafting;applyLocks();}};
}
