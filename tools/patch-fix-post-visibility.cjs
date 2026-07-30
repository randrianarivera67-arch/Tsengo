// patch-fix-post-visibility.cjs  (FRONTEND)
// Olana : publication vaovao "manjavona" amin'ny fil + tsy hita amin'ny profil.
// Fototra : serverTimestamp() = NULL aloha (pending) →
//   (a) ny realtime listener manoloana ny timestamp tsara amin'ny null → lasa ambany
//   (b) ny profil orderBy('createdAt') manilika ny post null createdAt
// Vahaolana :
//   1. Home : d.data({serverTimestamps:'estimate'}) → timestamp estimé ho an'ny pending
//   2. Profile : esorina ny orderBy (tsy mila composite index, tsy manilika pending),
//      dia sort client-side → ny post vaovao hita AVY HATRANY.
// Idempotent + anchor guards.
const fs = require('fs');

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr) && !s.includes(oldStr)) { console.log('  ⏭️  ' + label); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ❌ ' + label + ' (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
}

// ── Home.jsx : estimate ho an'ny pending timestamp ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  ['loadFeedPage estimate',
   '      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));',
   "      const rows = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));"],
  ['realtime listener estimate',
   '      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));',
   "      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));"],
]);

// ── Profile.jsx : query sans orderBy + tri client (pending inclus, pas d'index) ──
console.log('src/pages/Profile.jsx');
patchFile('src/pages/Profile.jsx', [
  ['profile query robuste',
   "    const q = query(collection(db,'posts'), where('uid','==',targetUid), orderBy('createdAt','desc'), limit(60));\n    // ✅ Les publications d'une page artiste restent sur la page (pas sur le profil perso)\n    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data()})).filter(p => !p.artistId && !p.isMusic && !p.shopId && !p.pageId)));",
   "    const q = query(collection(db,'posts'), where('uid','==',targetUid), limit(100));\n    // ✅ Sans orderBy (pas d'index composite, inclut les posts en attente) — tri client\n    const _ms = (v) => !v ? 0 : (v.toDate ? v.toDate().getTime() : (typeof v.seconds==='number' ? v.seconds*1000 : (typeof v._seconds==='number' ? v._seconds*1000 : (new Date(v).getTime()||0))));\n    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data({serverTimestamps:'estimate'})})).filter(p => !p.artistId && !p.isMusic && !p.shopId && !p.pageId).sort((a,b)=>_ms(b.createdAt)-_ms(a.createdAt)).slice(0,60)));"],
]);

console.log('✅ Fix visibilité publication (feed + profil).');
