/**
 * patch-cristal-colonne.cjs   —  Faritra cristal : column fa tsy row
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA : ny classe `.media-cristal` dia `display: flex` — ary ny
 *   `flex-direction` default dia **row**. Ka ny bloc texte miloko sy ny
 *   bokotra « Voir plus » dia lasa RAHALAHY MIFANILA :
 *
 *       [ bloc miloko ]  [ Voir plus ]      ← tsy izay no tadiavina
 *
 *   Izay no antony tsy mameno ny bloc, ary « Voir plus » eo ankavanana.
 *
 * FANOVANA : `flexDirection:'column'` ao amin'ny style CRISTAL_TEXTE.
 *   Ny zanaka dia mifanaraka mitsangana, ary ny bloc dia mameno ny sakany.
 *
 * VOAKASIKA : Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-cristal-colonne.cjs --dry
 *                   node patch-cristal-colonne.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

const OLD = `                return { position:'relative', cursor:'pointer', aspectRatio:'auto',
                         minHeight:300, padding:'78px 14px 78px' };`;
const NEW = `                // ⚠️ \`.media-cristal\` dia \`display:flex\` (row ho azy) — ny zanaka
                // dia lasa mifanila. \`column\` no ilaina.
                return { position:'relative', cursor:'pointer', aspectRatio:'auto',
                         display:'flex', flexDirection:'column', justifyContent:'center',
                         minHeight:300, padding:'78px 14px 78px' };`;

for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  const s = read(P(rel));
  if (s === null) continue;
  const name = rel.split('/').pop();
  if (s.includes("flexDirection:'column', justifyContent:'center',\n                         minHeight:300")) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }
  const n = s.split(OLD).length - 1;
  if (n === 0) { console.log('  ⏭  ' + name + ' : tsy misy CRISTAL_TEXTE'); continue; }
  if (n !== 1) fail(name + ' : nandrasana 1, nahitana ' + n);
  files[rel] = s.replace(OLD, NEW); touched.push(rel);
  console.log('  • ' + name);
}
if (!touched.length) { console.log('\n⏭  tsy nisy fanovana'); process.exit(0); }

for (const rel of touched) {
  const s = files[rel]; const n = rel.split('/').pop();
  if (!s.includes("flexDirection:'column'")) fail(n + ' : column tsy tafiditra');
  if (!s.includes('minHeight:300')) fail(n + ' : haavo very');
  if (!s.includes('CRISTAL_TEXTE')) fail(n + ' : marika very');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra média simba');
  if (!s.includes("post-actions-row")) fail(n + ' : actions very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : faritra cristal en colonne');
