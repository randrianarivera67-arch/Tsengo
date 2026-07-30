const fs = require("fs");
process.chdir(__dirname);
const done = [];
const miss = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { miss.push(path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 1) Profile.jsx : ne pas afficher les posts de page artiste ═══
edit("src/pages/Profile.jsx", s => {
  const old = "    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data()}))));";
  const neu = "    // ✅ Les publications d'une page artiste restent sur la page (pas sur le profil perso)\n    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data()})).filter(p => !p.artistId && !p.isMusic)));";
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Profile : posts de page artiste masqués"); }
  return s;
});

// ═══ 2) ShareModal : partager EN TANT QUE page artiste ═══
edit("src/components/ShareModal.jsx", s => {
  if (!s.includes("asPage")) {
    s = s.replace("export default function ShareModal({ post, onClose }) {",
                  "export default function ShareModal({ post, onClose, asPage = null }) {");
    done.push("ShareModal : prop asPage");
  }
  const old = `      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || '',
        authorIsVip: userProfile.isVip || false,
        content: caption.trim().slice(0, 2000),
        mediaURL: '', mediaType: '',`;
  const neu = `      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid,
        authorName: asPage ? asPage.name : userProfile.fullName,
        authorUsername: asPage ? '' : userProfile.username,
        authorPhoto: asPage ? (asPage.photoURL || '') : (userProfile.photoURL || ''),
        authorIsVip: asPage ? false : (userProfile.isVip || false),
        ...(asPage ? { artistId: asPage.id, artistName: asPage.name, artistPhoto: asPage.photoURL || '', postedByArtist: true } : {}),
        content: caption.trim().slice(0, 2000),
        mediaURL: '', mediaType: '',`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ShareModal : publie au nom de la page"); }

  // snapshot enrichi (onde + pochette + titre)
  const oldSnap = `      mediaType: post.mediaType || '',
      groupName: post.groupName || '',
    };`;
  const newSnap = `      mediaType: post.mediaType || '',
      thumbURL: post.thumbURL || '',
      groupName: post.groupName || '',
      isMusic: post.isMusic || false,
      artistId: post.artistId || '',
      artistName: post.artistName || '',
      artistPhoto: post.artistPhoto || '',
      songTitle: post.songTitle || '',
      genre: post.genre || '',
    };`;
  if (s.includes(oldSnap)) { s = s.replace(oldSnap, newSnap); done.push("ShareModal : snapshot musical complet"); }
  return s;
});

// ═══ 3) ArtistDetail : partage AU NOM de la page ═══
edit("src/pages/ArtistDetail.jsx", s => {
  const old = "{sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}";
  const neu = "{sharePost && <ShareModal post={sharePost} asPage={artist} onClose={() => setSharePost(null)} />}";
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ArtistDetail : partage au nom de la page"); }
  return s;
});

// ═══ 4) GroupPage : carte musicale (onde + pochette) ═══
edit("src/pages/GroupPage.jsx", s => {
  if (!s.includes("import MusicPostCard")) {
    const m = s.match(/^import .*from '\.\.\/firebase';$/m);
    if (m) { s = s.replace(m[0], m[0] + "\nimport MusicPostCard from '../components/MusicPostCard';"); done.push("GroupPage : import MusicPostCard"); }
  }
  const old = `              {post.mediaURL && (
                <div style={{ marginTop: 8, marginLeft: -16, marginRight: -16 }}>
                  {post.mediaType === 'image'
                    ? <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
                    : <video src={post.mediaURL} controls playsInline poster={post.thumbURL || undefined} preload={dataSaver ? 'none' : 'metadata'} style={{ width: '100%', maxHeight: 520, display: 'block', background: '#000' }} />}
                </div>
              )}`;
  const neu = `              {post.mediaURL && (
                <div style={{ marginTop: 8, marginLeft: -16, marginRight: -16 }}>
                  {post.isMusic
                    ? <MusicPostCard post={post} />
                    : post.mediaType === 'image'
                      ? <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
                      : <video src={post.mediaURL} controls playsInline poster={post.thumbURL || undefined} preload={dataSaver ? 'none' : 'metadata'} style={{ width: '100%', maxHeight: 520, display: 'block', background: '#000' }} />}
                </div>
              )}`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("GroupPage : carte musicale"); }

  // partages (sharedFrom) musicaux
  const oldSF = `                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.mediaType === 'image'
                      ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                      : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />
                  )}`;
  const newSF = `                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.isMusic
                      ? <div style={{ padding: '0 10px 10px' }}><MusicPostCard post={post.sharedFrom} height={110} /></div>
                      : post.sharedFrom.mediaType === 'image'
                        ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                        : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />
                  )}`;
  if (s.includes(oldSF)) { s = s.replace(oldSF, newSF); done.push("GroupPage : partage musical"); }
  return s;
});

// ═══ 5) Search.jsx : coller un lien → navigation ═══
edit("src/pages/Search.jsx", s => {
  if (!s.includes("parseAppLink")) {
    s = s.replace("import { useAuth } from '../context/AuthContext';",
                  "import { useAuth } from '../context/AuthContext';\nimport { parseAppLink } from '../utils/appLink';");
    done.push("Search : import parseAppLink");
  }
  const old = "onChange={e => { setTerm(e.target.value); if (submitted) setSubmitted(''); }}";
  const neu = "onChange={e => { const l = parseAppLink(e.target.value); if (l) { setTerm(''); navigate(l); return; } setTerm(e.target.value); if (submitted) setSubmitted(''); }}";
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Search : lien collé → navigation"); }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (miss.length) { console.log("\n⚠️ Fichiers absents:"); miss.forEach(m => console.log("   • " + m)); }

// ── Vérifications ──
let ok = true;
if (!fs.existsSync("src/components/MusicPostCard.jsx")) { console.log("❌ MusicPostCard.jsx manquant — copie-le d'abord"); ok = false; }
if (done.length < 7) { console.log("❌ Seulement " + done.length + "/9 modifications appliquées"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
