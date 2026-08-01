// test-mentions.mjs — Mention @username
//
// Ny tena zava-dehibe : ny MAILAKA tsy tokony ho raisina ho mention, ary ny
// fifanarahana notification tsy tokony hamela `@tony` hifanaraka amin'ny
// `@tonyzz` (io no bug taloha).
//
// Fampandehanana :  node test-mentions.mjs
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

const { splitRich, splitLinks } = await import('./src/utils/appLink.js');

const mentions = (t) => splitRich(t).filter(p => p.type === 'mention').map(p => p.username);
const rebuilt = (t) => splitRich(t).map(p => p.value).join('');

/* ═══ 1. Fototra ═══════════════════════════════════════════════════════ */
console.log('1) Fantarina ny mention');
eq('mention tokana', mentions('Salama @tony'), ['tony']);
eq('fiandohana', mentions('@tony salama'), ['tony']);
eq('roa', mentions('@tony sy @bema'), ['tony', 'bema']);
eq('misy _ sy .', mentions('@rakoto_jean.2 e'), ['rakoto_jean.2']);
eq('tsy misy mention', mentions('Salama daholo'), []);
eq('@ irery', mentions('@ tony'), []);
eq('fohy loatra (1 litera)', mentions('@a'), []);
eq('2 litera ekena', mentions('@ab'), ['ab']);

/* ═══ 2. MAILAKA — tsy mention (fiarovana lehibe) ══════════════════════ */
console.log('\n2) Mailaka — TSY raisina ho mention');
eq('mailaka tsotra', mentions('rakoto@tony.mg'), []);
eq('mailaka anaty fehezanteny', mentions('Alefaso amin\'ny rakoto@gmail.com azafady'), []);
eq('mailaka + mention marina', mentions('x@gmail.com ary @tony'), ['tony']);
eq('@@ dubla', mentions('@@tony'), []);

/* ═══ 3. Tsy misy litera very ══════════════════════════════════════════ */
console.log('\n3) Reconstruction === lahatsoratra tany am-boalohany');
[
  'Salama @tony',
  '@tony sy @bema, misaotra.',
  'rakoto@gmail.com',
  'Jereo https://trengo.mg @tony',
  'ligne1\n@tony\nligne3',
  'Tsy misy mihitsy',
  '@tony!',
  '(@tony)',
].forEach((t, i) => eq('reconstruction ' + i, rebuilt(t), t));

/* ═══ 4. Miaraka amin'ny lien ══════════════════════════════════════════ */
console.log('\n4) Miaraka amin\'ny lien');
{
  const parts = splitRich('Jereo https://trengo.mg ry @tony');
  eq('lien 1 + mention 1', [parts.filter(p => p.type === 'link').length, parts.filter(p => p.type === 'mention').length], [1, 1]);
  eq('URL misy @ tsy simba', mentions('https://x.com/@tony'), []);
}

/* ═══ 5. splitLinks tsy voakasika (régression Messages) ════════════════ */
console.log('\n5) splitLinks — tsy misy régression');
eq('lien mbola mandeha', splitLinks('https://x.com').filter(p => p.type === 'link').length, 1);
eq('splitLinks tsy mamoaka mention', splitLinks('@tony').filter(p => p.type === 'mention').length, 0);

/* ═══ 6. Fifanarahana notification (logika marina nalaina) ═════════════ */
console.log('\n6) Notification — fifanarahana MARINA');
{
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const i = HO.indexOf('const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;');
  ok('regex notification ao amin\'ny fichier', i !== -1);

  // Famerenana ny logika marina
  const match = (text, friends, meUid, postUid) => {
    const RE = /(^|[^\p{L}\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;
    const set = new Set(); let m; RE.lastIndex = 0;
    while ((m = RE.exec(text)) !== null) set.add(m[2].toLowerCase());
    return friends.filter(f => {
      const u = (f.username || '').toLowerCase();
      if (u && set.has(u)) return true;
      const first = (f.fullName.split(' ')[0] || '').toLowerCase();
      return !u && first && set.has(first);
    }).filter(f => f.uid !== meUid && f.uid !== postUid).map(f => f.uid);
  };

  const F = [
    { uid: 'u1', fullName: 'Tony Rakoto', username: 'tony' },
    { uid: 'u2', fullName: 'Tonyzz Bema', username: 'tonyzz' },
    { uid: 'u3', fullName: 'Soa Rabe', username: '' },     // tsy manana username
    { uid: 'me', fullName: 'Izaho', username: 'moi' },
  ];

  eq('@tony → u1 IHANY (tsy u2)', match('Salama @tony', F, 'me', 'other'), ['u1']);
  eq('@tonyzz → u2 ihany', match('Salama @tonyzz', F, 'me', 'other'), ['u2']);
  eq('roa miaraka', match('@tony sy @tonyzz', F, 'me', 'other'), ['u1', 'u2']);
  eq('fallback anarana voalohany (tsy misy username)', match('@soa', F, 'me', 'other'), ['u3']);
  eq('mailaka → tsy misy', match('rakoto@tony.mg', F, 'me', 'other'), []);
  eq('tsy mandefa amin\'ny tena', match('@moi', F, 'me', 'other'), []);
  eq('tsy mandefa amin\'ny tompon\'ny publication', match('@tony', F, 'me', 'u1'), []);
  eq('sora-baventy tsy misy dikany', match('@TONY', F, 'me', 'other'), ['u1']);
  eq('tsy misy mention', match('Salama daholo', F, 'me', 'other'), []);
}

/* ═══ 7. Fanamarinana statique ═════════════════════════════════════════ */
console.log('\n7) Fampiharana');
{
  const LK = fs.readFileSync('./src/components/Linkify.jsx', 'utf8');
  const AP = fs.readFileSync('./src/App.jsx', 'utf8');
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  ok('Linkify mampiasa splitRich', LK.includes('splitRich(text)'));
  ok('Linkify mandika mention', LK.includes("p.type === 'mention'"));
  ok('mention mankany /u/', LK.includes('navigate(`/u/${p.username}`)'));
  ok('route /u/:username', AP.includes('path="/u/:username"'));
  ok('UserByName lazy', AP.includes("lazy(() => import('./pages/UserByName'))"));
  ok('UserByName misy', fs.existsSync('./src/pages/UserByName.jsx'));
  // Nosoloina token entité : ny ANARANA no aseho, ny uid no mitondra.
ok('dropdown mampiditra entité { name, uid }',
   fs.readFileSync('./src/components/MentionPanel.jsx','utf8').includes("onPick({ name: p.fullName || p.username"));
  ok('lisitra mitondra username', HO.includes("username: sn.data().username || ''"));
  ok('filtre amin\'ny username koa (MentionPanel)',
   fs.readFileSync('./src/components/MentionPanel.jsx','utf8').includes("(p.username || '').toLowerCase().includes(q)"));

  const UB = fs.readFileSync('./src/pages/UserByName.jsx', 'utf8');
  ok('requête users where username', UB.includes("where('username', '==', v)"));
  ok('andrana sora-baventy kely koa', UB.includes('name.toLowerCase()'));
  ok('tsy hita → hafatra mazava', UB.includes('Utilisateur introuvable'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
