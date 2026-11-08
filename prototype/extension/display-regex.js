// Display regex ("Alter chat display" scripts) for the phone's own renderer.
// Mirrors ST 1.19's getScriptsByType/runRegexScript inputs: global scripts,
// the character's scoped scripts (when allowed), and the chat preset's
// scripts (when allowed). Only markdown-only scripts are display scripts;
// the rest already ran on the saved message or the prompt inside ST.
// Macros are resolved here, where ST's substituteParams lives; the phone
// applies the compiled list per message (with depth) before sanitizing.
const ESCAPE=/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gs;
const escapeMacro=x=>typeof x==='string'?x.replaceAll(ESCAPE,s=>({'\n':'\\n','\r':'\\r','\t':'\\t','\v':'\\v','\f':'\\f','\0':'\\0'})[s]??'\\'+s):x;
export function collectDisplayScripts(ctx,{characterKey=null,preset=null,presetApi='openai'}={}){
    const settings=ctx.extensionSettings??{};
    if(settings.disabledExtensions?.includes('regex'))return {enabled:false,scripts:[]};
    const character=ctx.characters?.find(c=>c.avatar===characterKey)??null;
    const sources=[['global',settings.regex]];
    if(character&&settings.character_allowed_regex?.includes(character.avatar))sources.push(['character',character.data?.extensions?.regex_scripts]);
    if(preset&&settings.preset_allowed_regex?.[presetApi]?.includes(preset)){
        let scripts=null;try{scripts=ctx.getPresetManager?.(presetApi)?.getCompletionPresetByName(preset)?.extensions?.regex_scripts;}catch{}
        sources.push(['preset',scripts]);
    }
    const options={name2Override:character?.name};
    const sub=(text,post)=>{try{return ctx.substituteParams(text,post?{...options,postProcessFn:post}:options);}catch{return text;}};
    const scripts=[];
    for(const [scope,list] of sources){
        if(!Array.isArray(list))continue;
        for(const s of list){
            if(!s||s.disabled||!s.markdownOnly||!s.findRegex||!Array.isArray(s.placement))continue;
            const mode=Number(s.substituteRegex);
            const find=mode===1?sub(s.findRegex):mode===2?sub(s.findRegex,escapeMacro):s.findRegex;
            scripts.push({name:String(s.scriptName??''),scope,find,replace:sub(String(s.replaceString??'').replace(/{{match}}/gi,'$0'))||'',
                trim:(Array.isArray(s.trimStrings)?s.trimStrings:[]).map(t=>sub(String(t))).filter(Boolean),placement:s.placement.map(Number),
                minDepth:Number.isInteger(s.minDepth)?s.minDepth:null,maxDepth:Number.isInteger(s.maxDepth)?s.maxDepth:null});
        }
    }
    return {enabled:true,scripts};
}
