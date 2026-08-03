/**
 * patch-media-fit-wrap.cjs   —  Zorony 16 px ho an'ny VIDEO sy SARY MARO
 * ─────────────────────────────────────────────────────────────────────────────
 * FOTOTRA (voamarina) :
 *   PhotoCarousel({ urls, thumbs, onOpen })            ← tsy mandray className
 *   FeedVideo({ src, poster, dataSaver, style, … })    ← tsy mandray className
 *
 *   Ka ny `className="media-fit"` napetraka taminy dia TSY MISY VOKANY —
 *   tsy mankany amin'ny DOM mihitsy. Izay no antony tsy nahazo zorony izy ireo.
 *   (Ny SmartImage kosa dia MANDRAY azy — voamarina and. 14.)
 *
 * FANITSIANA : <div className="media-fit"> MIFONO azy ireo.
 *
 * Fampandehanana :  node patch-media-fit-wrap.cjs --dry
 *                   node patch-media-fit-wrap.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => { if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f); return fs.readFileSync(f, 'utf8'); };
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* Fanamarinana : tsy mandray className tokoa ve ? */
for (const [f, sig] of [
  ['src/components/PhotoCarousel.jsx', 'export default function PhotoCarousel({'],
  ['src/components/FeedVideo.jsx',     'export default function FeedVideo({'],
]) {
  const s = read(P(f));
  const i = s.indexOf(sig);
  if (i < 0) fail(f + ' : signature tsy hita');
  const line = s.slice(i, s.indexOf('\n', i));
  if (line.includes('className')) fail(f + ' : mandray className sahady — tsy mila voafono');
}

for (const rel of ['src/pages/Home.jsx', 'src/pages/Profile.jsx', 'src/pages/GroupPage.jsx']) {
  let s = read(P(rel));
  const name = rel.split('/').pop();
  const iF = s.indexOf('FARITRA MANIDINA');
  if (iF < 0) fail(name + ' : faritra manidina tsy hita');
  const iE = s.indexOf('post-actions-row', iF);
  if (iE < 0) fail(name + ' : fetra tsy hita');
  let seg = s.slice(iF, iE);

  if (seg.includes('<div className="media-fit"><PhotoCarousel') ||
      seg.includes('<div className="media-fit"><FeedVideo')) { console.log('  ⏭  ' + name + ' : efa voapatch'); continue; }

  // ① Esorina ny prop tsy misy vokany
  const nProp = (seg.match(/<(PhotoCarousel|FeedVideo) className="media-fit" /g) || []).length;
  seg = seg.replace(/<(PhotoCarousel|FeedVideo) className="media-fit" /g, '<$1 ');

  // ② Voafono amin'ny <div>
  let nWrap = 0;
  for (const comp of ['PhotoCarousel', 'FeedVideo']) {
    let from = 0;
    for (;;) {
      const i = seg.indexOf('<' + comp + ' ', from);
      if (i < 0) break;
      const j = seg.indexOf('/>', i);
      if (j < 0) fail(name + ' : ' + comp + ' tsy mifarana amin\'ny /> ');
      seg = seg.slice(0, i) + '<div className="media-fit">' + seg.slice(i, j + 2) +
            '</div>' + seg.slice(j + 2);
      from = j + 2 + '<div className="media-fit">'.length + '</div>'.length;
      nWrap++;
    }
  }
  if (nWrap === 0) fail(name + ' : tsy misy PhotoCarousel/FeedVideo ao anaty faritra');

  s = s.slice(0, iF) + seg + s.slice(iE);
  files[rel] = s; touched.push(rel);
  console.log('  • ' + name + ' : prop nesorina ' + nProp + ' · voafono ' + nWrap);
}

/* Fanamarinana farany */
for (const rel of touched) {
  const s = files[rel]; const n = rel.split('/').pop();
  if (/<(PhotoCarousel|FeedVideo) className=/.test(s)) fail(n + ' : prop tsy misy vokany mbola ao');
  if (!s.includes('<div className="media-fit">')) fail(n + ' : wrapper very');
  if (!s.includes('FARITRA MANIDINA')) fail(n + ' : faritra simba');
  if (!s.includes('post-actions-row')) fail(n + ' : actions very');
  if (!s.includes('<SmartImage className="media-fit"')) fail(n + ' : SmartImage simba');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
