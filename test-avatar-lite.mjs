// test-avatar-lite.mjs — Avatar : habe roa (fomba Facebook)
//
// Fampandehanana :  node test-avatar-lite.mjs
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

const R = (p) => fs.readFileSync(p, 'utf8');
const FILES = {
  Home: './src/pages/Home.jsx',
  Messages: './src/pages/Messages.jsx',
  Profile: './src/pages/Profile.jsx',
  PostDetail: './src/pages/PostDetail.jsx',
  GroupPage: './src/pages/GroupPage.jsx',
  Friends: './src/pages/Friends.jsx',
  Reels: './src/pages/Reels.jsx',
  Events: './src/pages/Events.jsx',
  Announcements: './src/pages/Announcements.jsx',
  ShareModal: './src/components/ShareModal.jsx',
  Register: './src/pages/Register.jsx',
};

/* ═══ 1. Famoronana ny vignette ═════════════════════════════════════════ */
console.log('1) Famoronana `photoThumb` amin\'ny upload');
{
  const PR = R(FILES.Profile), RG = R(FILES.Register);
  ok('Profile : makeThumb 160', PR.includes('makeThumb(file, 160)'));
  ok('Profile : voatahiry photoThumb', PR.includes('photoURL: r.url, photoThumb: thumb'));
  ok('Profile : state mihetsika', PR.includes('photoThumb:thumb'));
  ok('Profile : import makeThumb', /import \{[^}]*makeThumb[^}]*\} from '\.\.\/utils\/telegram'/.test(PR));

  ok('Register : makeThumb 160', RG.includes('makeThumb(profileFile, 160)'));
  ok('Register : voatahiry', RG.includes('photoUpdates.photoThumb'));
  ok('Register : import makeThumb', RG.includes("import { uploadToTelegram, makeThumb }"));
}

console.log('\n   Tsy manakana raha tsy mety');
{
  const PR = R(FILES.Profile), RG = R(FILES.Register);
  ok('Profile : try/catch manodidina', /try \{[^]{0,220}makeThumb\(file, 160\)[^]{0,200}catch/.test(PR));
  ok('Profile : default \'\'', PR.includes("let thumb = '';"));
  ok('Register : try/catch manodidina', /try \{[^]{0,240}makeThumb\(profileFile, 160\)[^]{0,220}catch/.test(RG));
}

/* ═══ 2. photoURL feno TAZONINA (fullscreen) ═══════════════════════════ */
console.log('\n2) `photoURL` feno tazonina — publication sary profil');
{
  const PR = R(FILES.Profile);
  ok('photoURL mbola voatahiry feno', PR.includes('photoURL: r.url'));
  ok('publication sary profil mampiasa r.url (720 px)',
     /profilePhotoPost\(\{ uid: currentUser\.uid, url: r\.url/.test(PR));
  ok('galerie mampitaha amin\'ny photoURL', PR.includes('p.mediaURL === profile.photoURL'));
}

/* ═══ 3. Saha denormalisé — 43 toerana ═════════════════════════════════ */
console.log('\n3) Saha denormalisé mitahiry ny THUMB');
{
  const EXPECT = { Home: 10, Messages: 7, Profile: 7, PostDetail: 6, GroupPage: 3,
                   Friends: 3, Reels: 3, Events: 2, Announcements: 1, ShareModal: 1 };
  let total = 0;
  for (const [n, c] of Object.entries(EXPECT)) {
    const s = R(FILES[n]);
    const got = (s.match(/(authorPhoto|fromPhoto): \(userProfile\.photoThumb \|\| userProfile\.photoURL\)/g) || []).length;
    eq(n.padEnd(14) + c + ' toerana', got, c);
    total += got;
  }
  eq('TOTAL', total, 43);
}

console.log('\n   Tsy misy sisa tsy voahitsy');
{
  let left = 0;
  for (const [n, p] of Object.entries(FILES)) {
    if (n === 'Register') continue;
    const s = R(p);
    left += (s.match(/(authorPhoto|fromPhoto):\s*userProfile\.photoURL/g) || []).length;
  }
  eq('fanoratana denormalisé tsy voahitsy', left, 0);
}

/* ═══ 4. Fallback — mpampiasa efa misy ═════════════════════════════════ */
console.log('\n4) Fallback — tsy misy avatar very');
{
  // Simulation an'ilay expression marina
  const pick = (up) => (up.photoThumb || up.photoURL);
  eq('manana thumb → thumb', pick({ photoThumb: 'T', photoURL: 'F' }), 'T');
  eq('tsy manana thumb (efa misy) → photoURL', pick({ photoURL: 'F' }), 'F');
  eq('thumb foana → photoURL', pick({ photoThumb: '', photoURL: 'F' }), 'F');
  eq('thumb null → photoURL', pick({ photoThumb: null, photoURL: 'F' }), 'F');
  eq('samy foana → undefined (|| \'\' any amin\'ny site)', pick({}), undefined);
}

/* ═══ 5. Fampisehoana TSY voakasika ════════════════════════════════════ */
console.log('\n5) Toerana FAMPISEHOANA — tsy voakasika mihitsy');
{
  let img = 0;
  for (const p of Object.values(FILES)) {
    img += (R(p).match(/src=\{[^]{0,40}(photoURL|authorPhoto|fromPhoto)/g) || []).length;
  }
  ok('mbola misy `src={…photoURL…}` (tsy nokitihina)', img > 0, img + ' toerana');
  // ⚠️ Misy fonction `av()` EO AN-TOERANA efa nisy ao amin'ny GroupPage sy
  // Search (mpamorona ui-avatars) — tsy mifandray amin'ity patch ity.
  // Ny tokony hamarinina dia hoe tsy misy import `utils/avatar` (revert taloha).
  let imported = 0;
  for (const p of Object.values(FILES)) imported += (R(p).match(/from '\.\.?\/utils\/avatar'/g) || []).length;
  eq("tsy misy import utils/avatar (revert voahaja)", imported, 0);
  ok('fonction av() eo an-toerana tsy voakasika',
     R(FILES.GroupPage).includes('src={av(m)}'));
}

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
