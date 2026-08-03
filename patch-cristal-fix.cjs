/**
 * patch-cristal-fix.cjs   —  Fanitsiana : ny CSS tsy nikasika na inona
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA HITA :
 *   Ny sélecteur dia `.media-cristal > img` — ZANAKA MIVANTANA.
 *   Nefa ny `SmartImage` dia mamoaka <div> MIFONO ny <img> :
 *
 *       .media-cristal
 *         └─ div (SmartImage)      ← zanaka
 *              └─ img              ← ZAFIKELY, tsy voakasika
 *
 *   Ka ny fitsipika (width 100%, contain, zorony 16 px) dia tsy nihatra
 *   MIHITSY. Izay no antony tsy nisy niova na inona na inona.
 *
 * FANITSIANA :
 *   • `>` → descendant (` `) : mahatratra ny zafikely.
 *   • Ny <div> mifono dia atao mameno koa (width/height 100 %), raha tsy izany
 *     dia mifetra amin'ny haavony voajanahary izy ary tsy mivelatra ny sary.
 *
 * VOAKASIKA : src/index.css ihany.
 *
 * Fampandehanana :  node patch-cristal-fix.cjs --dry
 *                   node patch-cristal-fix.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/index.css');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/index.css'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

if (s.includes('.media-cristal img,')) { console.log('⏭  efa voapatch'); process.exit(0); }

const OLD = '.media-cristal > img, .media-cristal > video {';
if (c(OLD) !== 1) fail('sélecteur tsy hita (' + c(OLD) + ')');

s = s.replace(OLD,
`/* ⚠️ SÉLECTEUR DESCENDANT (tsy « > ») : ny SmartImage dia mamoaka <div>
   mifono ny <img>, ka ZAFIKELY ny sary — tsy zanaka mivantana. */
.media-cristal > div, .media-cristal > .skeleton-shimmer {
  width: 100% !important; height: 100% !important;
  min-height: 0 !important; border-radius: 16px !important;
  background: transparent !important;
}
.media-cristal img, .media-cristal video {`);

/* Fanamarinana */
if (!s.includes('.media-cristal img, .media-cristal video {')) fail('sélecteur vaovao tsy tafiditra');
if (!s.includes('.media-cristal > div')) fail('fitsipika div mifono tsy tafiditra');
if (s.includes('.media-cristal > img')) fail('sélecteur taloha mbola ao');
if (!s.includes('object-fit: contain')) fail('contain very');
if (!s.includes('border-radius: 16px; box-shadow')) fail('zorony very');
if (!s.includes('.media-cristal {')) fail('fond very');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana mety (tsy nisy nosoratana)'
  : '✅ Patch vita : sélecteur voahitsy (zafikely voakasika izao)');
