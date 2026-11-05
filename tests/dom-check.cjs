const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main(){
const projectRoot=path.basename(__dirname)==='tests'?path.resolve(__dirname,'..'):path.resolve(__dirname,'..','outputs');
class FakeClassList {
  constructor(el) { this.el = el; }
  values() { return new Set(String(this.el.className || '').split(/\s+/).filter(Boolean)); }
  contains(name) { return this.values().has(name); }
  add(name) { const s=this.values();s.add(name);this.el.className=[...s].join(' '); }
  remove(name) { const s=this.values();s.delete(name);this.el.className=[...s].join(' '); }
  toggle(name,force) { const has=this.contains(name),next=force===undefined?!has:Boolean(force);next?this.add(name):this.remove(name);return next; }
}
class FakeElement {
  constructor(tag='div',id='') { this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.attrs={};this.value='';this.placeholder='';this.textContent='';this._html='';this.children=[];this.listeners={};this.className='';this.classList=new FakeClassList(this);this.hidden=false;this.files=[];this.open=false;this.download='';this.href='';this.style={}; }
  set innerHTML(value) { this._html=String(value);this.textContent='';this.children=[];if(this.id==='spread'){for(const match of this._html.matchAll(/data-card-index="(\d+)"/g)){const b=new FakeElement('button');b.dataset.cardIndex=match[1];this.children.push(b);}} }
  get innerHTML(){return this._html;}
  get innerText(){return [this.textContent,...this.children.map(x=>x.innerText)].filter(Boolean).join('\n');}
  set innerText(value){this.textContent=String(value);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this.textContent='';this._html='';}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async fire(type,extra={}){const event={target:this,currentTarget:this,preventDefault(){},...extra};for(const fn of this.listeners[type]||[])await fn(event);}
  async click(){await this.fire('click');}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  focus(){}
  select(){}
  scrollIntoView(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
  remove(){this.removed=true;}
  querySelectorAll(selector){
    if(this.id==='spread'&&selector==='[data-card-index]')return this.children;
    const all=[];const visit=node=>{for(const child of node.children){all.push(child);visit(child);}};visit(this);
    if(selector==='button')return all.filter(x=>x.tagName==='BUTTON');
    if(selector==='.lib-favorite')return all.filter(x=>x.className==='lib-favorite');
    if(selector==='.library-open')return all.filter(x=>x.className==='library-open');
    return [];
  }
}

const html=fs.readFileSync(path.join(projectRoot,'index.html'),'utf8');
const appSource=fs.readFileSync(path.join(projectRoot,'app.js'),'utf8');
const idsInHtml=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(idsInHtml).size,idsInHtml.length,'HTML ids should be unique');
const untranslated=[...new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]))].filter(key=>!appSource.includes(`${key}:`));
assert.deepEqual(untranslated,[],'all static translation keys should exist');
const css=fs.readFileSync(path.join(projectRoot,'styles.css'),'utf8');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces should balance');
assert.match(css,/html\[lang="vi"\][^{]*\{[^}]*Georgia[^}]*Segoe UI/s,'Vietnamese uses a local font stack with diacritic support');
const elements=new Map();
const el=(id,tag='div')=>{if(!elements.has(id))elements.set(id,new FakeElement(tag,id));return elements.get(id);};
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);ids.forEach(id=>el(id));
for(const [id,value] of Object.entries({spreadType:'three',spreadVariant:'timeline',topic:'general',arcanaFilter:'all',suitFilter:'all'}))el(id).value=value;
const dataI18n=[];
for(const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
  const tag=m[1],attrs=m[2];
  const id=attrs.match(/\bid="([^"]+)"/)?.[1];
  if(attrs.includes('data-i18n=')){const node=new FakeElement(tag,id||'');node.dataset.i18n=attrs.match(/data-i18n="([^"]+)"/)?.[1]||'';dataI18n.push(node);}
  if(attrs.includes('data-i18n-placeholder=')){const node=el(id,tag);node.dataset.i18nPlaceholder=attrs.match(/data-i18n-placeholder="([^"]+)"/)?.[1]||'';}
  if(attrs.includes('data-i18n-aria=')){const node=el(id,tag);node.dataset.i18nAria=attrs.match(/data-i18n-aria="([^"]+)"/)?.[1]||'';}
}
const navLearning=new FakeElement('a');navLearning.href='#learning';
const navLinks=['home','reading','library','journal','learning','about'].map(x=>{const a=new FakeElement('a');a.href='#'+x;return a;});
const langButtons=['vi','en'].map(lang=>{const b=new FakeElement('button');b.dataset.lang=lang;return b;});
const menuToggle=el('menuToggle','button');
const body=new FakeElement('body');
const document={
  documentElement:{lang:'vi'},body,
  querySelector(selector){
    if(selector.startsWith('#')&&!selector.includes(' '))return el(selector.slice(1));
    const special={'.spread':'spread','.site-header .brand':'brand','#primaryNav .brand':'brand','.language-switch':'languageSwitch','.scroll-cue':'scrollCue','#cardDialog .modal-close':'cardClose','#promptDialog .modal-close':'promptClose','#journalDialog .modal-close':'journalClose'};
    if(special[selector])return el(special[selector],selector.includes('close')?'button':'div');
    return null;
  },
  querySelectorAll(selector){
    if(selector==='[data-i18n]')return dataI18n;
    if(selector==='[data-i18n-placeholder]')return [...elements.values()].filter(x=>x.dataset.dataI18nPlaceholder||x.dataset.i18nPlaceholder);
    if(selector==='[data-i18n-aria]')return [...elements.values()].filter(x=>x.dataset.i18nAria);
    if(selector==='[data-lang]')return langButtons;
    if(selector==='a[href="#learning"]')return [navLearning];
    if(selector==='#primaryNav a')return navLinks;
    return [];
  },
  createElement(tag){return new FakeElement(tag);}
};
const storageMap=new Map();
storageMap.set('tlinh-tarot-favorites-v1','{}');
const localStorage={getItem(k){return storageMap.get(k)??null;},setItem(k,v){storageMap.set(k,String(v));},removeItem(k){storageMap.delete(k);}};
const downloaded=[];let confirmCalls=0,alerts=[];
const fakeUrl={createObjectURL(){return 'blob:test';},revokeObjectURL(){}};
const context={window:{},document,localStorage,Intl,Date,Math,JSON,Set,Map,URL:fakeUrl,Blob,crypto:{randomUUID:()=>`test-${Math.random()}`},navigator:{clipboard:{async writeText(text){context.copied=text;}}},matchMedia:()=>({matches:false}),confirm:()=>{confirmCalls++;return true;},alert:x=>alerts.push(x),setTimeout:fn=>fn(),console,URLSearchParams,Promise};
context.window.TLINH_DECK=undefined;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(projectRoot,'deck.js'),'utf8'),context,{filename:'deck.js'});
const deck=context.window.TLINH_DECK;
assert.equal(deck.length,78);
assert.equal(new Set(deck.map(card=>card.id)).size,78);
assert.equal(deck.filter(card=>card.arcana==='major').length,22);
assert.equal(deck.filter(card=>card.arcana==='minor').length,56);
assert.ok(deck.every(card=>card.artwork.startsWith('data:image/svg+xml;charset=utf-8,')));
assert.ok(deck.every(card=>['love','work','finance','growth'].every(topic=>card.themes[topic]?.upright?.en&&card.themes[topic]?.upright?.vi&&card.themes[topic]?.reversed?.en&&card.themes[topic]?.reversed?.vi)));
vm.runInContext(appSource,context,{filename:'app.js'});

const click=async id=>el(id).click();
const cardNames=()=>[...el('spread').innerHTML.matchAll(/<div class="card-title">([^<]*)/g)].map(m=>m[1]);
const revealAll=async expected=>{
  let buttons=el('spread').querySelectorAll('[data-card-index]');
  assert.equal(buttons.length,expected,'spread card count');
  for(let i=0;i<expected;i++){
    buttons=el('spread').querySelectorAll('[data-card-index]');
    await buttons[i].click();
  }
  assert.equal(el('readingResult').hidden,false,'reading is interpreted after all cards are revealed');
};
const draw=async(type,count)=>{el('spreadType').value=type;await click('drawButton');assert.match(el('readingStatus').textContent,/chia|dealt/i);await revealAll(count);};

// Reading sizes, position variants, reveal stability, and regenerated prompts.
el('question').value='What should I pay attention to this week?';
el('topic').value='work';
for(const variant of ['timeline','advice','relationship','mind']){
  el('spreadType').value='three';el('spreadVariant').value=variant;await click('drawButton');await revealAll(3);
  assert.match(el('spread').innerHTML,new RegExp(variant==='advice'?'Tình huống':variant==='relationship'?'Tôi':variant==='mind'?'Suy nghĩ':'Quá khứ'));
  const names=cardNames();
  await click('deepButton');
  const prompt=el('generatedPrompt').value;
  for(const name of names)assert.ok(prompt.includes(name),`prompt must contain current card ${name}`);
  assert.match(prompt,/What should I pay attention to this week\?/);
  assert.match(prompt,/Work & goals|Công việc & mục tiêu/);
  assert.match(prompt,/Rider|Rider–Waite|Rider-Waite/);
  assert.equal(el('promptDialog').open,true);
  if(el('openChatGPT').href.includes('?q='))assert.equal(decodeURIComponent(el('openChatGPT').href.split('?q=')[1]),prompt);
  await click('copyPromptButton');assert.equal(context.copied,prompt);
}
await draw('one',1);const oneName=cardNames()[0];await click('deepButton');assert.ok(el('generatedPrompt').value.includes(oneName));
await draw('five',5);await draw('seven',7);await draw('celtic',10);

// A selected spread remains intact when the next spread type changes.
el('spreadType').value='five';await click('drawButton');const before=el('spread').innerHTML;el('spreadType').value='one';await el('spreadType').fire('change');assert.equal(el('spread').innerHTML,before);
await revealAll(5);

// Save/edit/search/export/import/delete the journal entry.
await click('saveReadingButton');assert.equal(JSON.parse(storageMap.get('tlinh-tarot-journal-v1')).length,1);
const entry=el('journalList').children.find(x=>x.className==='journal-entry');assert.ok(entry);
const editButton=entry.querySelectorAll('button').find(x=>x.textContent==='Sửa ghi chú');await editButton.click();
el('entryNote').value='A useful note';el('entryMood').value='curious';await click('saveEntryButton');
assert.match(storageMap.get('tlinh-tarot-journal-v1'),/A useful note/);
el('journalSearch').value='useful note';await el('journalSearch').fire('input');assert.equal(el('journalList').children.length,1);
await click('exportButton');assert.ok(body.children.some(x=>x.download.startsWith('tlinh-tarot-journal-')));
const exported=JSON.parse(storageMap.get('tlinh-tarot-journal-v1'));
el('importFile').files=[{async text(){return JSON.stringify({schema:'tlinh-tarot-journal',version:1,entries:exported});}}];await el('importFile').fire('change');assert.match(el('readingStatus').textContent,/nhập|import/i);
const entryAfter=el('journalList').children.find(x=>x.className==='journal-entry');await entryAfter.querySelectorAll('button').find(x=>x.textContent==='Xóa').click();assert.equal(JSON.parse(storageMap.get('tlinh-tarot-journal-v1')).length,0);assert.equal(confirmCalls,1);
el('importFile').files=[{async text(){return 'not json';}}];await el('importFile').fire('change');assert.match(el('readingStatus').textContent,/Không thể đọc|could not be read/i);

// Library search/filter/favorites/details and language switching.
el('journalSearch').value='';await el('journalSearch').fire('input');
el('arcanaFilter').value='major';await el('arcanaFilter').fire('change');assert.equal(el('libraryGrid').children.length,22);
el('arcanaFilter').value='all';el('librarySearch').value='The Fool';await el('librarySearch').fire('input');assert.equal(el('libraryGrid').children.length,1);
const cardTile=el('libraryGrid').children[0];await cardTile.querySelectorAll('.lib-favorite')[0].click();assert.equal(el('libraryGrid').children.length,1);
await cardTile.querySelectorAll('.library-open')[0].click();assert.equal(el('cardDialog').open,true);
assert.ok(el('cardDetail').innerText.includes('Tình yêu')||el('cardDetail').innerText.includes('Love'));
await langButtons[1].click();assert.equal(document.documentElement.lang,'en');
await click('shuffleButton');assert.match(el('readingStatus').textContent,/shuffled/i);

console.log(JSON.stringify({ok:true,deck:deck.length,spreads:['one','three × 4 layouts','five','seven','Celtic Cross'],journal:['save','edit','search','export','import','delete'],library:['filter','search','favorite','detail'],languages:['vi','en'],alerts},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
