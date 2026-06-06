const fs = require('fs');
const path = require('path');
const packetPath = 'C:/Users/QuoteAmigo/.openclaw/seo_backlink_handoff/runs/20260606T180625_windows_packet.json';
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8').replace(/^\uFEFF/, ''));
const root = 'C:/Users/QuoteAmigo/.openclaw/workspace/flooramigo/flooramigo-resources.github.io';
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function linkifyLine(line, task) {
  let out = esc(line);
  const replacements = [];
  // Replace terminal call-to-action anchor text in snippet with preferred links.
  for (const l of task.required_target_links) replacements.push({text:l.anchor, url:l.url});
  replacements.sort((a,b)=>b.text.length-a.text.length);
  for (const r of replacements) {
    const escapedText = esc(r.text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapedText, 'g'), `<a href="${esc(r.url)}">${esc(r.text)}</a>`);
  }
  return out;
}
function bodyFromSnippet(task) {
  const blocks = task.snippet.split(/\n\n+/);
  const html = [];
  for (const block of blocks) {
    const lines = block.split(/\n/);
    if (lines.length > 1 && lines.slice(1).every(l => l.trim().startsWith('- '))) {
      html.push(`    <h2>${esc(lines[0].trim())}</h2>`);
      html.push('    <ul>');
      for (const li of lines.slice(1)) html.push(`      <li>${linkifyLine(li.trim().replace(/^-\s*/, ''), task)}</li>`);
      html.push('    </ul>');
    } else if (lines.length === 1) {
      html.push(`    <p>${linkifyLine(lines[0].trim(), task)}</p>`);
    } else {
      html.push(`    <p>${lines.map(l=>linkifyLine(l.trim(), task)).join('<br>')}</p>`);
    }
  }
  return html.join('\n');
}
for (const task of packet.tasks) {
  const dir = path.join(root, task.required_slug);
  fs.mkdirSync(dir, {recursive:true});
  const lang = task.language === 'es' ? 'es' : 'en';
  const exactAnchorSection = lang === 'es'
    ? `    <p>Para comparar el presupuesto principal, consulte <a href="${esc(task.target_url)}">${esc(task.anchor)}</a> con el alcance local antes de elegir materiales o fechas de instalacion.</p>`
    : `    <p>For the primary planning reference, review <a href="${esc(task.target_url)}">${esc(task.anchor)}</a> before comparing materials, prep, and installation schedules.</p>`;
  const linksHeading = lang === 'es' ? 'Enlaces de planificacion' : 'Planning links';
  const html = `<!doctype html>\n<html lang="${lang}">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${esc(task.title)}</title>\n  <meta name="robots" content="index,follow">\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.55; color: #202124; max-width: 860px; margin: 0 auto; padding: 40px 20px; }\n    h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1rem; }\n    h2 { margin-top: 1.5rem; }\n    a { color: #0b57d0; }\n    li { margin: 0.35rem 0; }\n  </style>\n</head>\n<body>\n  <main>\n    <h1>${esc(task.title)}</h1>\n${exactAnchorSection}\n${bodyFromSnippet(task)}\n    <h2>${linksHeading}</h2>\n    <ul>\n${task.required_target_links.map(l => `      <li><a href="${esc(l.url)}">${esc(l.anchor)}</a></li>`).join('\n')}\n    </ul>\n  </main>\n</body>\n</html>\n`;
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}
