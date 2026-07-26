const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (!s.includes('softCache')) {
  const aImp = "import { useMusicSuggestions } from '../hooks/useMusicSuggestions';";
  if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import'); process.exit(1); }
  s = s.replace(aImp, aImp + "\nimport { readCache, writeCache, SIX_HOURS } from '../utils/softCache';");
  done.push('import');
}

if (!s.includes("readCache('shops:sugg'")) {
  const OLD = `    getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'), limit(20)))
      .then(snap => setShopSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 16)))`;
  if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre shops ('+(s.split(OLD).length-1)+')'); process.exit(1); }
  s = s.replace(OLD, `    const hit = readCache('shops:sugg', SIX_HOURS);
    if (hit) { setShopSuggestions(hit); return; }
    getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'), limit(20)))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 16);
        setShopSuggestions(list);
        writeCache('shops:sugg', list);
      })`);
  done.push('boutiques');
}

if (!s.includes("readCache('users:sugg'")) {
  const START = "    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(40))).then(snap => {";
  const END = "    return () => { alive = false; };\n  }, [currentUser, userProfile?.friends?.length]); // eslint-disable-line";
  const i0 = s.indexOf(START);
  if (i0 < 0) { console.log('ERR ancre suggestions'); process.exit(1); }
  const i1 = s.indexOf(END, i0);
  if (i1 < 0) { console.log('ERR fin suggestions'); process.exit(1); }

  const NEW = `    const apply = (rows) => {
      if (!alive) return;
      setNewUserUids(new Set(rows.slice(0, 30).map(u => u.uid)));
      const friends = userProfile.friends || [];
      const friendSet = new Set(friends);
      const sent = userProfile.sentRequests || [];
      const myCity = (userProfile.currentCity || userProfile.hometown || '').trim().toLowerCase();
      const list = rows
        .filter(u => u.uid !== currentUser.uid && u.fullName && !friendSet.has(u.uid) && !sent.includes(u.uid))
        .map(u => {
          const mutual = (u.friends || []).filter(f => friendSet.has(f)).length;
          const uCity = (u.currentCity || u.hometown || '').trim().toLowerCase();
          const sameCity = myCity && uCity && (uCity.includes(myCity) || myCity.includes(uCity)) ? 1 : 0;
          const regTs = tsMs(u.createdAt);
          return { ...u, _mutual: mutual, _sameCity: sameCity, _regTs: regTs };
        });
      list.sort((a, b) =>
        (b._mutual - a._mutual)
        || (b._regTs - a._regTs)
        || (b._sameCity - a._sameCity)
        || (Math.random() - 0.5));
      setSuggestions(list.slice(0, 20));
    };

    const cached = readCache('users:sugg', SIX_HOURS);
    if (cached && Array.isArray(cached) && cached.length) { apply(cached); return () => { alive = false; }; }

    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(40))).then(snap => {
      const rows = snap.docs.map(d => {
        const { email, fcmTokens, ...rest } = d.data() || {};
        return { uid: d.id, ...rest };
      });
      writeCache('users:sugg', rows);
      apply(rows);
    }).catch(() => {});
${END}`;
  s = s.slice(0, i0) + NEW + s.slice(i1 + END.length);
  done.push('suggestions amis');
}

fs.writeFileSync(p, s);
console.log('OK : ' + (done.length ? done.join(', ') : 'deja applique'));
