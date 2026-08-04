/**
 * patch-video-reels.cjs   —  Video groupe → Reels
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (voamarina ao amin'ny FeedVideo, and.31) :
 *
 *     const handleClick = () => { (onOpen || onOpenReels)?.(); };
 *
 *   Ny `onOpen` MANDRESY FOANA. Ny FeedVideo ao anaty faritra manidina
 *   (and.881) dia manana ROA — ka ny `onOpenReels` napetraka dia TSY ANTSOINA
 *   MIHITSY. Izay no antony misokatra viewer fa tsy Reels.
 *
 * FANITSIANA : esorina ny `onOpen` amin'io FeedVideo io ihany.
 *   ⚠️ Ny hafa (and.955, 1021) dia TSY VOAKASIKA — mitazona ny viewer.
 *
 * Fampandehanana :  node patch-video-reels.cjs --dry
 *                   node patch-video-reels.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/GroupPage.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

const iF = s.indexOf('FARITRA MANIDINA');
if (iF < 0) fail('faritra manidina tsy hita');
const iV = s.indexOf('<FeedVideo', iF);
if (iV < 0) fail('FeedVideo ao anaty faritra tsy hita');
const iEnd = s.indexOf('/>', iV);
if (iEnd < 0) fail('fiafarany tsy hita');
let tag = s.slice(iV, iEnd);

if (!tag.includes('onOpenReels')) fail('onOpenReels tsy ao — alefaso aloha ny patch-cristal-v3');
if (!tag.includes('onOpen={')) { console.log('⏭  efa voapatch'); process.exit(0); }

// Esorina ny `onOpen={…}` (fa TSY ny onOpenReels)
const m = tag.match(/\sonOpen=\{[^}]*\}/);
if (!m) fail('onOpen tsy azo faritana');
const neo = tag.replace(m[0], '');
if (!neo.includes('onOpenReels')) fail('onOpenReels very tamin\'ny fanesorana');
s = s.slice(0, iV) + neo + s.slice(iEnd);

/* Fanamarinana */
{
  const i2 = s.indexOf('FARITRA MANIDINA');
  const j2 = s.indexOf('/>', s.indexOf('<FeedVideo', i2));
  const t2 = s.slice(s.indexOf('<FeedVideo', i2), j2);
  if (t2.includes('onOpen={')) fail('onOpen mbola ao amin\'ny faritra manidina');
  if (!t2.includes('onOpenReels')) fail('onOpenReels very');
  // Ny FeedVideo hafa dia tsy voakasika
  const total = (s.match(/<FeedVideo/g) || []).length;
  if (total < 3) fail('FeedVideo hafa very (' + total + ')');
  if (!s.includes('CRISTAL_TEXTE')) fail('faritra cristal simba');
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : video groupe → Reels');
