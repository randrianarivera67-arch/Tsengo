/**
 * patch-albums-photo.cjs   —  Tab Photo : album telo (fomba Facebook)
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA VOAMARINA :
 *   `allPhotos = [couverture, profil, ...publication]` — TABILAO TOKANA.
 *   Ny viewer dia mandeha amin'ny index ao anatiny, ka rehefa tsindriana ny
 *   sary profil dia mifangaro amin'ny sary publication sy couverture ny
 *   "suivant". Tsy izay no ataon'ny Facebook.
 *
 * VAOVAO TSARA : ny TANTARA efa voatahiry — ny publication misy
 *   `isProfilePhoto` / `isCoverPhoto` dia ao anatin'ny `posts` (query
 *   `where('uid','==',targetUid)`, limit 100). Ka FILTRE ihany no ilaina.
 *   TSY MISY DONNÉES VAOVAO, TSY MISY MIGRATION.
 *
 * VOKATRA — album telo mizaka ny tenany :
 *   • Photos de profil       (isProfilePhoto)
 *   • Photos de couverture   (isCoverPhoto)
 *   • Photos                 (publication hafa)
 *   Ny viewer dia voafetra amin'ny album nokitihina IHANY.
 *
 * FIAROVANA :
 *   • Ny sary ANKEHITRINY dia mety tsy manana publication (kaonty tranainy, na
 *     Register izay tsy mamorona publication) → `synth()` efa misy no
 *     ampiasaina ho fanampiny, ary esorina ny doublon amin'ny mediaURL.
 *   • Album foana → tsy aseho mihitsy ny section.
 *   • `photoViewer` : { index } → { album, index }. Ny toerana 4 rehetra
 *     mampiasa azy dia voahitsy miaraka (assertion isaky ny iray).
 *
 * TSY VOAKASIKA : ny fitehirizana, ny upload, ny tab hafa (posts/sales/videos).
 *
 * Fampandehanana :  node patch-albums-photo.cjs --dry
 *                   node patch-albums-photo.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/Profile.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/pages/Profile.jsx');
  console.error("   Mandehana ao amin'ny racine an'ny frontend (cd ~/Tsengo-fresh).");
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');

if (s.includes('PHOTO_ALBUMS')) {
  console.log('⏭  Profile.jsx : efa voapatch');
  process.exit(0);
}

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 220) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── 1) Album telo eo amin'ny toerana nisy ny allPhotos ──────────────────── */
s = rep(s,
  `  const profilePhoto = profile.photoURL
    ? [posts.find(p => p.isProfilePhoto && p.mediaURL === profile.photoURL) || synth('profile-photo', profile.photoURL, 'isProfilePhoto')]
    : [];
  const coverPhotoArr = coverURL
    ? [posts.find(p => p.isCoverPhoto && p.mediaURL === coverURL) || synth('cover-photo', coverURL, 'isCoverPhoto')]
    : [];
  const allPhotos = [...coverPhotoArr, ...profilePhoto, ...photoPosts];`,
  `  // ═══ ALBUM PHOTO — fomba Facebook ════════════════════════════════════════
  // Album telo mizaka ny tenany. Ny viewer dia voafetra amin'ny album iray
  // ihany : tsy mifangaro intsony ny "suivant".
  // Ny tantara dia efa ao anatin'ny \`posts\` (isProfilePhoto / isCoverPhoto).
  const uniqByUrl = (arr) => {
    const seen = new Set(); const out = [];
    for (const p of arr) {
      if (!p || !p.mediaURL || seen.has(p.mediaURL)) continue;
      seen.add(p.mediaURL); out.push(p);
    }
    return out;
  };
  // Ny sary ANKEHITRINY aloha, dia ny tantara. Raha tsy misy publication
  // mifanaraka aminy (kaonty tranainy / Register) dia \`synth()\` no ampiasaina.
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

  const PHOTO_ALBUMS = {
    profile: { title: 'Photos de profil',     items: albumProfile },
    cover:   { title: 'Photos de couverture', items: albumCover },
    posts:   { title: 'Photos',               items: albumPosts },
  };
  const albumOf = (k) => (PHOTO_ALBUMS[k] ? PHOTO_ALBUMS[k].items : []);
  const totalPhotos = albumProfile.length + albumCover.length + albumPosts.length;`,
  'albums');

/* ── 2) State : { index } → { album, index } ─────────────────────────────── */
s = rep(s,
  '  const [photoViewer,    setPhotoViewer]   = useState(null); // { index } dans allPhotos',
  "  const [photoViewer,    setPhotoViewer]   = useState(null); // { album:'profile'|'cover'|'posts', index }",
  'state');

/* ── 3) Clic couverture → album couverture ──────────────────────────────── */
s = rep(s,
  "onClick={()=>setPhotoViewer({ index: allPhotos.findIndex(p => p.mediaURL === coverURL) })}",
  "onClick={()=>setPhotoViewer({ album:'cover', index: Math.max(0, albumCover.findIndex(p => p.mediaURL === coverURL)) })}",
  'clic-cover');

/* ── 4) Clic avatar → album profil ──────────────────────────────────────── */
s = rep(s,
  "onClick={()=>profile.photoURL && setPhotoViewer({ index: allPhotos.findIndex(p => p.mediaURL === profile.photoURL) })}",
  "onClick={()=>profile.photoURL && setPhotoViewer({ album:'profile', index: Math.max(0, albumProfile.findIndex(p => p.mediaURL === profile.photoURL)) })}",
  'clic-avatar');

/* ── 5) Tab photos : section telo ───────────────────────────────────────── */
s = rep(s,
  `        {activeTab==='photos'&&(photoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucune photo</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {allPhotos.map((p, i) => <SmartImage key={p.id} src={p.mediaURL} onClick={() => setPhotoViewer({ index: i })} minH={110} style={{ aspectRatio:'1', width:'100%', height:'100%', borderRadius:8, objectFit:'cover', cursor:'pointer' }}/>)}
            </div>
        )}`,
  `        {activeTab==='photos'&&(totalPhotos===0
          ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucune photo</div>
          : <div>
              {Object.entries(PHOTO_ALBUMS).map(([key, alb]) => alb.items.length === 0 ? null : (
                <div key={key} style={{ marginBottom:18 }}>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:8 }}>
                    <p style={{ fontSize:15, fontWeight:700 }}>{alb.title}</p>
                    <span style={{ fontSize:12, color:'#65676B' }}>{alb.items.length}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
                    {alb.items.map((p, i) => (
                      <SmartImage key={p.id} src={p.thumbURL || p.mediaURL}
                        onClick={() => setPhotoViewer({ album: key, index: i })} minH={110}
                        style={{ aspectRatio:'1', width:'100%', height:'100%', borderRadius:8, objectFit:'cover', cursor:'pointer' }}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        )}`,
  'grille');

/* ── 6) Viewer : voafetra amin'ny album ─────────────────────────────────── */
s = rep(s,
  `      {photoViewer && allPhotos[photoViewer.index] && (() => {
        const cur = allPhotos[photoViewer.index];`,
  `      {photoViewer && albumOf(photoViewer.album)[photoViewer.index] && (() => {
        const album = albumOf(photoViewer.album);
        const cur = album[photoViewer.index];`,
  'viewer-head');

s = rep(s,
  '            galleryUrls={allPhotos.map(p => p.mediaURL)}',
  '            galleryUrls={album.map(p => p.mediaURL)}',
  'viewer-gallery');

s = rep(s,
  '            onIndexChange={(i) => setPhotoViewer({ index: i })}',
  '            onIndexChange={(i) => setPhotoViewer({ album: photoViewer.album, index: i })}',
  'viewer-index');

/* ── 7) Fanamarinana farany ─────────────────────────────────────────────── */
if (s.includes('allPhotos')) {
  throw new Error('FAIL : mbola misy `allPhotos` — tsy tokony hitranga');
}
// 4 = clic couverture + clic avatar + clic grille + onIndexChange
if (countOf(s, 'setPhotoViewer({ album') !== 4) {
  throw new Error('FAIL : nandrasana 4 setPhotoViewer misy album, nahitana ' +
    countOf(s, 'setPhotoViewer({ album'));
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 8 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : src/pages/Profile.jsx → album telo');
