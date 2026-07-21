// patch-feed-simple.cjs  (FRONTEND — src/pages/Home.jsx)
// Simplification feed : UN SEUL onSnapshot temps réel (limit qui grandit au scroll),
// au lieu de 3 listeners (cursor + realtime + own-posts) qui se marchaient dessus
// et causaient le "flicker" (post vaovao hita avy tsy hita).
//   • Post vaovao (createdAt Timestamp.now) = toujours en tete (temps réel).
//   • Posts optimistes préservés jusqu'a leur arrivée dans le snapshot.
//   • Pagination = feedLimit grandit. Pull-to-refresh = reset feedLimit + seed.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('// Feed : onSnapshot temps reel unique')) { console.log('⏭️  deja applique'); process.exit(0); }

// 1) States
const ST_OLD = `  const [feedRaw, setFeedRaw] = useState([]);             // posts bruts (pagination cursor)
  const cursorRef = useRef(null);                         // dernier doc charge (startAfter)
  const loadingMoreRef = useRef(false);`;
const ST_NEW = `  const [feedRaw, setFeedRaw] = useState([]);             // posts bruts
  const [feedLimit, setFeedLimit] = useState(30);         // nb recupere (grandit au scroll)`;
if (s.split(ST_OLD).length - 1 !== 1) { console.log('❌ states'); process.exit(1); }
s = s.replace(ST_OLD, ST_NEW);

// 2) Bloc feed (loadFeedPage + 3 listeners) → 1 onSnapshot
const start = s.indexOf('  // ── Pagination CURSOR');
const end = s.indexOf('  // Dérivé : filtre');
if (start < 0 || end < 0) { console.log('❌ bloc feed introuvable'); process.exit(1); }
const BLOCK_NEW = `  // Feed : onSnapshot temps reel unique (limit grandit au scroll) — pas de flicker
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
  }, [feedLimit]);

`;
s = s.slice(0, start) + BLOCK_NEW + s.slice(end);

// 3) Trigger load-more : loadFeedPage(false) → loadFeedPage()
s = s.split('if (!reachedEnd) loadFeedPage(false);').join('if (!reachedEnd) loadFeedPage();');

// 4) Pull-to-refresh onRefresh
const PTR_OLD = "onRefresh={() => { cursorRef.current = null; setReachedEnd(false); setVisibleCount(20); setShuffleSeed(Date.now()); loadFeedPage(true); }}";
const PTR_NEW = "onRefresh={() => { setFeedLimit(30); setReachedEnd(false); setVisibleCount(20); setShuffleSeed(Date.now()); }}";
if (s.split(PTR_OLD).length - 1 === 1) s = s.replace(PTR_OLD, PTR_NEW);

// 5) Optimistic inserts : marquer _optimistic
s = s.split('createdAt: { seconds: Math.floor(Date.now() / 1000) } }, ...prev.filter(x => x.id !== postRef.id)]);')
     .join('createdAt: { seconds: Math.floor(Date.now() / 1000) }, _optimistic: true }, ...prev.filter(x => x.id !== postRef.id)]);');

fs.writeFileSync(p, s);
console.log('✅ Feed simplifié (1 onSnapshot, pas de flicker, post vaovao en tete).');
