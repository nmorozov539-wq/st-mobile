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
