// Persona selection must not submit ST's character editor through a hidden UI.
// ST regenerates an untouched greeting via that editor; preserve the greeting instead.
export async function selectPersonaWithoutCardEdit(getContext, setAvatar, value) {
    const ctx=getContext(), metadata=ctx.chatMetadata;
    const hadTaint=Object.hasOwn(metadata,'tainted'), taint=metadata.tainted;
    metadata.tainted=true;
    try { await setAvatar(value,{toastPersonaNameChange:false}); }
    finally { if(hadTaint)metadata.tainted=taint;else delete metadata.tainted; }
    await getContext().saveChat();
}
