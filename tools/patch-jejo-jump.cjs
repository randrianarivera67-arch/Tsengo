const fs = require('fs');
const p = 'src/pages/Reels.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

if (s.includes('postIdsRef')) { console.log('SKIP deja applique'); process.exit(0); }

const a = "  const awaitNewRef = useRef(false);";
if (s.split(a).length - 1 !== 1) { console.log('ERR ancre awaitNewRef ('+(s.split(a).length-1)+')'); process.exit(1); }
s = s.replace(a, a + "\n  const postIdsRef = useRef(new Set());\n  useEffect(() => { postIdsRef.current = new Set(posts.map(x => x.id)); }, [posts]);");
done.push('suivi des ids');

const OLD_EFF = `  // Des que MA nouvelle video apparait en tete, on s'y positionne (autoplay)
  useEffect(() => {
    if (!awaitNewRef.current || !posts.length) return;
    if (posts[0]?.uid !== currentUser?.uid) return;
    awaitNewRef.current = false;
    setActiveIndex(0);
    setTimeout(() => { try { if (containerRef.current) containerRef.current.scrollTop = 0; } catch {} }, 60);
  }, [posts, currentUser]);`;
if (s.includes(OLD_EFF)) {
  s = s.replace(OLD_EFF, "  // (le positionnement se fait dans le listener temps reel ci-dessous)");
  done.push('ancien effet retire');
} else done.push('ancien effet (deja)');

const OLD_LIS = `    return onSnapshot(q, snap => {
      const fresh = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
      setPosts(prev => prev.map(p => fresh.has(p.id) ? { ...p, ...fresh.get(p.id) } : p));
    }, () => {});
  }, []);`;
if (s.split(OLD_LIS).length - 1 !== 1) { console.log('ERR ancre listener ('+(s.split(OLD_LIS).length-1)+')'); process.exit(1); }
s = s.replace(OLD_LIS, `    return onSnapshot(q, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const fresh = new Map(arr.map(x => [x.id, x]));
      const known = new Set(postIdsRef.current);
      setPosts(prev => prev.map(p => fresh.has(p.id) ? { ...p, ...fresh.get(p.id) } : p));

      // MA nouvelle video (envoi qui vient de se terminer) : on l'insere en tete
      // et on s'y positionne. Sans envoi en cours -> rien ne change.
      if (!awaitNewRef.current) return;
      const mineNew = arr.filter(f =>
        !known.has(f.id) && f.uid === currentUser?.uid && f.mediaType === 'video' && f.mediaURL);
      if (!mineNew.length) return;
      awaitNewRef.current = false;
      setPosts(prev => [...mineNew.filter(m => !prev.some(x => x.id === m.id)), ...prev]);
      setActiveIndex(0);
      setTimeout(() => { try { if (containerRef.current) containerRef.current.scrollTop = 0; } catch {} }, 80);
    }, () => {});
  }, [currentUser?.uid]);`);
done.push('listener');

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
