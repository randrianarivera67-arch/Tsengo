const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistDetail.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// ─── 1) State recherche groupes ───────────────────────────
if (!S.includes("const [groupQ")) {
  S = S.replace("  const [songGroupSel, setSongGroupSel] = useState({});",
                "  const [songGroupSel, setSongGroupSel] = useState({});\n  const [groupQ, setGroupQ] = useState('');   // recherche de groupe");
  done.push("state groupQ");
}

// ─── 2) Liste des groupes : recherche + compteur ──────────
const old = `        {/* Liste des groupes (si "dans groupes") */}
        {publishTarget === 'groups' && (
          <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
            {myGroups.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe accessible.</p>}
            {myGroups.map(g => (
              <button key={g.id} onClick={() => setSongGroupSel(p => ({ ...p, [g.id]: !p[g.id] }))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', borderTop:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, color:'#050505' }}>
                <span style={{ width:20, height:20, borderRadius:5, border:'2px solid #1877F2', background: songGroupSel[g.id] ? '#1877F2' : 'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13 }}>{songGroupSel[g.id] && '✓'}</span>
                {g.name}
              </button>
            ))}
          </div>
        )}`;

const neu = `        {/* Liste des groupes (si "dans groupes") — avec recherche */}
        {publishTarget === 'groups' && (() => {
          const lowG = groupQ.trim().toLowerCase();
          const shown = myGroups.filter(g => !lowG || (g.name || '').toLowerCase().includes(lowG));
          const nSel = Object.values(songGroupSel).filter(Boolean).length;
          return (
          <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px 6px', background:'#FAFBFC' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#65676B' }}>Groupes ({myGroups.length})</span>
              {nSel > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#fff', background:'#1877F2', borderRadius:10, padding:'2px 8px' }}>{nSel} sélectionné{nSel > 1 ? 's' : ''}</span>}
            </div>

            <div style={{ padding:'0 12px 10px', background:'#FAFBFC' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E4E6EB', borderRadius:18, padding:'7px 12px' }}>
                <HiSearch size={15} color="#65676B"/>
                <input value={groupQ} onChange={e => setGroupQ(e.target.value)} placeholder="Rechercher un groupe…"
                  style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'transparent', color:'#050505', minWidth:0, fontFamily:'Poppins' }} />
                {groupQ && <button onClick={() => setGroupQ('')} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#65676B', flexShrink:0 }}><HiX size={11}/></button>}
              </div>
            </div>

            <div style={{ maxHeight:230, overflowY:'auto' }}>
              {myGroups.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe accessible.</p>}
              {myGroups.length > 0 && shown.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe trouvé.</p>}
              {shown.map(g => (
                <button key={g.id} onClick={() => setSongGroupSel(p => ({ ...p, [g.id]: !p[g.id] }))}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background: songGroupSel[g.id] ? 'rgba(24,119,242,.06)' : 'none', border:'none', borderTop:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, color:'#050505' }}>
                  <span style={{ width:20, height:20, borderRadius:5, border:'2px solid #1877F2', background: songGroupSel[g.id] ? '#1877F2' : 'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, flexShrink:0 }}>{songGroupSel[g.id] && '✓'}</span>
                  <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</span>
                  {typeof g.members !== 'undefined' && <span style={{ fontSize:11, color:'#8A8D91', flexShrink:0 }}>{(g.members || []).length} membres</span>}
                </button>
              ))}
            </div>
          </div>
          );
        })()}`;

if (S.includes(old)) { S = S.replace(old, neu); done.push("liste groupes : recherche + compteur"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

// ── Vérifications ──
const head = S.split("from 'react-icons/hi'")[0];
let ok = true;
for (const n of ["HiSearch", "HiX"]) {
  if (!head.includes(n)) { console.log("❌ " + n + " NON importé"); ok = false; }
}
if (done.length < 2) { console.log("❌ Certaines ancres introuvables (" + done.length + "/2)"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
