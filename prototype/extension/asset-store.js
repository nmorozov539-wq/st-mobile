import {convertWorldInfoToCharacterBook} from './character-book.js?build=0.7.6';
import {characterAssociations,associationRevision,removeCharacterPersona,changeAdditionalBooks} from './character-associations.js?build=0.7.6';
import { safeObject, assetName, characterUpdate, assertUnchanged, personaRecord, containsData, validatePreset } from './asset-data.js?build=0.7.6';
export function createAssetStore({getContext,getAssociationState,characterFileName,saveSettings,setUserName,getPresetManager,getPresetApplicationPromise,getUserAvatars,getUserAvatar,applyPreset,duplicateCharacter,deleteCharacter,fetch:fetcher=globalThis.fetch}) {
    const manager = () => getPresetManager('openai');
    async function post(url, body) {
        const multipart = body instanceof FormData;
        const response = await fetcher(url, {method:'POST', headers:getContext().getRequestHeaders({omitContentType:multipart}),body:multipart?body:JSON.stringify(body),cache:'no-store'});
        if (!response.ok) throw Error(`ST could not complete the library operation (${response.status}). Refresh before trying again; a write may already have completed.`);
        const text=await response.text(); return text && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text;
    }
    const saved = () => post('/api/settings/get', {});
    async function read(kind,key) {
        if(kind==='characters') return safeObject((await post('/api/characters/get',{avatar_url:key})).data);
        if(kind==='personas') return personaRecord(getContext().powerUserSettings,key);
        if(kind==='presets') {
            const list=manager().getPresetList();
            if(!Object.hasOwn(list.preset_names,key)) throw Error('Preset is no longer available.');
            return safeObject(list.presets[list.preset_names[key]]);
        }
        throw Error('Unknown library type.');
    }
    async function list(kind) {
        if(kind==='characters') return getContext().characters.map(c=>({key:c.avatar,name:c.name}));
        if(kind==='personas') return Object.entries(getContext().powerUserSettings.personas??{}).map(([key,name])=>({key,name}));
        if(kind==='presets') return Object.keys(manager().getPresetList().preset_names).map(name=>({key:name,name}));
        throw Error('Unknown library type.');
    }
    async function uploadAvatar(key,file) {
        if(!file) file=new File([await (await fetcher('/img/user-default.png')).blob()],'avatar.png',{type:'image/png'});
        const form=new FormData();form.append('avatar',file,file.name);form.append('overwrite_name',key);
        const result=await post('/api/avatars/upload',form);
        if(result?.path!==key) throw Error('Could not verify the uploaded persona portrait.');
    }
    async function importCharacter(file) {
        if(!(file instanceof Blob) || file.size>30*1024*1024)throw Error('Choose a character file under 30 MB.');
        const type=file.name?.split('.').at(-1).toLowerCase();
        if(!['png','json','yaml','yml','charx','byaf'].includes(type))throw Error('Supported character formats: PNG, JSON, YAML, CHARX, BYAF.');
        const form=new FormData();form.append('avatar',file,file.name);form.append('file_type',type);
        const result=await post('/api/characters/import',form);
        if(result?.error || !result?.file_name)throw Error('ST could not import that character file.');
        await getContext().getCharacters();
        const key=result.file_name+'.png';await read('characters',key);return key;
    }
    async function write({kind,key,revision,draft,file}) {
        draft=safeObject(draft);
        if(key)assertUnchanged(await read(kind,key),revision);
        if(kind==='characters') {
            assetName(draft.name);
            if(!key)key=await importCharacter(new File([JSON.stringify({spec:'chara_card_v2',spec_version:'2.0',data:draft})],'character.json',{type:'application/json'}));
            else await post('/api/characters/merge-attributes',characterUpdate(key,draft));
            if(file){const form=new FormData();form.append('avatar',file,file.name);form.append('avatar_url',key);await post('/api/characters/edit-avatar',form);}
            const actual=await read(kind,key);
            for(const field of Object.keys(draft))if(!containsData(actual[field],draft[field]))throw Error(`Saved character field could not be verified: ${field}. Refresh before saving again.`);
            await getContext().getCharacters();
        } else if(kind==='personas') {
            assetName(draft.name);draft.descriptor=safeObject(draft.descriptor??{});
            if(!key){key=crypto.randomUUID()+'.png';await uploadAvatar(key,file);}
            else if(file)await uploadAvatar(key,file);
            const power=getContext().powerUserSettings;
            power.personas[key]=draft.name;power.persona_descriptions[key]=draft.descriptor;
            if(getUserAvatar()===key){
                const d=draft.descriptor;setUserName(draft.name);
                Object.assign(power,{persona_description:d.description??'',persona_description_position:d.position??0,persona_description_depth:d.depth??2,persona_description_role:d.role??0,persona_description_lorebook:d.lorebook??''});
            }
            await saveSettings();
            const powerSaved=JSON.parse((await saved()).settings).power_user;
            assertUnchanged(personaRecord(powerSaved,key),JSON.stringify(draft));
            await getUserAvatars();
        } else if(kind==='presets') {
            const name=assetName(draft.name); const data=validatePreset(draft.preset);
            if(name!==key && (await list(kind)).some(row=>row.key.toLowerCase()===name.toLowerCase()))throw Error('That preset name already exists. Choose another name.');
            if(Object.hasOwn(data,'preset_settings_openai'))data.preset_settings_openai=name;
            await manager().savePreset(name,data);await getPresetApplicationPromise();
            if(applyPreset)await applyPreset(name);
            await saveSettings();
            const stored=await saved(),index=stored.openai_setting_names.indexOf(name);
            if(JSON.parse(stored.settings).oai_settings?.preset_settings_openai!==name)throw Error('The preset was saved but ST did not apply it. Reopen settings before continuing.');
            if(index<0)throw Error('Saved preset was not found. Refresh before saving again.');
            assertUnchanged(JSON.parse(stored.openai_settings[index]),JSON.stringify(data));key=name;
        } else throw Error('Unknown library type.');
        return {key,rows:await list(kind)};
    }
    async function characterAction({action,key,revision,format,deleteChats=false}) {
        const before=await read('characters',key);assertUnchanged(before,revision);
        if(action==='export'){
            if(!['png','json'].includes(format))throw Error('Choose PNG or JSON export.');
            const response=await fetcher('/api/characters/export',{method:'POST',headers:getContext().getRequestHeaders(),body:JSON.stringify({avatar_url:key,format}),cache:'no-store'});
            if(!response.ok)throw Error(`ST could not export this card (${response.status}).`);
            const file=await response.blob();if(!file.size)throw Error('ST returned an empty export.');
            return {file,name:key.replace(/\.png$/i,'')+'.'+format};
        }
        if(action==='duplicate'){
            if(!duplicateCharacter)throw Error('Native character duplication is unavailable.');
            const copy=await duplicateCharacter({avatar:key,silent:true});
            if(!copy||copy===key)throw Error('Character duplication could not be verified. Reopen the library before trying again.');
            assertUnchanged(await read('characters',copy),JSON.stringify(before));
            if(!(await list('characters')).some(row=>row.key===copy))throw Error('ST did not list the saved duplicate.');
            return {key:copy};
        }
        if(action==='delete'){
            if(typeof deleteChats!=='boolean')throw Error('Choose whether to delete chats explicitly.');
            if(!deleteCharacter)throw Error('Native character deletion is unavailable.');
            // Use ST’s helper: it closes native work and emits its extension events.
            if(!await deleteCharacter(key,{deleteChats}))throw Error('ST did not complete character deletion.');
            const cards=await post('/api/characters/all',{});
            if(!Array.isArray(cards)||cards.some(card=>card.avatar===key))throw Error('Character deletion could not be verified. Refresh before trying again.');
            if(deleteChats){const chats=await post('/api/characters/chats',{avatar_url:key,simple:true});if(!chats?.error&&(!Array.isArray(chats)||chats.length))throw Error('Chat deletion could not be verified.');}
            await saveSettings();return {key,deleted:true,deleteChats};
        }
        throw Error('Unknown character action.');
    }
    async function verifyAssociationSettings(power,worldInfo){
        const actual=JSON.parse((await saved()).settings);
        if(associationRevision(actual.power_user??{},actual.world_info_settings?.world_info??{})!==associationRevision(power,worldInfo)||!containsData(actual.power_user,JSON.parse(JSON.stringify(power))))throw Error('Saved association settings could not be verified. Reopen and inspect native settings before another change.');
    }
    async function changeAssociation({key,revision,associationGuard,operation,type,name,index,personaKey}) {
        const before=await read('characters',key);assertUnchanged(before,revision);
        const power=getContext().powerUserSettings,{worldInfo}=getAssociationState();
        const live=associationRevision(power,worldInfo);
        if(!associationGuard||live!==associationGuard)throw Error('Character associations changed. Reopen the character before trying again.');
        const disk=JSON.parse((await saved()).settings);
        if(associationRevision(disk.power_user??{},disk.world_info_settings?.world_info??disk.world_info??{})!==live)throw Error('Native association settings have pending or external changes. Save/review them in ST, then reopen this character.');
        characterAssociations({key,card:before,power,...getAssociationState(),fileName:characterFileName(key)});
        if(operation==='persona-unlink'){
            const descriptor=removeCharacterPersona(power,key,personaKey);
            power.persona_descriptions[personaKey]=descriptor;await saveSettings();
            await verifyAssociationSettings(power,worldInfo);
        }else if(['connect','detach'].includes(operation)&&['primary','additional'].includes(type)){
            if(typeof name!=='string'||!name)throw Error('Choose a lorebook.');
            let book;
            if(operation==='connect'){
                const available=await post('/api/worldinfo/list',{});
                if(!available.some(row=>row.file_id===name))throw Error('This lorebook is no longer available. Reopen the selector.');
                book=safeObject(await post('/api/worldinfo/get',{name}));
            }
            if(type==='additional'){
                worldInfo.charLore=changeAdditionalBooks(worldInfo,characterFileName(key),{operation,name,index});await saveSettings();
                await verifyAssociationSettings(power,worldInfo);
            }else{
                if(operation==='detach'&&before.extensions?.world!==name)throw Error('The primary lorebook changed. Reopen the character.');
                const world=operation==='connect'?name:'';
                const embedded=world?safeObject(JSON.parse(JSON.stringify(book.originalData??convertWorldInfoToCharacterBook(name,book.entries??{})))):'__@@UNSET@@__';
                // Replace only the embedded book, removing old book-only keys in one
                // native atomic merge. Arrays are replaced by ST's deepMerge.
                const replacement=(old,next)=>{
                    const patch=structuredClone(next);
                    for(const field of Object.keys(old??{}))if(!Object.hasOwn(next,field))patch[field]='__@@UNSET@@__';
                    for(const [field,value]of Object.entries(next))if(value&&typeof value==='object'&&!Array.isArray(value))patch[field]=replacement(old?.[field],value);
                    return patch;
                };
                await post('/api/characters/merge-attributes',{avatar:key,data:{extensions:{world},character_book:world?replacement(before.character_book,embedded):embedded}});
                const actual=await read('characters',key),expected=structuredClone(before);expected.extensions={...expected.extensions,world};
                if(world)expected.character_book=embedded;else delete expected.character_book;
                if(!containsData(actual,expected)||(world&&!containsData(expected.character_book,actual.character_book))||(!world&&Object.hasOwn(actual,'character_book')))throw Error('Saved primary lorebook could not be verified. Reopen and inspect the card before another change.');
                await getContext().getCharacters();
            }
        }else throw Error('Unknown character association action.');
        return thisRead(key);
    }
    async function thisRead(key){return store.run({kind:'characters',action:'read',key});}
    const store={async run(arg){
        const {action,kind,key}=arg;
        if(kind==='characters'&&action==='lorebooks')return post('/api/worldinfo/list',{});
        if(kind==='characters'&&action==='association')return changeAssociation(arg);
        if(kind==='characters'&&['export','duplicate','delete'].includes(action))return characterAction(arg);
        if(action==='list')return list(kind);
        if(action==='read'){const draft=await read(kind,key);const result={draft,revision:JSON.stringify(draft)};if(kind==='characters'&&getAssociationState){try{result.associationRevision=associationRevision(getContext().powerUserSettings,getAssociationState().worldInfo);result.associations=characterAssociations({key,card:draft,power:getContext().powerUserSettings,...getAssociationState(),fileName:characterFileName(key)});}catch(error){result.associationError=error.message;}}return result;}
        if(action==='write')return write(arg);
        if(action==='import'){
            if(kind==='characters')return {key:await importCharacter(arg.file),rows:await list(kind)};
            if(!(arg.file instanceof Blob) || arg.file.size>10*1024*1024)throw Error('Choose a JSON file under 10 MB.');
            const data=safeObject(JSON.parse(await arg.file.text()));
            if(kind==='presets')return write({kind,draft:{name:assetName(arg.file.name.replace(/\.json$/i,'')),preset:data}});
            if(kind==='personas'){
                safeObject(data.personas);safeObject(data.persona_descriptions??{});
                let imported=0,skipped=0;
                // ST persona backups omit image bytes. Use the default portrait for new entries.
                for(const [id,name] of Object.entries(data.personas)){
                    const power=getContext().powerUserSettings;
                    if(Object.hasOwn(power.personas,id)){skipped++;continue;}
                    if(!/^[\w .-]+\.(png|jpe?g|webp)$/i.test(id))throw Error('Persona backup contains an invalid avatar filename.');
                    assetName(name);const descriptor=safeObject(data.persona_descriptions?.[id]??{});
                    const avatars=await getUserAvatars(false);if(!avatars.includes(id))await uploadAvatar(id);
                    power.personas[id]=name;power.persona_descriptions[id]=descriptor;await saveSettings();
                    assertUnchanged(personaRecord(JSON.parse((await saved()).settings).power_user,id),JSON.stringify({name,descriptor}));imported++;
                }
                await getUserAvatars();return {rows:await list(kind),note:`Imported ${imported}; kept ${skipped} existing personas. Backup JSON has no portrait images.`};
            }
        }
        throw Error('Unknown library operation.');
    }};return store;
}
