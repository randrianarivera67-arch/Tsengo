/**
 * patch-couverture-nette.cjs   —  Photo de couverture mazava
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (nokajiana) :
 *   Ny couverture dia aseho MANERANA NY SAKANY. Amin'ny écran 1080 px DPR 2,75
 *   dia ~2 970 pixels MARINA no ilaina — nefa 1 080 px ny loharano.
 *   Voatarika 2,75× → manjavozavo.
 *
 *   ⚠️ Ny AVATAR (100 px aseho) dia TSY VOAKASIKA — ampy be ny 1 080.
 *
 * FANOVANA :
 *   `uploadToTelegram(file, onProgress)` → ampiana paramètre `maxWidth`.
 *   Ny couverture dia alefa amin'ny 1600 px (~2 900 px marina amin'ny DPR 1,8 —
 *   ampy ho an'ny bandeau, ary tsy mavesatra loatra).
 *
 *   ⚠️ Ny antso hafa REHETRA dia tsy voakasika : `maxWidth` tsy voatondro →
 *      1080 toy ny teo aloha.
 *
 * VOAKASIKA : utils/telegram.js · pages/Profile.jsx
 *
 * Fampandehanana :  node patch-couverture-nette.cjs --dry
 *                   node patch-couverture-nette.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ── ① telegram.js : paramètre maxWidth ── */
{
  const rel = 'src/utils/telegram.js';
  let s = read(P(rel));
  if (s.includes('uploadToTelegram(file, onProgress, maxWidth)')) { console.log('  ⏭  telegram.js : efa voapatch'); }
  else {
    const OLD = `export async function uploadToTelegram(file, onProgress) {
  if (file.type.startsWith('image/')) file = await compressImage(file);`;
    if (s.split(OLD).length - 1 !== 1) fail('uploadToTelegram tsy hita');
    s = s.replace(OLD, `export async function uploadToTelegram(file, onProgress, maxWidth) {
  // \`maxWidth\` tsy voatondro → 1080 (default \`compressImage\`) : tsy miova ny
  // antso rehetra efa misy. Ny couverture ihany no mangataka bebe kokoa.
  if (file.type.startsWith('image/')) file = await compressImage(file, maxWidth || 1080);`);
    files[rel] = s; touched.push(rel);
    console.log('  • telegram.js : paramètre maxWidth');
  }
}

/* ── ② Profile.jsx : couverture 1600 px ── */
{
  const rel = 'src/pages/Profile.jsx';
  let s = read(P(rel));
  if (s.includes('uploadToTelegram(file, undefined, 1600)')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    // Ny antso AKAIKIN'NY `coverURL` ihany
    const iC = s.indexOf("coverURL: r.url");
    if (iC < 0) fail('coverURL tsy hita');
    const iU = s.lastIndexOf('const r = await uploadToTelegram(file);', iC);
    if (iU < 0) fail('antso couverture tsy hita');
    if (iC - iU > 400) fail('antso lavitra loatra amin\'ny coverURL — mety diso');
    s = s.slice(0, iU) +
        'const r = await uploadToTelegram(file, undefined, 1600);   // couverture : manerana ny sakany' +
        s.slice(iU + 'const r = await uploadToTelegram(file);'.length);
    files[rel] = s; touched.push(rel);
    console.log('  • Profile.jsx : couverture 1600 px');
  }
}

/* ── Fanamarinana ── */
{
  const t = files['src/utils/telegram.js'] || read(P('src/utils/telegram.js'));
  if (!t.includes('maxWidth || 1080')) fail('default 1080 very');
  if (!t.includes("'image/jpeg'")) fail('JPEG very (WebP = sticker Telegram)');
  const p = files['src/pages/Profile.jsx'] || read(P('src/pages/Profile.jsx'));
  if ((p.match(/uploadToTelegram\(file, undefined, 1600\)/g) || []).length !== 1) fail('couverture tsy tokana');
  if (!p.includes('makeThumb(file, 160)')) fail('vignette avatar very');
  if (!p.includes('photoURL: r.url, photoThumb: thumb')) fail('avatar voakasika (tsy tokony)');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : couverture mazava');
touched.forEach(f => console.log('   • ' + f));
