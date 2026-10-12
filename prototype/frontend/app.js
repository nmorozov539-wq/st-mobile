import {createLibraryViews,characterStatus} from './libraries.js?build=0.7.11';
import {createNewChatPanel} from './new-chat-panel.js?build=0.7.11';
import {createEngineMonitor} from './engine-monitor.js?build=0.7.11';
import {checkBridgeBuild} from './build.js?build=0.7.11';
import {createLocalState,isNearBottom,submittedUserMessage,recoveryDecision} from './state.js?build=0.7.11';
import {createJournal,revision,renderRange} from './journal.js?build=0.7.11';
import {RuntimeConnection} from './transport.js?build=0.7.11';
import {DOMPurify,showdown} from '/lib.js';
import {createHTMLFormatter} from './html-format.js?build=0.7.11';
import {createSettingsPanel} from './settings.js?build=0.7.11';
import {createLibrary} from './library.js?build=0.7.11';
import {createMemoryPanel} from './memory.js?build=0.7.11';
import {createWorldInfoPanel} from './world-info.js?build=0.7.11';
import {createSettingsPage} from './settings-page.js?build=0.7.11';
import {loadAppearance,saveAppearance,applyAppearance,clockText,modelName,tokenText} from './appearance.js?build=0.7.11';
import {probeEngine} from './engine-health.js?build=0.7.11';
import {createPresetPanel} from './preset-panel.js?build=0.7.11';
import {icon} from './icons.js?build=0.7.11';
import {createChatControls,generationDuration,alternativeIntent} from './chat-controls.js?build=0.7.11';
import {createModelPanel} from './model-panel.js?build=0.7.11';
import {projectSettings,rebaseSettingsGuard} from './scoped-settings.js?build=0.7.11';
const $=id=>document.getElementById(id), el=(tag,text='',className)=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
const format=createHTMLFormatter({converter:new showdown.Converter({tables:true,strikethrough:true,simpleLineBreaks:true}),sanitize:(html,options)=>DOMPurify.sanitize(html,options),document});
const state=createLocalState(localStorage),journal=createJournal(localStorage),connection=new RuntimeConnection(onEvent);
const raw=(method,arg,timeout)=>connection.request(method,arg,timeout);
const workspace=(action,arg={},timeout=45000)=>raw('workspace',{action,...arg},timeout);
const target=value=>value?.characterKey&&value?.chatId?{characterKey:value.characterKey,chatId:value.chatId}:null;
const key=value=>state.draftKey(value),same=(a,b)=>key(a)===key(b);
let freshPreparing=false;
let snapshot,characters=[],recents=[],configuration,scopes,sessionId,connected=false,initializing=false,engineBusy=false,working=false,memoryBusy=false,review=false,draining=false;
let page='home',entryPage='home',operation=null,streamText='',streamReasoning='',streamFrame,streamNode,renderedKey,menuIndex,editorTarget,selected=new Set(),selecting=false,undoRecord,undoTimer,draftTimer;
let newChatPanel,libraryViews,navVersion=0,chatDeleteArgument=null,chatDeleteToken=0,importWaiting=false,importUncertain=false;
let settingsPanel,settingsPage,settingsFrom='home',appearance=applyAppearance(loadAppearance(localStorage)),library,memoryPanel,wiPanel,presetPanel,chatControls,modelPanel,inlineDraft='',deleteArgument,memoryState,statusTimer,startingGeneration=false;
let presetPanelOrigin=null;
let personaEdit=null,personaPortraitFile=null;
let memoryWasBusy=false,memoryStopAsked=false,memoryResult=null,memoryResultTimer;
const pagePositions=new Map();let listRenderer;
const positions=new Map(),heights=new Map(),detailsState=new Map();
const status=text=>{clearTimeout(statusTimer);$('status').textContent=text;$('status').hidden=false;$('pending-status').textContent=text;$('landing-status').textContent=text==='Engine ready'?'':text;if(['Engine ready','Reply saved','Reply stopped','Changes applied','Saved work reviewed · ready','New chat saved · greeting ready','Character imported and verified'].includes(text))statusTimer=setTimeout(()=>{if($('status').textContent===text){$('status').hidden=true;if($('landing-status').textContent===text)$('landing-status').textContent='';}},4000);};
const toast=(text,undo,duration=undo?12000:5000)=>{clearTimeout(undoTimer);undoRecord=undo;if(undo)localStorage.setItem('pocket-tavern.undo.v1',JSON.stringify({value:undo,expires:Date.now()+duration}));$('toast-text').textContent=text;$('undo').hidden=!undo;$('toast').hidden=false;undoTimer=setTimeout(()=>{$('toast').hidden=true;undoRecord=null;localStorage.removeItem('pocket-tavern.undo.v1');},duration);};
function error(value){status(value.message);toast(value.message);if(['DISCONNECTED','TIMEOUT','ENGINE_UNAVAILABLE'].includes(value.code))disconnected(value.message);}
async function action(fn){try{return await fn();}catch(e){error(e);}}
function saveDraft(){clearTimeout(draftTimer);if(snapshot&&$('draft').value!==state.draft(snapshot))state.saveDraft(snapshot,$('draft').value);}
function controls(){const unavailable=!connected||review;const busy=freshPreparing||engineBusy||working||memoryBusy||startingGeneration||draining;
    $('draft').disabled=!snapshot||unavailable;
    $('send').disabled=unavailable||busy||!snapshot||!$('draft').value.trim();$('send').hidden=!!operation;
    $('stop').hidden=!operation;$('stop').disabled=unavailable||operation?.state!=='running';
    $('settings-button').disabled=!connected;$('model-chip').disabled=!connected;
    $('reconnect').disabled=initializing;$('review').hidden=!review;$('review').disabled=!connected||initializing;
    libraryViews?.update();$('page-new-chat').disabled=!connected||review;$('characters-create')&&($('characters-create').disabled=unavailable);$('characters-import')&&($('characters-import').disabled=unavailable||busy);$('chat-delete-apply').disabled=unavailable||busy||!chatDeleteArgument;if(page==='characters'||page==='chats'||page==='new-chat'){if(unavailable)$('landing-status').textContent=review?'Review saved work before making changes.':'Engine unavailable · reconnect to continue.';else if(busy)$('landing-status').textContent=operation?`Reply running in ${operation.target.chatId}. Browsing stays available.`:'Engine work pending · browsing stays available.';else if(/^(Reply running|Engine work pending|Engine unavailable)/.test($('landing-status').textContent))$('landing-status').textContent='';}newChatPanel?.update();presetPanel?.setAvailable();settingsPanel?.setLocked(unavailable);library?.setLocked(unavailable||busy,{drafting:!unavailable});memoryPanel?.setAvailable(connected);memoryPanel?.setLocked(unavailable||busy);
    $('selection-bar').hidden=!selecting;$('selection-count').textContent=`${selected.size} selected`;$('delete-selected').disabled=!selected.size||unavailable;
}
function portrait(c){const span=el('span',c?.name?.slice(0,1)??'✦','avatar');if(c){const img=el('img');img.src=`/characters/${encodeURIComponent(c.key)}`;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();span.append(img);}return span;}
function personaPortrait(p){const span=el('span',p?.name?.slice(0,1)??'✦','avatar');if(p){const img=el('img');img.src=`/User Avatars/${encodeURIComponent(p.id)}`;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();span.append(img);}return span;}
async function refresh(){characters=await raw('characters');recents=await workspace('recent');configuration=await raw('settings');if(snapshot){try{scopes=projectedScopes(await workspace('scopes',{target:target(snapshot)}),snapshot);}catch(e){if(e.code!=='CHAT_NOT_FOUND')throw e;snapshot=null;scopes=await workspace('scopes');}}else scopes=await workspace('scopes');renderPage();renderHeader();if(presetPanel&&$('preset-panel').open){const origin=presetPanelOrigin;const value=projectedScopes(await workspace('scopes',{target:origin}),origin);presetPanel.update(value,journal.read().some(i=>i.argument.action==='configure'));}}
function button(text,fn){const b=el('button',text);b.onclick=()=>action(fn);return b;}
function chatRow(row){return libraryViews.chat({...row,open:()=>openChat(row)},characters);}
function windowList(parent,rows,makeRow,estimate=100,scroller=$('landing')){
    const list=el('div','','window-list');parent.append(list);
    const render=()=>{const offset=list.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop,top=Math.max(0,scroller.scrollTop-offset),range=renderRange(rows.length,top,scroller.clientHeight||700,{},estimate,5),before=el('div'),after=el('div');before.style.height=`${range.before}px`;after.style.height=`${range.after}px`;list.replaceChildren(before,...rows.slice(range.start,range.end).map(makeRow),after);};
    if(scroller===$('landing'))listRenderer=render;else{let frame;scroller.onscroll=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=null;render();});};}
    render();return render;
}
function renderPage(){listRenderer=null;if(page==='chat')return;const content=$('page-content');content.replaceChildren();const titles={home:'Pocket Tavern',chats:'Chats',characters:'Characters',personas:'Personas',wi:'World Info','new-chat':'New chat','persona-editor':personaEdit?.key?'Edit persona':'New persona','persona-picker':'Persona',memory:'Memory','wi-entry':'Entry','wi-activation':'Activation',settings:'Settings'};$('page-title').textContent=titles[page];$('page-subtitle').hidden=page!=='memory';$('page-subtitle').textContent=page==='memory'?'Summaryception':'';$('landing').classList.toggle('library-screen',['characters','chats','new-chat','personas','persona-editor','persona-picker','memory','wi','wi-entry','wi-activation','settings'].includes(page));$('page-wi-activation').hidden=page!=='wi';$('app-settings').hidden=page!=='home';$('page-back').hidden=page!=='new-chat'&&page!=='persona-editor'&&page!=='persona-picker'&&page!=='memory'&&page!=='wi-entry'&&page!=='wi-activation'&&page!=='settings';$('page-new-chat').hidden=page!=='chats';for(const b of $('bottom-nav').querySelectorAll('button'))b.classList.toggle('current',b.dataset.page===(page==='new-chat'?'chats':page));
    if(page==='home'){
        const card=el('section','','status-card');card.append(el('small',connected?'ENGINE ONLINE':'ENGINE OFFLINE'),el('h2',configuration?.onlineStatus==='no_connection'?'API not connected':configuration?.onlineStatus??'Connecting…'));
        if(operation)card.append(button('Stop current reply',()=>$('stop').click()));const global=scopes?.global;card.append(button(`Model · ${global?.model??configuration?.selected.model??'Choose'}`,()=>openModels(true)),button(`Preset · ${global?.preset??configuration?.selected.preset??'Choose'}`,()=>openPreset(true)));content.append(card);
        const last=state.target(),continueRow=recents.find(r=>same(r,last))??recents[0];if(continueRow)content.append(el('h2','Continue'),chatRow(continueRow));
        content.append(el('h2','Recent conversations'));for(const row of recents.slice(0,5))content.append(chatRow(row));if(!recents.length)content.append(el('p','Choose a character to start your first conversation.'));
    }else if(page==='chats'){if(!recents.length)content.append(el('p','No chats yet. Tap + to choose a character and start fresh.','library-empty'));windowList(content,recents,chatRow,124);if(recents.length===1000)content.append(el('p','Showing the most recent 1,000 conversations. The Character selector has its complete saved history.','library-caption'));}
    else if(page==='characters'){libraryViews.characters(content,characters);}
    else if(page==='new-chat'){libraryViews.picker(content,characters);}
    else if(page==='personas'){libraryViews.personas(content,configuration?.personas??[],{createPersona:()=>openPersonaEditor(null),editPersona:p=>openPersonaEditor(p)});}
    else if(page==='persona-editor'){renderPersonaEditor(content);}
    else if(page==='persona-picker'){renderPersonaPicker(content);}
    else if(page==='memory'){memoryPanel.renderPage(content);}
    else if(page==='settings'){settingsPage.render(content);}
    else if(page==='wi'){wiPanel.renderLibrary(content);}
    else if(page==='wi-entry'){wiPanel.renderEntry(content);}
    else if(page==='wi-activation'){wiPanel.renderActivation(content);}
    else {content.append(el('p','Native World Info activation remains global. Character and chat books keep their ST rules.'),button('Select global lorebooks',()=>openConnection()));for(const name of configuration?.lorebooks??[])content.append(el('div',`${configuration.selected.lorebooks.includes(name)?'●':'○'} ${name}`,'library-row'));content.append(el('a','Open the native World Info editor','native-link'));content.lastChild.href='/';content.lastChild.target='_blank';}
}
async function openPersonaEditor(p){
    if(p){const result=await raw('assets',{kind:'personas',action:'read',key:p.id});personaEdit={key:p.id,revision:result.revision,draft:result.draft};}
    else personaEdit={key:null,revision:null,draft:{name:'',descriptor:{description:'',title:'',position:0,depth:2,role:0,lorebook:'',connections:[]}}};
    personaPortraitFile=null;navigate('persona-editor');
}
function renderPersonaEditor(content){
    const d=personaEdit.draft,desc=d.descriptor;
    content.className='persona-editor-page';
    const top=el('div','','persona-editor-top');
    const av=el('label','','persona-editor-avatar');const circle=personaPortrait(personaEdit.key?{id:personaEdit.key,name:d.name}:null);
    const changeIcon=el('span','','persona-avatar-change');changeIcon.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
    circle.append(changeIcon);const fileInput=el('input');fileInput.type='file';fileInput.accept='image/*';fileInput.hidden=true;fileInput.onchange=()=>{personaPortraitFile=fileInput.files[0];if(personaPortraitFile){const url=URL.createObjectURL(personaPortraitFile);const img=circle.querySelector('img')||el('img');img.src=url;img.alt='';if(!circle.querySelector('img'))circle.prepend(img);}};av.append(circle,fileInput);
    const fields=el('div','','persona-editor-fields');
    const nameLabel=el('label','Name','persona-field-label');const nameInput=el('input');nameInput.type='text';nameInput.value=d.name;nameInput.oninput=()=>d.name=nameInput.value;nameLabel.append(nameInput);
    const titleLabel=el('label','Title / comment','persona-field-label');const titleInput=el('input');titleInput.type='text';titleInput.value=desc.title??'';titleInput.oninput=()=>desc.title=titleInput.value;titleLabel.append(titleInput);
    fields.append(nameLabel,titleLabel);top.append(av,fields);
    const descLabel=el('label','Description','persona-field-label');const descInput=el('textarea');descInput.rows=8;descInput.value=desc.description??'';descInput.oninput=()=>desc.description=descInput.value;descLabel.append(descInput);
    const actions=el('div','','persona-editor-actions');
    const cancelBtn=button('Cancel',()=>navigate('personas'));
    const saveBtn=button('Save',async()=>{
        if(!String(d.name).trim()){toast('A persona needs a name.');return;}
        if(engineBusy||memoryBusy){toast('Wait for the engine to finish before saving.');return;}
        saveBtn.disabled=true;cancelBtn.disabled=true;
        try{
            const result=await raw('assets',{action:'write',kind:'personas',key:personaEdit.key,revision:personaEdit.revision,draft:d,file:personaPortraitFile},60000);
            personaEdit=null;personaPortraitFile=null;await refresh();navigate('personas');toast('Persona saved');
        }catch(e){saveBtn.disabled=false;cancelBtn.disabled=false;toast(e.message);}
    });saveBtn.className='persona-save';
    actions.append(cancelBtn,saveBtn);content.append(top,descLabel,actions);
}
let pickerPersonaDetail=null;
async function openPersonaPicker(){$('chat-settings').close();const selected=configuration?.selected?.persona;pickerPersonaDetail=null;if(selected){try{const record=await raw('assets',{kind:'personas',action:'read',key:selected});pickerPersonaDetail=record.draft;}catch(e){}}navigate('persona-picker');}
function renderPersonaPicker(content){
    content.className='persona-picker-page';
    const personas=configuration?.personas??[],selected=configuration?.selected?.persona;
    const current=personas.find(p=>p.id===selected);
    if(current){
        const card=el('section','','persona-current-card');
        card.append(el('small','Current persona','persona-current-label'));
        const header=el('div','','persona-current-header');
        header.append(personaPortrait(current));
        const info=el('div','','persona-current-info');
        const title=pickerPersonaDetail?.descriptor?.title??'';
        const desc=pickerPersonaDetail?.descriptor?.description??'';
        info.append(el('h2',current.name));
        if(title)info.append(el('span',title,'persona-current-title'));
        header.append(info);card.append(header);
        if(desc)card.append(el('p',desc,'persona-current-desc'));
        const cardActions=el('div','','persona-current-actions');
        const editBtn=button('Edit persona',()=>action(()=>openPersonaEditor(current)));editBtn.className='persona-action-btn';editBtn.prepend(icon('edit'));
        const linkBtn=button('Link…',()=>action(()=>openLinkDialog(current)));linkBtn.className='persona-action-btn';linkBtn.prepend(icon('link'));
        cardActions.append(editBtn,linkBtn);card.append(cardActions);
        const chatLink=snapshot?.metadata?.persona===current.id;
        const charLink=pickerPersonaDetail?.descriptor?.connections?.some(c=>c?.type==='character'&&c.id===snapshot?.characterKey);
        if(chatLink||charLink){const linkLabel=el('small',(chatLink?'Chat':'')+(chatLink&&charLink?' and ':'')+(charLink?'Character':'')+' linked to '+current.name,'persona-link-status');card.append(linkLabel);}
        content.append(card);
    }
    content.append(el('h3','Your personas','persona-list-heading'));
    for(const p of personas){
        const row=el('button','','persona-list-row');row.setAttribute('aria-label',`Select ${p.name}`);
        if(p.id===selected)row.classList.add('persona-selected');
        row.append(personaPortrait(p));
        const text=el('span','','persona-list-text');text.append(el('strong',p.name));
        if(p.id===selected&&pickerPersonaDetail?.descriptor?.title)text.append(el('small',pickerPersonaDetail.descriptor.title,'persona-list-subtitle'));
        row.append(text);
        if(p.id===selected){const check=el('span','✓','persona-check');row.append(check);}
        row.onclick=()=>action(async()=>{await changeConnection('persona',p.id);navigate('chat');});
        content.append(row);
    }
    if(!personas.length)content.append(el('p','No personas yet. Create one in the Personas tab.','library-empty'));
}
function confirmReplace(text){
    return new Promise((resolve,reject)=>{
        let settled=false;
        $('persona-replace-text').textContent=text;
        $('persona-replace-apply').onclick=()=>{settled=true;$('persona-replace-confirm').close();resolve();};
        $('persona-replace-confirm').addEventListener('close',()=>{if(!settled)reject(Error('Cancelled'));},{once:true});
        $('persona-replace-confirm').showModal();
    });
}
async function openLinkDialog(persona){
    if(!snapshot)throw Error('Open a chat first.');
    const targets=$('persona-link-targets');targets.replaceChildren();
    $('persona-link-heading').textContent=`Link ${persona.name}`;
    const charName=characters.find(c=>c.key===snapshot.characterKey)?.name??snapshot.characterKey;
    const chatPersona=snapshot.metadata?.persona;
    const chatLinkedName=chatPersona?configuration?.personas?.find(p=>p.id===chatPersona)?.name:null;
    // Find which persona is currently character-linked (use pickerPersonaDetail if it's this persona, else scan)
    let charCurrentLinkedName=null;
    if(pickerPersonaDetail?.descriptor?.connections?.some(c=>c?.type==='character'&&c.id===snapshot.characterKey)){
        charCurrentLinkedName=persona.name;
    }else{
        for(const p of configuration?.personas??[]){
            if(p.id===persona.id)continue;
            try{const rec=await raw('assets',{kind:'personas',action:'read',key:p.id});
            if(rec.draft?.descriptor?.connections?.some(c=>c?.type==='character'&&c.id===snapshot.characterKey)){charCurrentLinkedName=p.name;break;}}catch(e){}
        }
    }
    const chatRow=button('','');chatRow.className='persona-link-target';
    chatRow.innerHTML=`<span class="link-target-icon">${icon('chat').outerHTML}</span><span class="link-target-text"><strong>This chat</strong><small>${snapshot.chatId}</small><small class="muted">${chatLinkedName?'Linked to '+chatLinkedName:'No linked persona'}</small></span>`;
    chatRow.onclick=()=>action(async()=>{
        if(chatPersona&&chatPersona!==persona.id){
            await confirmReplace(`Replace ${chatLinkedName??chatPersona} with ${persona.name} for "${snapshot.chatId}"?`);
        }
        await workspace('linkPersonaToChat',{target:target(snapshot),personaKey:persona.id});
        snapshot=await workspace('read',{target:target(snapshot)});renderHeader();
        $('persona-link-dialog').close();renderPage();
    });
    const charRow=button('','');charRow.className='persona-link-target';
    charRow.innerHTML=`<span class="link-target-icon">${icon('characters').outerHTML}</span><span class="link-target-text"><strong>This character</strong><small>${charName}</small><small class="muted">${charCurrentLinkedName?'Linked to '+charCurrentLinkedName:'No linked persona'}</small></span>`;
    charRow.onclick=()=>action(async()=>{
        if(charCurrentLinkedName&&charCurrentLinkedName!==persona.name){
            await confirmReplace(`Replace ${charCurrentLinkedName} with ${persona.name} for ${charName}?`);
        }
        const record=await raw('assets',{kind:'personas',action:'read',key:persona.id});
        const connections=record.draft.descriptor?.connections??[];
        if(!connections.some(c=>c?.type==='character'&&c.id===snapshot.characterKey)){
            connections.push({type:'character',id:snapshot.characterKey});
            record.draft.descriptor.connections=connections;
            await raw('assets',{action:'write',kind:'personas',key:persona.id,revision:record.revision,draft:record.draft},60000);
        }
        $('persona-link-dialog').close();
        pickerPersonaDetail=(await raw('assets',{kind:'personas',action:'read',key:persona.id})).draft;
        renderPage();
    });
    targets.append(chatRow,charRow);
    $('persona-link-dialog').showModal();
}
function showCharacters(){navigate('new-chat');}
function navigate(next,{dismissPanels=true}={}){navVersion++;chatDeleteToken++;if(dismissPanels)chatControls?.dismiss();if(page!=='chat')pagePositions.set(page,$('landing').scrollTop);if(page==='chat'){rememberDetails();saveDraft();positions.set(key(snapshot),$('messages').scrollTop);}page=next;$('landing').hidden=next==='chat';$('chat-screen').hidden=next!=='chat';$('bottom-nav').hidden=next==='chat'||next==='persona-editor'||next==='persona-picker'||next==='memory'||next==='wi-entry'||next==='wi-activation'||next==='settings';if(next!=='chat'){renderPage();$('landing').scrollTop=pagePositions.get(next)??0;listRenderer?.();}}
async function openChat(value,{dismissPanels=true,guard=()=>true}={}){saveDraft();if(page==='chat'){rememberDetails();}if(page==='chat')positions.set(key(snapshot),$('messages').scrollTop);else entryPage=page;const saved=await workspace('read',{target:target(value)});const savedScopes=projectedScopes(await workspace('scopes',{target:target(saved)}),saved);if(!guard())return;snapshot=saved;state.saveTarget(saved);selected.clear();selecting=false;$('draft').value=state.draft(saved);scopes=savedScopes;navigate('chat',{dismissPanels});render(true);if(operation&&same(operation.target,snapshot))showStream();}

function renderHeader(){if(!snapshot)return;const c=characters.find(c=>c.key===snapshot.characterKey),copy=scopes?.effective.copy;$('avatar').replaceChildren(portrait(c));$('name').textContent=c?.name??'Chat';$('subtitle').hidden=recents.filter(r=>r.characterKey===snapshot.characterKey).length<2;$('subtitle').textContent=snapshot.chatId;$('model-chip').replaceChildren(el('span',copy?.model??'Model'),icon('down'));$('model-chip').title=copy?.model??'Choose model';renderMemoryNotice();$('active-preset').textContent=copy?.preset??'Preset';$('active-persona').textContent=snapshot.presentation?.personaName??'Persona';$('scope-chip').textContent=scopes?.effective.scope??'global';}
function renderMemoryNotice(value=memoryState){if(!snapshot)return;const notices=[];const label=value&&value.target&&!same(value.target,snapshot)?`Memory for ${value.target.chatId??'the engine chat'}`:'Memory';if(snapshot.metadata.pocket_tavern?.memoryInvalid)notices.push('Memory needs rebuilding after history changes');if(value?.backlog)notices.push(`${label} \u00b7 Choice needed`);else if(value?.busy)notices.push(`${label} \u00b7 ${value.waiting?'Waiting':'Summarizing'}`);else if(memoryResult==='stopped')notices.push('Summarization stopped \u00b7 Progress saved');else if(memoryResult==='done')notices.push('Memory saved \u00b7 Summarization complete');if(value?.failure)notices.push(value.failure);$('memory-notice-text').textContent=notices.join(' \u00b7 ');$('memory-notice').hidden=!notices.length;$('memory-notice-stop').hidden=!value?.busy;const box=$('memory-choice'),wanted=value?.backlog&&same(value.target,snapshot)?JSON.stringify(value.backlog):'';if(box.dataset.sig!==wanted){box.dataset.sig=wanted;const card=wanted?memoryPanel?.choiceCard(value):null;box.replaceChildren(...(card?[card]:[]));box.hidden=!card;}}
function rememberDetails(){for(const a of $('messages').querySelectorAll('article[data-index]')){detailsState.set(a.dataset.detailKey,Array.from(a.querySelectorAll('details')).map(d=>d.open));}}
const detailKey=(message,index,origin=snapshot)=>`${key(origin)}:${message.send_date??index}:${message.name??''}`;
function priorThinkingOpen(before=snapshot.messages.length){for(let i=before-1;i>=0;i--){const m=snapshot.messages[i];if(!m.is_user&&(!m.is_system||m.extra?.sc_ghosted))return detailsState.get(detailKey(m,i))?.[0]??false;}return false;}
function restoreDetails(a,index){const choices=detailsState.get(a.dataset.detailKey);if(choices)Array.from(a.querySelectorAll('details')).forEach((d,i)=>d.open=!!choices[i]);else if(index===snapshot.messages.length-1&&!snapshot.messages[index].is_user){if(priorThinkingOpen(index))a.querySelector('details.thinking')?.setAttribute('open','');}}
function reasoning(text){const d=el('details','','thinking');d.hidden=!text;d.append(el('summary','Thinking'));const body=el('div','','thinking-body');body.innerHTML=format(text);d.append(body);return d;}
function messageArticle(message,index){const a=el('article','',`message ${message.is_user?'user':''}`);a.dataset.index=index;a.dataset.detailKey=detailKey(message,index);a.addEventListener('toggle',()=>{if(a.isConnected)detailsState.set(a.dataset.detailKey,Array.from(a.querySelectorAll('details')).map(d=>d.open));},true);const label=el('div','','byline');if(selecting){const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=selected.has(index);checkbox.setAttribute('aria-label',`Select message ${index+1}`);checkbox.onchange=()=>{checkbox.checked?selected.add(index):selected.delete(index);controls();};label.append(checkbox);}label.append(el('span',message.is_user?message.name??snapshot.presentation?.personaName??'You':message.name??'Character'));const menu=button('⋯',()=>openMenu(index));menu.setAttribute('aria-label',`Message ${index+1} actions`);label.append(menu);const bubble=el('div','','bubble');if(editorTarget&&same(editorTarget.target,snapshot)&&editorTarget.messageId===index){const input=el('textarea');input.value=inlineDraft;input.rows=6;input.setAttribute('aria-label','Edit message text');input.oninput=()=>inlineDraft=input.value;const actions=el('div','','inline-edit-actions');actions.append(button('Cancel',()=>{editorTarget=null;render();}),button('Save',async()=>{await queueChange({action:'edit',...editorTarget,text:inlineDraft},'Message edit saved');editorTarget=null;render();}));bubble.classList.add('inline-editor');bubble.append(input,actions);}else bubble.innerHTML=format(message.mes);a.append(label,reasoning(message.extra?.reasoning??''),bubble);
    const tools=el('div','','message-tools');
    if(!message.is_user&&(!message.is_system||message.extra?.sc_ghosted)&&(index===snapshot.messages.length-1||(message.swipes?.length??0)>1)){
        const count=message.swipes?.length??1,current=message.swipe_id??0;
        const prev=button('',()=>chooseSwipe(index,(current-1+count)%count));prev.append(icon('back'));prev.setAttribute('aria-label','Previous saved alternative');prev.disabled=count<2;
        const next=button('',()=>chooseSwipe(index,(current+1)%count));next.append(icon('back'));next.className='next-alternative';next.setAttribute('aria-label','Next saved alternative');next.disabled=count<2;
        tools.append(prev,el('span',`${current+1} / ${count}`),next);
    }
    const details=appearance.details,duration=details.time?generationDuration(message):null;if(duration){const detail=el('span',duration,'generation-duration');detail.prepend(icon('timer'));detail.setAttribute('aria-label',`Generation duration ${duration}`);tools.append(detail);}
    const clock=details.clock?clockText(message):null;if(clock)tools.append(el('span',clock,'message-detail'));
    const model=details.model&&!message.is_user?modelName(message):null;if(model){const chip=button('',()=>toast(model));chip.className='message-detail';chip.append(icon('model'));chip.title=model;chip.setAttribute('aria-label',`Generated by ${model}. Tap to show the full name.`);tools.append(chip);}
    const tokens=details.tokens&&!message.is_user?tokenText(message):null;if(tokens)tools.append(el('span',tokens,'message-detail'));
    if(tools.childNodes.length)a.append(tools);
    menu.replaceChildren(icon('more'));menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-controls','message-menu');
    // Capture only a deliberate, short horizontal touch gesture. Long holds,
    // mouse drags and selectstart retain native text selection.
    let start;
    const excluded=e=>e.target.closest('a,button,input,textarea,summary,pre,code,table')||getSelection()?.toString();
    a.onpointerdown=e=>{start=null;if(e.pointerType!=='touch'||excluded(e)||e.clientX<24||e.clientX>innerWidth-24)return;start={x:e.clientX,y:e.clientY,at:performance.now(),pointer:e.pointerId,horizontal:false};};
    a.onpointermove=e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(performance.now()-start.at>500||getSelection()?.toString()){start=null;return;}if(Math.abs(dy)>18&&!start.horizontal){start=null;return;}if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(dy)*1.6){start.horizontal=true;a.setPointerCapture(e.pointerId);}};
    a.onselectstart=a.onpointercancel=()=>start=null;
    a.onlostpointercapture=e=>{if(e.target===a)start=null;};
    a.onpointerup=e=>{const gesture=start;start=null;if(!gesture?.horizontal||Math.abs(e.clientX-gesture.x)<65||Math.abs(e.clientY-gesture.y)>35||getSelection()?.toString())return;const intent=alternativeIntent(message,index,snapshot.messages.length,e.clientX<gesture.x?1:-1);if(intent)action(()=>intent.generate?generate('swipe'):chooseSwipe(index,intent.swipeId));};
    restoreDetails(a,index);return a;
}
function render(changed=false){renderHeader();if(!snapshot)return;const pane=$('messages'),oldTop=pane.scrollTop,near=isNearBottom(pane),newTarget=renderedKey!==key(snapshot);if(!newTarget)rememberDetails();const cache=heights.get(key(snapshot))??{};heights.set(key(snapshot),cache);const desired=newTarget?(positions.get(key(snapshot))??Math.max(0,snapshot.messages.length*180-pane.clientHeight)):oldTop;const range=renderRange(snapshot.messages.length,desired,pane.clientHeight||650,cache);pane.replaceChildren();const before=el('div'),after=el('div');before.style.height=`${range.before}px`;after.style.height=`${range.after}px`;pane.append(before,...snapshot.messages.slice(range.start,range.end).map((m,i)=>messageArticle(m,range.start+i)),after);for(const article of pane.querySelectorAll('article'))cache[article.dataset.index]=article.getBoundingClientRect().height+(parseFloat(getComputedStyle(article).marginBottom)||0);renderedKey=key(snapshot);pane.scrollTop=newTarget?(positions.get(key(snapshot))??pane.scrollHeight):oldTop;if(!newTarget&&near&&changed)pane.scrollTop=pane.scrollHeight;$('jump').hidden=isNearBottom(pane);controls();}
function openMenu(index){menuIndex=index;const m=snapshot.messages[index];$('menu-reply').hidden=index!==snapshot.messages.length-1||index<1||m.is_user||m.is_system;$('menu-reply').disabled=engineBusy||working||memoryBusy||review||!connected||draining;$('menu-edit').disabled=!!operation&&same(operation.target,snapshot)&&(operation.mode==='swipe'?index===snapshot.messages.length-1:index>=operation.beforeCount&&!snapshot.messages[index].is_user);const article=$('messages').querySelector(`article[data-index="${index}"]`);chatControls.openFan('message-menu',article.querySelector('.byline button'),'message');article.classList.add('fan-selected');}
async function queueChange(argument,label,coalesce){if(review||!connected)throw Error('Reconnect and review saved changes first.');const item=journal.add({sessionId,argument,label,coalesce:coalesce??(argument.action==='edit'?`edit:${key(argument.target)}:${argument.messageId}`:undefined)});toast(engineBusy||memoryBusy||working?'Changes pending':label);status(engineBusy||memoryBusy||working?'Changes pending':'Applying changes…');await drain();return item;}
async function drain(){if(draining||review||!connected||engineBusy||memoryBusy||working)return;const port=connection.port;draining=true;controls();try{for(const initial of journal.read()){const item=journal.read().find(value=>value.id===initial.id);if(!item)continue;if(connection.port!==port)return;if(item.state==='conflict'||item.argument.action==='newChat'){review=true;break;}if(item.sessionId!==sessionId){review=true;break;}journal.patch(item.id,{state:'applying'});try{if(item.argument.action==='deleteChat'){const before=item.argument.before??{...item.argument.target,...JSON.parse(item.argument.expected)};localStorage.setItem('pocket-tavern.undo.v1',JSON.stringify({value:{before,after:null},expires:Date.now()+12000}));}const result=await workspace(item.argument.action,item.argument,60000);if(result.undo)toast(item.argument.action.startsWith('delete')?'Deleted · Undo available':`${item.label} · Undo available`,result.undo);journal.remove(item.id);if(item.argument.action==='configure'&&result.revision){for(const next of journal.read())if(next.argument.action==='configure')journal.patch(next.id,{argument:{...next.argument,expected:rebaseSettingsGuard(next.argument,item.argument,result)}});}if(item.argument.action==='edit'&&result.snapshot){for(const next of journal.read())if(next.argument.action==='edit'&&same(next.argument.target,item.argument.target)&&next.argument.expected===item.argument.expected)journal.patch(next.id,{argument:{...next.argument,expected:revision({messages:result.snapshot.messages,metadata:result.snapshot.metadata}),before:{messages:result.snapshot.messages}}});}if(result.snapshot){if(item.argument.action==='fork')await openChat(result.snapshot);else if(same(result.snapshot,snapshot)){snapshot=result.snapshot;render(true);}}if(result.deleted&&same(item.argument.target,snapshot)){snapshot=null;navigate('chats');}await refresh();if(snapshot){snapshot=await workspace('read',{target:target(snapshot)});render(true);}status(journal.read().length?'Changes pending':'Changes applied');$('preset-status').textContent=journal.read().some(i=>i.argument.action==='configure')?'Changes pending until the engine finishes.':'Changes applied';}catch(e){if(connection.port!==port)return;journal.patch(item.id,{state:e.code==='BUSY'?'pending':'conflict',error:e.message});if(e.code!=='BUSY'){review=true;error(e);}break;}}}finally{draining=false;controls();if(review)showRecovery('Pending changes need review before continuing.');}}
async function historyChange(arg,label){const before=structuredClone(snapshot);if(arg.action==='fork'){arg.newChatId=`${before.chatId} · fork ${crypto.randomUUID().slice(0,8)}`;arg.integrity=crypto.randomUUID();}return queueChange({...arg,target:target(before),expected:revision({messages:before.messages,metadata:before.metadata}),before:{messages:before.messages}},label);}
async function prepareNewChat(card){
    if(!connected||review||working||draining||startingGeneration||journal.read().length)throw Error('Finish or review pending work before starting another chat.');
    const activity=await raw('activity');if(activity.busy||memoryBusy||operation)throw Object.assign(Error('Wait for generation or Memory to finish before starting another chat.'),{code:'BUSY'});
    const savedCard=await raw('assets',{kind:'characters',action:'read',key:card.key});
    if(savedCard.revision!==card.cardRevision)throw Object.assign(Error('The saved character changed. Reopen it before starting a chat.'),{code:'STALE_ASSET'});
    if(![savedCard.draft.name,savedCard.draft.description,savedCard.draft.first_mes].every(v=>typeof v==='string'&&v.trim()))throw Object.assign(Error('Incomplete character: save a name, description and main greeting before starting a chat.'),{code:'INCOMPLETE_CARD'});
    const before=await workspace('read',{target:card.target});
    return {action:'newChat',target:target(before),before,cardRevision:card.cardRevision,newChatId:`Conversation ${crypto.randomUUID().slice(0,8)}`,operationId:crypto.randomUUID()};
}
async function applyNewChat(argument,guard,{fresh=false}={}){
    if(!connected||review||working||draining||startingGeneration||journal.read().length)throw Error('Finish or review pending work before starting another chat.');
    const activity=await raw('activity');if(activity.busy||memoryBusy||operation)throw Object.assign(Error('Wait for the engine to finish. No chat has been created.'),{code:'BUSY'});
    if(!guard())return;
    if(!connected||review||working||draining||startingGeneration||journal.read().length)throw Error('Finish or review pending work before starting another chat.');
    const port=connection.port;saveDraft();working=true;controls();let item;
    try{
        item=journal.add({sessionId,argument,label:'Start new chat',state:'applying'});
        status('Saving and verifying the new greeting…');
        const result=await workspace('newChat',argument,90000);
        if(connection.port!==port)throw Object.assign(Error('Reconnect and review the saved chats. Nothing will be repeated automatically.'),{code:'DISCONNECTED'});
        const ownsResult=guard();
        if(result.undo)toast('New chat saved · old chat deleted · Undo available',result.undo);
        journal.remove(item.id);await refresh();
        // Refresh can clear the deliberately deleted source. Keep the confirmation's
        // ownership sampled before that refresh, while still respecting Back.
        if(ownsResult&&(fresh?guard():$('new-chat-confirm').open)){$('asset-editor').close();$('library-panel').close();$('history').close();const fromPicker=fresh&&page==='new-chat';await openChat(result.snapshot);if(fromPicker)entryPage='chats';}
        status('New chat saved · greeting ready');
    }catch(e){
        if(item&&journal.read().some(i=>i.id===item.id)){
            if(e.code==='NEW_CHAT_UNCERTAIN'||['TIMEOUT','DISCONNECTED'].includes(e.code)){
                journal.patch(item.id,{state:'conflict',error:e.message});review=true;showRecovery('A new-chat change needs review. Inspect saved work or restore the old chat; nothing will be repeated automatically.');
            }else journal.remove(item.id);
        }
        throw e;
    }finally{working=false;controls();}
}
async function startFreshChat(card,owner){
    if(freshPreparing)return;freshPreparing=true;controls();
    const version=navVersion,guard=owner??(()=>page==='new-chat'&&navVersion===version);
    try{
        if(!connected||review||working||draining||startingGeneration||journal.read().length)throw Error('Finish or review pending work before starting a fresh chat.');
        const activity=await raw('activity');if(activity.busy||operation||memoryBusy)throw Object.assign(Error('Wait for the engine before starting a fresh chat. Browsing stays available.'),{code:'BUSY'});
        const saved=await raw('assets',{kind:'characters',action:'read',key:card.key});
        if(card.cardRevision&&saved.revision!==card.cardRevision)throw Object.assign(Error('The saved character changed. Reopen it first.'),{code:'STALE_ASSET'});
        const readiness=characterStatus(saved.draft);if(!readiness.complete)throw Error('Incomplete character · missing '+readiness.missing.join(', ')+'. Edit it in Characters first.');
        if(!guard())return;
        await applyNewChat({action:'newChat',target:{characterKey:card.key},before:null,cardRevision:saved.revision,newChatId:`Conversation ${crypto.randomUUID().slice(0,8)}`,operationId:crypto.randomUUID(),deleteCurrent:false},guard,{fresh:true});
    }catch(e){if(owner&&guard())$('asset-error').textContent=e.message;throw e;}finally{freshPreparing=false;controls();}
}
async function confirmChatDelete(row){
    const token=++chatDeleteToken;chatDeleteArgument=null;$('chat-delete-name').textContent=`${characters.find(c=>c.key===row.characterKey)?.name??row.characterKey} · ${row.chatId}`;$('chat-delete-status').textContent='Reading the saved conversation…';$('chat-delete-confirm').showModal();controls();
    try{const before=await workspace('read',{target:target(row)});if(token!==chatDeleteToken||!$('chat-delete-confirm').open)return;chatDeleteArgument={action:'deleteChat',target:target(before),before,expected:revision({messages:before.messages,metadata:before.metadata})};$('chat-delete-status').textContent=engineBusy?'Wait for the engine to finish before deleting.':'';controls();}catch(e){if(token===chatDeleteToken)$('chat-delete-status').textContent=e.message;throw e;}
}
async function deleteChat(row){const before=await workspace('read',{target:target(row)});await queueChange({action:'deleteChat',target:target(before),before,expected:revision({messages:before.messages,metadata:before.metadata})},'Delete conversation');}
async function chooseSwipe(index,swipeId){if(swipeId===(snapshot.messages[index].swipe_id??0))return;await historyChange({action:'swipe',messageId:index,swipeId},'Alternative selected');}

const projectedScopes=(value,origin)=>projectSettings(value,origin,journal.read());

async function configureScope(kind,value,scope=scopes.effective.scope,origin=page==='chat'?target(snapshot):null,preset){const targetValue=scope==='global'&&kind!=='scope'?null:origin;const current=await workspace('scopes',{target:targetValue});let previewGeneration;if(kind==='preset')previewGeneration=(await workspace('presetData',{name:value})).generation;const presetChange=kind==='preset'||kind==='generation'&&preset!==undefined;await queueChange({action:'configure',target:targetValue,scope,kind,value,preset,previewGeneration,expected:current.revision},'Settings saved',presetChange?undefined:`settings:${key(targetValue)}:${scope}:${kind}`);const displayedTarget=page==='chat'?target(snapshot):null;scopes=projectedScopes(await workspace('scopes',{target:displayedTarget}),displayedTarget);renderHeader();return scopes;}
async function openPreset(global=false){presetPanelOrigin=global?null:target(snapshot);$('chat-settings').close();await presetPanel.open(global?null:{...target(snapshot),characterName:characters.find(c=>c.key===snapshot.characterKey)?.name??snapshot.characterKey});}
async function openModels(global=false){await modelPanel.open(global?null:{...target(snapshot),characterName:characters.find(c=>c.key===snapshot.characterKey)?.name??snapshot.characterKey});}
async function changeConnection(kind,value){if(engineBusy||memoryBusy)throw Error('Wait for the engine before changing global connection or persona settings.');const current=await raw('settings');await raw('configure',{kind,value,revision:current.revision},60000);await refresh();if(snapshot){snapshot=await workspace('read',{target:target(snapshot)});renderHeader();}}
async function openConnection(){$('chat-settings').close();await settingsPage.open();settingsFrom=page==='settings'?settingsFrom:page;navigate('settings');}
async function openLibrary(kind){$('library-kind').value=kind;await library.open(kind);}
async function editCharacter(c){await library.edit(c.key,{kind:'characters',fromLibrary:page!=='chat'});}
function showStream(){if(!snapshot||!same(operation?.target,snapshot)||page!=='chat')return;const near=isNearBottom($('messages'));const oldThinking=streamNode?.querySelector('.thinking')?.open;streamNode?.remove();streamNode=el('article','','message stream');streamNode.append(el('div','Reply arriving…','byline'),reasoning(streamReasoning),el('div','','bubble'));streamNode.querySelector('.bubble').innerHTML=format(streamText);if(oldThinking??priorThinkingOpen())streamNode.querySelector('details').open=true;$('messages').append(streamNode);if(near)$('messages').scrollTop=$('messages').scrollHeight;}
function onEvent(event){if(event.requestId!==operation?.requestId)return;if(event.type==='text.replace'){if(operation.mode==='send'&&event.text&&same(operation.target,snapshot)&&$('draft').value===operation.text){$('draft').value='';state.saveDraft(operation.target,'');}streamText=event.text;streamReasoning=event.reasoning??'';operation.state=event.state;controls();if(!streamFrame)streamFrame=requestAnimationFrame(()=>{streamFrame=null;if(!same(operation?.target,snapshot)||page!=='chat')return;if(!streamNode?.isConnected)showStream();const near=isNearBottom($('messages'));const bubble=streamNode.querySelector('.bubble');const open=Array.from(bubble.querySelectorAll('details')).map(d=>d.open);bubble.innerHTML=format(streamText);Array.from(bubble.querySelectorAll('details')).forEach((d,i)=>d.open=open[i]??false);const thinking=streamNode.querySelector('.thinking');thinking.hidden=!streamReasoning;thinking.querySelector('.thinking-body').innerHTML=format(streamReasoning);if(near)$('messages').scrollTop=$('messages').scrollHeight;$('jump').hidden=near;});}else if(event.type==='operation.verifying'){operation.state='verifying';status('Saving the reply…');controls();}}
async function finishGeneration(result,pending){if(streamNode&&result.snapshot?.messages?.length){const index=result.snapshot.messages.length-1;detailsState.set(detailKey(result.snapshot.messages[index],index,result.snapshot),Array.from(streamNode.querySelectorAll('details')).map(d=>d.open));}if(same(snapshot,pending.target))saveDraft();if(result.persistence==='verified'){if(pending.argument.mode==='send'&&state.draft(pending.target)===pending.argument.text){state.saveDraft(pending.target,'');if(same(snapshot,pending.target))$('draft').value='';}state.finish();}else{review=true;showRecovery('Read the saved conversation before sending again.');}if(result.snapshot&&same(result.snapshot,snapshot)){snapshot=result.snapshot;render(true);}if(result.error){$('send-error').textContent=result.error.message;$('send-error').hidden=false;}status(result.error?result.error.message:result.state==='cancelled'?'Reply stopped':'Reply saved');await refresh();}
async function waitForEngine(){for(let i=0;i<100;i++){const activity=await raw('activity');if(!activity.busy)return;if(activity.operation)throw Object.assign(Error('Another generation is running. Your draft is kept.'),{code:'BUSY'});status(`Waiting for ${activity.locks?.join(', ')||'the engine save'}…`);await new Promise(resolve=>setTimeout(resolve,100));}throw Object.assign(Error('The engine is still busy. Stop Memory or wait before sending. Your draft is kept.'),{code:'BUSY'});}
async function generate(mode='send'){if(draining){toast('Wait for saved changes to finish. Your draft is kept.');return;}if(engineBusy||memoryBusy||working||startingGeneration){toast('Only one generation at a time. Your draft is kept.');return;}if(review||!connected||!snapshot)return;const port=connection.port;const current=target(snapshot),submittedText=mode==='send'?$('draft').value:'';if(mode==='send'&&!$('draft').value.trim())return;startingGeneration=true;controls();try{saveDraft();rememberDetails();await drain();if(review||journal.read().length)return;working=true;controls();status('Opening engine chat…');await workspace('activate',{target:current});await waitForEngine();const active=await raw('snapshot');if(!same(active,current))throw Error('Engine selected another chat. Refresh before sending.');if(same(snapshot,current)){snapshot=active;render(true);}const argument={...current,requestId:crypto.randomUUID(),mode,text:submittedText,expectedMessage:mode==='swipe'?JSON.stringify(active.messages.at(-1)):undefined};const pending={kind:'send',sessionId,target:current,argument,beforeCount:active.messages.length};state.begin(pending);operation={...argument,target:current,state:'running',beforeCount:active.messages.length};engineBusy=true;working=false;streamText='';streamReasoning='';showStream();status('Waiting for the model…');controls();$('send-error').hidden=true;const result=await raw('send',argument,180000);if(connection.port!==port)return;await finishGeneration(result,pending);}catch(e){if(connection.port!==port)return;if(['NO_CONNECTION','TOOLS_ENABLED','INVALID_ARGUMENT','BUSY','AUTOMATIC_GENERATION','COMPOSER_BUSY','STALE_TARGET','STALE_MESSAGE'].includes(e.code))state.finish();else if(state.pending()){review=true;showRecovery('The request may have been saved. Read it before continuing. Nothing will be resent.');}if(e.code==='BUSY'){try{const activity=await raw('activity');e.message+=' '+(activity.locks?.join(', ')||'Engine mutation still active.');}catch{}}$('send-error').textContent=e.message;$('send-error').hidden=false;error(e);}finally{if(connection.port===port){operation=null;engineBusy=false;working=false;startingGeneration=false;streamNode=null;render(true);controls();await drain();}}}
function showRecovery(text){$('recovery').hidden=false;$('recovery-detail').textContent=text;$('recovery-title').textContent=connected?'Review saved work':'Engine disconnected';controls();}
function disconnected(text){connected=false;review=!!state.pending()||!!journal.read().length;connection.disconnect(text);engineBusy=false;working=false;operation=null;startingGeneration=false;showRecovery(text);status('Engine disconnected · drafts kept');renderPage();}
async function initialize(){if(initializing)return;initializing=true;controls();let port;try{const channel=new MessageChannel();port=channel.port1;connection.connect(port);$('engine').contentWindow.postMessage({type:'st-mobile-connect'},location.origin,[channel.port2]);const info=await raw('handshake',undefined,30000);if(connection.port!==port)return;checkBridgeBuild(info);sessionId=info.sessionId;connected=true;const activity=await raw('activity');engineBusy=activity.busy;review=!!journal.read().length;await refresh();scopes=await workspace('scopes');const last=state.target();if(last){try{snapshot=await workspace('read',{target:last});scopes=await workspace('scopes',{target:last});$('draft').value=state.draft(last);}catch{snapshot=null;}}else scopes=await workspace('scopes');
        const pending=state.pending();if(pending){let result;try{if(pending.sessionId===sessionId)result=await raw('status',pending.argument.requestId);}catch{}const decision=recoveryDecision(pending,sessionId,result);if(decision==='observe'){operation={...pending.argument,target:pending.target,state:result.state,beforeCount:pending.beforeCount};observeOperation(pending);}else if(decision==='settled')await finishGeneration(result,pending);else review=true;}
        $('recovery').hidden=!review;if(review)showRecovery('The app restarted with saved work pending. Review before resuming.');status('Engine ready');try{const savedUndo=JSON.parse(localStorage.getItem('pocket-tavern.undo.v1'));if(savedUndo?.expires>Date.now())toast('Deletion recovery is available',savedUndo.value,savedUndo.expires-Date.now());}catch{}renderPage();controls();
    }catch(e){if(connection.port===port)disconnected(e.message);}finally{if(connection.port===port || !connection.port){initializing=false;controls();}}}
async function observeOperation(pending,port=connection.port){if(connection.port!==port||!operation)return;try{const result=await raw('status',pending.argument.requestId);if(connection.port!==port||!operation)return;streamText=result.text??'';streamReasoning=result.reasoning??'';operation.state=result.state;if(['running','stopping','verifying'].includes(result.state)){showStream();setTimeout(()=>observeOperation(pending,port),1000);}else{operation=null;engineBusy=false;await finishGeneration(result,pending);render(true);controls();await drain();}}catch(e){if(connection.port===port)disconnected(e.message);}}
async function reviewWork(){const activity=await raw('activity');if(activity.busy)throw Error('Wait for generation or Memory to finish before reviewing changes.');if(state.pending()){const pending=state.pending();const saved=await workspace('read',{target:pending.target});await openChat(saved);if(submittedUserMessage(pending,saved)&&state.draft(pending.target)===pending.argument?.text){state.saveDraft(pending.target,'');$('draft').value='';}state.finish();}const list=$('queue-list');list.replaceChildren();for(const item of journal.read()){const row=el('section');row.append(el('p',`${item.label} · ${item.argument.newChatId??item.argument.target?.chatId??'global'} · ${item.error??item.state}`),button('Discard this change',()=>{journal.remove(item.id);reviewWork();}));if(item.argument.newChatId)row.append(button(item.argument.action==='newChat'?'Inspect created chat':'Open created fork',()=>openChat({...item.argument.target,chatId:item.argument.newChatId})));if(item.argument.action==='newChat'&&item.argument.deleteCurrent)row.append(button('Restore old chat',async()=>{await workspace('undo',{value:{before:item.argument.before,after:null}});journal.remove(item.id);await reviewWork();await refresh();}));if(item.argument.action==='deleteChat')row.append(button('Restore deleted chat',async()=>{const before=item.argument.before??{...item.argument.target,...JSON.parse(item.argument.expected)};await workspace('undo',{value:{before,after:null}});journal.remove(item.id);await reviewWork();await refresh();}));list.append(row);}if(journal.read().length)$('queue-review').showModal();else{$('queue-review').close();review=false;$('recovery').hidden=true;$('send-error').hidden=true;status('Saved work reviewed · ready');controls();}}
const rpc=async(method,arg,timeout)=>{if(method==='configure'&&arg?.kind==='persona'&&snapshot){await workspace('activate',{target:target(snapshot)});}if(method==='extensions'&&arg?.action==='read'){const value=await raw(method,arg,timeout);if(snapshot){if(!same(value.target,snapshot))value.memory=snapshot.metadata.summaryception??{layers:[]};value.needsRebuild=!!snapshot.metadata.pocket_tavern?.memoryInvalid;}return value;}return raw(method,arg,timeout);};
settingsPanel=createSettingsPanel({rpc,action,adoptSnapshot:refresh,status,locked:()=>!connected||review||engineBusy||memoryBusy});
newChatPanel=createNewChatPanel({action,prepare:prepareNewChat,apply:applyNewChat,available:()=>connected&&!review&&!engineBusy&&!memoryBusy&&!working&&!draining&&!startingGeneration&&!journal.read().length});
library=createLibrary({rpc,action,onStartChat:(card,guard)=>newChatPanel.open(card,guard),onStartFresh:startFreshChat,readChat:()=>snapshot,onChat:(row,guard)=>openChat(row,{dismissPanels:false,guard}),refreshAvailability:async()=>{const activity=await raw('activity');engineBusy=activity.busy||!!operation;controls();},onDeleted:characterKey=>{if(snapshot?.characterKey===characterKey){navigate('characters',{dismissPanels:false});snapshot=null;selected.clear();}},format,converter:new showdown.Converter({tables:true,strikethrough:true,simpleLineBreaks:true}),sanitize:(html,options)=>DOMPurify.sanitize(html,options),locked:()=>!connected||review,refresh,onEditor:(kind,key)=>{$('character-chats').hidden=page!=='chat'||kind!=='characters'||key!==snapshot?.characterKey;}});
libraryViews=createLibraryViews({node:el,button,portrait,personaPortrait,windowList,editCharacter:c=>library.edit(c.key,{kind:'characters',fromLibrary:true}),createCharacter:()=>library.createCharacter(),importCharacters:()=>{importUncertain=false;$('character-import-file').value='';$('character-import-file').disabled=importWaiting;$('character-import-status').textContent='Choose a character card from your device.';$('character-import-confirm').showModal();},editPersona:p=>action(()=>openPersonaEditor(p)),createPersona:()=>action(()=>openPersonaEditor(null)),startFresh:startFreshChat,onDelete:confirmChatDelete,readCard:key=>raw('assets',{kind:'characters',action:'read',key}),availability:()=>connected&&!review&&!freshPreparing&&!engineBusy&&!working&&!memoryBusy&&!draining&&!startingGeneration});
$('character-import-file').onchange=()=>action(async()=>{const file=$('character-import-file').files[0];if(!file||importWaiting||importUncertain)return;importWaiting=true;$('character-import-file').disabled=true;$('character-import-status').textContent='Importing and verifying the native card…';try{await library.importCharacter(file);$('character-import-confirm').close();status('Character imported and verified');}catch(e){importUncertain=true;$('character-import-status').textContent=e.message+' Inspect saved characters before another import.';throw e;}finally{importWaiting=false;if(!importUncertain)$('character-import-file').disabled=false;}});
settingsPage=createSettingsPage({rpc,action,locked:()=>!connected||review||engineBusy||memoryBusy||working,notify:text=>toast(text),reconnect:()=>$('reconnect').click(),connected:()=>connected,adoptSnapshot:refresh,getAppearance:()=>appearance,setAppearance:value=>{appearance=applyAppearance(saveAppearance(localStorage,value));},probeProxy:()=>fetch('http://127.0.0.1:8001/',{mode:'no-cors',signal:AbortSignal.timeout(1500)}).then(()=>true,()=>false)});
wiPanel=createWorldInfoPanel({rpc,action,locked:()=>!connected||review||engineBusy||working||memoryBusy,notify:text=>toast(text),navigate:value=>navigate(value),setSubtitle:text=>{$('page-subtitle').textContent=text;$('page-subtitle').hidden=!text;}});
memoryPanel=createMemoryPanel({rpc,action,locked:()=>!connected||review||engineBusy||working,connected:()=>connected,onState:value=>{if(value.busy&&!memoryWasBusy)memoryStopAsked=false;if(memoryWasBusy&&!value.busy&&!value.failure){memoryResult=memoryStopAsked?'stopped':'done';clearTimeout(memoryResultTimer);memoryResultTimer=setTimeout(()=>{memoryResult=null;renderMemoryNotice();},6000);}if(value.busy)memoryResult=null;memoryWasBusy=value.busy;memoryState=value;renderMemoryNotice(value);},onStopRequested:()=>{memoryStopAsked=true;},notify:text=>toast(text),onBusy:value=>{memoryBusy=value;controls();if(!value)drain();},refresh:async()=>{await refresh();if(snapshot&&!engineBusy){snapshot=await workspace('read',{target:target(snapshot)});render(true);}}});
for(const id of ['setting-preset','edit-active-preset','setting-thinking','setting-tools','setting-model','setting-custom-model','apply-custom-model']){const n=$(id);n.hidden=true;const label=document.querySelector(`label[for="${id}"]`);if(label)label.hidden=true;if(n.parentNode.tagName==='LABEL')n.parentNode.hidden=true;}
// The skeleton exposes global pause and frequency. Existing advanced controls stay in ST.
// Memory fields are now rendered dynamically by the memory page; no static hiding needed.
chatControls=createChatControls({onBack:()=>{if(page==='chat'){navigate(entryPage);return true;}if(page==='new-chat'){navigate('chats');return true;}if(page!=='home'){navigate('home');return true;}return false;}});
modelPanel=createModelPanel({action,windowList,openConnection,load:async origin=>({state:projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin),configuration:await raw('settings')}),select:async(kind,value,scope,origin)=>{await configureScope(kind,value,scope,origin?target(origin):null);return {state:projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin),configuration:await raw('settings'),pending:journal.read().some(i=>i.argument.action==='configure')};}});
const loadPresetState=async origin=>{const state=projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin);const configuration=await raw('settings');let fields=[];if(configuration.presets.length)fields=(await workspace('presetData',{name:configuration.presets[0]})).fields;return {state,configuration,fields};};
presetPanel=createPresetPanel({action,available:()=>connected&&!review,load:loadPresetState,change:async(kind,value,scope,origin,preset)=>{await configureScope(kind,value,scope,origin?target(origin):null,preset);return {...await loadPresetState(origin),pending:journal.read().some(i=>i.argument.action==='configure')};}});
for(const n of document.querySelectorAll('[data-close]'))n.onclick=()=>$(n.dataset.close).close();
for(const b of $('bottom-nav').querySelectorAll('button')){b.prepend(icon({home:'home',chats:'chat',characters:'characters',personas:'persona',wi:'book'}[b.dataset.page]));b.onclick=()=>action(async()=>{if(b.dataset.page==='home'&&page==='home'){const row=recents.find(r=>same(r,state.target()))??recents[0];if(row)await openChat(row);}else navigate(b.dataset.page);});}
$('page-back').onclick=()=>{if(page==='persona-editor')navigate('personas');else if(page==='persona-picker')navigate('chat');else if(page==='memory')navigate('chat');else if(page==='wi-entry'||page==='wi-activation')action(()=>wiPanel.leave(page));else if(page==='settings')navigate(settingsFrom);else navigate('chats');};$('page-wi-activation').onclick=()=>action(()=>wiPanel.openActivation());$('page-new-chat').onclick=showCharacters;
$('chat-delete-apply').onclick=()=>action(async()=>{if(!chatDeleteArgument||$('chat-delete-apply').disabled)return;const captured=chatDeleteArgument;$('chat-delete-confirm').close();chatDeleteArgument=null;await queueChange(captured,'Delete conversation');});
$('back').onclick=()=>navigate(entryPage);$('avatar').onclick=$('name').onclick=()=>action(()=>editCharacter(characters.find(c=>c.key===snapshot.characterKey)));$('app-settings').onclick=()=>action(openConnection);
$('settings-button').onclick=()=>chatControls.openFan('chat-settings',$('settings-button'),'gear');$('open-preset').onclick=()=>action(()=>openPreset());$('open-persona').onclick=$('active-persona').onclick=()=>action(()=>openPersonaPicker());$('open-connection').onclick=()=>action(openConnection);$('open-memory').onclick=()=>{$('chat-settings').close();action(async()=>{await memoryPanel.open();navigate('memory');});};$('open-history').onclick=()=>{const rows=recents.filter(r=>r.characterKey===snapshot.characterKey);$('chat-list').replaceChildren(...rows.map(chatRow));$('history').showModal();};$('character-chats').onclick=()=>{$('asset-editor').close();$('library-panel').close();$('open-history').click();};$('close-history').onclick=()=>$('history').close();$('new-chat').onclick=()=>action(async()=>{const origin=target(snapshot);const card=await raw('assets',{kind:'characters',action:'read',key:origin.characterKey});await newChatPanel.open({key:origin.characterKey,name:card.draft.name,cardRevision:card.revision,target:origin},()=>same(snapshot,origin));});$('rename-chat').hidden=true;$('delete-chat').onclick=()=>action(()=>confirmChatDelete(snapshot));
$('model-chip').onclick=()=>action(()=>openModels());$('scope-chip').onclick=$('active-preset').onclick=()=>action(()=>openPreset());
$('menu-copy').onclick=()=>action(async()=>{const text=snapshot.messages[menuIndex].mes;$('message-menu').close();try{await navigator.clipboard.writeText(text);toast('Copied');}catch{$('copy-text').value=text;$('copy-fallback').showModal();$('copy-text').select();}});
$('menu-edit').onclick=()=>{editorTarget={target:target(snapshot),expected:revision({messages:snapshot.messages,metadata:snapshot.metadata}),before:{messages:structuredClone(snapshot.messages)},messageId:menuIndex};inlineDraft=snapshot.messages[menuIndex].mes;$('message-menu').close();render();$('messages').querySelector('.inline-editor textarea')?.focus({preventScroll:true});};
function confirmDelete(ids){deleteArgument={action:'deleteMessages',ids,target:target(snapshot),expected:revision({messages:snapshot.messages,metadata:snapshot.metadata}),before:{messages:structuredClone(snapshot.messages)}};$('delete-heading').textContent=ids.length===1?'Delete this message?':`Delete ${ids.length} messages?`;$('delete-target').textContent=ids.length===1?`${snapshot.messages[ids[0]].name??'Message'} · message ${ids[0]+1} · ${snapshot.chatId}`:`Messages ${ids.map(i=>i+1).join(', ')} · ${snapshot.chatId}`;$('delete-confirm').showModal();}
$('menu-delete').onclick=()=>{$('message-menu').close();confirmDelete([menuIndex]);};
$('confirm-delete').onclick=()=>action(async()=>{const argument=deleteArgument;$('delete-confirm').close();await queueChange(argument,'Messages deleted');selecting=false;selected.clear();render();});
$('menu-fork').onclick=()=>action(async()=>{$('message-menu').close();await historyChange({action:'fork',messageId:menuIndex},'Fork created');});
$('menu-reply').onclick=()=>{$('message-menu').close();action(()=>generate('swipe'));};
$('menu-select').onclick=()=>{selecting=true;selected.add(menuIndex);$('message-menu').close();render();};$('cancel-selection').onclick=()=>{selecting=false;selected.clear();render();};$('delete-selected').onclick=()=>confirmDelete([...selected]);
$('memory-notice-open').onclick=()=>{chatControls.dismiss();action(async()=>{await memoryPanel.open();navigate('memory');});};$('memory-notice-stop').onclick=()=>action(async()=>{memoryStopAsked=true;const value=await rpc('extensions',{id:'summaryception',action:'stop'},180000);memoryState=value;renderMemoryNotice(value);});
$('undo').onclick=()=>action(async()=>{const copy=undoRecord;if(!copy)return;await queueChange({action:'undo',value:copy},'Deletion undone');undoRecord=null;$('toast').hidden=true;});
$('draft').oninput=()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>action(async()=>saveDraft()),1000);controls();};$('composer').onsubmit=e=>{e.preventDefault();generate();};$('stop').onclick=()=>action(async()=>{operation.state='stopping';controls();try{await raw('stop',operation.requestId);status('Stopping and saving…');}catch(e){if(operation)operation.state='running';controls();throw e;}});
let listFrame;$('landing').onscroll=()=>{if(!listFrame)listFrame=requestAnimationFrame(()=>{listFrame=null;listRenderer?.();});};
let scrollFrame;$('messages').onscroll=()=>{if(!snapshot)return;$('jump').hidden=isNearBottom($('messages'));if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;const pane=$('messages');const first=pane.querySelector('article[data-index]');const last=Array.from(pane.querySelectorAll('article[data-index]')).at(-1);if((first&&Number(first.dataset.index)>0&&first.getBoundingClientRect().top>pane.getBoundingClientRect().top)||(last&&Number(last.dataset.index)<snapshot.messages.length-1&&last.getBoundingClientRect().bottom<pane.getBoundingClientRect().bottom)){render();if(operation&&same(operation.target,snapshot))showStream();}});};$('jump').onclick=()=>{positions.delete(key(snapshot));renderedKey=null;render();};
$('reconnect').onclick=()=>{saveDraft();disconnected('Reloading the engine. Nothing is resent.');engineMonitor.reset();initializing=false;$('engine').src=`/?mobileRuntime=1&reconnect=${Date.now()}`;};$('review').onclick=()=>action(reviewWork);$('resume-queue').onclick=()=>action(async()=>{const items=journal.read();if(items.some(i=>i.state==='conflict'))throw Error('Discard conflicted changes before resuming.');for(const item of items)journal.patch(item.id,{sessionId,state:'pending'});review=false;$('queue-review').close();$('recovery').hidden=true;await drain();});$('discard-queue').onclick=()=>{journal.clear();review=false;$('queue-review').close();$('recovery').hidden=true;controls();};
window.addEventListener('message',e=>{if(e.source===$('engine').contentWindow&&e.origin===location.origin&&e.data?.type==='st-mobile-ready')initialize();});window.addEventListener('beforeunload',()=>saveDraft());document.addEventListener('visibilitychange',()=>{saveDraft();if(!document.hidden)checkHealth();});
const engineMonitor=createEngineMonitor({connection,probe:probeEngine,isReady:()=>connected&&!initializing,onActivity:async activity=>{engineBusy=activity.busy||!!operation;controls();if(!engineBusy)await drain();},onDisconnect:disconnected});
const checkHealth=()=>engineMonitor.check();
setInterval(checkHealth,3000);setTimeout(()=>{if(!connected)showRecovery('Start the local ST engine, then reconnect.');},20000);controls();renderPage();
