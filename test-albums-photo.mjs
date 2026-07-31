// test-albums-photo.mjs — Tab Photo : album telo (fomba Facebook)
//
// Ny tena tsapaina : ny logika fizarana sy fanesorana doublon, ary ny
// fanamarinana fa VOAFETRA amin'ny album iray ny viewer.
//
// Fampandehanana :  node test-albums-photo.mjs
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

const SRC = fs.readFileSync('./src/pages/Profile.jsx', 'utf8');

/* ── Famerenana ny logika MARINA nalaina tao amin'ny fichier ────────────── */
const uniqByUrl = (arr) => {
  const seen = new Set(); const out = [];
  for (const p of arr) {
    if (!p || !p.mediaURL || seen.has(p.mediaURL)) continue;
    seen.add(p.mediaURL); out.push(p);
  }
  return out;
};
const synth = (id, url, flag) => ({ id, mediaURL: url, [flag]: true });

function albums(posts, profile, coverURL) {
  const photoPosts = posts.filter(p => p.mediaType === 'image' && p.mediaURL);
  const albumProfile = uniqByUrl([
    ...(profile.photoURL
      ? [posts.find(p => p.isProfilePhoto && p.mediaURL === profile.photoURL)
         || synth('profile-photo', profile.photoURL, 'isProfilePhoto')]
      : []),
    ...posts.filter(p => p.isProfilePhoto && p.mediaURL),
  ]);
  const albumCover = uniqByUrl([
    ...(coverURL
      ? [posts.find(p => p.isCoverPhoto && p.mediaURL === coverURL)
         || synth('cover-photo', coverURL, 'isCoverPhoto')]
      : []),
    ...posts.filter(p => p.isCoverPhoto && p.mediaURL),
  ]);
  const albumPosts = photoPosts.filter(p => !p.isProfilePhoto && !p.isCoverPhoto);
  return { albumProfile, albumCover, albumPosts };
}

const P = (id, url, extra = {}) => ({ id, mediaURL: url, mediaType: 'image', ...extra });

/* ═══ 1. Fizarana ═══════════════════════════════════════════════════════ */
console.log('1) Fizarana ho album telo');
{
  const posts = [
    P('p1', 'photo1.jpg'),
    P('p2', 'photo2.jpg'),
    P('pf1', 'prof-new.jpg', { isProfilePhoto: true }),
    P('pf0', 'prof-old.jpg', { isProfilePhoto: true }),
    P('cv1', 'cover-new.jpg', { isCoverPhoto: true }),
    P('cv0', 'cover-old.jpg', { isCoverPhoto: true }),
  ];
  const a = albums(posts, { photoURL: 'prof-new.jpg' }, 'cover-new.jpg');
  eq('album profil = 2 (tantara)', a.albumProfile.map(x => x.id), ['pf1', 'pf0']);
  eq('album couverture = 2', a.albumCover.map(x => x.id), ['cv1', 'cv0']);
  eq('album publication = 2 (tsy misy profil/cover)', a.albumPosts.map(x => x.id), ['p1', 'p2']);
  ok('tsy mifangaro', a.albumPosts.every(x => !x.isProfilePhoto && !x.isCoverPhoto));
}

/* ═══ 2. Sary ANKEHITRINY aloha ═════════════════════════════════════════ */
console.log('\n2) Ny sary ankehitriny voalohany');
{
  const posts = [
    P('pf0', 'prof-old.jpg', { isProfilePhoto: true }),
    P('pf1', 'prof-new.jpg', { isProfilePhoto: true }),
  ];
  const a = albums(posts, { photoURL: 'prof-new.jpg' }, null);
  eq('ny ankehitriny voalohany', a.albumProfile.map(x => x.id), ['pf1', 'pf0']);
  eq('tsy misy doublon', a.albumProfile.length, 2);
}

/* ═══ 3. Sary ankehitriny TSY manana publication ════════════════════════ */
console.log('\n3) Kaonty tranainy / Register — tsy misy publication');
{
  const a = albums([], { photoURL: 'prof.jpg' }, 'cov.jpg');
  eq('synth profil noforonina', a.albumProfile.map(x => x.id), ['profile-photo']);
  eq('synth couverture noforonina', a.albumCover.map(x => x.id), ['cover-photo']);
  ok('tsy foana', a.albumProfile.length === 1 && a.albumCover.length === 1);
}

/* ═══ 4. Doublon ════════════════════════════════════════════════════════ */
console.log('\n4) Fanesorana doublon');
{
  const posts = [P('a', 'x.jpg', { isProfilePhoto: true }), P('b', 'x.jpg', { isProfilePhoto: true })];
  const a = albums(posts, { photoURL: 'x.jpg' }, null);
  eq('URL mitovy → iray ihany', a.albumProfile.length, 1);
  eq('ny voalohany no tazonina', a.albumProfile[0].id, 'a');
}

/* ═══ 5. Cas limites ════════════════════════════════════════════════════ */
console.log('\n5) Cas limites');
{
  let a = albums([], {}, null);
  eq('tsy misy na inona → foana', [a.albumProfile.length, a.albumCover.length, a.albumPosts.length], [0, 0, 0]);

  a = albums([P('p1', 'a.jpg')], {}, null);
  eq('publication ihany', a.albumPosts.length, 1);
  eq('profil foana', a.albumProfile.length, 0);

  a = albums([P('x', null, { isProfilePhoto: true })], {}, null);
  eq('mediaURL foana lavina', a.albumProfile.length, 0);

  a = albums([P('p', 'v.mp4', { mediaType: 'video' })], {}, null);
  eq('video tsy tafiditra', a.albumPosts.length, 0);
}

/* ═══ 6. Fanamarinana statique ══════════════════════════════════════════ */
console.log('\n6) Fanamarinana ao amin\'ny fichier');
ok('PHOTO_ALBUMS voafaritra', SRC.includes('const PHOTO_ALBUMS = {'));
ok('lohateny telo', SRC.includes("'Photos de profil'") && SRC.includes("'Photos de couverture'"));
ok('albumOf voafaritra', SRC.includes('const albumOf = (k) =>'));
eq('`allPhotos` voaesotra tanteraka', (SRC.match(/allPhotos/g) || []).length, 0);
eq('setPhotoViewer misy album (3 clic + 1 index)', (SRC.match(/setPhotoViewer\(\{ album/g) || []).length, 4);

console.log('\n   Viewer voafetra amin\'ny album');
ok('viewer mampiasa albumOf', SRC.includes('albumOf(photoViewer.album)[photoViewer.index]'));
ok('galleryUrls = album ihany', SRC.includes('galleryUrls={album.map(p => p.mediaURL)}'));
ok('onIndexChange mitazona ny album', SRC.includes('setPhotoViewer({ album: photoViewer.album, index: i })'));
ok('clic couverture → album cover', SRC.includes("setPhotoViewer({ album:'cover'"));
ok('clic avatar → album profile', SRC.includes("setPhotoViewer({ album:'profile'"));

console.log('\n   Grille');
ok('section araka ny album', SRC.includes('Object.entries(PHOTO_ALBUMS).map'));
ok('album foana tsy aseho', SRC.includes('alb.items.length === 0 ? null'));
ok('grille mampiasa thumbURL', SRC.includes('src={p.thumbURL || p.mediaURL}'));
ok('totalPhotos ho an\'ny "Aucune photo"', SRC.includes("activeTab==='photos'&&(totalPhotos===0"));

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
