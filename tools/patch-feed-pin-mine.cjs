const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (!s.includes('let freshOwnPosts')) {
  const a = "let feedSnapshot = null;";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre feedSnapshot'); process.exit(1); }
  s = s.replace(a, a + "\n// Mes publications recentes : epinglees en tete du fil jusqu'a un refresh\n// MANUEL ou 15 min. Au niveau du module -> resiste aux remontages du composant.\nlet freshOwnPosts = [];\nconst FRESH_OWN_MS = 15 * 60 * 1000;\nfunction freshOwnIds() {\n  const now = Date.now();\n  freshOwnPosts = freshOwnPosts.filter(x => now - x.t < FRESH_OWN_MS);\n  return freshOwnPosts.map(x => x.id);\n}");
  done.push('etat module');
}

if (!s.includes('freshOwnPosts.push')) {
  const a = "          mine.forEach(m => ownFreshIdsRef.current.add(m.id));";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre mine ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\n          mine.forEach(m => { if (!freshOwnPosts.some(x => x.id === m.id)) freshOwnPosts.push({ id: m.id, t: Date.now() }); });");
  done.push('memorisation');
}

const OLD = `        if (first) {
          // Tazonina eo ambony ny post optimiste mbola tsy hitan'ny serveur
          const opt = prev.filter(id =>
            (optimisticIdsRef.current.has(id) || ownFreshIdsRef.current.has(id)) && !serverIds.has(id));
          return [...opt, ...rankedIds];
        }`;
if (s.includes(OLD)) {
  s = s.replace(OLD, `        if (first) {
          const opt = prev.filter(id => optimisticIdsRef.current.has(id) && !serverIds.has(id));
          const pinned = freshOwnIds().filter(id => !opt.includes(id));
          const pinnedSet = new Set([...opt, ...pinned]);
          const rest = rankedIds.filter(id => !pinnedSet.has(id));
          return [...opt, ...pinned, ...rest];
        }`);
  done.push('epinglage');
} else done.push('epinglage (deja)');

const aRef = "    ownFreshIdsRef.current.clear();                 // refresh manuel = reclassement complet";
if (!s.includes("    freshOwnPosts = [];                             // refresh manuel")) {
  if (s.split(aRef).length - 1 !== 1) { console.log('ERR ancre refreshFeed ('+(s.split(aRef).length-1)+')'); process.exit(1); }
  s = s.replace(aRef, aRef + "\n    freshOwnPosts = [];                             // refresh manuel = reclassement complet");
  done.push('refresh manuel');
}

if (!s.includes('freshOwnPosts.filter(x => x.id !== postId)')) {
  const a = "    try { ownFreshIdsRef.current.delete(postId); } catch {}";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre deletePost ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\n    freshOwnPosts = freshOwnPosts.filter(x => x.id !== postId);");
  done.push('suppression');
}

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
