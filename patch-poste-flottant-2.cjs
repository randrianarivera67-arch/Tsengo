/**
 * patch-poste-flottant-2.cjs   —  Carte manidina (Home) — RAFITRA MARINA
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ FANITSIANA NY FAHADISOANA TEO ALOHA
 *
 *   Nampiasa `order` amin'ny flexbox aho tamin'ny voalohany. NEFA :
 *     • Ny MÉDIA dia AO ANATIN'NY contenu (and. 2535), tsy rahalahiny.
 *       Ka ny `order:1` napetraka taminy dia TSY NANAO NA INONA NA INONA :
 *       tsy flex ny ray aman-dreniny.
 *     • Ny `order:3` tamin'ny contenu dia nandroaka ny TEXTE SY NY MÉDIA
 *       NIARAKA ho ambanin'ny actions → savorivory.
 *
 *   Ity patch ity dia manao FAMINDRANA MARINA, tsy `order` mihitsy.
 *
 * RAFITRA VAOVAO :
 *
 *   carte (position:relative)
 *   ├─ bandeau Sponsorisé
 *   ├─ FARITRA MANIDINA (position:relative)          ⟵ VAOVAO
 *   │   ├─ média          (afindra avy ao amin'ny contenu)
 *   │   ├─ en-tête        (absolute, top)   — TSY AFINDRA, style ihany
 *   │   └─ actions        (afindra, absolute bottom)
 *   ├─ contenu            (texte, voir plus, partagée, événement, boutique)
 *   ├─ résumé réaction · bokotra Booster · commentaire
 *
 * FITSIPIKA MANIDINA (mba tsy hisy endrika hafahafa) :
 *   • Manana média manokana → manidina eo amboniny.
 *   • Tsy manana, ary tsy partagée/événement → gradient (safidin'ny mpanoratra,
 *     fallback manga) no faritra manidinana.
 *   • Partagée na événement → ENDRIKA MAHAZATRA (tsy manidina).
 *     Antony : misy carte anatiny izy ireo — ny fanidinana dia hanome
 *     fifanindriana hafahafa.
 *
 * FOMBA : famindrana araka ny ANDALANA (fa tsy string matching amin'ny bloc
 *   115 andalana, izay mora diso). Assertion mahery isaky ny dingana.
 *
 * Fampandehanana :  node patch-poste-flottant-2.cjs --dry
 *                   node patch-poste-flottant-2.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Home.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/Home.jsx'); process.exit(1); }

let src = fs.readFileSync(F, 'utf8');
if (src.includes('POST_FLOAT')) { console.log('⏭  Home.jsx : efa voapatch'); process.exit(0); }

let L = src.split('\n');
const at = (n) => L[n - 1];                     // 1-based
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ── ① Fitadiavana ny bloc (tsy raikitra ny andalana) ───────────────── */
function findLine(needle, from = 0) {
  for (let i = from; i < L.length; i++) if (L[i].includes(needle)) return i + 1;
  return -1;
}
function endByParen(startLine) {
  let d = 0, started = false;
  for (let i = startLine - 1; i < L.length; i++) {
    d += (L[i].split('(').length - 1) - (L[i].split(')').length - 1);
    if (!started && d > 0) started = true;
    if (started && d <= 0) return i + 1;
  }
  return -1;
}
function endByDiv(startLine) {
  let d = 0, started = false;
  for (let i = startLine - 1; i < L.length; i++) {
    d += (L[i].split('<div').length - 1) - (L[i].split('</div>').length - 1);
    if (!started && d > 0) started = true;
    if (started && d <= 0) return i + 1;
  }
  return -1;
}

const CARD    = findLine('className="card post-card animate-fade"');
if (CARD < 0) fail('carte tsy hita');
const HEAD    = findLine("<div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>", CARD);
const CONTENT = findLine("<div style={{ padding: post.textBg ? 0 : '10px 16px', cursor:'pointer' }}", CARD);
const MEDIA   = findLine('{post.mediaURLs?.length > 1 ? (', CONTENT);
const ACTS    = findLine("<div className='post-actions-row'>", CONTENT);

for (const [n, v] of Object.entries({ HEAD, CONTENT, MEDIA, ACTS })) if (v < 0) fail(n + ' tsy hita');

const HEAD_END  = endByDiv(HEAD);
const MEDIA_END = endByParen(MEDIA);
const ACTS_END  = endByDiv(ACTS);
const CONTENT_END = endByDiv(CONTENT);

/* ── ② Fanamarinana ny rafitra ANDRASANA ────────────────────────────── */
if (!(CARD < HEAD && HEAD < HEAD_END && HEAD_END < CONTENT)) fail('filaharana en-tête diso');
if (!(CONTENT < MEDIA && MEDIA_END < CONTENT_END)) fail('ny média dia tsy ao anatin\'ny contenu');
if (!(CONTENT_END < ACTS && ACTS < ACTS_END)) fail('filaharana actions diso');
if (MEDIA_END - MEDIA + 1 > 20) fail('bloc média lava loatra (' + (MEDIA_END - MEDIA + 1) + ') — niova ny code');
if (ACTS_END - ACTS + 1 > 60) fail('bloc actions lava loatra (' + (ACTS_END - ACTS + 1) + ') — niova ny code');
if (!at(MEDIA_END).trim().startsWith(')}')) fail('fiafaran\'ny média tsy `)}`');
if (at(ACTS_END).trim() !== '</div>') fail('fiafaran\'ny actions tsy `</div>`');

console.log('  Rafitra hita :');
console.log('    carte    and.' + CARD);
console.log('    en-tête  and.' + HEAD + '–' + HEAD_END + '  (' + (HEAD_END - HEAD + 1) + ')');
console.log('    contenu  and.' + CONTENT + '–' + CONTENT_END);
console.log('    média    and.' + MEDIA + '–' + MEDIA_END + '  (' + (MEDIA_END - MEDIA + 1) + ')');
console.log('    actions  and.' + ACTS + '–' + ACTS_END + '  (' + (ACTS_END - ACTS + 1) + ')');

/* ── ③ Fanesorana ny bloc (avy ambany miakatra, mba tsy hifindra ny index) ── */
const mediaBlock = L.slice(MEDIA - 1, MEDIA_END);
const actsBlock  = L.slice(ACTS - 1, ACTS_END);

L.splice(ACTS - 1, ACTS_END - ACTS + 1);            // actions esorina aloha (ambany)
L.splice(MEDIA - 1, MEDIA_END - MEDIA + 1);         // média esorina

/* ── ④ Fametrahana ny faritra manidina aorian'ny en-tête ────────────── */
const IND = '            ';
const floatOpen = [
  IND + '{/* ── FARITRA MANIDINA : média + en-tête + actions ─────────────',
  IND + '    Ny média dia NAFINDRA avy tao amin\'ny contenu (tsy `order` :',
  IND + '    tsy flex ny contenu, ka tsy nanan-kery izany).',
  IND + '    Partagée / événement → endrika mahazatra (misy carte anatiny). */}',
  IND + '{(() => {',
  IND + '  const ownMedia = !!(post.mediaURL || (post.mediaURLs && post.mediaURLs.length));',
  IND + '  const nested   = !!(post.sharedFrom || post.eventFrom);',
  IND + '  const canFloat = ownMedia && !nested;',
  IND + '  if (!canFloat) return null;',
  IND + '  return (',
  IND + '    <div style={{ position:\'relative\' }}>',
];
const floatClose = [
  IND + '    </div>',
  IND + '  );',
  IND + '})()}',
];

// Ny actions ao anatin'ny faritra : absolute ambany
const actsFloat = actsBlock.slice();
actsFloat[0] = IND + "      <div className='post-actions-row' style={{ position:'absolute', left:10, right:10, bottom:10, zIndex:3, margin:0, background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)', padding:6, border:'none' }}>";

const insertAt = HEAD_END;   // aorian'ny fiafaran'ny en-tête
L.splice(insertAt, 0,
  ...floatOpen,
  ...mediaBlock.map(l => '  ' + l),
  ...actsFloat,
  ...floatClose,
);

/* ── ⑤ Fametrahana indray ny média sy ny actions ho an'ny tranga hafa ── */
src = L.join('\n');

// Média : averina ao amin'ny contenu, aseho IHANY raha tsy manidina
const mediaBack = mediaBlock.join('\n');
const contentAnchor = "              {post.shopId && post.isSale && (";
if (!src.includes(contentAnchor)) fail('anchor info boutique tsy hita');
src = src.replace(contentAnchor,
  '              {/* Média — aseho eto IHANY raha TSY manidina */}\n' +
  '              {(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) && (<>\n' +
  mediaBack + '\n' +
  '              </>)}\n' +
  contentAnchor);

// Actions : averina, aseho IHANY raha tsy manidina
const actsBack = actsBlock.join('\n');
const boostAnchor = "            {post.uid === currentUser.uid && !post.isBoosted && (";
if (!src.includes(boostAnchor)) fail('anchor Booster tsy hita');
src = src.replace(boostAnchor,
  '            {/* Actions — eto IHANY raha TSY manidina */}\n' +
  '            {(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) && (\n' +
  actsBack + '\n' +
  '            )}\n\n' +
  boostAnchor);

/* ── ⑥ En-tête : manidina IHANY raha manidina ny carte ──────────────── */
src = src.replace(
  "            <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>",
  `            {/* POST_FLOAT : en-tête manidina raha misy faritra média */}
            <div style={(() => {
              const ownMedia = !!(post.mediaURL || (post.mediaURLs && post.mediaURLs.length));
              const nested   = !!(post.sharedFrom || post.eventFrom);
              if (!(ownMedia && !nested)) {
                return { padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' };
              }
              return {
                position:'absolute', top:boosted?34:10, left:10, right:10, zIndex:4,
                padding:'7px 8px', display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
                borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)',
              };
            })()}>`);

/* ── ⑦ Carte : relative + overflow ──────────────────────────────────── */
src = src.replace(
  `          <div className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined }}>`,
  `          <div className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined, position:'relative', overflow:'hidden' }}>`);

/* ── ⑧ Fanamarinana farany ──────────────────────────────────────────── */
{
  const c = (x) => src.split(x).length - 1;
  if (!src.includes('POST_FLOAT')) fail('marika POST_FLOAT very');
  if (c('{post.mediaURLs?.length > 1 ? (') !== 2) fail('média tsy indroa (manidina + mahazatra) : ' + c('{post.mediaURLs?.length > 1 ? ('));
  if (c("className='post-actions-row'") !== 2) fail('actions tsy indroa');
  if (c('const ownMedia') !== 2) fail('fitsipika manidina tsy roa (faritra + en-tête) : ' + c('const ownMedia'));
  for (const [n, m] of Object.entries({
    'menu': 'setPostMenu', 'VIP': 'authorIsVip', 'audience': 'post.audience',
    'boost': 'setBoostTarget', 'partagée': 'post.sharedFrom', 'carousel': '<PhotoCarousel',
    'video': '<FeedVideo', 'musique': '<MusicPostCard', 'groupe': 'post.groupName',
    'voir plus': 'post.content.length > 90', 'boutique': 'post.shopId', 'événement': 'post.eventFrom',
    'vues': 'post.views', 'réaction': 'quickLike', 'partage': 'sharePost',
  })) if (!src.includes(m)) fail('very ny singa « ' + n + ' »');
}

if (!DRY) fs.writeFileSync(F, src);
console.log(DRY ? '\n✅ DRY-RUN : rafitra mety (tsy nisy nosoratana)' : '\n✅ Patch vita : carte manidina (rafitra marina)');
