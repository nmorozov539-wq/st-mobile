// Character colour: a compact browser port of Colorizinator's accent maths
// (OKLab/OKLCH, hue-window "most saturated" pick, accent refine against the
// dark background). Reads the whole avatar, not a strip. The result is
// lightened so it reads as text on the chat background, and cached per
// avatar on this device. A colour picked by hand (saved in the card) wins;
// with neither, callers fall back to brass.
const SRGB_TO_LINEAR=new Float64Array(256);
for(let i=0;i<256;i++){const c=i/255;SRGB_TO_LINEAR[i]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
const linearToSrgb=c=>(c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055)*255;
export function rgbToOklch({r,g,b}){
    const lr=SRGB_TO_LINEAR[Math.round(r)],lg=SRGB_TO_LINEAR[Math.round(g)],lb=SRGB_TO_LINEAR[Math.round(b)];
    const l=Math.cbrt(.4122214708*lr+.5363325363*lg+.0514459929*lb),m=Math.cbrt(.2119034982*lr+.6806995451*lg+.1073969566*lb),s=Math.cbrt(.0883024619*lr+.2817188376*lg+.6299787005*lb);
    const L=.2104542553*l+.793617785*m-.0040720468*s,A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;
    return {L,C:Math.hypot(A,B),h:(Math.atan2(B,A)*180/Math.PI+360)%360};
}
function oklabToRgbRaw(L,a,b){
    const l=Math.pow(L+.3963377774*a+.2158037573*b,3),m=Math.pow(L-.1055613458*a-.0638541728*b,3),s=Math.pow(L-.0894841775*a-1.291485548*b,3);
    return [linearToSrgb(4.0767416621*l-3.3077115913*m+.2309699292*s),linearToSrgb(-1.2684380046*l+2.6097574011*m-.3413193965*s),linearToSrgb(-.0041960863*l-.7034186147*m+1.707614701*s)];
}
const inGamut=rgb=>rgb.every(v=>v>=-.5&&v<=255.5);
// Out-of-gamut colours lose chroma, never hue or lightness.
export function oklchToRgb(L,C,h){
    L=Math.max(0,Math.min(1,L));const rad=h*Math.PI/180;let raw=oklabToRgbRaw(L,C*Math.cos(rad),C*Math.sin(rad));
    if(!inGamut(raw)){let lo=0,hi=C;for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(inGamut(oklabToRgbRaw(L,mid*Math.cos(rad),mid*Math.sin(rad))))lo=mid;else hi=mid;}raw=oklabToRgbRaw(L,lo*Math.cos(rad),lo*Math.sin(rad));}
    const clip=v=>Math.max(0,Math.min(255,Math.round(v)));return {r:clip(raw[0]),g:clip(raw[1]),b:clip(raw[2])};
}
const hueDistance=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d;};
function luminance({r,g,b}){const t=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);};return .2126*t(r)+.7152*t(g)+.0722*t(b);}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export const toHex=c=>'#'+[c.r,c.g,c.b].map(v=>v.toString(16).padStart(2,'0')).join('');
export const fromHex=hex=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(hex??'').trim());if(!m)return null;const n=parseInt(m[1],16);return {r:n>>16,g:n>>8&255,b:n&255};};
export const validColour=value=>{const c=fromHex(value);return c?toHex(c):null;};

// Bucketed colour groups; each group's colour is the mean of its real pixels.
function quantize(pixels,bucket=16){
    const groups=new Map();let opaque=0;
    for(let i=0;i<pixels.length;i+=4){
        if(pixels[i+3]<128)continue;opaque++;const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
        const key=(Math.round(r/bucket)<<16)|(Math.round(g/bucket)<<8)|Math.round(b/bucket);
        const x=groups.get(key);if(x){x.count++;x.r+=r;x.g+=g;x.b+=b;}else groups.set(key,{count:1,r,g,b});
    }
    return {opaque,groups:[...groups.values()].map(x=>({r:Math.round(x.r/x.count),g:Math.round(x.g/x.count),b:Math.round(x.b/x.count),count:x.count})).sort((a,b)=>b.count-a.count||a.r-b.r||a.g-b.g||a.b-b.b)};
}
// The most saturated hue that covers a real share of the image (±20° window),
// averaged over its core, so noise and highlights never win. Colorizinator
// asks for 0.1% of a wallpaper; a portrait's colour should be one you notice,
// so a hue here needs 3% of the picture (small details like eyes don't count).
function mostSaturated(groups,opaque){
    const info=groups.map(g=>({g,...rgbToOklch(g)}));
    const chromatic=info.filter(x=>x.C>=.04&&x.L>=.12&&x.L<=.97);
    if(!chromatic.length)return null;
    const hist=new Float64Array(72);for(const x of chromatic)hist[Math.floor(x.h/5)%72]+=x.g.count;
    const windowCount=h=>{const bin=Math.floor(h/5)%72;let sum=0;for(let d=-4;d<=4;d++)sum+=hist[(bin+d+72)%72];return sum;};
    const minCount=Math.max(2,Math.ceil(opaque*.03));
    let candidates=chromatic.filter(x=>windowCount(x.h)>=minCount);if(!candidates.length)candidates=chromatic;
    let peak=candidates[0];for(const x of candidates)if(x.C>peak.C)peak=x;
    let r=0,g=0,b=0,total=0;
    for(const x of candidates)if(hueDistance(x.h,peak.h)<=20&&x.C>=.85*peak.C&&Math.abs(x.L-peak.L)<=.2){r+=x.g.r*x.g.count;g+=x.g.g*x.g.count;b+=x.g.b*x.g.count;total+=x.g.count;}
    return {r:Math.round(r/total),g:Math.round(g/total),b:Math.round(b/total)};
}
// Refine for text on the dark chat: lightness 0.68–0.84 and contrast ≥ 4.5
// against --bg; a near-grey pick borrows the image's hue at a soft chroma.
const BG={r:0x14,g:0x15,b:0x19};
export function refineForChat(colour,bg=BG){
    if(!colour)return null;let {L,C,h}=rgbToOklch(colour);
    if(C<.03)return null;
    if(C<.06)C=.09;
    L=Math.max(.68,Math.min(.84,L));let out=oklchToRgb(L,C,h);
    while(contrastRatio(bg,out)<4.5&&L<.84){L=Math.min(.84,L+.02);out=oklchToRgb(L,C,h);}
    return out;
}
/** RGBA pixel data of the whole avatar → '#rrggbb', or null for a grey image. */
export function colourFromPixels(pixels){
    const {opaque,groups}=quantize(pixels);if(!opaque)return null;
    const picked=refineForChat(mostSaturated(groups,opaque));return picked?toHex(picked):null;
}

const CACHE_KEY='pocket-tavern.char-colour.v1';
function readCache(storage){try{const v=JSON.parse(storage.getItem(CACHE_KEY));return v&&typeof v==='object'?v:{};}catch{return {};}}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Avatar did not load'));img.src=src;});}
// A small fingerprint of the picture: the cache follows the avatar, so a new
// portrait under the same file name is read again.
function fingerprint(img,document){const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,8,8);let h=2166136261;for(const v of x.getImageData(0,0,8,8).data){h^=v>>3;h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
export function createCharacterColours({storage=localStorage,document=globalThis.document,source=key=>`/thumbnail?type=avatar&file=${encodeURIComponent(key)}`}={}){
    const pending=new Map();
    async function auto(key){
        if(!key)return null;
        if(pending.has(key))return pending.get(key);
        const job=(async()=>{
            try{
                const img=await loadImage(source(key)),print=fingerprint(img,document),cache=readCache(storage);
                if(cache[key]?.print===print)return cache[key].colour;
                const scale=Math.min(1,96/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
                const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,w,h);
                const colour=colourFromPixels(context.getImageData(0,0,w,h).data);
                cache[key]={print,colour};try{storage.setItem(CACHE_KEY,JSON.stringify(cache));}catch{}
                return colour;
            }catch{return null;}finally{pending.delete(key);}
        })();
        pending.set(key,job);return job;
    }
    /** Hand-picked colour if valid, else the avatar's, else null (use brass). */
    async function resolve(character){return validColour(character?.color)??await auto(character?.key);}
    return {resolve,auto,forget(key){const cache=readCache(storage);delete cache[key];try{storage.setItem(CACHE_KEY,JSON.stringify(cache));}catch{}}};
}
