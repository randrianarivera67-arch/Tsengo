// patch-feed-cursor20.cjs (FRONTEND — src/pages/Home.jsx)
// Feed pagination CURSOR 20/page : getDocs + startAfter (PAS de re-lecture, pas de
// boucle, pas de quota drain) + UN listener temps reel (20 recents) pour nouveaux
// posts & reactions. Ordre : recent dominant + variation + engagement + suggestions.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let done = [];

// 1) States : feedLimit -> cursorRef + loadingRef
const ST_OLD = `  const [feedRaw, setFeedRaw] = useState([]);             // posts bruts
  const [feedLimit, setFeedLimit] = useState(30);         // nb recupere (grandit au scroll)`;
const ST_NEW = `  const [feedRaw, setFeedRaw] = useState([]);             // posts bruts
  const cursorRef = useRef(null);                         // dernier doc (startAfter) — pagination 20/page
  const loadingRef = useRef(false);                       // anti double-chargement`;
if (s.includes('cursorRef = useRef(null)')) done.push('states SKIP');
else { if (s.split(ST_OLD).length-1!==1){console.log('ERR states');process.exit(1);} s=s.replace(ST_OLD,ST_NEW); done.push('states OK'); }

// 2) Bloc feed : onSnapshot-limit -> cursor getDocs + realtime
const FEED_OLD = `  // Feed : onSnapshot temps reel unique (limit grandit au scroll) — pas de flicker
  const loadFeedPage = () => setFeedLimit(l => l + 30); // "charger plus" = agrandir la fenetre
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(feedLimit));
    return onSnapshot(q, snap => {
      setReachedEnd(snap.docs.length < feedLimit);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        const ids = new Set(rows.map(r => r.id));
        const keptOptimistic = prev.filter(pp => pp._optimistic && !ids.has(pp.id));
        return [...keptOptimistic, ...rows];
      });
      setPostsLoading(false);
    }, () => setPostsLoading(false));
  }, [feedLimit]);`;
const FEED_NEW = `  // Feed : pagination CURSOR 20/page (getDocs + startAfter, PAS de re-lecture) + temps reel
  const PAGE_SIZE = 20;
  const loadFeedPage = async (first) => {
    if (loadingRef.current) return;
    if (!first && (reachedEnd || !cursorRef.current)) return;
    loadingRef.current = true;
    try {
      const q = first
        ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))
        : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(cursorRef.current), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.docs.length < PAGE_SIZE) setReachedEnd(true);
      if (snap.docs.length) cursorRef.current = snap.docs[snap.docs.length - 1];
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        if (first) {
          const ids = new Set(rows.map(r => r.id));
          const opt = prev.filter(pp => pp._optimistic && !ids.has(pp.id));
          return [...opt, ...rows];
        }
        const seen = new Set(prev.map(x => x.id));
        return [...prev, ...rows.filter(x => !seen.has(x.id))];
      });
      setPostsLoading(false);
    } catch (e) { setPostsLoading(false); } finally { loadingRef.current = false; }
  };
  // Premiere page (20)
  useEffect(() => { loadFeedPage(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // Temps reel : 20 plus recents -> nouveaux posts + reactions (merge, pas de re-lecture)
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    return onSnapshot(q, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        const news = [];
        for (const f of fresh) { if (map.has(f.id)) map.set(f.id, f); else news.push(f); }
        let arr = Array.from(map.values());
        if (news.length) arr = [...news, ...arr];
        return arr;
      });
      setPostsLoading(false);
    }, () => setPostsLoading(false));
  }, []);`;
if (s.includes('const PAGE_SIZE = 20')) done.push('feed SKIP');
else { if (s.split(FEED_OLD).length-1!==1){console.log('ERR feed block');process.exit(1);} s=s.replace(FEED_OLD,FEED_NEW); done.push('feed OK'); }

// 3) Load-more trigger
const TR_OLD = 'if (!reachedEnd && feedRaw.length >= feedLimit) loadFeedPage();';
const TR_NEW = 'if (!reachedEnd) loadFeedPage(false);';
if (s.includes(TR_NEW)) done.push('trigger SKIP');
else { if (s.split(TR_OLD).length-1!==1){console.log('ERR trigger');process.exit(1);} s=s.replace(TR_OLD,TR_NEW); done.push('trigger OK'); }

// 4) Pull-to-refresh
const PTR_OLD = 'onRefresh={() => { setFeedLimit(30); setReachedEnd(false); setVisibleCount(20); setShuffleSeed(Date.now()); }}';
const PTR_NEW = 'onRefresh={() => { cursorRef.current = null; setReachedEnd(false); setVisibleCount(20); setShuffleSeed(Date.now()); loadFeedPage(true); }}';
if (s.includes('loadFeedPage(true); }}')) done.push('ptr SKIP');
else { if (s.split(PTR_OLD).length-1!==1){console.log('ERR ptr');process.exit(1);} s=s.replace(PTR_OLD,PTR_NEW); done.push('ptr OK'); }

fs.writeFileSync(p, s);
console.log('Fait: ' + done.join(', '));
// Verif : plus de feedLimit
if (/feedLimit/.test(s)) { console.log('❌ reste feedLimit'); process.exit(1); }
console.log('✅ Aucune reference feedLimit restante.');
