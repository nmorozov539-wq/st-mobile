const key='pocket-tavern.pending-changes.v1';
export const revision=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
export function createJournal(storage){
    const read=()=>{try{return JSON.parse(storage.getItem(key))??[];}catch{return [];}};
    const write=items=>storage.setItem(key,JSON.stringify(items));
    return {read,add(item){const items=read();const index=item.coalesce?items.findIndex(x=>x.coalesce===item.coalesce&&x.state==='pending'):-1;const record={id:crypto.randomUUID(),state:'pending',...item};if(index>=0){record.argument.expected=items[index].argument.expected;if(record.argument.kind==='generation')record.argument.value={...items[index].argument.value,...record.argument.value};if(items[index].argument.before)record.argument.before=items[index].argument.before;items[index]=record;}else items.push(record);write(items);return record;},patch(id,changes){write(read().map(x=>x.id===id?{...x,...changes}:x));},remove(id){write(read().filter(x=>x.id!==id));},clear(){write([]);}};
}
export function renderRange(count,top,height,heights,estimate=180,buffer=6){
    let offset=0,start=0;while(start<count&&offset+(heights[start]??estimate)<top){offset+=heights[start]??estimate;start++;}
    let end=start,span=offset;while(end<count&&span<top+height){span+=heights[end]??estimate;end++;}
    start=Math.max(0,start-buffer);end=Math.min(count,end+buffer);
    const sum=(a,b)=>{let result=0;for(let i=a;i<b;i++)result+=heights[i]??estimate;return result;};
    return {start,end,before:sum(0,start),after:sum(end,count)};
}
