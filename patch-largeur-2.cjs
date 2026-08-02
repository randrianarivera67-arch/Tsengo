/**
 * patch-largeur-2.cjs   —  Fanitsiana : LARGEUR (hateviny) no ahena
 * ─────────────────────────────────────────────────────────────────────────────
 * FAHADISOANA TEO ALOHA — nifanjevoako ny teny :
 *   • LONGUEUR = halavan'ny barre (havia ↔ havanana) → `left` / `right`
 *   • LARGEUR  = hateviny (ambony ↔ ambany)          → `padding`
 *
 *   Ny `left/right: 30` napetrako dia nanafohy ny LONGUEUR — tsy izay no
 *   nangatahina.
 *
 * FANOVANA :
 *   ① Longueur AVERINA : 30 → 10 px (feno indray)
 *   ② Largeur AHENA    : ny padding mitsangana no hihena
 *        en-tête : '7px 8px'  → '4px 8px'
 *        barre   : 6          → '3px 6px'
 *      → mihena ~6 px ny hateviny roa, ka mipoitra bebe kokoa ny sary.
 *
 * VOAKASIKA : src/pages/Home.jsx ihany.
 *
 * Fampandehanana :  node patch-largeur-2.cjs --dry
 *                   node patch-largeur-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
function rep(old, neo, label) {
  if (c(old) !== 1) throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + c(old));
  s = s.replace(old, neo);
}

if (s.includes("padding:'4px 8px'")) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① Longueur averina : 30 → 10 ───────────────────────────────────── */
rep('top:boosted?34:10, left:30, right:30, zIndex:4',
    'top:boosted?34:10, left:10, right:10, zIndex:4', 'longueur:en-tête');
rep("position:'absolute', left:30, right:30, bottom:10, zIndex:3",
    "position:'absolute', left:10, right:10, bottom:10, zIndex:3", 'longueur:barre');

/* ── ② Largeur (hateviny) ahena ─────────────────────────────────────── */
rep("padding:'7px 8px'", "padding:'4px 8px'", 'largeur:en-tête');
rep("padding:6, border:'none'", "padding:'3px 6px', border:'none'", 'largeur:barre');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (s.includes('left:30, right:30')) throw new Error('FAIL : longueur tsy naverina');
if (!s.includes('left:10, right:10, zIndex:4')) throw new Error('FAIL : longueur en-tête diso');
if (!s.includes('left:10, right:10, bottom:10')) throw new Error('FAIL : longueur barre diso');
if (!s.includes("padding:'4px 8px'")) throw new Error('FAIL : hateviny en-tête tsy nihena');
if (!s.includes("padding:'3px 6px'")) throw new Error('FAIL : hateviny barre tsy nihena');
if (!s.includes('top:boosted?34:10')) throw new Error('FAIL : toerana ambony voakasika');
if (!s.includes('bottom:10, zIndex:3')) throw new Error('FAIL : toerana ambany voakasika');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanovana 4 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : longueur averina · largeur (hateviny) nihena');
