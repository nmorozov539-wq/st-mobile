
import {DOMPurify,showdown} from '/lib.js';
import {createHTMLFormatter} from './html-format.js?build=0.5.4';
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
 document.querySelector('#result').textContent=`PASS: ${passed} HTML renderer checks`;
}catch(error){document.querySelector('#result').textContent='FAIL: '+error.message;throw error;}
