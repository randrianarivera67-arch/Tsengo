/**
 * patch-lite-1-fix-webp.cjs   —  FANITSIANA MAIKA
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : "Erreur lors de la publication" amin'ny sary rehetra, ary miseho
 *         "Autocollant" ao amin'ny Telegram.
 *
 * FOTOTRA : ny Telegram dia mamantatra ny fichier `.webp` ho **sticker**
 *         (autocollant) fa tsy document. Ny file_id sticker dia tsy mitovy
 *         fitondrana amin'ny document, ka mianjera ny fizotra famoahana.
 *         Fahadisoana tamin'ny patch `patch-lite-1-thumbnails.cjs` (ampahany A).
 *
 * FANITSIANA : miverina amin'ny JPEG ho an'ny fanoratana.
 *
 * NOTAZONINA : ny VIGNETTE 360 px (ampahany B) — izy no tena tombony
 *         (sary 4× kely amin'ny feed). JPEG q 0.62 izy izao, tsy WebP.
 *         Tsy misy fanovana ao amin'ny rendu — `thumbURL || mediaURL` mitohy.
 *
 * VOKANY : miverina ~60 kB ny sary feno (fa tsy 40 kB), fa mandeha indray ny
 *         famoahana. Ny vignette ~18 kB dia mitazona ny tombony lehibe indrindra.
 *
 * Fampandehanana :  node patch-lite-1-fix-webp.cjs --dry
 *                   node patch-lite-1-fix-webp.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/utils/telegram.js');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/utils/telegram.js');
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');

if (!s.includes('canEncodeWebP')) {
  console.log('⏭  telegram.js : tsy misy WebP intsony (efa voahitsy)');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 260) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── 1) Esorina ny fanamarinana WebP (tsy ilaina intsony) ────────────────── */
s = rep(s,
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

`,
  '',
  'esory:canEncodeWebP');

/* ── 2) Miverina amin'ny JPEG ────────────────────────────────────────────── */
s = rep(s,
  `      // WebP raha azo : ~30 % kely kokoa noho ny JPEG NEFA tsara kokoa ny sary.
      const webp = canEncodeWebP();
      const mime = webp ? 'image/webp' : 'image/jpeg';
      const q    = webp ? 0.72 : quality;
      const name = String(file.name || 'image').replace(/\\.[^.]+$/, '') + (webp ? '.webp' : '.jpg');
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }          // arovana : tsy very ny sary
        resolve(new File([blob], name, { type: mime }));
      }, mime, q);`,
  `      // ⚠️ JPEG IHANY — TSY WebP.
      // Ny Telegram dia mamantatra ny .webp ho AUTOCOLLANT (sticker) fa tsy
      // document, ka mianjera ny famoahana. Voatsapa tamin'ny 30/07/2026.
      const name = String(file.name || 'image').replace(/\\.[^.]+$/, '') + '.jpg';
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }          // arovana : tsy very ny sary
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);`,
  'jpeg:toBlob');

/* ── 3) Fanamarinana farany ──────────────────────────────────────────────── */
if (s.includes('image/webp')) {
  throw new Error('FAIL : mbola misy "image/webp" ao amin\'ny fichier');
}
if (!s.includes('export async function makeThumb')) {
  throw new Error('FAIL : very ny makeThumb — tsy tokony hitranga');
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 2 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : src/utils/telegram.js → JPEG (vignette 360 px notazonina)');
