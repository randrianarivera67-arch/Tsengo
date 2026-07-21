const fs = require("fs");
process.chdir(__dirname);
const done = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("⚠️ absent:", path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 1) Home.jsx : carte musicale pour les partages ═══
edit("src/pages/Home.jsx", s => {
  if (!s.includes("import MusicPostCard")) {
    s = s.replace("import ShareModal from '../components/ShareModal';",
                  "import ShareModal from '../components/ShareModal';\nimport MusicPostCard from '../components/MusicPostCard';");
    done.push("Home : import MusicPostCard");
  }
  const old = `                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.mediaType === 'image'
                      ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block' }}/>
                      : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>
                  )}`;
  const neu = `                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.isMusic
                      ? <div style={{ padding:'0 10px 10px' }}><MusicPostCard post={post.sharedFrom} height={115}/></div>
                      : post.sharedFrom.mediaType === 'image'
                        ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block' }}/>
                        : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>
                  )}`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Home : carte musicale (partages)"); }

  // posts musicaux publiés directement (ex: partagés dans le fil) — mediaURL du post
  const oldMedia = `                  {post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }}/> : <FeedVideo`;
  const newMedia = `                  {post.isMusic ? <MusicPostCard post={post} height={140}/> : post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }}/> : <FeedVideo`;
  if (s.includes(oldMedia)) { s = s.replace(oldMedia, newMedia); done.push("Home : carte musicale (post direct)"); }

  // Booster masqué pour les publications de groupe / partages
  const oldBoost = `<button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={17} color="#a855f7"/> Booster</button>`;
  const newBoost = `{!post.groupId && !post.sharedFrom && <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={17} color="#a855f7"/> Booster</button>}`;
  if (s.includes(oldBoost)) { s = s.replace(oldBoost, newBoost); done.push("Home : Booster masqué (groupe/partage)"); }
  return s;
});

// ═══ 2) Saved.jsx : miniature musicale ═══
edit("src/pages/Saved.jsx", s => {
  const old = `            {p.mediaURL ? (
              p.mediaType === 'video'
                ? <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#000' }} />
                : <img src={p.mediaURL} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (`;
  const neu = `            {p.mediaURL ? (
              p.isMusic
                ? <div style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0, overflow: 'hidden', position: 'relative', background: p.thumbURL ? \`url(\${p.thumbURL}) center/cover\` : 'linear-gradient(145deg,#FF6FA5,#0c0c12)' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, background: p.thumbURL ? 'rgba(0,0,0,.45)' : 'transparent' }}>
                      {[9, 17, 12, 24, 15, 28, 13, 20, 10].map((h, i) => <div key={i} style={{ width: 2.5, height: h, borderRadius: 2, background: i < 5 ? '#FF6FA5' : '#FF2D8D' }} />)}
                    </div>
                  </div>
                : p.mediaType === 'video'
                  ? <video src={p.mediaURL} muted playsInline preload="metadata" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#000' }} />
                  : <img src={p.mediaURL} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Saved : miniature musicale"); }

  const oldTxt = `                {p.content || (p.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo')}`;
  const newTxt = `                {p.isMusic ? (p.songTitle || 'Musique') : (p.content || (p.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo'))}`;
  if (s.includes(oldTxt)) { s = s.replace(oldTxt, newTxt); done.push("Saved : titre musical"); }

  const oldSub = `                {p.mediaType === 'video' ? 'Vidéo enregistrée' : 'Publication enregistrée'}`;
  const newSub = `                {p.isMusic ? (p.mediaType === 'video' ? 'Clip enregistré' : 'Musique enregistrée') : p.mediaType === 'video' ? 'Vidéo enregistrée' : 'Publication enregistrée'}`;
  if (s.includes(oldSub)) { s = s.replace(oldSub, newSub); done.push("Saved : sous-titre musical"); }
  return s;
});

// ═══ 3) ShareModal : recherche de groupe ═══
edit("src/components/ShareModal.jsx", s => {
  if (!s.includes("groupQ")) {
    s = s.replace("  const [posting, setPosting] = useState(false);",
                  "  const [posting, setPosting] = useState(false);\n  const [groupQ, setGroupQ] = useState('');");
    done.push("ShareModal : state groupQ");
  }
  if (!s.includes("HiSearch")) {
    s = s.replace("import { HiX, HiUser, HiUserGroup, HiLink, HiChevronRight } from 'react-icons/hi';",
                  "import { HiX, HiUser, HiUserGroup, HiLink, HiChevronRight, HiSearch } from 'react-icons/hi';");
    done.push("ShareModal : import HiSearch");
  }
  // insérer la barre juste avant la liste des groupes
  const anchorG = `            {groups.length === 0 && (
              <p style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: '20px 0' }}>`;
  if (s.includes(anchorG) && !s.includes("Rechercher un groupe")) {
    s = s.replace(anchorG, `            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 20, padding: '9px 13px' }}>
                <HiSearch size={16} color="#65676B" />
                <input value={groupQ} onChange={e => setGroupQ(e.target.value)} placeholder="Rechercher un groupe…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, background: 'transparent', color: '#050505', minWidth: 0 }} />
                {groupQ && <button onClick={() => setGroupQ('')} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 21, height: 21, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B', flexShrink: 0 }}><HiX size={12} /></button>}
              </div>
            </div>
` + anchorG);
    done.push("ShareModal : barre de recherche groupe");
  }
  // filtrer la liste
  if (s.includes("{groups.map(") && !s.includes("groups.filter(")) {
    s = s.replace("{groups.map(", "{groups.filter(g => !groupQ.trim() || (g.name || '').toLowerCase().includes(groupQ.trim().toLowerCase())).map(");
    done.push("ShareModal : filtre groupes");
  }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

// ── Vérifications ──
let ok = true;
if (!fs.existsSync("src/components/MusicPostCard.jsx")) { console.log("❌ MusicPostCard.jsx manquant"); ok = false; }
const sm = fs.readFileSync("src/components/ShareModal.jsx", "utf8");
if (!sm.split("from 'react-icons/hi'")[0].includes("HiSearch")) { console.log("❌ ShareModal : HiSearch non importé"); ok = false; }
if (done.length < 8) { console.log("❌ Seulement " + done.length + "/10 appliquées"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
