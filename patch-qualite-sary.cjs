/**
 * patch-qualite-sary.cjs   —  Sary mazava kokoa (taloha SY vaovao)
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (izaho no nahatonga azy) :
 *   Ny vignette 360 px dia natao tamin'ny fotoana nisian'ny sary voafetra
 *   amin'ny `maxHeight: 520`. Izao, aorian'ny `72vh`, dia NATARIKA ho ~1080 px
 *   izy — 3× ny habeny marina → manjavozavo.
 *
 * VAHAOLANA — ROA MIARAKA :
 *
 *   ① SARY TALOHA (sy vaovao) : ny feed dia mampiasa ny `mediaURL` fa tsy ny
 *      `thumbURL`. Ny sary EFA MISY REHETRA dia lasa 720 px — 2× tsara kokoa,
 *      TSY MILA fampiakarana vaovao, tsy misy migration.
 *
 *   ② SARY VAOVAO : ny fampiakarana dia 720 → 1080 px, kalitao 0,62 → 0,72.
 *      Ny vignette dia 360 → 540 px (mbola ampiasaina any an-kafa).
 *
 * ⚠️ VIDINY AMIN'NY DATA — mila ho fantatrao :
 *      taloha : 18 kB isaky ny sary (vignette 360)
 *      izao   : ~60 kB ho an'ny sary taloha · ~130 kB ho an'ny vaovao
 *   Ny feed misy sary 12 dia mandany ~1,2 Mo (216 kB teo aloha).
 *   Ny Mode Lite dia TSY manova izany intsony — ny sary no votoatin'ny app.
 *   Raha be loatra dia azo averina ny ① ho an'ny Lite ihany.
 *
 * VOAKASIKA : utils/telegram.js · pages/Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-qualite-sary.cjs --dry
 *                   node patch-qualite-sary.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══ ① Feed : mediaURL fa tsy thumbURL ═══════════════════════════════ */
for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  const OLD = 'post.thumbURL || post.mediaURL';
  const n = s.split(OLD).length - 1;
  if (n === 0) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }
  if (n !== 2) throw new Error('ASSERTION FAIL [' + name + '] : nandrasana 2, nahitana ' + n);
  // ⚠️ `mediaURL` aloha : ny sary EFA MISY dia lasa 720 px avy hatrany.
  s = s.split(OLD).join('post.mediaURL || post.thumbURL');
  console.log('  • ' + name + ' : 2 toerana');
  save(rel, s);
}

/* ═══ ② Fampiakarana : 1080 px / 0,72 ═════════════════════════════════ */
{
  const rel = 'src/utils/telegram.js';
  let s = read(P(rel));
  if (s.includes('maxWidth = 1080')) { console.log('  ⏭  telegram.js : efa voapatch'); }
  else {
    const OLD = 'async function compressImage(file, maxWidth = 720, quality = 0.62) {';
    if (s.split(OLD).length - 1 !== 1) throw new Error('ASSERTION FAIL [telegram] : compressImage tsy hita');
    s = s.replace(OLD, 'async function compressImage(file, maxWidth = 1080, quality = 0.72) {');

    // Vignette : 360 → 540
    const T = 'export async function makeThumb(file, maxWidth = 360)';
    if (s.includes(T)) s = s.replace(T, 'export async function makeThumb(file, maxWidth = 540)');

    console.log('  • telegram.js : 720→1080 px · 0,62→0,72');
    save(rel, s);
  }
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
for (const rel of touched) {
  const s = files[rel];
  if (s.includes('post.thumbURL || post.mediaURL')) throw new Error('FAIL [' + rel + '] : mbola vignette aloha');
}
{
  const t = files['src/utils/telegram.js'] || read(P('src/utils/telegram.js'));
  if (!t.includes('maxWidth = 1080')) throw new Error('FAIL : fampiakarana tsy nakarina');
  if (!t.includes('quality = 0.72')) throw new Error('FAIL : kalitao tsy nakarina');
  if (!t.includes("'image/jpeg'")) throw new Error('FAIL : JPEG very (WebP = sticker Telegram!)');
  if (t.includes("'image/webp'")) throw new Error('FAIL : WebP niverina — sticker Telegram');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : sary mazava kokoa');
touched.forEach(f => console.log('   • ' + f));
