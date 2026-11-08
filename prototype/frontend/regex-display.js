// Applies display regex scripts collected by the engine (see the bridge's
// display-regex.js) the way ST 1.19's runRegexScript does: same flag parsing,
// $n / $<name> groups with trim strings, and min/max depth counted over
// non-system messages. Runs before Markdown and the sanitizer.
export const PLACEMENT={USER_INPUT:1,AI_OUTPUT:2,SLASH_COMMAND:3,REASONING:6};
export function regexFromString(input){
    try{const m=input.match(/(\/?)(.+)\1([a-z]*)/i);if(m[3]&&!/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(m[3]))return RegExp(input);return new RegExp(m[2],m[3]);}
    catch{return null;}
}
export function compileDisplay(scripts){
    return (Array.isArray(scripts)?scripts:[]).map(s=>({...s,regex:regexFromString(String(s.find??''))})).filter(s=>s.regex);
}
function run(script,text){
    return text.replace(script.regex,function(match){
        const args=[...arguments];
        return script.replace.replaceAll(/\$(\d+)|\$<([^>]+)>/g,(_,num,name)=>{
            if(num)match=args[Number(num)];else if(name){const groups=args.at(-1);match=groups&&typeof groups==='object'&&groups[name];}
            if(!match)return '';
            return script.trim.reduce((value,trim)=>value.replaceAll(trim,''),match);
        });
    });
}
export function applyDisplay(compiled,text,{placement,depth}={}){
    let out=String(text??'');if(!out||!compiled?.length||placement===undefined)return out;
    for(const s of compiled){
        if(typeof depth==='number'){if(s.minDepth!==null&&s.minDepth>=-1&&depth<s.minDepth)continue;if(s.maxDepth!==null&&s.maxDepth>=0&&depth>s.maxDepth)continue;}
        if(s.placement.includes(placement))out=run(s,out);
    }
    return out;
}
/** ST's depth for message `index`: its position from the end among non-system messages. */
export function messageDepth(messages,index){
    let usable=0,position=-1;
    for(let i=0;i<messages.length;i++)if(!messages[i]?.is_system){if(i===index)position=usable;usable++;}
    return position<0?undefined:usable-position-1;
}
export function placementFor(message){return message?.is_user?PLACEMENT.USER_INPUT:message?.extra?.type==='narrator'?PLACEMENT.SLASH_COMMAND:PLACEMENT.AI_OUTPUT;}
