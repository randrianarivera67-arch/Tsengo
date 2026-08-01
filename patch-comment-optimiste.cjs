/**
 * patch-comment-optimiste.cjs   —  Réaction hita AVY HATRANY
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA NOTATERINA : ny réaction dia tsy miseho raha tsy avy nanao refresh.
 *
 * FOTOTRA : ny fanovana rehetra dia miandry ny `updateDoc` HO VITA, dia miandry
 *   ny listener hiverina. Amin'ny réseau malemy (na ao anaty APK) dia mety
 *   haharitra segondra maromaro izany — toa "tsy miasa".
 *
 * VAHAOLANA — fanavaozana OPTIMISTE :
 *   Ovaina eo an-toerana AVY HATRANY ny state, dia vao alefa amin'ny serveur.
 *   Ny listener dia hanamafy azy avy eo (na hanitsy raha nisy fifanoherana).
 *
 *   ⚠️ Raha TSY METY ny fandefasana, dia AVERINA ny sanda taloha (rollback) —
 *   raha tsy izany dia hisy réaction hita nefa tsy voatahiry.
 *
 * VOAKASIKA : reactToCmt · addComment · deleteCmt · saveEditCmt
 *             (src/pages/PostDetail.jsx ihany)
 *
 * Fampandehanana :  node patch-comment-optimiste.cjs --dry
 *                   node patch-comment-optimiste.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/PostDetail.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/PostDetail.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
if (s.includes('/* optimiste */')) { console.log('⏭  PostDetail.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① reactToCmt — io no notaterina ────────────────────────────────── */
s = rep(s,
  `    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setCmtReactPicker(null);`,
  `    /* optimiste */
    // Aseho AVY HATRANY, tsy miandry ny serveur. Raha tsy mety dia averina.
    const before = post.comments;
    setPost(p => (p ? { ...p, comments: updated } : p));
    setCmtReactPicker(null);
    try {
      await updateDoc(doc(db,'posts',postId),{comments:updated});
    } catch (e) {
      setPost(p => (p ? { ...p, comments: before } : p));   // rollback
    }`,
  'react');

/* ── ② addComment ───────────────────────────────────────────────────── */
s = rep(s,
  `    await updateDoc(doc(db,'posts',postId), { comments:arrayUnion(cmt) });
    setCmtText(''); setCmtMedia(null); setReplyTo(null); mentions.clearPicked();`,
  `    /* optimiste */
    const beforeAdd = post.comments || [];
    setPost(p => (p ? { ...p, comments: [...(p.comments || []), cmt] } : p));
    setCmtText(''); setCmtMedia(null); setReplyTo(null); mentions.clearPicked();
    try {
      await updateDoc(doc(db,'posts',postId), { comments:arrayUnion(cmt) });
    } catch (e) {
      setPost(p => (p ? { ...p, comments: beforeAdd } : p));
      return;
    }`,
  'add');

/* ── ③ deleteCmt ────────────────────────────────────────────────────── */
s = rep(s,
  `    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId), { comments:arrayRemove(cmt) });`,
  `    if (!window.confirm('Supprimer ce commentaire ?')) return;
    /* optimiste */
    const beforeDel = post.comments;
    setPost(p => (p ? { ...p, comments: (p.comments || []).filter(x => x.id !== cmt.id) } : p));
    try {
      await updateDoc(doc(db,'posts',postId), { comments:arrayRemove(cmt) });
    } catch (e) {
      setPost(p => (p ? { ...p, comments: beforeDel } : p));
    }`,
  'delete');

/* ── ④ saveEditCmt ──────────────────────────────────────────────────── */
s = rep(s,
  `    const updated = post.comments.map(c => c.id===oldCmt.id?{...c,text:newText.trim()}:c);
    await updateDoc(doc(db,'posts',postId), { comments:updated });
    setEditCmt(null);`,
  `    const updated = post.comments.map(c => c.id===oldCmt.id?{...c,text:newText.trim()}:c);
    /* optimiste */
    const beforeEdit = post.comments;
    setPost(p => (p ? { ...p, comments: updated } : p));
    setEditCmt(null);
    try {
      await updateDoc(doc(db,'posts',postId), { comments:updated });
    } catch (e) {
      setPost(p => (p ? { ...p, comments: beforeEdit } : p));
    }`,
  'edit');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (countOf(s, '/* optimiste */') !== 4) {
  throw new Error('FAIL : nandrasana 4, nahitana ' + countOf(s, '/* optimiste */'));
}
if (countOf(s, 'catch (e) {') < 4) throw new Error('FAIL : rollback tsy feno');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 4 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : fanavaozana optimiste + rollback');
