#!/usr/bin/env node
// patch-A.cjs — Asa A rehetra:
// 1. "Voir tout" — musiques, amis, groupes, stories, boutique
// 2. "Annulé" (fohy) — friend request
// 3. Réaction J'aime → SVG néon bleu (tsy emoji 👍)
// 4. Suggestions boutique isakin'ny 8 publication

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
let ok = 0, warn = 0, fail = 0;

function good(m) { console.log('  ✅ ' + m); ok++; }
function skip(m) { console.log('  ⚠️  ' + m); warn++; }
function err(m)  { console.log('  ❌ ' + m); fail++; }

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { err('Introuvable: ' + rel); return null; }
  return fs.readFileSync(p, 'utf8');
}
function write(rel, s) { fs.writeFileSync(path.join(ROOT, rel), s, 'utf8'); }
function patch(rel, from, to, label) {
  let s = read(rel); if (!s) return;
  if (!s.includes(from)) { skip('Déjà patché / ancre manquante: ' + label); return; }
  write(rel, s.replace(from, to));
  good(label);
}

console.log('\n══════════════════════════════════════════════');
console.log('  PATCH A — Voir tout + Annulé + NeonLike bleu');
console.log('══════════════════════════════════════════════\n');

// ══════════════════════════════════════════════
// 【A1】 Annulé la demande (Home.jsx — suggestions amis)
// ══════════════════════════════════════════════
console.log('【A1】 "Annulé" au lieu de "Demande envoyée" (Home.jsx)...');
patch(
  'src/pages/Home.jsx',
  `{hasSentReq(u.uid)
                          ? <button disabled className="btn-secondary" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>Demande envoyée</button>
                          : <button onClick={() => sendFriendReq(u.uid, u.fullName)} className="btn-blue" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <HiUserAdd size={14}/> Ajouter
                            </button>}`,
  `{hasSentReq(u.uid)
                          ? <button onClick={() => cancelFriendReq(u.uid)} className="btn-secondary" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>Annulé</button>
                          : <button onClick={() => sendFriendReq(u.uid, u.fullName)} className="btn-blue" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <HiUserAdd size={14}/> Ajouter
                            </button>}`,
  '"Annulé" bouton ao suggestions amis (Home)'
);

// ══════════════════════════════════════════════
// 【A2】 cancelFriendReq function (Home.jsx)
// ══════════════════════════════════════════════
console.log('\n【A2】 cancelFriendReq function (Home.jsx)...');
patch(
  'src/pages/Home.jsx',
  `  function hasSentReq(uid) { return (userProfile?.sentRequests||[]).includes(uid); }`,
  `  function hasSentReq(uid) { return (userProfile?.sentRequests||[]).includes(uid); }

  async function cancelFriendReq(toUid) {
    try {
      await updateDoc(doc(db,'users',currentUser.uid), { sentRequests: arrayRemove(toUid) });
      setUserProfile(p => ({ ...p, sentRequests: (p.sentRequests||[]).filter(id => id !== toUid) }));
      // Supprimer la notif friendRequest correspondante
      const { getDocs, query, collection, where, deleteDoc } = await import('firebase/firestore');
      const q = query(collection(db,'notifications'),
        where('fromUid','==',currentUser.uid),
        where('toUid','==',toUid),
        where('type','==','friendRequest'));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch(e) { console.warn('cancelFriendReq:', e); }
  }`,
  'cancelFriendReq function ajoutée'
);

// ══════════════════════════════════════════════
// 【A3】 Réaction J'aime → SVG néon bleu (REACTIONS sans 👍)
// ══════════════════════════════════════════════
console.log('\n【A3】 Réaction J\'aime → SVG néon bleu (Home.jsx)...');
patch(
  'src/pages/Home.jsx',
  `const REACTIONS   = ['❤️','😂','😮','😢','😡','👍'];`,
  `const REACTIONS   = ['❤️','😂','😮','😢','😡'];`,
  'REACTIONS: 👍 retiré (remplacé par NeonLike SVG)'
);

// Le bouton J'aime — actif = bleu néon, inactif = gris
patch(
  'src/pages/Home.jsx',
  `                  style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight:700 } : {}}>
                  {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19}/>} J'aime`,
  `                  style={myR ? { color: myR === '❤️' ? '#FF2D8D' : '#1877F2', fontWeight:700 } : {}}>
                  {myR ? <span style={{ fontSize:17 }}>{myR}</span> : <NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/>} J'aime`,
  'Bouton J\'aime — bleu actif, gris inactif'
);

// quickLike — utilise ❤️ par défaut (plus de 👍)
patch(
  'src/pages/Home.jsx',
  `    reactToPost(post.id, myR || '👍');`,
  `    reactToPost(post.id, myR || '❤️');`,
  'quickLike default → ❤️'
);

// Commentaire J'aime (tsy 👍 intsony)
patch(
  'src/pages/Home.jsx',
  `<span onClick={() => reactToCmt(post.id, c.id, '👍')}
                          style={{ cursor:'pointer', color: myCR ? (myCR === '👍' ? '#1877F2' : '#FF2D8D') : '#65676B' }}>
                          {myCR && myCR !== '👍' ? myCR + ' ' : ''}J'aime`,
  `<span onClick={() => reactToCmt(post.id, c.id, '❤️')}
                          style={{ cursor:'pointer', color: myCR ? '#FF2D8D' : '#65676B', fontWeight: myCR ? 700 : 400 }}>
                          {myCR && myCR !== '❤️' ? myCR + ' ' : ''}J'aime`,
  'Commentaire J\'aime → ❤️ par défaut'
);

// ══════════════════════════════════════════════
// 【A4】 Voir tout — MusicRow
// ══════════════════════════════════════════════
console.log('\n【A4】 "Voir tout" — Musiques (Home.jsx MusicRow)...');
patch(
  'src/pages/Home.jsx',
  `      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>Suggestions musicales pour vous</span>
      </div>`,
  `      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>Suggestions musicales pour vous</span>
        <button onClick={onVoirTout} style={{ background:'none', border:'none', color:'#1877F2', fontWeight:700, fontSize:13, cursor:'pointer', padding:'2px 6px', fontFamily:'Poppins' }}>Voir tout</button>
      </div>`,
  '"Voir tout" ajouté dans MusicRow header'
);

// Ajouter onVoirTout prop à MusicRow
patch(
  'src/pages/Home.jsx',
  `function MusicRow({ tracks, playingId, onToggle, onArtist, onSave, onBlock, savedIds = [], blockedIds = [], onFollow, onMessage, followedArtists = [], onShare }) {`,
  `function MusicRow({ tracks, playingId, onToggle, onArtist, onSave, onBlock, savedIds = [], blockedIds = [], onFollow, onMessage, followedArtists = [], onShare, onVoirTout }) {`,
  'onVoirTout prop ajouté à MusicRow'
);

// Passer onVoirTout au MusicRow dans le fil
patch(
  'src/pages/Home.jsx',
  `            <MusicRow
              tracks={posts.filter(p => p.mediaType === 'audio' && p.isMusic)}`,
  `            <MusicRow
              onVoirTout={() => navigate('/artists')}
              tracks={posts.filter(p => p.mediaType === 'audio' && p.isMusic)}`,
  'onVoirTout → /artists passé à MusicRow'
);

// ══════════════════════════════════════════════
// 【A5】 Voir tout — Suggestions amis, groupes, stories
// ══════════════════════════════════════════════
console.log('\n【A5】 "Voir tout" — Suggestions amis/groupes/stories (Home.jsx)...');

// Groupes
patch(
  'src/pages/Home.jsx',
  `                  <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Groupes que vous pourriez rejoindre</p>`,
  `                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 10px' }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0 }}>Groupes que vous pourriez rejoindre</p>
                    <button onClick={() => navigate('/groups')} style={{ background:'none', border:'none', color:'#1877F2', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Voir tout</button>
                  </div>`,
  '"Voir tout" groupes'
);

// Stories
patch(
  'src/pages/Home.jsx',
  `                  <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Stories</p>`,
  `                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 10px' }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0 }}>Stories</p>
                    <button onClick={() => navigate('/', { state: { scrollToStories: true } })} style={{ background:'none', border:'none', color:'#1877F2', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Voir tout</button>
                  </div>`,
  '"Voir tout" stories'
);

// Suggestions amis
patch(
  'src/pages/Home.jsx',
  `                <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Personnes que vous connaissez peut-être</p>`,
  `                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 10px' }}>
                  <p style={{ fontWeight:700, fontSize:15, margin:0 }}>Personnes que vous connaissez peut-être</p>
                  <button onClick={() => navigate('/friends')} style={{ background:'none', border:'none', color:'#1877F2', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Voir tout</button>
                </div>`,
  '"Voir tout" suggestions amis'
);

// ══════════════════════════════════════════════
// 【A6】 Suggestions boutique isakin'ny 8 publication
// ══════════════════════════════════════════════
console.log('\n【A6】 Suggestions boutique isakin\'ny 8 publication (Home.jsx)...');

// Add shops state
patch(
  'src/pages/Home.jsx',
  `  const [pageGroups, setPageGroups] = useState([]);   // groupes publics (suggestions)`,
  `  const [pageGroups, setPageGroups] = useState([]);   // groupes publics (suggestions)
  const [shopSuggestions, setShopSuggestions] = useState([]); // boutiques suggestions`,
  'shopSuggestions state ajouté'
);

// Fetch shops after pageGroups fetch
patch(
  'src/pages/Home.jsx',
  `  // Suggestions d'amis (personnes non amies)`,
  `  // Boutiques suggestions
  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc')))
      .then(snap => setShopSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 16)))
      .catch(() => {});
  }, [currentUser]);

  // Suggestions d'amis (personnes non amies)`,
  'useEffect boutiques ajouté'
);

// Inject boutique suggestions block into the rotation (after pIdx+1 % 8 === 0)
patch(
  'src/pages/Home.jsx',
  `          {/* Suggestions en rotation toutes les 10 publications : amis → groupes → stories */}
          {(pIdx + 1) % 10 === 0 && (() => {`,
  `          {/* Suggestions boutique toutes les 8 publications */}
          {(pIdx + 1) % 8 === 0 && shopSuggestions.length > 0 && (() => {
            const shopOff = (Math.floor((pIdx + 1) / 8) - 1) * 4 % shopSuggestions.length;
            const shopChunk = [...shopSuggestions.slice(shopOff), ...shopSuggestions.slice(0, shopOff)].slice(0, 4);
            return (
              <div className="card post-card" style={{ marginBottom:14, padding:'12px 0' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 10px' }}>
                  <p style={{ fontWeight:700, fontSize:15, margin:0 }}>Boutiques à découvrir</p>
                  <button onClick={() => navigate('/shop')} style={{ background:'none', border:'none', color:'#1877F2', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Voir tout</button>
                </div>
                <div style={{ display:'flex', gap:10, overflowX:'auto', padding:'0 16px 4px', scrollbarWidth:'none' }}>
                  {shopChunk.map(sh => (
                    <div key={sh.id} onClick={() => navigate(\`/shop/\${sh.id}\`)} style={{ flexShrink:0, width:140, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', background:'white', cursor:'pointer' }}>
                      <div style={{ width:'100%', height:80, background:'linear-gradient(135deg,#FF2D8D,#FF6BB5)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                        {sh.photoURL
                          ? <img src={sh.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          : <HiShoppingBag size={28} color="white"/>}
                      </div>
                      <div style={{ padding:'8px 8px 10px' }}>
                        <p style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sh.name}</p>
                        <p style={{ fontSize:11, color:'#65676B' }}>{sh.category || 'Boutique'}</p>
                        <button className="btn-blue" style={{ width:'100%', marginTop:6, padding:'6px 0', fontSize:12, borderRadius:8 }}>Voir la boutique</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Suggestions en rotation toutes les 10 publications : amis → groupes → stories */}
          {(pIdx + 1) % 10 === 0 && (() => {`,
  'Suggestions boutique isakin\'ny 8 pub ajoutées'
);

// Add missing imports if needed
let home = read('src/pages/Home.jsx');
if (home && !home.includes('arrayRemove')) {
  home = home.replace(
    `import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, getDocs, writeBatch, arrayRemove, deleteDoc } from 'firebase/firestore';`,
    `import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, arrayRemove, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';`
  );
  write('src/pages/Home.jsx', home);
  good('arrayRemove import vérifié');
}

// ══════════════════════════════════════════════
// 【A7】 Annulé — Friends.jsx aussi
// ══════════════════════════════════════════════
console.log('\n【A7】 "Annulé" — Friends.jsx...');
patch(
  'src/pages/Friends.jsx',
  `                      {status === 'sent' && (
                        <button disabled style={{ fontSize:12, padding:'7px 14px', borderRadius:20, background:'#E4E6EB', color:'#65676B', border:'none', fontWeight:600 }}>
                          Demande envoyée
                        </button>`,
  `                      {status === 'sent' && (
                        <button onClick={() => cancelRequest(user.uid)} style={{ fontSize:12, padding:'7px 14px', borderRadius:20, background:'#E4E6EB', color:'#65676B', border:'none', fontWeight:600, cursor:'pointer' }}>
                          Annulé
                        </button>`,
  '"Annulé" clicable dans Friends.jsx'
);

// cancelRequest function dans Friends.jsx
patch(
  'src/pages/Friends.jsx',
  `  async function sendRequest(toUser) {`,
  `  async function cancelRequest(toUid) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { sentRequests: arrayRemove(toUid) });
      setUserProfile(p => ({ ...p, sentRequests: (p.sentRequests||[]).filter(id => id !== toUid) }));
    } catch(e) { console.warn('cancelRequest:', e); }
  }

  async function sendRequest(toUser) {`,
  'cancelRequest function ajoutée dans Friends.jsx'
);

// ══════════════════════════════════════════════
// Résumé
// ══════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log(`  Résultat: ${ok} ✅  ${warn} ⚠️   ${fail} ❌`);
console.log('══════════════════════════════════════════════');
if (fail === 0) {
  console.log('\n🎉 Patch A terminé! Exécute: npm run build\n');
} else {
  console.log('\n⚠️  Des erreurs. Envoie ce log pour correction.\n');
}
