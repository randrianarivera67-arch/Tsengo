// patch-feed-prefetch.cjs  (FRONTEND — src/pages/Home.jsx)
// Mampihaingana ny fahatsapana ny "Chargement" amin'ny feed (tsy misy refactor, azo antoka) :
//   1. rootMargin 600px → 1600px : maka mialoha (prefetch) be lavitra alohan'ny hahatongavana ambany
//   2. Trigger fetch aloha kokoa : postLimit-5 → postLimit-15
//   3. Batch lehibe kokoa : reveal +20 → +26, fetch +30 → +40 (tampon mijanona mialoha)
// → Ny post manaraka efa vonona alohan'ny hahatratrarana azy → tsy hita firy ny "Chargement".
// Idempotent + anchor unique guards.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;

const edits = [
  ['prefetch mialoha (rootMargin 1600px)', "}, { rootMargin: '600px' });", "}, { rootMargin: '1600px' });"],
  ['fetch aloha kokoa + batch 40', "if (feedLen >= postLimit - 5 && !reachedEnd) setPostLimit(l => l + 30);", "if (feedLen >= postLimit - 15 && !reachedEnd) setPostLimit(l => l + 40);"],
  ['reveal batch 26', "setVisibleCount(c => c + 20);", "setVisibleCount(c => c + 26);"],
];
for (const [label, oldStr, newStr] of edits) {
  if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
}
if (changed) fs.writeFileSync(p, s);
console.log('✅ Prefetch feed amboarina — "Chargement" ho tsy hita firy intsony.');
