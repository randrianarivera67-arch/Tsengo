// patch-createdat-client.cjs  (FRONTEND — src/pages/Home.jsx)
// Olana : post vaovao mahazo createdAt = NULL (serverTimestamp mbola tsy resolved) →
// nilaozan'ny orderBy('createdAt') ao amin'ny feed → "manjavona".
// Vahaolana : createdAt = Timestamp.now() (client) → TSY null → hita hatrany.
// Idempotent + anchor guards.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;

// 1) Import Timestamp (guard précis : évite le faux positif avec "serverTimestamp,")
if (s.includes('serverTimestamp, Timestamp,')) {
  console.log('  ⏭️  import Timestamp — deja');
} else {
  const IMP_OLD = '  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit,';
  const IMP_NEW = '  collection, addDoc, serverTimestamp, Timestamp, query, orderBy, onSnapshot, limit,';
  if (s.split(IMP_OLD).length - 1 !== 1) { console.log('  ❌ import anchor introuvable'); process.exit(1); }
  s = s.replace(IMP_OLD, IMP_NEW); changed++; console.log('  ✅ import Timestamp');
}

// 2) Post createdAt : serverTimestamp() → Timestamp.now()  (2 sites)
const POST_OLD = 'reactions: {}, comments: [], createdAt: serverTimestamp(),';
const POST_NEW = 'reactions: {}, comments: [], createdAt: Timestamp.now(),';
const cnt = s.split(POST_OLD).length - 1;
if (cnt === 0 && s.includes(POST_NEW)) { console.log('  ⏭️  post createdAt — deja'); }
else if (cnt !== 2) { console.log('  ❌ post createdAt : attendu 2, trouve ' + cnt); process.exit(1); }
else { s = s.split(POST_OLD).join(POST_NEW); changed++; console.log('  ✅ post createdAt → Timestamp.now() (2 sites)'); }

if (changed) fs.writeFileSync(p, s);
console.log('✅ createdAt client — publication tsy manjavona intsony.');
