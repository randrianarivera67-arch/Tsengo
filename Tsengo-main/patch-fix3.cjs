const fs = require("fs");
process.chdir(__dirname);
const done = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("⚠️ absent:", path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 1) Notes : requête sans index composite ═══
edit("src/pages/Notes.jsx", s => {
  const old = `    const q = query(collection(db, 'notes'), where('uid', '==', currentUser.uid), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),`;
  const neu = `    // ✅ Pas d'orderBy → évite l'index composite Firestore (sinon la liste reste vide)
    const q = query(collection(db, 'notes'), where('uid', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => setNotes(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
      ),`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Notes : requête sans index (tri côté client)"); }
  return s;
});

// ═══ 2) PostDetail : carte musicale + icône message ═══
edit("src/pages/PostDetail.jsx", s => {
  if (!s.includes("import MusicPostCard")) {
    const m = s.match(/^import .*from '\.\.\/firebase';$/m);
    if (m) { s = s.replace(m[0], m[0] + "\nimport MusicPostCard from '../components/MusicPostCard';"); done.push("PostDetail : import MusicPostCard"); }
  }
  const oldMedia = `              {post.mediaType==='image'?<img src={post.mediaURL} alt=""/>:<video src={post.mediaURL} poster={post.thumbURL || undefined} controls/>}`;
  const newMedia = `              {post.isMusic
                ? <MusicPostCard post={post} height={150}/>
                : post.mediaType==='image'
                  ? <img src={post.mediaURL} alt=""/>
                  : <video src={post.mediaURL} poster={post.thumbURL || undefined} controls/>}`;
  if (s.includes(oldMedia)) { s = s.replace(oldMedia, newMedia); done.push("PostDetail : carte musicale"); }

  const oldBtn = `>💬 Message</button>}`;
  const newBtn = `><HiPaperAirplane size={13} style={{ transform:'rotate(90deg)', display:'inline', marginRight:4 }}/>Message</button>}`;
  if (s.includes(oldBtn)) { s = s.replace(oldBtn, newBtn); done.push("PostDetail : icône message moderne"); }

  if (!/HiPaperAirplane/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n\} from 'react-icons\/hi';)/, ", HiPaperAirplane$1");
    done.push("PostDetail : import HiPaperAirplane");
  }
  return s;
});

// ═══ 3) Messages : compteur non-lus cohérent (chat artiste) ═══
edit("src/pages/Messages.jsx", s => {
  const old = `          const unread2 = msgs2.filter(m => m.fromArtist && !m.readByVisitor).length;`;
  const neu = `          const unread2 = msgs2.filter(m => m.toUid === currentUser.uid && !m.read).length;`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Messages : non-lus chat artiste cohérents"); }

  // marquer lu à l'ouverture (les artist_ chats aussi)
  const oldMark = `        if (unread > 0) {
          const upd = {};
          msgEntries.forEach(([mid, m]) => {
            if (m.toUid === currentUser.uid && !m.read) upd[\`\${mid}/read\`] = true;
          });`;
  if (s.includes(oldMark)) done.push("Messages : marquage lu déjà en place");
  return s;
});

// ═══ 4) ArtistMessages : marquer lu côté visiteur AUSSI via 'read' ═══
edit("src/pages/ArtistMessages.jsx", s => {
  const old = `        if (!isAdmin && m.fromArtist && !m.readByVisitor) upd[\`\${m.id}/readByVisitor\`] = true;`;
  const neu = `        if (!isAdmin && m.fromArtist && !m.readByVisitor) { upd[\`\${m.id}/readByVisitor\`] = true; upd[\`\${m.id}/read\`] = true; }`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ArtistMessages : marque aussi 'read'"); }

  // les messages envoyés par la page portent read:false pour le visiteur
  const oldPush = `      toUid: isAdmin ? activeVisitor : '',`;
  const neu2 = `      toUid: isAdmin ? activeVisitor : '',
      read: false,`;
  if (s.includes(oldPush) && !s.includes("      read: false,\n      fromName")) { s = s.replace(oldPush, neu2); done.push("ArtistMessages : champ read"); }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

let ok = true;
if (!fs.existsSync("src/components/MusicPostCard.jsx")) { console.log("❌ MusicPostCard.jsx manquant"); ok = false; }
const pd = fs.readFileSync("src/pages/PostDetail.jsx", "utf8");
if (!pd.split("from 'react-icons/hi'")[0].includes("HiPaperAirplane")) { console.log("❌ PostDetail : HiPaperAirplane non importé"); ok = false; }
if (done.length < 5) { console.log("❌ Seulement " + done.length + " appliquées"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
