// patch-accept-friend.cjs  (FRONTEND — src/pages/Friends.jsx)
// Accept demande d'ami MAFY ORINA : côté MOI + suppression demande EN PREMIER
// (autorisé), côté AUTRE non bloquant (peut être bloqué par les règles).
const fs = require('fs');
const p = 'src/pages/Friends.jsx';
let s = fs.readFileSync(p, 'utf8');
const OLD = `  async function acceptRequest(req) {
    setActionLoading(p => ({ ...p, [req.reqId]: true }));
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(req.fromUid) });
      await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion(currentUser.uid) });
      await deleteDoc(doc(db, 'friendRequests', req.reqId));
      await addDoc(collection(db, 'notifications'), {
        toUid: req.fromUid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendAccepted',
        message: \`\${userProfile.fullName} a accepté votre demande d'ami\`,
        read: false, createdAt: serverTimestamp(),
      });
      // ✅ FIX BUG #1: Push notification
      sendPushNotification({
        toExternalId: req.fromUid,
        title: userProfile.fullName,
        message: 'a accepté votre demande d\\'ami 🎉',
        data: { type: 'friendAccepted', fromUid: currentUser.uid },
      });
      setUserProfile(p => ({ ...p, friends: [...(p.friends || []), req.fromUid] }));
    } catch (err) { console.error(err); }
    setActionLoading(p => ({ ...p, [req.reqId]: false }));
  }`;
const NEW = `  async function acceptRequest(req) {
    setActionLoading(p => ({ ...p, [req.reqId]: true }));
    try {
      // 1. Côté MOI (autorisé) + suppression de la demande — l'accept marche toujours
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(req.fromUid) });
      setUserProfile(p => ({ ...p, friends: [...(p.friends || []), req.fromUid] }));
      await deleteDoc(doc(db, 'friendRequests', req.reqId));
      // 2. Côté AUTRE (peut être bloqué par les règles) — NON bloquant
      try { await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion(currentUser.uid) }); }
      catch (e2) { console.warn('reciprocal add bloque:', e2?.message || e2); }
      // 3. Notif + push — NON bloquant
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: req.fromUid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'friendAccepted',
          message: \`\${userProfile.fullName} a accepté votre demande d'ami\`,
          read: false, createdAt: serverTimestamp(),
        });
        sendPushNotification({
          toExternalId: req.fromUid,
          title: userProfile.fullName,
          message: 'a accepté votre demande d\\'ami 🎉',
          data: { type: 'friendAccepted', fromUid: currentUser.uid },
        });
      } catch (e3) { console.warn('notif accept:', e3?.message || e3); }
    } catch (err) { console.error(err); alert("Erreur lors de l'acceptation. Reessayez."); }
    setActionLoading(p => ({ ...p, [req.reqId]: false }));
  }`;
if (s.includes(NEW)) { console.log('⏭️  deja'); process.exit(0); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.log('❌ ancre (' + n + ')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('✅ acceptRequest mafy orina.');
