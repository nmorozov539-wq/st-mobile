// ST 1.19.0 supplies a list of masked secret metadata, not a readiness boolean.
// Inspect only activation metadata; never return or inspect the secret value.
export function hasActiveSecret(entries) {
    return Array.isArray(entries) && entries.some(entry => entry?.active === true);
}
