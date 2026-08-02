/**
 * patch-post-icones.cjs   —  Icône action publication : neon rose, lehibe
 * ─────────────────────────────────────────────────────────────────────────────
 * TOE-JAVATRA VOAMARINA (samy hafa ny telo) :
 *   Home       : NeonLike 19 · #65676B foana (tsy miova na dia nanao réaction)
 *   Profile    : NeonLike 19 · MANGA raha nanao réaction
 *   GroupPage  : EMOJI 👍 (tsy Neon mihitsy) · HiChat / HiShare (tsy Neon)
 *
 * ASA :
 *   ① Icône lehibe kokoa : 18/19 → 25 px (réaction, commentaire, partage)
 *   ② Loko ROSE #FF2D8D rehefa nanao réaction (fa tsy manga, fa tsy gris)
 *   ③ GroupPage : emoji 👍 sy HiChat/HiShare → NeonLike / NeonComment / NeonShare
 *      — mba HITOVY ny telo, araka ny nangatahina.
 *
 * ⚠️ TSY VOAKASIKA : ny fizotra (reactToPost, openPost, sharePost), ny picker
 *   réaction, ny isa, ny label. Endrika ihany no ovaina.
 *
 * VOAKASIKA : pages/Home.jsx · pages/Profile.jsx · pages/GroupPage.jsx
 *
 * Fampandehanana :  node patch-post-icones.cjs --dry
 *                   node patch-post-icones.cjs
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

const ROSE = "'#FF2D8D'";

/* ═══ ① Home.jsx ══════════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);
  if (s.includes('NeonLike size={25}')) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    s = rep(s,
      `                  {myR
                    ? <span style={{ fontSize:18, lineHeight:1 }}>{myR}</span>
                    : <NeonLike size={19} color={'#65676B'}/>}`,
      `                  {myR && myR !== '👍'
                    ? <span style={{ fontSize:24, lineHeight:1 }}>{myR}</span>
                    : <NeonLike size={25} color={myR ? ${ROSE} : '#65676B'}/>}`,
      'home:like');

    s = rep(s, '<NeonComment size={18}/> Commenter', '<NeonComment size={25}/> Commenter', 'home:comment');
    s = rep(s, '<NeonShare size={18}/>', '<NeonShare size={25}/>', 'home:share');
    save(rel, s);
  }
}

/* ═══ ② Profile.jsx ═══════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = load(rel);
  if (s.includes('NeonLike size={25}')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    s = rep(s,
      "<NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/>",
      `<NeonLike size={25} color={myR ? ${ROSE} : '#65676B'}/>`,
      'profile:like');

    s = rep(s,
      "<NeonLike size={19} color={selectedPost.reactions?.[currentUser.uid]?'#FF2D8D':'#65676B'}/>",
      "<NeonLike size={25} color={selectedPost.reactions?.[currentUser.uid]?'#FF2D8D':'#65676B'}/>",
      'profile:like2');

    s = s.split('<NeonComment size={18}/>').join('<NeonComment size={25}/>');
    s = s.split('<NeonShare size={18}/>').join('<NeonShare size={25}/>');
    save(rel, s);
  }
}

/* ═══ ③ GroupPage.jsx : emoji → Neon (mba hitovy) ═════════════════════ */
{
  const rel = 'src/pages/GroupPage.jsx';
  let s = load(rel);
  if (s.includes('NeonLike')) { console.log('  ⏭  GroupPage.jsx : efa voapatch'); }
  else {
    // Import
    const m = s.match(/import \{([^}]*)\} from '\.\.\/components\/NeonIcons';/);
    if (m) {
      const inner = m[1].replace(/[\s,]*$/, '');
      s = s.replace(m[0], `import {${inner}, NeonLike, NeonComment, NeonShare } from '../components/NeonIcons';`);
    } else {
      const anchor = s.match(/^import .*from '\.\.\/components\/[^']*';$/m);
      if (!anchor) throw new Error('ASSERTION FAIL [group:import] : tsy hita ny toerana');
      s = s.replace(anchor[0], anchor[0] + "\nimport { NeonLike, NeonComment, NeonShare } from '../components/NeonIcons';");
    }

    s = rep(s,
      `                  style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight: 700 } : {}}>
                  <span style={{ fontSize: 17 }}>{myR || '👍'}</span> J'aime`,
      `                  style={myR ? { color: '#FF2D8D', fontWeight: 700 } : {}}>
                  {myR && myR !== '👍'
                    ? <span style={{ fontSize: 24, lineHeight: 1 }}>{myR}</span>
                    : <NeonLike size={25} color={myR ? ${ROSE} : '#65676B'}/>}
                  {' '}J'aime`,
      'group:like');

    s = rep(s, '<HiChat size={18} /> Commenter', '<NeonComment size={25} /> Commenter', 'group:comment');
    s = rep(s, '<HiShare size={18} /> Partager', '<NeonShare size={25} /> Partager', 'group:share');
    save(rel, s);
  }
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
{
  let total = 0;
  for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
    const s = files[rel] || read(P(rel));
    if (/Neon(Like|Comment|Share) size=\{1[89]\}/.test(s)) {
      throw new Error('FAIL [' + rel + '] : mbola misy icône 18/19 px');
    }
    total += (s.match(/Neon(Like|Comment|Share) size=\{25\}/g) || []).length;
  }
  if (total < 9) throw new Error('FAIL : nandrasana ≥ 9 icône 25 px, nahitana ' + total);

  const g = files['src/pages/GroupPage.jsx'] || read(P('src/pages/GroupPage.jsx'));
  if (g.includes("<span style={{ fontSize: 17 }}>{myR || '👍'}</span>")) {
    throw new Error('FAIL : GroupPage mbola emoji');
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
