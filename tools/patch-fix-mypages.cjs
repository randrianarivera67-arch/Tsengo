// patch-fix-mypages.cjs (FRONTEND — src/components/Layout.jsx)
// BUG : useEffect résiduel appelle un setter d'un state supprimé (Page Sera)
// → ReferenceError quand le snapshot 'pages' arrive → casse Firestore/feed.
// Le state n'est utilisé NULLE PART → on supprime ce useEffect mort.
const fs = require('fs');
const p = 'src/components/Layout.jsx';
let s = fs.readFileSync(p, 'utf8');
const NEEDLE = 'setMyPagesList';
if (!s.includes(NEEDLE)) { console.log('SKIP deja corrige'); process.exit(0); }
const DEAD = `  // Page Sera supprimée
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'pages'), where('admins', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, snap => setMyPagesList(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, [currentUser]);`;
if (s.split(DEAD).length - 1 !== 1) { console.log('ERR bloc introuvable (' + (s.split(DEAD).length-1) + ')'); process.exit(1); }
s = s.replace(DEAD, '  // Page Sera supprimee (ancien listener retire)');
fs.writeFileSync(p, s);
console.log('OK listener mort retire');
