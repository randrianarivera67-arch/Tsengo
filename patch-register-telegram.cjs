/**
 * patch-register-telegram.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * BUT : ny sary PROFIL sy COUVERTURE amin'ny FISORATANA ANARANA dia mandalo
 *       amin'ny Telegram, fa tsy amin'ny Cloudinary intsony.
 *
 * ANTONY :
 *   • Nofoanana ny kaonty Cloudinary → mety TSY MANDEHA ny fametrahana sary
 *     ho an'ny mpisoratra anarana VAOVAO (izy irery no mbola mampiasa azy).
 *   • Ny Telegram dia tsy misy quota, tsy misy fetra bande passante, ary
 *     `cache-control: max-age=31536000, immutable` (voamarina 30/07/2026).
 *   • Lalana TOKANA ho an'ny média manontolo → tsy misy kaonty faharoa
 *     hokarakaraina, tsy misy fetra hafa hotandremana.
 *
 * MITOVY NY ENDRIKA :
 *   uploadToCloudinary(file, folder, onProgress) → { url, ... }
 *   uploadToTelegram(file, onProgress)           → { url, fileId, type }
 *   Ny `.url` ihany no ampiasain'ny Register → tsy misy fanovana hafa.
 *
 * TOMBONY FANAMPINY : ny `uploadToTelegram` dia manao `compressImage` (720 px)
 *   ho azy. Ny lalana Cloudinary dia nandefa ny fichier TANY AM-BOALOHANY.
 *
 * TSY VOAKASIKA : ny avatar EFA MISY (URL Cloudinary voatahiry ao amin'ny
 *   Firestore) — mbola mandeha tsara izy ireo (voamarina : HTTP 200).
 *   Tsy misy migration atao, tsy misy avatar very.
 *
 * Fampandehanana :  node patch-register-telegram.cjs --dry
 *                   node patch-register-telegram.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Register.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/pages/Register.jsx');
  console.error("   Mandehana ao amin'ny racine an'ny frontend (cd ~/Tsengo-fresh).");
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');

if (s.includes('uploadToTelegram')) {
  console.log('⏭  Register.jsx : efa voapatch');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 220) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── 1) Import ───────────────────────────────────────────────────────────── */
s = rep(s,
  "import { uploadToCloudinary } from '../utils/cloudinary';",
  "import { uploadToTelegram } from '../utils/telegram';",
  'import');

/* ── 2) Sary profil ──────────────────────────────────────────────────────── */
s = rep(s,
  "          const r = await uploadToCloudinary(profileFile, 'trengo/avatars', p => setUploadPct(p));",
  "          const r = await uploadToTelegram(profileFile, p => setUploadPct(p));",
  'avatar');

/* ── 3) Sary couverture ──────────────────────────────────────────────────── */
s = rep(s,
  "          const r = await uploadToCloudinary(coverFile, 'trengo/covers', p => setUploadPct(p));",
  "          const r = await uploadToTelegram(coverFile, p => setUploadPct(p));",
  'cover');

/* ── 4) Fanamarinana farany ──────────────────────────────────────────────── */
if (s.includes('uploadToCloudinary')) {
  throw new Error('FAIL : mbola misy uploadToCloudinary ao amin\'ny Register.jsx');
}
if (s.includes("utils/cloudinary")) {
  throw new Error('FAIL : mbola misy import cloudinary');
}
if (countOf(s, 'uploadToTelegram') !== 3) {
  throw new Error('FAIL : nandrasana 3 uploadToTelegram (import + 2 antso), nahitana ' +
    countOf(s, 'uploadToTelegram'));
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 3 mety (tsy nisy nosoratana)'
  : "✅ Patch vita : Register.jsx → Telegram (Cloudinary tsy ampiasain'ny app intsony)");
