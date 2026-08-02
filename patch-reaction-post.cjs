/**
 * patch-reaction-post.cjs   —  Réaction publication hita AVY HATRANY
 * ─────────────────────────────────────────────────────────────────────────────
 * ① FOTOTRA HITA :
 *
 *    Ny `reactToPost` dia miandry ny `updateDoc`, dia miandry ny LISTENER
 *    hiverina. Nefa ny MODE LITE dia MAMONO ny listener feed :
 *
 *        if (lite) { setPostsLoading(false); return; }   // Home.jsx
 *
 *    Ka tsy misy zavatra manavao ny state → tsy miseho MIHITSY ny réaction
 *    raha tsy manao pull-to-refresh.
 *
 *    Izaho no nahatonga izany tamin'ny patch Mode Lite : tsy nodinihiko ny
 *    fiantraikany amin'ny fanovana ataon'ny mpampiasa.
 *
 *    → Fanavaozana OPTIMISTE amin'ny `feedRaw` (loharanon'ny `posts`).
 *      Miasa na velona na maty ny listener. Rollback raha tsy mety.
 *
 * ② CLIC : ny commentaire IHANY no manokatra ny panneau
 *
 *    Ankehitriny : `openPost(post.id)` → PostDetail → sheet MISOKATRA HO AZY.
 *    Ka na ny clic amin'ny SARY na amin'ny lahatsoratra aza dia mamoaka azy.
 *
 *    → `openPost` mandefa marika (`?c=1`) rehefa avy amin'ny bokotra
 *      commentaire ihany. Ny PostDetail dia manokatra araka izany.
 *
 * VOAKASIKA : pages/Home.jsx · pages/PostDetail.jsx
 *
 * Fampandehanana :  node patch-reaction-post.cjs --dry
 *                   node patch-reaction-post.cjs
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

/* ═══ ① Réaction optimiste ════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('/* réaction optimiste */')) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    s = rep(s,
      `    const my = reactions[currentUser.uid];
    if (my === emoji) {
      const u = { ...reactions }; delete u[currentUser.uid];
      await updateDoc(doc(db,'posts',postId), { reactions: u });
    } else {
      await updateDoc(doc(db,'posts',postId), { [\`reactions.\${currentUser.uid}\`]: emoji });`,
      `    const my = reactions[currentUser.uid];

    /* réaction optimiste */
    // ⚠️ Ny MODE LITE dia mamono ny listener feed. Raha miandry azy isika dia
    // TSY MISEHO MIHITSY ny réaction raha tsy manao refresh. Ka ovaina eo
    // an-toerana avy hatrany, dia averina raha tsy mety ny fandefasana.
    const nextReactions = (my === emoji)
      ? (() => { const u = { ...reactions }; delete u[currentUser.uid]; return u; })()
      : { ...reactions, [currentUser.uid]: emoji };
    const beforeReactions = reactions;
    setFeedRaw(prev => prev.map(p => (p.id === postId ? { ...p, reactions: nextReactions } : p)));
    const rollback = () =>
      setFeedRaw(prev => prev.map(p => (p.id === postId ? { ...p, reactions: beforeReactions } : p)));

    if (my === emoji) {
      const u = { ...reactions }; delete u[currentUser.uid];
      try { await updateDoc(doc(db,'posts',postId), { reactions: u }); }
      catch (e) { rollback(); return; }
    } else {
      try { await updateDoc(doc(db,'posts',postId), { [\`reactions.\${currentUser.uid}\`]: emoji }); }
      catch (e) { rollback(); return; }`,
      'react');

    save(rel, s);
  }
}

/* ═══ ② Clic : commentaire ihany no manokatra ny panneau ══════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes("openPost(post.id, null, true)")) { console.log('  ⏭  Home.jsx (clic) : efa voapatch'); }
  else {
    // ⚠️ `openPost(id, anchorId)` dia manana paramètre faharoa EFA MISY.
    // Ny marika dia apetraka amin'ny FAHATELO mba tsy hanimba azy.
    s = rep(s,
      '  const openPost = (id, anchorId) => {',
      '  const openPost = (id, anchorId, withComments) => {',
      'openPost:sig');

    s = rep(s,
      "    navigate('/post/' + id);\n  };",
      "    navigate('/post/' + id + (withComments ? '?c=1' : ''));\n  };",
      'openPost:nav');

    // Bokotra « Commenter » → marika (paramètre fahatelo)
    s = rep(s,
      "              <button onClick={() => openPost(post.id)} className='post-action-btn'>\n                <NeonComment size={18}/> Commenter",
      "              <button onClick={() => openPost(post.id, null, true)} className='post-action-btn'>\n                <NeonComment size={18}/> Commenter",
      'bouton');

    save(rel, s);
  }
}

/* ═══ ③ PostDetail : manokatra araka ny marika ihany ══════════════════ */
{
  const rel = 'src/pages/PostDetail.jsx';
  let s = load(rel);

  if (s.includes("get('c')")) { console.log('  ⏭  PostDetail.jsx : efa voapatch'); }
  else {
    s = rep(s,
      "  const [sheetOpen,     setSheetOpen]  = useState(true);   // misokatra ho azy (fomba Facebook)",
      `  // Misokatra IHANY raha avy amin'ny bokotra commentaire (?c=1).
  // Ny clic amin'ny sary na ny lahatsoratra dia tsy tokony hamoaka azy.
  const [sheetOpen,     setSheetOpen]  = useState(() => {
    try { return new URLSearchParams(window.location.search).get('c') === '1'; }
    catch (e) { return false; }
  });`,
      'sheetOpen');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
