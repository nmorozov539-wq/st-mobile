const key='stm.pending-changes.v1';
export const revision=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
export function createJournal(storage){
    const read=()=>{try{return JSON.parse(storage.getItem(key))??[];}catch{return [];}};
    const write=items=>storage.setItem(key,JSON.stringify(items));
    return {read,adopt(sessionId){write(adoptLeftovers(read(),sessionId));},add(item){const items=read();const index=item.coalesce?items.findIndex(x=>x.coalesce===item.coalesce&&x.state==='pending'):-1;const record={id:crypto.randomUUID(),state:'pending',...item};if(index>=0){record.argument.expected=items[index].argument.expected;if(record.argument.kind==='generation')record.argument.value={...items[index].argument.value,...record.argument.value};if(items[index].argument.before)record.argument.before=items[index].argument.before;items[index]=record;}else items.push(record);write(items);return record;},patch(id,changes){write(read().map(x=>x.id===id?{...x,...changes}:x));},remove(id){write(read().filter(x=>x.id!==id));},clear(){write([]);}};
}
// A change the engine never confirmed waits for Retry or Discard; any other failure
// is reported once and dropped, so one bad change never blocks the rest.
export const INTERRUPTED_CODES=['TIMEOUT','DISCONNECTED','ENGINE_UNAVAILABLE'];
export function failureOutcome(code){if(code==='BUSY')return 'wait';return INTERRUPTED_CODES.includes(code)?'interrupted':'failed';}
// Changes left by an earlier session, including 0.8.0's review queue, were
// never confirmed. Nothing is applied or dropped automatically: they wait for the person.
export const LEFTOVER_ERROR='it was not confirmed before the engine restarted.';
export function adoptLeftovers(items,sessionId){return items.map(item=>item.state==='pending'&&item.sessionId===sessionId?item:{...item,state:'interrupted',error:LEFTOVER_ERROR});}
export function renderRange(count,top,height,heights,estimate=180,buffer=6){
    let offset=0,start=0;while(start<count&&offset+(heights[start]??estimate)<top){offset+=heights[start]??estimate;start++;}
    let end=start,span=offset;while(end<count&&span<top+height){span+=heights[end]??estimate;end++;}
    start=Math.max(0,start-buffer);end=Math.min(count,end+buffer);
    const sum=(a,b)=>{let result=0;for(let i=a;i<b;i++)result+=heights[i]??estimate;return result;};
    return {start,end,before:sum(0,start),after:sum(end,count)};
}
