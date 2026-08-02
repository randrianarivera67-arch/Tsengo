/**
 * patch-finitions-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ① RÉTRÉCI : LARGEUR ihany, tsy ny longueur.
 *    Tamin'ny patch teo aloha dia novako ny efatra (left/right/top/bottom).
 *    Ny nangatahina dia ny SAKANY ihany :
 *      left/right : 10 → 16   (tazonina — io no rétréci)
 *      top/bottom : 16 → 10   (AVERINA — tsy tokony niova)
 *
 * ② `@username` NESORINA amin'ny en-tête publication.
 *    Ny daty ihany no mijanona : « Il y a 2 h ».
 *    ⚠️ Ny saha `authorUsername` dia TAZONINA ao amin'ny données (and. 983) —
 *      mety ampiasaina any an-kafa. Ny fampisehoana ihany no esorina.
 *
 * VOAKASIKA : src/pages/Home.jsx ihany.
 *
 * Fampandehanana :  node patch-finitions-2.cjs --dry
 *                   node patch-finitions-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 200) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① Longueur averina (top / bottom) ──────────────────────────────── */
if (s.includes('top:boosted?34:16')) {
  s = rep(s, 'top:boosted?34:16, left:16, right:16, zIndex:4',
             'top:boosted?34:10, left:16, right:16, zIndex:4', 'top');
  s = rep(s, "position:'absolute', left:16, right:16, bottom:16, zIndex:3",
             "position:'absolute', left:16, right:16, bottom:10, zIndex:3", 'bottom');
  console.log('  • longueur averina (top/bottom 10) · largeur tazonina (16)');
} else {
  console.log('  ⏭  toerana : efa mety');
}

/* ── ② @username nesorina ───────────────────────────────────────────── */
if (s.includes('@{post.authorUsername}')) {
  s = rep(s,
    `<p style={{ fontSize:12, color:'#65676B' }}>@{post.authorUsername} · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>`,
    `<p style={{ fontSize:12, color:'#65676B' }}>{post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>`,
    'username');
  console.log('  • @username nesorina (daty ihany no mijanona)');
} else {
  console.log('  ⏭  @username : efa voaesotra');
}

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (s.includes('@{post.authorUsername}')) throw new Error('FAIL : mbola misy @username');
if (!s.includes('left:16, right:16, zIndex:4')) throw new Error('FAIL : largeur en-tête very');
if (!s.includes('left:16, right:16, bottom:10')) throw new Error('FAIL : largeur barre very');
if (s.includes('bottom:16, zIndex:3')) throw new Error('FAIL : longueur tsy naverina');
if (!s.includes('authorUsername: asPage')) throw new Error('FAIL : saha authorUsername very ao amin\'ny données');
if (!s.includes('timeAgo(post.createdAt)')) throw new Error('FAIL : daty very');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '\n✅ DRY-RUN : fanovana mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
