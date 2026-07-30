// patch-own-posts-feed.cjs  (FRONTEND — src/pages/Home.jsx)
// FIAROVANA MAFY ORINA : ny post-n'ny mpampiasa MANOKANA dia mampidirina foana ao
// amin'ny feed amin'ny alalan'ny where('uid','==',moi) (TSY orderBy → tsy manilika ny
// post null createdAt) → ny publication vaovao TSY manjavona intsony na inona na inona.
// Merge/dedup ao amin'ny feedRaw. Idempotent.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('mes propres posts (securite)')) { console.log('⏭️  deja applique'); process.exit(0); }

// Apetraka aorian'ny realtime listener (anchor : fin du listener temps réel)
const ANCHOR = `      setPostsLoading(false);
    });
  }, []);

  // Dérivé : filtre (bloqués/audience) + tri boost`;

const INSERT = `      setPostsLoading(false);
    });
  }, []);

  // Sécurité : mes propres posts (securite) → toujours dans le feed (where uid, sans orderBy)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'posts'), where('uid', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      setFeedRaw(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        const news = [];
        for (const m of mine) { if (map.has(m.id)) map.set(m.id, m); else news.push(m); }
        let arr = Array.from(map.values());
        if (news.length) arr = [...news, ...arr];
        return arr;
      });
    }, () => {});
  }, [currentUser?.uid]);

  // Dérivé : filtre (bloqués/audience) + tri boost`;

if (s.split(ANCHOR).length - 1 !== 1) { console.log('❌ ancre introuvable/multiple'); process.exit(1); }
s = s.replace(ANCHOR, INSERT);
fs.writeFileSync(p, s);
console.log('✅ Listener mes propres posts apetraka — publication vaovao tsy manjavona.');
