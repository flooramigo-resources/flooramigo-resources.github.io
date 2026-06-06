const fs = require('fs');
const path = require('path');
const packetPath = 'C:/Users/QuoteAmigo/.openclaw/seo_backlink_handoff/runs/20260606T180625_windows_packet.json';
const outDir = 'C:/Users/QuoteAmigo/.openclaw/seo_backlink_handoff/runs/screenshots';
fs.mkdirSync(outDir, {recursive:true});
const packet = JSON.parse(fs.readFileSync(packetPath,'utf8').replace(/^\uFEFF/,''));
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function newBlank(){return await (await fetch('http://127.0.0.1:18800/json/new?about:blank',{method:'PUT'})).json();}
async function attach(wsUrl){
 const ws = new WebSocket(wsUrl); let id=1; const pending=new Map();
 ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id && pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); } };
 await new Promise((res,rej)=>{ws.onopen=res; ws.onerror=rej});
 const send=(method,params={})=>{const mid=id++; ws.send(JSON.stringify({id:mid,method,params})); return new Promise(r=>pending.set(mid,r));};
 return {ws,send};
}
function analyze(value, task){
 const anchors = value.anchors || [];
 const text = value.text || '';
 const required_urls_found = task.required_urls.filter(url => anchors.some(a => a.href === url));
 const exact = anchors.find(a => a.href === task.target_url && a.text === task.anchor);
 const target_url_found = anchors.some(a => a.href === task.target_url);
 const visibleRaw = /https?:\/\/flooramigo\.com/i.test(text);
 const forbidden = anchors.some(a => /\/flooring-calculator\//i.test(a.href) || /[?&]q=[^\s]*\/flooring-calculator\//i.test(a.href));
 const spanishEnglish = task.language === 'es' && /(Flooring resource for|Start with|Then use)/i.test(text);
 return {required_urls_found, target_url_found, exactAnchor: !!exact, visible_anchor_used: exact ? exact.text : (anchors.find(a=>a.href===task.target_url)?.text || ''), visibleRaw, forbidden, spanishEnglish, anchors};
}
async function checkPage(task, attempt){
 const tab = await newBlank();
 const {ws,send}=await attach(tab.webSocketDebuggerUrl);
 await send('Runtime.enable'); await send('Page.enable'); await send('Page.bringToFront');
 await send('Page.navigate',{url:task.required_proof_url});
 for (let i=0;i<20;i++) {
   await sleep(1000);
   const ready = await send('Runtime.evaluate',{expression:`document.readyState`,returnByValue:true});
   if (ready.result.result.value === 'complete') break;
 }
 await sleep(1000);
 const evalRes = await send('Runtime.evaluate',{expression:`(()=>({url:location.href,title:document.title,text:document.body?document.body.innerText:'',anchors:Array.from(document.querySelectorAll('a')).map(a=>({text:(a.textContent||'').trim(),href:a.href}))}))()`,returnByValue:true});
 const value = evalRes.result.result.value;
 const last = analyze(value, task);
 last.page = {url:value.url,title:value.title, textStart:(value.text||'').slice(0,80), attempt};
 if (last.exactAnchor && last.required_urls_found.length === task.required_urls.length && !last.visibleRaw && !last.forbidden && !last.spanishEnglish) {
   const shot = path.join(outDir, `20260606T180625_task_${task.task_id}.png`).replace(/\\/g,'/');
   const cap = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   fs.writeFileSync(shot, Buffer.from(cap.result.data,'base64'));
   last.screenshot_path = shot;
 }
 ws.close();
 return last;
}
(async()=>{
 const all=[];
 for (const task of packet.tasks) {
   let last;
   for (let attempt=1; attempt<=20; attempt++) {
     last = await checkPage(task, attempt);
     console.log('attempt', attempt, 'task', task.task_id, JSON.stringify({title:last.page.title,text:last.page.textStart, exact:last.exactAnchor, found:last.required_urls_found.length, raw:last.visibleRaw, forbidden:last.forbidden, spanishEnglish:last.spanishEnglish}));
     if (last.screenshot_path) break;
     if (attempt < 20) await sleep(15000);
   }
   all.push({task, check:last});
 }
 fs.writeFileSync('verify_render_cdp_20260606T180625_output.json', JSON.stringify(all,null,2));
 console.log(JSON.stringify(all,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
