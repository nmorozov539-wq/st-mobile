// A tiny quiet request through ST, with no chat history and no saved messages.
export async function testConnection({settings,request,timeout=20000}) {
 const original=settings.openai_max_tokens, originalN=settings.n, hadN=Object.hasOwn(settings,'n'), controller=new AbortController();
 let timer;
 try{
  settings.openai_max_tokens=16;settings.n=1;
  const data=await Promise.race([
   request('quiet',[{role:'user',content:'Reply with OK.'}],controller.signal),
   new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Test message timed out. The provider may still have processed the request; it will not be retried automatically.'));},timeout);}),
  ]);
  const content=data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
  const text=typeof content==='string'?content: Array.isArray(content)?content.map(part=>part.text??'').join(''):'';
  if(!data?.choices?.length)throw Error('The API returned no completion. Check the selected model and connection settings.');
  return {reply:text.trim()?text.slice(0,1000):'API accepted the request; this model produced no visible text within the 16-token test budget.',model:data.model??settings.custom_model??settings.openrouter_model};
 }finally{clearTimeout(timer);settings.openai_max_tokens=original;if(hadN)settings.n=originalN;else delete settings.n;}
}
