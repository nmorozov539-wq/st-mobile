#!/usr/bin/env node
const path=require('node:path');
const os=require('node:os');
const {prepare}=require('./prepare-test.cjs');
const argumentsList=process.argv.slice(2);
const mock=argumentsList.includes('--mock');
const paths=argumentsList.filter(argument=>argument!=='--mock');
try {
    const source=paths[0]||path.join(os.homedir(),'SillyTavern');
    const target=paths[1]||path.join(os.homedir(),'pocket-tavern');
    console.log('Preparing a combined tavern with fresh standard ST data and its own dependencies…');
    prepare(source,target,__dirname,{combined:true,copyDependencies:true,mock});
    console.log('Ready. Start with:');
    console.log(`cd ${JSON.stringify(path.resolve(target))}`);
    console.log(`node start.cjs${mock?' --mock':''}`);
    console.log('Your usual ST and its data were not changed.');
} catch(error){console.error(error.message);process.exitCode=1;}
