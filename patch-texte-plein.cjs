/**
 * patch-texte-plein.cjs   —  Texte miloko : mameno + zorony 16 px
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny bloc miloko dia `minHeight:200` fa tsy mameno ny faritra cristal
 *   (izay manana `minHeight:300` + padding 78 px). Ka mipetraka kely eo
 *   afovoany, misy fond be manodidina.
 *
 * FANOVANA : `width/height 100%` + `borderRadius 16` — mameno ny faritra.
 *   Ny padding 28 px dia tazonina ho an'ny lahatsoratra.
 *
 * VOAKASIKA : Home.jsx · Profile.jsx · GroupPage.jsx (izay misy azy)
 *
 * Fampandehanana :  node patch-texte-plein.cjs --dry
 *                   node patch-texte-plein.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

const OLD = "post.textBg ? { background: post.textBg, minHeight:200,";
const NEW = "post.textBg ? { background: post.textBg, width:'100%', height:'100%', minHeight:200, borderRadius:16,";

let total = 0;
for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  const s = read(P(rel));
  if (s === null) continue;
  const name = rel.split('/').pop();
  if (s.includes("width:'100%', height:'100%', minHeight:200")) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }
  const n = s.split(OLD).length - 1;
  if (n === 0) { console.log('  ⏭  ' + name + ' : tsy misy texte miloko'); continue; }
  if (n !== 1) fail(name + ' : nandrasana 1, nahitana ' + n);
  files[rel] = s.replace(OLD, NEW); touched.push(rel); total++;
  console.log('  • ' + name);
}
if (total === 0) { console.log('\n⏭  tsy nisy fanovana'); process.exit(0); }

for (const rel of touched) {
  const s = files[rel]; const n = rel.split('/').pop();
  if (!s.includes("width:'100%', height:'100%'")) fail(n + ' : fanovana tsy tafiditra');
  if (!s.includes('borderRadius:16')) fail(n + ' : zorony very');
  if (!s.includes("padding:'28px 20px'")) fail(n + ' : padding lahatsoratra very');
  if (!s.includes('CRISTAL_TEXTE')) fail(n + ' : faritra cristal simba');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
