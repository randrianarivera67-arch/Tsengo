const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistDetail.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// ─── 1) Imports : HiSearch, HiLink (robuste) ──────────────
{
  const impRe = /(\n} from 'react-icons\/hi';)/;
  let add = [];
  if (!/HiSearch\s*[,\n]/.test(S.split("from 'react-icons/hi'")[0])) add.push("HiSearch");
  if (!/HiLink\s*[,\n]/.test(S.split("from 'react-icons/hi'")[0])) add.push("HiLink");
  if (add.length && impRe.test(S)) {
    S = S.replace(impRe, ", " + add.join(", ") + "$1");
    done.push("imports " + add.join(" + "));
  }
}

// ─── 2) State recherche titres ────────────────────────────
if (!S.includes("const [trackQ")) {
  S = S.replace("  const [trackMenu, setTrackMenu] = useState(null);",
                "  const [trackMenu, setTrackMenu] = useState(null);\n  const [trackQ, setTrackQ] = useState('');   // recherche de chansons dans la page");
  done.push("state trackQ");
}

// ─── 3) Fonction copyLink ─────────────────────────────────
if (!S.includes("function copyPageLink")) {
  S = S.replace("  async function reportArtist() {", `  function copyPageLink() {
    setMenuOpen(false);
    const url = \`\${window.location.origin}/artists/\${artistId}\`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => alert('Lien copié !'), () => alert(url));
    else { const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); alert('Lien copié !'); }
  }

  async function reportArtist() {`);
  done.push("fonction copyPageLink");
}

// ─── 4) Menu header : Copier le lien (visiteur ET admin) ──
const oldVisitorMenu = `                </>) : (<>
                  <button onClick={reportArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={18} color="#F2B300"/> Signaler aux admins</button>`;
const newVisitorMenu = `                  <button onClick={copyPageLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderTop:'1px solid #F0F2F5' }}><HiLink size={18} color="#12A48D"/> Copier le lien</button>
                </>) : (<>
                  <button onClick={copyPageLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLink size={18} color="#12A48D"/> Copier le lien</button>
                  <button onClick={reportArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={18} color="#F2B300"/> Signaler aux admins</button>`;
if (S.includes(oldVisitorMenu)) { S = S.replace(oldVisitorMenu, newVisitorMenu); done.push("menu : Copier le lien (admin + visiteur)"); }

// ─── 5) Liste en 2 colonnes + recherche ───────────────────
const oldBlockStart = `      {/* ── Liste des titres — style Spotify ─────────────────── */}
      {tracks.length > 0 && (
        <div className="card" style={{ marginTop:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px 8px' }}>
            <NeonMic color="#FF2D8D" size={20}/>
            <h3 style={{ fontWeight:800, fontSize:16 }}>Titres</h3>
            <span style={{ fontSize:12, color:'#65676B' }}>{tracks.length}</span>
          </div>
          {tracks.map((t, i) => {`;
const newBlockStart = `      {/* ── Titres : 2 colonnes (audio | clips) + recherche ─── */}
      {tracks.length > 0 && (() => {
        const lowQ = trackQ.trim().toLowerCase();
        const match = t => !lowQ || (t.songTitle || '').toLowerCase().includes(lowQ) || (t.content || '').toLowerCase().includes(lowQ) || (t.genre || '').toLowerCase().includes(lowQ) || (t.songAuthorComposer || '').toLowerCase().includes(lowQ);
        const audios = tracks.filter(t => t.mediaType !== 'video' && match(t));
        const videos = tracks.filter(t => t.mediaType === 'video' && match(t));

        const Row = (t, i) => {
          const isCur = currentTrack?.id === t.id;
          return (
            <div key={t.id} onClick={() => playTrack(t)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', cursor:'pointer', background: isCur ? 'rgba(255,45,141,.08)' : 'transparent', borderTop: i>0?'1px solid #F0F2F5':'none' }}>
              <div style={{ width:38, height:38, borderRadius:8, background: t.thumbURL ? \`url(\${t.thumbURL}) center/cover\` : \`linear-gradient(145deg, \${GENRE_COLORS[t.genre]||'#FF2D8D'}, #050505)\`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                {!t.thumbURL && (t.mediaType === 'video' ? <HiVideoCamera color="white" size={15}/> : <NeonMic color="white" size={14}/>)}
                {isCur && playing && <span style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#FF2D8D', fontSize:13 }}>▶</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, color: isCur ? '#FF2D8D' : '#050505', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.songTitle || t.content || 'Sans titre'}</p>
                <p style={{ fontSize:11, color:'#65676B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  <span style={{ color: GENRE_COLORS[t.genre]||'#FF2D8D' }}>{t.genre}</span>
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); setTrackMenu(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0, padding:2 }}><HiDotsVertical size={17}/></button>
            </div>
          );
        };

        return (
        <div className="card" style={{ marginTop:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px 8px' }}>
            <NeonMic color="#FF2D8D" size={20}/>
            <h3 style={{ fontWeight:800, fontSize:16 }}>Titres</h3>
            <span style={{ fontSize:12, color:'#65676B' }}>{audios.length + videos.length}</span>
          </div>

          <div style={{ padding:'0 12px 10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F0F2F5', borderRadius:20, padding:'8px 13px' }}>
              <HiSearch size={16} color="#65676B"/>
              <input value={trackQ} onChange={e => setTrackQ(e.target.value)} placeholder="Rechercher une chanson…"
                style={{ flex:1, border:'none', outline:'none', fontSize:13.5, background:'transparent', color:'#050505', minWidth:0 }} />
              {trackQ && <button onClick={() => setTrackQ('')} style={{ background:'#fff', border:'none', borderRadius:'50%', width:21, height:21, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#65676B', flexShrink:0 }}><HiX size={12}/></button>}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
            <div style={{ borderRight:'1px solid #F0F2F5' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#FAFBFC' }}>
                <HiMusicNote size={14} color="#FF2D8D"/>
                <span style={{ fontSize:12, fontWeight:800, color:'#65676B' }}>Audio</span>
                <span style={{ fontSize:11, color:'#8A8D91' }}>{audios.length}</span>
              </div>
              {audios.length === 0
                ? <p style={{ fontSize:12, color:'#8A8D91', textAlign:'center', padding:'18px 8px' }}>Aucun audio</p>
                : audios.map((t, i) => Row(t, i))}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#FAFBFC' }}>
                <HiVideoCamera size={14} color="#1877F2"/>
                <span style={{ fontSize:12, fontWeight:800, color:'#65676B' }}>Clips</span>
                <span style={{ fontSize:11, color:'#8A8D91' }}>{videos.length}</span>
              </div>
              {videos.length === 0
                ? <p style={{ fontSize:12, color:'#8A8D91', textAlign:'center', padding:'18px 8px' }}>Aucun clip</p>
                : videos.map((t, i) => Row(t, i))}
            </div>
          </div>
        </div>
        );
      })()}

      {false && tracks.map((t, i) => {`;
if (S.includes(oldBlockStart)) { S = S.replace(oldBlockStart, newBlockStart); done.push("liste 2 colonnes + recherche"); }

// neutraliser l'ancien rendu (le bloc mort ci-dessus doit se fermer proprement)
const oldTail = `                <button onClick={e => { e.stopPropagation(); setTrackMenu(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0 }}><HiDotsVertical size={18}/></button>
              </div>
            );
          })}
        </div>
      )}`;
const newTail = `                <button onClick={e => { e.stopPropagation(); setTrackMenu(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0 }}><HiDotsVertical size={18}/></button>
              </div>
            );
          })}`;
if (S.includes(oldTail)) { S = S.replace(oldTail, newTail); done.push("ancien rendu neutralisé"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

// Vérification stricte des imports
const head = S.split("from 'react-icons/hi'")[0];
const okSearch = /HiSearch/.test(head), okLink = /HiLink/.test(head);
console.log("\nVerif imports -> HiSearch:", okSearch ? "OK" : "MANQUANT", "| HiLink:", okLink ? "OK" : "MANQUANT");
if (!okSearch || !okLink) { console.log("❌ ARRET : imports manquants, ne pas builder. Previens-moi."); process.exit(1); }
console.log("✅ Imports verifies.");
