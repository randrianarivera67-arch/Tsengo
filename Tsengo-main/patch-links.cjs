const fs = require("fs");
process.chdir(__dirname);
const done = [];
const warn = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { warn.push("fichier absent: " + path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out && out !== s) fs.writeFileSync(path, out);
}

// ═══ 1) ArtistMessages : lien clicable ═══════════════════
edit("src/pages/ArtistMessages.jsx", s => {
  if (!s.includes("import Linkify")) {
    s = s.replace("import { NeonMic } from '../components/NeonIcons';",
                  "import { NeonMic } from '../components/NeonIcons';\nimport Linkify from '../components/Linkify';");
    done.push("ArtistMessages : import Linkify");
  }
  const old = `{m.text && <div style={{ fontSize: 15, lineHeight: 1.35, wordBreak: 'break-word', padding: m.mediaURL ? '7px 9px 3px' : 0 }}>{m.text}</div>}`;
  const neu = `{m.text && <div style={{ fontSize: 15, lineHeight: 1.35, wordBreak: 'break-word', padding: m.mediaURL ? '7px 9px 3px' : 0 }}><Linkify text={m.text} color={mine ? '#DDEBFF' : '#1877F2'} /></div>}`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ArtistMessages : texte linkifié"); }
  return s;
});

// ═══ 2) Messages.jsx : lien clicable ═════════════════════
edit("src/pages/Messages.jsx", s => {
  if (!s.includes("import Linkify")) {
    const m = s.match(/^import .*from '\.\.\/context\/AuthContext';$/m);
    if (m) { s = s.replace(m[0], m[0] + "\nimport Linkify from '../components/Linkify';"); done.push("Messages : import Linkify"); }
  }
  const old = "{msg.text && <p>{msg.text}</p>}";
  const neu = "{msg.text && <p><Linkify text={msg.text} color={isMe ? '#DDEBFF' : '#1877F2'} /></p>}";
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Messages : texte linkifié"); }
  return s;
});

// ═══ 3) Layout.jsx : lien collé dans la recherche globale ═
edit("src/components/Layout.jsx", s => {
  if (!s.includes("parseAppLink")) {
    s = s.replace("import { db, rtdb } from '../firebase';",
                  "import { db, rtdb } from '../firebase';\nimport { parseAppLink } from '../utils/appLink';");
    done.push("Layout : import parseAppLink");
  }
  const old = `  async function handleSearch(val) {
    setSearch(val);`;
  const neu = `  async function handleSearch(val) {
    setSearch(val);
    // Lien Trengo collé → ouvrir directement la page
    const link = parseAppLink(val);
    if (link) { setSearch(''); setSearchOpen(false); setSearchBarOpen(false); navigate(link); return; }`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Layout : lien collé → navigation"); }
  return s;
});

// ═══ 4) Artists.jsx : lien collé ═════════════════════════
edit("src/pages/Artists.jsx", s => {
  if (!s.includes("parseAppLink")) {
    s = s.replace("import { useAuth } from '../context/AuthContext';",
                  "import { useAuth } from '../context/AuthContext';\nimport { parseAppLink } from '../utils/appLink';");
    done.push("Artists : import parseAppLink");
  }
  const old = `<input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une chanson, un artiste…"`;
  const neu = `<input value={q} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setQ(''); navigate(l); return; } setQ(e.target.value); }} placeholder="Rechercher une chanson, un artiste… ou coller un lien"`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Artists : lien collé → navigation"); }
  return s;
});

// ═══ 5) ArtistsAll.jsx : lien collé ══════════════════════
edit("src/pages/ArtistsAll.jsx", s => {
  if (!s.includes("parseAppLink")) {
    s = s.replace("import { useAuth } from '../context/AuthContext';",
                  "import { useAuth } from '../context/AuthContext';\nimport { parseAppLink } from '../utils/appLink';");
    done.push("ArtistsAll : import parseAppLink");
  }
  const old = `<input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"`;
  const neu = `<input value={q} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setQ(''); navigate(l); return; } setQ(e.target.value); }} placeholder="Rechercher… ou coller un lien"`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ArtistsAll : lien collé → navigation"); }
  return s;
});

// ═══ 6) ArtistDetail.jsx : recherche titres accepte un lien ═
edit("src/pages/ArtistDetail.jsx", s => {
  if (!s.includes("parseAppLink")) {
    s = s.replace("import { downloadMedia } from '../utils/download';",
                  "import { downloadMedia } from '../utils/download';\nimport { parseAppLink } from '../utils/appLink';");
    done.push("ArtistDetail : import parseAppLink");
  }
  const old = `<input value={trackQ} onChange={e => setTrackQ(e.target.value)} placeholder="Rechercher une chanson…"`;
  const neu = `<input value={trackQ} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setTrackQ(''); navigate(l); return; } setTrackQ(e.target.value); }} placeholder="Rechercher une chanson… ou coller un lien"`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("ArtistDetail : lien collé → navigation"); }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (warn.length) { console.log("\n⚠️  Avertissements:"); warn.forEach(w => console.log("   • " + w)); }

// Vérification stricte
const checks = [
  ["src/components/Linkify.jsx", null],
  ["src/utils/appLink.js", null],
  ["src/pages/ArtistMessages.jsx", "Linkify"],
  ["src/components/Layout.jsx", "parseAppLink"],
];
let ok = true;
for (const [p, needle] of checks) {
  if (!fs.existsSync(p)) { console.log("❌ MANQUANT:", p); ok = false; continue; }
  if (needle && !fs.readFileSync(p, "utf8").includes(needle)) { console.log("❌", p, "n'utilise pas", needle); ok = false; }
}
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi avant de builder.");
if (!ok) process.exit(1);
