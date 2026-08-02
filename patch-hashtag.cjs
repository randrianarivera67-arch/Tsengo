/**
 * patch-hashtag.cjs   —  Hashtag #  (fomba Facebook)
 * ─────────────────────────────────────────────────────────────────────────────
 * ASA :
 *   ① Parser `#teny` ao anaty publication sy commentaire → lasa lien manga
 *   ② Saha `hashtags[]` amin'ny publication VAOVAO (fikarohana haingana)
 *   ③ Pejy `/hashtag/:tag` — publication rehetra misy ilay marika
 *
 * ⚠️ FETRA NEKENA (araka ny nangatahinao) :
 *   Ny publication TALOHA dia tsy hanana `hashtags[]` → tsy ho hita ao amin'ny
 *   pejy. Ny vaovao ihany. Tsy misy script migration.
 *
 * FANAPAHAN-KEVITRA TEKNIKA :
 *   • Ny marika dia tehirizina amin'ny sora-baventy KELY (`#Tony` sy `#tony`
 *     dia mitovy) — toy ny Facebook.
 *   • Fetra 10 isaky ny publication : ny `array-contains` dia mila index, ary
 *     ny tabilao lava dia manavesatra ny document.
 *   • Ny isa fotsiny (`#2026`) dia LAVINA : matetika daty na vidiny izy, tsy
 *     marika. Mila litera 1 farafahakeliny.
 *   • Ny `#` ao anaty URL (`https://x.com/#top`) dia tsy raisina : ny
 *     `splitLinks` no mandeha ALOHA, ka voafaritra ho `link` izy.
 *
 * VOAKASIKA : utils/appLink.js · components/Linkify.jsx · pages/Home.jsx
 *             pages/HashtagPage.jsx (VAOVAO) · App.jsx
 *
 * Fampandehanana :  node patch-hashtag.cjs --dry
 *                   node patch-hashtag.cjs
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

/* ═══ ① appLink.js : parser + extraction ══════════════════════════════ */
{
  const rel = 'src/utils/appLink.js';
  let s = load(rel);
  if (s.includes('HASHTAG_RE')) { console.log('  ⏭  appLink.js : efa voapatch'); }
  else {
    s = rep(s,
      'const MENTION_RE = ',
      `/**
 * Hashtag :  litera, isa, '_' — 2 ka hatramin'ny 50.
 * Ny \`(^|[^...])\` dia manakana ny \`#\` ao anaty teny (\`abc#def\`) sy ny \`##\`.
 * ⚠️ Ny \`#\` ao anaty URL dia tsy voakasika : ny splitLinks no mandeha ALOHA.
 */
const HASHTAG_RE = /(^|[^\\p{L}\\p{N}_#])#([\\p{L}\\p{N}_]{2,50})/gu;

/** Misy litera farafahakeliny ? (ny \`#2026\` dia daty, tsy marika) */
function validTag(t) { return /\\p{L}/u.test(t); }

/**
 * Ny marika REHETRA ao anaty lahatsoratra, amin'ny sora-baventy KELY.
 * Ampiasaina amin'ny fitehirizana sy ny fikarohana.
 * @returns {string[]}  tsy misy doublon, fetra 10
 */
export function extractHashtags(text, max = 10) {
  const out = [];
  if (!text) return out;
  const seen = new Set();
  let m; HASHTAG_RE.lastIndex = 0;
  while ((m = HASHTAG_RE.exec(text)) !== null) {
    const t = m[2].toLowerCase();
    if (!validTag(t) || seen.has(t)) continue;
    seen.add(t); out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

const MENTION_RE = `,
      'appLink:re');

    // Fizarana : hashtag aorian'ny mention
    s = rep(s,
      `      if (l2 < c.text.length) out.push({ type: 'text', value: c.text.slice(l2) });
    }
  }`,
      `      if (l2 < c.text.length) out.push({ type: 'text', value: c.text.slice(l2) });
    }
  }

  // ── ③ Hashtag ao anatin'ny ampahany TEXT sisa ────────────────────────
  const withTags = [];
  for (const p of out) {
    if (p.type !== 'text') { withTags.push(p); continue; }
    let l3 = 0, m3;
    HASHTAG_RE.lastIndex = 0;
    while ((m3 = HASHTAG_RE.exec(p.value)) !== null) {
      const at = m3.index + m3[1].length;            // toerana marin'ny '#'
      if (!validTag(m3[2])) continue;                // \`#2026\` → lahatsoratra
      if (at > l3) withTags.push({ type: 'text', value: p.value.slice(l3, at) });
      withTags.push({ type: 'hashtag', value: '#' + m3[2], tag: m3[2].toLowerCase() });
      l3 = at + 1 + m3[2].length;
    }
    if (l3 < p.value.length) withTags.push({ type: 'text', value: p.value.slice(l3) });
  }
  out.length = 0; out.push(...withTags);`,
      'appLink:split');

    save(rel, s);
  }
}

/* ═══ ② Linkify.jsx : rendu clicable ══════════════════════════════════ */
{
  const rel = 'src/components/Linkify.jsx';
  let s = load(rel);
  if (s.includes("p.type === 'hashtag'")) { console.log('  ⏭  Linkify.jsx : efa voapatch'); }
  else {
    s = rep(s,
      "        if (p.type === 'mention') {",
      `        if (p.type === 'hashtag') {
          return (
            <a key={i} href={\`/hashtag/\${p.tag}\`}
              style={{ color: color || '#1877F2', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(\`/hashtag/\${p.tag}\`); }}>
              {p.value}
            </a>
          );
        }
        if (p.type === 'mention') {`,
      'linkify');

    save(rel, s);
  }
}

/* ═══ ③ Home.jsx : saha hashtags ══════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);
  if (s.includes('extractHashtags')) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    const impRe = /import \{([^}]*)\} from '\.\.\/utils\/appLink';/;
    const m = s.match(impRe);
    if (!m) throw new Error('ASSERTION FAIL [home:import] : tsy hita ny import appLink');
    s = s.replace(m[0], `import {${m[1].replace(/\s*$/, '')}, extractHashtags } from '../utils/appLink';`);

    s = rep(s,
      '      content: content.trim().slice(0, MAX_POST),',
      '      content: content.trim().slice(0, MAX_POST),\n      hashtags: extractHashtags(content),   // fikarohana haingana (array-contains)',
      'home:fields');

    save(rel, s);
  }
}

/* ═══ ④ HashtagPage.jsx : VAOVAO ══════════════════════════════════════ */
const PAGE = `// src/pages/HashtagPage.jsx
// Publication rehetra misy marika iray.
//
// ⚠️ Ny publication TALOHA dia tsy manana \`hashtags[]\` → tsy ho hita eto.
// Ny vaovao ihany (fanapahan-kevitra nekena : tsy misy migration).
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { HiArrowLeft } from 'react-icons/hi';
import Linkify from '../components/Linkify';
import SmartImage from '../components/SmartImage';
import { timeAgo } from '../utils/timeAgo';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState('loading');   // loading | ok | empty | error

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = String(tag || '').toLowerCase().trim();
      if (!t) { if (alive) setState('empty'); return; }
      setState('loading');
      try {
        // \`array-contains\` + \`orderBy\` : mila index composite. Raha tsy misy
        // izy dia mianjera — ka averina tsy misy orderBy, alahatra eto.
        let docs = [];
        try {
          const snap = await getDocs(query(
            collection(db, 'posts'),
            where('hashtags', 'array-contains', t),
            orderBy('createdAt', 'desc'), limit(40),
          ));
          docs = snap.docs;
        } catch (e) {
          const snap = await getDocs(query(
            collection(db, 'posts'),
            where('hashtags', 'array-contains', t), limit(40),
          ));
          docs = snap.docs.sort((a, b) => {
            const ta = a.data().createdAt, tb = b.data().createdAt;
            const na = ta?.seconds ? ta.seconds : Date.parse(ta || 0) / 1000 || 0;
            const nb = tb?.seconds ? tb.seconds : Date.parse(tb || 0) / 1000 || 0;
            return nb - na;
          });
        }
        if (!alive) return;
        const list = docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.audience !== 'me');
        setPosts(list);
        setState(list.length ? 'ok' : 'empty');
      } catch (e) {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [tag]);

  return (
    <div style={{ padding: '14px 12px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', display: 'flex' }}>
          <HiArrowLeft size={22} />
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 19, fontWeight: 800, color: '#1877F2', lineHeight: 1.2 }}>#{tag}</p>
          {state === 'ok' && (
            <p style={{ fontSize: 12, color: '#65676B' }}>
              {posts.length} publication{posts.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {state === 'loading' && (
        <p style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, padding: '40px 0' }}>Chargement…</p>
      )}

      {state === 'error' && (
        <p style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, padding: '40px 0' }}>
          Impossible de charger pour le moment.
        </p>
      )}

      {state === 'empty' && (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucune publication</p>
          <p style={{ fontSize: 13, color: '#65676B', lineHeight: 1.6 }}>
            Personne n'a encore utilisé #{tag}.<br />Soyez le premier !
          </p>
        </div>
      )}

      {state === 'ok' && posts.map(p => (
        <div key={p.id} className="card" onClick={() => navigate('/post/' + p.id)}
          style={{ padding: 12, marginBottom: 10, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <img src={p.authorPhoto || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(p.authorName || 'U')}&background=1877F2&color=fff\`}
              alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.authorName}
              </p>
              <p style={{ fontSize: 11, color: '#65676B' }}>{p.createdAt ? timeAgo(p.createdAt) : ''}</p>
            </div>
          </div>
          {p.content && (
            <p style={{ fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', marginBottom: p.mediaURL ? 8 : 0 }}>
              <Linkify text={p.content} />
            </p>
          )}
          {p.mediaType === 'image' && p.mediaURL && (
            <SmartImage src={p.thumbURL || p.mediaURL} minH={160}
              style={{ width: '100%', borderRadius: 10, objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  );
}
`;
{
  const rel = 'src/pages/HashtagPage.jsx';
  if (fs.existsSync(P(rel))) console.log('  ⏭  HashtagPage.jsx : efa misy');
  else { files[rel] = PAGE; touched.push(rel); }
}

/* ═══ ⑤ App.jsx : route ═══════════════════════════════════════════════ */
{
  const rel = 'src/App.jsx';
  let s = load(rel);
  if (s.includes('HashtagPage')) { console.log('  ⏭  App.jsx : efa voapatch'); }
  else {
    s = rep(s,
      "const UserByName = lazy(() => import('./pages/UserByName'));",
      "const UserByName = lazy(() => import('./pages/UserByName'));\nconst HashtagPage = lazy(() => import('./pages/HashtagPage'));",
      'app:import');

    s = rep(s,
      '        <Route path="/u/:username"    element={<PrivateRoute><Layout><UserByName /></Layout></PrivateRoute>} />',
      '        <Route path="/u/:username"    element={<PrivateRoute><Layout><UserByName /></Layout></PrivateRoute>} />\n        <Route path="/hashtag/:tag"   element={<PrivateRoute><Layout><HashtagPage /></Layout></PrivateRoute>} />',
      'app:route');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
