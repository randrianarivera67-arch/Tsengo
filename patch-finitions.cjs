/**
 * patch-finitions.cjs   —  Rétréci + J'aime rampli (TSY mirehatra)
 * ─────────────────────────────────────────────────────────────────────────────
 * ① RÉTRÉCI : ny en-tête sy ny barre manidina dia 10 px avy amin'ny sisiny.
 *    → 16 px : mipoitra tsara kokoa ny sary amin'ny sisiny havia/havanana.
 *
 * ② J'AIME RAMPLI ROSE — very tamin'ny `git reset` teo aloha, averina eto.
 *    ⚠️ TSY MIREHATRA : tsy misy `glow()`. Ny path bordure dia misy sous-chemin
 *       roa, ka tsy azo ampiana `fill` fotsiny — path RAMPLI misaraka.
 *
 * MANDEHA NA MISY NA TSY MISY ny variante rampli (patch teo aloha) —
 * voamarina ny toe-javatra alohan'ny fanovana.
 *
 * VOAKASIKA : components/NeonIcons.jsx · pages/Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-finitions.cjs --dry
 *                   node patch-finitions.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const countOf = (s, sub) => s.split(sub).length - 1;

const files = {};
const touched = [];
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══ ① Rétréci : 10 → 16 px ══════════════════════════════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = read(P(rel));

  if (s.includes('left:16, right:16')) { console.log('  ⏭  rétréci : efa natao'); }
  else {
    const H = "top:boosted?34:10, left:10, right:10, zIndex:4";
    const B = "position:'absolute', left:10, right:10, bottom:10, zIndex:3";
    if (countOf(s, H) !== 1) throw new Error('ASSERTION FAIL : en-tête manidina tsy hita (' + countOf(s, H) + ')');
    if (countOf(s, B) !== 1) throw new Error('ASSERTION FAIL : barre manidina tsy hita (' + countOf(s, B) + ')');
    s = s.replace(H, "top:boosted?34:16, left:16, right:16, zIndex:4");
    s = s.replace(B, "position:'absolute', left:16, right:16, bottom:16, zIndex:3");
    save(rel, s);
  }
}

/* ═══ ② NeonLike rampli — TSY mirehatra ═══════════════════════════════ */
{
  const rel = 'src/components/NeonIcons.jsx';
  let s = files[rel] || read(P(rel));

  const OLD_PLAIN = `export function NeonLike({ size = 18, color = '#65676B' }) {`;
  const HAS_FILLED = s.includes('filled = false');

  const FILLED_BLOCK = `export function NeonLike({ size = 18, color = '#65676B', filled = false }) {
  // ⚠️ Ny path bordure dia misy sous-chemin ROA : tsy azo ampiana \`fill\`
  // fotsiny (endrika simba). Path RAMPLI misaraka no ampiasaina.
  // TSY MIREHATRA : tsy misy glow() — nangatahina mazava.
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <rect x="2.6" y="10.4" width="4.6" height="11" rx="1.4" />
        <path d="M8.4 10.6 L11.9 3.6 C12.3 2.7 13.4 2.4 14.2 2.9 C15.1 3.5 15.5 4.5 15.3 5.5 L14.4 9 L19.3 9 C20.7 9 21.7 10.3 21.4 11.6 L19.7 19.3 C19.4 20.5 18.3 21.4 17 21.4 L9.6 21.4 C8.9 21.4 8.4 20.9 8.4 20.2 Z" />
      </svg>
    );
  }`;

  if (!HAS_FILLED) {
    if (countOf(s, OLD_PLAIN) !== 1) throw new Error('ASSERTION FAIL : NeonLike tsy hita');
    s = s.replace(OLD_PLAIN, FILLED_BLOCK);
    save(rel, s);
  } else if (s.includes('fill={color} style={glow(color)}')) {
    // Efa misy fa mirehatra → esorina ny glow
    s = s.replace('<svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={glow(color)}>',
                  '<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>');
    save(rel, s);
    console.log('  • glow nesorina');
  } else {
    console.log('  ⏭  NeonLike : efa rampli, tsy mirehatra');
  }
}

/* ═══ ③ Fampiharana `filled` ══════════════════════════════════════════ */
for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = files[rel] || read(P(rel));
  const name = rel.split('/').pop();
  if (s.includes('filled={!!myR}')) { console.log('  ⏭  ' + name + ' : filled efa ao'); continue; }

  const OLD = "<NeonLike size={25} color={myR ? '#FF2D8D' : '#65676B'}/>";
  const n = countOf(s, OLD);
  if (n === 0) throw new Error('ASSERTION FAIL [' + name + '] : NeonLike 25 px tsy hita — ' +
    'alefaso aloha ny patch-post-icones.cjs');
  s = s.split(OLD).join("<NeonLike size={25} color={myR ? '#FF2D8D' : '#65676B'} filled={!!myR}/>");
  console.log('  • ' + name + ' : ' + n + ' toerana');
  save(rel, s);
}

/* ═══ Fanamarinana farany ═════════════════════════════════════════════ */
{
  const N = files['src/components/NeonIcons.jsx'] || read(P('src/components/NeonIcons.jsx'));
  if (!N.includes('if (filled) {')) throw new Error('FAIL : variante rampli tsy tafiditra');
  if (/fill=\{color\}\s+style=\{glow/.test(N)) throw new Error('FAIL : mbola mirehatra');
  if (!N.includes('fill="none" stroke={color} strokeWidth="1.9"')) throw new Error('FAIL : very ny bordure');

  const H = files['src/pages/Home.jsx'] || read(P('src/pages/Home.jsx'));
  if (!H.includes('left:16, right:16, zIndex:4')) throw new Error('FAIL : en-tête tsy voarétréci');
  if (!H.includes('left:16, right:16, bottom:16')) throw new Error('FAIL : barre tsy voarétréci');
  if (H.includes('left:10, right:10, zIndex:4')) throw new Error('FAIL : mbola misy 10 px');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanovana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
