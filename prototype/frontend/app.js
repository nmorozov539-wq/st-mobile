import {createLibraryViews,characterStatus,chatDate,chatGroups} from './libraries.js?build=0.9.2';
import {createNewChatPanel} from './new-chat-panel.js?build=0.9.2';
import {createEngineMonitor} from './engine-monitor.js?build=0.9.2';
import {checkBridgeBuild,FRONTEND_BUILD} from './build.js?build=0.9.2';
import {createLocalState,isNearBottom,submittedUserMessage,recoveryDecision} from './state.js?build=0.9.2';
import {createJournal,revision,renderRange,failureOutcome} from './journal.js?build=0.9.2';
import {RuntimeConnection} from './transport.js?build=0.9.2';
import {DOMPurify,showdown} from '/lib.js';
import {createHTMLFormatter} from './html-format.js?build=0.9.2';
import {createSettingsPanel} from './settings.js?build=0.9.2';
import {createLibrary} from './library.js?build=0.9.2';
import {createMemoryPanel} from './memory.js?build=0.9.2';
import {confirmDialog} from './wi-ui.js?build=0.9.2';
import {createWorldInfoPanel} from './world-info.js?build=0.9.2';
import {renderHome,homeStatus,homeDot} from './home.js?build=0.9.2';
import {createSettingsPage} from './settings-page.js?build=0.9.2';
import {loadAppearance,saveAppearance,applyAppearance,clockText,modelName,tokenText} from './appearance.js?build=0.9.2';
import {probeEngine} from './engine-health.js?build=0.9.2';
import {createPresetPanel} from './preset-panel.js?build=0.9.2';
import {icon} from './icons.js?build=0.9.2';
import {createChatControls,generationDuration,alternativeIntent} from './chat-controls.js?build=0.9.2';
import {createModelPanel} from './model-panel.js?build=0.9.2';
import {createCharacterColours} from './char-colour.js?build=0.9.2';
import {compileDisplay,applyDisplay,messageDepth,placementFor,PLACEMENT} from './regex-display.js?build=0.9.2';
import {projectSettings,rebaseSettingsGuard} from './scoped-settings.js?build=0.9.2';
import {loadTheme} from './color-theme.js?build=0.9.2';
import {createThemeStore} from './color-theme-store.js?build=0.9.2';
import {loadLayoutPreferences,saveLayoutPreferences,visibleDestinations,wideLayoutEligible} from './layout-preferences.js?build=0.9.2';
import {readableError} from './error-message.js?build=0.9.2';
import {createErrorEventStore,normalizeErrorRecord} from './error-record.js?build=0.9.2';
let colorThemes;
loadTheme(new URL('./themes/hearth.json',import.meta.url))
    .then(async baseTheme=>{
        const extras=await Promise.all(['paper','nocturne','monolith'].map(async name=>{try{return await loadTheme(new URL(`./themes/${name}.json`,import.meta.url));}catch(error){console.error(`${name} theme unavailable:`,error);return null;}}));
        colorThemes=createThemeStore({builtInThemes:[baseTheme,...extras.filter(Boolean)],onApply:theme=>{characterColours.setTheme(theme);colourFor=null;if(snapshot)applyCharacterColour(characters.find(c=>c.key===snapshot.characterKey));}});
        $('theme-recovery').hidden=!colorThemes.needsRecovery();
        $('theme-recovery').onclick=()=>{colorThemes.select('hearth');$('theme-recovery').hidden=true;$('theme-preview-bar').hidden=true;toast('Safe Hearth theme restored. Personal themes were kept.');};
    })
    .catch(error=>console.error('Using safe built-in theme colors:',error));
const $=id=>document.getElementById(id), el=(tag,text='',className)=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
const format=createHTMLFormatter({converter:new showdown.Converter({tables:true,strikethrough:true,simpleLineBreaks:true}),sanitize:(html,options)=>DOMPurify.sanitize(html,options),document});
const state=createLocalState(localStorage),journal=createJournal(localStorage),errorEvents=createErrorEventStore(localStorage),connection=new RuntimeConnection(onEvent);
const raw=(method,arg,timeout)=>connection.request(method,arg,timeout);
const workspace=(action,arg={},timeout=45000)=>raw('workspace',{action,...arg},timeout);
const target=value=>value?.characterKey&&value?.chatId?{characterKey:value.characterKey,chatId:value.chatId}:null;
const key=value=>state.draftKey(value),same=(a,b)=>key(a)===key(b);
let freshPreparing=false;
let snapshot,characters=[],recents=[],configuration,scopes,sessionId,connected=false,initializing=false,engineBusy=false,working=false,memoryBusy=false,review=false,draining=false;
let page='home',entryPage='home',librarySection='characters',operation=null,streamText='',streamReasoning='',streamFrame,streamNode,renderedKey,menuIndex,editorTarget,selected=new Set(),selecting=false,undoRecord,undoTimer,draftTimer;
let newChatPanel,libraryViews,navVersion=0,chatDeleteArgument=null,chatDeleteToken=0,importWaiting=false,importUncertain=false;
let settingsPanel,settingsPage,settingsFrom='home',apiChecked=false,appearance=applyAppearance(loadAppearance(localStorage)),library,memoryPanel,wiPanel,presetPanel,chatControls,modelPanel,inlineDraft='',deleteArgument,memoryState,statusTimer,startingGeneration=false;
let collections={version:1,revision:0,folders:[],assignments:{}};
async function changeCollection(kind,value={}){collections=await raw('collections',{action:kind,revision:collections.revision,...value});renderPage();}
let presetPanelOrigin=null;
let personaEdit=null,personaPortraitFile=null;
let memoryWasBusy=false,memoryStopAsked=false,memoryResult=null,memoryResultTimer;
let bridgeCapabilities={},nativeSurface=null,layoutPreferences=loadLayoutPreferences(localStorage),layoutTransition=false;
let wideChatSelection=null,wideChatLoad=0,wideLibrarySelection={characters:null,personas:null},wideLibraryLoad=0;
const pagePositions=new Map(),widePanePositions=new Map();let listRenderer;
// List pages: a search field for long lists, the Characters layout/sort/tag and the Chats grouping.
const LIST_PREFS='pocket-tavern.lists.v1';const listQuery={chats:'',characters:'',personas:''};
let listPrefs=(()=>{try{const saved=JSON.parse(localStorage.getItem(LIST_PREFS)??'{}'),legacy=saved.characterTag?[saved.characterTag]:[];return {characterView:'cards',characterSort:'recent',characterTags:legacy,characterFolder:'all',chatGroup:'recent',...saved,characterTags:Array.isArray(saved.characterTags)?saved.characterTags:legacy};}catch{return {characterView:'cards',characterSort:'recent',characterTags:[],characterFolder:'all',chatGroup:'recent'};}})();
function setListPref(key,value){listPrefs={...listPrefs,[key]:value};try{localStorage.setItem(LIST_PREFS,JSON.stringify(listPrefs));}catch{}renderPage();}
const SEARCH_AT=8;
function pageActions(list){$('page-actions').replaceChildren(...list.map(a=>{const b=button(a.visibleLabel??'',a.run);if(a.id)b.id=a.id;b.className=a.primary?'page-action primary':'page-action';b.prepend(icon(a.icon));b.setAttribute('aria-label',a.label);b.title=a.label;b.disabled=!!a.disabled;return b;}));}
function listPage(){return page==='library'?librarySection:page;}
function renderSearch(){const current=listPage(),count={chats:recents.length,characters:characters.length,personas:configuration?.personas?.length??0}[current];const show=count!==undefined&&(count>=SEARCH_AT||!!listQuery[current]);$('page-search').hidden=!show;if(!show)return;const input=$('page-search-input');if(document.activeElement!==input)input.value=listQuery[current];input.placeholder={chats:'Search chats',characters:'Search names and tags',personas:'Search personas'}[current];input.setAttribute('aria-label',input.placeholder);$('page-search-clear').hidden=!input.value;}

function libraryTabs(content){const tabs=el('div','','library-tabs');tabs.setAttribute('role','tablist');for(const [id,label] of [['characters','Characters'],['personas','Personas'],...(layoutPreferences.wiPlacement==='library'?[['wi','World Info']]:[])]){const b=button(label,()=>{librarySection=id;renderPage();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(librarySection===id));tabs.append(b);}content.append(tabs);}
function extensionsPlaceholder(content){const box=el('section','','extensions-placeholder');box.append(icon('extension'),el('h2','Extensions are coming later'),el('p','Pocket is not claiming general SillyTavern extension compatibility yet. Summaryception remains available from an active chat while its dedicated placement is deferred.'));content.append(box);}
function chatMatches(row,q){if(!q)return true;const c=characters.find(c=>c.key===row.characterKey);return `${c?.name??row.characterKey} ${row.chatId} ${row.preview??''}`.toLocaleLowerCase().includes(q);}
const wideLayout=()=>wideLayoutEligible(innerWidth,parseFloat(getComputedStyle(document.documentElement).fontSize));
const wideChatSurface=()=>page==='chats'&&wideLayout();
const chatSurfaceActive=()=>page==='chat'||wideChatSurface();
// Before the first library read: a quiet loading line, or after a long wait a plain error with Reconnect.
function engineStalled(){return !connected&&(Date.now()-connectStartedAt>45000||!$('recovery').hidden);}
function waitingState(content){const stalled=engineStalled();const box=el('div','','list-empty list-waiting');box.setAttribute('role','status');box.append(el('strong',stalled?'Can’t reach the engine':'Loading…'),el('span',stalled?'Pocket Tavern can’t talk to SillyTavern right now. Your drafts are kept.':'Reading your library from SillyTavern.'));if(stalled&&$('recovery').hidden){const again=button('Reconnect',()=>$('reconnect').click());again.className='btn secondary';again.prepend(icon('refresh'));const actions=el('div','','list-empty-actions');actions.append(again);box.append(actions);}content.append(box);}
function preserveChatSurface(force=false){
    if(!snapshot||(!force&&!chatSurfaceActive()))return;
    rememberDetails();saveDraft();positions.set(key(snapshot),$('messages').scrollTop);
}
function parkChatSurface(){
    const surface=$('chat-screen');
    if(surface.parentElement!==document.querySelector('.pocket-shell'))$('bottom-nav').before(surface);
    surface.classList.remove('wide-embedded-chat');surface.hidden=true;
}
function loadWideChat(row){
    preserveChatSurface();
    const selection={target:target(row),row,snapshot:null,loading:true,error:null},token=++wideChatLoad;wideChatSelection=selection;renderPage();
    Promise.all([workspace('read',{target:selection.target}),workspace('scopes',{target:selection.target})]).then(([value,nextScopes])=>{
        if(token!==wideChatLoad||page!=='chats'||!wideLayout()||!same(selection.target,wideChatSelection?.target))return;
        snapshot=value;scopes=projectedScopes(nextScopes,value);selected.clear();selecting=false;$('draft').value=state.draft(value);wideChatSelection={...selection,snapshot:value,loading:false};renderedKey=null;renderPage();
    }).catch(error=>{if(token!==wideChatLoad||page!=='chats')return;wideChatSelection={...selection,loading:false,error:error.message};renderPage();});
}
function renderWideChatDetail(detail){
    const selected=wideChatSelection;if(!selected){detail.append(el('p','Select a conversation','library-empty'));return;}
    const c=characters.find(card=>card.key===selected.target.characterKey),head=el('div','','wide-detail-heading');head.append(portrait(c),el('div'));head.lastChild.append(el('p','Selected conversation','eyebrow'),el('h2',c?.name??selected.target.characterKey),el('strong',selected.target.chatId));detail.append(head);
    if(selected.loading){detail.append(el('p','Loading saved conversation…','library-empty'));return;}
    if(selected.error){detail.append(el('p',selected.error,'banner'));const retry=button('Try again',()=>loadWideChat(selected.row));retry.className='btn secondary';detail.append(retry);return;}
    if(!selected.snapshot||!same(selected.snapshot,snapshot)){detail.append(el('p','Loading shared conversation controls…','library-empty'));return;}
    const surface=$('chat-screen'),scrollTarget=positions.get(key(snapshot));surface.classList.add('wide-embedded-chat');surface.hidden=false;detail.classList.add('shared-chat-detail');detail.replaceChildren(surface);renderedKey=null;render(false);if(scrollTarget!==undefined)requestAnimationFrame(()=>{if(wideChatSurface()&&same(selected.target,snapshot))$('messages').scrollTop=scrollTarget;});if(operation&&same(operation.target,snapshot))showStream();controls();
}
const expandedChatGroups=new Set();
function renderChats(content){
    const isWide=wideLayout();let detail;if(isWide){const shell=el('div','','wide-master-detail chats-master-detail'),master=el('div','','wide-master');detail=el('aside','','wide-detail wide-chat-detail');shell.append(master,detail);content.append(shell);content=master;}
    if(!recents.length){const empty=el('div','','list-empty');empty.append(el('strong','No chats yet'),el('span','Pick a character to start your first story.'));const go=button('Choose a character',()=>navigate('new-chat'));go.className='btn primary';go.prepend(icon('plus'));go.disabled=!connected||review;const actions=el('div','','list-empty-actions');actions.append(go);empty.append(actions);content.append(empty);if(detail)renderWideChatDetail(detail);return;}
    const controls=el('div','','chat-view-controls'),viewButton=button(listPrefs.chatGroup==='character'?'By character':'Recent',()=>viewSheet.showModal());viewButton.className='btn secondary';viewButton.prepend(icon('group'));const viewSheet=el('dialog','','collection-filter-sheet'),form=el('form','','collection-filter-form');form.method='dialog';form.append(el('h2','Chat view'));for(const [value,label] of [['recent','Recent'],['character','By character']]){const choice=el('label','','filter-choice'),input=el('input');input.type='radio';input.name='chat-group';input.value=value;input.checked=listPrefs.chatGroup===value;input.onchange=()=>{expandedChatGroups.clear();viewSheet.close();setListPref('chatGroup',value);};choice.append(input,el('span',label));form.append(choice);}const cancel=button('Cancel',()=>viewSheet.close());cancel.type='button';form.append(cancel);viewSheet.append(form);controls.append(viewButton,viewSheet);content.append(controls);
    const q=listQuery.chats.trim().toLocaleLowerCase(),rows=recents.filter(r=>chatMatches(r,q));
    if(!rows.length){content.append(el('p',`No chats match “${listQuery.chats}”.`,'library-empty'));if(detail)detail.append(el('p','No conversation selected','library-empty'));return;}
    if(isWide&&!rows.some(row=>same(row,wideChatSelection?.target))){queueMicrotask(()=>{if(page==='chats'&&wideLayout())loadWideChat(rows[0]);});}
    const perCharacter=new Map();for(const r of recents)perCharacter.set(r.characterKey,(perCharacter.get(r.characterKey)??0)+1);
    if(listPrefs.chatGroup==='character'){
        for(const group of chatGroups(rows)){const c=characters.find(c=>c.key===group.characterKey);const box=el('details','','chat-group');box.open=expandedChatGroups.has(group.characterKey);const head=el('summary','','chat-group-head');head.append(portrait(c),el('strong',c?.name??group.characterKey),el('span',`${group.chats.length} match${group.chats.length===1?'':'es'}`,'chat-group-count'));box.append(head);const list=el('div','','chat-group-rows');box.append(list);const fill=()=>{if(box.open)expandedChatGroups.add(group.characterKey);else expandedChatGroups.delete(group.characterKey);if(!list.childElementCount)list.append(...group.chats.map(r=>chatRow({...r,inGroup:true},{wide:isWide})));};if(box.open)fill();box.addEventListener('toggle',fill);content.append(box);}
    }else windowList(content,rows,r=>chatRow({...r,showChatName:(perCharacter.get(r.characterKey)??0)>1},{wide:isWide}),112);
    if(detail)renderWideChatDetail(detail);
    if(recents.length===1000)content.append(el('p','Showing the most recent 1,000 conversations. The Character selector has its complete saved history.','library-caption'));
}
function loadWideLibrary(kind,item,{rerender=true}={}){
    const id=kind==='characters'?item.key:item.id,token=++wideLibraryLoad;wideLibrarySelection[kind]={key:id,item,value:null,loading:true,error:null};if(rerender)renderPage();
    raw('assets',{kind,action:'read',key:id}).then(value=>{if(token!==wideLibraryLoad||page!=='library'||librarySection!==kind||wideLibrarySelection[kind]?.key!==id)return;wideLibrarySelection[kind]={key:id,item,value,loading:false,error:null};renderPage();}).catch(error=>{if(token!==wideLibraryLoad||page!=='library'||librarySection!==kind)return;wideLibrarySelection[kind]={key:id,item,value:null,loading:false,error:error.message};renderPage();});
}
function wideLibraryRich(detail,title,value){if(!String(value??'').trim())return;const section=el('section','','wide-library-section');section.append(el('h3',title));const body=el('div','','wide-library-copy');body.innerHTML=format(String(value));section.append(body);detail.append(section);}
function renderWideLibraryDetail(detail,kind){
    const selected=wideLibrarySelection[kind];if(!selected){detail.append(el('p',`No ${kind==='characters'?'character':'persona'} selected`,'library-empty'));return;}
    const item=selected.item,head=el('div','','wide-detail-heading');head.append(kind==='characters'?portrait(item):personaPortrait(item),el('div'));head.lastChild.append(el('p',kind==='characters'?'Selected character':'Selected persona','eyebrow'),el('h2',item.name));detail.append(head);
    if(selected.loading){detail.append(el('p','Loading saved details…','library-empty'));return;}
    if(selected.error){detail.append(el('p',selected.error,'banner'));const retry=button('Try again',()=>loadWideLibrary(kind,item));retry.className='btn secondary';detail.append(retry);return;}
    const draft=selected.value?.draft??{};
    if(kind==='characters'){
        if(Array.isArray(draft.tags)&&draft.tags.length){const tags=el('div','','wide-library-tags');for(const tag of draft.tags)tags.append(el('span',typeof tag==='string'?tag:tag?.name??'','chip'));detail.append(tags);}
        const actions=el('div','','wide-detail-actions'),start=button('Start new chat',()=>action(()=>startFreshChat({...item,cardRevision:selected.value.revision}))),edit=button('Open full character',()=>action(()=>library.edit(item.key,{kind:'characters',fromLibrary:true})));start.className='btn primary';edit.className='btn secondary';actions.append(start,edit);detail.append(actions);
        wideLibraryRich(detail,'Description',draft.description);wideLibraryRich(detail,'Personality',draft.personality);wideLibraryRich(detail,'Scenario',draft.scenario);wideLibraryRich(detail,'Main greeting',draft.first_mes);wideLibraryRich(detail,"Creator's notes",draft.creator_notes);
    }else{
        const descriptor=draft.descriptor??draft,actions=el('div','','wide-detail-actions'),edit=button('Edit persona',()=>action(()=>openPersonaEditor(item)));edit.className='btn primary';actions.append(edit);detail.append(actions);wideLibraryRich(detail,'Title',descriptor.title);wideLibraryRich(detail,'Description',descriptor.description);
    }
}
function renderLibraryPage(content){
    libraryTabs(content);const body=el('div','','library-section'),isWide=wideLayout()&&librarySection!=='wi';let detail;
    if(isWide){body.classList.add('wide-master');const shell=el('div','','wide-master-detail library-master-detail');detail=el('aside','','wide-detail wide-library-detail');shell.append(body,detail);content.append(shell);}else content.append(body);
    if(!libraryLoaded){waitingState(body);if(detail)renderWideLibraryDetail(detail,librarySection);return;}
    if(librarySection==='characters'){
        if(isWide&&characters.length&&!characters.some(c=>c.key===wideLibrarySelection.characters?.key))loadWideLibrary('characters',characters[0],{rerender:false});
        libraryViews.characters(body,characters,{view:listPrefs.characterView,sort:listPrefs.characterSort,tags:listPrefs.characterTags,folder:listPrefs.characterFolder,folders:collections.folders,assignments:collections.assignments,query:listQuery.characters,recents,onView:v=>setListPref('characterView',v),onSort:v=>setListPref('characterSort',v),onTags:v=>setListPref('characterTags',v),onFolder:v=>setListPref('characterFolder',v),onManage:(kind,value)=>action(()=>changeCollection(kind,value)),onSelect:isWide?c=>loadWideLibrary('characters',c):null,selectedKey:isWide?wideLibrarySelection.characters?.key:null});
    }else if(librarySection==='personas'){
        const personas=configuration?.personas??[];if(isWide&&personas.length&&!personas.some(p=>p.id===wideLibrarySelection.personas?.key))loadWideLibrary('personas',personas[0],{rerender:false});
        libraryViews.personas(body,personas,{createPersona:()=>openPersonaEditor(null),editPersona:p=>action(()=>openPersonaEditor(p)),current:configuration?.selected?.persona,query:listQuery.personas,onSelect:isWide?p=>loadWideLibrary('personas',p):null,selectedKey:isWide?wideLibrarySelection.personas?.key:null});
    }else wiPanel.renderLibrary(body);
    if(detail)renderWideLibraryDetail(detail,librarySection);
}
const positions=new Map(),heights=new Map(),detailsState=new Map();
const status=text=>{clearTimeout(statusTimer);$('status').textContent=text;$('status').hidden=false;$('pending-status').textContent=text;$('landing-status').textContent=text==='Engine ready'?'':text;if(['Engine ready','Reply saved','Reply stopped','Changes applied','Saved work reviewed · ready','New chat saved · greeting ready','Character imported and verified'].includes(text))statusTimer=setTimeout(()=>{if($('status').textContent===text){$('status').hidden=true;if($('landing-status').textContent===text)$('landing-status').textContent='';}},4000);};
const toast=(text,undo,duration=undo?12000:5000)=>{clearTimeout(undoTimer);undoRecord=undo;if(undo)localStorage.setItem('pocket-tavern.undo.v1',JSON.stringify({value:undo,expires:Date.now()+duration}));$('toast-text').textContent=text;$('undo').hidden=!undo;$('toast').hidden=false;undoTimer=setTimeout(()=>{$('toast').hidden=true;undoRecord=null;localStorage.removeItem('pocket-tavern.undo.v1');},duration);};
function openEngineLog(){window.open('http://127.0.0.1:8125/','pocket-engine-log','noopener,noreferrer');}
function showComposerError(value){const record=normalizeErrorRecord(value),box=$('send-error');box.replaceChildren(el('strong',record.summary));if(record.detail&&record.detail!==record.summary){const details=el('details'),summary=el('summary','Details'),body=el('pre',record.detail);details.append(summary,body);box.append(details);}const actions=el('div','','error-actions');for(const actionName of record.actions??[]){let label,run;if(actionName==='open-connection'){label='Open connection';run=()=>openConnection();}else if(actionName==='view-saved-conversation'){label='View saved conversation';run=()=>action(reviewWork);}else if(actionName==='open-logs'){label='Open engine log';run=openEngineLog;}else if(actionName==='retry-explicitly'){label='Review draft';run=()=>{$('draft').focus();toast('Review the draft and press Send when you choose to retry.');};}else continue;const control=button(label,run);control.className='btn quiet';actions.append(control);}if(actions.childElementCount)box.append(actions);box.hidden=false;return record;}
function recordError(value,context={}){return errorEvents.add(value,{sessionId,...context});}
function error(value){const record=recordError(value,{outcome:'not submitted',target:target(snapshot)}),message=readableError(record);status(message);toast(message);if(['DISCONNECTED','TIMEOUT','ENGINE_UNAVAILABLE'].includes(value.code))disconnected(message);}
async function action(fn){try{return await fn();}catch(e){error(e);}}
function saveDraft(){clearTimeout(draftTimer);if(snapshot&&$('draft').value!==state.draft(snapshot))state.saveDraft(snapshot,$('draft').value);}
let homeSignature='',libraryLoaded=false,connectStartedAt=Date.now();
function homeSync(){if(page!=='home')return;const signature=JSON.stringify([connected,initializing,engineBusy||working||!!operation,configuration?.onlineStatus,apiChecked,libraryLoaded,!libraryLoaded&&engineStalled(),characters.map(c=>[c.key,c.name,c.color]),recents.slice(0,4).map(r=>[r.characterKey,r.chatId,r.updated,r.preview])]);if(signature!==homeSignature){homeSignature=signature;renderPage();}}
function controls(){homeSync();const unavailable=!connected||review;const busy=freshPreparing||engineBusy||working||memoryBusy||startingGeneration||draining;
    $('draft').disabled=!snapshot||unavailable;
    $('send').disabled=unavailable||busy||!snapshot||!$('draft').value.trim();$('send').hidden=!!operation;
    $('stop').hidden=!operation;$('stop').disabled=unavailable||operation?.state!=='running';
    $('settings-button').disabled=!connected;$('model-chip').disabled=!connected;
    $('reconnect').disabled=initializing;$('review').hidden=!review;$('review').disabled=!connected||initializing;
    libraryViews?.update();$('page-new-chat').disabled=!connected||review;$('characters-create')&&($('characters-create').disabled=unavailable);$('characters-import')&&($('characters-import').disabled=unavailable||busy);$('chat-delete-apply').disabled=unavailable||busy||!chatDeleteArgument;if(page==='characters'||page==='chats'||page==='new-chat'){if(unavailable)$('landing-status').textContent=review?'Review saved work before making changes.':'Engine unavailable · reconnect to continue.';else if(busy)$('landing-status').textContent=operation?`Reply running in ${operation.target.chatId}. Browsing stays available.`:'Engine work pending · browsing stays available.';else if(/^(Reply running|Engine work pending|Engine unavailable)/.test($('landing-status').textContent))$('landing-status').textContent='';}newChatPanel?.update();presetPanel?.setAvailable();settingsPanel?.setLocked(unavailable);library?.setLocked(unavailable||busy,{drafting:!unavailable});memoryPanel?.setAvailable(connected);memoryPanel?.setLocked(unavailable||busy);
    $('selection-bar').hidden=!selecting;$('selection-count').textContent=`${selected.size} selected`;$('delete-selected').disabled=!selected.size||unavailable;
}
function portrait(c){const span=el('span',c?.name?.slice(0,1)??'','avatar');if(!c?.name)span.append(icon('persona'));if(c){const img=el('img');img.src=`/characters/${encodeURIComponent(c.key)}`;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();span.append(img);}return span;}
// Only a persona whose portrait changed gets a new image URL, so the others
// stay cached and nothing flashes when the list redraws.
const personaPortraitStart=Date.now(),personaPortraitVersions=new Map();
const personaPortraitUrl=(id,version=personaPortraitVersions.get(id)??personaPortraitStart)=>`/User Avatars/${encodeURIComponent(id)}?v=${version}`;
function preloadImage(url){return new Promise(resolve=>{const img=new Image();const done=()=>resolve();img.onload=img.onerror=done;setTimeout(done,2000);img.src=url;});}
function personaPortrait(p){const span=el('span',p?.name?.slice(0,1)??'','avatar');if(!p?.name)span.append(icon('persona'));if(p){const img=el('img');img.src=personaPortraitUrl(p.id);img.alt='';img.loading='lazy';img.onerror=()=>img.remove();span.append(img);}return span;}
const typingInPage=()=>{const node=document.activeElement;return !!node&&$('page-content').contains(node)&&['INPUT','TEXTAREA','SELECT'].includes(node.tagName);};
async function refresh(){characters=await raw('characters');recents=await workspace('recent');configuration=await raw('configurationState',{action:'read'});collections=await raw('collections',{action:'read'});libraryLoaded=true;if(snapshot){try{scopes=projectedScopes(await workspace('scopes',{target:target(snapshot)}),snapshot);}catch(e){if(e.code!=='CHAT_NOT_FOUND')throw e;snapshot=null;scopes=await workspace('scopes');}}else scopes=await workspace('scopes');if(!typingInPage())renderPage();renderHeader();if(presetPanel&&$('preset-panel').open){const origin=presetPanelOrigin;const value=projectedScopes(await workspace('scopes',{target:origin}),origin);presetPanel.update(value,journal.read().some(i=>i.argument.action==='configure'));}}
function button(text,fn){const b=el('button',text);b.onclick=()=>action(fn);return b;}
function chatRow(row,{wide=false}={}){return libraryViews.chat({...row,selecting:wide,selected:wide&&same(row,wideChatSelection?.target),open:()=>wide?loadWideChat(row):openChat(row)},characters);}
function windowList(parent,rows,makeRow,estimate=100,scroller=null){
    scroller??=parent.closest('.wide-master')??$('landing');
    const list=el('div','','window-list');parent.append(list);
    const render=()=>{const offset=list.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop,top=Math.max(0,scroller.scrollTop-offset),range=renderRange(rows.length,top,scroller.clientHeight||700,{},estimate,5),before=el('div'),after=el('div');before.style.height=`${range.before}px`;after.style.height=`${range.after}px`;list.replaceChildren(before,...rows.slice(range.start,range.end).map(makeRow),after);};
    if(scroller===$('landing'))listRenderer=render;else{let frame;scroller.onscroll=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=null;render();});};}
    render();return render;
}
function renderPage(){listRenderer=null;if(page==='chat')return;const content=$('page-content'),wideKey=page==='chats'?'chats':page==='library'?`library:${librarySection}`:null,oldWide=content.querySelector('.wide-master');if(wideKey&&oldWide)widePanePositions.set(wideKey,oldWide.scrollTop);if(wideLayout()&&$('chat-screen').classList.contains('wide-embedded-chat'))preserveChatSurface();parkChatSurface();content.replaceChildren();content.className='';const titles={home:'Pocket Tavern',chats:'Chats',library:'Library',extensions:'Extensions',characters:'Characters',personas:'Personas',wi:'World Info','new-chat':'New chat','persona-editor':personaEdit?.key?'Edit persona':'New persona','persona-picker':'Persona',memory:'Memory','wi-entry':'Entry','wi-activation':'Activation',settings:'Settings'};$('page-title').textContent=page==='settings'?settingsPage.title():titles[page];$('page-subtitle').hidden=page!=='memory';$('page-subtitle').textContent=page==='memory'?'Summaryception':'';$('landing').classList.toggle('home-screen',page==='home');$('landing').classList.toggle('library-screen',['library','extensions','characters','chats','new-chat','personas','persona-editor','persona-picker','memory','wi','wi-entry','wi-activation','settings'].includes(page));$('page-wi-activation').hidden=page!=='wi'&&!(page==='library'&&librarySection==='wi');$('app-settings').hidden=page!=='home';$('home-meta').hidden=page!=='home';$('page-back').hidden=page!=='new-chat'&&page!=='persona-editor'&&page!=='persona-picker'&&page!=='memory'&&page!=='wi-entry'&&page!=='wi-activation'&&page!=='settings';$('page-new-chat').hidden=page!=='chats';$('page-new-chat').classList.add('primary');for(const b of $('bottom-nav').querySelectorAll('button')){const on=b.dataset.page===(page==='new-chat'?'chats':page);b.classList.toggle('current',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
    const locked=!connected||review,current=listPage();pageActions(current==='characters'?[{id:'characters-import',icon:'import',label:'Import a character card',visibleLabel:'Import',run:openImport,disabled:locked},{id:'characters-create',icon:'plus',label:'Create a character',run:()=>action(()=>library.createCharacter()),disabled:locked,primary:true}]:current==='personas'?[{id:'personas-create',icon:'plus',label:'Create persona',run:()=>action(()=>openPersonaEditor(null)),primary:true}]:current==='wi'?wiPanel.headerActions():[]);renderSearch();
    if(page==='home'){
        const status=homeStatus({connected,initializing,generating:engineBusy||working||!!operation,onlineStatus:configuration?.onlineStatus,apiChecked});renderHomeStatus(status);renderHome(content,{status,loaded:libraryLoaded,stalled:engineStalled(),connected:connected&&!review,configuration,characters,recents,portrait,chatDate,colours:characterColours,actions:{openChat:row=>action(()=>openChat(row)),allChats:()=>navigate('chats'),connection:()=>action(()=>openConnection('connection')),presets:()=>action(()=>openConnection('presets')),allCharacters:()=>{librarySection='characters';navigate('library');},openCharacter:c=>action(()=>library.edit(c.key,{kind:'characters',fromLibrary:true})),addCharacter:()=>{librarySection='characters';navigate('library');},importCharacters:openImport,createCharacter:()=>library.createCharacter(),startChat:()=>navigate('new-chat'),reconnect:()=>$('reconnect').click()}});
    }else if(page==='library'){renderLibraryPage(content);}
    else if(page==='extensions'){extensionsPlaceholder(content);}
    else if(!libraryLoaded&&['chats','characters','personas','new-chat'].includes(page)){waitingState(content);}
    else if(page==='chats'){renderChats(content);}
    else if(page==='characters'){libraryViews.characters(content,characters,{view:listPrefs.characterView,sort:listPrefs.characterSort,tags:listPrefs.characterTags,folder:listPrefs.characterFolder,folders:collections.folders,assignments:collections.assignments,query:listQuery.characters,recents,onView:v=>setListPref('characterView',v),onSort:v=>setListPref('characterSort',v),onTags:v=>setListPref('characterTags',v),onFolder:v=>setListPref('characterFolder',v),onManage:(kind,value)=>action(()=>changeCollection(kind,value))});}
    else if(page==='new-chat'){libraryViews.picker(content,characters);}
    else if(page==='personas'){libraryViews.personas(content,configuration?.personas??[],{createPersona:()=>openPersonaEditor(null),editPersona:p=>action(()=>openPersonaEditor(p)),current:configuration?.selected?.persona,query:listQuery.personas});}
    else if(page==='persona-editor'&&personaEdit){renderPersonaEditor(content);}
    else if(page==='persona-picker'){renderPersonaPicker(content);}
    else if(page==='memory'){memoryPanel.renderPage(content);}
    else if(page==='settings'){settingsPage.render(content);}
    else if(page==='wi'){wiPanel.renderLibrary(content);}
    else if(page==='wi-entry'){wiPanel.renderEntry(content);}
    else if(page==='wi-activation'){wiPanel.renderActivation(content);}
    if(wideKey){const nextWide=content.querySelector('.wide-master');if(nextWide)nextWide.scrollTop=widePanePositions.get(wideKey)??0;}
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
    const cancelBtn=button('Cancel',()=>{librarySection='personas';navigate('library');});
    const saveBtn=button('Save',async()=>{
        d.name=String(d.name??'').trim();nameInput.value=d.name;
        if(!d.name){toast('A persona needs a name.');return;}
        if(engineBusy||memoryBusy){toast('Wait for the engine to finish before saving.');return;}
        saveBtn.disabled=true;cancelBtn.disabled=true;
        try{
            const result=await raw('assets',{action:'write',kind:'personas',key:personaEdit.key,revision:personaEdit.revision,draft:d,file:personaPortraitFile},60000);
            // Load the list and the new portrait first, then show the page once.
            const savedKey=result?.key??personaEdit.key;await refresh();if(personaPortraitFile&&savedKey){const version=Date.now();await preloadImage(personaPortraitUrl(savedKey,version));personaPortraitVersions.set(savedKey,version);}personaPortraitFile=null;personaEdit=null;librarySection='personas';navigate('library');toast('Persona saved');
        }catch(e){saveBtn.disabled=false;cancelBtn.disabled=false;toast(e.message);}
    });saveBtn.className='btn primary persona-save';
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
        const editBtn=button('Edit persona',()=>action(()=>openPersonaEditor(current)));editBtn.className='btn secondary persona-action-btn';editBtn.prepend(icon('edit'));
        const linkBtn=button('Link…',()=>action(()=>openLinkDialog(current)));linkBtn.className='btn secondary persona-action-btn';linkBtn.prepend(icon('link'));
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
        if(p.id===selected){const check=el('span','','persona-check');check.append(icon('check'));row.append(check);}
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
    // Every persona whose native connections include this character. Like ST
    // with multiple connections allowed, linking adds to them.
    const charLinked=[];
    for(const p of configuration?.personas??[]){
        try{const rec=await raw('assets',{kind:'personas',action:'read',key:p.id});
        if(rec.draft?.descriptor?.connections?.some(c=>c?.type==='character'&&c.id===snapshot.characterKey))charLinked.push({id:p.id,name:p.name});}catch(e){}
    }
    const others=charLinked.filter(p=>p.id!==persona.id),charCurrentLinkedName=charLinked.map(p=>p.name).join(', ')||null;
    const chatRow=button('','');chatRow.className='persona-link-target';
    chatRow.innerHTML=`<span class="link-target-icon">${icon('chat').outerHTML}</span><span class="link-target-text"><strong>This chat</strong><small>${snapshot.chatId}</small><small class="muted">${chatLinkedName?'Linked to '+chatLinkedName:'No linked persona'}</small></span>`;
    chatRow.onclick=()=>action(async()=>{
        if(chatPersona&&chatPersona!==persona.id){
            try{await confirmReplace(`Replace ${chatLinkedName??chatPersona} with ${persona.name} for "${snapshot.chatId}"?`);}catch{return;}
        }
        await workspace('linkPersonaToChat',{target:target(snapshot),personaKey:persona.id});
        snapshot=await workspace('read',{target:target(snapshot)});renderHeader();toast(`${persona.name} linked to this chat`);
        $('persona-link-dialog').close();renderPage();
    });
    const charRow=button('','');charRow.className='persona-link-target';
    charRow.innerHTML=`<span class="link-target-icon">${icon('characters').outerHTML}</span><span class="link-target-text"><strong>This character</strong><small>${charName}</small><small class="muted">${charCurrentLinkedName?'Linked to '+charCurrentLinkedName:'No linked persona'}</small></span>`;
    charRow.onclick=()=>action(async()=>{
        if(charLinked.some(p=>p.id===persona.id)){$('persona-link-dialog').close();toast(`${persona.name} is already linked to ${charName}`);return;}
        const record=await raw('assets',{kind:'personas',action:'read',key:persona.id});
        const connections=record.draft.descriptor?.connections??[];
        if(!connections.some(c=>c?.type==='character'&&c.id===snapshot.characterKey)){
            connections.push({type:'character',id:snapshot.characterKey});
            record.draft.descriptor.connections=connections;
            await raw('assets',{action:'write',kind:'personas',key:persona.id,revision:record.revision,draft:record.draft},60000);
        }
        $('persona-link-dialog').close();toast(others.length?`${persona.name} linked to ${charName}, alongside ${others.map(p=>p.name).join(', ')}`:`${persona.name} linked to ${charName}`);
        pickerPersonaDetail=(await raw('assets',{kind:'personas',action:'read',key:persona.id})).draft;
        renderPage();
    });
    targets.append(chatRow,charRow);
    $('persona-link-dialog').showModal();
}
// Several personas can be linked to one character. A chat without its own
// persona asks once which one to use and keeps the answer for that chat;
// otherwise ST would quietly use the first linked one.
const personaAsked=new Set();
function askChatPersona(chat){if(!chat||chat.metadata?.persona||personaAsked.has(key(chat)))return;personaAsked.add(key(chat));action(async()=>{
    const card=await raw('assets',{kind:'characters',action:'read',key:chat.characterKey});const linked=(card.associations?.personas??[]).filter(p=>p.available);
    if(linked.length<2||!same(snapshot,chat)||page!=='chat'||document.querySelector('dialog[open]'))return;
    $('persona-choice-text').textContent=`${linked.length} personas are linked to ${card.draft?.name??'this character'}. Which one should this chat use? You can change it later from the Persona picker.`;
    $('persona-choice-list').replaceChildren(...linked.map(p=>{const row=button('',async()=>{$('persona-choice').close();if(!same(snapshot,chat))return;await workspace('linkPersonaToChat',{target:target(chat),personaKey:p.key});snapshot=await workspace('read',{target:target(chat)});renderHeader();toast(`${p.name} will be used in this chat`);});row.className='persona-link-target';row.append(personaPortrait({id:p.key,name:p.name}),el('span',p.name,'link-target-text'));return row;}));
    $('persona-choice').showModal();
});}
function showCharacters(){navigate('new-chat');}
function navigate(next,{dismissPanels=true}={}){if(next!==page)chatControls?.step();navVersion++;chatDeleteToken++;if(dismissPanels)chatControls?.dismiss();if(page!=='chat')pagePositions.set(page,$('landing').scrollTop);preserveChatSurface();page=next;if(next==='settings')$('landing-status').textContent='';$('landing').hidden=next==='chat';$('chat-screen').hidden=next!=='chat';$('bottom-nav').hidden=next==='chat'||next==='persona-editor'||next==='persona-picker'||next==='memory'||next==='wi-entry'||next==='wi-activation'||next==='settings';if(next!=='chat'){renderPage();$('landing').scrollTop=pagePositions.get(next)??0;listRenderer?.();}chatControls?.sync();}
async function openChat(value,{dismissPanels=true,guard=()=>true}={}){displayKey=null;saveDraft();if(page==='chat'){rememberDetails();}if(page==='chat')positions.set(key(snapshot),$('messages').scrollTop);else entryPage=page;const saved=await workspace('read',{target:target(value)});const savedScopes=projectedScopes(await workspace('scopes',{target:target(saved)}),saved);if(!guard())return;snapshot=saved;state.saveTarget(saved);selected.clear();selecting=false;$('draft').value=state.draft(saved);scopes=savedScopes;navigate('chat',{dismissPanels});render(true);if(operation&&same(operation.target,snapshot))showStream();askChatPersona(saved);}

// Display regex ("Alter chat display" scripts) from global, character and
// the chat's preset, applied per message with ST's depth before rendering.
let displayScripts=[],displayKey=null,renderingMessages=false;
function loadDisplay(value=snapshot){if(!value)return;const k=`${value.characterKey}|${value.presentation?.preset??''}`;if(k===displayKey)return;displayKey=k;displayScripts=[];raw('display',{characterKey:value.characterKey,preset:value.presentation?.preset??null}).then(result=>{if(displayKey!==k)return;displayScripts=compileDisplay(result?.scripts);if(displayScripts.length&&chatSurfaceActive()&&snapshot)render();}).catch(()=>{});}
const shown=(text,{message,index,placement}={})=>applyDisplay(displayScripts,text,{placement:placement??placementFor(message),depth:index===undefined?0:messageDepth(snapshot.messages,index)});
const characterColours=createCharacterColours();let colourFor=null;
// Inside a chat the character's colour is the accent: name, scene light, halo.
function applyCharacterColour(c){const wanted=`${c?.key}|${c?.color??''}|${colorThemes?.current().id??'safe'}`;if(colourFor===wanted)return;colourFor=wanted;const screen=$('chat-screen');characterColours.resolve(c).then(value=>{if(colourFor!==wanted)return;if(value?.color){screen.style.setProperty('--char',value.color);screen.style.setProperty('--color-character-ink',value.ink);}else{screen.style.removeProperty('--char');screen.style.removeProperty('--color-character-ink');}screen.dataset.charColour=value?.color??'';});}
function renderHeader(){if(!snapshot)return;const c=characters.find(c=>c.key===snapshot.characterKey),copy=configuration?.ownership==='native'?configuration.selected:scopes?.effective.copy;applyCharacterColour(c);loadDisplay();$('avatar').replaceChildren(portrait(c));$('name').textContent=c?.name??'Chat';$('subtitle').textContent=snapshot.chatId;$('model-chip').replaceChildren(el('span',copy?.model||'Model'));$('model-chip').title=copy?.model?`Model: ${copy.model}`:'Choose model';renderMemoryNotice();const preset=copy?.preset??snapshot.presentation?.preset??'Preset';$('active-preset').replaceChildren(icon('sliders'),el('span',preset));$('active-preset').title=`Preset: ${preset}`;$('active-preset').setAttribute('aria-label',`Preset: ${preset}`);const persona=snapshot.presentation?.personaName??'You';$('active-persona').replaceChildren(el('span','as '),el('span',persona));$('active-persona').title=`Persona: ${persona}`;$('active-persona').setAttribute('aria-label',`Persona: ${persona}`);$('chat-context').textContent=persona&&persona!=='You'?`as ${persona}`:'';$('scope-chip').textContent=configuration?.ownership==='native'?'native':scopes?.effective.scope??'global';}
function renderMemoryNotice(value=memoryState){if(!snapshot)return;const notices=[];const label=value&&value.target&&!same(value.target,snapshot)?`Memory for ${value.target.chatId??'the engine chat'}`:'Memory';if(snapshot.metadata.pocket_tavern?.memoryInvalid)notices.push('Memory needs rebuilding after history changes');if(value?.backlog)notices.push(`${label} \u00b7 Choice needed`);else if(value?.busy)notices.push(`${label} \u00b7 ${value.waiting?'Waiting':'Summarizing'}`);else if(memoryResult==='stopped')notices.push('Summarization stopped \u00b7 Progress saved');else if(memoryResult==='done')notices.push('Memory saved \u00b7 Summarization complete');if(value?.failure)notices.push(value.failure);$('memory-notice-text').textContent=notices.join(' \u00b7 ');$('memory-notice').hidden=!notices.length;$('memory-notice-stop').hidden=!value?.busy;const box=$('memory-choice'),wanted=value?.backlog&&same(value.target,snapshot)?JSON.stringify(value.backlog):'';if(box.dataset.sig!==wanted){box.dataset.sig=wanted;const card=wanted?memoryPanel?.choiceCard(value):null;box.replaceChildren(...(card?[card]:[]));box.hidden=!card;}}
function rememberDetails(){for(const a of $('messages').querySelectorAll('article[data-index]')){detailsState.set(a.dataset.detailKey,Array.from(a.querySelectorAll('details')).map(d=>d.open));}}
const detailKey=(message,index,origin=snapshot)=>`${key(origin)}:${message.send_date??index}:${message.name??''}`;
function restoreDetails(a,index){const choices=detailsState.get(a.dataset.detailKey);if(choices)Array.from(a.querySelectorAll('details')).forEach((d,i)=>d.open=!!choices[i]);else a.querySelector('details.thinking').open=appearance.thinking==='expanded';}
function reasoning(text){const d=el('details','','thinking');d.hidden=!text;d.append(el('summary','Thinking'));const body=el('div','','thinking-body');body.innerHTML=format(text);d.append(body);return d;}
// ST saves token counts only on replies written after counting was switched
// on; older replies are counted on demand and remembered for this session.
const tokenCache=new Map(),tokenWaiting=new Map();let tokenTimer;
function countTokens(text,node){if(typeof text!=='string'||!text)return;if(!tokenWaiting.has(text))tokenWaiting.set(text,new Set());tokenWaiting.get(text).add(node);clearTimeout(tokenTimer);tokenTimer=setTimeout(flushTokens,150);}
async function flushTokens(){if(!connected||initializing)return;const batch=[...tokenWaiting].slice(0,100);for(const [text] of batch)tokenWaiting.delete(text);let counts;try{counts=await raw('tokens',{texts:batch.map(([text])=>text)});}catch{return;}batch.forEach(([text,nodes],i)=>{const label=tokenText({extra:{token_count:counts[i]}});if(!label)return;tokenCache.set(text,counts[i]);for(const node of nodes)if(node.isConnected){node.textContent=label;node.hidden=false;}});if(tokenWaiting.size)tokenTimer=setTimeout(flushTokens,0);}
// Like ST, a reply being regenerated is hidden while its replacement streams;
// it comes back if the new one is stopped or fails.
function superseded(index){return operation?.mode==='swipe'&&!!streamNode?.isConnected&&!!snapshot&&same(operation.target,snapshot)&&index===snapshot.messages.length-1;}
function messageArticle(message,index){const a=el('article','',`message ${message.is_user?'user':''}`);a.dataset.index=index;a.hidden=superseded(index);a.dataset.detailKey=detailKey(message,index);a.addEventListener('toggle',()=>{if(a.isConnected)detailsState.set(a.dataset.detailKey,Array.from(a.querySelectorAll('details')).map(d=>d.open));},true);const label=el('div','','byline');if(selecting){const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=selected.has(index);checkbox.setAttribute('aria-label',`Select message ${index+1}`);checkbox.onchange=()=>{checkbox.checked?selected.add(index):selected.delete(index);controls();};label.append(checkbox);}label.append(el('span',message.is_user?message.name??snapshot.presentation?.personaName??'You':message.name??'Character'));const menu=button('',()=>openMenu(index));menu.append(icon('more'));menu.setAttribute('aria-label',`Message ${index+1} actions`);label.append(menu);const bubble=el('div','','bubble');if(editorTarget&&same(editorTarget.target,snapshot)&&editorTarget.messageId===index){const input=el('textarea');input.value=inlineDraft;input.rows=6;input.setAttribute('aria-label','Edit message text');input.oninput=()=>inlineDraft=input.value;const actions=el('div','','inline-edit-actions');actions.append(button('Cancel',()=>{editorTarget=null;render();}),button('Save',async()=>{await queueChange({action:'edit',...editorTarget,text:inlineDraft},'Message edit saved');editorTarget=null;render();}));bubble.classList.add('inline-editor');bubble.append(input,actions);}else bubble.innerHTML=format(shown(message.mes,{message,index}));a.append(label,reasoning(shown(message.extra?.reasoning??'',{index,placement:PLACEMENT.REASONING})),bubble);
    const tools=el('div','','message-tools');
    if(!message.is_user&&(!message.is_system||message.extra?.sc_ghosted)&&(index===snapshot.messages.length-1||(message.swipes?.length??0)>1)){
        const count=message.swipes?.length??1,current=message.swipe_id??0;
        const prev=button('',()=>chooseSwipe(index,(current-1+count)%count));prev.append(icon('back'));prev.setAttribute('aria-label','Previous saved alternative');prev.disabled=count<2;
        const next=button('',()=>chooseSwipe(index,(current+1)%count));next.append(icon('back'));next.className='next-alternative';next.setAttribute('aria-label','Next saved alternative');next.disabled=count<2;
        tools.append(prev,el('span',`${current+1} / ${count}`),next);
    }
    // One muted details line: generation time, clock, model, tokens.
    const details=appearance.details,meta=el('span','','message-meta'),duration=details.time?generationDuration(message):null;
    if(duration){const detail=el('span',duration,'message-detail');detail.setAttribute('aria-label',`Generation duration ${duration}`);meta.append(detail);}
    const clock=details.clock?clockText(message):null;if(clock)meta.append(el('span',clock,'message-detail'));
    const model=details.model&&!message.is_user?modelName(message):null;if(model){const chip=button(model,()=>toast(model));chip.className='message-detail message-model';chip.title=model;chip.setAttribute('aria-label',`Generated by ${model}. Tap to show the full name.`);meta.append(chip);}
    if(details.tokens&&!message.is_user){const tokens=tokenText(message)??tokenText({extra:{token_count:tokenCache.get(message.mes)}});const detail=el('span',tokens??'','message-detail');if(!tokens){detail.hidden=true;countTokens(message.mes,detail);}meta.append(detail);}
    if(meta.childNodes.length)tools.append(meta);
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
function render(changed=false){renderHeader();if(!snapshot)return;renderingMessages=true;const pane=$('messages'),oldTop=pane.scrollTop,near=isNearBottom(pane),newTarget=renderedKey!==key(snapshot);if(!newTarget)rememberDetails();const cache=heights.get(key(snapshot))??{};heights.set(key(snapshot),cache);const desired=newTarget?(positions.get(key(snapshot))??Math.max(0,snapshot.messages.length*180-pane.clientHeight)):oldTop;const range=renderRange(snapshot.messages.length,desired,pane.clientHeight||650,cache);pane.replaceChildren();const before=el('div'),after=el('div');before.style.height=`${range.before}px`;after.style.height=`${range.after}px`;pane.append(before,...snapshot.messages.slice(range.start,range.end).map((m,i)=>messageArticle(m,range.start+i)),after);for(const article of pane.querySelectorAll('article'))cache[article.dataset.index]=article.getBoundingClientRect().height+(parseFloat(getComputedStyle(article).marginBottom)||0);renderedKey=key(snapshot);pane.scrollTop=newTarget?(positions.get(key(snapshot))??pane.scrollHeight):oldTop;if(!newTarget&&near&&changed)pane.scrollTop=pane.scrollHeight;$('jump').hidden=isNearBottom(pane);controls();requestAnimationFrame(()=>{renderingMessages=false;});}
function openMenu(index){menuIndex=index;const m=snapshot.messages[index];$('menu-reply').hidden=index!==snapshot.messages.length-1||index<1||m.is_user||m.is_system;$('menu-reply').disabled=engineBusy||working||memoryBusy||review||!connected||draining;$('menu-edit').disabled=!!operation&&same(operation.target,snapshot)&&(operation.mode==='swipe'?index===snapshot.messages.length-1:index>=operation.beforeCount&&!snapshot.messages[index].is_user);const article=$('messages').querySelector(`article[data-index="${index}"]`);chatControls.openMenu('message-menu',article.querySelector('.byline button'));article.classList.add('menu-selected');}
// Changes still waiting to be applied; an interrupted one waits for Retry or Discard and blocks nothing.
const queued=()=>journal.read().some(item=>item.state!=='interrupted');
function showSaveBanner(){const item=journal.read().find(value=>value.state==='interrupted');$('save-retry').hidden=!item;if(!item)return;$('save-retry-text').textContent=`Couldn’t save “${item.label}”: ${item.error}`;$('save-retry-apply').hidden=item.argument.action==='newChat';}
async function queueChange(argument,label,coalesce){if(!connected)throw Error('The engine is not connected. Wait for it to reconnect, then try again.');const item=journal.add({sessionId,argument,label,coalesce:coalesce??(argument.action==='edit'?`edit:${key(argument.target)}:${argument.messageId}`:undefined)});// Choosing an alternative is visible on screen; no notice for it.
if(engineBusy||memoryBusy||working)toast('Changes pending');else if(argument.action!=='swipe')toast(label);status(engineBusy||memoryBusy||working?'Changes pending':'Applying changes…');await drain();return item;}
async function drain(){if(draining||review||!connected||engineBusy||memoryBusy||working)return;const port=connection.port;draining=true;controls();try{for(const initial of journal.read()){const item=journal.read().find(value=>value.id===initial.id);if(!item)continue;if(connection.port!==port)return;if(item.state!=='pending')continue;if(item.sessionId!==sessionId){journal.patch(item.id,{state:'interrupted',error:'it was not confirmed before the engine restarted.'});continue;}journal.patch(item.id,{state:'applying'});try{if(item.argument.action==='deleteChat'){const before=item.argument.before??{...item.argument.target,...JSON.parse(item.argument.expected)};localStorage.setItem('pocket-tavern.undo.v1',JSON.stringify({value:{before,after:null},expires:Date.now()+12000}));}const result=await workspace(item.argument.action,item.argument,60000);if(result.undo)if(item.argument.action!=='swipe')toast(item.argument.action.startsWith('delete')?'Deleted · Undo available':`${item.label} · Undo available`,result.undo);journal.remove(item.id);if(item.argument.action==='configure'&&result.revision){for(const next of journal.read())if(next.argument.action==='configure')journal.patch(next.id,{argument:{...next.argument,expected:rebaseSettingsGuard(next.argument,item.argument,result)}});}if(item.argument.action==='edit'&&result.snapshot){for(const next of journal.read())if(next.argument.action==='edit'&&same(next.argument.target,item.argument.target)&&next.argument.expected===item.argument.expected)journal.patch(next.id,{argument:{...next.argument,expected:revision({messages:result.snapshot.messages,metadata:result.snapshot.metadata}),before:{messages:result.snapshot.messages}}});}if(result.snapshot){if(item.argument.action==='fork')await openChat(result.snapshot);else if(same(result.snapshot,snapshot)){snapshot=result.snapshot;render(true);}}if(result.deleted&&same(item.argument.target,snapshot)){snapshot=null;navigate('chats');}await refresh();if(snapshot){snapshot=await workspace('read',{target:target(snapshot)});render(true);}status(queued()?'Changes pending':'Changes applied');$('preset-status').textContent=journal.read().some(i=>i.argument.action==='configure')?'Changes pending until the engine finishes.':'Changes applied';}catch(e){if(connection.port!==port)return;const outcome=failureOutcome(e.code);if(outcome==='wait'){journal.patch(item.id,{state:'pending'});break;}
// Retrying a delete that had already landed: the chat is gone, which is the goal.
if(item.argument.action==='deleteChat'&&e.code==='CHAT_NOT_FOUND'){journal.remove(item.id);if(same(item.argument.target,snapshot)){snapshot=null;navigate('chats');}await refresh();continue;}
if(outcome==='interrupted')journal.patch(item.id,{state:'interrupted',error:e.message});else journal.remove(item.id);error(e);}}}finally{draining=false;controls();showSaveBanner();}}
async function historyChange(arg,label){const before=structuredClone(snapshot);if(arg.action==='fork'){arg.newChatId=`${before.chatId} · fork ${crypto.randomUUID().slice(0,8)}`;arg.integrity=crypto.randomUUID();}return queueChange({...arg,target:target(before),expected:revision({messages:before.messages,metadata:before.metadata}),before:{messages:before.messages}},label);}
async function prepareNewChat(card){
    if(!connected||review||working||draining||startingGeneration||queued())throw Error('Finish pending changes before starting another chat.');
    const activity=await raw('activity');if(activity.busy||memoryBusy||operation)throw Object.assign(Error('Wait for generation or Memory to finish before starting another chat.'),{code:'BUSY'});
    const savedCard=await raw('assets',{kind:'characters',action:'read',key:card.key});
    if(savedCard.revision!==card.cardRevision)throw Object.assign(Error('The saved character changed. Reopen it before starting a chat.'),{code:'STALE_ASSET'});
    if(![savedCard.draft.name,savedCard.draft.description,savedCard.draft.first_mes].every(v=>typeof v==='string'&&v.trim()))throw Object.assign(Error('Incomplete character: save a name, description and main greeting before starting a chat.'),{code:'INCOMPLETE_CARD'});
    const before=await workspace('read',{target:card.target});
    return {action:'newChat',target:target(before),before,cardRevision:card.cardRevision,newChatId:`Conversation ${crypto.randomUUID().slice(0,8)}`,operationId:crypto.randomUUID()};
}
async function applyNewChat(argument,guard,{fresh=false}={}){
    if(!connected||review||working||draining||startingGeneration||queued())throw Error('Finish pending changes before starting another chat.');
    const activity=await raw('activity');if(activity.busy||memoryBusy||operation)throw Object.assign(Error('Wait for the engine to finish. No chat has been created.'),{code:'BUSY'});
    if(!guard())return;
    if(!connected||review||working||draining||startingGeneration||queued())throw Error('Finish pending changes before starting another chat.');
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
                journal.patch(item.id,{state:'interrupted',error:'the new chat may or may not have been created. Check Chats; nothing will be repeated automatically.'});showSaveBanner();
            }else journal.remove(item.id);
        }
        throw e;
    }finally{working=false;controls();}
}
async function startFreshChat(card,owner){
    if(freshPreparing)return;freshPreparing=true;controls();
    const version=navVersion,guard=owner??(()=>page==='new-chat'&&navVersion===version);
    try{
        if(!connected||review||working||draining||startingGeneration||queued())throw Error('Finish pending changes before starting a fresh chat.');
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

async function configureScope(kind,value,scope=scopes.effective.scope,origin=chatSurfaceActive()?target(snapshot):null,preset){const targetValue=scope==='global'&&kind!=='scope'?null:origin;const current=await workspace('scopes',{target:targetValue});let previewGeneration;if(kind==='preset')previewGeneration=(await workspace('presetData',{name:value})).generation;const presetChange=kind==='preset'||kind==='generation'&&preset!==undefined;await queueChange({action:'configure',target:targetValue,scope,kind,value,preset,previewGeneration,expected:current.revision},'Settings saved',presetChange?undefined:`settings:${key(targetValue)}:${scope}:${kind}`);const displayedTarget=chatSurfaceActive()?target(snapshot):null;scopes=projectedScopes(await workspace('scopes',{target:displayedTarget}),displayedTarget);renderHeader();return scopes;}
async function openPreset(){return openConnection(configuration?.ownership==='native'?'presets':'migration');}
async function openModels(){return openConnection(configuration?.ownership==='native'?'connection':'migration');}
async function changeConnection(kind,value){if(engineBusy||memoryBusy)throw Error('Wait for the engine before changing global connection or persona settings.');const current=await raw('settings');await raw('configure',{kind,value,revision:current.revision},60000);await refresh();if(snapshot){snapshot=await workspace('read',{target:target(snapshot)});renderHeader();}}
const CHARACTER_IMPORT_MAX_BYTES=30*1024*1024,CHARACTER_IMPORT_TYPES=new Set(['png','json','yaml','yml','charx','byaf']);
const importSize=bytes=>`${(bytes/1024/1024).toFixed(bytes>=10?1:2)} MiB`;
function importPreflight(file){if(!file)return null;const type=String(file.name??'').split('.').at(-1).toLowerCase();if(!CHARACTER_IMPORT_TYPES.has(type))return 'Supported character formats: PNG, JSON, YAML, CHARX and BYAF.';if(file.size>CHARACTER_IMPORT_MAX_BYTES)return `${file.name} is ${importSize(file.size)}. Character cards may be at most 30 MiB.`;return null;}
function openImport(){importUncertain=false;$('character-import-file').value='';$('character-import-file').disabled=importWaiting;$('character-import-status').textContent='Choose a PNG, JSON, YAML, CHARX or BYAF card up to 30 MiB.';$('character-import-confirm').showModal();}
// The corner of Home: one status dot, with words only when something needs attention.
function renderHomeStatus(status){const early=!libraryLoaded&&!engineStalled()&&status.engine.tone==='bad';const dot=early?{tone:'wait',text:'Connecting…',label:'Engine: Connecting… · API: Not checked'}:homeDot(status),button=$('home-status');button.dataset.tone=dot.tone;button.setAttribute('aria-label',`Connection · ${dot.label}`);button.title=`Connection · ${dot.label}`;$('home-status-text').textContent=dot.text;}
async function openConnection(view='connection'){$('chat-settings').close();const native=view==='connection'||view==='presets';const allowed=native&&configuration?.ownership==='native',origin=page==='settings'?settingsFrom:page;settingsPage.setTab(allowed?view:native?'migration':view);await settingsPage.open();settingsFrom=origin;navigate('settings');if(allowed)await openNativeSettings(view,origin);}
function beginThemePreview(value,kind='id'){if(!colorThemes)throw Error('Themes are still loading.');const result=kind==='st'?colorThemes.previewSillyTavern(value):kind==='theme'?colorThemes.preview(value):colorThemes.previewId(value);const theme=result.theme??result;$('theme-preview-name').textContent=`Previewing ${theme.name}`;$('theme-preview-bar').hidden=false;if(page==='settings')$('bottom-nav').hidden=false;return result;}
function cancelThemePreview(){if(!colorThemes?.previewing())return false;colorThemes.cancelPreview();$('theme-preview-bar').hidden=true;if(page==='settings')$('bottom-nav').hidden=true;return true;}
function commitThemePreview(){if(!colorThemes?.previewing())return;colorThemes.commitPreview();$('theme-recovery').hidden=true;$('theme-preview-bar').hidden=true;if(page==='settings')$('bottom-nav').hidden=true;toast('Theme applied');}
async function openNativeSettings(surface,returnTo='settings'){
    if(nativeSurface)await closeNativeSettings(true);
    const trigger=document.activeElement;
    const root=getComputedStyle(document.documentElement),presentation={theme:document.documentElement.dataset.theme||'',textSize:root.fontSize,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,colors:{canvas:root.getPropertyValue('--color-canvas').trim(),surface:root.getPropertyValue('--color-surface').trim(),raised:root.getPropertyValue('--color-raised').trim(),text:root.getPropertyValue('--color-text').trim(),muted:root.getPropertyValue('--color-muted-text').trim(),border:root.getPropertyValue('--color-border').trim(),accent:root.getPropertyValue('--color-accent').trim(),onAccent:root.getPropertyValue('--color-on-accent').trim(),focus:root.getPropertyValue('--color-focus').trim()}};
    const result=await raw('nativeSettings',{action:'open',surface,recoveryPending:review||queued(),presentation},30000),mount=$('native-settings-mount'),frame=$('engine');if(!mount)throw Error('Native settings page is not ready.');
    nativeSurface={...result,frame,mount,trigger,returnTo};frame.classList.add('native-engine');frame.removeAttribute('inert');frame.removeAttribute('aria-hidden');frame.tabIndex=0;positionNativeSettings();frame.focus({preventScroll:true});chatControls?.sync();
}
function positionNativeSettings(){if(!nativeSurface?.mount?.isConnected)return;const rect=nativeSurface.mount.getBoundingClientRect(),frame=nativeSurface.frame,height=Math.min(Math.max(360,innerHeight-rect.top-16),760);frame.style.setProperty('--native-left',`${rect.left}px`);frame.style.setProperty('--native-top',`${Math.max(0,rect.top)}px`);frame.style.setProperty('--native-width',`${rect.width}px`);frame.style.setProperty('--native-height',`${height}px`);nativeSurface.mount.style.height=`${height}px`;}
async function closeNativeSettings(back=false){
    if(!nativeSurface)return false;const result=await raw('nativeSettings',{action:back?'back':'close',surfaceId:nativeSurface.surfaceId},30000);if(result.nestedClosed)return true;
    const {frame,trigger,returnTo}=nativeSurface;nativeSurface=null;frame.classList.remove('native-engine');for(const name of ['--native-left','--native-top','--native-width','--native-height'])frame.style.removeProperty(name);frame.setAttribute('inert','');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;if(result.configuration)configuration=result.configuration;try{engineBusy=(await raw('activity')).busy;}catch{}if(back){if(returnTo==='settings'){settingsPage.setTab('home');navigate('settings');}else navigate(returnTo||'home');}else renderPage();controls();(trigger?.isConnected?trigger:document.querySelector('#settings-connection,#settings-presets'))?.focus?.({preventScroll:true});return true;
}
async function openLibrary(kind){$('library-kind').value=kind;await library.open(kind);}
async function editCharacter(c){await library.edit(c.key,{kind:'characters',fromLibrary:!chatSurfaceActive()});}
function showStream(){if(!snapshot||!same(operation?.target,snapshot)||!chatSurfaceActive())return;const near=isNearBottom($('messages'));const oldThinking=streamNode?.querySelector('.thinking')?.open;streamNode?.remove();streamNode=el('article','','message stream');streamNode.append(el('div','Reply arriving…','byline'),reasoning(shown(streamReasoning,{placement:PLACEMENT.REASONING})),el('div','','bubble'));streamNode.querySelector('.bubble').innerHTML=format(shown(streamText,{placement:PLACEMENT.AI_OUTPUT}));if(oldThinking??appearance.thinking==='expanded')streamNode.querySelector('details').open=true;$('messages').append(streamNode);for(const article of $('messages').querySelectorAll('article[data-index]'))if(superseded(Number(article.dataset.index)))article.hidden=true;if(near)$('messages').scrollTop=$('messages').scrollHeight;}
function onEvent(event){if(event.type==='error.record'){const record=errorEvents.add(event.record);if(!nativeSurface&&(!record.target||same(record.target,snapshot))){if(record.operationId)showComposerError(record);else toast(record.summary);}return;}if(event.requestId!==operation?.requestId)return;if(event.type==='text.replace'){if(operation.mode==='send'&&event.text&&same(operation.target,snapshot)&&$('draft').value===operation.text){$('draft').value='';state.saveDraft(operation.target,'');}streamText=event.text;streamReasoning=event.reasoning??'';operation.state=event.state;controls();if(!streamFrame)streamFrame=requestAnimationFrame(()=>{streamFrame=null;if(!same(operation?.target,snapshot)||!chatSurfaceActive())return;if(!streamNode?.isConnected)showStream();const near=isNearBottom($('messages'));const bubble=streamNode.querySelector('.bubble');const open=Array.from(bubble.querySelectorAll('details')).map(d=>d.open);bubble.innerHTML=format(shown(streamText,{placement:PLACEMENT.AI_OUTPUT}));Array.from(bubble.querySelectorAll('details')).forEach((d,i)=>d.open=open[i]??false);const thinking=streamNode.querySelector('.thinking');thinking.hidden=!streamReasoning;thinking.querySelector('.thinking-body').innerHTML=format(shown(streamReasoning,{placement:PLACEMENT.REASONING}));if(near)$('messages').scrollTop=$('messages').scrollHeight;$('jump').hidden=near;});}else if(event.type==='operation.verifying'){operation.state='verifying';status('Saving the reply…');controls();}}
async function finishGeneration(result,pending){if(streamNode&&result.snapshot?.messages?.length){const index=result.snapshot.messages.length-1;detailsState.set(detailKey(result.snapshot.messages[index],index,result.snapshot),Array.from(streamNode.querySelectorAll('details')).map(d=>d.open));}if(same(snapshot,pending.target))saveDraft();if(result.persistence==='verified'){if(pending.argument.mode==='send'&&state.draft(pending.target)===pending.argument.text){state.saveDraft(pending.target,'');if(same(snapshot,pending.target))$('draft').value='';}state.finish();}else{review=true;showRecovery('Read the saved conversation before sending again.');}if(result.snapshot&&same(result.snapshot,snapshot)){snapshot=result.snapshot;render(true);}if(result.error){const record=errorEvents.add(result.error);showComposerError(record);}status(result.error?'Reply failed':result.state==='cancelled'?'Reply stopped':'Reply saved');await refresh();}
async function waitForEngine(){for(let i=0;i<100;i++){const activity=await raw('activity');if(!activity.busy)return;if(activity.operation)throw Object.assign(Error('Another generation is running. Your draft is kept.'),{code:'BUSY'});status(`Waiting for ${activity.locks?.join(', ')||'the engine save'}…`);await new Promise(resolve=>setTimeout(resolve,100));}throw Object.assign(Error('The engine is still busy. Stop Memory or wait before sending. Your draft is kept.'),{code:'BUSY'});}
// ST asks once whether to import a new card's embedded lorebook; do the same.
async function offerCardLore(key){if(!key)return;const card=await raw('assets',{kind:'characters',action:'read',key});const book=card.draft?.character_book;if(!Array.isArray(book?.entries)||!book.entries.length||card.associations?.primary?.available)return;const name=book.name||`${card.draft.name}'s Lorebook`;if(!await confirmDialog({title:'Import its lorebook?',text:`${card.draft.name} comes with an embedded lorebook, “${name}” (${book.entries.length} ${book.entries.length===1?'entry':'entries'}). Import it into World Info and use it as this character's primary lorebook?`,confirm:'Import'}))return;const result=await raw('assets',{kind:'characters',action:'importLore',key,revision:card.revision},60000);toast(`Lorebook “${result.lorebook}” imported and linked`);}
// ST drops its provider connection when the engine reloads (backgrounded tab,
// Reconnect). Reconnect it the way Settings → Connect does before sending;
// nothing has been sent yet, so a failure keeps the draft.
async function ensureApiConnection(){const current=await raw('settings');if(current.onlineStatus!=='no_connection')return;status('Connecting to the API…');try{configuration=await raw('configure',{kind:'connect',value:'',revision:current.revision},45000);}catch(e){throw Object.assign(Error(`The API is not connected: ${e.message} Your draft is kept.`),{code:'NO_CONNECTION'});}apiChecked=true;if(configuration.onlineStatus==='no_connection')throw Object.assign(Error('The API is not connected. Check Settings → Connection. Your draft is kept.'),{code:'NO_CONNECTION'});}
async function generate(mode='send'){if(draining){toast('Wait for saved changes to finish. Your draft is kept.');return;}if(engineBusy||memoryBusy||working||startingGeneration){toast('Only one generation at a time. Your draft is kept.');return;}if(review||!connected||!snapshot)return;const port=connection.port;const current=target(snapshot),submittedText=mode==='send'?$('draft').value:'';if(mode==='send'&&!$('draft').value.trim())return;startingGeneration=true;controls();try{saveDraft();rememberDetails();await drain();if(review||queued())return;working=true;controls();status('Opening engine chat…');await workspace('activate',{target:current});await waitForEngine();await ensureApiConnection();const active=await raw('snapshot');if(!same(active,current))throw Error('Engine selected another chat. Refresh before sending.');if(same(snapshot,current)){snapshot=active;render(true);}const argument={...current,requestId:crypto.randomUUID(),mode,text:submittedText,expectedMessage:mode==='swipe'?JSON.stringify(active.messages.at(-1)):undefined};const pending={kind:'send',sessionId,target:current,argument,beforeCount:active.messages.length};state.begin(pending);operation={...argument,target:current,state:'running',beforeCount:active.messages.length};engineBusy=true;working=false;streamText='';streamReasoning='';showStream();status('Waiting for the model…');controls();$('send-error').hidden=true;if(configuration?.selected?.toolCalling)try{if(!localStorage.getItem('pocket-tavern.tools-notice')){localStorage.setItem('pocket-tavern.tools-notice','1');toast('Your preset turns on tool calling. Pocket sends replies without tools; the preset is unchanged.');}}catch{}const result=await raw('send',argument,180000);if(connection.port!==port)return;await finishGeneration(result,pending);}catch(e){if(connection.port!==port)return;if(['NO_CONNECTION','TOOLS_ENABLED','INVALID_ARGUMENT','BUSY','AUTOMATIC_GENERATION','COMPOSER_BUSY','STALE_TARGET','STALE_MESSAGE'].includes(e.code))state.finish();else if(state.pending()){review=true;showRecovery('The request may have been saved. Read it before continuing. Nothing will be resent.');}if(e.code==='BUSY'){try{const activity=await raw('activity');e.message+=' '+(activity.locks?.join(', ')||'Engine mutation still active.');}catch{}}const outcome=state.pending()?'uncertain':'not submitted',record=recordError(e,{operationId:operation?.requestId??null,target:current,outcome});showComposerError(record);status('Reply failed');toast(record.summary);if(['DISCONNECTED','TIMEOUT','ENGINE_UNAVAILABLE'].includes(e.code))disconnected(record.summary);}finally{if(connection.port===port){operation=null;engineBusy=false;working=false;startingGeneration=false;streamNode=null;render(true);controls();await drain();}}}
function showRecovery(text){$('recovery').hidden=false;$('recovery-detail').textContent=text;$('recovery-title').textContent=connected?'Review saved work':'Engine disconnected';controls();}
function disconnected(text){if(nativeSurface?.frame){const frame=nativeSurface.frame;frame.classList.remove('native-engine');for(const name of ['--native-left','--native-top','--native-width','--native-height'])frame.style.removeProperty(name);frame.setAttribute('inert','');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;nativeSurface=null;}connected=false;review=!!state.pending();connection.disconnect(text);engineBusy=false;working=false;operation=null;startingGeneration=false;showRecovery(text);status('Engine disconnected · drafts kept');renderPage();}
async function initialize(){if(initializing)return;initializing=true;controls();let port;try{const channel=new MessageChannel();port=channel.port1;connection.connect(port);$('engine').contentWindow.postMessage({type:'st-mobile-connect'},location.origin,[channel.port2]);const info=await raw('handshake',undefined,30000);if(connection.port!==port)return;checkBridgeBuild(info);sessionId=info.sessionId;bridgeCapabilities=info.capabilities??{};connected=true;const activity=await raw('activity');engineBusy=activity.busy;journal.adopt(sessionId);review=false;showSaveBanner();await refresh();scopes=await workspace('scopes');const last=state.target();if(last){try{snapshot=await workspace('read',{target:last});scopes=await workspace('scopes',{target:last});$('draft').value=state.draft(last);}catch{snapshot=null;}}else scopes=await workspace('scopes');
        const pending=state.pending();if(pending){let result;try{if(pending.sessionId===sessionId)result=await raw('status',pending.argument.requestId);}catch{}const decision=recoveryDecision(pending,sessionId,result);if(decision==='observe'){operation={...pending.argument,target:pending.target,state:result.state,beforeCount:pending.beforeCount};observeOperation(pending);}else if(decision==='settled')await finishGeneration(result,pending);else review=true;}
        $('recovery').hidden=!review;if(review)showRecovery('The app restarted with saved work pending. Review before resuming.');status('Engine ready');try{const savedUndo=JSON.parse(localStorage.getItem('pocket-tavern.undo.v1'));if(savedUndo?.expires>Date.now())toast('Deletion recovery is available',savedUndo.value,savedUndo.expires-Date.now());}catch{}renderPage();controls();
    }catch(e){if(connection.port===port)disconnected(e.message);}finally{if(connection.port===port || !connection.port){initializing=false;controls();}}}
async function observeOperation(pending,port=connection.port){if(connection.port!==port||!operation)return;try{const result=await raw('status',pending.argument.requestId);if(connection.port!==port||!operation)return;streamText=result.text??'';streamReasoning=result.reasoning??'';operation.state=result.state;if(['running','stopping','verifying'].includes(result.state)){showStream();setTimeout(()=>observeOperation(pending,port),1000);}else{operation=null;engineBusy=false;await finishGeneration(result,pending);render(true);controls();await drain();}}catch(e){if(connection.port===port)disconnected(e.message);}}
async function reviewWork(){const activity=await raw('activity');if(activity.busy)throw Error('Wait for generation or Memory to finish before reviewing changes.');if(state.pending()){const pending=state.pending();const saved=await workspace('read',{target:pending.target});await openChat(saved);if(submittedUserMessage(pending,saved)&&state.draft(pending.target)===pending.argument?.text){state.saveDraft(pending.target,'');$('draft').value='';}state.finish();}review=false;$('recovery').hidden=true;$('send-error').hidden=true;status('Saved work reviewed · ready');controls();}
const rpc=async(method,arg,timeout)=>{if(method==='configure'&&arg?.kind==='persona'&&snapshot){await workspace('activate',{target:target(snapshot)});}if(method==='extensions'&&arg?.action==='read'){const value=await raw(method,arg,timeout);if(snapshot){if(!same(value.target,snapshot)){value.memory=snapshot.metadata.summaryception??{layers:[]};value.target=target(snapshot);value.backlog=null;value.injection='';}value.needsRebuild=!!snapshot.metadata.pocket_tavern?.memoryInvalid;}return value;}if(method==='extensions'&&!['stop','choice','settings','reset'].includes(arg?.action)&&snapshot){const active=await raw('snapshot');if(!same(active,snapshot)){try{await workspace('activate',{target:target(snapshot)});}catch(e){if(e.code==='BUSY')throw Object.assign(Error('The engine is still busy with another chat. Wait a moment, then try again.'),{code:'BUSY'});throw e;}}}return raw(method,arg,timeout);};
settingsPanel=createSettingsPanel({rpc,action,adoptSnapshot:refresh,status,locked:()=>!connected||review||engineBusy||memoryBusy});
newChatPanel=createNewChatPanel({action,prepare:prepareNewChat,apply:applyNewChat,available:()=>connected&&!review&&!engineBusy&&!memoryBusy&&!working&&!draining&&!startingGeneration&&!journal.read().length});
library=createLibrary({rpc,action,personaName:id=>configuration?.personas?.find(p=>p.id===id)?.name??id,colourOf:(key,color)=>{const c=characters.find(c=>c.key===key);return c?characterColours.resolve({...c,color}):Promise.resolve(null);},globalPreset:()=>configuration?.selected?.preset??'',onStartChat:(card,guard)=>newChatPanel.open(card,guard),onStartFresh:startFreshChat,readChat:()=>snapshot,onChat:(row,guard)=>openChat(row,{dismissPanels:false,guard}),refreshAvailability:async()=>{const activity=await raw('activity');engineBusy=activity.busy||!!operation;controls();},onDeleted:characterKey=>{if(snapshot?.characterKey===characterKey){librarySection='characters';navigate('library',{dismissPanels:false});snapshot=null;selected.clear();}},format,converter:new showdown.Converter({tables:true,strikethrough:true,simpleLineBreaks:true}),sanitize:(html,options)=>DOMPurify.sanitize(html,options),locked:()=>!connected||review,refresh,onEditor:(kind,key)=>{$('character-chats').hidden=!chatSurfaceActive()||kind!=='characters'||key!==snapshot?.characterKey;}});
libraryViews=createLibraryViews({node:el,button,portrait,personaPortrait,windowList,editCharacter:c=>library.edit(c.key,{kind:'characters',fromLibrary:true}),createCharacter:()=>library.createCharacter(),importCharacters:openImport,editPersona:p=>action(()=>openPersonaEditor(p)),createPersona:()=>action(()=>openPersonaEditor(null)),startFresh:startFreshChat,onDelete:confirmChatDelete,readCard:key=>raw('assets',{kind:'characters',action:'read',key}),availability:()=>connected&&!review&&!freshPreparing&&!engineBusy&&!working&&!memoryBusy&&!draining&&!startingGeneration});
$('character-import-file').onchange=async()=>{const file=$('character-import-file').files[0];if(!file||importWaiting||importUncertain)return;const invalid=importPreflight(file);if(invalid){$('character-import-status').textContent=invalid;$('character-import-file').value='';recordError({code:'IMPORT_VALIDATION',message:invalid},{operationId:`import:${crypto.randomUUID()}`,outcome:'not submitted'});return;}importWaiting=true;$('character-import-file').disabled=true;$('character-import-status').textContent=`Importing and verifying ${file.name} (${importSize(file.size)})…`;try{const imported=await library.importCharacter(file);$('character-import-confirm').close();status('Character imported and verified');await offerCardLore(imported?.key);}catch(e){importUncertain=true;const record=recordError(e,{operationId:`import:${crypto.randomUUID()}`,outcome:'uncertain'});$('character-import-status').textContent=record.summary+' Inspect saved characters before another import.';}finally{importWaiting=false;if(!importUncertain)$('character-import-file').disabled=false;}};
settingsPage=createSettingsPage({onPresets:()=>action(()=>openConnection(configuration?.ownership==='native'?'presets':'migration')),onNativeSettings:surface=>action(()=>openNativeSettings(surface,'settings')),visible:()=>page==='settings',wide:wideLayout,onChecked:()=>{apiChecked=true;if(page==='home')renderPage();},rpc,action,locked:()=>!connected||review||engineBusy||memoryBusy||working,notify:text=>toast(text),reconnect:()=>$('reconnect').click(),connected:()=>connected,adoptSnapshot:refresh,getAppearance:()=>appearance,setAppearance:value=>{if(value.thinking!==appearance.thinking)detailsState.clear();appearance=applyAppearance(saveAppearance(localStorage,value));},getLayout:()=>layoutPreferences,setLayout:value=>{layoutPreferences=saveLayoutPreferences(localStorage,value);applyNavPreferences();renderPage();},getThemeStore:()=>colorThemes,beginThemePreview,diagnostics:()=>errorEvents.recent(),clearDiagnostics:()=>errorEvents.clear(),openEngineLog,probeProxy:async()=>{try{const stop=new AbortController();const timer=setTimeout(()=>stop.abort(),6000);try{await fetch('http://127.0.0.1:8001/api/v1/models',{mode:'no-cors',cache:'no-store',signal:stop.signal});return true;}finally{clearTimeout(timer);}}catch{return false;}}});
$('theme-preview-cancel').onclick=cancelThemePreview;$('theme-preview-apply').onclick=commitThemePreview;
wiPanel=createWorldInfoPanel({onPage:name=>page===name,workspace:()=>({visible:page==='wi'||(page==='library'&&librarySection==='wi'),origin:page==='library'?'library':'wi'}),rpc,action,locked:()=>!connected||review||engineBusy||working||memoryBusy,connected:()=>connected,notify:text=>toast(text),navigate:value=>{const target=typeof value==='string'?{page:value}:value;if(target.section)librarySection=target.section;navigate(target.page);},setSubtitle:text=>{$('page-subtitle').textContent=text;$('page-subtitle').hidden=!text;}});
memoryPanel=createMemoryPanel({visible:()=>page==='memory',rpc,action,locked:()=>!connected||review||engineBusy||working,connected:()=>connected,onState:value=>{if(value.busy&&!memoryWasBusy)memoryStopAsked=false;if(memoryWasBusy&&!value.busy&&!value.failure){memoryResult=memoryStopAsked?'stopped':'done';clearTimeout(memoryResultTimer);memoryResultTimer=setTimeout(()=>{memoryResult=null;renderMemoryNotice();},6000);}if(value.busy)memoryResult=null;memoryWasBusy=value.busy;memoryState=value;renderMemoryNotice(value);},onStopRequested:()=>{memoryStopAsked=true;},notify:text=>toast(text),onBusy:value=>{memoryBusy=value;controls();if(!value)drain();},refresh:async()=>{await refresh();if(snapshot&&!engineBusy){snapshot=await workspace('read',{target:target(snapshot)});render(true);}}});
for(const id of ['setting-preset','edit-active-preset','setting-thinking','setting-tools','setting-model','setting-custom-model','apply-custom-model']){const n=$(id);n.hidden=true;const label=document.querySelector(`label[for="${id}"]`);if(label)label.hidden=true;if(n.parentNode.tagName==='LABEL')n.parentNode.hidden=true;}
// The skeleton exposes global pause and frequency. Existing advanced controls stay in ST.
// Memory fields are now rendered dynamically by the memory page; no static hiding needed.
chatControls=createChatControls({atRoot:()=>page==='home',onBack:()=>{if(page==='chat'){navigate(entryPage);return true;}if(!$('page-back').hidden){$('page-back').click();return true;}if(page!=='home'){navigate('home');return true;}return false;}});
modelPanel=createModelPanel({action,windowList,openConnection,load:async origin=>({state:projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin),configuration:await raw('settings')}),select:async(kind,value,scope,origin)=>{await configureScope(kind,value,scope,origin?target(origin):null);return {state:projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin),configuration:await raw('settings'),pending:journal.read().some(i=>i.argument.action==='configure')};}});
const loadPresetState=async origin=>{const state=projectedScopes(await workspace('scopes',{target:origin?target(origin):null}),origin);const configuration=await raw('settings');let fields=[];if(configuration.presets.length)fields=(await workspace('presetData',{name:configuration.presets[0]})).fields;return {state,configuration,fields};};
presetPanel=createPresetPanel({action,available:()=>connected&&!review,importPreset:file=>raw('assets',{action:'import',kind:'presets',file},60000),load:loadPresetState,change:async(kind,value,scope,origin,preset)=>{await configureScope(kind,value,scope,origin?target(origin):null,preset);return {...await loadPresetState(origin),pending:journal.read().some(i=>i.argument.action==='configure')};}});
for(const n of document.querySelectorAll('[data-close]'))n.onclick=()=>$(n.dataset.close).close();
function applyNavPreferences(){const order=visibleDestinations(layoutPreferences),nav=$('bottom-nav');nav.style.setProperty('--visible-destinations',String(order.length));for(const id of order){const item=nav.querySelector(`[data-page="${id}"]`);if(item){item.hidden=false;nav.append(item);}}for(const item of nav.querySelectorAll('button'))if(!order.includes(item.dataset.page))item.hidden=true;document.documentElement.dataset.messageFormat=layoutPreferences.messageFormat;}
for(const b of $('bottom-nav').querySelectorAll('button')){b.prepend(icon({home:'home',chats:'chat',library:'library',extensions:'extension',wi:'book'}[b.dataset.page]));b.onclick=()=>action(async()=>{if(b.dataset.page==='library')librarySection='characters';navigate(b.dataset.page);});}applyNavPreferences();
$('page-back').onclick=()=>action(async()=>{if(nativeSurface){await closeNativeSettings(true);return;}if(cancelThemePreview())return;if(page==='persona-editor'){librarySection='personas';navigate('library');}else if(page==='persona-picker')navigate('chat');else if(page==='memory')navigate('chat');else if(page==='wi-entry'||page==='wi-activation')await wiPanel.leave(page);else if(page==='settings'){if(settingsPage.back())renderPage();else navigate(settingsFrom);}else navigate('chats');});$('page-wi-activation').onclick=()=>action(()=>wiPanel.openActivation());$('page-new-chat').onclick=showCharacters;
$('chat-delete-apply').onclick=()=>action(async()=>{if(!chatDeleteArgument||$('chat-delete-apply').disabled)return;const captured=chatDeleteArgument;$('chat-delete-confirm').close();chatDeleteArgument=null;await queueChange(captured,'Delete conversation');});
$('back').onclick=()=>navigate(entryPage);$('avatar').onclick=$('name').onclick=()=>action(()=>editCharacter(characters.find(c=>c.key===snapshot.characterKey)));$('page-search-input').oninput=()=>{const current=listPage();if(listQuery[current]===undefined)return;listQuery[current]=$('page-search-input').value;$('page-search-clear').hidden=!$('page-search-input').value;renderPage();};$('page-search-clear').onclick=()=>{const current=listPage();listQuery[current]='';$('page-search-input').value='';renderPage();$('page-search-input').focus();};$('home-version').textContent=FRONTEND_BUILD;$('app-settings').onclick=()=>action(()=>openConnection('home'));$('home-status').onclick=()=>action(()=>openConnection('connection'));
$('settings-button').onclick=()=>chatControls.openMenu('chat-settings',$('settings-button'));
function openCharacterHistory(){const rows=recents.filter(r=>r.characterKey===snapshot.characterKey);$('chat-list').replaceChildren(...rows.map(chatRow));$('history').showModal();}
$('open-preset').onclick=()=>action(()=>openPreset());$('open-persona').onclick=$('active-persona').onclick=()=>action(()=>openPersonaPicker());$('open-connection').onclick=()=>action(openConnection);$('open-memory').onclick=()=>{$('chat-settings').close();action(async()=>{await memoryPanel.open();navigate('memory');});};$('character-chats').onclick=()=>{$('asset-editor').close();$('library-panel').close();openCharacterHistory();};$('close-history').onclick=()=>$('history').close();$('new-chat').onclick=()=>action(async()=>{const origin=target(snapshot);const card=await raw('assets',{kind:'characters',action:'read',key:origin.characterKey});await newChatPanel.open({key:origin.characterKey,name:card.draft.name,cardRevision:card.revision,target:origin},()=>same(snapshot,origin));});$('rename-chat').hidden=true;$('delete-chat').onclick=()=>action(()=>confirmChatDelete(snapshot));
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
$('toast-text').onclick=()=>{$('toast').hidden=true;};
// Browsers allow an orientation lock only for the installed app (manifest orientation) or fullscreen; elsewhere this quietly does nothing.
const lockPortrait=()=>screen.orientation?.lock?.('portrait').catch(()=>{});lockPortrait();addEventListener('pointerdown',lockPortrait,{once:true});
$('draft').oninput=()=>{clearTimeout(draftTimer);if(snapshot)state.saveDraft(snapshot,$('draft').value);controls();};$('composer').onsubmit=e=>{e.preventDefault();generate();};$('stop').onclick=()=>action(async()=>{operation.state='stopping';controls();try{await raw('stop',operation.requestId);status('Stopping and saving…');}catch(e){if(operation)operation.state='running';controls();throw e;}});
let lastWideLayout=wideLayout();document.documentElement.dataset.wideLayout=String(lastWideLayout);let listFrame;$('landing').onscroll=()=>{if(!listFrame)listFrame=requestAnimationFrame(()=>{listFrame=null;listRenderer?.();positionNativeSettings();});};addEventListener('resize',()=>{positionNativeSettings();const next=wideLayout();document.documentElement.dataset.wideLayout=String(next);if(next!==lastWideLayout){layoutTransition=true;lastWideLayout=next;if(page!=='chat')renderPage();requestAnimationFrame(()=>requestAnimationFrame(()=>{layoutTransition=false;}));}});
let scrollFrame;$('messages').onscroll=()=>{if(!snapshot)return;const pane=$('messages');if(!layoutTransition&&!renderingMessages&&(page==='chat'||wideLayout()))positions.set(key(snapshot),pane.scrollTop);$('jump').hidden=isNearBottom(pane);if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;const first=pane.querySelector('article[data-index]');const last=Array.from(pane.querySelectorAll('article[data-index]')).at(-1);if((first&&Number(first.dataset.index)>0&&first.getBoundingClientRect().top>pane.getBoundingClientRect().top)||(last&&Number(last.dataset.index)<snapshot.messages.length-1&&last.getBoundingClientRect().bottom<pane.getBoundingClientRect().bottom)){render();if(operation&&same(operation.target,snapshot))showStream();}});};$('jump').onclick=()=>{positions.delete(key(snapshot));renderedKey=null;render();};
$('reconnect').onclick=()=>{connectStartedAt=Date.now();apiChecked=false;saveDraft();disconnected('Reloading the engine. Nothing is resent.');engineMonitor.reset();initializing=false;reloadEngineFrame();};
// A fresh frame loads without adding a browser-history entry; setting src on
// the old one would add one, and Back on Home would then reload the engine.
// Focus inside the hidden engine would send Android Back (a close request) to ST instead of Pocket.
window.addEventListener('blur',()=>setTimeout(()=>{if(!nativeSurface&&document.activeElement===$('engine'))$('engine').blur();}));
function reloadEngineFrame(){const old=$('engine'),frame=old.cloneNode(false);frame.src='/';old.replaceWith(frame);}$('review').onclick=()=>action(reviewWork);$('save-retry-apply').onclick=()=>action(async()=>{const item=journal.read().find(value=>value.state==='interrupted');if(!item)return;if(!connected)throw Error('The engine is not connected yet. Retry once it is back.');journal.patch(item.id,{state:'pending',sessionId,error:undefined});showSaveBanner();status('Applying changes…');await drain();});$('save-retry-discard').onclick=()=>{const item=journal.read().find(value=>value.state==='interrupted');if(!item)return;journal.remove(item.id);toast('Discarded. If the engine had saved this change before it stopped, it stays saved.');showSaveBanner();controls();};
window.addEventListener('message',e=>{if(e.source===$('engine').contentWindow&&e.origin===location.origin&&e.data?.type==='st-mobile-ready')initialize();});window.addEventListener('beforeunload',()=>saveDraft());document.addEventListener('visibilitychange',()=>{saveDraft();if(!document.hidden)checkHealth().then(autoReconnect);});window.addEventListener('online',()=>autoReconnect());
const engineMonitor=createEngineMonitor({connection,probe:probeEngine,isReady:()=>connected&&!initializing,onActivity:async activity=>{engineBusy=activity.busy||!!operation;controls();if(!engineBusy)await drain();},onDisconnect:disconnected});
const checkHealth=()=>engineMonitor.check();
// Android freezes a backgrounded tab, and the engine frame with it, so the
// bridge is often gone when the user returns. Reload the engine frame by
// itself once the local server answers again, as the Reconnect button does
// (nothing is resent; interrupted work still goes through review).
let autoReconnectAt=0;
async function autoReconnect(){if(document.hidden||Date.now()-autoReconnectAt<15000)return;if(Date.now()-connectStartedAt<45000||(connected&&!initializing))return;try{await probeEngine();}catch{return;}if(document.hidden||(connected&&!initializing))return;autoReconnectAt=Date.now();status('Reconnecting to the engine…');$('reconnect').click();}
setInterval(()=>{checkHealth();if(!connected||initializing)autoReconnect();},3000);setTimeout(()=>{if(!connected)showRecovery('Start the local ST engine, then reconnect.');},20000);controls();renderPage();
