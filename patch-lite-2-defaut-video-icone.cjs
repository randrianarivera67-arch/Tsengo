/**
 * patch-lite-2-defaut-video-icone.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ASA TELO :
 *
 * A) MODE LITE PAR DÉFAUT
 *    `isLiteOn()` dia mamerina TRUE raha tsy mbola nisafidy ny mpampiasa.
 *    Fomba : `!== '0'` fa tsy `=== '1'`.
 *    ⚠️ Ny efa nanao safidy (na velona na maty) dia TSY voakasika — voatahiry
 *       ny sanda '0'/'1' ao amin'ny localStorage.
 *
 * B) TSY MISY AUTOPLAY VIDEO AMIN'NY LITE
 *    Fomba TSOTRA INDRINDRA sady azo antoka : ny `FeedVideo` dia manana guard
 *    `if (dataSaver) { setPlaying(false); return; }` efa VOATSAPA. Ka ny
 *    `dataSaver={dataSaver}` no lasa `dataSaver={dataSaver || lite}` amin'ny
 *    toerana 4. TSY MISY andalana novaina ao anatin'ny FeedVideo mihitsy
 *    → tsy misy risque vaovao amin'ny lecteur.
 *    Vokany fanampiny : `preload` lasa 'none' koa (efa mifandray amin'io guard io).
 *
 * C) ICÔNE HAUT-PARLEUR : SVG NÉON fa tsy emoji
 *    `NeonSpeaker` vaovao ao amin'ny NeonIcons.jsx (rafitra sy `glow()` mitovy
 *    amin'ny 19 hafa efa misy). Miova araka ny `muted`.
 *    Voasolo amin'ny toerana 2 (components/FeedVideo.jsx sy Home.jsx).
 *
 * VOAKASIKA (5) : liteMode.js · NeonIcons.jsx · FeedVideo.jsx · Home.jsx · GroupPage.jsx
 * TSY VOAKASIKA : Reels (mila autoplay — io no maha-Reels azy), Messages,
 *                 notification, upload.
 *
 * Fampandehanana :  node patch-lite-2-defaut-video-icone.cjs --dry
 *                   node patch-lite-2-defaut-video-icone.cjs
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
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

const EMOJI = "          <span style={{ color: 'white', fontSize: 15 }}>{muted ? '🔇' : '🔊'}</span>";
const NEON  = "          <NeonSpeaker size={17} muted={muted} />";

/* ═══════════════════════════════════════════════════════════════════════════
   A — utils/liteMode.js : par défaut VELONA
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/liteMode.js';
  let s = load(rel);

  if (s.includes("!== '0'")) {
    console.log('  ⏭  liteMode.js : efa par défaut');
  } else {
    s = rep(s,
      "/** Velona ve ny Mode Lite ? */\nexport function isLiteOn() {\n  try { return localStorage.getItem(KEY) === '1'; }\n  catch { return false; }\n}",
      `/**
 * Velona ve ny Mode Lite ?
 *
 * ⚠️ VELONA NY DEFAULT (\`!== '0'\`) : ny mpampiasa tsy mbola nisafidy dia
 * mahazo ny Lite avy hatrany — io no safidy tsara indrindra ho an'ny
 * forfait Malagasy. Ny efa nanao safidy dia manana '0' na '1' voatahiry,
 * ka tsy voakasika mihitsy.
 */
export function isLiteOn() {
  try { return localStorage.getItem(KEY) !== '0'; }
  catch { return true; }
}`,
      'lite:default');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   C1 — components/NeonIcons.jsx : NeonSpeaker
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/NeonIcons.jsx';
  let s = load(rel);

  if (s.includes('NeonSpeaker')) {
    console.log('  ⏭  NeonIcons.jsx : efa misy NeonSpeaker');
  } else {
    s = rep(s,
      '// Maso (vues)\nexport function NeonEye(',
      `// Haut-parleur (video in-feed) — solon'ny emoji taloha.
// \`muted\` = true → onda voasolo croix ; false → onda roa.
export function NeonSpeaker({ size = 17, color = '#FFFFFF', muted = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)} aria-hidden="true">
      {/* Cône + corps */}
      <path d="M4 9.3h3.2L11.6 5.6a.7.7 0 0 1 1.15.54v11.72a.7.7 0 0 1-1.15.54L7.2 14.7H4a.9.9 0 0 1-.9-.9v-3.6a.9.9 0 0 1 .9-.9Z"
        fill={color} stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {muted ? (
        <>
          <path d="M16.2 9.8 20.6 14.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M20.6 9.8 16.2 14.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M15.7 9.6a3.6 3.6 0 0 1 0 4.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18.4 7.3a7.2 7.2 0 0 1 0 9.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// Maso (vues)
export function NeonEye(`,
      'neon:speaker');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   C2 — components/FeedVideo.jsx : icône néon
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/FeedVideo.jsx';
  let s = load(rel);

  if (s.includes('NeonSpeaker')) {
    console.log('  ⏭  FeedVideo.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { fallbackMediaURL } from '../utils/telegram';",
      "import { fallbackMediaURL } from '../utils/telegram';\nimport { NeonSpeaker } from './NeonIcons';",
      'fv:import');

    s = rep(s, EMOJI, NEON, 'fv:icone');
    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   B+C3 — pages/Home.jsx : icône néon + autoplay
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('NeonSpeaker')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    // Import : ampiana amin'ny bloc NeonIcons efa misy (tsy mamorona vaovao)
    const impRe = /import \{([^}]*)\} from '\.\.\/components\/NeonIcons';/;
    const m = s.match(impRe);
    if (!m) throw new Error('ASSERTION FAIL [home:import] : tsy hita ny import NeonIcons');
    if (countOf(s, m[0]) !== 1) throw new Error('ASSERTION FAIL [home:import] : tsy tokana');
    s = s.replace(impRe, `import {${m[1].replace(/\s*$/, '')}, NeonSpeaker } from '../components/NeonIcons';`);

    s = rep(s, EMOJI, NEON, 'home:icone');

    // Autoplay : lite → mitovy amin'ny dataSaver (guard efa voatsapa)
    s = rep(s,
      "<FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver}",
      "<FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver || lite}",
      'home:video-shared');

    s = rep(s,
      "<FeedVideo src={post.mediaURL} poster={post.thumbURL} dataSaver={dataSaver}",
      "<FeedVideo src={post.mediaURL} poster={post.thumbURL} dataSaver={dataSaver || lite}",
      'home:video');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   B — pages/GroupPage.jsx : autoplay (mila state `lite`)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);

  if (s.includes('liteMode')) {
    console.log('  ⏭  GroupPage.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';",
      "import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';\nimport { isLiteOn, subscribeLite } from '../utils/liteMode';",
      'gp:import');

    s = rep(s,
      '  const [dataSaver,  setDataSaverState] = useState(isDataSaverOn());',
      '  const [dataSaver,  setDataSaverState] = useState(isDataSaverOn());\n  const [lite, setLiteState] = useState(isLiteOn());\n  useEffect(() => subscribeLite(setLiteState), []);',
      'gp:state');

    s = rep(s,
      "<FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver}",
      "<FeedVideo src={post.sharedFrom.mediaURL} poster={post.sharedFrom.thumbURL} dataSaver={dataSaver || lite}",
      'gp:video-shared');

    s = rep(s,
      "<FeedVideo src={post.mediaURL} poster={post.thumbURL} dataSaver={dataSaver}",
      "<FeedVideo src={post.mediaURL} poster={post.thumbURL} dataSaver={dataSaver || lite}",
      'gp:video');

    save(rel, s);
  }
}

/* ── Fanamarinana farany ─────────────────────────────────────────────────── */
for (const r of touched) {
  if (files[r].includes('🔇') || files[r].includes('🔊')) {
    throw new Error('FAIL [' + r + '] : mbola misy emoji haut-parleur');
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
