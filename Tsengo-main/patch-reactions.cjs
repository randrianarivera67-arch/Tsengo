const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/ArtistMessages.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// 1) Liste d'emojis
if (!S.includes("REACT_EMOJIS")) {
  S = S.replace(
    "const fmtTime = ts =>",
    "const REACT_EMOJIS = ['\u2764\ufe0f', '\ud83d\ude02', '\ud83d\ude2e', '\ud83d\ude22', '\ud83d\ude21', '\ud83d\udc4d'];\n\nconst fmtTime = ts =>"
  );
  done.push("Liste emojis");
}

// 2) State picker
if (!S.includes("reactFor")) {
  S = S.replace(
    "  const [recording, setRecording] = useState(false);",
    "  const [recording, setRecording] = useState(false);\n  const [reactFor, setReactFor] = useState(null);   // msgId dont on choisit la réaction"
  );
  done.push("State reactFor");
}

// 3) Fonction toggleReaction (avant "async function send()")
if (!S.includes("function toggleReaction")) {
  S = S.replace(
    "  async function send() {",
    `  async function toggleReaction(msgId, emoji) {
    setReactFor(null);
    if (!activeVisitor) return;
    const p = \`artistConversations/\${artistId}/\${activeVisitor}/messages/\${msgId}/reactions/\${currentUser.uid}\`;
    const cur = msgs.find(m => m.id === msgId)?.reactions?.[currentUser.uid];
    try { await update(ref(rtdb, p.substring(0, p.lastIndexOf('/'))), { [currentUser.uid]: cur === emoji ? null : emoji }); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function send() {`
  );
  done.push("Fonction toggleReaction");
}

// 4) Bulle : long-press / double-clic + affichage des réactions
const oldBubble = `                <div style={{ background: mine ? '#1877F2' : '#F0F2F5', color: mine ? '#fff' : '#050505', padding: m.mediaURL ? 4 : '10px 14px', borderRadius: 18, overflow: 'hidden' }}>`;
const newBubble = `                <div
                  onDoubleClick={() => setReactFor(m.id)}
                  onContextMenu={e => { e.preventDefault(); setReactFor(m.id); }}
                  onTouchStart={e => { e.currentTarget._t = setTimeout(() => setReactFor(m.id), 450); }}
                  onTouchEnd={e => clearTimeout(e.currentTarget._t)}
                  onTouchMove={e => clearTimeout(e.currentTarget._t)}
                  style={{ position: 'relative', background: mine ? '#1877F2' : '#F0F2F5', color: mine ? '#fff' : '#050505', padding: m.mediaURL ? 4 : '10px 14px', borderRadius: 18, overflow: 'visible', cursor: 'pointer', userSelect: 'none' }}>`;
if (S.includes(oldBubble)) { S = S.replace(oldBubble, newBubble); done.push("Bulle : appui long / double-clic"); }

// 5) Badge réactions + horodatage
const oldMeta = `                <div style={{ fontSize: 10.5, color: '#65676B', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingInline: 4 }}>
                  {fmtTime(m.ts)}{seen && <span style={{ color: '#1877F2', fontWeight: 700 }}> · ✓✓ Vu</span>}
                </div>`;
const newMeta = `                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: -8, marginLeft: mine ? 0 : 8, marginRight: mine ? 8 : 0, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <span style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 12, padding: '1px 6px', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,.12)' }}>
                      {[...new Set(Object.values(m.reactions))].join(' ')}
                      {Object.keys(m.reactions).length > 1 && <span style={{ fontSize: 10.5, color: '#65676B', marginLeft: 3 }}>{Object.keys(m.reactions).length}</span>}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: '#65676B', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingInline: 4 }}>
                  {fmtTime(m.ts)}{seen && <span style={{ color: '#1877F2', fontWeight: 700 }}> · ✓✓ Vu</span>}
                </div>`;
if (S.includes(oldMeta)) { S = S.replace(oldMeta, newMeta); done.push("Affichage des réactions"); }

// 6) Sélecteur d'emoji (avant la modale Médias partagés)
const oldMedia = `      {mediaOpen && (`;
const newMedia = `      {reactFor && (
        <div onClick={() => setReactFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 30, padding: '10px 14px', display: 'flex', gap: 6, boxShadow: '0 10px 34px rgba(0,0,0,.28)' }}>
            {REACT_EMOJIS.map(em => (
              <button key={em} onClick={() => toggleReaction(reactFor, em)}
                style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: 4, lineHeight: 1 }}>{em}</button>
            ))}
          </div>
        </div>
      )}

      {mediaOpen && (`;
if (S.includes(oldMedia)) { S = S.replace(oldMedia, newMedia); done.push("Sélecteur d'emoji"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
