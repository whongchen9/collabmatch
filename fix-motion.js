const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');
const before = h.includes('<motion class="collab-score-label">');
h = h.replace(
  '<motion class="collab-score-label">发布者</div>',
  '<div class="collab-score-label">发布者</div>'
);
h = h.replace(/<\/?motion\b[^>]*>/g, '');
fs.writeFileSync('index.html', h, 'utf8');
console.log('had motion label:', before);
console.log('motion left:', (h.match(/motion/g) || []).length);
