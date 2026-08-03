/**
 * patch-carousel-sans-marge.cjs   —  Esorina ny 16 px amin'ny SARY MARO
 * ─────────────────────────────────────────────────────────────────────────────
 * Ny grille sary maro dia mila MIFANINDRY — tsy misy zorony na elanelana.
 * Ny `<div className="media-fit">` manodidina ny PhotoCarousel no esorina.
 *
 * ⚠️ Ny FeedVideo dia TSY VOAKASIKA — mitazona ny zorony 16 px.
 *   Voamarina amin'ny assertion.
 *
 * VOAKASIKA : Home.jsx · Profile.jsx · GroupPage.jsx
 *
 * Fampandehanana :  node patch-carousel-sans-marge.cjs --dry
 *                   node patch-carousel-sans-marge.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  const OPEN = '<div className="media-fit"><PhotoCarousel ';
  const n = s.split(OPEN).length - 1;
  if (n === 0) { console.log('  ⏭  ' + name + ' : efa voaesotra'); continue; }
  if (n !== 1) fail(name + ' : nandrasana 1, nahitana ' + n);

  const i = s.indexOf(OPEN);
  const j = s.indexOf('/>', i);
  if (j < 0) fail(name + ' : fiafaran\'ny PhotoCarousel tsy hita');
  const k = s.indexOf('</div>', j);
  if (k < 0 || k > j + 4) fail(name + ' : `</div>` tsy manaraka mivantana ny `/>` (nafangaro?)');

  // Esorina ny <div> mifono ihany — ny PhotoCarousel tazonina
  const inner = s.slice(i + '<div className="media-fit">'.length, j + 2);
  if (!inner.startsWith('<PhotoCarousel ')) fail(name + ' : votoaty tsy PhotoCarousel');
  s = s.slice(0, i) + inner + s.slice(k + '</div>'.length);

  files[rel] = s; touched.push(rel);
  console.log('  • ' + name + ' : wrapper carousel nesorina');
}

/* Fanamarinana farany */
for (const rel of touched) {
  const s = files[rel]; const n = rel.split('/').pop();
  if (s.includes('<div className="media-fit"><PhotoCarousel')) fail(n + ' : mbola voafono');
  if (!s.includes('<PhotoCarousel ')) fail(n + ' : PhotoCarousel very');
  // ⚠️ Ny Profile dia mampiasa `VideoThumb`, tsy `FeedVideo` — samy hafa
  // isaky ny fichier. Ny fanamarinana dia atao amin'ny TALOHA vs IZAO.
  const avant = read(P(rel));
  const nAvant = (avant.match(/<div className="media-fit"><(FeedVideo|VideoThumb)/g) || []).length;
  const nApres = (s.match(/<div className="media-fit"><(FeedVideo|VideoThumb)/g) || []).length;
  if (nApres !== nAvant) fail(n + ' : video voakasika (' + nAvant + ' → ' + nApres + ')');
  if (!s.includes('<SmartImage className="media-fit"')) fail(n + ' : SmartImage simba');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra simba');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
