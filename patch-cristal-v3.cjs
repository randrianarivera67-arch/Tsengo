/**
 * patch-cristal-v3.cjs   —  Sary mivelatra + zorony 16 px + Reels (groupe)
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (nofakafakaina) :
 *   Ny `SmartImage` dia mametraka STYLE INLINE :
 *     • wrapper : width: style.width || '100%', borderRadius: radius, overflow
 *     • <img>   : {...style} (ka `borderRadius:0`, `width:'100%'`…)
 *   Ny style inline dia MANDRESY ny feuille de style. Ka ny fitsipika
 *   `.media-fit img { border-radius:16px }` dia tsy nihatra.
 *
 * FANITSIANA :
 *   `!important` amin'ny `.media-fit` IHANY — classe manokana apetraka amin'ny
 *   sary ao anaty faritra manidina. TSY mikasika ny en-tête na ny barre
 *   (izay tsy manana io classe io) — io no fahadisoana lehibe teo aloha.
 *
 *   ⚠️ TSY MISY `> div` na sélecteur malalaka. Voafetra tsara.
 *
 * ③ VIDEO AO AMIN'NY GROUPE → Reels (mitovy amin'ny fil).
 *
 * VOAKASIKA : index.css · GroupPage.jsx
 *
 * Fampandehanana :  node patch-cristal-v3.cjs --dry
 *                   node patch-cristal-v3.cjs
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

/* ═══ ① CSS : !important voafetra amin'ny .media-fit ══════════════════ */
{
  const rel = 'src/index.css';
  let s = read(P(rel));
  if (s.includes('/* inline > CSS */')) { console.log('  ⏭  index.css : efa voapatch'); }
  else {
    const OLD = `.media-fit {
  position: relative; z-index: 2;
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.media-fit img, .media-fit video {
  width: 100%; height: 100%;
  object-fit: contain;
  border-radius: 16px;
  display: block;
}`;
    if (s.split(OLD).length - 1 !== 1) fail('bloc .media-fit tsy hita');
    s = s.replace(OLD, `/* inline > CSS */
/* ⚠️ Ny SmartImage dia mametraka style INLINE amin'ny wrapper sy ny <img>
   (width, borderRadius…). Ny inline dia MANDRESY ny feuille de style, ka
   « !important » no ilaina.
   Voafetra amin'ny « .media-fit » IHANY : ny en-tête sy ny barre manidina
   dia TSY manana io classe io — tsy voakasika mihitsy. */
.media-fit {
  position: relative !important; z-index: 2;
  width: 100% !important; height: 100% !important;
  min-height: 0 !important; max-height: none !important;
  border-radius: 16px !important; overflow: hidden !important;
  background: transparent !important;
  display: flex !important; align-items: center; justify-content: center;
}
.media-fit img, .media-fit video {
  width: 100% !important; height: 100% !important;
  max-width: none !important; max-height: none !important;
  object-fit: contain !important;
  border-radius: 16px !important;
  display: block !important;
}`);
    save(rel, s);
    console.log('  • index.css : !important voafetra');
  }
}

/* ═══ ② GroupPage : video → Reels ═════════════════════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = read(P(rel));
  if (s.includes('onOpenReels')) { console.log('  ⏭  GroupPage.jsx : efa voapatch'); }
  else {
    const iF = s.indexOf('FARITRA MANIDINA');
    if (iF < 0) fail('faritra manidina tsy hita');
    const iV = s.indexOf('<FeedVideo', iF);
    if (iV < 0) fail('FeedVideo ao anaty faritra tsy hita');
    const iEnd = s.indexOf('/>', iV);
    if (iEnd < 0) fail('fiafaran\'ny FeedVideo tsy hita');
    const tag = s.slice(iV, iEnd);
    if (tag.includes('onOpenReels')) fail('efa misy onOpenReels');
    if (!tag.includes('src={post.mediaURL}')) fail('FeedVideo diso (tsy ny média fototra)');
    s = s.slice(0, iV) +
        tag.replace('<FeedVideo ', "<FeedVideo onOpenReels={() => navigate('/reels', { state: { startId: post.id } })} ") +
        s.slice(iEnd);
    save(rel, s);
    console.log('  • GroupPage.jsx : video → Reels');
  }
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
{
  const css = files['src/index.css'] || read(P('src/index.css'));
  // ⚠️ Fanamarinana LEHIBE : tsy misy sélecteur malalaka mampidi-doza
  const lignes = css.split('\n').filter(l => !l.trim().startsWith('/*') && !l.trim().startsWith('*'));
  const code = lignes.join('\n');
  if (/\.media-cristal\s*>\s*div/.test(code)) fail('sélecteur « .media-cristal > div » mampidi-doza');
  if (!css.includes('.media-fit img, .media-fit video')) fail('sélecteur sary very');
  if (!css.includes('border-radius: 16px !important')) fail('zorony very');
  if (!css.includes('object-fit: contain !important')) fail('contain very');
  if (!css.includes('.media-cristal {')) fail('fond very');

  const g = files['src/pages/GroupPage.jsx'] || read(P('src/pages/GroupPage.jsx'));
  if (!g.includes("onOpenReels={() => navigate('/reels'")) fail('GroupPage : Reels very');
  if (!g.includes('className="media-cristal"')) fail('GroupPage : cristal simba');
  if (!g.includes('FARITRA MANIDINA')) fail('GroupPage : faritra simba');

  const p = read(P('src/pages/Profile.jsx'));
  if (!p.includes("navigate('/reels'")) fail('Profile : Reels very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
