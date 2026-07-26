/* patch-fix-refresh-v18.cjs — Tsengo / Trengo
 * FIX BUG : ny fil d'actualités lasa FIXE (publication épinglée iray ihany eo
 * an-tampony isaky ny refresh, tsy miovaova).
 */
const fs = require('fs');
const F = 'src/pages/Home.jsx';
let FAIL = 0;
if (!fs.existsSync(F)) { console.log('ERR  tsy hita: ' + F); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const orig = s;

function rep(name, oldStr, newStr, marker) {
  if (s.indexOf(marker) !== -1) { console.log('SKIP ' + name); return; }
  if (s.indexOf(oldStr) === -1) { console.log('ERR  ' + name + ' : tsy hita'); FAIL++; return; }
  s = s.replace(oldStr, newStr);
  console.log('OK   ' + name);
}

// 1) firstSnap guard
rep('snapshot voalohany tsy miépingler',
`    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    return onSnapshot(q, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        for (const f of fresh) map.set(f.id, f);   // mise à jour in place (réactions, vues, commentaires)
        return Array.from(map.values());
      });
      const news = fresh.filter(f => !orderSetRef.current.has(f.id));`,
`    // ⚠️ Ny snapshot VOALOHANY (na aorian'ny refresh/remount) dia mitondra ny 20
    // post farany. Amin'io fotoana io dia mbola BANGA ny orderSetRef, ka RAHA
    // raisina ho "news" izy ireo dia ho épinglé daholo ny post-nao → mijanona
    // FIXE eo an-tampony isaky ny refresh (io ilay bug). Noho izany: ny snapshot
    // voalohany dia manavao ny votoaty IHANY.
    let firstSnap = true;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    return onSnapshot(q, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        for (const f of fresh) map.set(f.id, f);   // mise à jour in place (réactions, vues, commentaires)
        return Array.from(map.values());
      });
      if (firstSnap) { firstSnap = false; setPostsLoading(false); return; }
      const news = fresh.filter(f => !orderSetRef.current.has(f.id));`,
  'let firstSnap = true;');

// 2) addPin amin'ny fandefasana (post tokana)
rep('pin post tokana vao nalefa',
`      optimisticIdsRef.current.add(postRef.id);
      setOrder(prev => [postRef.id, ...prev.filter(id => id !== postRef.id)]);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`,
`      optimisticIdsRef.current.add(postRef.id);
      addPin(postRef.id);                 // post-nao VAO NALEFA → mipetaka ambony (ho anao) mandra-pahavitan'ny refresh manaraka
      setOrder(prev => [postRef.id, ...prev.filter(id => id !== postRef.id)]);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`,
  'post-nao VAO NALEFA → mipetaka ambony (ho anao) mandra');

// 3) addPin amin'ny fandefasana (plusieurs photos)
rep('pin post plusieurs photos vao nalefa',
`        optimisticIdsRef.current.add(postRef.id);
        setOrder(prev => [postRef.id, ...prev.filter(id => id !== postRef.id)]);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`,
`        optimisticIdsRef.current.add(postRef.id);
        addPin(postRef.id);               // post-nao VAO NALEFA → mipetaka ambony (ho anao)
        setOrder(prev => [postRef.id, ...prev.filter(id => id !== postRef.id)]);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);`,
  'post-nao VAO NALEFA → mipetaka ambony (ho anao)\n');

if (s !== orig) { fs.writeFileSync(F, s, 'utf8'); console.log('>> voasoratra: ' + F); }
else console.log('>> tsy niova');
console.log(FAIL === 0 ? '\n✅ VITA TSARA — tsy misy diso.' : '\n❌ Nisy ' + FAIL + ' diso.');
process.exit(FAIL === 0 ? 0 : 1);
