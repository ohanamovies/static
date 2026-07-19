import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://localhost:5174';
const outDir = path.resolve('temp/audit/artifacts');
await mkdir(outDir, { recursive: true });

const chromium = spawn('/usr/bin/chromium', [
  '--headless=new', '--remote-debugging-port=9223', '--disable-gpu', '--no-sandbox',
  '--disable-dev-shm-usage', '--user-data-dir=/tmp/ohana-cx-audit-chrome', 'about:blank'
], { stdio: ['ignore','pipe','pipe'] });

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function getJson(url, tries=40){
  let last;
  for (let i=0;i<tries;i++){
    try { const r = await fetch(url); if (r.ok) return await r.json(); last = `${r.status}`; } catch(e){ last=e.message; }
    await sleep(250);
  }
  throw new Error(`Failed ${url}: ${last}`);
}
const version = await getJson('http://127.0.0.1:9223/json/version');
const wsUrl = version.webSocketDebuggerUrl;
let id = 0;
const pending = new Map();
const ws = new WebSocket(wsUrl);
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { const {resolve,reject}=pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
});
await new Promise((res,rej)=>{ ws.addEventListener('open',res,{once:true}); ws.addEventListener('error',rej,{once:true}); });
function send(method, params={}){ const mid=++id; ws.send(JSON.stringify({id:mid,method,params})); return new Promise((resolve,reject)=>pending.set(mid,{resolve,reject})); }
await send('Target.setDiscoverTargets',{discover:true});
const target = await send('Target.createTarget',{url:'about:blank'});
const session = await send('Target.attachToTarget',{targetId:target.targetId, flatten:true});
const sid = session.sessionId;
function cdp(method, params={}){ const mid=++id; ws.send(JSON.stringify({id:mid,method,params,sessionId:sid})); return new Promise((resolve,reject)=>pending.set(mid,{resolve,reject})); }
await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('DOM.enable');
const consoleLogs=[];
ws.addEventListener('message', ev => { const msg=JSON.parse(ev.data); if(msg.sessionId===sid && msg.method==='Runtime.consoleAPICalled') consoleLogs.push(msg.params); });
async function evalJs(expression){ const r=await cdp('Runtime.evaluate',{expression, returnByValue:true, awaitPromise:true}); if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
async function nav(url){ await cdp('Page.navigate',{url}); await sleep(1200); }
async function shot(name){ const r=await cdp('Page.captureScreenshot',{format:'png', captureBeyondViewport:true}); const p=path.join(outDir,name); await writeFile(p, Buffer.from(r.data,'base64')); return p; }
async function setViewport(width,height){ await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile: width < 600}); await cdp('Emulation.setTouchEmulationEnabled',{enabled: width < 600}); }
async function pageInfo(){ return await evalJs(`(() => ({
  url: location.href,
  title: document.title,
  h1: [...document.querySelectorAll('h1,h2')].map(e=>e.innerText).slice(0,8),
  buttons: [...document.querySelectorAll('button,a,input')].map(e=>({tag:e.tagName,text:e.innerText||e.value||e.getAttribute('aria-label')||e.placeholder||'', href:e.href||'', cls:e.className})).slice(0,80),
  bodyText: document.body.innerText.slice(0,2500),
  innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
  active: document.activeElement && (document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || document.activeElement.placeholder || document.activeElement.tagName)
}))()`); }
const results=[];
for (const vp of [{name:'mobile',w:390,h:844},{name:'desktop',w:1365,h:900}]){
  await setViewport(vp.w,vp.h);
  for (const route of ['/discover','/search','/settings','/roadmap']){
    await nav(base+route);
    const info=await pageInfo();
    const png=await shot(`${vp.name}-${route.replaceAll('/','_')||'home'}.png`);
    results.push({vp:vp.name,route,info,png});
  }
}
// interactions mobile
await setViewport(390,844);
await nav(base+'/search');
await evalJs(`(() => { const i=document.querySelector('input[type="search"], input[placeholder*="Search" i], input'); i?.focus(); if(i){ i.value='toy'; i.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
await sleep(500); results.push({vp:'mobile',route:'/search?q=toy',info:await pageInfo(),png:await shot('mobile-search-toy.png')});
await evalJs(`(() => { const el=[...document.querySelectorAll('button,a,.movie-card,.search-result-card')].find(e => /Toy Story|Toy/i.test(e.innerText)); el?.click(); return !!el; })()`);
await sleep(700); results.push({vp:'mobile',route:'movie-detail-from-search',info:await pageInfo(),png:await shot('mobile-movie-detail.png')});
await nav(base+'/discover');
await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e => /filters|availability|genre|rating|maturity/i.test(e.innerText)); b?.click(); return b?.innerText; })()`);
await sleep(500); results.push({vp:'mobile',route:'discover-filter-open',info:await pageInfo(),png:await shot('mobile-discover-filter-open.png')});
await nav(base+'/settings');
await evalJs(`(() => { const el=[...document.querySelectorAll('a,button')].find(e => /streaming/i.test(e.innerText)); el?.click(); return el?.innerText; })()`);
await sleep(700); results.push({vp:'mobile',route:'/settings/streaming',info:await pageInfo(),png:await shot('mobile-settings-streaming.png')});
await evalJs(`(() => { const el=[...document.querySelectorAll('a,button')].find(e => /maturity/i.test(e.innerText)); el?.click(); return el?.innerText; })()`);
await sleep(700); results.push({vp:'mobile',route:'/settings/maturity',info:await pageInfo(),png:await shot('mobile-settings-maturity.png')});

await writeFile(path.join(outDir,'audit-results.json'), JSON.stringify({base, results, consoleLogs}, null, 2));
await send('Target.closeTarget',{targetId:target.targetId});
ws.close(); chromium.kill('SIGTERM');
console.log(`Wrote ${path.join(outDir,'audit-results.json')}`);
