const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const script = html.slice(scriptStart, html.lastIndexOf('</script>'));
const base = html.slice(0, scriptStart).split('\n').length;

try {
  new Function(script);
  console.log('JS OK');
  process.exit(0);
} catch (e) {
  console.log('FAIL:', e.message);
}

// line-by-line incremental parse
const lines = script.split('\n');
let chunk = '';
for (let i = 0; i < lines.length; i++) {
  chunk += lines[i] + '\n';
  try {
    new Function(chunk + '\n/*partial*/');
  } catch (e) {
  if (!e.message.includes('Unexpected end') && !e.message.includes('Invalid or unexpected token') && !e.message.includes('Unexpected token')) {
      // might still be incomplete
    }
    const msg = e.message;
    if (msg.includes('Unexpected end')) continue;
    console.log('First error at script line', i + 1, 'file line', base + i, ':', msg);
    for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
      console.log(base + j + ':', lines[j].slice(0, 200));
    }
    break;
  }
}
