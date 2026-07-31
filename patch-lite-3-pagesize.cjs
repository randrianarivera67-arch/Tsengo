/**
 * patch-lite-3-pagesize.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA VOAMARINA TAMIN'NY CODE :
 *   Ny feed dia maka publication **30** amin'ny fidirana (FIRST_PAGE), ary ny
 *   document tsirairay dia mitondra ny **commentaire REHETRA** (voatahiry
 *   `comments: arrayUnion(...)` ao anatin'ny document, tsy amin'ny sous-collection).
 *
 *   Nefa ny carte feed dia mampiasa `post.comments?.length` IHANY — ny isany.
 *   Ny votoatin'ny commentaire rehetra (anarana, sary, lahatsoratra, daty,
 *   réaction) dia ampidinina… tsy asehon'ny carte mihitsy.
 *
 *   Ny Firestore dia TSY mahavita projection amin'ny SDK client : tsy azo
 *   angatahina ny champ sasany ihany. Ny hany fanafody feno dia sous-collection
 *   — migration lehibe, mila dingana 4.
 *
 * FANAFODY AMIN'IZAO (tsy misy risque, azo averina) :
 *   Ahena ny ISAN'NY publication alaina amin'ny MODE LITE.
 *     FIRST_PAGE  30 → 12   (−60 % amin'ny fidirana)
 *     PAGE_SIZE   20 → 10   (−50 % isaky ny scroll)
 *
 * NAHOANA NO AZO ANTOKA :
 *   • `visibleCount` manomboka amin'ny 20 → ny 12 dia miseho AVY HATRANY,
 *     tsy misy fiatoana hita maso.
 *   • Ny scroll infini efa voahitsy (patch-feed-data-fix) dia maka pejy
 *     rehefa tapitra TOKOA ny an-tanana → tsy misy boucle.
 *   • Tsy Lite → tsy misy fiovana mihitsy (30/20 toy ny teo aloha).
 *   • `loadFeedPage` dia fonction tsotra (tsy useCallback) → mandray ny sanda
 *     vaovao isaky ny render, tsy misy valeur voatahiry diso.
 *
 * TSY VOAKASIKA : ny listener realtime (efa maty amin'ny Lite), ny rank/score,
 *   ny pin, ny Messages, ny notification.
 *
 * Fampandehanana :  node patch-lite-3-pagesize.cjs --dry
 *                   node patch-lite-3-pagesize.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/pages/Home.jsx');
  console.error("   Mandehana ao amin'ny racine an'ny frontend (cd ~/Tsengo-fresh).");
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');

if (s.includes('lite ? 12 : 30')) {
  console.log('⏭  Home.jsx : efa voapatch');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── Fanamarinana mialoha : `lite` voafaritra ALOHAN'ny PAGE_SIZE ────────── */
{
  const iLite = s.indexOf('const [lite, setLiteState]');
  const iPage = s.indexOf('const PAGE_SIZE =');
  if (iLite === -1) throw new Error('ASSERTION FAIL : tsy hita ny state `lite` — alefaso aloha ny patch-mode-lite.cjs');
  if (iPage === -1) throw new Error('ASSERTION FAIL : tsy hita ny PAGE_SIZE');
  if (iLite > iPage) throw new Error('ASSERTION FAIL : `lite` voafaritra AORIAN\'ny PAGE_SIZE — hisy ReferenceError');
}

s = rep(s,
  `  const PAGE_SIZE = 20;
  // Chargement voalohany : 30 (mba hisian'ny récence samy hafa hifangaro), avy eo
  // 20 isaky ny pagination (scroll). Mitsitsy forfait, tsy misy loading tsy mijanona.
  const FIRST_PAGE = 30;`,
  `  // ── MODE LITE : pejy kely kokoa ────────────────────────────────────────
  // Ny document post dia mitondra ny COMMENTAIRE REHETRA (voatahiry ao anatiny,
  // tsy amin'ny sous-collection) nefa ny carte dia mampiasa ny ISANY ihany.
  // Ny Firestore dia tsy mahavita projection amin'ny client → ny hany fomba
  // hampihenana ny octet dia ny fampihenana ny ISAN'NY document alaina.
  //   Lite     : 12 amin'ny fidirana, 10 isaky ny scroll
  //   Mahazatra: 30 / 20 (tsy misy fiovana)
  // \`visibleCount\` manomboka amin'ny 20 → ny 12 dia miseho avy hatrany.
  const PAGE_SIZE = lite ? 10 : 20;
  const FIRST_PAGE = lite ? 12 : 30;`,
  'pagesize');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana mety (tsy nisy nosoratana)'
  : '✅ Patch vita : src/pages/Home.jsx → Lite 12/10, mahazatra 30/20');
