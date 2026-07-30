// patch-accept-green.cjs (FRONTEND — Friends.jsx + index.css)
// 1. acceptRequest resilient : critique (mes amis) = alerte si echec ; le reste
//    (delete demande, reciprocal, notif) NON bloquant → plus d'erreur intempestive.
// 2. Bouton : check VERT + animation "pop" rehefa accepté, dia esorina amin'ny liste.
const fs = require('fs');

// ---- Friends.jsx ----
let s = fs.readFileSync('src/pages/Friends.jsx', 'utf8');

// State acceptedIds
if (!s.includes('acceptedIds')) {
  s = s.replace('  const [requests, setRequests] = useState([]);',
    '  const [requests, setRequests] = useState([]);\n  const [acceptedIds, setAcceptedIds] = useState({});');
}

// acceptRequest → resilient + optimistic vert
const OLD_FN_START = '  async function acceptRequest(req) {';
const idx = s.indexOf(OLD_FN_START);
const idxEnd = s.indexOf('\n  }', s.indexOf('setActionLoading(p => ({ ...p, [req.reqId]: false }));', idx)) + 4;
if (idx < 0 || idxEnd < 4) { console.log('❌ acceptRequest introuvable'); process.exit(1); }
const NEW_FN = `  async function acceptRequest(req) {
    if (actionLoading[req.reqId] || acceptedIds[req.reqId]) return;
    setActionLoading(p => ({ ...p, [req.reqId]: true }));
    // Critique : ajouter l'ami de MON cote (autorise). Si echec -> alerte.
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(req.fromUid) });
      setUserProfile(p => ({ ...p, friends: [...(p.friends || []), req.fromUid] }));
    } catch (err) {
      console.error(err);
      setActionLoading(p => ({ ...p, [req.reqId]: false }));
      alert("Erreur lors de l'acceptation. Reessayez.");
      return;
    }
    // Succes -> animation VERTE
    setAcceptedIds(p => ({ ...p, [req.reqId]: true }));
    // Le reste NON bloquant (les regles peuvent bloquer)
    try { await deleteDoc(doc(db, 'friendRequests', req.reqId)); } catch (e) { console.warn('delete req:', e?.message || e); }
    try { await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion(currentUser.uid) }); } catch (e) { console.warn('reciprocal:', e?.message || e); }
    try {
      await addDoc(collection(db, 'notifications'), {
        toUid: req.fromUid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendAccepted',
        message: \`\${userProfile.fullName} a accepté votre demande d'ami\`,
        read: false, createdAt: serverTimestamp(),
      });
      sendPushNotification({
        toExternalId: req.fromUid, title: userProfile.fullName,
        message: 'a accepté votre demande d\\'ami 🎉',
        data: { type: 'friendAccepted', fromUid: currentUser.uid },
      });
    } catch (e) { console.warn('notif accept:', e?.message || e); }
    setActionLoading(p => ({ ...p, [req.reqId]: false }));
    // Retirer de la liste apres l'animation
    setTimeout(() => setRequests(prev => prev.filter(r => r.reqId !== req.reqId)), 900);
  }`;
s = s.slice(0, idx) + NEW_FN + s.slice(idxEnd);

// Bouton : vert + animation
const BTN_OLD = `                    onClick={() => acceptRequest(req)}
                    disabled={actionLoading[req.reqId]}
                    style={{ background: '#1877F2', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}`;
const BTN_NEW = `                    onClick={() => acceptRequest(req)}
                    disabled={actionLoading[req.reqId] || acceptedIds[req.reqId]}
                    style={{ background: acceptedIds[req.reqId] ? '#22c55e' : '#1877F2', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .3s ease', animation: acceptedIds[req.reqId] ? 'accept-pop .45s ease' : undefined }}`;
if (s.split(BTN_OLD).length - 1 === 1) s = s.replace(BTN_OLD, BTN_NEW);
else console.log('⚠️  bouton anchor tsy hita (mety efa novana)');

fs.writeFileSync('src/pages/Friends.jsx', s);

// ---- index.css : keyframes accept-pop ----
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('accept-pop')) {
  css += '\n@keyframes accept-pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }\n';
  fs.writeFileSync('src/index.css', css);
}
console.log('✅ Accept resilient + check vert + animation.');
