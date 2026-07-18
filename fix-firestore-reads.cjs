const fs = require('fs');

function patchFile(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  let changed = 0;
  for (const [label, oldStr, newStr] of edits) {
    if (s.includes(newStr)) { console.log('  SKIP ' + label + ' (deja applique)'); continue; }
    const n = s.split(oldStr).length - 1;
    if (n !== 1) { console.log('  ERR ' + label + ' ancre ' + n); process.exit(1); }
    s = s.replace(oldStr, newStr); changed++; console.log('  OK ' + label);
  }
  if (changed) fs.writeFileSync(path, s);
  return changed;
}

console.log('src/hooks/useNotifications.js');
patchFile('src/hooks/useNotifications.js', [
  ['import limit',
   "import { collection, query, where, onSnapshot, orderBy,",
   "import { collection, query, where, onSnapshot, orderBy, limit,"],
  ['limit(50) notifications',
   "      where('toUid', '==', currentUser.uid),\n      orderBy('createdAt', 'desc')\n    );",
   "      where('toUid', '==', currentUser.uid),\n      orderBy('createdAt', 'desc'),\n      limit(50)\n    );"],
]);

console.log('src/pages/Home.jsx');
patchFile('src/pages/Home.jsx', [
  ['suggestions amis limit(80)',
   "getDocs(collection(db, 'users')).then(snap => {",
   "getDocs(query(collection(db, 'users'), limit(80))).then(snap => {"],
  ['suggestions boutiques limit(20)',
   "getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc')))",
   "getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'), limit(20)))"],
]);
console.log('DONE reads');
