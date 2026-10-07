// An explicit paid alternative must not depend on native swipe animations,
// offscreen DOM visibility, or the user's overswipe/loop preference.
export async function generateAlternative(ctx, syncCurrent) {
    const index=ctx.chat.length-1, message=ctx.chat[index];
    if(!message || message.is_user || message.is_system || index<1)throw Object.assign(Error('The last message must be an assistant reply to generate an alternative.'),{code:'INVALID_SWIPE'});
    const original=structuredClone(message);
    message.swipe_id??=0;message.swipes??=[message.mes];message.swipe_info??=[];
    message.swipe_info[message.swipe_id]??={send_date:message.send_date,gen_started:message.gen_started,gen_finished:message.gen_finished,extra:structuredClone(message.extra??{})};
    syncCurrent(index);
    const next=message.swipes.length;
    message.swipe_id=next;
    try {await ctx.generate('swipe');}
    finally {
        // Failure/early Stop before any new text keeps the original selection.
        // A real partial alternative is retained and verified like an ordinary reply.
        if(typeof message.swipes[next]!=='string' || !message.swipes[next].trim()){
            ctx.chat[index]=original;ctx.updateMessageBlock(index,original);
        }
        await ctx.saveChat();
    }
}
