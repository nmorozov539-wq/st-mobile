// Read native links without selecting a character/persona or changing settings.
export function characterAssociations({key,card,power={},worldInfo={},worldNames=[],fileName}) {
    if(!key||!fileName)throw Error('Character association target is unavailable.');
    const personas=[];
    for(const [id,descriptor] of Object.entries(power.persona_descriptions??{})){
        const connections=descriptor?.connections;
        if(connections!==undefined&&!Array.isArray(connections))throw Error('Native persona connections could not be read. Manage them in SillyTavern.');
        if(connections?.some(connection=>connection?.type==='character'&&connection.id===key))personas.push({key:id,name:power.personas?.[id]||id,available:Object.hasOwn(power.personas??{},id)});
    }
    const rows=worldInfo.charLore??[];
    if(!Array.isArray(rows))throw Error('Native additional lorebook links could not be read.');
    const additional=[];
    for(const row of rows.filter(row=>row?.name===fileName)){
        if(!Array.isArray(row.extraBooks??[]))throw Error('Native additional lorebook links could not be read.');
        for(const name of row.extraBooks??[]){if(typeof name!=='string')throw Error('Native lorebook name could not be read.');additional.push({name,available:worldNames.includes(name)});}
    }
    const name=card.extensions?.world??'';
    if(typeof name!=='string')throw Error('Native primary lorebook link could not be read.');
    return {personas,primary:name?{name,available:worldNames.includes(name)}:null,additional,embedded:!!card.character_book};
}

export function associationRevision(power,worldInfo) {
    return JSON.stringify({personas:power.personas??{},descriptors:power.persona_descriptions??{},charLore:worldInfo.charLore??[]});
}
export function removeCharacterPersona(power,key,personaKey) {
    const next=structuredClone(power.persona_descriptions?.[personaKey]);
    if(!next||!Array.isArray(next.connections))throw Error('The persona link is unavailable. Reopen the character.');
    if(!next.connections.some(c=>c?.type==='character'&&c.id===key))throw Error('The persona link changed. Reopen the character.');
    next.connections=next.connections.filter(c=>!(c?.type==='character'&&c.id===key));
    return next;
}
export function changeAdditionalBooks(worldInfo,fileName,{operation,name,index}) {
    const rows=structuredClone(worldInfo.charLore??[]),matches=rows.map((row,i)=>({row,i})).filter(({row})=>row.name===fileName);
    if(matches.length>1)throw Error('Multiple native lorebook records need review in ST before changing them.');
    const found=matches[0],current=found?.row.extraBooks??[];
    if(!Array.isArray(current))throw Error('Native lorebook links could not be read.');
    if(operation==='connect'){if(current.includes(name))throw Error('This additional lorebook is already linked.');current.push(name);}
    else if(operation==='detach'){if(!Number.isInteger(index)||current[index]!==name)throw Error('The lorebook link changed. Reopen the character.');current.splice(index,1);}
    else throw Error('Unknown lorebook operation.');
    // Retain opaque per-character row fields, even after the last link is removed.
    if(found)rows[found.i]={...found.row,extraBooks:current};else rows.push({name:fileName,extraBooks:current});
    return rows;
}
