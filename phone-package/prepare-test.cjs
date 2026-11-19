#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {patchEngine}=require('./compatibility.cjs');
function prepare(source, target, bundle = __dirname, options = {}) {
    source = fs.realpathSync(source);
    target = path.resolve(target);
    // Resolve existing parents too, so a symlink cannot put the copy inside ST.
    let existing = target;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    target = path.join(fs.realpathSync(existing), path.relative(existing, target));
    if (JSON.parse(fs.readFileSync(path.join(source, 'package.json'))).version !== '1.19.0') throw Error('This package requires ST 1.19.0. Your installation was not changed.');
    if (fs.existsSync(target)) throw Error(`Test folder already exists: ${target}. Use start-test.cjs to reopen it; preparation never overwrites it.`);
    for (const name of ['public','src','default','node_modules','server.js','package.json','default/config.yaml','default/content/settings.json']) {
        if (!fs.existsSync(path.join(source,name))) throw Error(`Missing ST component: ${name}. Use the ST folder containing server.js and installed dependencies.`);
    }
    if (target === source || target.startsWith(source + path.sep)) throw Error('The test folder must be outside your regular ST installation.');
    fs.mkdirSync(target,{recursive:true});
    try {
        for (const name of ['public','src','default']) fs.cpSync(path.join(source,name),path.join(target,name),{recursive:true});
        for (const name of ['package.json','server.js','webpack.config.js']) if(fs.existsSync(path.join(source,name))) fs.copyFileSync(path.join(source,name),path.join(target,name));
        if (options.copyDependencies) fs.cpSync(path.join(source,'node_modules'),path.join(target,'node_modules'),{recursive:true,dereference:true});
        else fs.symlinkSync(path.join(source,'node_modules'),path.join(target,'node_modules'),'dir');
        fs.copyFileSync(path.join(source,'default/config.yaml'),path.join(target,'config.yaml'));
        const settingsPath = path.join(target,'default/content/settings.json');
        const settings = JSON.parse(fs.readFileSync(settingsPath));
        Object.assign(settings,{firstRun:false,username:'Tester',main_api:'openai'});
        settings.oai_settings ??= {};
        Object.assign(settings.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:8124/v1',custom_model:'st-mobile-mock',stream_openai:true,function_calling:false,openai_max_context:32000,openai_max_tokens:1024});
        if (options.combined && !options.mock) Object.assign(settings.oai_settings, {chat_completion_source:'openrouter', custom_url:'', custom_model:'', show_thoughts:true});
        if (options.combined) settings.username='You';
        settings.extension_settings ??= {};settings.extension_settings.summaryception={enabled:false};
        settings.power_user ??= {};
        Object.assign(settings.power_user,{auto_connect:!options.combined || !!options.mock,auto_swipe:false});
        settings.power_user.auto_continue ??= {};settings.power_user.auto_continue.enabled=false;
        fs.writeFileSync(settingsPath,JSON.stringify(settings,null,2));
        const thirdParty = path.join(target,'public/scripts/extensions/third-party');
        const extension = path.join(thirdParty,'st-mobile-experiment');
        const frontend = path.join(target,'public/st-mobile');
        // Existing frontend/bridge files are code copied from ST, never user data.
        // Replace this package's paths so an older bridge cannot leave stale files.
        fs.rmSync(thirdParty,{recursive:true,force:true});fs.rmSync(frontend,{recursive:true,force:true});
        fs.cpSync(path.join(bundle,'extension'),extension,{recursive:true});
        if(fs.existsSync(path.join(bundle,'summaryception')))fs.cpSync(path.join(bundle,'summaryception'),path.join(thirdParty,'Extension-Summaryception'),{recursive:true});
        fs.cpSync(path.join(bundle,'frontend'),frontend,{recursive:true});
        fs.copyFileSync(path.join(bundle,'mock-model.mjs'),path.join(target,'mock-model.mjs'));
        patchEngine(target,source);
        if(options.combined){
            for(const name of ['public/scripts/tokenizers.js','src/server-main.js','src/fetch-patch.js','public/script.js']){
                const saved=path.join(target,'.pocket-base',name); fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(path.join(source,name),saved);
            }
            for(const name of ['start.cjs','log-supervisor.cjs','diagnostics-server.cjs','diagnostics-viewer.cjs','update-core.cjs','compatibility.cjs','package-staging.cjs'])fs.copyFileSync(path.join(bundle,name),path.join(target,name));
        }
        fs.writeFileSync(path.join(target,options.combined ? '.pocket-tavern.json' : '.pocket-tavern-test.json'),JSON.stringify({version:1,source,created:new Date().toISOString(),dataRoot:'data',mode:options.combined?'combined':'test',mock:!!options.mock,dependencies:options.copyDependencies?'copied':'shared'}));
    } catch (error) { throw Error(`${error.message}\nAn incomplete NEW test folder may remain at ${target}; your regular ST was not modified.`); }
    return target;
}
module.exports = {prepare};
if (require.main === module) {
    try {
        const source = process.argv[2] || path.join(os.homedir(),'SillyTavern');
        const target = process.argv[3] || path.join(os.homedir(),'pocket-tavern-phone-test');
        console.log('Preparing an isolated test tavern. This may take a minute…');
        console.log('Ready:',prepare(source,target));
        console.log('Next: node start-test.cjs');
    } catch(error) { console.error(error.message);process.exitCode=1; }
}
