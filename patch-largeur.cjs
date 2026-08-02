/**
 * patch-largeur.cjs   —  Sakany ny barre manidina : tena rétréci
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny fanovana teo aloha dia 10 → 16 px — 6 px ihany, tsy hita maso.
 *   Diso ny fandrefesako.
 *
 * FANOVANA : 16 → 30 px avy amin'ny sisiny (havia sy havanana).
 *   Ny longueur (top/bottom = 10) dia TSY VOAKASIKA.
 *
 * VOAKASIKA : src/pages/Home.jsx ihany.
 *
 * Fampandehanana :  node patch-largeur.cjs --dry
 *                   node patch-largeur.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;

const H_OLD = 'top:boosted?34:10, left:16, right:16, zIndex:4';
const B_OLD = "position:'absolute', left:16, right:16, bottom:10, zIndex:3";

if (s.includes('left:30, right:30')) { console.log('⏭  efa voapatch'); process.exit(0); }
if (c(H_OLD) !== 1) throw new Error('ASSERTION FAIL : en-tête tsy hita (' + c(H_OLD) + ') — alefaso aloha ny patch-finitions-2.cjs');
if (c(B_OLD) !== 1) throw new Error('ASSERTION FAIL : barre tsy hita (' + c(B_OLD) + ')');

s = s.replace(H_OLD, 'top:boosted?34:10, left:30, right:30, zIndex:4');
s = s.replace(B_OLD, "position:'absolute', left:30, right:30, bottom:10, zIndex:3");

if (c === undefined) {}
if (!s.includes('left:30, right:30, zIndex:4')) throw new Error('FAIL : en-tête tsy voaova');
if (!s.includes('left:30, right:30, bottom:10')) throw new Error('FAIL : barre tsy voaova');
if (s.includes('left:16, right:16')) throw new Error('FAIL : mbola misy 16 px');
if (!s.includes('top:boosted?34:10')) throw new Error('FAIL : longueur voakasika');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanovana 2 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : sakany 30 px (longueur tsy voakasika)');
