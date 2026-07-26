const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

const OLD_DEL = `    if (!window.confirm('Supprimer cette publication ?')) return;
    await deleteDoc(doc(db,'posts',postId));`;
if (s.includes(OLD_DEL)) {
  if (s.split(OLD_DEL).length - 1 !== 1) { console.log('ERR ancre deletePost'); process.exit(1); }
  s = s.replace(OLD_DEL, `    if (!window.confirm('Supprimer cette publication ?')) return;
    // Retrait IMMEDIAT de l'affichage (le listener temps reel ne retire jamais)
    setOrder(prev => prev.filter(id => id !== postId));
    setFeedRaw(prev => prev.filter(x => x.id !== postId));
    setPendingNew(prev => prev.filter(x => x.id !== postId));
    try { ownFreshIdsRef.current.delete(postId); } catch {}
    try { optimisticIdsRef.current.delete(postId); } catch {}
    try {
      await deleteDoc(doc(db,'posts',postId));
    } catch (e) {
      alert('Suppression impossible : ' + (e?.message || e));
    }`);
  done.push('suppression immediate');
} else done.push('suppression (deja)');

if (!s.includes('feedRefreshing')) {
  const a = "  const [pendingNew, setPendingNew] = useState([]);  // posts vaovao (olon-kafa) miandry refresh";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre pendingNew ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, a + "\n  const [feedRefreshing, setFeedRefreshing] = useState(false);  // overlay flou + logo");
  done.push('etat overlay');
}

if (!s.includes('setFeedRefreshing(true)')) {
  const a = "  const refreshFeed = async () => {\n    feedSnapshot = null;                            // refresh = fil vaovao";
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre refreshFeed ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, "  const refreshFeed = async () => {\n    setFeedRefreshing(true);\n    feedSnapshot = null;                            // refresh = fil vaovao");

  const b = "    await loadFeedPage(true);\n  };";
  if (s.split(b).length - 1 !== 1) { console.log('ERR ancre fin refreshFeed ('+(s.split(b).length-1)+')'); process.exit(1); }
  s = s.replace(b, "    try { await loadFeedPage(true); } finally { setFeedRefreshing(false); }\n  };");
  done.push('overlay pendant refresh');
}

if (!s.includes('feed-refresh-overlay')) {
  const a = '      {/* Bouton "nouvelles publications" (façon Facebook) — miseho rehefa misy';
  if (s.split(a).length - 1 !== 1) { console.log('ERR ancre rendu overlay ('+(s.split(a).length-1)+')'); process.exit(1); }
  s = s.replace(a, `      {/* Rafraichissement : meme retour visuel que "tirer pour actualiser" */}
      {feedRefreshing && (
        <div data-x="feed-refresh-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(127,127,127,0.18)',
          backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <img src="/icon-192.png" alt="" width={62} height={62}
            style={{ borderRadius: '50%', boxShadow: '0 4px 18px rgba(0,0,0,.18)', animation: 'trengo-spin .8s linear infinite' }} />
        </div>
      )}

${a}`);
  done.push('rendu overlay');
}

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
