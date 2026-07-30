// patch-feed-facebook.cjs  (FRONTEND — src/pages/Home.jsx)
// 1. Feed toy Facebook : ordre = récence + affinité (amis/following) + jitter(seed)
//    → miovaova isaky ny refresh, post an'ny amis/followers miakatra bebe kokoa.
// 2. Pull-to-refresh : ampifandraisina amin'ny reload feed + seed vaovao.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;
function rep(label, oldStr, newStr) {
  if (s.includes(newStr)) { console.log('  ⏭️  ' + label); return; }
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.log('  ❌ ' + label + ' (' + n + ')'); process.exit(1); }
  s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
}
rep('state shuffleSeed',
  '  const [reachedEnd, setReachedEnd] = useState(false);    // plus rien a charger cote serveur',
  '  const [reachedEnd, setReachedEnd] = useState(false);    // plus rien a charger cote serveur\n  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());');
const OLD = `    const now = new Date();
    const sorted = [...all].sort((a, b) => {
      const aB = a.isBoosted && a.boostUntil && new Date(a.boostUntil) > now
        && isInZones(viewerLoc?.lat, viewerLoc?.lng, a.boostZones);
      const bB = b.isBoosted && b.boostUntil && new Date(b.boostUntil) > now
        && isInZones(viewerLoc?.lat, viewerLoc?.lng, b.boostZones);
      return (aB && !bB) ? -1 : (!aB && bB) ? 1 : 0;
    });
    setPosts(sorted);
    setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
  }, [feedRaw, userProfile?.blocked, userProfile?.friends, viewerLoc?.lat, viewerLoc?.lng]);`;
const NEW = `    const nowMs = Date.now();
    const nowD = new Date();
    const aff = new Set([...(userProfile?.friends || []), ...(userProfile?.following || [])]);
    const tsMs = (v) => {
      if (!v) return 0;
      if (typeof v.toDate === 'function') return v.toDate().getTime();
      if (typeof v.seconds === 'number') return v.seconds * 1000;
      if (typeof v._seconds === 'number') return v._seconds * 1000;
      if (v instanceof Date) return v.getTime();
      const t = new Date(v).getTime();
      return isNaN(t) ? 0 : t;
    };
    const rnd = (id) => {
      let h = 2166136261; const str = String(id) + ':' + shuffleSeed;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 1000) / 1000;
    };
    const scoreOf = (pp) => {
      const boosted = pp.isBoosted && pp.boostUntil && new Date(pp.boostUntil) > nowD
        && isInZones(viewerLoc?.lat, viewerLoc?.lng, pp.boostZones);
      const hoursAgo = (nowMs - tsMs(pp.createdAt)) / 3600000;
      return (boosted ? 1e6 : 0) - hoursAgo + (aff.has(pp.uid) ? 14 : 0) + rnd(pp.id) * 8;
    };
    const sorted = [...all].sort((a, b) => scoreOf(b) - scoreOf(a));
    setPosts(sorted);
    setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
  }, [feedRaw, userProfile?.blocked, userProfile?.friends, userProfile?.following, viewerLoc?.lat, viewerLoc?.lng, shuffleSeed]);`;
rep('feed sort Facebook-like', OLD, NEW);
rep('pull-to-refresh onRefresh',
  '      <PullToRefresh />',
  '      <PullToRefresh onRefresh={() => { cursorRef.current = null; setReachedEnd(false); setVisibleCount(20); setShuffleSeed(Date.now()); loadFeedPage(true); }} />');
if (changed) fs.writeFileSync(p, s);
console.log('✅ Feed Facebook-like + pull-to-refresh.');
