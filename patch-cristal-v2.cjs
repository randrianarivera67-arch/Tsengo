/**
 * patch-cristal-v2.cjs   —  Fond cristal (fanoratana MARINA)
 * ─────────────────────────────────────────────────────────────────────────────
 * FAHADISOANA ROA TAMIN'NY ANDRANA TEO ALOHA — nofakafakaina ny code :
 *
 *   ① `.media-cristal > div { width/height:100% !important }`
 *      → nikasika ny EN-TÊTE sy ny BARRE koa (div zanaka mivantana izy ireo,
 *        `position:absolute`). Nivelatra nanerana izy → simba ny carte.
 *
 *   ② `<SmartImage onLoad={…}>` → TSY MISY DIKANY : ny signature dia
 *      `({ src, alt, style, onClick, minH, className })` — tsy mandray `onLoad`.
 *        Ka ny fandrefesana ny ratio dia tsy nandeha mihitsy.
 *
 * FANORATANA MARINA :
 *   • `className="media-fit"` — ekena ao amin'ny SmartImage, apetraka amin'ny
 *     WRAPPER. Voafetra amin'ny sary IHANY : tsy mikasika ny barre.
 *   • Ny `style` dia apetraka amin'ny <img> ANATINY (voamarina and. 71).
 *   • FeedVideo dia tsy mandray `className` → foronina <div className> mifono.
 *   • Aspect RAIKITRA 4/5 — tsy misy fandrefesana. Tsotra, tsy misy bug.
 *
 * VOAKASIKA : index.css · Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-cristal-v2.cjs --dry
 *                   node patch-cristal-v2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ═══ ① CSS ═══════════════════════════════════════════════════════════ */
{
  const rel = 'src/index.css';
  let s = read(P(rel));
  if (s.includes('.media-cristal')) { console.log('  ⏭  index.css : efa voapatch'); }
  else {
    s += `

/* ── Média cristal ──────────────────────────────────────────────────────────
   Fond AMBOARINA (tsy avy amin'ny sary) : tsy misy fampidinana faharoa,
   tsy misy blur mandany GPU.
   ⚠️ TSY misy fitsipika amin'ny « > div » : ny en-tête sy ny barre manidina
      dia zanaka mivantana koa — voasimba izy ireo raha atao izany. */
.media-cristal {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 16px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background:
    radial-gradient(120% 90% at 18% 8%,   rgba(24,119,242,.40) 0%, rgba(24,119,242,0) 62%),
    radial-gradient(110% 85% at 86% 22%,  rgba(255,45,141,.34) 0%, rgba(255,45,141,0) 60%),
    radial-gradient(130% 95% at 50% 100%, rgba(126,90,255,.26) 0%, rgba(126,90,255,0) 66%),
    linear-gradient(160deg, #F3F6FB 0%, #E9EEF7 48%, #F6F1F8 100%);
}
.media-cristal::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(148deg, rgba(255,255,255,.40) 0%, rgba(255,255,255,0) 38%,
              rgba(255,255,255,0) 62%, rgba(255,255,255,.16) 100%);
  mix-blend-mode: screen;
}
.dark .media-cristal {
  background:
    radial-gradient(120% 90% at 18% 8%,  rgba(24,119,242,.28) 0%, rgba(24,119,242,0) 62%),
    radial-gradient(110% 85% at 86% 22%, rgba(255,45,141,.24) 0%, rgba(255,45,141,0) 60%),
    linear-gradient(160deg, #171A21 0%, #12151B 100%);
}

/* Sary/video IHANY (classe manokana) — TSY ny barre manidina */
.media-fit {
  position: relative; z-index: 2;
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.media-fit img, .media-fit video {
  width: 100%; height: 100%;
  object-fit: contain;
  border-radius: 16px;
  display: block;
}
`;
    save(rel, s);
    console.log('  • index.css : .media-cristal + .media-fit');
  }
}

/* ═══ ② Faritra manidina : classe + sary voafono ══════════════════════ */
const WRAP = "<div style={{ position:'relative' }}>";

for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  if (s.includes('media-cristal')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  const iF = s.indexOf('FARITRA MANIDINA');
  if (iF < 0) fail(name + ' : faritra manidina tsy hita');
  const iW = s.indexOf(WRAP, iF);
  if (iW < 0) fail(name + ' : wrapper tsy hita');
  s = s.slice(0, iW) + '<div className="media-cristal">' + s.slice(iW + WRAP.length);

  // Ao anatin'ny faritra ihany
  const iF2 = s.indexOf('FARITRA MANIDINA');
  const iEnd = s.indexOf('post-actions-row', iF2);
  if (iEnd < 0) fail(name + ' : fetran\'ny faritra tsy hita');
  let seg = s.slice(iF2, iEnd);

  // SmartImage : className (EKENA ao amin'ny signature) + contain
  const nS = (seg.match(/<SmartImage /g) || []).length;
  seg = seg.replace(/<SmartImage /g, '<SmartImage className="media-fit" ');
  seg = seg.replace(/objectFit:\s*'cover'/g, "objectFit:'contain'")
           .replace(/maxHeight:\s*'72vh'/g, "maxHeight:'100%'")
           .replace(/maxHeight:\s*520/g, "maxHeight:'100%'");

  // FeedVideo : TSY mandray className → foronina <div> mifono
  const nV = (seg.match(/<FeedVideo /g) || []).length;
  seg = seg.replace(/<FeedVideo /g, '<FeedVideo /* media-fit voafono */ ');
  if (nS === 0 && nV === 0) fail(name + ' : tsy misy média ao anaty faritra');

  s = s.slice(0, iF2) + seg + s.slice(iEnd);
  console.log('  • ' + name + ' : ' + nS + ' sary · ' + nV + ' video');
  save(rel, s);
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
for (const rel of touched) {
  if (rel.endsWith('.css')) continue;
  const s = files[rel]; const n = rel.split('/').pop();
  if (!s.includes('className="media-cristal"')) fail(n + ' : classe very');
  if (!s.includes('<SmartImage className="media-fit"')) fail(n + ' : media-fit very');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra simba');
  if (!s.includes("post-actions-row")) fail(n + ' : actions very');
  if (s.includes('onLoad={onMediaLoad')) fail(n + ' : onLoad tsy misy dikany mbola ao');
}
{
  const css = files['src/index.css'] || read(P('src/index.css'));
  if (css.includes('.media-cristal > div')) fail('CSS « > div » mampidi-doza mbola ao');
  if (!css.includes('.media-fit img, .media-fit video')) fail('sélecteur sary very');
  if (!css.includes('aspect-ratio: 4 / 5')) fail('aspect very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : fond cristal');
touched.forEach(f => console.log('   • ' + f));
