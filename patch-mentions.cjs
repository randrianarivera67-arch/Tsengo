/**
 * patch-mentions.cjs   —  Mention @username (fomba Facebook)
 * ─────────────────────────────────────────────────────────────────────────────
 * TOE-JAVATRA VOAMARINA :
 *   • Ny dropdown dia mampiditra ny ANARANA VOALOHANY (`@Tony`), tsy ny username
 *     → tsy tokana : olona roa mitovy anarana dia mifangaro.
 *   • Ny fanamarinana dia `low.includes('@' + first)` — TSY MISY fetra teny :
 *     `@tony` dia mifanaraka amin'ny `@tonyzz` koa. Ary ny mailaka
 *     `x@tony.mg` dia raisina ho mention.
 *   • Ny mention dia TSY CLICABLE mihitsy.
 *
 * RAFITRA NOFIDIANA — tsy misy saha vaovao, tsy misy migration :
 *   Ny `@username` ao anaty lahatsoratra no parsé mivantana, ary route
 *   `/u/:username` no mamaha azy ho uid. Ka lasa clicable NA AIZA NA AIZA
 *   ampiasana `Linkify` — feed, commentaire, PostDetail, Reels, MediaViewer —
 *   TSY MISY prop thread, tsy misy fanovana amin'ny toerana fampisehoana.
 *
 * ⚠️ Ny collection `usernames` dia public-read fa TSY MISY CODE MANORATRA azy
 *   (voamarina) → tsy azo itokisana. Ny fanovana dia atao amin'ny requête
 *   `users where username == x`, izay mampiasa index single-field noforonin'ny
 *   Firestore HO AZY — tsy mila index composite.
 *
 * VOAKASIKA :
 *   • utils/appLink.js      — parser @mention (URL alaina ALOHA : mailaka voaaro)
 *   • components/Linkify.jsx — rendu clicable
 *   • pages/UserByName.jsx  — VAOVAO : mamaha username → uid
 *   • App.jsx               — route /u/:username
 *   • pages/Home.jsx        — dropdown mampiditra @username ; notification marina
 *
 * FIAROVANA :
 *   • Mailaka `x@tony.mg` → TSY mention (ny litera mialoha ny @ no jerena).
 *   • Username tsy hita → page misy hafatra mazava, tsy crash.
 *   • Ny fanamarinana notification dia amin'ny fetra teny (\\b) — tsy misy
 *     fifanarahana diso intsony.
 *
 * Fampandehanana :  node patch-mentions.cjs --dry
 *                   node patch-mentions.cjs
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
   1 — utils/appLink.js : parser @mention
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/utils/appLink.js';
  let s = load(rel);

  if (s.includes('MENTION_RE')) {
    console.log('  ⏭  appLink.js : efa voapatch');
  } else {
    s = rep(s,
      "/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */",
      `/**
 * Username : litera, isa, '_' sy '.', 2–30. Mifanaraka amin'ny Register.
 * ⚠️ Ny \`(^|[^\\\\p{L}\\\\p{N}_])\` dia MANAKANA ny mailaka : ao amin'ny
 * \`rakoto@tony.mg\` dia misy litera mialoha ny '@' → tsy mention.
 */
const MENTION_RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;

/**
 * Mizara ny lahatsoratra ho ampahany, miaraka amin'ny mention.
 * @returns {{type:'text'|'link'|'mention', value:string, internal?:string, username?:string}[]}
 */
export function splitRich(text) {
  const parts = splitLinks(text);
  const out = [];
  for (const p of parts) {
    if (p.type !== 'text') { out.push(p); continue; }
    let last = 0, m;
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(p.value)) !== null) {
      const at = m.index + m[1].length;              // toerana marin'ny '@'
      if (at > last) out.push({ type: 'text', value: p.value.slice(last, at) });
      out.push({ type: 'mention', value: '@' + m[2], username: m[2] });
      last = at + 1 + m[2].length;
    }
    if (last < p.value.length) out.push({ type: 'text', value: p.value.slice(last) });
  }
  return out.length ? out : parts;
}

/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */`,
      'appLink:splitRich');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 — components/Linkify.jsx : rendu clicable
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/components/Linkify.jsx';
  let s = load(rel);

  if (s.includes('splitRich')) {
    console.log('  ⏭  Linkify.jsx : efa voapatch');
  } else {
    s = rep(s,
      "import { splitLinks } from '../utils/appLink';",
      "import { splitRich } from '../utils/appLink';",
      'linkify:import');

    s = rep(s, '  const parts = splitLinks(text);', '  const parts = splitRich(text);', 'linkify:call');

    s = rep(s,
      "        if (p.type === 'text') return <span key={i}>{p.value}</span>;",
      `        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        if (p.type === 'mention') {
          // Mention → profil. Ny fanovana username → uid dia atao ao amin'ny
          // route /u/:username (requête \`users\`, index single-field automatique).
          return (
            <a key={i} href={\`/u/\${p.username}\`}
              style={{ color: color || '#1877F2', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(\`/u/\${p.username}\`); }}>
              {p.value}
            </a>
          );
        }`,
      'linkify:mention');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 — pages/UserByName.jsx : VAOVAO
   ═══════════════════════════════════════════════════════════════════════════ */
const UBN = `// src/pages/UserByName.jsx
// Mamaha ny /u/:username ho /profile/:uid.
//
// Ampiasaina ny requête \`users where username == x\` : ny Firestore dia mamorona
// index single-field HO AZY, ka tsy mila index composite.
// (Ny collection \`usernames\` dia tsy azo itokisana : tsy misy code manoratra azy.)
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function UserByName() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading');   // loading | notfound

  useEffect(() => {
    let alive = true;
    (async () => {
      const name = String(username || '').trim();
      if (!name) { if (alive) setState('notfound'); return; }
      try {
        // Andrana marina, dia amin'ny sora-baventy kely (Register dia mitahiry
        // araka ny nosoratana, fa ny mention dia mety hafa)
        for (const v of [name, name.toLowerCase()]) {
          const snap = await getDocs(query(collection(db, 'users'), where('username', '==', v), limit(1)));
          if (!snap.empty) {
            if (alive) navigate('/profile/' + snap.docs[0].id, { replace: true });
            return;
          }
        }
        if (alive) setState('notfound');
      } catch (e) {
        if (alive) setState('notfound');
      }
    })();
    return () => { alive = false; };
  }, [username, navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>
      {state === 'loading'
        ? 'Chargement…'
        : <>
            <p style={{ fontWeight: 700, color: '#050505', marginBottom: 6 }}>Utilisateur introuvable</p>
            <p>Aucun compte ne correspond à @{username}.</p>
            <button onClick={() => navigate('/')}
              style={{ marginTop: 16, background: '#1877F2', color: 'white', border: 'none', borderRadius: 10,
                       padding: '9px 18px', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Retour au fil
            </button>
          </>}
    </div>
  );
}
`;

{
  const rel = 'src/pages/UserByName.jsx';
  if (fs.existsSync(P(rel))) console.log('  ⏭  UserByName.jsx : efa misy');
  else { files[rel] = UBN; touched.push(rel); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 — App.jsx : route /u/:username
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/App.jsx';
  let s = load(rel);

  if (s.includes('UserByName')) {
    console.log('  ⏭  App.jsx : efa voapatch');
  } else {
    const anchor = '<Route path="/profile/:uid?"';
    if (countOf(s, anchor) !== 1) throw new Error('ASSERTION FAIL [App:route] : anchor tsy tokana');

    // Import : manaraka ny endrika lazy efa misy raha misy
    const lazyMatch = s.match(/const Profile\s*=\s*lazy\(\(\) => import\('\.\/pages\/Profile'\)\);/);
    if (lazyMatch) {
      s = s.replace(lazyMatch[0], lazyMatch[0] + "\nconst UserByName = lazy(() => import('./pages/UserByName'));");
    } else {
      const impMatch = s.match(/import Profile from '\.\/pages\/Profile';/);
      if (!impMatch) throw new Error('ASSERTION FAIL [App:import] : tsy hita ny import Profile');
      s = s.replace(impMatch[0], impMatch[0] + "\nimport UserByName from './pages/UserByName';");
    }

    const line = s.split('\n').find(l => l.includes(anchor));
    s = s.replace(line, line + '\n        <Route path="/u/:username"    element={<PrivateRoute><Layout><UserByName /></Layout></PrivateRoute>} />');

    save(rel, s);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 — pages/Home.jsx : @username + notification marina
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('mentionUsernames')) {
    console.log('  ⏭  Home.jsx : efa voapatch');
  } else {
    // 5a — mitondra ny username ao amin'ny lisitra
    s = rep(s,
      "      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, fullName: sn.data().fullName || '' } : null).catch(() => null)",
      "      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '' } : null).catch(() => null)",
      'home:loadFriends');

    // 5b — dropdown : mampiditra @username (tokana), fa tsy anarana voalohany
    s = rep(s,
      "                                setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@'+f.fullName.split(' ')[0]+' ') }));",
      "                                // @username (tokana) fa tsy anarana voalohany : mba tsy hifangaro\n                                const tag = f.username || f.fullName.split(' ')[0];\n                                setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@'+tag+' ') }));",
      'home:insert');

    // 5c — dropdown : aseho ny username
    s = rep(s,
      '                              <HiAtSymbol size={14} color="#1877F2"/> {f.fullName}',
      `                              <HiAtSymbol size={14} color="#1877F2"/>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {f.fullName}{f.username ? <span style={{ color:'#65676B' }}> @{f.username}</span> : null}
                              </span>`,
      'home:dropdown');

    // 5d — filtre : anarana NA username
    s = rep(s,
      "                      const opts = mentionFriends.filter(f => f.fullName.toLowerCase().includes(mentionQuery.q)).slice(0,5);",
      "                      const opts = mentionFriends.filter(f => f.fullName.toLowerCase().includes(mentionQuery.q)\n                        || (f.username || '').toLowerCase().includes(mentionQuery.q)).slice(0,5);",
      'home:filter');

    // 5e — notification : fifanarahana MARINA amin'ny username (fetra teny)
    s = rep(s,
      `    if (text.includes('@') && mentionFriends.length) {
      const low = text.toLowerCase();
      const mentioned = mentionFriends.filter(f => {
        const first = (f.fullName.split(' ')[0] || '').toLowerCase();
        return first && low.includes('@' + first);
      }).filter(f => f.uid !== currentUser.uid && f.uid !== post?.uid);`,
      `    if (text.includes('@') && mentionFriends.length) {
      // Fifanarahana MARINA : ny username ao anaty lahatsoratra no alaina,
      // miaraka amin'ny fetra teny. Teo aloha dia \`includes('@'+anarana)\` —
      // ka \`@tony\` dia nifanaraka tamin'ny \`@tonyzz\`, ary ny mailaka
      // \`x@tony.mg\` dia noraisina ho mention.
      const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;
      const mentionUsernames = new Set();
      let mm; RE.lastIndex = 0;
      while ((mm = RE.exec(text)) !== null) mentionUsernames.add(mm[2].toLowerCase());
      const mentioned = mentionFriends.filter(f => {
        const u = (f.username || '').toLowerCase();
        if (u && mentionUsernames.has(u)) return true;
        // Fiverenana amin'ny endrika taloha (@AnaranaVoalohany) — ho an'ny
        // namana tsy mbola manana username
        const first = (f.fullName.split(' ')[0] || '').toLowerCase();
        return !u && first && mentionUsernames.has(first);
      }).filter(f => f.uid !== currentUser.uid && f.uid !== post?.uid);`,
      'home:notif');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
