const fs = require('fs');
const done = [];

// A. Studios : requete musique dediee (trouve toujours les musiques)
for (const p of ['src/components/StoryStudio.jsx', 'src/components/JejoStudio.jsx']) {
  let s = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop();
  if (s.includes("where('isMusic'")) { done.push(name + ' (deja)'); continue; }

  const aImp = "  collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp,";
  if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import ' + name); process.exit(1); }
  s = s.replace(aImp, "  collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp,");

  const aQ = "      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)));";
  if (s.split(aQ).length - 1 !== 1) { console.log('ERR ancre requete ' + name + ' ('+(s.split(aQ).length-1)+')'); process.exit(1); }
  s = s.replace(aQ, "      // Requete dediee : trouve toujours les musiques, quelle que soit leur date\n      const snap = await getDocs(query(collection(db, 'posts'), where('isMusic', '==', true), limit(60)));");

  fs.writeFileSync(p, s);
  done.push(name);
}

// B. Home : fusion des deux lectures 'users'
{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('setNewUserUids(new Set(snap.docs.slice')) { done.push('users fusionnes (deja)'); }
  else {
    const aSug = `    getDocs(query(collection(db, 'users'), limit(40))).then(snap => {
      if (!alive) return;`;
    if (s.split(aSug).length - 1 !== 1) { console.log('ERR ancre suggestions ('+(s.split(aSug).length-1)+')'); process.exit(1); }
    s = s.replace(aSug, `    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(40))).then(snap => {
      if (!alive) return;
      // Les 30 plus recents sortent de CETTE lecture (plus de seconde requete)
      setNewUserUids(new Set(snap.docs.slice(0, 30).map(d => d.id)));`);

    const aOld = `    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(30)))
      .then(snap => setNewUserUids(new Set(snap.docs.map(d => d.id))))
      .catch(() => setNewUserUids(new Set()));`;
    if (s.split(aOld).length - 1 !== 1) { console.log('ERR ancre nouveaux inscrits ('+(s.split(aOld).length-1)+')'); process.exit(1); }
    s = s.replace(aOld, "    // (les nouveaux inscrits proviennent desormais de la lecture ci-dessus)");

    fs.writeFileSync(p, s);
    done.push('users fusionnes');
  }
}

console.log('OK : ' + done.join(', '));
