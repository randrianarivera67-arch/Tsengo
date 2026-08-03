/**
 * patch-bouton-lite.cjs   —  Averina ny bokotra « Mode Lite »
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny bokotra dia VERY tamin'ny fanavaozana ny navbar. Nefa ny GUARD
 *   dia mbola ao, ary ny Lite dia VELONA par défaut :
 *
 *     if (lite) { setMap({}); return; }        // useOnline  → statut = 0
 *     if (lite) { setPostsLoading(false); … }  // feed       → tsy manavao
 *
 *   Ka VELONA ny Lite nefa TSY AZO VONOINA — izay no mahatonga ny
 *   « statut en ligne = 0 » sy ny badge tsy miseho.
 *
 * FANOVANA : averina ny bokotra eo AKAIKIN'NY « Bloc-notes » ao amin'ny menu.
 *
 * FITANDREMANA : ny anchor dia ny SORATRA « Vos notes privées » — tsy miankina
 *   amin'ny andalana, ka mandeha na dia niova aza ny Layout.
 *
 * Fampandehanana :  node patch-bouton-lite.cjs --dry
 *                   node patch-bouton-lite.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/components/Layout.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/components/Layout.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

if (s.includes('setLite(!liteOn)')) { console.log('⏭  bokotra efa ao'); process.exit(0); }

/* ── ① Import ── */
if (!s.includes("from '../utils/liteMode'")) {
  const m = s.match(/^import .*from '\.\.\/utils\/[^']*';$/m);
  if (!m) fail('tsy hita ny toerana ho an\'ny import');
  s = s.replace(m[0], m[0] + "\nimport { isLiteOn, setLite, subscribeLite } from '../utils/liteMode';");
  console.log('  • import nampiana');
} else if (!s.includes('setLite')) {
  const m = s.match(/import \{([^}]*)\} from '\.\.\/utils\/liteMode';/);
  s = s.replace(m[0], "import { isLiteOn, setLite, subscribeLite } from '../utils/liteMode';");
  console.log('  • import nohavaozina');
}

/* ── ② State ── */
if (!s.includes('const [liteOn')) {
  const m = s.match(/^ {2}const \[drawerOpen[^\n]*$/m);
  if (!m) fail('tsy hita ny toerana ho an\'ny state (drawerOpen)');
  s = s.replace(m[0], m[0] +
    '\n  const [liteOn, setLiteOn] = useState(isLiteOn());' +
    '\n  useEffect(() => subscribeLite(setLiteOn), []);');
  console.log('  • state nampiana');
}
for (const h of ['useState', 'useEffect']) {
  if (!new RegExp('import \\{[^}]*\\b' + h + '\\b').test(s)) fail(h + ' tsy voaimport');
}

/* ── ③ Bokotra eo akaikin'ny Bloc-notes ── */
// ⚠️ « Vos notes privées » miseho INDROA (tabilao `items` + bokotra JSX).
// Ny endrika JSX feno no ampiasaina ho anchor — tokana izy.
const SUB = "<span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>";
if (c(SUB) !== 1) fail('anchor JSX Bloc-notes tsy tokana (' + c(SUB) + ')');

// Fitadiavana ny </button> manaraka ny soratra
const iSub = s.indexOf(SUB);
const iEnd = s.indexOf('</button>', iSub);
if (iEnd < 0) fail('fanidiana ny bokotra Bloc-notes tsy hita');
const cut = iEnd + '</button>'.length;

const BTN = `

          {/* ── MODE LITE ── Mihetsika avy hatrany, tsy mila manokatra indray.
              ⚠️ Very tamin'ny fanavaozana ny navbar : ny guard dia mbola ao,
              ka VELONA ny Lite nefa tsy azo vonoina (statut en ligne = 0). */}
          <button onClick={() => setLite(!liteOn)} aria-pressed={liteOn}
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
          </button>`;

s = s.slice(0, cut) + BTN + s.slice(cut);
console.log('  • bokotra nampiana eo akaikin\'ny Bloc-notes');

/* ── Fanamarinana farany ── */
if (c('setLite(!liteOn)') !== 1) fail('bokotra tsy tokana');
if (!s.includes('isLiteOn()')) fail('state very');
if (!s.includes('subscribeLite')) fail('subscribe very');
if (c(SUB) !== 1) fail('Bloc-notes simba');
for (const v of ['isDark', 'bdr', 'text']) if (!s.includes(v)) fail('variable « ' + v + ' » tsy misy');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : bokotra Mode Lite naverina');
