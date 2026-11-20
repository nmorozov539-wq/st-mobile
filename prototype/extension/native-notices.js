import {normalizeErrorRecord,sanitizeNoticeText} from './error-record.js?build=0.9.1';

const WRAPPER=Symbol.for('pocket-tavern.native-notice-wrapper');
export function installNativeNoticeBridge({toast=globalThis.toastr,emit,context=()=>({})}={}){
 if(!toast||typeof emit!=='function')return()=>{};
 toast[WRAPPER]?.();
 const originals=new Map(),methods=['error','warning'];let active=true;
 for(const method of methods){
  if(typeof toast[method]!=='function')continue;const original=toast[method];originals.set(method,original);
  toast[method]=function(message,title,...rest){
   const result=original.apply(this,[message,title,...rest]);
   if(active)try{const current=context()??{},detail=[sanitizeNoticeText(title),sanitizeNoticeText(message)].filter(Boolean).join(': ');emit({type:'error.record',record:normalizeErrorRecord({message:detail||'SillyTavern notice'},{...current,source:'ST',severity:method==='warning'?'warning':'error',outcome:current.outcome??'failed'})});}catch{}
   return result;
  };
 }
 const teardown=()=>{if(!active)return;active=false;for(const [method,original]of originals)if(toast[method]!==original)toast[method]=original;if(toast[WRAPPER]===teardown)delete toast[WRAPPER];};
 toast[WRAPPER]=teardown;return teardown;
}
