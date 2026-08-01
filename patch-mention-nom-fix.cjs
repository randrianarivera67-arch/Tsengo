/**
 * patch-mention-nom-fix.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ① BUG NAMPIDIRIKO — `@[object Object]`
 *
 *    Ny `MentionPanel` dia mandefa OBJET izao : `onPick({ name, uid })`.
 *    Ny PostDetail / Profile / Reels dia mampiasa `mentions.insert(v, tag)`
 *    izay mandray objet tsara.
 *    FA ny Home.jsx dia manana handler ANATINY :
 *
 *        onPick={(tag) => setContent(prev => prev.replace(AT, '@' + tag + ' '))}
 *
 *    `'@' + {objet}` → « @[object Object] ». Toerana ROA (composer + commentaire).
 *    → Soloina ny endrika token entité mitovy amin'ny `insert`.
 *
 * ② CLIC COMMENTAIRE → PostDetail
 *
 *    Voamarina : ny Home dia EFA mankany amin'ny PostDetail (`openPost`) — ny
 *    `openCmt` ao aminy dia code maty. Ny GroupPage koa dia tsy manana
 *    commentaire in-line.
 *    Ny PROFILE ihany no mbola manokatra commentaire in-line (toerana 2).
 *    → Soloina `navigate('/post/:id')`, mba hitovy ny fizotra na aiza na aiza.
 *
 * VOAKASIKA : pages/Home.jsx · pages/Profile.jsx
 *
 * Fampandehanana :  node patch-mention-nom-fix.cjs --dry
 *                   node patch-mention-nom-fix.cjs
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

/* ═══ ① Home.jsx : token entité ao amin'ny handler roa ════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);

  if (s.includes('mentionToken')) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    // Helper iray, ampiasain'ny roa
    s = rep(s,
      '  const MENTION_MAX = 200;   // fetra mpandray isaky ny commentaire',
      `  const MENTION_MAX = 200;   // fetra mpandray isaky ny commentaire

  /**
   * Token mention — endrika mitovy amin'ny \`useMentions.insert\`.
   * ⚠️ Ny \`MentionPanel\` dia mandefa OBJET { name, uid } : ny fampiarahana
   * tsotra (\`'@' + tag\`) dia mamokatra « @[object Object] ».
   */
  const mentionToken = (pick) => {
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\\[\\]\\n]/g, '').trim() || 'Utilisateur';
      return '@[' + name + '](' + pick.uid + ') ';
    }
    return '@' + pick + ' ';
  };`,
      'home:helper');

    // Composer
    s = rep(s,
      "                    setContent(prev => prev.replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' '));",
      "                    setContent(prev => prev.replace(/@([\\p{L}0-9_-]*)$/u, mentionToken(tag)));",
      'home:composer');

    // Commentaire
    s = rep(s,
      "                        setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, '@' + tag + ' ') }));",
      "                        setCmtText(prev => ({ ...prev, [post.id]: (prev[post.id]||'').replace(/@([\\p{L}0-9_-]*)$/u, mentionToken(tag)) }));",
      'home:comment');

    save(rel, s);
  }
}

/* ═══ ② Profile.jsx : clic commentaire → PostDetail ═══════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);

  if (s.includes('/* → PostDetail */')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    // Isa commentaire
    s = rep(s,
      "              <span onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ fontSize:13, color:'#65676B', cursor:'pointer' }}>",
      "              <span onClick={() => navigate(`/post/${post.id}`)} /* → PostDetail */ style={{ fontSize:13, color:'#65676B', cursor:'pointer' }}>",
      'pf:count');

    // Bokotra « Commenter »
    s = rep(s,
      "          <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} className='post-action-btn'>",
      "          <button onClick={() => navigate(`/post/${post.id}`)} className='post-action-btn'>",
      'pf:button');

    save(rel, s);
  }
}

/* ═══ Fanamarinana farany ════════════════════════════════════════════ */
{
  const h = files['src/pages/Home.jsx'] || read(P('src/pages/Home.jsx'));
  if (h.includes("'@' + tag + ' '")) {
    throw new Error("FAIL : mbola misy `'@' + tag` ao amin'ny Home — mamokatra [object Object]");
  }
  const p = files['src/pages/Profile.jsx'] || read(P('src/pages/Profile.jsx'));
  if (p.includes('setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))')) {
    throw new Error('FAIL : mbola misy toggle in-line ao amin\'ny Profile');
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
