const fs = require("fs");
process.chdir(__dirname);
const done = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("⚠️ absent:", path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 5) Home : texte 2 lignes + "voir plus" ═══════════════
edit("src/pages/Home.jsx", s => {
  if (!s.includes("expandedPosts")) {
    s = s.replace("  const [posts, setPosts]           = useState([]);",
                  "  const [posts, setPosts]           = useState([]);\n  const [expandedPosts, setExpandedPosts] = useState({});\n  const [audienceEditPost, setAudienceEditPost] = useState(null);");
    done.push("Home : states expandedPosts + audienceEditPost");
  }
  const old = `                  style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap', userSelect:'text', WebkitUserSelect:'text', cursor:'text' }}
                >{post.content}</p>`;
  const neu = `                  style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap', userSelect:'text', WebkitUserSelect:'text', cursor:'text',
                    ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}
                >{post.content}</p>
              )}
              {post.content && post.content.length > 90 && (
                <button onClick={e => { e.stopPropagation(); setExpandedPosts(p => ({ ...p, [post.id]: !p[post.id] })); }}
                  style={{ background:'none', border:'none', padding:'2px 0 0', cursor:'pointer', color:'#65676B', fontSize:14, fontWeight:600, fontFamily:'Poppins' }}>
                  {expandedPosts[post.id] ? 'Voir moins' : 'Voir plus'}
                </button>`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Home : texte 2 lignes + Voir plus"); }

  const boostBtn = `{!post.groupId && !post.sharedFrom && <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={17} color="#a855f7"/> Booster</button>}`;
  if (s.includes(boostBtn) && !s.includes("Modifier l'audience")) {
    s = s.replace(boostBtn, boostBtn + `
                        {!post.groupId && <button onClick={() => { setAudienceEditPost(post); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiGlobeAlt size={17} color="#1877F2"/> Modifier l'audience</button>}`);
    done.push("Home : bouton Modifier l'audience");
  }
  if (!s.includes("{audienceEditPost &&")) {
    s = s.replace("      {shareModalPost && <ShareModal", `      {audienceEditPost && (
        <div onClick={() => setAudienceEditPost(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:320, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, overflow:'hidden', fontFamily:'Poppins' }}>
            <p style={{ fontWeight:800, fontSize:16, padding:'16px 20px 8px' }}>Qui peut voir cette publication ?</p>
            {[['public','\u{1F30D} Public'],['friends','\u{1F465} Amis'],['me','\u{1F512} Moi uniquement']].map(([v,l]) => (
              <button key={v} onClick={async () => { try { await updateDoc(doc(db,'posts',audienceEditPost.id), { audience: v }); } catch(e) { alert('Erreur : '+(e?.message||e)); } setAudienceEditPost(null); }}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderTop:'1px solid #F0F2F5', fontFamily:'Poppins' }}>
                <span>{l}</span>
                {(audienceEditPost.audience || 'public') === v && <span style={{ color:'#1877F2', fontWeight:800 }}>\u2713</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {shareModalPost && <ShareModal`);
    done.push("Home : modale audience");
  }
  if (!/HiGlobeAlt/.test(s.split("from 'react-icons/hi'")[0])) {
    s = s.replace(/(\n\} from 'react-icons\/hi';)/, ", HiGlobeAlt$1");
    done.push("Home : import HiGlobeAlt");
  }
  return s;
});

// ═══ 8) Notes : envoi en DOCUMENT (Telegram) + photo ══════
edit("src/pages/Notes.jsx", s => {
  const oldSave = `      const blob = new Blob([editing.body], { type: 'text/plain' });
      const file = new File([blob], \`note_\${Date.now()}.txt\`, { type: 'text/plain' });
      const r = await uploadToTelegram(file);
      const preview = editing.body.trim().slice(0, 140);
      if (editing.id) {
        await updateDoc(doc(db, 'notes', editing.id), {
          title: editing.title.trim() || 'Sans titre', fileURL: r.url, preview, updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          uid: currentUser.uid, title: editing.title.trim() || 'Sans titre',
          fileURL: r.url, preview, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }`;
  const newSave = `      // Le corps part sur Telegram en DOCUMENT (octet-stream), pas en texte brut
      const preview = (editing.body || '').trim().slice(0, 140);
      let fileURL = editing.fileURL || '';
      if ((editing.body || '').trim()) {
        const blob = new Blob([editing.body], { type: 'application/octet-stream' });
        const file = new File([blob], \`note_\${Date.now()}.txt\`, { type: 'application/octet-stream' });
        try { const r = await uploadToTelegram(file); fileURL = r.url; }
        catch (up) { console.warn('Upload note:', up?.message); }
      }
      let photoURL = editing.photoURL || '';
      if (editing.photoFile) {
        try { const rp = await uploadToTelegram(editing.photoFile); photoURL = rp.url; }
        catch (up) { alert('Photo non envoyee : ' + (up?.message || up)); }
      }
      if (editing.id) {
        await updateDoc(doc(db, 'notes', editing.id), {
          title: editing.title.trim() || 'Sans titre', fileURL, preview, photoURL, updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          uid: currentUser.uid, title: editing.title.trim() || 'Sans titre',
          fileURL, preview, photoURL, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }`;
  if (s.includes(oldSave)) { s = s.replace(oldSave, newSave); done.push("Notes : document Telegram + note toujours creee"); }

  const oldOpen = `      const r = await fetch(note.fileURL);
      const text = await r.text();
      setEditing({ id: note.id, title: note.title, body: text });
    } catch {
      setEditing({ id: note.id, title: note.title, body: note.preview || '' });
    }`;
  const newOpen = `      if (!note.fileURL) { setEditing({ id: note.id, title: note.title, body: note.preview || '', photoURL: note.photoURL || '', fileURL: '' }); return; }
      const r = await fetch(note.fileURL);
      const text = await r.text();
      setEditing({ id: note.id, title: note.title, body: text, photoURL: note.photoURL || '', fileURL: note.fileURL });
    } catch {
      setEditing({ id: note.id, title: note.title, body: note.preview || '', photoURL: note.photoURL || '', fileURL: note.fileURL || '' });
    }`;
  if (s.includes(oldOpen)) { s = s.replace(oldOpen, newOpen); done.push("Notes : ouverture robuste"); }

  const oldCard = `          <p style={{ fontSize: 13, color: '#65676B', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.preview}</p>`;
  const newCard = `          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {n.photoURL && <img src={n.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
            <p style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.preview || '(note vide)'}</p>
          </div>`;
  if (s.includes(oldCard)) { s = s.replace(oldCard, newCard); done.push("Notes : carte avec photo"); }

  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

let ok = true;
const h = fs.readFileSync("src/pages/Home.jsx", "utf8");
if (!h.split("from 'react-icons/hi'")[0].includes("HiGlobeAlt")) { console.log("❌ Home : HiGlobeAlt non importe"); ok = false; }
if (done.length < 6) { console.log("❌ Seulement " + done.length + "/7 appliquees"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
