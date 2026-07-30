/**
 * patch-mode-lite.cjs   —  MODE LITE (fomba Facebook Lite)
 * ─────────────────────────────────────────────────────────────────────────────
 * FITSIPIKA : maty ny temps réel amin'ny FIJERENA, velona amin'ny FIFANDRAISANA.
 *   Izay mihitsy no ataon'ny Facebook Lite : tsy mihaino foana ny serveur izy,
 *   fa mangataka rehefa manao "refresh" ny mpampiasa.
 *
 * NY MANDANY MARINA (voarefy tao amin'ny code) :
 *   1. `useOnline` → onValue(rtdb, 'online') : mihaino ny node MANONTOLO.
 *      Isaky ny misy olona misokatra/mikatona ny app dia ny tabilao 238 no
 *      alefa amin'ny MPAMPIASA REHETRA mifandray. Mitohy na dia mijery fotsiny.
 *   2. Feed `onSnapshot(limit 20)` : isaky ny réaction/commentaire/views+1
 *      amin'ny publication 20 farany, dia ny DOCUMENT MANONTOLO (miaraka
 *      amin'ny commentaire rehetra) no midina amin'ny rehetra.
 *
 * VOAKASIKA (4) :
 *   • utils/liteMode.js   (VAOVAO) — toggle + localStorage + subscribe
 *   • hooks/useOnline.js  — tsy mihaino intsony raha Lite (tsy misy 点 maitso)
 *   • pages/Home.jsx      — tsy misy listener feed ; pull-to-refresh no manavao
 *   • components/Layout.jsx — bokotra ao amin'ny menu, akaikin'ny Bloc-notes
 *
 * TSY VOAKASIKA MIHITSY (fanapahan-kevitra hentitra) :
 *   • Messages sy notification → tsy azo esorina ny realtime, simba ny chat.
 *   • Upload video → tsy voakasika, 500 Mo ihany ny fetra.
 *   • Ny fahitana ny votoaty → mitovy tanteraka, vignette ihany no aseho.
 *
 * FITSAPANA MIVANTANA : ny toggle dia mihetsika AVY HATRANY (subscribe), tsy
 *   mila mamerina manokatra ny app.
 *
 * Fampandehanana :  node patch-mode-lite.cjs --dry
 *                   node patch-mode-lite.cjs
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

/* ═══════════════════════════════════════════════════════════════════════════
   1 — utils/liteMode.js  (FICHIER VAOVAO — tsy mikitika na inona na inona)
   ═══════════════════════════════════════════════════════════════════════════ */
const LITE_SRC = `// src/utils/liteMode.js
// MODE LITE — fomba Facebook Lite : maty ny temps réel amin'ny FIJERENA.
//
// Mitahiry ao amin'ny localStorage, ary mampahafantatra avy hatrany ny
// composant rehetra (tsy mila mamerina manokatra ny app).
//
// Rafitra mitovy amin'ny \`dataSaver.js\` — mba hitovy ny fitondrantena.

const KEY = 'trengo_lite_mode';
const listeners = new Set();

/** Velona ve ny Mode Lite ? */
export function isLiteOn() {
  try { return localStorage.getItem(KEY) === '1'; }
  catch { return false; }
}

/** Mamelona / mamono ny Mode Lite. */
export function setLite(value) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {}
  listeners.forEach(cb => { try { cb(!!value); } catch {} });
}

/** Manaraka ny fiovana. Mamerina fonction fanesorana. */
export function subscribeLite(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
`;

{
  const rel = 'src/utils/liteMode.js';
  if (fs.existsSync(P(rel))) {
    console.log('  ⏭  liteMode.js : efa misy');
  } else {
    files[rel] = LITE_SRC;
    touched.push(rel);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — hooks/useOnline.js : tsy mihaino ny RTDB raha Lite
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/hooks/useOnline.js';
  let s = load(rel);

  if (s.includes('isLiteOn')) {
    console.log('  ⏭  useOnline.js : efa voapatch');
  } else {
    s = rep(s,
      "import { rtdb } from '../firebase';",
      "import { rtdb } from '../firebase';\nimport { isLiteOn, subscribeLite } from '../utils/liteMode';",
      'online:import');

    s = rep(s,
      `export function useOnline() {
  const [map, setMap] = useState(cache);
  useEffect(() => {
    refCount++;`,
      `export function useOnline() {
  const [lite, setLiteState] = useState(isLiteOn());
  useEffect(() => subscribeLite(setLiteState), []);

  const [map, setMap] = useState(() => (isLiteOn() ? {} : cache));
  useEffect(() => {
    // ── MODE LITE ────────────────────────────────────────────────────────
    // Ny listener \`online\` dia mandefa ny tabilao MANONTOLO amin'ny mpampiasa
    // REHETRA isaky ny misy olona misokatra na mikatona ny app. Io no loharano
    // lehibe indrindra amin'ny data mitohy. Amin'ny Lite dia tsy misy mihitsy
    // — very ny 点 maitso, fa tsy misy octet lany.
    if (lite) { setMap({}); return; }
    refCount++;`,
      'online:guard');

    s = rep(s,
      `      if (refCount <= 0 && unsubGlobal) { unsubGlobal(); unsubGlobal = null; }
    };
  }, []);`,
      `      if (refCount <= 0 && unsubGlobal) { unsubGlobal(); unsubGlobal = null; }
    };
  }, [lite]);`,
      'online:deps');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 — pages/Home.jsx : tsy misy listener feed raha Lite
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('liteMode')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';",
      "import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';\nimport { isLiteOn, subscribeLite } from '../utils/liteMode';",
      'home:import');

    s = rep(s,
      "  const [dataSaver, setDataSaverState] = useState(isDataSaverOn());\n  useEffect(() => subscribeDataSaver(setDataSaverState), []);",
      "  const [dataSaver, setDataSaverState] = useState(isDataSaverOn());\n  useEffect(() => subscribeDataSaver(setDataSaverState), []);\n  const [lite, setLiteState] = useState(isLiteOn());\n  useEffect(() => subscribeLite(setLiteState), []);",
      'home:state');

    s = rep(s,
      "    let firstSnap = true;\n    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));",
      `    // ── MODE LITE ──────────────────────────────────────────────────────────
    // Tsy misy listener velona : isaky ny réaction / commentaire / views+1
    // amin'ny publication 20 farany dia ny DOCUMENT MANONTOLO no midina.
    // Amin'ny Lite dia ny pull-to-refresh ihany no manavao — toy ny FB Lite.
    // (Ny loadFeedPage(true) ao amin'ny effet etsy ambony no naka ny votoaty.)
    if (lite) { setPostsLoading(false); return; }

    let firstSnap = true;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));`,
      'home:guard');

    s = rep(s,
      '      setPostsLoading(false);\n    }, () => setPostsLoading(false));\n  }, []);',
      '      setPostsLoading(false);\n    }, () => setPostsLoading(false));\n  }, [lite]);',
      'home:deps');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 — components/Layout.jsx : bokotra ao amin'ny menu (akaikin'ny Bloc-notes)
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/Layout.jsx';
  let s = load(rel);

  if (s.includes('liteMode')) {
    console.log('  ⏭  Layout.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { clearPins, requestFeedReset } from '../utils/feedPins';",
      "import { clearPins, requestFeedReset } from '../utils/feedPins';\nimport { isLiteOn, setLite, subscribeLite } from '../utils/liteMode';",
      'layout:import');

    s = rep(s,
      '  const [drawerOpen,    setDrawerOpen]    = useState(false);',
      '  const [drawerOpen,    setDrawerOpen]    = useState(false);\n  const [liteOn,        setLiteOn]        = useState(isLiteOn());\n  useEffect(() => subscribeLite(setLiteOn), []);',
      'layout:state');

    // Grille 2 colonnes : Bloc-notes + Mode Lite
    s = rep(s,
      `        {/* Bloc-notes */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>`,
      `        {/* Bloc-notes + Mode Lite */}
        <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>`,
      'layout:grid');

    s = rep(s,
      `            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
          </button>
        </div>`,
      `            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Bloc-notes</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>
          </button>

          {/* ── MODE LITE ── Mihetsika avy hatrany, tsy mila manokatra indray ── */}
          <button onClick={() => setLite(!liteOn)}
            aria-pressed={liteOn}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px',
              textAlign: 'left', background: isDark ? '#15181F' : 'white',
              border: '1.5px solid ' + (liteOn ? '#12A48D' : bdr), borderRadius: 16, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)', position: 'relative',
            }}>
            <span className="icon-badge-3d" style={{
              width: 44, height: 44, borderRadius: 13,
              background: liteOn ? 'linear-gradient(145deg,#7FE6B4,#12A48D)' : 'linear-gradient(145deg,#C7D0DD,#7C8591)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M13 2 4.5 13.2h5.8L11 22l8.5-11.2h-5.8L13 2Z" fill="white" />
              </svg>
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Mode Lite</span>
            <span style={{ fontSize: 11, color: liteOn ? '#12A48D' : '#65676B', marginTop: -6 }}>
              {liteOn ? 'Activé — données réduites' : 'Économiser vos données'}
            </span>
            <span style={{
              position: 'absolute', top: 12, right: 12, width: 34, height: 19, borderRadius: 999,
              background: liteOn ? '#12A48D' : (isDark ? '#3A3B3C' : '#D6DAE0'), transition: 'background .2s',
            }}>
              <span style={{
                position: 'absolute', top: 2.5, left: liteOn ? 17 : 2.5, width: 14, height: 14,
                borderRadius: '50%', background: 'white', transition: 'left .2s',
                boxShadow: '0 1px 2px rgba(0,0,0,.25)',
              }} />
            </span>
          </button>
        </div>`,
      'layout:button');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
