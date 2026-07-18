// patch-chunk-9mo.cjs  (FRONTEND — src/utils/telegram.js)
// Araka ny fanapahan-kevitra :
//   • Ny video lehibe dia TAPAHANA HO 9 Mo (fa tsy 18 Mo) — morceaux kely kokoa
//     = alaina tsikelikely haingana kokoa amin'ny lecture (pré-chargement fluide,
//     latence kely isaky ny seek), ary tsy mihoatra ny fetran'ny Bot API mihitsy.
//   • Ny seuil dia MIJANONA 12 Mo (toy ny taloha) — TSY mandalo GramJS mihitsy
//     ny video (io ilay "GramJS: Not a valid string").
// Idempotent.
const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');

const OLD = "const CHUNK_SIZE      = 18 * 1024 * 1024;   // morceaux 18 Mo (limite Bot API 20 Mo)";
const NEW = "const CHUNK_SIZE      = 9 * 1024 * 1024;    // morceaux 9 Mo — kely kokoa = lecture/pré-chargement fluide kokoa";

if (s.includes(NEW)) { console.log('⏭️  Deja applique.'); process.exit(0); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.log('❌ ancre introuvable/multiple (' + n + ')'); process.exit(1); }

// Fiarovana : hamarinina fa 12 Mo ny seuil (tsy tokony 45 intsony)
if (!s.includes('const CHUNK_THRESHOLD = 12 * 1024 * 1024;')) {
  console.log('❌ CHUNK_THRESHOLD tsy 12 Mo — hamarino aloha (tsy tokony 45 Mo intsony)');
  process.exit(1);
}

s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('✅ Morceaux : 18 Mo → 9 Mo (seuil mijanona 12 Mo, tsy mandalo GramJS).');
