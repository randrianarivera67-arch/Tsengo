/**
 * patch-groupe-3.cjs   —  GroupPage : voir plus + isa commentaire ao amin'ny résumé
 * ─────────────────────────────────────────────────────────────────────────────
 * ① « Voir plus / Voir moins » ho an'ny lahatsoratra FOTOTRA — tsy nisy ao
 *    amin'ny GroupPage (voamarina : 0 `expandedPosts[post.id]`).
 *    → Clamp 2 andalana + bokotra, mitovy amin'ny Home.
 *
 * ② Isa commentaire : afindra avy ao anaty bokotra mankany amin'ny RÉSUMÉ
 *    (and.1017), mitovy amin'ny Home. Ny bokotra dia lasa « Commenter » fotsiny.
 *    ⚠️ Natao MIARAKA : raha esorina ny isa ao anaty bokotra fa tsy ampiana
 *      ao amin'ny résumé dia VERY tanteraka izy.
 *
 * Fampandehanana :  node patch-groupe-3.cjs --dry
 *                   node patch-groupe-3.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/GroupPage.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ── ① Voir plus ho an'ny lahatsoratra fototra ── */
if (!s.includes("expandedPosts[post.id] ?")) {
  const m = s.match(/\{post\.content && \(post\.textBg \? <p style=\{\{[^}]*\}\}>[\s\S]*?<\/p> : <p style=\{\{([^}]*)\}\}><Linkify text=\{post\.content\} \/><\/p>\)\}/);
  if (!m) fail('lahatsoratra fototra tsy hita');
  const plain = m[1];
  const neo = m[0].replace(
    `<p style={{${plain}}}><Linkify text={post.content} /></p>)}`,
    `<>
                <p style={{${plain},
                  ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}><Linkify text={post.content} /></p>
                {post.content.length > 90 && (
                  <button onClick={e => { e.stopPropagation(); setExpandedPosts(p => ({ ...p, [post.id]: !p[post.id] })); }}
                    style={{ background:'none', border:'none', padding:'2px 0 0', cursor:'pointer', color:'#65676B', fontSize:12.5, fontWeight:600, fontFamily:'Poppins' }}>
                    {expandedPosts[post.id] ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </>)}`);
  if (neo === m[0]) fail('fanoloana lahatsoratra tsy nety');
  s = s.replace(m[0], neo);
  console.log('  • voir plus / voir moins nampiana');
} else console.log('  ⏭  voir plus : efa ao');

/* ── ② Isa commentaire → résumé ── */
const BTN = "Commenter{post.comments?.length > 0 ? ` (${post.comments.length})` : ''}";
if (c(BTN) > 0) {
  if (c(BTN) !== 2) fail('nandrasana 2 bokotra Commenter, nahitana ' + c(BTN));
  const SUM = "                <span style={{ fontSize: 13, color: '#65676B' }}>{total}</span>";
  if (c(SUM) !== 1) fail('résumé tsy tokana');
  // ⚠️ MIARAKA : ampiana ao amin'ny résumé ALOHA, dia esorina ao anaty bokotra
  s = s.replace(SUM, SUM +
    "\n                {post.comments?.length > 0 && (\n" +
    "                  <span style={{ fontSize: 13, color: '#65676B', marginLeft: 'auto' }}>\n" +
    "                    {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''}\n" +
    "                  </span>\n                )}");
  s = s.split(BTN).join('Commenter');
  console.log('  • isa commentaire nafindra tany amin\'ny résumé');
} else console.log('  ⏭  isa commentaire : efa voapatch');

/* ── Fanamarinana ── */
if (!s.includes('Voir moins')) fail('voir plus very');
if (!s.includes('setExpandedPosts')) fail('setter very');
if (s.includes('${post.comments.length})`')) fail('isa mbola ao anaty bokotra');
if (!s.includes('{post.comments.length} commentaire')) fail('isa tsy tafiditra ao amin\'ny résumé');
if (!s.includes('CRISTAL_TEXTE')) fail('faritra cristal simba');
if (!s.includes('FARITRA MANIDINA')) fail('faritra média simba');
if (c("className='post-actions-row'") !== 2) fail('actions tsy indroa');
if (!s.includes("post.id + ':s'")) fail('voir plus partagée very');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
