/**
 * patch-flottant-groupe.cjs   —  Carte manidina : GroupPage IHANY
 * ─────────────────────────────────────────────────────────────────────────────
 * Mitovy TANTERAKA amin'ny rafitra voamarina tao amin'ny Home sy ny Profile.
 *
 * RAFITRA HITA (voarefy) :
 *   carte     and.816–950   style={{ marginBottom: 8 }}
 *   en-tête   and.817–861   padding '12px 16px 0'  ·  gap: 10
 *   contenu   and.862–919   ← misy ny MÉDIA (884–896) ao anatiny
 *   résumé    and.920–924
 *   actions   and.926–949   ← FARANY : tsy misy singa aorian'ny
 *
 * ⚠️ FAHASAMIHAFANA amin'ny Home/Profile :
 *   Ny actions no zanaka FARANY — tsy misy « Booster » na commentaire aorian'ny.
 *   Ka ny anchor famerenana dia ny FANIDIANA ny carte, fa tsy singa manaraka.
 *
 * FITSIPIKA : manidina IHANY raha manana média manokana ARY tsy partagée.
 *
 * Fampandehanana :  node patch-flottant-groupe.cjs --dry
 *                   node patch-flottant-groupe.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/GroupPage.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/GroupPage.jsx'); process.exit(1); }

let src = fs.readFileSync(F, 'utf8');
if (src.includes('FARITRA MANIDINA')) { console.log('⏭  GroupPage.jsx : efa voapatch'); process.exit(0); }
let L = src.split('\n');
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
const find = (n, from = 0) => { for (let i = from; i < L.length; i++) if (L[i].includes(n)) return i + 1; return -1; };
const endBy = (st, o, c) => { let d = 0, s2 = false;
  for (let i = st - 1; i < L.length; i++) { d += (L[i].split(o).length - 1) - (L[i].split(c).length - 1);
    if (!s2 && d > 0) s2 = true; if (s2 && d <= 0) return i + 1; } return -1; };

const CARD = find("<div key={post.id} id={'post-' + post.id} className=\"card post-card animate-fade\"");
const HEAD = find("<div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>", CARD);
const ACTS = find("<div className='post-actions-row'>", CARD);
if (CARD < 0 || HEAD < 0 || ACTS < 0) fail('anchor tsy hita (carte ' + CARD + ' en-tête ' + HEAD + ' actions ' + ACTS + ')');
const HEAD_END = endBy(HEAD, '<div', '</div>');
const ACTS_END = endBy(ACTS, '<div', '</div>');

let MEDIA = -1;
for (let i = HEAD_END; i < ACTS; i++) {
  if (L[i].includes('{post.mediaURLs?.length > 1 ? (') && !L[i].includes('sharedFrom')) { MEDIA = i + 1; break; }
}
if (MEDIA < 0) fail('bloc média tsy hita');
const MEDIA_END = endBy(MEDIA, '(', ')');

if (!(HEAD_END < MEDIA && MEDIA_END < ACTS)) fail('filaharana diso');
if (MEDIA_END - MEDIA + 1 > 22) fail('média lava loatra (' + (MEDIA_END - MEDIA + 1) + ')');
if (ACTS_END - ACTS + 1 > 60) fail('actions lava loatra (' + (ACTS_END - ACTS + 1) + ')');
console.log('  carte ' + CARD + ' · en-tête ' + HEAD + '–' + HEAD_END +
            ' · média ' + MEDIA + '–' + MEDIA_END + ' · actions ' + ACTS + '–' + ACTS_END);

const mediaBlock = L.slice(MEDIA - 1, MEDIA_END);
const actsBlock  = L.slice(ACTS - 1, ACTS_END);
L.splice(ACTS - 1, ACTS_END - ACTS + 1);
L.splice(MEDIA - 1, MEDIA_END - MEDIA + 1);

const IND = '            ';
const FT  = "!!(post.mediaURL || (post.mediaURLs && post.mediaURLs.length)) && !post.sharedFrom";
const NOT = "(post.sharedFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length)))";

const actsFloat = actsBlock.slice();
actsFloat[0] = IND + "      <div className='post-actions-row' style={{ position:'absolute', left:10, right:10, bottom:10, zIndex:3, margin:0, background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)', padding:'3px 6px', border:'none' }}>";

L.splice(HEAD_END, 0,
  IND + '{/* ── FARITRA MANIDINA : média + en-tête + actions ── */}',
  IND + '{(' + FT + ') && (',
  IND + '  <div style={{ position:\'relative\' }}>',
  ...mediaBlock.map(l => '  ' + l),
  ...actsFloat,
  IND + '  </div>',
  IND + ')}',
);
src = L.join('\n');

/* ── Média averina ao amin'ny contenu ── */
const A1 = "            {total > 0 && (";
if (src.split(A1).length - 1 !== 1) fail('anchor résumé tsy tokana');
src = src.replace(A1,
  '            {/* Média — eto IHANY raha TSY manidina */}\n' +
  '            {' + NOT + ' && (<>\n' + mediaBlock.join('\n') + '\n            </>)}\n\n' + A1);

/* ── Actions averina — ⚠️ FARANY : anchor = fanidiana ny carte ── */
const A2 = '          </div>\n        );\n      })}';
if (src.split(A2).length - 1 !== 1) fail('anchor fanidiana carte tsy tokana (' + (src.split(A2).length - 1) + ')');
src = src.replace(A2,
  '            {/* Actions — eto IHANY raha TSY manidina */}\n' +
  '            {' + NOT + ' && (\n' + actsBlock.join('\n') + '\n            )}\n' + A2);

/* ── En-tête : roa lalana ── */
const H_OLD = "<div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>";
if (src.split(H_OLD).length - 1 !== 1) fail('en-tête tsy tokana');
src = src.replace(H_OLD, `<div style={(` + FT + `) ? {
              position:'absolute', top:10, left:10, right:10, zIndex:4,
              padding:'4px 8px', display:'flex', alignItems:'center', gap:10,
              background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
              borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)',
            } : { padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>`);

/* ── Carte : relative + overflow ── */
const C_OLD = '<div key={post.id} id={\'post-\' + post.id} className="card post-card animate-fade" style={{ marginBottom: 8 }}>';
if (src.split(C_OLD).length - 1 !== 1) fail('carte tsy tokana');
src = src.replace(C_OLD, '<div key={post.id} id={\'post-\' + post.id} className="card post-card animate-fade" style={{ marginBottom: 8, position:\'relative\', overflow:\'hidden\' }}>');

/* ── Fanamarinana farany ── */
{
  const c = (x) => src.split(x).length - 1;
  if (c('{post.mediaURLs?.length > 1 ? (') !== 2) fail('média tsy indroa : ' + c('{post.mediaURLs?.length > 1 ? ('));
  if (c("className='post-actions-row'") !== 2) fail('actions tsy indroa');
  if (c('FARITRA MANIDINA') !== 1) fail('faritra tsy tokana');
  for (const [n, m] of Object.entries({
    'menu': 'postMenu', 'partagée': 'post.sharedFrom', 'carousel': '<PhotoCarousel',
    'video': '<FeedVideo', 'réaction': 'NeonLike', 'partage': 'NeonShare',
    'commentaire': 'NeonComment', 'résumé': 'total > 0',
  })) if (!src.includes(m)) fail('very ny singa « ' + n + ' »');
}

if (!DRY) fs.writeFileSync(F, src);
console.log(DRY ? '\n✅ DRY-RUN : rafitra mety (tsy nisy nosoratana)' : '\n✅ Patch vita : GroupPage → carte manidina');
