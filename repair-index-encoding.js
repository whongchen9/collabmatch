const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'index.html');
let buf = fs.readFileSync(target);

function fffdCount(b) {
  return (b.toString('utf8').match(/\uFFFD/g) || []).length;
}

function findCorruptPositions(b) {
  const pos = [];
  for (let i = 2; i < b.length; i++) {
    const c = b[i];
    const b1 = b[i - 2];
    const b2 = b[i - 1];
    if (c !== 0x3f) continue;
    if (b1 >= 0xe0 && b1 <= 0xef && b2 >= 0x80 && b2 <= 0xbf) pos.push(i);
  }
  return pos;
}

function scoreBuffer(b, validateJs) {
  const s = b.toString('utf8');
  let score = 0;
  score -= (s.match(/\uFFFD/g) || []).length * 1000;
  score -= (s.match(/[\u4e00-\u9fff]\?[,<'"]/g) || []).length * 100;
  if (validateJs) {
    const script = s.split('<script>').pop().split('</script>')[0];
    try {
      new Function(script);
      score += 50000;
    } catch {
      score -= 5000;
    }
  }
  return score;
}

console.log('initial fffd', fffdCount(buf), 'positions', findCorruptPositions(buf).length);

for (let round = 0; round < 8; round++) {
  let changed = 0;
  const positions = findCorruptPositions(buf);
  for (const i of positions) {
    let bestByte = 0x3f;
    let bestScore = -Infinity;
    for (let b = 0x80; b <= 0xbf; b++) {
      const trial = Buffer.from(buf);
      trial[i] = b;
      const sc = scoreBuffer(trial, false);
      if (sc > bestScore) {
        bestScore = sc;
        bestByte = b;
      }
    }
    if (bestByte !== 0x3f) {
      buf[i] = bestByte;
      changed++;
    }
  }
  console.log('round', round + 1, 'fixed', changed, 'fffd', fffdCount(buf));
  if (!changed) break;
}

const out = buf.toString('utf8');
const script = out.split('<script>').pop().split('</script>')[0];
try {
  new Function(script);
  console.log('JS parse OK');
} catch (e) {
  console.log('JS parse FAIL', e.message);
}

fs.writeFileSync(target, buf);
console.log('written', target);
