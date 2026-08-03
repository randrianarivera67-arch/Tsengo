/**
 * patch-cristal-partage-texte.cjs   —  Manidina : partagée + texte miloko
 * ─────────────────────────────────────────────────────────────────────────────
 * RAFITRA VOAREFY (Home) :
 *   contenu   and.2546–2651   ← texte · voir plus · PARTAGÉE · événement ·
 *                               média-raha-tsy-manidina · info boutique
 *   actions°  and.2694–2734   ← ny « actions mahazatra » (raha tsy manidina)
 *
 *   Carte anatiny (partagée) : en-tête kely · lahatsoratra · média — 26 andalana.
 *   Texte miloko : minHeight 200.
 *
 * DRAFITRA (nifanarahana) :
 *   • Carte ANATINY (nozaraina) : TSY MIOVA MIHITSY.
 *   • Carte IVELANY : en-tête sy barre MANIDINA, fond cristal.
 *   • Ny `contenu` no lasa faritra cristal, ary ny actions° AFINDRA ao anatiny
 *     (absolute, ambany). Fanovana IRAY, tsy misy kopia fahatelo.
 *
 * HAAVO : en-tête 46 + barre 46 + elanelana = ~150 px voatokana.
 *   Texte miloko : minHeight 200 → 300, padding 78 px ambony/ambany.
 *   Partagée : minHeight 300 koa, mba tsy hifanindry amin'ny carte anatiny.
 *
 * Fampandehanana :  node patch-cristal-partage-texte.cjs --dry
 *                   node patch-cristal-partage-texte.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let src = fs.readFileSync(F, 'utf8');
if (src.includes('CRISTAL_TEXTE')) { console.log('⏭  efa voapatch'); process.exit(0); }
let L = src.split('\n');
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
const find = (n, f = 0) => { for (let i = f; i < L.length; i++) if (L[i].includes(n)) return i + 1; return -1; };
const endBy = (st, o, c) => { let d = 0, b = false;
  for (let i = st - 1; i < L.length; i++) { d += (L[i].split(o).length - 1) - (L[i].split(c).length - 1);
    if (!b && d > 0) b = true; if (b && d <= 0) return i + 1; } return -1; };

const C = find("padding: post.textBg ? 0 : '10px 16px'");
const A = find("{/* Actions — eto IHANY raha TSY manidina */}");
if (C < 0 || A < 0) fail('anchor tsy hita');
const C_END = endBy(C, '<div', '</div>');
const A_END = endBy(A + 1, '(', ')');
if (!(C < C_END && C_END < A && A < A_END)) fail('filaharana diso');
if (A_END - A + 1 > 60) fail('bloc actions lava loatra (' + (A_END - A + 1) + ')');
console.log('  contenu ' + C + '–' + C_END + ' · actions ' + A + '–' + A_END);

/* ── ① Actions afindra ao anaty contenu ── */
const actsBlock = L.slice(A - 1, A_END);
L.splice(A - 1, A_END - A + 1);
// Ny actions dia lasa absolute ao anaty contenu
const actsIn = actsBlock.slice();
actsIn[1] = actsIn[1].replace(
  "{(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) && (",
  "{(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) && (");
const iRow = actsIn.findIndex(l => l.includes("className='post-actions-row'"));
if (iRow < 0) fail('post-actions-row tsy hita ao amin\'ny bloc');
actsIn[iRow] = "              <div className='post-actions-row' style={{ position:'absolute', left:16, right:16, bottom:10, zIndex:3, margin:0, background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)', padding:'3px 6px', border:'none' }}>";
L.splice(C_END - 1, 0, ...actsIn);

/* ── ② Contenu : faritra cristal ── */
src = L.join('\n');
const OLD_C = "<div style={{ order:3, padding: post.textBg ? 0 : '10px 16px', cursor:'pointer' }}";
const ALT_C = "<div style={{ padding: post.textBg ? 0 : '10px 16px', cursor:'pointer' }}";
const useC = src.includes(OLD_C) ? OLD_C : ALT_C;
if (src.split(useC).length - 1 !== 1) fail('contenu tsy tokana');
src = src.replace(useC, `<div /* CRISTAL_TEXTE */ className={(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) ? 'media-cristal' : undefined}
              style={(() => {
                const own = !!(post.mediaURL || (post.mediaURLs && post.mediaURLs.length));
                const nest = !!(post.sharedFrom || post.eventFrom);
                if (own && !nest) return { padding: post.textBg ? 0 : '10px 16px', cursor:'pointer' };
                // Faritra manidinana : toerana ho an'ny en-tête (ambony) sy ny barre (ambany)
                return { position:'relative', cursor:'pointer', aspectRatio:'auto',
                         minHeight:300, padding:'78px 14px 78px' };
              })()}`);

/* ── ③ En-tête : manidina koa ho an'ny partagée / texte ── */
const H_OLD = 'const nested   = !!(post.sharedFrom || post.eventFrom);';
if (src.split(H_OLD).length - 1 < 1) fail('fitsipika en-tête tsy hita');
src = src.split('if (!(ownMedia && !nested)) {').join('if (false) {');

/* ── Fanamarinana ── */
{
  const c = (x) => src.split(x).length - 1;
  if (c('CRISTAL_TEXTE') !== 1) fail('marika tsy tokana');
  if (c("className='post-actions-row'") !== 2) fail('actions tsy indroa : ' + c("className='post-actions-row'"));
  if (!src.includes('FARITRA MANIDINA')) fail('faritra média simba');
  for (const [n, m] of Object.entries({
    'partagée': 'post.sharedFrom', 'texte miloko': 'post.textBg', 'voir plus': "post.id + ':s'",
    'boutique': 'post.shopId', 'événement': 'post.eventFrom', 'menu': 'setPostMenu',
    'réaction': 'quickLike', 'vues': 'post.views', 'boost': 'setBoostTarget',
  })) if (!src.includes(m)) fail('very ny singa « ' + n + ' »');
}

if (!DRY) fs.writeFileSync(F, src);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita : partagée + texte manidina');
