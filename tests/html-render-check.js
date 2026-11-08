
import {DOMPurify,showdown} from '/lib.js';
import {createHTMLFormatter} from './html-format.js?build=0.8.0-phase2';
const format=createHTMLFormatter({converter:new showdown.Converter({tables:true,strikethrough:true,simpleLineBreaks:true}),sanitize:(html,options)=>DOMPurify.sanitize(html,options),document});
let passed=0;
const assert=(condition,label)=>{if(!condition)throw Error(label);passed++;};
const render=text=>{const div=document.createElement('div');div.innerHTML=format(text);return div;};
try{
 const sample=render('<font color="#FFB6C1">"Did you two have a really deep conversation?"</font>\n\n---\n\n<details>\n<summary>Inner Chatter</summary>\nbla bla test here that should be a collapsible block\n</details>');
 assert(sample.querySelector('font').getAttribute('color')==='#FFB6C1','font color');
 assert(sample.querySelector('font .dialogue').textContent.startsWith('"Did'),'dialogue text retained');
 assert(sample.querySelector('details summary').textContent==='Inner Chatter','summary label');
 assert(sample.querySelector('details').textContent.includes('bla bla test'),'details body');
 assert(!sample.querySelector('details').open,'collapsed by default');
 assert(!!sample.querySelector('hr'),'markdown separator');
 const unsafe=render('<script>alert(1)</script><img src="https://example.com/track" onerror="alert(1)"><iframe src="https://example.com"></iframe><form><input></form><span style="position:fixed" onclick="alert(1)">Text</span><a href="javascript:alert(1)">x</a>');
 assert(!unsafe.querySelector('script,img,iframe,form,input,[style],[onclick],[onerror],a[href]'),'active content excluded');
 const code=render('```html\n<details><summary>literal</summary></details>\n```');
 assert(!code.querySelector('details')&&code.querySelector('code').textContent.includes('<details>'),'code is literal');
 const link=render('[valid](https://example.com) [bad](javascript:alert)');
 assert(link.querySelector('a[href]').rel==='noopener noreferrer'&&link.querySelectorAll('a[href]').length===1,'safe links');
 assert(render('<details open><summary>Outer</summary><details><summary>Inner</summary>Nested</details></details>').querySelectorAll('details').length===2,'nested details');
 assert(render('<details><summary>Arriving</summary>Partial').querySelector('details').textContent.includes('Partial'),'unfinished stream');
 const styled=render('<div class="letter" style="background:#f3ead8;color:#2b2118;position:fixed;background-image:url(https://example.com/x.png)">Note</div><style>@import url(https://example.com/a.css);body{color:red}.letter{border:1px solid red}</style>');
 const letter=styled.querySelector('div[style]');
 assert(letter&&letter.style.color&&!letter.style.position&&!letter.getAttribute('style').includes('url('),'style attribute filtered, colours kept');
 assert(letter.className==='rx-c-letter','message classes renamed');
 const css=styled.querySelector('style')?.textContent??'';
 assert(/^\.rx-\d+\{color:\s*red\}\.rx-\d+ \.rx-c-letter\{/.test(css)&&!css.includes('@import'),'style block scoped to its message');
 const ooc=render('*waves* "Hi."\nOOC: brb ((coffee))');
 assert(ooc.querySelector('.ooc-line')?.textContent.includes('OOC: brb')&&!ooc.querySelector('.ooc-line .dialogue'),'OOC line dimmed, not speech');
 assert(render('"Fine." ((brb))').querySelector('span.ooc').textContent==='((brb))','double parentheses dimmed');
 assert(!render('<img src="https://example.com/t.png"><img src="/characters/a.png">').querySelector('img[src^="https"]'),'remote images blocked');
 document.querySelector('#result').textContent=`PASS: ${passed} HTML renderer checks`;
}catch(error){document.querySelector('#result').textContent='FAIL: '+error.message;throw error;}
