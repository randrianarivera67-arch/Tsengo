const fs = require("fs");
process.chdir(__dirname);
const done = [];
const fail = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { fail.push("fichier absent: " + path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 1) Home.jsx : "Partager" dans le menu des cartes audio ═══
edit("src/pages/Home.jsx", s => {
  // a) MusicCard reçoit onShare
  s = s.replace("function MusicCard({ track, index, playing, onToggle, onArtist, onSave, onBlock, isSaved, isBlocked, onFollow, onMessage, isFollowing }) {",
                "function MusicCard({ track, index, playing, onToggle, onArtist, onSave, onBlock, isSaved, isBlocked, onFollow, onMessage, isFollowing, onShare }) {");
  // b) élément de menu Partager (après Télécharger)
  const dl = `<Item icon={<HiDownload size={20} color="#12A48D" />} label="Télécharger" onClick={() => { setMenuOpen(false); downloadMedia(track.mediaURL, 'audio', track.songTitle || 'audio'); }} />`;
  if (s.includes(dl) && !s.includes('label="Partager"')) {
    s = s.replace(dl, dl + `\n            <Item icon={<HiShare size={20} color="#7A2DFF" />} label="Partager" onClick={() => { setMenuOpen(false); onShare?.(track); }} />`);
    done.push("Home : item Partager");
  }
  // c) MusicRow transmet onShare
  s = s.replace("function MusicRow({ tracks, playingId, onToggle, onArtist, onSave, onBlock, savedIds = [], blockedIds = [], onFollow, onMessage, followedArtists = [] }) {",
                "function MusicRow({ tracks, playingId, onToggle, onArtist, onSave, onBlock, savedIds = [], blockedIds = [], onFollow, onMessage, followedArtists = [], onShare }) {");
  s = s.replace("onFollow={onFollow} onMessage={onMessage} isFollowing={followedArtists.includes(t.artistId)} />",
                "onFollow={onFollow} onMessage={onMessage} isFollowing={followedArtists.includes(t.artistId)} onShare={onShare} />");
  // d) passer depuis le fil
  const rowProp = "              onFollow={toggleFollowArtist}";
  if (s.includes(rowProp) && !s.includes("onShare={setShareModalPost}")) {
    s = s.replace(rowProp, "              onShare={setShareModalPost}\n" + rowProp);
    done.push("Home : onShare transmis");
  }
  // e) import HiShare
  if (!/HiShare/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n\} from 'react-icons\/hi';)/, ", HiShare$1");
    done.push("Home : import HiShare");
  }
  return s;
});

// ═══ 2) ArtistDetail.jsx : "Partager" dans le menu des titres ═══
edit("src/pages/ArtistDetail.jsx", s => {
  if (!s.includes("import ShareModal")) {
    s = s.replace("import FollowListModal from '../components/FollowListModal';",
                  "import FollowListModal from '../components/FollowListModal';\nimport ShareModal from '../components/ShareModal';");
    done.push("ArtistDetail : import ShareModal");
  }
  if (!s.includes("sharePost")) {
    s = s.replace("  const [trackQ, setTrackQ] = useState('');",
                  "  const [trackQ, setTrackQ] = useState('');\n  const [sharePost, setSharePost] = useState(null);");
    done.push("ArtistDetail : state sharePost");
  }
  // item Partager (admin) — après Booster
  const boost = `<button onClick={() => { setTrackMenu(null); navigate('/boost'); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLightningBolt size={19} color="#a855f7"/> Booster</button>`;
  if (s.includes(boost) && !s.includes("Partager</button>")) {
    s = s.replace(boost, boost + `\n              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setSharePost(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiShare size={19} color="#7A2DFF"/> Partager</button>`);
    done.push("ArtistDetail : Partager (admin)");
  }
  // item Partager (visiteur) — après Télécharger visiteur
  const dlV = `<button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => reportTrack(trackMenu)}`;
  const dlVnew = `<button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setSharePost(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiShare size={19} color="#7A2DFF"/> Partager</button>
              <button onClick={() => reportTrack(trackMenu)}`;
  if (s.includes(dlV)) { s = s.replace(dlV, dlVnew); done.push("ArtistDetail : Partager (visiteur)"); }

  // rendre la modale
  if (!s.includes("{sharePost && <ShareModal")) {
    s = s.replace("      {trackMenu && (", "      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}\n\n      {trackMenu && (");
    done.push("ArtistDetail : modale ShareModal");
  }
  // import HiShare
  if (!/HiShare/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n\} from 'react-icons\/hi';)/, ", HiShare$1");
    done.push("ArtistDetail : import HiShare");
  }
  return s;
});

// ═══ 3) Profile.jsx : "Copier le lien" dans les 2 menus ═══
edit("src/pages/Profile.jsx", s => {
  if (!s.includes("function copyProfileLink")) {
    const anchor = "  async function reportUser() {";
    if (s.includes(anchor)) {
      s = s.replace(anchor, `  function copyProfileLink() {
    setProfMenu(false); setOtherMenu(false);
    const url = \`\${window.location.origin}/profile/\${targetUid}\`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => alert('Lien copié !'), () => alert(url));
    else { const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); alert('Lien copié !'); }
  }

  async function reportUser() {`);
      done.push("Profile : fonction copyProfileLink");
    }
  }
  // menu propre profil (après Souvenirs)
  const souv = `<button onClick={openSouvenirs} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505' }}><NeonClock/> Souvenirs</button>`;
  if (s.includes(souv) && !s.includes("Copier le lien")) {
    s = s.replace(souv, souv.replace("color:'#050505' }}", "color:'#050505', borderBottom:'1px solid #F0F2F5' }}") +
      `\n                      <button onClick={copyProfileLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505' }}><HiLink size={16} color="#12A48D"/> Copier le lien</button>`);
    done.push("Profile : Copier le lien (mon profil)");
  }
  // menu autre profil (avant Signaler)
  const rep = `<button onClick={reportUser} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={16} color="#F2B300"/> Signaler à l'admin</button>`;
  if (s.includes(rep)) {
    s = s.replace(rep, `<button onClick={copyProfileLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLink size={16} color="#12A48D"/> Copier le lien</button>\n                        ` + rep);
    done.push("Profile : Copier le lien (autre profil)");
  }
  // import HiLink
  if (!/HiLink/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n\} from 'react-icons\/hi';)/, ", HiLink$1");
    done.push("Profile : import HiLink");
  }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (fail.length) { fail.forEach(f => console.log("⚠️ " + f)); }

// ── Vérification stricte des imports ──
let ok = true;
const checks = [
  ["src/pages/Home.jsx", "HiShare"],
  ["src/pages/ArtistDetail.jsx", "HiShare"],
  ["src/pages/Profile.jsx", "HiLink"],
];
for (const [p, needle] of checks) {
  if (!fs.existsSync(p)) continue;
  const head = fs.readFileSync(p, "utf8").split("from 'react-icons/hi'")[0];
  if (!head.includes(needle)) { console.log("❌ " + p + " : " + needle + " NON importé"); ok = false; }
}
console.log(ok ? "\n✅ Imports verifies — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
