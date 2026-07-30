// test-lite-multiphoto.mjs — TESTE ny `pairPhotos` MARINA ao amin'ny PhotoCarousel
//
// Ny olana lehibe indrindra amin'ity fanovana ity dia ny FIFANANDRIFIANA
// index eo amin'ny mediaURLs sy ny thumbURLs, ary ny fitazonana ny URL feno
// ho an'ny onOpen (ny PostDetail dia manao mediaURLs.indexOf(u)).
//
// Fampandehanana :  node test-lite-multiphoto.mjs
import fs from 'fs';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + a + '\n      want ' + b); }
};
const ok = (label, cond, info = '') => {
  if (cond) { pass++; console.log('  ✔ ' + label + (info ? '  (' + info + ')' : '')); }
  else { fail++; console.log('  ✘ ' + label + '  ' + info); }
};

/* ── Fakana ny fonction marina ───────────────────────────────────────────── */
const SRC = fs.readFileSync('./src/components/PhotoCarousel.jsx', 'utf8');
const H = 'export function pairPhotos(urls, thumbs) {';
const i = SRC.indexOf(H);
if (i < 0) { console.log('❌ Tsy hita ny pairPhotos'); process.exit(1); }
let d = 0, j = SRC.indexOf('{', i), end = -1;
for (; j < SRC.length; j++) {
  if (SRC[j] === '{') d++;
  else if (SRC[j] === '}') { d--; if (d === 0) { end = j; break; } }
}
const body = SRC.slice(i, end + 1).replace('export function', 'function');
console.log('📄 pairPhotos : ' + body.split('\n').length + ' andalana\n');
const pairPhotos = new Function(body + '\nreturn pairPhotos;')();

const U = ['u1', 'u2', 'u3'];
const T = ['t1', 't2', 't3'];

/* ═══ 1. Fitondrana fototra ═══════════════════════════════════════════════ */
console.log('1) Fototra');
eq('vignette feno', pairPhotos(U, T), [
  { u: 'u1', d: 't1' }, { u: 'u2', d: 't2' }, { u: 'u3', d: 't3' },
]);
eq('tsy misy vignette → sary feno', pairPhotos(U, []), [
  { u: 'u1', d: 'u1' }, { u: 'u2', d: 'u2' }, { u: 'u3', d: 'u3' },
]);
eq('thumbs undefined (publication taloha)', pairPhotos(U, undefined), [
  { u: 'u1', d: 'u1' }, { u: 'u2', d: 'u2' }, { u: 'u3', d: 'u3' },
]);
eq('thumbs null', pairPhotos(U, null).length, 3);
eq('thumbs tsy array', pairPhotos(U, 'abc').length, 3);

/* ═══ 2. Vignette tsy feno — index tsy mifindra ═══════════════════════════ */
console.log('\n2) Vignette tsy feno — FIFANANDRIFIANA index');
eq('vignette faharoa tsy nety', pairPhotos(U, ['t1', '', 't3']), [
  { u: 'u1', d: 't1' }, { u: 'u2', d: 'u2' }, { u: 'u3', d: 't3' },
]);
eq('vignette voalohany tsy nety', pairPhotos(U, ['', 't2', 't3']), [
  { u: 'u1', d: 'u1' }, { u: 'u2', d: 't2' }, { u: 'u3', d: 't3' },
]);
eq('thumbs fohy noho ny urls', pairPhotos(U, ['t1']), [
  { u: 'u1', d: 't1' }, { u: 'u2', d: 'u2' }, { u: 'u3', d: 'u3' },
]);
eq('thumbs lava noho ny urls (dinganina)', pairPhotos(['u1'], ['t1', 't2', 't3']), [
  { u: 'u1', d: 't1' },
]);
eq('thumbs misy null', pairPhotos(U, [null, undefined, 't3']), [
  { u: 'u1', d: 'u1' }, { u: 'u2', d: 'u2' }, { u: 'u3', d: 't3' },
]);

/* ═══ 3. URL foana ao anaty urls ═════════════════════════════════════════ */
console.log('\n3) URL foana — tsy mamindra ny mifanandrify');
{
  // u2 foana → esorina, FA t3 dia mbola an'ny u3
  const r = pairPhotos(['u1', '', 'u3'], ['t1', 't2', 't3']);
  eq('u2 foana esorina', r.length, 2);
  eq('u3 mitazona ny t3 (tsy t2)', r[1], { u: 'u3', d: 't3' });
}

/* ═══ 4. NY TENA ZAVA-DEHIBE — onOpen mitondra ny URL FENO ═══════════════ */
console.log('\n4) onOpen(u) — URL feno, tsy vignette');
{
  const r = pairPhotos(U, T);
  ok('u1 = URL feno', r[0].u === 'u1');
  ok('u2 = URL feno', r[1].u === 'u2');
  // Simulation an'ny PostDetail : mediaURLs.indexOf(u)
  const idx = U.indexOf(r[2].u);
  eq('PostDetail indexOf(u) → 2 (fa tsy -1)', idx, 2);
  const idxBad = U.indexOf(r[2].d);
  eq('raha vignette no nalefa dia -1 (izay nosorohina)', idxBad, -1);
}

/* ═══ 5. Cas limites ═════════════════════════════════════════════════════ */
console.log('\n5) Cas limites');
eq('urls foana', pairPhotos([], T), []);
eq('urls null', pairPhotos(null, T), []);
eq('urls undefined', pairPhotos(undefined, undefined), []);
eq('urls tsy array', pairPhotos('abc', T), []);
eq('urls foana daholo', pairPhotos(['', null, undefined], T), []);
eq('sary 10', pairPhotos(Array.from({length:10},(_,k)=>'u'+k), []).length, 10);

/* ═══ 6. Fanamarinana statique ═══════════════════════════════════════════ */
console.log('\n6) Fanamarinana statique');
{
  const HH = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const GG = fs.readFileSync('./src/pages/GroupPage.jsx', 'utf8');
  const PP = fs.readFileSync('./src/pages/Profile.jsx', 'utf8');
  const PD = fs.readFileSync('./src/pages/PostDetail.jsx', 'utf8');

  ok('Cell mampiasa p.u ho onOpen', SRC.includes('onClick={open(p.u)}'));
  ok('Cell maneho p.d', SRC.includes('<Img u={p.d} />'));
  ok('n=1 : open(list[0].u)', SRC.includes('open(list[0].u)'));
  ok('n=1 : maneho list[0].d', SRC.includes('<Img u={list[0].d} />'));

  ok('Home upload : thumbs[]', HH.includes('const thumbs = [];'));
  ok('Home : thumbURLs voatahiry', HH.includes('thumbURLs: thumbs'));
  ok('GroupPage upload : thumbs[]', GG.includes('const thumbs = [];'));
  ok('GroupPage : makeThumb importé', /import \{[^}]*makeThumb/.test(GG));

  eq('Home : thumbs= 2 toerana', (HH.match(/thumbs=\{post\./g) || []).length, 2);
  eq('Profile : thumbs= 2 toerana', (PP.match(/thumbs=\{post\./g) || []).length, 2);
  eq('GroupPage : thumbs= 2 toerana', (GG.match(/thumbs=\{post\./g) || []).length, 2);

  ok('PostDetail TSY mandefa thumbs (indexOf!)', !PD.includes('thumbs={'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
