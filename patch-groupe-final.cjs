/**
 * patch-groupe-final.cjs   —  GroupPage mitovy amin'ny Profile
 * ─────────────────────────────────────────────────────────────────────────────
 * ① TEXTE MILOKO : `minHeight:180 · fontSize:24 · padding 24/18` — samy hafa
 *    amin'ny Home/Profile, ary tsy mameno (tsy misy width/height/borderRadius).
 *    → Ampitovina amin'ny Home : 200 · 26 · 28/20 · borderRadius 16 · mameno.
 *
 * ② « Commenter (1) » : ny isa dia AO ANATIN'NY BOKOTRA — mihoatra ny sakany
 *    ary tsy mitovy amin'ny Home/Profile (izay mametraka azy ao amin'ny résumé
 *    ambany).
 *    → Esorina ny `(N)` ao amin'ny bokotra. Ny résumé ambany dia mitazona azy.
 *
 * ⚠️ Toerana ROA no misy azy (and.902 sy 992 : manidina + mahazatra) — samy
 *    ovaina.
 *
 * Fampandehanana :  node patch-groupe-final.cjs --dry
 *                   node patch-groupe-final.cjs
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

/* ── ① Texte miloko ── */
const T_OLD = "background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px'";
const T_NEW = "background: post.textBg, width:'100%', height:'100%', minHeight:200, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:26, fontWeight:800, padding:'28px 20px'";
if (!s.includes(T_NEW)) {
  if (c(T_OLD) !== 1) fail('texte miloko tsy hita (' + c(T_OLD) + ')');
  s = s.replace(T_OLD, T_NEW);
  console.log('  • texte miloko ampitovina amin\'ny Home');
} else console.log('  ⏭  texte miloko : efa voapatch');

/* ── ② « Commenter (N) » : NAJANONA ──────────────────────────────────
   ⚠️ Ny GroupPage dia TSY MANANA résumé misy isa commentaire (tsy toy ny
   Home). Ny bokotra ihany no mitondra azy. Ny fanesorana dia HAMERY azy
   tanteraka — ka mila ampiana résumé aloha. Asa manaraka. */

/* ── ③ Doublon `borderRadius:8` esorina (toy ny tao amin'ny Profile) ──
   Ny farany no mandresy — ka tsy nisy zorony 16 px na dia voapatch aza. */
{
  const m = s.match(/background: post\.textBg,[^}]*\}/);
  if (!m) fail('bloc texte miloko tsy hita');
  if ((m[0].match(/borderRadius/g) || []).length > 1) {
    const fixed = m[0].replace(/,\s*borderRadius:8/g, '');
    s = s.replace(m[0], fixed);
    console.log('  • doublon borderRadius:8 nesorina');
  }
}

/* ── Fanamarinana ── */
if (!s.includes("minHeight:200") || !s.includes("fontSize:26")) fail('texte miloko tsy nampitovina');
if (!s.includes('borderRadius:16')) fail('zorony very');
{
  const m = s.match(/background: post\.textBg,[^}]*\}/);
  if ((m[0].match(/borderRadius/g) || []).length !== 1) fail('doublon borderRadius mbola ao');
}
if (!s.includes('post.comments?.length')) fail('isa commentaire very');
if (!s.includes('CRISTAL_TEXTE')) fail('faritra cristal simba');
if (!s.includes('FARITRA MANIDINA')) fail('faritra média simba');
if (!s.includes('manidina foana')) fail('en-tête manidina simba');
if (c("className='post-actions-row'") !== 2) fail('actions tsy indroa');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : texte miloko GroupPage ampitovina');
