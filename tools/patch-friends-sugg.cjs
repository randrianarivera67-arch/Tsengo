#!/usr/bin/env node
// patch-friends-sugg.cjs
// 1. Suggestions tab vaovao ao Friends.jsx (personnes à découvrir)
// 2. Badge demandes d'amis ao navbar (icon amis)

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let ok = 0, fail = 0;

function good(m) { console.log('  ✅ ' + m); ok++; }
function err(m)  { console.log('  ❌ ' + m); fail++; }
function skip(m) { console.log('  ⚠️  ' + m); }
function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
}
function write(rel, s) { fs.writeFileSync(path.join(ROOT, rel), s, 'utf8'); }
function patch(rel, from, to, label) {
  let s = read(rel); if (!s) return;
  if (!s.includes(from)) { skip('Ancre manquante: ' + label); return; }
  write(rel, s.replace(from, to));
  good(label);
}

console.log('\n══════════════════════════════════════════════');
console.log('  PATCH — Friends Suggestions + Navbar Badge');
console.log('══════════════════════════════════════════════\n');

// ══════════════════════════════════════════════
// 【1】 Friends.jsx — ajouter suggestions state + fetch + tab
// ══════════════════════════════════════════════
console.log('【1】 Friends.jsx — ajout tab Suggestions...');

// Ajouter import getDocs si pas là
let friends = read('src/pages/Friends.jsx');
if (friends && !friends.includes('getDocs')) {
  friends = friends.replace(
    `import { collection, query, where, getDocs`,
    `import { collection, query, where, getDocs`
  );
  // Check if orderBy imported
  if (!friends.includes('orderBy')) {
    friends = friends.replace(
      `import { collection, query, where, getDocs,`,
      `import { collection, query, where, getDocs, orderBy,`
    );
    write('src/pages/Friends.jsx', friends);
  }
}

// Ajouter suggestions state
patch(
  'src/pages/Friends.jsx',
  `  const [actionLoading, setActionLoading] = useState({});`,
  `  const [actionLoading, setActionLoading] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [suggLoading, setSuggLoading] = useState(false);`,
  'suggestions state ajouté'
);

// Ajouter useEffect fetch suggestions après les autres useEffects
patch(
  'src/pages/Friends.jsx',
  `  async function handleSearch(val) {`,
  `  // Fetch suggestions (utilisateurs non amis, non déjà demandés)
  useEffect(() => {
    if (!currentUser) return;
    setSuggLoading(true);
    getDocs(query(collection(db, 'users'), orderBy('fullName')))
      .then(snap => {
        const myFriends = userProfile?.friends || [];
        const sentReqs  = userProfile?.sentRequests || [];
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u =>
            u.uid !== currentUser.uid &&
            !myFriends.includes(u.uid) &&
            !sentReqs.includes(u.uid)
          );
        setSuggestions(list);
      })
      .catch(() => {})
      .finally(() => setSuggLoading(false));
  }, [currentUser, userProfile?.friends?.join?.(','), userProfile?.sentRequests?.join?.(',')]);

  async function handleSearch(val) {`,
  'useEffect suggestions ajouté'
);

// Ajouter tab Suggestions
patch(
  'src/pages/Friends.jsx',
  `  const tabs = [
    { key: 'friends', label: t('myFriends'), count: friends.length },
    { key: 'requests', label: t('pendingRequests'), count: requests.length },
    { key: 'search', label: t('search').replace('...', ''), count: 0 },
  ];`,
  `  const tabs = [
    { key: 'friends',     label: t('myFriends'),        count: friends.length },
    { key: 'requests',    label: t('pendingRequests'),   count: requests.length },
    { key: 'suggestions', label: 'Suggestions',          count: suggestions.length },
    { key: 'search',      label: t('search').replace('...', ''), count: 0 },
  ];`,
  'Tab Suggestions ajouté'
);

// Ajouter section JSX suggestions après section requests
patch(
  'src/pages/Friends.jsx',
  `      {activeTab === 'requests' && (`,
  `      {activeTab === 'suggestions' && (
        <div>
          {suggLoading ? (
            <p style={{ textAlign:'center', color:'#65676B', padding:30 }}>Chargement...</p>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <p style={{ fontSize:40, marginBottom:8 }}>🎉</p>
              <p style={{ fontWeight:700, fontSize:17, marginBottom:6 }}>Vous connaissez tout le monde !</p>
              <p style={{ color:'#65676B', fontSize:14 }}>Aucune suggestion pour l'instant.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'4px 0' }}>
              {suggestions.map(u => (
                <div key={u.uid} style={{ border:'1px solid #E4E6EB', borderRadius:14, overflow:'hidden', background:'white' }}>
                  <img
                    src={u.photoURL || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(u.fullName||'U')}&background=1877F2&color=fff\`}
                    alt=""
                    onClick={() => navigate(\`/profile/\${u.uid}\`)}
                    style={{ width:'100%', height:110, objectFit:'cover', cursor:'pointer', display:'block' }}
                  />
                  <div style={{ padding:'8px 8px 10px' }}>
                    <p
                      onClick={() => navigate(\`/profile/\${u.uid}\`)}
                      style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', marginBottom:2 }}
                    >{u.fullName}</p>
                    {u.username && <p style={{ fontSize:11, color:'#65676B', marginBottom:6 }}>@{u.username}</p>}
                    {(userProfile?.sentRequests||[]).includes(u.uid) ? (
                      <button
                        onClick={() => cancelRequest(u.uid)}
                        style={{ width:'100%', padding:'7px 0', fontSize:12, borderRadius:8, background:'#E4E6EB', color:'#65676B', border:'none', fontWeight:600, cursor:'pointer', fontFamily:'Poppins' }}
                      >Annulé</button>
                    ) : (userProfile?.friends||[]).includes(u.uid) ? (
                      <button disabled style={{ width:'100%', padding:'7px 0', fontSize:12, borderRadius:8, background:'#E4E6EB', color:'#65676B', border:'none', fontWeight:600 }}>Ami ✓</button>
                    ) : (
                      <button
                        onClick={() => sendRequest(u)}
                        disabled={actionLoading[u.uid]}
                        style={{ width:'100%', padding:'7px 0', fontSize:12, borderRadius:8, background:'#1877F2', color:'white', border:'none', fontWeight:600, cursor:'pointer', fontFamily:'Poppins', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                      >
                        <HiUserAdd size={13}/> {actionLoading[u.uid] ? '...' : 'Ajouter'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (`,
  'Section JSX Suggestions ajoutée'
);

// ══════════════════════════════════════════════
// 【2】 Layout.jsx — badge demandes d'amis sur icône Amis navbar
// ══════════════════════════════════════════════
console.log('\n【2】 Layout.jsx — badge demandes d\'amis sur navbar...');

// Ajouter friendReqCount state
patch(
  'src/components/Layout.jsx',
  `  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount }   = useMessages();`,
  `  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount }   = useMessages();

  // ✅ Badge demandes d'amis reçues
  const [friendReqCount, setFriendReqCount] = useState(0);
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => setFriendReqCount(snap.size), () => {});
    return unsub;
  }, [currentUser]);`,
  'friendReqCount state + useEffect ajouté'
);

// Ajouter badge sur l'item amis dans bottomNav
patch(
  'src/components/Layout.jsx',
  `      : { path: '/friends', icon: 'amis',   color: '#F5C518', label: 'Amis' },`,
  `      : { path: '/friends', icon: 'amis',   color: '#F5C518', label: 'Amis', badge: friendReqCount },`,
  'badge friendReqCount ajouté sur item Amis'
);

// Ajouter import collection/query/where/onSnapshot si pas déjà là
let layout = read('src/components/Layout.jsx');
if (layout) {
  const needsFirestore = !layout.includes("from 'firebase/firestore'");
  const hasCollection  = layout.includes('collection');
  if (needsFirestore) {
    layout = layout.replace(
      `import { db } from '../firebase';`,
      `import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';`
    );
    write('src/components/Layout.jsx', layout);
    good('Imports Firestore ajoutés dans Layout.jsx');
  } else if (!hasCollection) {
    // Ajouter collection/query/where/onSnapshot à l'import existant
    layout = layout.replace(
      /import \{([^}]+)\} from 'firebase\/firestore';/,
      (match, p1) => {
        const already = p1.split(',').map(s => s.trim());
        const toAdd = ['collection','query','where','onSnapshot'].filter(x => !already.includes(x));
        if (!toAdd.length) return match;
        return `import { ${[...already, ...toAdd].join(', ')} } from 'firebase/firestore';`;
      }
    );
    write('src/components/Layout.jsx', layout);
    good('collection/query/where/onSnapshot ajoutés dans Layout.jsx');
  } else {
    good('Imports Firestore déjà présents ✓');
  }
}

// ══════════════════════════════════════════════
// Résumé
// ══════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${fail} ❌`);
console.log('══════════════════════════════════════════════');
if (fail === 0) {
  console.log('\n🎉 Patch terminé! Exécute: npm run build\n');
} else {
  console.log('\n⚠️  Erreur. Envoie ce log.\n');
}
