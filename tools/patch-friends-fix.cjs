const fs = require("fs");
process.chdir(__dirname);
const F = "src/pages/Friends.jsx";
let S = fs.readFileSync(F, "utf8");
const done = [];

// 1) Import orderBy manquant (bug: pejy fotsy rehefa manindry "Ami")
const oldImport = `import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  onSnapshot, deleteDoc
} from 'firebase/firestore';`;
const newImport = `import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  onSnapshot, deleteDoc, orderBy
} from 'firebase/firestore';`;
if (S.includes(oldImport)) { S = S.replace(oldImport, newImport); done.push("Import orderBy ajouté"); }

// 2) Button "Bloquer" tafiditra tao anaty button "Retirer" (nested tag diso)
const oldBtn = `                      <button onClick={() => removeFriend(user.uid)} style={{ background: 'none', border: '1px solid #E4E6EB', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', color: '#65676B', fontSize: 12 }}>
                        {t('removeFriend')}
                      <button onClick={() => blockFriend(user.uid)} style={{ background: "none", border: "1px solid #1877F2", borderRadius: 20, padding: "5px 12px", cursor: "pointer", color: "#1877F2", fontSize: 12 }}>
                        🚫 Bloquer
                      </button>
                      </button>`;
const newBtn = `                      <button onClick={() => removeFriend(user.uid)} style={{ background: 'none', border: '1px solid #E4E6EB', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', color: '#65676B', fontSize: 12 }}>
                        {t('removeFriend')}
                      </button>
                      <button onClick={() => blockFriend(user.uid)} style={{ background: "none", border: "1px solid #1877F2", borderRadius: 20, padding: "5px 12px", cursor: "pointer", color: "#1877F2", fontSize: 12 }}>
                        🚫 Bloquer
                      </button>`;
if (S.includes(oldBtn)) { S = S.replace(oldBtn, newBtn); done.push("Button nested corrigé"); }

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (done.length === 0) console.log("   ⚠️ Tsy nisy nifanaraka — angamba efa novaina taloha.");
