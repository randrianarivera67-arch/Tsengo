/**
 * patch-lite-1b-multiphoto.cjs   —  DINGANA 1b : vignette ho an'ny SARY MARO
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ALEFA IHANY RAHA VOAMARINA FA MANDEHA NY FAMOAHANA SARY TOKANA
 *    aorian'ny `patch-lite-1-fix-webp.cjs`. Mikitika ny lalana upload io patch io.
 *
 * BUT : ny publication misy sary 2–10 dia aseho amin'ny grille (~180 px isaky ny
 *       sela) nefa sary 720 px no ampidinina isaky ny iray. Very 4×, ary
 *       miampy araka ny isan'ny sary.
 *       → Amboarina vignette 360 px isaky ny sary → `thumbURLs[]`.
 *
 * FIAROVANA :
 *   • `thumbURLs` mifanandrify amin'ny index amin'ny `mediaURLs`. Raha tsy mety
 *     ny vignette iray dia `''` no apetraka — tsy mifindra ny index.
 *   • Publication TALOHA tsy manana `thumbURLs` → `undefined` → miverina amin'ny
 *     `mediaURLs`. Tsy misy tapaka, tsy misy migration.
 *   • Ny `onOpen(u)` dia mitondra ny URL TANY AM-BOALOHANY foana, na dia vignette
 *     aza no aseho. Zava-dehibe : ny PostDetail dia manao
 *     `mediaURLs.indexOf(u)` — raha vignette no alefa dia -1 ny valiny.
 *   • Ny PostDetail dia TSY mandefa `thumbs` (kalitao feno ao amin'ny detail).
 *
 * FICHIERS : PhotoCarousel.jsx (composant), Home.jsx + GroupPage.jsx (upload),
 *            Home/Profile/GroupPage (rendu feed — 6 toerana)
 *
 * Fampandehanana :  node patch-lite-1b-multiphoto.cjs --dry
 *                   node patch-lite-1b-multiphoto.cjs
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
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 220) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══════════════════════════════════════════════════════════════════════════
   1 — PhotoCarousel : maneho ny vignette, manokatra amin'ny URL feno
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/PhotoCarousel.jsx';
  let s = load(rel);

  if (s.includes('pairPhotos')) {
    console.log('  ⏭  PhotoCarousel.jsx : efa voapatch');
  } else {
    s = rep(s,
      `export default function PhotoCarousel({ urls = [], onOpen }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const n = list.length;
  if (!n) return null;
  const open = (u) => (e) => { e.stopPropagation(); onOpen && onOpen(u); };`,
      `/**
 * Mampifanandrify ny URL feno sy ny vignette.
 * @returns {{u:string,d:string}[]}  u = URL feno (onOpen) · d = aseho (vignette)
 *
 * ZAVA-DEHIBE : ny \`u\` dia mitazona ny URL TANY AM-BOALOHANY foana. Ny mpiantso
 * sasany (PostDetail) dia manao \`mediaURLs.indexOf(u)\` — raha vignette no
 * alefa dia -1 ny valiny, ka diso ny sary sokafana.
 */
export function pairPhotos(urls, thumbs) {
  const U = Array.isArray(urls) ? urls : [];
  const T = Array.isArray(thumbs) ? thumbs : [];
  const out = [];
  for (let i = 0; i < U.length; i++) {
    const u = U[i];
    if (!u) continue;                       // index tsy mifindra : T[i] mifanaraka
    out.push({ u, d: T[i] || u });          // tsy misy vignette → sary feno
  }
  return out;
}

export default function PhotoCarousel({ urls = [], thumbs = [], onOpen }) {
  const list = pairPhotos(urls, thumbs);
  const n = list.length;
  if (!n) return null;
  const open = (u) => (e) => { e.stopPropagation(); onOpen && onOpen(u); };`,
      'carousel:head');

    s = rep(s,
      `  const Cell = ({ u, style, badge }) => (
    <div onClick={open(u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', ...style }}>
      <Img u={u} />`,
      `  const Cell = ({ p, style, badge }) => (
    <div onClick={open(p.u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', ...style }}>
      <Img u={p.d} />`,
      'carousel:cell');

    s = rep(s,
      `      <div onClick={open(list[0])} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', maxHeight: 520 }}>
        <Img u={list[0]} />`,
      `      <div onClick={open(list[0].u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', maxHeight: 520 }}>
        <Img u={list[0].d} />`,
      'carousel:n1');

    s = rep(s, '<Cell u={list[0]} /><Cell u={list[1]} />',
              '<Cell p={list[0]} /><Cell p={list[1]} />', 'carousel:n2');

    s = rep(s,
      `        <Cell u={list[0]} style={{ gridColumn: '1 / span 2' }} />
        <Cell u={list[1]} /><Cell u={list[2]} />`,
      `        <Cell p={list[0]} style={{ gridColumn: '1 / span 2' }} />
        <Cell p={list[1]} /><Cell p={list[2]} />`,
      'carousel:n3');

    s = rep(s,
      `      {shown.map((u, i) => (
        <Cell key={i} u={u} badge={i === 3 && rest > 0 ? rest : null} />
      ))}`,
      `      {shown.map((p, i) => (
        <Cell key={i} p={p} badge={i === 3 && rest > 0 ? rest : null} />
      ))}`,
      'carousel:n4');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — Home.jsx : upload vignette + rendu
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('thumbURLs')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    s = rep(s,
      `        const urls = [];
        for (let i = 0; i < multiPhotos.length; i++) {
          const r = await uploadToTelegram(multiPhotos[i], pct => setUploadPct(Math.round(((i + pct / 100) / multiPhotos.length) * 100)));
          urls.push(r.url);
        }`,
      `        const urls = [];
        const thumbs = [];
        for (let i = 0; i < multiPhotos.length; i++) {
          const r = await uploadToTelegram(multiPhotos[i], pct => setUploadPct(Math.round(((i + pct / 100) / multiPhotos.length) * 100)));
          urls.push(r.url);
          // Vignette feed (360 px) — tsy manakana : raha tsy mety dia '' no
          // apetraka, ka ny sary feno no ampiasain'ny grille.
          let tu = '';
          try {
            const th = await makeThumb(multiPhotos[i]);
            if (th) { const tr = await uploadToTelegram(th); tu = tr.url || ''; }
          } catch (e) { tu = ''; }
          thumbs.push(tu);
        }`,
      'Home:upload');

    // Firestore + optimistic
    s = rep(s,
      "          ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '',",
      "          ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURLs: thumbs, thumbURL: thumbs[0] || '',",
      'Home:addDoc');

    s = rep(s,
      "        setFeedRaw(prev => [{ id: postRef.id, ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '',",
      "        setFeedRaw(prev => [{ id: postRef.id, ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURLs: thumbs, thumbURL: thumbs[0] || '',",
      'Home:optimistic');

    // Rendu feed
    s = rep(s,
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} onOpen={() => openPost(post.sharedFrom.id)} />',
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} thumbs={post.sharedFrom.thumbURLs} onOpen={() => openPost(post.sharedFrom.id)} />',
      'Home:rendu-shared');

    s = rep(s,
      '<PhotoCarousel urls={post.mediaURLs} onOpen={() => openPost(post.id)} />',
      '<PhotoCarousel urls={post.mediaURLs} thumbs={post.thumbURLs} onOpen={() => openPost(post.id)} />',
      'Home:rendu');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 — GroupPage.jsx : upload vignette + rendu
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);

  if (s.includes('thumbURLs')) {
    console.log('  ⏭  GroupPage.jsx : efa voapatch');
  } else {
    // import makeThumb
    if (!/import \{[^}]*makeThumb/.test(s)) {
      const before = s;
      s = s.replace(/import \{ uploadToTelegram([^}]*)\} from '\.\.\/utils\/telegram';/,
        (m, rest) => `import { uploadToTelegram${rest}, makeThumb } from '../utils/telegram';`);
      if (s === before) throw new Error('ASSERTION FAIL [Group:import] : tsy hita ny import telegram');
    }

    s = rep(s,
      `        const urls = [];
        for (let i = 0; i < multiPhotos.length; i++) {
          const r = await uploadToTelegram(multiPhotos[i]);
          urls.push(r.url);
        }
        await finalizePublish(content, urls[0], 'image', '', urls);`,
      `        const urls = [];
        const thumbs = [];
        for (let i = 0; i < multiPhotos.length; i++) {
          const r = await uploadToTelegram(multiPhotos[i]);
          urls.push(r.url);
          let tu = '';
          try {
            const th = await makeThumb(multiPhotos[i]);
            if (th) { const tr = await uploadToTelegram(th); tu = tr.url || ''; }
          } catch (e) { tu = ''; }
          thumbs.push(tu);
        }
        await finalizePublish(content, urls[0], 'image', thumbs[0] || '', urls, thumbs);`,
      'Group:upload');

    // finalizePublish : parametre fanampiny
    s = rep(s,
      '  async function finalizePublish(caption, mediaURL, finalMT, thumbURL, mediaURLs) {',
      '  async function finalizePublish(caption, mediaURL, finalMT, thumbURL, mediaURLs, thumbURLs) {',
      'Group:signature');

    s = rep(s,
      '      ...(Array.isArray(mediaURLs) && mediaURLs.length > 1 ? { mediaURLs } : {}),',
      '      ...(Array.isArray(mediaURLs) && mediaURLs.length > 1 ? { mediaURLs } : {}),\n      ...(Array.isArray(thumbURLs) && thumbURLs.length > 1 ? { thumbURLs } : {}),',
      'Group:champ');

    s = rep(s,
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} onOpen={() => navigate(`/post/${post.sharedFrom.id}`)} />',
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} thumbs={post.sharedFrom.thumbURLs} onOpen={() => navigate(`/post/${post.sharedFrom.id}`)} />',
      'Group:rendu-shared');

    s = rep(s,
      '<PhotoCarousel urls={post.mediaURLs} onOpen={() => setViewerState({ post, index: 0 })} />',
      '<PhotoCarousel urls={post.mediaURLs} thumbs={post.thumbURLs} onOpen={() => setViewerState({ post, index: 0 })} />',
      'Group:rendu');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 — Profile.jsx : rendu feed
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);

  if (s.includes('thumbs={post.thumbURLs}')) {
    console.log('  ⏭  Profile.jsx : efa voapatch');
  } else {
    s = rep(s,
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} onOpen={()=>navigate(`/post/${post.sharedFrom.id}`)} />',
      '<PhotoCarousel urls={post.sharedFrom.mediaURLs} thumbs={post.sharedFrom.thumbURLs} onOpen={()=>navigate(`/post/${post.sharedFrom.id}`)} />',
      'Profile:rendu-shared');

    s = rep(s,
      '<PhotoCarousel urls={post.mediaURLs} onOpen={()=>navigate(`/post/${post.id}`)} />',
      '<PhotoCarousel urls={post.mediaURLs} thumbs={post.thumbURLs} onOpen={()=>navigate(`/post/${post.id}`)} />',
      'Profile:rendu');

    save(rel, s);
  }
}

/* ── Fanamarinana : ny PostDetail dia TSY mandefa thumbs ─────────────────── */
{
  const pd = read(P('src/pages/PostDetail.jsx'));
  if (pd.includes('thumbs={')) {
    throw new Error('FAIL : ny PostDetail dia tsy tokony handefa `thumbs` — ' +
      'ny onOpen(u) ao aminy dia manao mediaURLs.indexOf(u).');
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
