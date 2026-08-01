/**
 * patch-mentions-partout.cjs   —  Mention amin'ny COMMENTAIRE REHETRA
 * ─────────────────────────────────────────────────────────────────────────────
 * FAHADISOANA NOHITSIANA :
 *   Ny mention dia napetraka tao amin'ny `Home.jsx` IHANY. Nefa ny mpampiasa
 *   dia manoratra commentaire amin'ny toerana MAROMARO — indrindra ao amin'ny
 *   PostDetail (`/post/…`), izay tsy nisy na dia iray aza (voamarina : 0).
 *
 *   TOERANA VOAREFY :
 *     pages/Home.jsx          ✅ efa misy (tsy kitihina)
 *     pages/PostDetail.jsx    ❌ → ampiana
 *     pages/Profile.jsx       ❌ → ampiana
 *     pages/Reels.jsx         ❌ → ampiana
 *     components/MediaViewer  ❌ → asa manaraka (ny champ dia entin'ny ray
                                 aman-dreny ; mila prop fanampiny)
 *
 * RAFITRA — hook MIZARA `useMentions()` :
 *   Mba tsy hiverimberina ny code, ary indrindra mba tsy hisy pejy hadino
 *   intsony, ny logika manontolo (loharano, filtre, fampidirana) dia ao anaty
 *   hook iray. Ny pejy dia miantso azy ary mandefa ny `MentionPanel`.
 *
 * VOAKASIKA : hooks/useMentions.js (VAOVAO) + 4 pejy.
 * TSY VOAKASIKA : Home.jsx (efa mandeha ; tsy kitihina mba tsy hisy régression).
 *
 * Fampandehanana :  node patch-mentions-partout.cjs --dry
 *                   node patch-mentions-partout.cjs
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

/* ═══ 1) hooks/useMentions.js — logika mizara ═══════════════════════════ */
const HOOK = `// src/hooks/useMentions.js
// Logika mention mizara — mba tsy hiverimberina, ary indrindra mba tsy hisy
// toerana hadino. Ny pejy dia miantso ity hook ity ary mandefa <MentionPanel/>.
//
// Fampiasana :
//   const m = useMentions(userProfile, currentUser);
//   <input value={v} onChange={e => { setV(e.target.value); m.onType(e.target.value, key); }} />
//   <MentionPanel open={m.isOpen(key)} query={m.query} people={m.people}
//                 onPick={tag => setV(m.insert(v, tag))} onClose={m.close} />
import { useState, useRef, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** Mifanaraka amin'ny parser ao amin'ny appLink.js */
const AT_RE = /@([\\p{L}0-9_.-]*)$/u;

export default function useMentions(userProfile, currentUser) {
  const [active, setActive] = useState(null);   // { key, q } | null
  const [people, setPeople] = useState([]);
  const loadingRef = useRef(false);

  /** Namana + abonnés + abonnements (fetra 60, dédoublonné). */
  const loadPeople = useCallback(async () => {
    if (people.length || loadingRef.current) return;
    const uids = [...new Set([
      ...(userProfile?.friends   || []),
      ...(userProfile?.followers || []),
      ...(userProfile?.following || []),
    ])].filter(u => u && u !== currentUser?.uid).slice(0, 60);
    if (!uids.length) return;
    loadingRef.current = true;
    try {
      const list = await Promise.all(uids.map(uid =>
        getDoc(doc(db, 'users', uid))
          .then(sn => sn.exists()
            ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '',
                photo: sn.data().photoThumb || sn.data().photoURL || '' }
            : null)
          .catch(() => null)
      ));
      setPeople(list.filter(Boolean).filter(p => p.fullName || p.username));
    } finally { loadingRef.current = false; }
  }, [people.length, userProfile, currentUser]);

  /** Antsoina isaky ny fanovana ny champ. \`key\` manavaka ny champ. */
  const onType = useCallback((value, key = 'default') => {
    const m = String(value || '').match(AT_RE);
    if (m) { loadPeople(); setActive({ key, q: m[1].toLowerCase() }); }
    else setActive(null);
  }, [loadPeople]);

  const isOpen = useCallback((key = 'default') => active?.key === key, [active]);
  const close  = useCallback(() => setActive(null), []);

  /** Mamerina ny lahatsoratra misy ny mention voafidy. */
  const insert = useCallback((value, tag) => {
    setActive(null);
    return String(value || '').replace(AT_RE, '@' + tag + ' ');
  }, []);

  return { people, query: active?.q || '', isOpen, onType, close, insert };
}
`;
{
  const rel = 'src/hooks/useMentions.js';
  if (fs.existsSync(P(rel))) console.log('  ⏭  useMentions.js : efa misy');
  else { files[rel] = HOOK; touched.push(rel); }
}

/* ═══ 2) PostDetail.jsx ═════════════════════════════════════════════════ */
{
  const rel = 'src/pages/PostDetail.jsx';
  let s = load(rel);
  if (s.includes('useMentions')) { console.log('  ⏭  PostDetail.jsx : efa voapatch'); }
  else {
    s = rep(s, "import Linkify from '../components/Linkify';",
      "import Linkify from '../components/Linkify';\nimport MentionPanel from '../components/MentionPanel';\nimport useMentions from '../hooks/useMentions';", 'pd:import');

    s = rep(s, "  const [commentText,   setCmtText]    = useState('');",
      "  const [commentText,   setCmtText]    = useState('');\n  const mentions = useMentions(userProfile, currentUser);",
      'pd:state');

    s = rep(s,
      "value={commentText} onChange={e=>setCmtText(e.target.value)}",
      "value={commentText} onChange={e=>{ setCmtText(e.target.value); mentions.onType(e.target.value); }}",
      'pd:onchange');

    s = rep(s,
      `            <input className="input" placeholder={replyTo?\`Répondre à \${replyTo}...\`:t('writeComment')}`,
      `            <MentionPanel open={mentions.isOpen()} query={mentions.query} people={mentions.people}
              showSpecials={post?.uid === currentUser?.uid}
              onPick={tag => setCmtText(v => mentions.insert(v, tag))} onClose={mentions.close} />
            <input className="input" placeholder={replyTo?\`Répondre à \${replyTo}...\`:t('writeComment')}`,
      'pd:panel');
    save(rel, s);
  }
}

/* ═══ 3) Profile.jsx ════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);
  if (s.includes('useMentions')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    s = rep(s, "import Linkify from '../components/Linkify';",
      "import Linkify from '../components/Linkify';\nimport MentionPanel from '../components/MentionPanel';\nimport useMentions from '../hooks/useMentions';", 'pf:import');

    const anchor = '  const targetUid = uid  || currentUser?.uid;';
    s = rep(s, anchor, anchor + '\n  const mentions = useMentions(userProfile, currentUser);', 'pf:state');

    s = rep(s,
      "value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))}",
      "value={cmtText[post.id]||''} onChange={e=>{ setCmtText(p=>({...p,[post.id]:e.target.value})); mentions.onType(e.target.value, post.id); }}",
      'pf:onchange');

    s = rep(s,
      `              <input className="input" placeholder={replyTo[post.id]?\`Répondre à \${replyTo[post.id]}...\`:t('writeComment')}`,
      `              <MentionPanel open={mentions.isOpen(post.id)} query={mentions.query} people={mentions.people}
                showSpecials={post.uid === currentUser?.uid}
                onPick={tag => setCmtText(p => ({ ...p, [post.id]: mentions.insert(p[post.id] || '', tag) }))} onClose={mentions.close} />
              <input className="input" placeholder={replyTo[post.id]?\`Répondre à \${replyTo[post.id]}...\`:t('writeComment')}`,
      'pf:panel');
    save(rel, s);
  }
}

/* ═══ 4) Reels.jsx ══════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Reels.jsx';
  let s = load(rel);
  if (s.includes('useMentions')) { console.log('  ⏭  Reels.jsx : efa voapatch'); }
  else {
    const impRe = /import Linkify from '\.\.\/components\/Linkify';/;
    if (!impRe.test(s)) throw new Error('ASSERTION FAIL [rl:import] : tsy hita ny import Linkify');
    s = s.replace(impRe, "import Linkify from '../components/Linkify';\nimport MentionPanel from '../components/MentionPanel';\nimport useMentions from '../hooks/useMentions';");

    const anchor = '  async function addComment(postId) {';
    s = rep(s, anchor, '  const mentions = useMentions(userProfile, currentUser);\n\n' + anchor, 'rl:state');

    s = rep(s,
      "              value={commentText} onChange={e=>setCommentText(e.target.value)}",
      "              value={commentText} onChange={e=>{ setCommentText(e.target.value); mentions.onType(e.target.value); }}",
      'rl:onchange');

    // Panel : ampidirina alohan'ny bokotra video (frère mazava, tsy fragment)
    s = rep(s,
      `            <button onClick={()=>cVideoRef.current?.click()}`,
      `            <MentionPanel open={mentions.isOpen()} query={mentions.query} people={mentions.people}
              showSpecials={false}
              onPick={tag => setCommentText(v => mentions.insert(v, tag))} onClose={mentions.close} />
            <button onClick={()=>cVideoRef.current?.click()}`,
      'rl:panel');
    save(rel, s);
  }
}

/* ═══ Fanamarinana farany ═══════════════════════════════════════════════ */
for (const [rel, n] of [['src/pages/PostDetail.jsx', 1], ['src/pages/Profile.jsx', 1]]) {
  const c = countOf(files[rel] || read(P(rel)), '<MentionPanel');
  if (c !== n) throw new Error('FAIL [' + rel + '] : nandrasana ' + n + ' MentionPanel, nahitana ' + c);
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
