export function createMemoryPanel({rpc,action,connected,onBusy,onState=()=>{},refresh,locked}) {
 const $=id=>document.getElementById(id);let current,loaded=false,wasBusy=false;
 const request=arg=>rpc('extensions',{id:'summaryception',...arg},180000);
 function render(value,edit=false){
  current=value;onState(value);
  $('memory-state').textContent=value.needsRebuild?'Memory needs rebuilding after history changes':value.failure || (value.busy?'Summaryception is working…':`Summaryception ${value.version} · ${value.settings.connectionSource} connection`);
  $('memory-preview').textContent=(value.memory.layers??[]).map((layer,i)=>`Layer ${i}\n${layer.map(s=>s.text).join('\n')}`).join('\n\n')||'No summaries in this conversation yet.';
  $('memory-backlog').hidden=!value.backlog;
  $('memory-backlog-text').textContent=value.backlog?`${value.backlog.turns} older turns need summarizing, about ${value.backlog.calls} API calls. Choose how to proceed or stop.`:'';
  $('memory-badge').textContent=value.backlog?'Memory · choice needed':value.busy?'Memory · working':'Memory';
  $('memory-stop').disabled=!value.busy;
  for(const n of $('memory-options').querySelectorAll('input,select,textarea,button'))n.disabled=value.busy||locked();
  if(edit){
   for(const name of ['enabled','pauseSummarization'])$('memory-'+name).checked=!!value.settings[name];
   for(const name of ['verbatimTurns','turnsPerSummary','snippetsPerLayer','snippetsPerPromotion','summarizerResponseLength','promptPreset','summarizerUserPrompt'])$('memory-'+name).value=value.settings[name]??'';
  }
 }
 async function poll(){if(!connected())return;try{const value=await request({action:'read'});onBusy(value.busy);render(value);if(wasBusy&&!value.busy)await refresh();wasBusy=value.busy;}catch{onBusy(false);}}
 $('memory-badge').onclick=async()=>{try{render(await request({action:'read'}),true);loaded=true;$('memory-panel').showModal();}catch(e){$('status').textContent=e.message;}};
 $('close-memory').onclick=()=>$('memory-panel').close();
 $('memory-save').onclick=()=>action(async()=>{
  const value={};for(const name of ['enabled','pauseSummarization'])value[name]=$('memory-'+name).checked;
  for(const name of ['verbatimTurns','turnsPerSummary','snippetsPerLayer','snippetsPerPromotion','summarizerResponseLength'])value[name]=Number($('memory-'+name).value);
  for(const name of ['promptPreset','summarizerUserPrompt'])value[name]=$('memory-'+name).value;
  try{render(await request({action:'settings',value}),true);$('memory-state').textContent='Memory settings saved in ST.';}catch(e){$('memory-state').textContent=e.message;throw e;}
 });
 $('memory-summarize').onclick=()=>action(async()=>{try{render(await request({action:'summarize'}));await refresh();}catch(e){$('memory-state').textContent=e.message;throw e;}});
 $('memory-stop').onclick=async()=>{try{render(await request({action:'stop'}));}catch(e){$('memory-state').textContent=e.message;}};
 for(const [id,value] of [['memory-all','catchup'],['memory-one','partial'],['memory-skip','skip']])$(id).onclick=async()=>{try{render(await request({action:'choice',value}));}catch(e){$('memory-state').textContent=e.message;}};
 setInterval(poll,2000);
 return {setLocked(value){for(const n of $('memory-options').querySelectorAll('input,select,textarea,button'))n.disabled=value||current?.busy;},setAvailable(value){$('memory-badge').disabled=!value;},loaded:()=>loaded};
}
