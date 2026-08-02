// test-hashtag.mjs — Hashtag # (MAMPANDEHA ny parser marina)
//
// Fampandehanana :  node test-hashtag.mjs
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

const { splitRich, extractHashtags } = await import('./src/utils/appLink.js');
const tags    = (t) => splitRich(t).filter(p => p.type === 'hashtag').map(p => p.tag);
const shown   = (t) => splitRich(t).filter(p => p.type === 'hashtag').map(p => p.value);
const rebuilt = (t) => splitRich(t).map(p => p.value).join('');

/* ═══ 1. Fototra ═══════════════════════════════════════════════════════ */
console.log('1) Fantarina ny hashtag');
eq('tokana', tags('Salama #trengo'), ['trengo']);
eq('fiandohana', tags('#trengo salama'), ['trengo']);
eq('roa', tags('#trengo sy #gasy'), ['trengo', 'gasy']);
eq('misy _', tags('#hira_gasy'), ['hira_gasy']);
eq('misy isa', tags('#trengo2026'), ['trengo2026']);
eq('accent', tags('#Hénintsoa'), ['héníntsoa'.normalize()].map(x => 'hénintsoa'));
eq('sora-baventy → kely', tags('#TRENGO'), ['trengo']);
eq('aseho araka ny nosoratana', shown('#TRengo'), ['#TRengo']);

/* ═══ 2. Fandavana ═════════════════════════════════════════════════════ */
console.log('\n2) Fandavana');
eq('isa fotsiny (#2026 = daty)', tags('#2026'), []);
eq('isa fotsiny lava', tags('#12345'), []);
eq('fohy loatra (1)', tags('#a'), []);
eq('2 litera ekena', tags('#ab'), ['ab']);
eq('# irery', tags('# trengo'), []);
eq('## dubla', tags('##trengo'), []);
eq('anaty teny (abc#def)', tags('abc#def'), []);
eq('tsy misy', tags('Salama daholo'), []);

console.log('\n   URL — tsy raisina');
eq('ancre URL', tags('https://x.com/#top'), []);
eq('URL + hashtag marina', tags('https://x.com ary #trengo'), ['trengo']);

/* ═══ 3. Tsy misy litera very ══════════════════════════════════════════ */
console.log('\n3) Reconstruction === lahatsoratra');
[
  'Salama #trengo',
  '#trengo sy #gasy, misaotra.',
  'Tsy misy',
  '#2026 daty',
  'abc#def',
  'https://x.com/#top',
  'ligne1\n#tag\nligne3',
  '(#trengo)',
  '#trengo!',
].forEach((t, i) => eq('reconstruction ' + i, rebuilt(t), t));

/* ═══ 4. Miaraka amin'ny mention sy lien ═══════════════════════════════ */
console.log('\n4) Mifangaro');
{
  const p = splitRich('@[Tony](u1) jereo #trengo https://x.com');
  eq('mention 1', p.filter(x => x.type === 'mention').length, 1);
  eq('hashtag 1', p.filter(x => x.type === 'hashtag').length, 1);
  eq('lien 1', p.filter(x => x.type === 'link').length, 1);
  eq('mention tsy simba', p.find(x => x.type === 'mention').uid, 'u1');
  eq('hashtag tsy simba', p.find(x => x.type === 'hashtag').tag, 'trengo');
}
eq('@username tsy voakasika', splitRich('@bema #tag').filter(p => p.type === 'mention')[0].username, 'bema');

/* ═══ 5. extractHashtags — fitehirizana ════════════════════════════════ */
console.log('\n5) extractHashtags');
eq('tsotra', extractHashtags('#trengo sy #gasy'), ['trengo', 'gasy']);
eq('doublon esorina', extractHashtags('#trengo #TRENGO #trengo'), ['trengo']);
eq('sora-baventy kely', extractHashtags('#TrenGo'), ['trengo']);
eq('isa lavina', extractHashtags('#2026 #trengo'), ['trengo']);
eq('tsy misy → foana', extractHashtags('Salama'), []);
eq('null', extractHashtags(null), []);
eq('vide', extractHashtags(''), []);

console.log('\n   Fetra');
{
  const many = Array.from({ length: 20 }, (_, i) => '#tag' + String.fromCharCode(97 + i)).join(' ');
  eq('fetra 10', extractHashtags(many).length, 10);
  eq('fetra azo ovaina', extractHashtags(many, 3).length, 3);
}

/* ═══ 6. Fampiharana ═══════════════════════════════════════════════════ */
console.log('\n6) Fampiharana');
{
  const LK = fs.readFileSync('./src/components/Linkify.jsx', 'utf8');
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const AP = fs.readFileSync('./src/App.jsx', 'utf8');
  const HP = fs.readFileSync('./src/pages/HashtagPage.jsx', 'utf8');

  ok('Linkify mandika hashtag', LK.includes("p.type === 'hashtag'"));
  ok('mankany /hashtag/', LK.includes('navigate(`/hashtag/${p.tag}`)'));
  ok('Home mitahiry hashtags[]', HO.includes('hashtags: extractHashtags(content)'));
  ok('route voarohy', AP.includes('path="/hashtag/:tag"'));
  ok('HashtagPage lazy', AP.includes("lazy(() => import('./pages/HashtagPage'))"));

  ok('requête array-contains', HP.includes("where('hashtags', 'array-contains', t)"));
  // Fallback : try amin'ny orderBy, catch tsy misy orderBy (mila index composite)
  ok('fallback raha tsy misy index',
     (HP.match(/where\('hashtags', 'array-contains', t\)/g) || []).length === 2);
  ok('try/catch manodidina ny requête', /try \{[^]{0,400}catch \(e\) \{[^]{0,400}array-contains/.test(HP));
  ok('audience "me" esorina', HP.includes("p.audience !== 'me'"));
  ok('toe-javatra 4 voaray', ['loading', 'ok', 'empty', 'error'].every(x => HP.includes("'" + x + "'")));
  ok('vignette ampiasaina', HP.includes('p.thumbURL || p.mediaURL'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
