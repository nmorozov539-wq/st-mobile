// Additive preset memory. Arrays allow arbitrary native preset names safely.
const clone = value => structuredClone(value);
export function rememberPreset(copy) {
    copy.presetBank ??= [];
    const saved = copy.presetBank.find(item => item.preset === copy.preset);
    if (saved) saved.generation = clone(copy.generation);
    else copy.presetBank.push({preset:copy.preset,generation:clone(copy.generation)});
    return copy;
}
export function selectPreset(copy, name, nativeGeneration) {
    if (copy.preset === name) return copy;
    rememberPreset(copy);
    const saved = copy.presetBank.find(item => item.preset === name);
    copy.preset = name;
    copy.generation = clone(saved?.generation ?? nativeGeneration);
    return copy;
}
export function changePresetGeneration(copy, changes, expectedPreset) {
    if (expectedPreset !== undefined && expectedPreset !== copy.preset)
        throw Object.assign(Error('The selected preset changed. Reopen the preset editor before saving.'),{code:'CONFLICT'});
    Object.assign(copy.generation,clone(changes));
    return rememberPreset(copy);
}
export function resetPresetToGlobal(copy, global) {
    rememberPreset(copy);
    copy.preset = global.preset;
    copy.generation = clone(global.generation);
    return rememberPreset(copy);
}
