const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('ORDRE GELÉ')) { console.log('SKIP deja'); process.exit(0); }
if (!s.includes('orderSeedRef')) {
  const anchor = '  const loadingRef = useRef(false);                       // anti double-chargement';
  if (s.split(anchor).length - 1 !== 1) { console.log('ERR ancre loadingRef ('+(s.split(anchor).length-1)+')'); process.exit(1); }
  s = s.replace(anchor, anchor + '\n  const orderSeedRef = useRef(null);');
}
const OLD = `    const sorted = [...all].sort((a, b) => scoreOf(b) - scoreOf(a));
    setPosts(sorted);
    setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
  }, [feedRaw, userProfile?.blocked, userProfile?.friends, userProfile?.following, viewerLoc?.lat, viewerLoc?.lng, shuffleSeed]);`;
const NEW = `    const byId = new Map(all.map(pp => [pp.id, pp]));
    setPosts(prev => {
      if (orderSeedRef.current !== shuffleSeed || prev.length === 0) {
        orderSeedRef.current = shuffleSeed;
        return [...all].sort((a, b) => scoreOf(b) - scoreOf(a));
      }
      // ORDRE GELÉ
      const prevIds = new Set(prev.map(pp => pp.id));
      const kept = prev.filter(pp => byId.has(pp.id)).map(pp => byId.get(pp.id));
      const news = all.filter(pp => !prevIds.has(pp.id)).sort((a, b) => scoreOf(b) - scoreOf(a));
      return news.length ? [...news, ...kept] : kept;
    });
    setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
  }, [feedRaw, userProfile?.blocked, userProfile?.friends, userProfile?.following, viewerLoc?.lat, viewerLoc?.lng, shuffleSeed]);`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre tri ('+(s.split(OLD).length-1)+')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('OK feed frozen order');
