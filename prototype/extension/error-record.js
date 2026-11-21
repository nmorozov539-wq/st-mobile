const ACTIONS=new Set(['open-connection','view-saved-conversation','inspect-details','open-logs','retry-explicitly']);
const bounded=(value,max)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').replace(/((?:^|[\s{,])["']?(?:authorization|proxy-authorization)["']?\s*[:=]\s*["']?)(?:(?:bearer|basic)\s+)?[A-Za-z0-9._~+\/-]+/gim,'$1[redacted]').replace(/(["']?(?:x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token|password)["']?\s*[:=]\s*["']?)[^"',}\s]+/gi,'$1[redacted]').replace(/([?&](?:key|token|secret|password)=)[^&\s]+/gi,'$1[redacted]').replace(/\s+/g,' ').trim().slice(0,max);
const codeOf=value=>bounded(value?.code??value?.providerCode??'',100).toUpperCase();
const statusOf=value=>{const status=Number(value?.httpStatus??value?.status??value?.response?.status);return Number.isInteger(status)&&status>=100&&status<=599?status:null;};
const messageOf=value=>bounded(value?.message??value?.detail??value?.error?.message??value?.error??value??'The request failed.',2000);

export function classifyError(value={}){
 const code=codeOf(value),status=statusOf(value),message=messageOf(value),evidence=`${code} ${message}`.toLowerCase();
 if(status===401||/unauthori[sz]ed|invalid api key|authentication|auth[_ -]?failed/.test(evidence))return {category:'authentication',summary:'The provider did not accept the connection credentials.',source:'provider',actions:['open-connection','inspect-details']};
 if(status===403||/forbidden|permission|not allowed/.test(evidence))return {category:'permission',summary:'The provider refused this request for the current account or key.',source:'provider',actions:['open-connection','inspect-details']};
 if(status===402)return {category:'quota',summary:'The provider says payment is required for this request.',source:'provider',actions:['inspect-details','retry-explicitly']};
 if(/insufficient[_ -]?(credit|quota)|quota exceeded|billing limit|credit balance/.test(evidence))return {category:'quota',summary:'The provider reported insufficient credit or quota.',source:'provider',actions:['inspect-details','retry-explicitly']};
 if(status===429||/rate[_ -]?limit|too many requests/.test(evidence))return {category:'rate_limit',summary:'The provider is rate-limiting requests. Wait, then retry explicitly.',source:'provider',actions:['inspect-details','retry-explicitly']};
 if(/model.*(not found|missing|unavailable)|unknown model|MODEL_NOT_FOUND/.test(`${message} ${code}`))return {category:'model_missing',summary:'The selected model is unavailable. Choose another model or refresh the connection.',source:'provider',actions:['open-connection','inspect-details']};
 if(/context.*(limit|length|window)|maximum context|too many tokens|token limit/.test(evidence))return {category:'context_limit',summary:'The request is larger than the model’s context limit.',source:'provider',actions:['inspect-details']};
 if(status>=500||/overload|over capacity|service unavailable|bad gateway|PROVIDER_FAILED/.test(evidence))return {category:'provider_failure',summary:'The provider is temporarily unavailable or failed the request.',source:'provider',actions:['inspect-details','retry-explicitly']};
 if(/ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|network|dns|tls|certificate|socket/.test(`${code} ${message}`))return {category:'network',summary:'The network connection failed before the request could complete.',source:'provider',actions:['inspect-details','retry-explicitly']};
 if(code==='TIMEOUT'||/timed? out|timeout/.test(evidence))return {category:'timeout',summary:'The request timed out. Its saved state must be checked before retrying.',source:'provider',actions:['view-saved-conversation','inspect-details']};
 if(/interrupted stream|stream.*(ended|closed|interrupted)|premature close/.test(evidence))return {category:'interrupted_stream',summary:'The response stream ended unexpectedly. Any saved partial reply remains available.',source:'provider',actions:['view-saved-conversation','inspect-details']};
 if(['ENGINE_UNAVAILABLE','DISCONNECTED'].includes(code)||/engine.*(unavailable|stopped)|session expired/.test(evidence))return {category:'engine_unavailable',summary:'The local engine is unavailable. Drafts and saved chats were kept.',source:'engine',actions:['open-logs','inspect-details']};
 if(/PERSISTENCE|SAVE_|UNVERIFIED|save.*(failed|verify)|readback/.test(`${code} ${message}`))return {category:'save_failed',summary:'STM could not verify the saved result. Inspect the conversation before retrying.',source:'STM',actions:['view-saved-conversation','inspect-details','open-logs']};
 return {category:'unknown',summary:messageOf(value).slice(0,240)||'The request failed for an unknown reason.',source:'STM',actions:['inspect-details','open-logs']};
}

export function normalizeErrorRecord(value={},context={}){
 const classified=classifyError(value),detail=messageOf(value),providerCode=codeOf(value)||null,httpStatus=statusOf(value);
 const record={
  id:bounded(context.id??globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`,128),timestamp:context.timestamp??new Date().toISOString(),source:context.source??classified.source,severity:context.severity??'error',category:classified.category,
  operationId:context.operationId??null,target:context.target??null,sessionId:context.sessionId??null,
  summary:bounded(context.summary??classified.summary,240),detail,providerCode,httpStatus,
  outcome:context.outcome??'failed',actions:[...new Set(context.actions??classified.actions)].filter(action=>ACTIONS.has(action)).slice(0,5),
 };
 // Compatibility aliases are bounded and carry no additional provider content.
 record.code=providerCode??record.category.toUpperCase();record.message=record.summary;
 return record;
}

export function sanitizeNoticeText(value){return bounded(String(value??'').replace(/<[^>]*>/g,' '),1000);}
