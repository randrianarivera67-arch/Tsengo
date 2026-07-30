/**
 * patch-lite-1-thumbnails.cjs   —  DINGANA 1 amin'ny "Lite"
 * ─────────────────────────────────────────────────────────────────────────────
 * FITSIPIKA : aza alefa izay tsy asehonao.
 *
 * AMPAHANY A — WebP fa tsy JPEG  (mikasika ny SARY REHETRA)
 *   Ny `compressImage` dia manoratra JPEG q 0.62 → ~60 kB.
 *   WebP q 0.72 dia manome ~30 % kely kokoa NEFA tsara kokoa ny sary.
 *   Voamarina ny fahaizan'ny navigateur (`canvas.toDataURL('image/webp')`) —
 *   raha tsy mahay dia miverina amin'ny JPEG toy ny teo aloha, tsy misy tapaka.
 *   ⇒ Mahazo tombony ny sary REHETRA : publication, avatar, story, commentaire.
 *   ⇒ Tsy misy champ vaovao, tsy misy migration, tsy misy fanovana rendu.
 *
 * AMPAHANY B — Vignette 360 px ho an'ny FEED
 *   Ny feed dia maneho sary 720 px nefa ~360 px no habeny marina eo an-tsandry.
 *   Amin'ny upload dia amboarina vignette 360 px (~15 kB) → `thumbURL`.
 *   Ny feed maka `thumbURL`, ny fullscreen sy PostDetail maka `mediaURL`.
 *
 *   ⚠️ AZO ANTOKA : raha tsy mety ny vignette (réseau, mémoire, navigateur)
 *      dia mijanona foana ny `thumbURL` ary ny feed miverina amin'ny `mediaURL`.
 *      Tsy misy fahatapahana MIHITSY. Toy izany koa ny publication TALOHA :
 *      tsy manana `thumbURL` izy ireo → mediaURL no ampiasaina.
 *
 *   Ny champ `thumbURL` dia EFA MISY ao anaty schéma (poster video) — tsy misy
 *   champ vaovao. Ny video sy ny sary tsy mifanindry (mediaType tokana).
 *
 * TSY VOAKASIKA amin'ity dingana ity : sary maro (mediaURLs / PhotoCarousel),
 *   Reels, MediaViewer, ny fitehirizana commentaire. Dingana manaraka.
 *
 * Fampandehanana :  node patch-lite-1-thumbnails.cjs --dry
 *                   node patch-lite-1-thumbnails.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);

function read(f) {
  if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f);
  return fs.readFileSync(f, 'utf8');
}
const countOf = (s, sub) => s.split(sub).length - 1;

function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1 fiseho, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══════════════════════════════════════════════════════════════════════════
   A — utils/telegram.js : WebP + makeThumb
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/telegram.js';
  let s = load(rel);

  if (s.includes('export async function makeThumb')) {
    console.log('  ⏭  telegram.js : efa voapatch');
  } else {
    s = rep(s,
      'async function compressImage(file, maxWidth = 720, quality = 0.62) {',
      `/**
 * Mahay manoratra WebP ve ny navigateur ? Voamarina INDRAY MANDEHA dia tehirizina.
 * ⚠️ Raha tsy mahay dia mamerina PNG (lehibe kokoa!) ny toBlob — noho izany dia
 *    tsy maintsy hamarinina, fa tsy heverina ho azo.
 */
let _webpOK = null;
function canEncodeWebP() {
  if (_webpOK !== null) return _webpOK;
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    _webpOK = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) { _webpOK = false; }
  return _webpOK;
}

/**
 * Vignette ho an'ny FEED — 360 px (~15 kB) fa tsy 720 px (~60 kB).
 * Mamerina \`null\` raha tsy mety : ny mpiantso dia mitazona \`thumbURL = ''\`
 * ka miverina amin'ny \`mediaURL\` ny feed. Tsy misy fahatapahana.
 */
export async function makeThumb(file, maxWidth = 360) {
  try {
    if (!file || !file.type || !file.type.startsWith('image/')) return null;
    const t = await compressImage(file, maxWidth, 0.60);
    // Tsy mendrika raha tsy mihena mihitsy (sary efa kely)
    if (!t || t.size >= file.size) return null;
    return t;
  } catch (e) { return null; }
}

async function compressImage(file, maxWidth = 720, quality = 0.62) {`,
      'telegram:helpers');

    // WebP ao anaty compressImage
    s = rep(s,
      "      canvas.getContext('2d').drawImage(img, 0, 0, w, h);\n      URL.revokeObjectURL(url);\n      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);",
      `      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // WebP raha azo : ~30 % kely kokoa noho ny JPEG NEFA tsara kokoa ny sary.
      const webp = canEncodeWebP();
      const mime = webp ? 'image/webp' : 'image/jpeg';
      const q    = webp ? 0.72 : quality;
      const name = String(file.name || 'image').replace(/\\.[^.]+$/, '') + (webp ? '.webp' : '.jpg');
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }          // arovana : tsy very ny sary
        resolve(new File([blob], name, { type: mime }));
      }, mime, q);`,
      'telegram:webp');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   B1 — Home.jsx : famoronana ny vignette amin'ny upload
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('makeThumb')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    // import
    const impOld = "import { uploadToTelegram";
    const n = countOf(s, impOld);
    if (n !== 1) throw new Error('ASSERTION FAIL [Home:import] : ' + n + ' fiseho');
    s = s.replace(/import \{ uploadToTelegram([^}]*)\} from '\.\.\/utils\/telegram';/,
      (m, rest) => `import { uploadToTelegram${rest}, makeThumb } from '../utils/telegram';`);
    if (!s.includes('makeThumb } from')) throw new Error('ASSERTION FAIL [Home:import] : tsy tafiditra');

    // Vignette ho an'ny sary tokana
    s = rep(s,
      '    async function publishPost(mediaURL, finalMT) {\n      let thumbURL = \'\';',
      `    async function publishPost(mediaURL, finalMT) {
      let thumbURL = '';
      // ── Vignette FEED (360 px ~15 kB) ho an'ny sary tokana ──────────────
      // Tsy manakana : raha tsy mety dia mijanona foana, dia mediaURL no
      // ampiasain'ny feed toy ny teo aloha.
      if (finalMT === 'image' && mediaFile) {
        try {
          const th = await makeThumb(mediaFile);
          if (th) { const tr = await uploadToTelegram(th); thumbURL = tr.url || ''; }
        } catch (e) { thumbURL = ''; }
      }`,
      'Home:makethumb');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   B2 — Feed : maneho ny vignette (fallback mediaURL)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);
  if (s.includes('post.thumbURL || post.mediaURL')) {
    console.log('  ⏭  Home.jsx (rendu) : efa voapatch');
  } else {
    s = rep(s,
      "post.mediaType==='image' ? <SmartImage src={post.mediaURL} onClick={e=>{e.stopPropagation();openPost(post.id);}}",
      "post.mediaType==='image' ? <SmartImage src={post.thumbURL || post.mediaURL} onClick={e=>{e.stopPropagation();openPost(post.id);}}",
      'Home:rendu');
    save(rel, s);
  }
}

{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);
  if (s.includes('post.thumbURL || post.mediaURL')) {
    console.log('  ⏭  Profile.jsx : efa voapatch');
  } else {
    s = rep(s,
      '? <SmartImage src={post.mediaURL} onClick={()=>navigate(`/post/${post.id}`)} minH={220}',
      '? <SmartImage src={post.thumbURL || post.mediaURL} onClick={()=>navigate(`/post/${post.id}`)} minH={220}',
      'Profile:rendu');
    save(rel, s);
  }
}

{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);
  if (s.includes('post.thumbURL || post.mediaURL')) {
    console.log('  ⏭  GroupPage.jsx : efa voapatch');
  } else {
    s = rep(s,
      '? <SmartImage src={post.mediaURL} onClick={() => setViewerState({ post, index: 0 })} minH={240}',
      '? <SmartImage src={post.thumbURL || post.mediaURL} onClick={() => setViewerState({ post, index: 0 })} minH={240}',
      'GroupPage:rendu');
    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
