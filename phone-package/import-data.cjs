#!/usr/bin/env node
// Explicit offline copy into a freshly prepared combined installation, never a merge.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function importData(source,target){
    source=fs.realpathSync(source);target=fs.realpathSync(target);
    const marker=JSON.parse(fs.readFileSync(path.join(target,'.pocket-tavern.json')));
    if(marker.version!==1||marker.mode!=='combined'||marker.mock)throw Error('Use a fresh normal combined installation, not a mock fixture.');
    if(path.basename(source)!=='default-user'||!fs.existsSync(path.join(source,'settings.json')))throw Error('Supply a standard ST data/default-user folder containing settings.json.');
    if(JSON.parse(fs.readFileSync(path.join(target,'package.json'))).version!=='1.19.0')throw Error('This importer requires the supported ST 1.19.0 installation.');
    const parent=path.join(target,'data'),destination=path.join(parent,'default-user');
    if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error('The destination data directory must not be a symlink.');
    if(fs.existsSync(destination))throw Error('The destination already has user data. Prepare a NEW combined installation before importing; data is never merged or overwritten.');
    if(source===destination||source.startsWith(target+path.sep)||target.startsWith(source+path.sep))throw Error('Source and destination must be separate installations.');
    function check(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Linked user files are not supported by this copy tool.');if(entry.isDirectory())check(path.join(folder,entry.name));}}
    check(source);
    fs.mkdirSync(parent,{recursive:true});
    const stage=path.join(parent,'.pocket-import-'+crypto.randomUUID());
    try{fs.cpSync(source,stage,{recursive:true});JSON.parse(fs.readFileSync(path.join(stage,'settings.json')));fs.renameSync(stage,destination);}
    finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true});}
    return destination;
}
module.exports={importData};
if(require.main===module){try{if(process.argv.length!==4)throw Error('Usage: node import-data.cjs /path/to/ST/data/default-user /path/to/new/pocket-tavern');console.log('Copied standard ST user files to:',importData(process.argv[2],process.argv[3]));console.log('Original files were retained. Only run one ST server against this new data folder.');}catch(error){console.error(error.message);process.exitCode=1;}}
