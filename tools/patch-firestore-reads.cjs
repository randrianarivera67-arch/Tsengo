const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (!s.includes('useActiveStories')) {
  const aImp = "import { useActiveStoryUids } from '../hooks/useActiveStoryUids';";
  if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import'); process.exit(1); }
  s = s.replace(aImp, "import { useActiveStoryUids, useActiveStories } from '../hooks/useActiveStoryUids';");

  const aUse = "  const activeStoryUids = useActiveStoryUids();";
  if (s.split(aUse).length - 1 !== 1) { console.log('ERR ancre activeStoryUids'); process.exit(1); }
  s = s.replace(aUse, aUse + "\n  const allStories = useActiveStories();");

  const START = "  // Stories des dernières 24h, groupées par utilisateur\n  useEffect(() => {\n    const q = query(collection(db, 'stories'), orderBy('ts', 'desc'), limit(150));";
  const END = "  }, [currentUser, userProfile?.friends?.length]);";
  const i0 = s.indexOf(START);
  if (i0 < 0) { console.log('ERR ancre bloc stories'); process.exit(1); }
  const i1 = s.indexOf(END, i0);
  if (i1 < 0) { console.log('ERR fin bloc stories'); process.exit(1); }
  const NEW = `  // Stories des dernières 24h, groupées par utilisateur
  // (utilise le listener global partagé : plus de second abonnement)
  useEffect(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const myFriends = userProfile?.friends || [];
    const fresh = allStories.filter(st => {
      if ((st.ts || 0) <= cutoff) return false;
      if (st.uid === currentUser?.uid) return true;
      if (st.audience === 'me') return false;
      if (st.audience === 'friends') return myFriends.includes(st.uid);
      return true;
    });
    const byUser = {};
    fresh.forEach(st => {
      if (!byUser[st.uid]) byUser[st.uid] = { uid: st.uid, name: st.authorName, photo: st.authorPhoto || '', items: [] };
      byUser[st.uid].items.push(st);
    });
    Object.values(byUser).forEach(g => g.items.sort((a, b) => (a.ts || 0) - (b.ts || 0)));
    const list = Object.values(byUser).sort((a, b) => (a.uid === currentUser?.uid ? -1 : b.uid === currentUser?.uid ? 1 : 0));
    setStoryGroups(list);
  }, [allStories, currentUser, userProfile?.friends?.length]);`;
  s = s.slice(0, i0) + NEW + s.slice(i1 + END.length);
  done.push('stories partagees');
} else done.push('stories (deja)');

if (s.includes("collection(db, 'users'), limit(120)")) {
  s = s.replace("getDocs(query(collection(db, 'users'), limit(120)))", "getDocs(query(collection(db, 'users'), limit(40)))");
  done.push('suggestions 120->40');
} else done.push('suggestions (deja)');

if (s.includes("onSnapshot(collection(db, 'artists')")) {
  const OLD = `    const unsub = onSnapshot(collection(db, 'artists'), snap => {
      setFollowedArtists(snap.docs.filter(d => (d.data().followers || []).includes(currentUser.uid)).map(d => d.id));
    }, () => {});
    return () => unsub();`;
  if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre artists'); process.exit(1); }
  s = s.replace(OLD, `    let alive = true;
    getDocs(collection(db, 'artists')).then(snap => {
      if (!alive) return;
      setFollowedArtists(snap.docs.filter(d => (d.data().followers || []).includes(currentUser.uid)).map(d => d.id));
    }).catch(() => {});
    return () => { alive = false; };`);

  const OLDT = `    const on = followedArtists.includes(artistId);
    try { await updateDoc(doc(db, 'artists', artistId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); } catch {}`;
  if (s.split(OLDT).length - 1 !== 1) { console.log('ERR ancre toggleFollowArtist'); process.exit(1); }
  s = s.replace(OLDT, `    const on = followedArtists.includes(artistId);
    setFollowedArtists(prev => on ? prev.filter(x => x !== artistId) : [...prev, artistId]);
    try { await updateDoc(doc(db, 'artists', artistId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); } catch {}`);
  done.push('artistes lecture unique');
} else done.push('artistes (deja)');

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
