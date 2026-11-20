import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollectionOrganizer} from '../prototype/extension/collection-organizer.js';

const base=()=>({version:1,revision:2,opaque:{keep:7},folders:[{id:'one',name:'One',foreign:'kept'},{id:'two',name:'Two'}],assignments:{'a.png':'one'}});
function fixture(record=base()){
    const context={characters:[{avatar:'a.png'},{avatar:'b.png'}],extensionSettings:{pocket_tavern:{version:3,unknown:{kept:true},...(record===undefined?{}:{collections:structuredClone(record)})}}};
    let disk=structuredClone(context.extensionSettings),saveMode='ok',readFails=false,saves=0,release=null;
    const saveSettings=async()=>{saves++;if(saveMode==='wait')await new Promise(resolve=>{release=resolve;});if(saveMode==='write-throw'){disk=structuredClone(context.extensionSettings);throw Error('ack lost');}if(saveMode==='throw-readfail'){readFails=true;throw Error('disk full');}if(saveMode==='throw')throw Error('disk full');disk=structuredClone(context.extensionSettings);};
    const readSavedSettings=async()=>{if(readFails)throw Error('read unavailable');return {extension_settings:structuredClone(disk)};};
    const busy=[];const make=()=>createCollectionOrganizer({getContext:()=>context,saveSettings,readSavedSettings,onBusy:value=>busy.push(value)});
    return {context,make,disk:()=>disk,setDisk:value=>{disk=structuredClone(value);},setSave:value=>{saveMode=value;},setReadFails:value=>{readFails=value;},release:()=>release?.(),saves:()=>saves,busy};
}

test('unknown fields survive rename/delete and a fresh runtime reads the durable record',async()=>{
    const f=fixture(),organizer=f.make();const renamed=await organizer({action:'rename',revision:2,id:'one',name:'Renamed'});
    assert.equal(renamed.opaque.keep,7);assert.equal(renamed.folders[0].foreign,'kept');assert.deepEqual(f.context.extensionSettings.pocket_tavern.unknown,{kept:true});
    const freshContext={...f.context,extensionSettings:structuredClone(f.disk())};const fresh=createCollectionOrganizer({getContext:()=>freshContext,saveSettings:async()=>{},readSavedSettings:async()=>({extension_settings:structuredClone(f.disk())})});
    assert.deepEqual(await fresh({action:'read'}),renamed);
    const removed=await organizer({action:'delete',revision:renamed.revision,id:'one'});assert.equal(removed.assignments['a.png'],undefined);assert.equal(removed.opaque.keep,7);
});

test('future and malformed schemas fail closed without a write',async()=>{
    for(const record of [{version:2,revision:0,folders:[],assignments:{}},{version:1,revision:0,folders:[{id:'x',name:' X '}],assignments:{}},{version:1,revision:0,folders:[],assignments:{a:'missing'}}]){
        const f=fixture(record),organizer=f.make();await assert.rejects(organizer({action:'read'}),error=>['UNSUPPORTED_SETTINGS','INVALID_COLLECTION_SETTINGS'].includes(error.code));await assert.rejects(organizer({action:'create',revision:0,name:'Nope'}));assert.equal(f.saves(),0);
    }
});

test('mutations serialize and publish busy state to the shared engine lock',async()=>{
    const f=fixture();f.setSave('wait');const organizer=f.make(),first=organizer({action:'create',revision:2,name:'Three'});while(!organizer.busy())await new Promise(resolve=>setImmediate(resolve));
    await assert.rejects(organizer({action:'create',revision:2,name:'Four'}),error=>error.code==='BUSY');assert.equal(f.busy.at(-1),true);f.release();await first;assert.deepEqual(f.busy,[true,false]);
});

test('durable conflicts, rename collisions and deleted targets fail before saving',async()=>{
    const f=fixture(),organizer=f.make();const changed=base();changed.revision=3;changed.folders[0].name='External';f.setDisk({pocket_tavern:{version:3,unknown:{kept:true},collections:changed}});
    await assert.rejects(organizer({action:'create',revision:2,name:'Three'}),error=>error.code==='STALE_SETTINGS');assert.equal(f.context.extensionSettings.pocket_tavern.collections.folders[0].name,'External');assert.equal(f.saves(),0);
    const revision=changed.revision;await assert.rejects(organizer({action:'rename',revision,id:'one',name:'Two'}),/already exists/);f.context.characters=[];await assert.rejects(organizer({action:'move',revision,characterKey:'a.png',folderId:'one'}),error=>error.code==='NOT_FOUND');assert.equal(f.saves(),0);
});

test('save failures restore known state, lost acknowledgements reconcile, and unreadable outcomes stay locked',async()=>{
    const failed=fixture(),first=failed.make();failed.setSave('throw');await assert.rejects(first({action:'create',revision:2,name:'Three'}),/not saved/);assert.deepEqual(failed.context.extensionSettings.pocket_tavern.collections,base());
    const acknowledged=fixture(),second=acknowledged.make();acknowledged.setSave('write-throw');const saved=await second({action:'create',revision:2,name:'Three'});assert.equal(saved.revision,3);assert.equal(saved.folders.at(-1).name,'Three');
    const uncertain=fixture(),third=uncertain.make();uncertain.setSave('throw-readfail');await assert.rejects(third({action:'create',revision:2,name:'Three'}),error=>error.code==='COLLECTIONS_UNCERTAIN');assert.equal(third.busy(),true);await assert.rejects(third({action:'delete',revision:3,id:'one'}),error=>error.code==='BUSY');uncertain.setReadFails(false);uncertain.setDisk({pocket_tavern:{version:3,unknown:{kept:true},collections:structuredClone(uncertain.context.extensionSettings.pocket_tavern.collections)}});const reconciled=await third({action:'reconcile'});assert.equal(reconciled.revision,3);assert.equal(third.busy(),false);
});
