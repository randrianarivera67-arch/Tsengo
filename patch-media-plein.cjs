/**
 * patch-media-plein.cjs   —  Sary lehibe kokoa amin'ny fil
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny sary dia voafetra amin'ny `maxHeight: 520` — kely amin'ny écran
 *   maoderina (haavo 2 300 px), ary voatakon'ny en-tête sy ny barre manidina
 *   ny ampahany ambony sy ambany.
 *
 * FANOVANA : 520 → **72vh**  (ampahatelony telo amin'ny écran)
 *   • `vh` fa tsy px : mifanaraka amin'ny écran rehetra.
 *   • 72 % : mamela toerana ho an'ny en-tête (ambony) sy ny barre (ambany)
 *     nefa lehibe kokoa noho ny 520 px amin'ny findaina rehetra.
 *
 * VOAKASIKA :
 *   • pages/Home.jsx        — sary tokana sy video (toerana 2)
 *   • components/PhotoCarousel.jsx — sary maro (n = 1)
 *
 * ⚠️ Ny grille sary 2/3/4+ ao amin'ny PhotoCarousel dia TSY VOAKASIKA :
 *   `aspectRatio` no mifehy azy, tsy `maxHeight`. Ny sary TOKANA ihany.
 *
 * Fampandehanana :  node patch-media-plein.cjs --dry
 *                   node patch-media-plein.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);

const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const countOf = (s, sub) => s.split(sub).length - 1;

const files = {};
const touched = [];

/* ═══ ① Home.jsx : sary tokana + video ════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = read(P(rel));
  if (s.includes("maxHeight:'72vh'")) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    // 4 = (SmartImage + FeedVideo) × 2 kopia (manidina + mahazatra).
    // Ny patch `poste-flottant-2` no nampiroa ny bloc média.
    const n = countOf(s, 'maxHeight:520');
    if (n !== 4) throw new Error('ASSERTION FAIL [home] : nandrasana 4 « maxHeight:520 », nahitana ' + n);
    s = s.split('maxHeight:520').join("maxHeight:'72vh'");
    files[rel] = s; touched.push(rel);
  }
}

/* ═══ ② PhotoCarousel.jsx : sary tokana ═══════════════════════════════ */
{
  const rel = 'src/components/PhotoCarousel.jsx';
  let s = read(P(rel));
  if (s.includes("maxHeight: '72vh'")) { console.log('  ⏭  PhotoCarousel.jsx : efa voapatch'); }
  else {
    const n = countOf(s, 'maxHeight: 520');
    if (n !== 1) throw new Error('ASSERTION FAIL [carousel] : nandrasana 1 « maxHeight: 520 », nahitana ' + n);
    s = s.replace('maxHeight: 520', "maxHeight: '72vh'");
    files[rel] = s; touched.push(rel);
  }
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
for (const rel of touched) {
  const s = files[rel];
  if (/maxHeight:\s*520/.test(s)) throw new Error('FAIL [' + rel + '] : mbola misy 520');
}
{
  // Ny grille sary maro dia tsy voakasika
  const c = files['src/components/PhotoCarousel.jsx'] || read(P('src/components/PhotoCarousel.jsx'));
  if (!c.includes("aspectRatio: '1 / 1'")) throw new Error('FAIL : very ny grille aspectRatio');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana 5 mety (tsy nisy nosoratana)' : '\n✅ Patch vita : sary 72vh');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
