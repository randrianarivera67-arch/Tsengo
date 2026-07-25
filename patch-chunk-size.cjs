const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');
const OLD = "function chunkSizeFor(size) { return size > 200 * MB ? 8 * MB : 4 * MB; }";
const NEW = "function chunkSizeFor(size) {\n  // 4 Mo = reprise rapide (cas courant) ; morceaux plus gros au-dela pour rester\n  // sous la limite de 50 subrequests du Worker a la LECTURE (2 par morceau).\n  if (size <= 60 * MB)  return 4 * MB;\n  if (size <= 160 * MB) return 8 * MB;\n  return 12 * MB;\n}";
if (s.includes('size <= 60 * MB')) { console.log('SKIP deja'); process.exit(0); }
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre ('+(s.split(OLD).length-1)+')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('OK taille des morceaux adaptee');
