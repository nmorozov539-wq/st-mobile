import {world_info,world_names} from '/scripts/world-info.js';
import {getCharaFilename} from '/scripts/utils.js';
import {canCloseEmptyCharacterView} from './asset-data.js?build=0.8.0-phase1.2';
import {system_message_types} from '/scripts/system-messages.js';
import { saveSettings, setUserName, duplicateCharacter, deleteCharacter, closeCurrentChat } from '/script.js';
import { getPresetManager } from '/scripts/preset-manager.js';
import { getPresetApplicationPromise } from '/scripts/openai.js';
import { getUserAvatars, user_avatar } from '/scripts/personas.js';
import { createAssetStore } from './asset-store.js?build=0.8.0-phase1.2';
export function createAssetRuntime(getContext){return createAssetStore({getContext,getAssociationState:()=>({worldInfo:world_info,worldNames:world_names??[]}),characterFileName:key=>getCharaFilename(null,{manualAvatarKey:key}),saveSettings,setUserName,duplicateCharacter,deleteCharacter:async(key,options)=>{const ctx=getContext();if(canCloseEmptyCharacterView(ctx,{welcomeMessageType:system_message_types.ASSISTANT_MESSAGE,composerText:document.querySelector('#send_textarea')?.value??''})){if(!await closeCurrentChat())throw Error('ST could not close its empty native view.');}return deleteCharacter(key,options);},getPresetManager,getPresetApplicationPromise,getUserAvatars,getUserAvatar:()=>user_avatar,applyPreset:async name=>{const select=document.querySelector('#settings_preset_openai');select.value=getPresetManager('openai').findPreset(name);select.dispatchEvent(new Event('change',{bubbles:true}));await getPresetApplicationPromise();}});}
