/**
 * patch-media-cristal.cjs   —  Fond cristal + sary manontolo (9:16)
 * ─────────────────────────────────────────────────────────────────────────────
 * ENDRIKA (araka ny aperçu nankatoavina) :
 *   • Fond AMBOARINA amin'ny CSS gradient — manga / rose / volomparasy +
 *     voile fitaratra. TSY avy amin'ny sary : tsy misy fampidinana faharoa,
 *     tsy misy blur mandany GPU.
 *   • Sary `object-fit: contain` — MANONTOLO, tsy voatapaka mihitsy.
 *   • Portrait → conteneur 9:16 · paysage → voafetra amin'ny 4:3 (fond kely
 *     ambony/ambany, mba hisy toerana ho an'ny barre manidina).
 *   • Zorony 16 px.
 *
 * FOMBA FANDREFESANA (tsy misy fitaovana ivelany) :
 *   Ny sary dia refesina amin'ny `onLoad` (`naturalWidth/naturalHeight`), dia
 *   voafetra :  9/16 ≤ ratio ≤ 4/3.
 *   Mandra-pahatongan'ny refy dia 4/5 no ampiasaina — tsy misy fitsambikinana
 *   lehibe amin'ny layout.
 *
 * ⚠️ TSY VOAKASIKA : ny faritra manidina rafitra, ny en-tête, ny barre, ny
 *   fitsipika manidina, ny vignette, ny fizotra rehetra. Ny `style` ihany.
 *
 * VOAKASIKA : pages/Home.jsx · Profile.jsx · GroupPage.jsx · index.css
 *
 * Fampandehanana :  node patch-media-cristal.cjs --dry
 *                   node patch-media-cristal.cjs
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

/* ═══ ① CSS : fond cristal (classe mizara) ════════════════════════════ */
{
  const rel = 'src/index.css';
  let s = read(P(rel));
  if (s.includes('.media-cristal')) { console.log('  ⏭  index.css : efa voapatch'); }
  else {
    s += `

/* ── Média cristal — fond AMBOARINA (tsy avy amin'ny sary) ──────────────────
   Tsy misy fampidinana faharoa, tsy misy blur : tsy mandany data na GPU. */
.media-cristal {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(120% 90% at 18% 8%,   rgba(24,119,242,.42) 0%, rgba(24,119,242,0) 62%),
    radial-gradient(110% 85% at 86% 22%,  rgba(255,45,141,.38) 0%, rgba(255,45,141,0) 60%),
    radial-gradient(130% 95% at 50% 100%, rgba(126,90,255,.30) 0%, rgba(126,90,255,0) 66%),
    linear-gradient(160deg, #F3F6FB 0%, #E9EEF7 48%, #F6F1F8 100%);
}
/* Voile fitaratra */
.media-cristal::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(148deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 38%,
              rgba(255,255,255,0) 62%, rgba(255,255,255,.18) 100%);
  mix-blend-mode: screen;
}
.dark .media-cristal {
  background:
    radial-gradient(120% 90% at 18% 8%,   rgba(24,119,242,.30) 0%, rgba(24,119,242,0) 62%),
    radial-gradient(110% 85% at 86% 22%,  rgba(255,45,141,.26) 0%, rgba(255,45,141,0) 60%),
    linear-gradient(160deg, #171A21 0%, #12151B 100%);
}
/* Sary/video : MANONTOLO, tsy voatapaka */
.media-cristal > img, .media-cristal > video {
  position: relative; z-index: 1;
  max-width: 100%; max-height: 100%; width: auto; height: auto;
  object-fit: contain; display: block;
  border-radius: 10px; box-shadow: 0 6px 22px rgba(5,5,5,.18);
}
`;
    save(rel, s);
    console.log('  • index.css : .media-cristal');
  }
}

/* ═══ ② Faritra manidina : classe + aspect dynamique ══════════════════ */
const WRAP = "<div style={{ position:'relative' }}>";
const NEW_WRAP = `<div className="media-cristal" style={{ aspectRatio: mediaRatio[post.id] || '4 / 5' }}>`;

for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  if (s.includes('media-cristal')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  // Ny wrapper AO ANATIN'NY faritra manidina ihany
  const iF = s.indexOf('FARITRA MANIDINA');
  if (iF < 0) fail(name + ' : faritra manidina tsy hita — alefaso aloha ny patch flottant');
  const iW = s.indexOf(WRAP, iF);
  if (iW < 0) fail(name + ' : wrapper tsy hita');
  s = s.slice(0, iW) + NEW_WRAP + s.slice(iW + WRAP.length);

  // State ho an'ny refy
  // ⚠️ Ny elanelana fanalahidiana dia miova isaky ny fichier — tsy raikitra.
  const mSt = s.match(/^ {2}const \[\s*[a-zA-Z]+\s*,\s*set[A-Za-z]+\s*\]\s*=\s*useState\(\{\}\);$/m);
  if (!mSt) fail(name + ' : tsy hita ny toerana ho an\'ny state');
  s = s.replace(mSt[0], mSt[0] +
    "\n  // Refy ny média — voafetra 9/16 → 4/3 (portrait avo, paysage fond kely)\n" +
    "  const [mediaRatio, setMediaRatio] = useState({});\n" +
    "  const onMediaLoad = (id) => (e) => {\n" +
    "    const t = e?.target || {};\n" +
    "    const w = t.naturalWidth || t.videoWidth, h = t.naturalHeight || t.videoHeight;\n" +
    "    if (!w || !h) return;\n" +
    "    const r = Math.min(Math.max(w / h, 9 / 16), 4 / 3);\n" +
    "    setMediaRatio(p => (p[id] === r ? p : { ...p, [id]: r }));\n" +
    "  };");

  // `objectFit:'cover'` → contain AO ANATIN'NY faritra manidina ihany
  const iF2 = s.indexOf('FARITRA MANIDINA');
  const iEnd = s.indexOf('post-actions-row', iF2);
  let seg = s.slice(iF2, iEnd);
  // ⚠️ Ny elanelana aorian'ny « : » dia miova isaky ny fichier (GroupPage dia
  // mampiasa « objectFit: 'cover' »). Regex tolerant no ilaina.
  const before = (seg.match(/objectFit:\s*'cover'/g) || []).length;
  if (before === 0) fail(name + ' : objectFit cover tsy hita ao anaty faritra');
  seg = seg.replace(/objectFit:\s*'cover'/g, "objectFit:'contain'")
           .replace(/maxHeight:\s*'72vh'/g, "maxHeight:'100%'")
           .replace(/maxHeight:\s*520/g, "maxHeight:'100%'")
           .replace(/width:\s*'100%',\s*borderRadius:\s*0/g, "width:'auto', borderRadius:10");
  // onLoad ampiana
  seg = seg.replace(/<SmartImage src=\{([^}]+)\}/g, '<SmartImage onLoad={onMediaLoad(post.id)} src={$1}');
  seg = seg.replace(/<FeedVideo src=\{([^}]+)\}/g, '<FeedVideo onLoadedMetadata={onMediaLoad(post.id)} src={$1}');
  s = s.slice(0, iF2) + seg + s.slice(iEnd);

  console.log('  • ' + name + ' : ' + before + ' média voaova');
  save(rel, s);
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
for (const rel of touched) {
  if (rel.endsWith('.css')) continue;
  const s = files[rel]; const n = rel.split('/').pop();
  if (!s.includes('media-cristal')) fail(n + ' : classe very');
  if (!s.includes('const [mediaRatio, setMediaRatio]')) fail(n + ' : state very');
  if (!s.includes('Math.min(Math.max(w / h, 9 / 16), 4 / 3)')) fail(n + ' : fetra ratio very');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra manidina simba');
  if (!s.includes("post-actions-row")) fail(n + ' : actions very');
}
{
  const c = read(P('src/index.css'));
  const css = files['src/index.css'] || c;
  if (!css.includes('.media-cristal {')) fail('CSS very');
  if (!css.includes('object-fit: contain')) fail('contain very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : média cristal');
touched.forEach(f => console.log('   • ' + f));
