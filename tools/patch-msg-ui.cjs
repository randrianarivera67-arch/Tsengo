const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistMessages.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// ─── 1) Import HiSearch ───────────────────────────────────
if (!S.includes("HiSearch")) {
  S = S.replace("HiCollection, HiX }", "HiCollection, HiX, HiSearch }");
  if (S.includes("HiSearch")) done.push("import HiSearch");
}

// ─── 2) State recherche ───────────────────────────────────
if (!S.includes("const [convQ")) {
  S = S.replace("  const [reactFor, setReactFor] = useState(null);",
                "  const [reactFor, setReactFor] = useState(null);\n  const [convQ, setConvQ] = useState('');   // recherche de personnes");
  done.push("state convQ");
}

// ─── 3) Barre de recherche + filtre dans la liste admin ───
const oldList = `        {convs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Aucun message pour le moment</div>}
        {convs.map(c => (`;
const newList = `        <div style={{ padding: '10px 12px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 22, padding: '9px 14px' }}>
            <HiSearch size={17} color="#65676B" />
            <input value={convQ} onChange={e => setConvQ(e.target.value)} placeholder="Rechercher une personne…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#050505', minWidth: 0 }} />
            {convQ && <button onClick={() => setConvQ('')} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B', flexShrink: 0 }}><HiX size={13} /></button>}
          </div>
        </div>
        {convs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Aucun message pour le moment</div>}
        {convs.filter(c => !convQ.trim() || (c.meta.visitorName || '').toLowerCase().includes(convQ.trim().toLowerCase())).map(c => (`;
if (S.includes(oldList)) { S = S.replace(oldList, newList); done.push("barre de recherche personnes"); }

// ─── 4) Réactions : au-dessus du texte (avant la bulle) ───
const oldReact = `                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: -8, marginLeft: mine ? 0 : 8, marginRight: mine ? 8 : 0, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <span style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 12, padding: '1px 6px', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,.12)' }}>
                      {[...new Set(Object.values(m.reactions))].join(' ')}
                      {Object.keys(m.reactions).length > 1 && <span style={{ fontSize: 10.5, color: '#65676B', marginLeft: 3 }}>{Object.keys(m.reactions).length}</span>}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: '#65676B', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingInline: 4 }}>`;
const newReact = `                <div style={{ fontSize: 10.5, color: '#65676B', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingInline: 4 }}>`;
if (S.includes(oldReact)) { S = S.replace(oldReact, newReact); done.push("réactions retirées du bas"); }

// insérer le badge AU-DESSUS de la bulle
const anchorBubble = `                <div
                  onDoubleClick={() => setReactFor(m.id)}`;
const withReact = `                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display: 'flex', marginBottom: 3, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <span style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 12, padding: '2px 7px', fontSize: 13, boxShadow: '0 1px 4px rgba(0,0,0,.14)', lineHeight: 1.2 }}>
                      {[...new Set(Object.values(m.reactions))].join(' ')}
                      {Object.keys(m.reactions).length > 1 && <span style={{ fontSize: 10.5, color: '#65676B', marginLeft: 3, fontWeight: 700 }}>{Object.keys(m.reactions).length}</span>}
                    </span>
                  </div>
                )}
                <div
                  onDoubleClick={() => setReactFor(m.id)}`;
if (S.includes(anchorBubble)) { S = S.replace(anchorBubble, withReact); done.push("réactions au-dessus du texte"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (!S.includes("HiSearch")) console.log("⚠️ HiSearch NON importé — préviens-moi");
