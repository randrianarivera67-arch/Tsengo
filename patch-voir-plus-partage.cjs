/**
 * patch-voir-plus-partage.cjs   —  « Voir plus » ho an'ny publication partagée
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny lahatsoratr'ilay publication NOZARAINA dia aseho manontolo — lasa
 *   lava be. Ny publication mahazatra dia manana « Voir plus » (>90 marika),
 *   fa ny partagée dia tsy nanana.
 *
 * FANOVANA : clamp 4 andalana + bokotra « Voir plus / Voir moins ».
 *   Ny fanalahidy dia `post.id + ':s'` — misaraka amin'ny an'ny lahatsoratra
 *   fototra, ka azo sokafana tsirairay izy roa.
 *
 * ⚠️ GroupPage dia TSY MANANA `expandedPosts` — ampiana.
 *
 * VOAKASIKA : pages/Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-voir-plus-partage.cjs --dry
 *                   node patch-voir-plus-partage.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

const CFG = [
  { rel: 'src/pages/Home.jsx',
    old: `{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}><Linkify text={post.sharedFrom.content} /></p>}`,
    ind: '                  ' },
  { rel: 'src/pages/Profile.jsx',
    old: `{post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}><Linkify text={post.sharedFrom.content} /></p>}`,
    ind: '              ' },
  { rel: 'src/pages/GroupPage.jsx',
    old: null,   // hita amin'ny regex (elanelana hafa)
    ind: '                  ' },
];

for (const cfg of CFG) {
  const name = cfg.rel.split('/').pop();
  let s = read(P(cfg.rel));
  if (s.includes("':s'")) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  // ── GroupPage : ampiana ny state raha tsy misy
  if (!s.includes('expandedPosts')) {
    const A = '  const [postMenu,   setPostMenu]   = useState(null);';
    const B = '  const [viewerState, setViewerState]';
    const anchor = s.includes(A) ? A : (s.includes(B) ? B : null);
    if (!anchor) throw new Error('ASSERTION FAIL [' + name + '] : tsy hita ny toerana ho an\'ny state');
    s = s.replace(anchor, '  const [expandedPosts, setExpandedPosts] = useState({});\n' + anchor);
    console.log('  • ' + name + ' : expandedPosts nampiana');
  }

  // ── Fitadiavana ny andalana partagée
  let old = cfg.old;
  if (!old || !s.includes(old)) {
    const m = s.match(/\{post\.sharedFrom\.content && <p style=\{\{[^}]*\}\}><Linkify text=\{post\.sharedFrom\.content\} \/><\/p>\}/);
    if (!m) throw new Error('ASSERTION FAIL [' + name + '] : andalana partagée tsy hita');
    old = m[0];
  }
  if (s.split(old).length - 1 !== 1) throw new Error('ASSERTION FAIL [' + name + '] : tsy tokana (' + (s.split(old).length - 1) + ')');

  const style = old.match(/style=\{\{([^}]*)\}\}/)[1];
  const I = cfg.ind;
  const neo = `{post.sharedFrom.content && (<>
${I}  <p style={{${style}, ...(expandedPosts[post.id + ':s'] ? {} : { display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}><Linkify text={post.sharedFrom.content} /></p>
${I}  {post.sharedFrom.content.length > 140 && (
${I}    <button onClick={e => { e.stopPropagation(); setExpandedPosts(p => ({ ...p, [post.id + ':s']: !p[post.id + ':s'] })); }}
${I}      style={{ background:'none', border:'none', padding:'0 12px 8px', cursor:'pointer', color:'#65676B', fontSize:12.5, fontWeight:600, fontFamily:'Poppins' }}>
${I}      {expandedPosts[post.id + ':s'] ? 'Voir moins' : 'Voir plus'}
${I}    </button>
${I}  )}
${I}</>)}`;

  s = s.replace(old, neo);
  console.log('  • ' + name + ' : « Voir plus » nampiana');
  save(cfg.rel, s);
}

/* ── Fanamarinana farany ── */
for (const rel of touched) {
  const s = files[rel];
  const n = rel.split('/').pop();
  if (!s.includes("expandedPosts[post.id + ':s']")) throw new Error('FAIL [' + n + '] : fanalahidy partagée very');
  if (!s.includes('WebkitLineClamp:4')) throw new Error('FAIL [' + n + '] : clamp very');
  if (!s.includes('Voir moins')) throw new Error('FAIL [' + n + '] : bokotra very');
  if (!s.includes('<Linkify text={post.sharedFrom.content} />')) throw new Error('FAIL [' + n + '] : Linkify very');
  if ((s.match(/setExpandedPosts/g) || []).length < 1) throw new Error('FAIL [' + n + '] : setter very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
