import { saveSettings, setUserName } from '/script.js';
import { getPresetManager } from '/scripts/preset-manager.js';
import { getPresetApplicationPromise } from '/scripts/openai.js';
import { getUserAvatars, user_avatar } from '/scripts/personas.js';
import { createAssetStore } from './asset-store.js?build=0.6.1';
export function createAssetRuntime(getContext){return createAssetStore({getContext,saveSettings,setUserName,getPresetManager,getPresetApplicationPromise,getUserAvatars,getUserAvatar:()=>user_avatar,applyPreset:async name=>{const select=document.querySelector('#settings_preset_openai');select.value=getPresetManager('openai').findPreset(name);select.dispatchEvent(new Event('change',{bubbles:true}));await getPresetApplicationPromise();}});}
