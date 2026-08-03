// test-poste-flottant2.mjs — Carte manidina : RAFITRA
//
// Ny fahadisoana teo aloha dia TSY tratran'ny teste satria nanamarina hoe
// « misy » ny singa fa tsy hoe « MILAMINA » izy. Eto dia ny RAFITRA no jerena.
//
// Fampandehanana :  node test-poste-flottant2.mjs
import fs from 'fs';

let pass = 0, fail = 0;
const eq = (l, g, w) => { const a=JSON.stringify(g), b=JSON.stringify(w);
  if (a===b){pass++;console.log('  ✔ '+l);} else {fail++;console.log('  ✘ '+l+'\n      got  '+a+'\n      want '+b);} };
const ok = (l, c, i='') => { if(c){pass++;console.log('  ✔ '+l+(i?'  ('+i+')':''));} else {fail++;console.log('  ✘ '+l+'  '+i);} };

const H = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
const Ls = H.split('\n');

/* ═══ 1. RAFITRA — io no tsy nojerena teo aloha ════════════════════════ */
console.log('1) Rafitra ny carte');
{
  const iCard  = H.indexOf('className="card post-card animate-fade"');
  const iFloat = H.indexOf('FARITRA MANIDINA');
  const iCont  = H.indexOf("padding: post.textBg ? 0 : '10px 16px'");
  const iBoost = H.indexOf('{post.uid === currentUser.uid && !post.isBoosted && (');

  ok('carte hita', iCard > 0);
  ok('faritra manidina AORIAN\'ny carte', iFloat > iCard);
  ok('faritra manidina MIALOHA ny contenu', iFloat < iCont, 'float@' + iFloat + ' cont@' + iCont);
  ok('contenu mialoha ny Booster', iCont < iBoost);
}

console.log('\n   Média : indroa (manidina + mahazatra)');
{
  eq('bloc média', (H.match(/\{post\.mediaURLs\?\.length > 1 \? \(/g) || []).length, 2);
  const i = H.indexOf('FARITRA MANIDINA');
  const j = H.indexOf('})()}', i);
  const inside = H.slice(i, j);
  eq('iray ao anatin\'ny faritra manidina', (inside.match(/\{post\.mediaURLs\?\.length > 1 \? \(/g) || []).length, 1);
  eq('actions iray ao anatiny koa', (inside.match(/post-actions-row/g) || []).length, 1);
  ok('média mahazatra ao amin\'ny contenu', H.includes('{/* Média — aseho eto IHANY raha TSY manidina */}'));
}

console.log('\n   Actions : indroa');
eq('bloc actions', (H.match(/className='post-actions-row'/g) || []).length, 2);
ok('manidina : absolute bottom', H.includes("position:'absolute', left:10, right:10, bottom:10, zIndex:3"));
ok('mahazatra tazonina', H.includes('{/* Actions — eto IHANY raha TSY manidina */}'));

/* ═══ 2. Fitsipika manidina ════════════════════════════════════════════ */
console.log('\n2) Fitsipika — iza no manidina');
eq('famaritana roa (faritra + en-tête)', (H.match(/const ownMedia/g) || []).length, 2);
ok('nested esorina', H.includes('const nested   = !!(post.sharedFrom || post.eventFrom);'));
ok('canFloat', H.includes('const canFloat = ownMedia && !nested;'));

console.log('\n   Logika (naverina)');
{
  const canFloat = (p) => {
    const own = !!(p.mediaURL || (p.mediaURLs && p.mediaURLs.length));
    return own && !(p.sharedFrom || p.eventFrom);
  };
  eq('sary tokana → manidina', canFloat({ mediaURL: 'x' }), true);
  eq('sary maro → manidina', canFloat({ mediaURLs: ['a','b'] }), true);
  eq('video → manidina', canFloat({ mediaURL: 'v.mp4', mediaType:'video' }), true);
  eq('texte tsotra → TSIA', canFloat({}), false);
  eq('texte misy fond → TSIA', canFloat({ textBg:'x' }), false);
  eq('partagée misy sary → TSIA', canFloat({ mediaURL:'x', sharedFrom:{id:'1'} }), false);
  eq('partagée tsy misy sary → TSIA', canFloat({ sharedFrom:{id:'1'} }), false);
  eq('événement → TSIA', canFloat({ mediaURL:'x', eventFrom:{id:'1'} }), false);
  eq('mediaURLs foana → TSIA', canFloat({ mediaURLs: [] }), false);
}

/* ═══ 3. En-tête ═══════════════════════════════════════════════════════ */
console.log('\n3) En-tête');
ok('roa lalana (mahazatra / manidina)', H.includes("return { padding:'14px 16px 0', display:'flex'"));
ok('manidina raha canFloat', H.includes("position:'absolute', top:boosted?34:10, left:10, right:10, zIndex:4"));
ok('boost voahaja', H.includes('top:boosted?34:10'));
ok('carte relative', H.includes("position:'relative', overflow:'hidden' }}>"));

/* ═══ 4. TSY MISY SINGA VERY ═══════════════════════════════════════════ */
console.log('\n4) Singa rehetra voatazona');
{
  const MUST = { 'menu':'setPostMenu', 'VIP':'authorIsVip', 'audience':'post.audience',
    'boost':'setBoostTarget', 'partagée':'post.sharedFrom', 'carousel':'<PhotoCarousel',
    'video':'<FeedVideo', 'musique':'<MusicPostCard', 'groupe':'post.groupName',
    'voir plus':'post.content.length > 90', 'boutique':'post.shopId', 'événement':'post.eventFrom',
    'vues':'post.views', 'réaction':'quickLike', 'partage':'sharePost',
    'signaler':'reportPost', 'bloquer':'toggleBlockAuthor', 'appui long':'startLongPress',
    'résumé':'total > 0', 'commentaire':'openCmt' };
  for (const [n,m] of Object.entries(MUST)) ok(n, H.includes(m));
}

/* ═══ 5. TSY MISY `order` (io no nahadiso teo aloha) ═══════════════════ */
console.log('\n5) Tsy misy `order` intsony');
eq('order:1', (H.match(/order:1/g) || []).length, 0);
eq('order:2', (H.match(/order:2/g) || []).length, 0);
eq('order:3', (H.match(/order:3/g) || []).length, 0);
ok('tsy misy flexDirection amin\'ny carte', !H.includes("flexDirection:'column', overflow:'hidden'"));

/* ═══ 6. Pejy hafa ═════════════════════════════════════════════════════ */
console.log('\n6) Pejy hafa tsy voakasika');
// Profile : voapatch izao (rafitra mitovy). GroupPage : mbola tsy.
// Telo mitovy rafitra izao : Home · Profile · GroupPage
for (const [n,p] of Object.entries({ 'Profile':'./src/pages/Profile.jsx',
  'GroupPage':'./src/pages/GroupPage.jsx' })) {
  const t = fs.readFileSync(p,'utf8');
  ok(n + ' voapatch', t.includes('FARITRA MANIDINA'));
  eq(n + ' : média indroa', (t.match(/\{post\.mediaURLs\?\.length > 1 \? \(/g) || []).length, 2);
  const i = t.indexOf('FARITRA MANIDINA');
  const ins = t.slice(i, i + 3000);
  eq(n + ' : 1 média ao anaty faritra', (ins.match(/\{post\.mediaURLs\?\.length > 1 \? \(/g) || []).length, 1);
}
ok('PostDetail tsy voakasika', !fs.readFileSync('./src/pages/PostDetail.jsx','utf8').includes('FARITRA MANIDINA'));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
