// ST 1.19 chat completions use the global order with character_id 100001.
export function presetOrder(preset,id=100001){return preset.prompt_order?.find(g=>String(g.character_id)===String(id))?.order??[];}
export function setPromptEnabled(preset,id,identifier,enabled){
    preset.prompt_order??=[];
    let group=preset.prompt_order.find(g=>String(g.character_id)===String(id));
    if(!group){group={character_id:Number(id),order:[]};preset.prompt_order.push(group);}
    group.order??=[];
    const row=group.order.find(r=>r.identifier===identifier);
    if(row)row.enabled=!!enabled;
    else group.order.push({identifier,enabled:!!enabled});
}
