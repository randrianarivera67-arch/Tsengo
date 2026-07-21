const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistDetail.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// ─── 1) Imports ───────────────────────────────────────────
if (!S.includes("HiCog")) {
  S = S.replace(
    "  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical,\n  HiMusicNote, HiVideoCamera, HiPhotograph\n} from 'react-icons/hi';",
    "  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical,\n  HiMusicNote, HiVideoCamera, HiPhotograph, HiCog, HiBan, HiFlag,\n  HiInformationCircle, HiDownload, HiLightningBolt\n} from 'react-icons/hi';"
  );
  done.push("imports icônes");
}
if (!S.includes("downloadMedia")) {
  S = S.replace("import FollowListModal from '../components/FollowListModal';",
                "import FollowListModal from '../components/FollowListModal';\nimport { downloadMedia } from '../utils/download';");
  done.push("import downloadMedia");
}
// userProfile nécessaire pour reportedByName
if (S.includes("const { currentUser } = useAuth();")) {
  S = S.replace("const { currentUser } = useAuth();", "const { currentUser, userProfile } = useAuth();");
  done.push("useAuth : userProfile");
}

// ─── 2) State menu piste ──────────────────────────────────
if (!S.includes("trackMenu")) {
  S = S.replace("  const [trackInfo, setTrackInfo] = useState(null);",
                "  const [trackInfo, setTrackInfo] = useState(null);\n  const [trackMenu, setTrackMenu] = useState(null);   // piste dont le menu est ouvert");
  done.push("state trackMenu");
}

// ─── 3) Fonctions signaler / bloquer / supprimer piste ────
if (!S.includes("function reportArtist")) {
  S = S.replace("  async function deleteArtist() {", `  async function reportArtist() {
    setMenuOpen(false);
    if (!window.confirm('Signaler cette page aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'artist', targetId: artistId, targetUid: artist.createdBy || '', targetAuthor: artist.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function blockArtist() {
    setMenuOpen(false);
    if (!window.confirm(\`Bloquer la page "\${artist.name}" ?\`)) return;
    try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: arrayUnion(artistId) }); alert('Page bloquée.'); navigate('/artists'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function reportTrack(t) {
    setTrackMenu(null);
    if (!window.confirm('Signaler ce contenu aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post', targetId: t.id, targetUid: t.uid || '', targetAuthor: artist.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteTrack(t) {
    setTrackMenu(null);
    if (!window.confirm(\`Supprimer "\${t.songTitle || 'ce titre'}" ?\`)) return;
    try { await deleteDoc(doc(db, 'posts', t.id)); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteArtist() {`);
  done.push("fonctions report/block/deleteTrack");
}

// ─── 4) Header : gear (admin) vs 3 points (visiteur) ──────
const oldHeaderBtn = `<button onClick={() => setMenuOpen(p=>!p)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><HiDotsVertical size={20}/></button>`;
const newHeaderBtn = `<button onClick={() => setMenuOpen(p=>!p)} title={isAdmin ? 'Paramètres' : 'Options'} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#050505' }}>{isAdmin ? <HiCog size={21}/> : <HiDotsVertical size={20}/>}</button>`;
if (S.includes(oldHeaderBtn)) { S = S.replace(oldHeaderBtn, newHeaderBtn); done.push("header : icône paramètres (admin)"); }

// ─── 5) Menu header : ajout options visiteur ──────────────
const oldMenuItems = `                {isAdmin && <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#1877F2', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={16}/> Modifier le canal</button>}
                {isAdmin && <button onClick={() => { setMenuOpen(false); deleteArtist(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#FF2D8D' }}><HiTrash size={16}/> Supprimer le canal</button>}`;
const newMenuItems = `                {isAdmin ? (<>
                  <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={18} color="#1877F2"/> Modifier la page</button>
                  <button onClick={() => { setMenuOpen(false); deleteArtist(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={18}/> Supprimer la page</button>
                </>) : (<>
                  <button onClick={reportArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={18} color="#F2B300"/> Signaler aux admins</button>
                  <button onClick={blockArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiBan size={18}/> Bloquer cette page</button>
                </>)}`;
if (S.includes(oldMenuItems)) { S = S.replace(oldMenuItems, newMenuItems); done.push("menu header : admin / visiteur"); }

// ─── 6) Bouton 3 points d'une piste → ouvre le menu ───────
const oldTrackBtn = `<button onClick={e => { e.stopPropagation(); setTrackInfo(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0 }}><HiDotsVertical size={18}/></button>`;
const newTrackBtn = `<button onClick={e => { e.stopPropagation(); setTrackMenu(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0 }}><HiDotsVertical size={18}/></button>`;
if (S.includes(oldTrackBtn)) { S = S.replace(oldTrackBtn, newTrackBtn); done.push("bouton piste → menu"); }

// ─── 7) Modale menu piste (avant {trackInfo && ( ) ────────
const anchorInfo = `      {trackInfo && (`;
const menuModal = `      {trackMenu && (
        <div onClick={() => setTrackMenu(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, overflow:'hidden' }}>
            {isAdmin ? (<>
              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setTrackInfo(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={19} color="#1877F2"/> Modifier</button>
              <button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => { setTrackMenu(null); navigate('/boost'); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLightningBolt size={19} color="#a855f7"/> Booster</button>
              <button onClick={() => deleteTrack(trackMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={19}/> Supprimer</button>
            </>) : (<>
              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setTrackInfo(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiInformationCircle size={19} color="#1877F2"/> Informations</button>
              <button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => reportTrack(trackMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiFlag size={19}/> Signaler aux admins</button>
            </>)}
          </div>
        </div>
      )}

      {trackInfo && (`;
if (S.includes(anchorInfo)) { S = S.replace(anchorInfo, menuModal); done.push("modale menu piste (admin / visiteur)"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
