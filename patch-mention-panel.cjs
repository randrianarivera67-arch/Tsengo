/**
 * patch-mention-panel.cjs   —  Panneau mention fomba Facebook + navbar/clavier
 * ─────────────────────────────────────────────────────────────────────────────
 * NAHOANA NO TSY NISEHO NA DIA VOAHITSY AZA NY DONNÉES :
 *   Ny panneau dia `position:absolute` AO ANATIN'NY carte publication. Ny
 *   ancêtre rehetra misy `overflow:hidden`, `transform`, `filter` na
 *   `will-change` dia MANAPAKA na MAMATOTRA azy. Amin'ny fil misy carte
 *   maro sy animation, saro-pantarina izay iray no manapaka.
 *
 * VAHAOLANA MANAFOANA NY SOKAJY OLANA MANONTOLO :
 *   `createPortal(…, document.body)` — mivoaka amin'ny ancêtre REHETRA.
 *   Tsy voatapaka, tsy voafatotra, tsy misy stacking mifanipaka.
 *   Ary izay mihitsy no endrika Facebook : panneau FENO eo ambonin'ny clavier.
 *
 * ASA :
 *   ① `useKeyboardInset()` — refesina amin'ny `visualViewport` ny haavon'ny
 *      clavier. Fenitra navigateur, mandeha ao anaty WebView Capacitor.
 *   ② `MentionPanel.jsx` — portal, fixed, mipetraka EO AMBONIN'NY clavier,
 *      endrika Facebook : avatar 44 px, anarana 15/600, sous-titre.
 *      @followers / @everyone eo an-tampony (tompon'ny publication ihany).
 *   ③ Home.jsx — ny dropdown ROA (commentaire + composer) soloina.
 *   ④ Layout.jsx — ny dock ambany MIAFINA rehefa miakatra ny clavier
 *      (tsy manelingelina ny fanoratana intsony).
 *
 * TSY VOAKASIKA : ny logika mention (loharano, regex, notification) — voahitsy
 *   tamin'ny patch teo aloha ary tsy kitihina eto.
 *
 * Fampandehanana :  node patch-mention-panel.cjs --dry
 *                   node patch-mention-panel.cjs
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

/* ═══ ① hooks/useKeyboardInset.js ══════════════════════════════════════════ */
const KB = `// src/hooks/useKeyboardInset.js
// Haavon'ny clavier (px). 0 raha mikatona.
//
// Ny \`visualViewport\` dia fenitra navigateur : rehefa miakatra ny clavier dia
// mihena ny haavony nefa tsy miova ny \`window.innerHeight\`. Ny elanelana no
// haavon'ny clavier. Mandeha ao anaty WebView Capacitor.
import { useEffect, useState } from 'react';

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;                       // navigateur tranainy → 0 foana
    const update = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // < 80 px : barre navigateur, tsy clavier
      setInset(gap > 80 ? Math.round(gap) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
`;
{
  const rel = 'src/hooks/useKeyboardInset.js';
  if (fs.existsSync(P(rel))) console.log('  ⏭  useKeyboardInset.js : efa misy');
  else { files[rel] = KB; touched.push(rel); }
}

/* ═══ ② components/MentionPanel.jsx ════════════════════════════════════════ */
const MP = `// src/components/MentionPanel.jsx
// Panneau mention — endrika Facebook.
//
// ⚠️ PORTAL mankany amin'ny \`document.body\` : ny panneau dia mivoaka amin'ny
// ancêtre rehetra. Teo aloha dia \`position:absolute\` tao anatin'ny carte, ka
// voatapaky ny \`overflow:hidden\` na voafatotry ny \`transform\` — tsy niseho
// mihitsy. Ny portal no manafoana io sokajy olana io.
import { createPortal } from 'react-dom';
import useKeyboardInset from '../hooks/useKeyboardInset';

const SPECIALS = [
  { tag: 'followers', label: '@followers',    desc: 'Certains abonnés peuvent recevoir des notifications' },
  { tag: 'everyone',  label: '@Tout le monde', desc: 'Abonnés et amis peuvent recevoir des notifications' },
];

function GroupIcon() {
  return (
    <span style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: '#C7CDD4',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" />
        <path d="M2 19c0-3 2.7-5 6-5s6 2 6 5v1H2v-1Z" />
        <path d="M14.5 14.4c2.8.3 5.5 2.2 5.5 4.6v1h-4v-1c0-1.7-.6-3.2-1.5-4.6Z" />
      </svg>
    </span>
  );
}

/**
 * @param {boolean}  open
 * @param {string}   query          teny voasoratra aorian'ny '@'
 * @param {object[]} people         { uid, fullName, username, photo }
 * @param {boolean}  showSpecials   tompon'ny publication ihany
 * @param {(tag:string)=>void} onPick
 * @param {()=>void} onClose
 */
export default function MentionPanel({ open, query = '', people = [], showSpecials = false, onPick, onClose }) {
  const kb = useKeyboardInset();
  if (!open) return null;

  const q = String(query || '').toLowerCase();
  const specials = showSpecials
    ? SPECIALS.filter(s => s.tag.startsWith(q) || s.label.toLowerCase().includes(q))
    : [];
  const list = people.filter(p =>
    (p.fullName || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q)
  ).slice(0, 30);

  if (!specials.length && !list.length) return null;

  const Row = ({ children, onClick, key }) => (
    <button key={key} onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
               background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', textAlign: 'left' }}>
      {children}
    </button>
  );

  return createPortal(
    <>
      {/* Fanakatonana amin'ny fikasihana ivelany */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'transparent' }} />

      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: kb, zIndex: 9001,
          background: 'white', borderTop: '1px solid #E4E6EB',
          boxShadow: '0 -6px 24px rgba(0,0,0,.12)',
          maxHeight: 'min(46vh, 420px)', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={e => e.stopPropagation()}
      >
        {specials.map(s => (
          <Row key={s.tag} onClick={() => onPick(s.tag)}>
            <GroupIcon />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#050505' }}>{s.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#65676B', overflow: 'hidden',
                             textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</span>
            </span>
          </Row>
        ))}

        {list.map(p => (
          <Row key={p.uid} onClick={() => onPick(p.username || (p.fullName || '').split(' ')[0])}>
            <img
              src={p.photo || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(p.fullName || 'U')}&background=1877F2&color=fff\`}
              alt="" loading="lazy"
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#F0F2F5' }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#050505',
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fullName}</span>
              {p.username && (
                <span style={{ display: 'block', fontSize: 12, color: '#65676B',
                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}</span>
              )}
            </span>
          </Row>
        ))}
      </div>
    </>,
    document.body
  );
}
`;
{
  const rel = 'src/components/MentionPanel.jsx';
  if (fs.existsSync(P(rel))) console.log('  ⏭  MentionPanel.jsx : efa misy');
  else { files[rel] = MP; touched.push(rel); }
}

/* ═══ ③ Home.jsx : soloina ny dropdown roa ════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('MentionPanel')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    s = rep(s, "import { isLiteOn, subscribeLite } from '../utils/liteMode';",
      "import { isLiteOn, subscribeLite } from '../utils/liteMode';\nimport MentionPanel from '../components/MentionPanel';",
      'home:import');

    // Dropdown COMPOSER → MentionPanel
    const iC = s.indexOf("                {mentionQuery?.postId === '__composer__' && (() => {");
    if (iC === -1) throw new Error('ASSERTION FAIL [home:composer] : tsy hita ny dropdown composer');
    const endC = s.indexOf('                })()}', iC);
    if (endC === -1) throw new Error('ASSERTION FAIL [home:composer] : tsy hita ny fiafarany');
    s = s.slice(0, iC) +
`                <MentionPanel
                  open={mentionQuery?.postId === '__composer__'}
                  query={mentionQuery?.q || ''}
                  people={mentionFriends}
                  showSpecials={false}
                  onPick={(tag) => {
                    setContent(prev => prev.replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' '));
                    setMentionQuery(null);
                  }}
                  onClose={() => setMentionQuery(null)}
                />
` + s.slice(endC + '                })()}\n'.length);

    // Dropdown COMMENTAIRE → MentionPanel
    const iK = s.indexOf('                    {mentionQuery?.postId === post.id && (() => {');
    if (iK === -1) throw new Error('ASSERTION FAIL [home:comment] : tsy hita ny dropdown commentaire');
    const endK = s.indexOf('                    })()}', iK);
    if (endK === -1) throw new Error('ASSERTION FAIL [home:comment] : tsy hita ny fiafarany');
    s = s.slice(0, iK) +
`                    <MentionPanel
                      open={mentionQuery?.postId === post.id}
                      query={mentionQuery?.q || ''}
                      people={mentionFriends}
                      showSpecials={post.uid === currentUser.uid}
                      onPick={(tag) => {
                        setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' ') }));
                        setMentionQuery(null);
                      }}
                      onClose={() => setMentionQuery(null)}
                    />
` + s.slice(endK + '                    })()}\n'.length);

    if (countOf(s, '<MentionPanel') !== 2) {
      throw new Error('ASSERTION FAIL [home:panel] : nandrasana 2, nahitana ' + countOf(s, '<MentionPanel'));
    }
    save(rel, s);
  }
}

/* ═══ ④ Layout.jsx : dock miafina rehefa miakatra ny clavier ══════════════ */
{
  const rel = 'src/components/Layout.jsx';
  let s = load(rel);

  if (s.includes('useKeyboardInset')) {
    console.log('  ⏭  Layout.jsx : efa voapatch');
  } else {
    s = rep(s, "import { isLiteOn, setLite, subscribeLite } from '../utils/liteMode';",
      "import { isLiteOn, setLite, subscribeLite } from '../utils/liteMode';\nimport useKeyboardInset from '../hooks/useKeyboardInset';",
      'layout:import');

    s = rep(s, '  const [liteOn,        setLiteOn]        = useState(isLiteOn());',
      "  const [liteOn,        setLiteOn]        = useState(isLiteOn());\n  // Dock miafina rehefa miakatra ny clavier — tsy manelingelina ny fanoratana\n  const kbInset = useKeyboardInset();",
      'layout:state');

    s = rep(s, '      <nav className="floating-dock">',
      '      <nav className="floating-dock" style={kbInset > 0 ? { display: \'none\' } : undefined}>',
      'layout:dock');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
