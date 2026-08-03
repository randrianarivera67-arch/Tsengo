/**
 * patch-texte-uniforme.cjs   —  Texte miloko : Profile mitovy amin'ny Home
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG HITA : ny Profile dia manana `borderRadius:16` ARY `borderRadius:8` ao
 *   anaty style iray — NY FARANY NO MANDRESY (8). Izay no antony tsy nisy
 *   zorony 16 px na dia voapatch aza.
 *
 * FANOVANA : ny style manontolo dia ampitovina amin'ny Home :
 *   minHeight 180→200 · fontSize 24→26 · padding 24/18→28/20 · borderRadius 16
 *   (ny `borderRadius:8` doublon NESORINA).
 *
 * ⚠️ GroupPage : TSY MANANA `textBg` mihitsy — ny publication texte miloko dia
 *   aseho ho lahatsoratra tsotra ao. Fanampiana singa izany, tsy fanovana
 *   endrika — asa manaraka.
 *
 * Fampandehanana :  node patch-texte-uniforme.cjs --dry
 *                   node patch-texte-uniforme.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Profile.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

const OLD = "background: post.textBg, width:'100%', height:'100%', minHeight:180, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8";
const NEW = "background: post.textBg, width:'100%', height:'100%', minHeight:200, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:26, fontWeight:800, padding:'28px 20px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0";

if (s.includes(NEW)) { console.log('⏭  efa voapatch'); process.exit(0); }
if (c(OLD) !== 1) fail('style Profile tsy hita (' + c(OLD) + ') — mety niova');
s = s.replace(OLD, NEW);

/* Fanamarinana */
// ⚠️ Voafetra amin'ny bloc texte miloko IHANY : misy `borderRadius:8`
// ara-dalàna any an-kafa (sary, carte…).
{
  const m = s.match(/background: post\.textBg,[^}]*\}/);
  if (!m) fail('bloc texte miloko tsy hita aorian\'ny fanovana');
  if ((m[0].match(/borderRadius/g) || []).length !== 1) fail('doublon borderRadius ao anaty bloc');
}
if (!s.includes("minHeight:200")) fail('minHeight tsy nampitovina');
if (!s.includes("fontSize:26")) fail('fontSize tsy nampitovina');
if (!s.includes("padding:'28px 20px'")) fail('padding tsy nampitovina');
if (!s.includes('CRISTAL_TEXTE')) fail('faritra cristal simba');
if (!s.includes('FARITRA MANIDINA')) fail('faritra média simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN' : '✅ Patch vita : Profile mitovy amin\'ny Home');
