/**
 * patch-cristal-pg.cjs   —  Partagée + texte manidina : Profile & GroupPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Mitovy amin'ny natao tao amin'ny Home : ny CONTENU no lasa faritra cristal,
 * ary ny ACTIONS MAHAZATRA afindra ao anatiny (absolute, ambany).
 *
 * RAFITRA VOAREFY :
 *   Profile    contenu 645–694   ·  actions° 728–761
 *   GroupPage  contenu 910–…     ·  actions° 986–1012
 *
 * ⚠️ FAHASAMIHAFANA : samy hafa ny `padding` sy ny `onClick` isaky ny fichier
 *   (Profile : '10px 16px' + navigate · GroupPage : '8px 16px' + openPost).
 *   Ka ny anchor dia alaina amin'ny fichier, tsy raikitra.
 *
 * Fampandehanana :  node patch-cristal-pg.cjs --dry
 *                   node patch-cristal-pg.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

const CFG = [
  { rel: 'src/pages/Profile.jsx',   contenu: "<div style={{ padding:'10px 16px', cursor:'pointer' }}", ind: '        ' },
  { rel: 'src/pages/GroupPage.jsx', contenu: "<div style={{ padding: '8px 16px', cursor: 'pointer' }}", ind: '            ' },
];

for (const cfg of CFG) {
  const name = cfg.rel.split('/').pop();
  let L = read(P(cfg.rel)).split('\n');
  if (L.join('\n').includes('CRISTAL_TEXTE')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  const find = (x, f = 0) => { for (let i = f; i < L.length; i++) if (L[i].includes(x)) return i + 1; return -1; };
  const endBy = (st, o, c) => { let d = 0, b = false;
    for (let i = st - 1; i < L.length; i++) { d += (L[i].split(o).length - 1) - (L[i].split(c).length - 1);
      if (!b && d > 0) b = true; if (b && d <= 0) return i + 1; } return -1; };

  const C = find(cfg.contenu);
  const A = find('{/* Actions — eto IHANY raha TSY manidina */}');
  if (C < 0) fail(name + ' : contenu tsy hita');
  if (A < 0) fail(name + ' : actions mahazatra tsy hita');
  const C_END = endBy(C, '<div', '</div>');
  const A_END = endBy(A + 1, '(', ')');
  if (!(C < C_END && C_END < A && A < A_END)) fail(name + ' : filaharana diso');
  if (A_END - A + 1 > 60) fail(name + ' : actions lava loatra (' + (A_END - A + 1) + ')');
  console.log('  ' + name + ' : contenu ' + C + '–' + C_END + ' · actions ' + A + '–' + A_END);

  /* ① Actions afindra ao anaty contenu */
  const acts = L.slice(A - 1, A_END);
  L.splice(A - 1, A_END - A + 1);
  const iRow = acts.findIndex(l => l.includes("className='post-actions-row'"));
  if (iRow < 0) fail(name + ' : post-actions-row tsy hita');
  acts[iRow] = cfg.ind + "  <div className='post-actions-row' style={{ position:'absolute', left:16, right:16, bottom:10, zIndex:3, margin:0, background:'rgba(255,255,255,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:100, boxShadow:'0 4px 16px rgba(5,5,5,.18)', padding:'3px 6px', border:'none' }}>";
  L.splice(C_END - 1, 0, ...acts);

  /* ② Contenu : faritra cristal */
  let s = L.join('\n');
  if (s.split(cfg.contenu).length - 1 !== 1) fail(name + ' : contenu tsy tokana');
  s = s.replace(cfg.contenu, `<div /* CRISTAL_TEXTE */ className={(post.sharedFrom || post.eventFrom || !(post.mediaURL || (post.mediaURLs && post.mediaURLs.length))) ? 'media-cristal' : undefined}
              style={(() => {
                const own = !!(post.mediaURL || (post.mediaURLs && post.mediaURLs.length));
                const nest = !!(post.sharedFrom || post.eventFrom);
                if (own && !nest) return ${cfg.contenu.match(/style=\{\{([^}]*)\}\}/)[0].replace('style={', '').replace(/\}$/, '')};
                return { position:'relative', cursor:'pointer', aspectRatio:'auto',
                         minHeight:300, padding:'78px 14px 78px' };
              })()}`);

  /* ③ En-tête manidina foana */
  s = s.split('if (!(ownMedia && !nested)) {').join('if (false) {');

  /* Fanamarinana */
  const c = (x) => s.split(x).length - 1;
  if (c('CRISTAL_TEXTE') !== 1) fail(name + ' : marika tsy tokana');
  if (c("className='post-actions-row'") < 2) fail(name + ' : actions very');
  if (!s.includes('FARITRA MANIDINA')) fail(name + ' : faritra média simba');
  for (const [n2, m] of Object.entries({
    'partagée': 'post.sharedFrom', 'menu': 'postMenu', 'réaction': 'NeonLike',
    'voir plus': "post.id + ':s'", 'carousel': '<PhotoCarousel',
  })) if (!s.includes(m)) fail(name + ' : very « ' + n2 + ' »');

  files[cfg.rel] = s; touched.push(cfg.rel);
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
