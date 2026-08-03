/**
 * patch-texte-profil.cjs   —  Texte miloko ao amin'ny PROFILE : mameno
 * ─────────────────────────────────────────────────────────────────────────────
 * Ny Profile dia mampiasa `minHeight:180` (fa tsy 200 toy ny Home) — endrika
 * samy hafa. Ka ny patch teo aloha dia tsy nahatratra azy.
 *
 * ⚠️ GroupPage dia TSY MISY `textBg` mihitsy (voamarina : 0 fifanarahana).
 *   Ny bloc mena hita ao dia avy amin'ny publication NOZARAINA.
 *
 * Fampandehanana :  node patch-texte-profil.cjs --dry
 *                   node patch-texte-profil.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Profile.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;

const OLD = '<p style={{ background: post.textBg, minHeight:180,';
if (s.includes("background: post.textBg, width:'100%'")) { console.log('⏭  efa voapatch'); process.exit(0); }
if (c(OLD) !== 1) throw new Error('ASSERTION FAIL : nandrasana 1, nahitana ' + c(OLD));

s = s.replace(OLD, "<p style={{ background: post.textBg, width:'100%', height:'100%', minHeight:180, borderRadius:16,");

if (!s.includes("width:'100%', height:'100%'")) throw new Error('FAIL : tsy tafiditra');
if (!s.includes('borderRadius:16')) throw new Error('FAIL : zorony very');
if (!s.includes('CRISTAL_TEXTE')) throw new Error('FAIL : faritra cristal simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN' : '✅ Patch vita : texte miloko Profile mameno');
