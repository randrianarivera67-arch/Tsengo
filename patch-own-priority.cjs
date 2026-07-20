// patch-own-priority.cjs  (FRONTEND — src/pages/Home.jsx)
// Ny post-n'ny mpampiasa manokana = priorite ambony (toy Facebook : ny post-nao
// miseo ambony rehefa vao nalefa) → tsy voatosik'ny affinite namana.
// Mila efa nampiharina ny patch-feed-facebook. Idempotent.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const OLD = "      return (boosted ? 1e6 : 0) - hoursAgo + (aff.has(pp.uid) ? 14 : 0) + rnd(pp.id) * 8;";
const NEW = "      const mine = pp.uid === currentUser?.uid ? 30 : 0;\n      return (boosted ? 1e6 : 0) - hoursAgo + mine + (aff.has(pp.uid) ? 14 : 0) + rnd(pp.id) * 8;";
if (s.includes('const mine = pp.uid === currentUser')) { console.log('SKIP deja applique'); process.exit(0); }
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre introuvable - patch-feed-facebook tsy nampiharina?'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('OK priorite post manokana apetraka');
