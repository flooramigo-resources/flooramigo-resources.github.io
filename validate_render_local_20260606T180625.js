const fs=require('fs'), path=require('path');
const packet=JSON.parse(fs.readFileSync('C:/Users/QuoteAmigo/.openclaw/seo_backlink_handoff/runs/20260606T180625_windows_packet.json','utf8').replace(/^\uFEFF/,''));
for (const task of packet.tasks) {
  const html=fs.readFileSync(path.join(task.required_slug,'index.html'),'utf8');
  const text=html.replace(/<a\b[^>]*>.*?<\/a>/gis,'').replace(/<[^>]+>/g,' ');
  const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  const visibleRaw=/flooramigo\.com/i.test(text);
  const forbidden=hrefs.some(h=>/\/flooring-calculator\//.test(h) || /q=[^"&]*flooring-calculator/.test(decodeURIComponent(h)));
  const found=task.required_urls.map(u=>hrefs.includes(u));
  const exact=html.includes(`>${task.anchor}</a>`);
  const target=hrefs.includes(task.target_url);
  console.log(task.task_id, {exact,target,found,visibleRaw,forbidden,hrefs:hrefs.filter(h=>h.includes('flooramigo.com'))});
  if(!exact||!target||found.includes(false)||visibleRaw||forbidden) process.exitCode=1;
}
