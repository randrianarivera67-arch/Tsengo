// fix-firestore-reads.cjs
// Antony : ny quota Firestore (50k lecture/andro — Spark) lany, ka :
//   - Ny backend /notify tsy afaka mamaky users/{uid}.fcmTokens → HTTP 500 RESOURCE_EXHAUSTED
//     → tsy misy notification (web + APK). Ity no fototry ny olana notification.
//   - Ny app lasa miadana / mijanona.
// Fanamboarana : esorina ny lecture tsy voafetra (collection manontolo, listener tsy misy limit).
// Idempotent : tsy manova raha efa vita.
const fs = require('fs');

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
    s = s.replace(oldStr, newStr);
    changed++;
    console.log('  ✅ ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
  return changed;
}

// ── 1) useNotifications : limit(50) — sinon TOUTES les notifs sont lues en live ──
console.log('src/hooks/useNotifications.js');
patchFile('src/hooks/useNotifications.js', [
  [
    'import limit',
    "import { collection, query, where, onSnapshot, orderBy,",
    "import { collection, query, where, onSnapshot, orderBy, limit,",
  ],
  [
    'limit(50) sur la requete notifications',
    "      where('toUid', '==', currentUser.uid),\n      orderBy('createdAt', 'desc')\n    );",
    "      where('toUid', '==', currentUser.uid),\n      orderBy('createdAt', 'desc'),\n      limit(50)\n    );",
  ],
]);

// ── 2) Home : suggestions d'amis — ne plus lire TOUTE la collection users ──
console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  [
    'suggestions amis: limit(80) au lieu de toute la collection users',
    "getDocs(collection(db, 'users')).then(snap => {",
    "getDocs(query(collection(db, 'users'), limit(80))).then(snap => {",
  ],
  [
    'suggestions boutiques: limit(20)',
    "getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc')))",
    "getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'), limit(20)))",
  ],
]);

console.log('✅ Termine — lecture Firestore fortement reduite.');
