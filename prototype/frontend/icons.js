// A small local SVG set; no icon font/network or full reference-viewer bundle.
const paths={
    right:'<path d="m9 6 6 6-6 6"/>',back:'<path d="m15 18-6-6 6-6"/>',down:'<path d="m6 9 6 6 6-6"/>',up:'<path d="m6 15 6-6 6 6"/>',
    send:'<path d="M12 19V5m-7 7 7-7 7 7"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
    gear:'<path d="m9 3-.6 2.5-2.2 1.3L3.8 6l-2 3.5 1.8 1.8v2L1.8 15l2 3.5 2.4-.8L8.4 19 9 21h6l.6-2.5 2.2-1.3 2.4.8 2-3.5-1.8-1.8v-2L22.2 9l-2-3.5-2.4.8-2.2-1.3L15 3Z"/><circle cx="12" cy="12" r="3"/>',
    preset:'<path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m4 0v6M6 15v6"/>',
    persona:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
    memory:'<path d="M12 5a3 3 0 0 0-6-1 4 4 0 0 0-3 6 4 4 0 0 0 1 7 4 4 0 0 0 8 2m0-14a3 3 0 0 1 6-1 4 4 0 0 1 3 6 4 4 0 0 1-1 7 4 4 0 0 1-8 2V5M6 8l2 2m-1 6 2-2m9-6-2 2m1 6-2-2"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit:'<path d="m16 3 5 5L8 21H3v-5Zm-2 2 5 5"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    fork:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m0-3c0-5 12-2 12-7"/>',
    delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    reply:'<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3"/>',
    select:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
    timer:'<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 4V2m0 12 3-3m3-5 2-2"/>',
    model:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
};
export function icon(name,document=globalThis.document) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');svg.innerHTML=paths[name]??paths.model;return svg;
}
