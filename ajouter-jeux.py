# ajouter-jeux.py — Card « Jeux » ao amin'ny menu + pejy /games
#
# ⚠️ TSY MAMPIASA f-string amin'ny JSX : ny accolade `{}` an'ny JSX dia
#    mifangaro amin'ny an'ny f-string. Placeholder + .replace() no ampiasaina.
#
# Fampandehanana :  python3 ajouter-jeux.py --dry
#                   python3 ajouter-jeux.py
import re, sys, os

DRY = '--dry' in sys.argv
M_LAYOUT = '/*jeux-menu-v1*/'
M_ROUTE  = '/*jeux-route-v1*/'
M_IMPORT = '/*jeux-import-v1*/'

def fail(m):
    print('❌ ASSERTION FAIL : ' + m); sys.exit(1)

# ── 1. Games.jsx ────────────────────────────────────────────────────────
GAMES = '''import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { HiArrowLeft } from "react-icons/hi";

const GAMES = [
  { id: "fanorona", name: "Fanorona", desc: "Lalao malagasy ancestral",
    img: "/fanorona-icon.png", path: "/games/fanorona" },
];

export default function Games() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const bg     = isDark ? "#0F1115" : "#F5F6F8";
  const cardBg = isDark ? "#1A1D24" : "white";
  const text   = isDark ? "#E8ECF2" : "#1A1D24";
  const mut    = isDark ? "#8A94A6" : "#65676B";
  const bdr    = isDark ? "#2A2E38" : "#E5E7EB";

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "14px 14px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid " + bdr,
                   background: cardBg, cursor: "pointer", display: "flex",
                   alignItems: "center", justifyContent: "center" }}>
          <HiArrowLeft size={18} color={text} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text }}>Jeux</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {GAMES.map(g => (
          <button key={g.id} onClick={() => navigate(g.path)}
            style={{ padding: 14, borderRadius: 18, border: "1px solid " + bdr,
                     background: cardBg, cursor: "pointer", display: "flex",
                     flexDirection: "column", alignItems: "center", gap: 10,
                     boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <img src={g.img} alt={g.name}
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover",
                       background: isDark ? "#2A2E38" : "#F0F2F5" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: text }}>{g.name}</div>
              <div style={{ fontSize: 11, color: mut, marginTop: 3 }}>{g.desc}</div>
            </div>
          </button>
        ))}
        <div style={{ padding: 14, borderRadius: 18, border: "1.5px dashed " + bdr,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", gap: 8, minHeight: 160 }}>
          <div style={{ fontSize: 28, opacity: .4 }}>🎮</div>
          <div style={{ fontSize: 11, color: mut, textAlign: "center" }}>Bientôt plus de jeux !</div>
        </div>
      </div>
    </div>
  );
}
'''

# ── 2. Card « Jeux » — placeholder, TSY f-string ────────────────────────
CARD = '''

          {/*__MARKER__*/}
          <button onClick={() => { navigate('/games'); setDrawerOpen(false); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              padding: '14px', textAlign: 'left',
              background: isDark ? '#15181F' : 'white',
              border: '1.5px solid ' + bdr, borderRadius: 16, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
            <span className="icon-badge-3d icon-sweep"
              style={{ width: 44, height: 44, borderRadius: 13,
                       background: 'linear-gradient(145deg,#8B5CF6,#5B21B6)' }}>
              <HiPuzzle size={22} color="white" />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Jeux</span>
            <span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Fanorona et plus</span>
          </button>'''.replace('__MARKER__', M_LAYOUT)

changed = []

# ── Games.jsx ──
if os.path.exists('src/pages/Games.jsx'):
    print('  ⏭  Games.jsx : efa misy')
else:
    if not DRY:
        open('src/pages/Games.jsx', 'w', encoding='utf-8').write(GAMES)
    changed.append('src/pages/Games.jsx')
    print('  • Games.jsx')

# ── Layout.jsx ──
p = 'src/components/Layout.jsx'
c = open(p, encoding='utf-8').read()
orig = c

if 'HiPuzzle' not in c:
    m = re.search(r"import \{([^}]*)\} from 'react-icons/hi';", c)
    if not m: fail('import react-icons/hi tsy hita')
    inner = m.group(1).rstrip().rstrip(',')
    c = c.replace(m.group(0), "import {" + inner + ", HiPuzzle } from 'react-icons/hi';")
    print('  • HiPuzzle import')

if M_LAYOUT in c:
    print('  ⏭  card Jeux : efa misy')
else:
    # Anchor : ny faran'ny bokotra « Bloc-notes » (voamarina fa tokana)
    ANCHOR = "<span style={{ fontSize: 11, color: '#65676B', marginTop: -6 }}>Vos notes privées</span>"
    if c.count(ANCHOR) != 1: fail('anchor Bloc-notes tsy tokana (%d)' % c.count(ANCHOR))
    i = c.index(ANCHOR)
    j = c.index('</button>', i) + len('</button>')
    c = c[:j] + CARD + c[j:]
    print('  • card Jeux ao amin\'ny menu')

for v in ['isDark', 'bdr', 'text', 'setDrawerOpen', 'navigate']:
    if v not in c: fail('variable « %s » tsy misy ao amin\'ny Layout' % v)

if c != orig:
    if not DRY: open(p, 'w', encoding='utf-8').write(c)
    changed.append(p)

# ── App.jsx ──
p2 = 'src/App.jsx'
c2 = open(p2, encoding='utf-8').read()
orig2 = c2

if M_IMPORT not in c2:
    A = "const Home               = lazy(() => import('./pages/Home'));"
    if c2.count(A) != 1: fail('import Home tsy tokana')
    c2 = c2.replace(A, A + "\nconst Games              = lazy(() => import('./pages/Games')); " + M_IMPORT)
    print('  • import Games')

if M_ROUTE not in c2:
    B = '<Route path="/games/fanorona"'
    if c2.count(B) != 1: fail('route fanorona tsy tokana')
    c2 = c2.replace(B,
        '<Route path="/games"          element={<PrivateRoute><Layout><Games /></Layout></PrivateRoute>} /> '
        + M_ROUTE + '\n        ' + B)
    print('  • route /games')

if c2 != orig2:
    if not DRY: open(p2, 'w', encoding='utf-8').write(c2)
    changed.append(p2)

print('\n' + ('✅ DRY-RUN (tsy nisy nosoratana)' if DRY else '✅ Vita'))
for f in changed: print('   • ' + f)
if not changed: print('   (tsy nisy fanovana)')
