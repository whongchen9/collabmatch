const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');
s = s.replace(/<motion /g, '<div ').replace(/<\/motion>/g, '\u003c/div\u003e');
fs.writeFileSync('index.html', s);
console.log('ok');
