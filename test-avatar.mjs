// test-avatar.mjs — TESTE ny `av()` MARINA ao amin'ny utils/avatar.js
//
// Fampandehanana :  node test-avatar.mjs
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

const SRC = fs.readFileSync('./src/utils/avatar.js', 'utf8').replace(/^export /gm, '');
const { av } = new Function('Math', 'Number', SRC + '\nreturn { av };')(Math, Number);

const CLD  = 'https://res.cloudinary.com/dgljp1ve7/image/upload/v1783507023/trengo/avatars/xrddvswha0x82svbgat4.jpg';
const TG   = 'https://tsengo-upload.randrianarivera67.workers.dev/media-id?file_id=BQACAgQAAxk';
const UI   = 'https://ui-avatars.com/api/?name=Rakoto&background=1877F2&color=fff';

/* ═══ 1. Cloudinary → voahitsy ══════════════════════════════════════════ */
console.log('1) URL Cloudinary');
eq('transformation tafiditra', av(CLD, 128),
  'https://res.cloudinary.com/dgljp1ve7/image/upload/w_128,h_128,c_fill,q_auto,f_auto/v1783507023/trengo/avatars/xrddvswha0x82svbgat4.jpg');
eq('default 128', av(CLD), av(CLD, 128));
ok('mitazona ny lalana feno', av(CLD, 96).endsWith('/v1783507023/trengo/avatars/xrddvswha0x82svbgat4.jpg'));
ok('w_ sy h_ mitovy', av(CLD, 96).includes('w_96,h_96,c_fill,q_auto,f_auto'));
ok('version tsy voakitika', av(CLD, 96).includes('/v1783507023/'));

/* ═══ 2. URL HAFA → TSY VOAKITIKA (io no fiarovana lehibe) ═════════════ */
console.log('\n2) URL hafa — TSY voakitika mihitsy');
eq('Telegram', av(TG, 128), TG);
eq('ui-avatars', av(UI, 128), UI);
eq('URL hafa', av('https://example.com/a.jpg', 128), 'https://example.com/a.jpg');
eq('chemin relatif', av('/icon-192.png', 128), '/icon-192.png');
eq('data URI', av('data:image/png;base64,AAA', 128), 'data:image/png;base64,AAA');

/* ═══ 3. Efa voahitsy → tsy asiana faharoa ═════════════════════════════ */
console.log('\n3) Tsy misy transformation roa sosona');
{
  const once = av(CLD, 128);
  eq('av(av(x)) === av(x)', av(once, 128), once);
  eq('idempotent 3×', av(av(once, 96), 64), once);

  const manual = 'https://res.cloudinary.com/x/image/upload/w_50,q_auto/v1/a.jpg';
  eq('transformation efa nosoratana → tsy voakitika', av(manual, 128), manual);
  const eff = 'https://res.cloudinary.com/x/image/upload/e_blur:200/v1/a.jpg';
  eq('effet e_ → tsy voakitika', av(eff, 128), eff);
}

/* ═══ 4. Version segment TSY diso lazaina hoe transformation ═══════════ */
console.log('\n4) Segment version — tsy diso fandikana');
{
  const u = 'https://res.cloudinary.com/x/image/upload/v1783507023/a.jpg';
  ok('v1783… voahitsy tsara', av(u, 96).includes('w_96,h_96'), av(u, 96));
  const nov = 'https://res.cloudinary.com/x/image/upload/trengo/avatars/a.jpg';
  ok('tsy misy version → voahitsy ihany', av(nov, 96).includes('w_96,h_96'));
}

/* ═══ 5. Cas limites — tsy crash ═══════════════════════════════════════ */
console.log('\n5) Cas limites');
eq('null', av(null, 128), null);
eq('undefined', av(undefined, 128), undefined);
eq('chaîne foana', av('', 128), '');
eq('nombre', av(42, 128), 42);
eq('objet', av({ a: 1 }, 128), { a: 1 });
eq('cloudinary tsy misy /image/upload/', av('https://res.cloudinary.com/x/raw/y.jpg', 128), 'https://res.cloudinary.com/x/raw/y.jpg');
eq('/image/upload/ foana ny tail', av('https://res.cloudinary.com/x/image/upload/', 128), 'https://res.cloudinary.com/x/image/upload/');

console.log('\n   Habe voafetra');
ok('size 0 → 128 (tsy habe mitombina → default)', av(CLD, 0).includes('w_128,h_128'));
ok('size négatif → 16', av(CLD, -50).includes('w_16,h_16'));
ok('size 99999 → 1024 (max)', av(CLD, 99999).includes('w_1024,h_1024'));
ok('size undefined → 128', av(CLD, undefined).includes('w_128,h_128'));
ok('size NaN → 128', av(CLD, NaN).includes('w_128,h_128'));
ok('size "96" → 96', av(CLD, '96').includes('w_96,h_96'));
ok('size 96.7 → 97 (arrondi)', av(CLD, 96.7).includes('w_97,h_97'));

/* ═══ 6. Fanamarinana statique ═════════════════════════════════════════ */
console.log('\n6) Fampiharana ao amin\'ny fichier');
{
  const HO = fs.readFileSync('./src/pages/Home.jsx', 'utf8');
  const MS = fs.readFileSync('./src/pages/Messages.jsx', 'utf8');

  eq('Home : toerana 9', (HO.match(/src=\{av\(/g) || []).length, 9);
  eq('Messages : toerana 11', (MS.match(/src=\{av\(/g) || []).length, 11);
  ok('Home : import tokana', (HO.match(/from '\.\.\/utils\/avatar'/g) || []).length === 1);
  ok('Messages : import tokana', (MS.match(/from '\.\.\/utils\/avatar'/g) || []).length === 1);
  ok('habe 128 ampiasaina', HO.includes(', 128)}'));

  // Toerana nesorina — tsy voakitika
  ok('Home:1680 conteneur tsy voakitika',
     /<img src=\{userProfile\?\.photoURL \|\|[^]{0,300}height:'100%'/.test(HO));
  ok('carte profil (height:110) tsy voakitika',
     /<img src=\{u\.photoURL \|\|[^]{0,300}height:110/.test(HO));
  eq('tsy misy av( amin\'ny toerana nesorina', (HO.match(/src=\{av\([^]{0,300}height:'100%'/g) || []).length, 0);
}

/* ═══ 7. Tsy voakasika — fichier hafa ══════════════════════════════════ */
console.log('\n7) Fichier hafa mbola tsy voakasika (dingana manaraka)');
for (const [n, p] of Object.entries({
  'Profile.jsx': './src/pages/Profile.jsx',
  'GroupPage.jsx': './src/pages/GroupPage.jsx',
  'Notifications.jsx': './src/pages/Notifications.jsx',
})) ok(n, !fs.readFileSync(p, 'utf8').includes("utils/avatar'"));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
