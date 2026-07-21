// patch-date-timeago.cjs  (FRONTEND — src/utils/timeAgo.js)
// Olana : ny date "very" (foana) amin'ny publication sasany — satria ny timeAgo
// dia tsy nahay ny Timestamp brut {seconds}/{_seconds} (post partagé/repost/migré).
// Vahaolana :
//   1. Fantarina ny endrika REHETRA : Timestamp live (.toDate), {seconds}, {_seconds},
//      Date, number (ms), ISO string → tsy foana intsony ny date.
//   2. Fetra "date feno" : 5j → 7j (mande andro maromaro vao miseo 12/07/2026).
// Idempotent + anchor guard.
const fs = require('fs');
const p = 'src/utils/timeAgo.js';
let s = fs.readFileSync(p, 'utf8');

let changed = 0;

// 1) Parse robuste ny timestamp
const OLD1 = "  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));";
const NEW1 = "  let d;\n" +
  "  if (ts && typeof ts.toDate === 'function') d = ts.toDate();\n" +
  "  else if (ts && typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);\n" +
  "  else if (ts && typeof ts._seconds === 'number') d = new Date(ts._seconds * 1000);\n" +
  "  else if (ts instanceof Date) d = ts;\n" +
  "  else d = new Date(ts);";
if (s.includes(NEW1)) { console.log('  ⏭️  parse robuste — deja applique'); }
else {
  const n = s.split(OLD1).length - 1;
  if (n !== 1) { console.log('  ❌ parse — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(OLD1, NEW1); changed++; console.log('  ✅ parse robuste (Timestamp/{seconds}/{_seconds}/ISO/number)');
}

// 2) Fetra 5j → 7j
const OLD2 = "  if (days < 5) return `Il y a ${days}j`;";
const NEW2 = "  if (days < 7) return `Il y a ${days}j`;";
if (s.includes(NEW2)) { console.log('  ⏭️  fetra 7j — deja applique'); }
else {
  const n = s.split(OLD2).length - 1;
  if (n !== 1) { console.log('  ❌ fetra — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(OLD2, NEW2); changed++; console.log('  ✅ fetra date feno : 5j → 7j');
}

if (changed) fs.writeFileSync(p, s);
console.log('✅ timeAgo amboarina — date tsy very intsony.');
