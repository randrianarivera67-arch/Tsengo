/**
 * patch-media-plein-2.cjs   —  Sary mivelatra + zorony 16 px + video → Reels
 * ─────────────────────────────────────────────────────────────────────────────
 * ① SARY TSY MIVELATRA :
 *    Ny CSS dia `max-width:100%; max-height:100%; width:auto; height:auto`.
 *    → Ny sary KELY kokoa noho ny conteneur dia MIJANONA KELY, tsy mitombo.
 *    Voahitsy : `width:100%; height:100%; object-fit:contain` — mameno ny
 *    conteneur foana, tsy voatapaka, tsy voatarika.
 *
 * ② ZORONY 10 → 16 px amin'ny sary ao anaty fond (mitovy amin'ny fond).
 *
 * ③ VIDEO AO AMIN'NY GROUPE : ny clic dia manokatra `viewerState` fa tsy
 *    mankany amin'ny Reels — tsy mitovy amin'ny fil.
 *    → `onOpenReels` toy ny Home. (Ny Profile dia EFA mankany amin'ny Reels
 *      — voamarina, tsy voakasika.)
 *
 * VOAKASIKA : index.css · pages/GroupPage.jsx
 *
 * Fampandehanana :  node patch-media-plein-2.cjs --dry
 *                   node patch-media-plein-2.cjs
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

/* ═══ ① + ② CSS ═══════════════════════════════════════════════════════ */
{
  const rel = 'src/index.css';
  let s = read(P(rel));
  if (s.includes('/* mameno ny conteneur */')) { console.log('  ⏭  index.css : efa voapatch'); }
  else {
    const OLD = `.media-cristal > img, .media-cristal > video {
  position: relative; z-index: 1;
  max-width: 100%; max-height: 100%; width: auto; height: auto;
  object-fit: contain; display: block;
  border-radius: 10px; box-shadow: 0 6px 22px rgba(5,5,5,.18);
}`;
    if (s.split(OLD).length - 1 !== 1) fail('bloc CSS média tsy hita');
    s = s.replace(OLD, `.media-cristal > img, .media-cristal > video {
  position: relative; z-index: 1;
  /* mameno ny conteneur */
  /* ⚠️ \`max-width/height\` + \`width:auto\` dia TSY mampitombo ny sary kely —
     mijanona kely izy. \`width/height: 100%\` + \`contain\` no mameno tsara. */
  width: 100%; height: 100%;
  object-fit: contain; display: block;
  border-radius: 16px; box-shadow: 0 6px 22px rgba(5,5,5,.18);
}`);
    save(rel, s);
    console.log('  • index.css : mivelatra + zorony 16 px');
  }
}

/* ═══ ③ GroupPage : video → Reels ═════════════════════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = read(P(rel));
  if (s.includes('onOpenReels')) { console.log('  ⏭  GroupPage.jsx : efa voapatch'); }
  else {
    const iF = s.indexOf('FARITRA MANIDINA');
    if (iF < 0) fail('faritra manidina tsy hita');
    const iV = s.indexOf('<FeedVideo onLoadedMetadata={onMediaLoad(post.id)}', iF);
    if (iV < 0) fail('FeedVideo ao anaty faritra tsy hita');
    // Fetran'ny balise
    const iEnd = s.indexOf('/>', iV);
    if (iEnd < 0) fail('fiafaran\'ny FeedVideo tsy hita');
    const tag = s.slice(iV, iEnd);
    if (tag.includes('onOpenReels')) fail('efa misy onOpenReels');
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
  if (!css.includes('width: 100%; height: 100%;')) fail('CSS mivelatra very');
  if (!css.includes('border-radius: 16px; box-shadow')) fail('zorony 16 px very');
  if (css.includes('width: auto; height: auto;')) fail('CSS taloha mbola ao');

  const g = files['src/pages/GroupPage.jsx'] || read(P('src/pages/GroupPage.jsx'));
  if (!g.includes("onOpenReels={() => navigate('/reels'")) fail('GroupPage : Reels very');
  if (!g.includes('onLoadedMetadata={onMediaLoad(post.id)}')) fail('GroupPage : onLoad simba');
  if (!g.includes('FARITRA MANIDINA')) fail('GroupPage : faritra simba');

  const p = read(P('src/pages/Profile.jsx'));
  if (!p.includes("onClick={()=>navigate('/reels'")) fail('Profile : Reels very (tsy tokony voakasika)');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
