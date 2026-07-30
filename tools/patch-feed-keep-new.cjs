const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (!s.includes('ownFreshIdsRef')) {
  const a = "  const orderSetRef = useRef(new Set());";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre orderSetRef'); process.exit(1); }
  s = s.replace(a, a + "\n  // Mes publications arrivees par le temps reel : gardees en tete jusqu'au\n  // prochain refresh MANUEL (elles ne doivent pas bouger toutes seules).\n  const ownFreshIdsRef = useRef(new Set());");
  done.push('ref');
}

if (!s.includes('ownFreshIdsRef.current.add')) {
  const a = "          mine.forEach(m => optimisticIdsRef.current.delete(m.id));";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre mine ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\n          mine.forEach(m => ownFreshIdsRef.current.add(m.id));");
  done.push('memorisation');
}

const OLD_KEEP = "          const opt = prev.filter(id => optimisticIdsRef.current.has(id) && !serverIds.has(id));";
if (s.includes(OLD_KEEP)) {
  s = s.replace(OLD_KEEP, "          const opt = prev.filter(id =>\n            (optimisticIdsRef.current.has(id) || ownFreshIdsRef.current.has(id)) && !serverIds.has(id));");
  done.push('conservation');
} else done.push('conservation (deja)');

if (!s.includes('ownFreshIdsRef.current.clear()')) {
  const a = "    setPendingNew([]);                              // ho tafiditra ao anaty top-20 vaovao izy ireo";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre refreshFeed ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\n    ownFreshIdsRef.current.clear();                 // refresh manuel = reclassement complet");
  done.push('refresh manuel');
}

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
