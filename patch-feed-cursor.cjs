// patch-feed-cursor.cjs  (FRONTEND — src/pages/Home.jsx)
// Cursor pagination : maka 30 VAOVAO ihany isaky ny page (startAfter), TSY mamaky
// indray ny efa nalaina → haingana be + tsy mandany quota Firestore.
//   • Première page : getDocs limit(30)
//   • Page manaraka : getDocs startAfter(dernier) limit(30) → append (dédup)
//   • Temps réel : onSnapshot limit(20) → maj réactions + prepend post vaovao
//   • Dérivé : filtre (bloqués/audience) + tri boost
// Idempotent + anchor unique guards.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;

function rep(label, oldStr, newStr) {
  if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); return; }
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
}

// 1) Import startAfter
rep('import startAfter',
  '  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc, getDocs, where\n} from \'firebase/firestore\';',
  '  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc, getDocs, where, startAfter\n} from \'firebase/firestore\';');

// 2) States : postLimit → feedRaw + refs
rep('states cursor',
  '  const [postLimit, setPostLimit] = useState(30);         // nb de posts recuperes depuis Firestore',
  '  const [feedRaw, setFeedRaw] = useState([]);             // posts bruts (pagination cursor)\n  const cursorRef = useRef(null);                         // dernier doc charge (startAfter)\n  const loadingMoreRef = useRef(false);');

// 3) Remplacement de l'effet feed
const OLD_EFFECT = `  // Load posts — pagination progressive : on augmente \`postLimit\` au scroll,
  // ce qui recharge la requete avec plus de publications depuis Firestore.
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(postLimit));
    return onSnapshot(q, snap => {
      // Si Firestore renvoie moins que demande, c'est qu'on a atteint la fin.
      setReachedEnd(snap.docs.length < postLimit);
      const blocked = userProfile?.blocked || [];
      const myFriends = userProfile?.friends || [];
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => !blocked.includes(p.uid))
        // 🔒 Audience "Amis" : hita amin'ny tompony sy ny namany ihany
        .filter(p => p.uid === currentUser?.uid || (p.audience === 'friends' ? myFriends.includes(p.uid) : p.audience !== 'me'));
      const now = new Date();
      const sorted = [...all].sort((a, b) => {
        const aB = a.isBoosted && a.boostUntil && new Date(a.boostUntil) > now
          && isInZones(viewerLoc?.lat, viewerLoc?.lng, a.boostZones);
        const bB = b.isBoosted && b.boostUntil && new Date(b.boostUntil) > now
          && isInZones(viewerLoc?.lat, viewerLoc?.lng, b.boostZones);
        return (aB && !bB) ? -1 : (!aB && bB) ? 1 : 0;
      });
      setPosts(sorted);
      setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
      setPostsLoading(false);
    });
  }, [viewerLoc?.lat, viewerLoc?.lng, postLimit]);`;

const NEW_EFFECT = `  // ── Pagination CURSOR : 30 vaovao ihany isaky ny page (startAfter), tsy re-lecture ──
  const loadFeedPage = async (first) => {
    if (loadingMoreRef.current) return;
    if (!first && (reachedEnd || !cursorRef.current)) return;
    loadingMoreRef.current = true;
    try {
      const q = first
        ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30))
        : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(cursorRef.current), limit(30));
      const snap = await getDocs(q);
      if (snap.docs.length < 30) setReachedEnd(true);
      if (snap.docs.length) cursorRef.current = snap.docs[snap.docs.length - 1];
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeedRaw(prev => {
        if (first) return rows;
        const seen = new Set(prev.map(x => x.id));
        return [...prev, ...rows.filter(x => !seen.has(x.id))];
      });
      setPostsLoading(false);
    } catch (e) { setPostsLoading(false); } finally { loadingMoreRef.current = false; }
  };

  // Première page
  useEffect(() => { loadFeedPage(true); /* eslint-disable-next-line */ }, []);

  // Temps réel : 20 plus récents → maj reactions + prepend post vaovao
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeedRaw(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        const news = [];
        for (const f of fresh) { if (map.has(f.id)) map.set(f.id, f); else news.push(f); }
        let arr = Array.from(map.values());
        if (news.length) arr = [...news, ...arr];
        return arr;
      });
      setPostsLoading(false);
    });
  }, []);

  // Dérivé : filtre (bloqués/audience) + tri boost
  useEffect(() => {
    const blocked = userProfile?.blocked || [];
    const myFriends = userProfile?.friends || [];
    const all = feedRaw
      .filter(p => !blocked.includes(p.uid))
      .filter(p => p.uid === currentUser?.uid || (p.audience === 'friends' ? myFriends.includes(p.uid) : p.audience !== 'me'));
    const now = new Date();
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

rep('effet feed → cursor', OLD_EFFECT, NEW_EFFECT);

// 4) Trigger load-more : setPostLimit → loadFeedPage
rep('trigger load-more',
  'if (feedLen >= postLimit - 15 && !reachedEnd) setPostLimit(l => l + 40);',
  'if (!reachedEnd) loadFeedPage(false);');

if (changed) fs.writeFileSync(p, s);

// Verif : plus aucune référence à postLimit
if (/postLimit/.test(s)) { console.log('❌ Il reste des références à postLimit — a verifier'); process.exit(1); }
console.log('✅ Cursor pagination apetraka (30/page, tsy re-lecture, realtime top).');
