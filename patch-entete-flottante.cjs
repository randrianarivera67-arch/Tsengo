/**
 * patch-entete-flottante.cjs   —  En-tête manidina : Profile & GroupPage
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA : ny Home dia mampiasa `if (!(ownMedia && !nested)) {` — voasolo
 *   `if (false)` mba ho manidina foana.
 *   Ny Profile sy GroupPage kosa dia mampiasa TERNAIRE :
 *
 *       style={(ownMedia && !nested) ? { …manidina… } : { …mahazatra… }}
 *
 *   Ka tsy voakasik'ilay fanovana — ary ny texte miloko sy partagée dia tsy
 *   nahazo en-tête manidina.
 *
 * FANOVANA : ny fepetra dia atao `true` — manidina foana, mitovy amin'ny Home.
 *
 * Fampandehanana :  node patch-entete-flottante.cjs --dry
 *                   node patch-entete-flottante.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

// ⚠️ Kely ny fahasamihafana : ny GroupPage dia tsy misy `eventFrom` ao anaty
// fepetra. Regex no ampiasaina, tsy chaîne raikitra.
const RE = /<div style=\{\(!!\(post\.mediaURL \|\| \(post\.mediaURLs && post\.mediaURLs\.length\)\) && !\(?post\.sharedFrom[^)]*\)?\) \? \{/;
const NEW = "<div style={true /* manidina foana — mitovy amin'ny Home */ ? {";

for (const rel of ['src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  const s = read(P(rel));
  if (s === null) continue;
  const name = rel.split('/').pop();
  if (s.includes('manidina foana')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }
  const m = s.match(RE);
  if (!m) fail(name + ' : en-tête tsy hita');
  const n = (s.match(new RegExp(RE.source, 'g')) || []).length;
  if (n !== 1) fail(name + ' : nandrasana 1 en-tête, nahitana ' + n);
  files[rel] = s.replace(RE, NEW); touched.push(rel);
  console.log('  • ' + name);
}
if (!touched.length) { console.log('\n⏭  tsy nisy fanovana'); process.exit(0); }

for (const rel of touched) {
  const s = files[rel]; const n = rel.split('/').pop();
  if (!s.includes("position:'absolute', top:10, left:10, right:10, zIndex:4")) fail(n + ' : en-tête manidina very');
  if (!s.includes('CRISTAL_TEXTE')) fail(n + ' : faritra cristal simba');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra média simba');
  if (!s.includes('post-actions-row')) fail(n + ' : actions very');
  if (!s.includes('postMenu')) fail(n + ' : menu very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : en-tête manidina foana');
