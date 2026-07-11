// src/pages/Friends.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  onSnapshot, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getChatId } from '../utils/chat';
import { sendPushNotification } from '../utils/onesignal';
import { HiSearch, HiUserAdd, HiUserRemove, HiPaperAirplane, HiCheck, HiX, HiUsers } from 'react-icons/hi';

function VIPBadge() {
  return <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>;
}

export default function Friends() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!userProfile?.friends?.length) { setFriends([]); return; }
    Promise.all(
      userProfile.friends.map(uid =>
        getDoc(doc(db, 'users', uid)).then(s => s.exists() ? { uid: s.id, ...s.data() } : null)
      )
    ).then(list => setFriends(list.filter(Boolean)));
  }, [userProfile?.friends?.join?.(',')]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', currentUser.uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, async snap => {
      const reqs = [];
      for (const d of snap.docs) {
        const data = d.data();
        const userSnap = await getDoc(doc(db, 'users', data.fromUid));
        if (userSnap.exists()) reqs.push({ reqId: d.id, ...data, user: userSnap.data() });
      }
      setRequests(reqs);
    });
    return unsub;
  }, [currentUser]);

  async function handleSearch(val) {
    setSearch(val);
    if (!val.trim() || val.length < 2) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const byUsername = query(collection(db, 'users'), where('username', '>=', val.toLowerCase()), where('username', '<=', val.toLowerCase() + '\uf8ff'));
      const byName = query(collection(db, 'users'), where('fullName', '>=', val), where('fullName', '<=', val + '\uf8ff'));
      const [s1, s2] = await Promise.all([getDocs(byUsername), getDocs(byName)]);
      const seen = new Set();
      const results = [];
      [...s1.docs, ...s2.docs].forEach(d => {
        if (d.id === currentUser.uid || seen.has(d.id)) return;
        seen.add(d.id); results.push({ uid: d.id, ...d.data() });
      });
      setSearchResults(results);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function cancelRequest(toUid) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { sentRequests: arrayRemove(toUid) });
      setUserProfile(p => ({ ...p, sentRequests: (p.sentRequests||[]).filter(id => id !== toUid) }));
    } catch(e) { console.warn('cancelRequest:', e); }
  }

  async function sendRequest(toUser) {
    if (!toUser?.uid) return;
    setActionLoading(p => ({ ...p, [toUser.uid]: true }));
    try {
      const existing = query(collection(db, 'friendRequests'), where('fromUid', '==', currentUser.uid), where('toUid', '==', toUser.uid));
      const snap = await getDocs(existing);
      if (!snap.empty) return;
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: currentUser.uid, toUid: toUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        status: 'pending', createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        toUid: toUser.uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendRequest',
        message: `${userProfile.fullName} ${t('addFriend').toLowerCase()}`,
        read: false, createdAt: serverTimestamp(),
      });
      // ✅ FIX BUG #1: Push notification
      sendPushNotification({
        toExternalId: toUser.uid,
        title: userProfile.fullName,
        message: 'vous a envoyé une demande d\'ami 👥',
        data: { type: 'friendRequest', fromUid: currentUser.uid },
      });
      await updateDoc(doc(db, 'users', currentUser.uid), { sentRequests: arrayUnion(toUser.uid) });
      setUserProfile(p => ({ ...p, sentRequests: [...(p.sentRequests || []), toUser.uid] }));
    } catch (err) { console.error(err); }
    setActionLoading(p => ({ ...p, [toUser.uid]: false }));
  }

  async function acceptRequest(req) {
    setActionLoading(p => ({ ...p, [req.reqId]: true }));
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(req.fromUid) });
      await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion(currentUser.uid) });
      await deleteDoc(doc(db, 'friendRequests', req.reqId));
      await addDoc(collection(db, 'notifications'), {
        toUid: req.fromUid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendAccepted',
        message: `${userProfile.fullName} a accepté votre demande d'ami`,
        read: false, createdAt: serverTimestamp(),
      });
      // ✅ FIX BUG #1: Push notification
      sendPushNotification({
        toExternalId: req.fromUid,
        title: userProfile.fullName,
        message: 'a accepté votre demande d\'ami 🎉',
        data: { type: 'friendAccepted', fromUid: currentUser.uid },
      });
      setUserProfile(p => ({ ...p, friends: [...(p.friends || []), req.fromUid] }));
    } catch (err) { console.error(err); }
    setActionLoading(p => ({ ...p, [req.reqId]: false }));
  }

  async function declineRequest(req) {
    await deleteDoc(doc(db, 'friendRequests', req.reqId));
  }

  async function removeFriend(friendUid) {
    if (!window.confirm('Esory ny namana?')) return;
    await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayRemove(friendUid) });
    await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(currentUser.uid) });
    setUserProfile(p => ({ ...p, friends: (p.friends || []).filter(u => u !== friendUid) }));
    setFriends(p => p.filter(f => f.uid !== friendUid));
  }

  async function blockFriend(friendUid) {
    if (!window.confirm("Bloquer cet ami ?")) return;
    await updateDoc(doc(db, "users", currentUser.uid), { friends: arrayRemove(friendUid), blocked: arrayUnion(friendUid) });
    await updateDoc(doc(db, "users", friendUid), { friends: arrayRemove(currentUser.uid) });
    setUserProfile(p => ({ ...p, friends: (p.friends || []).filter(u => u !== friendUid), blocked: [...(p.blocked || []), friendUid] }));
    setFriends(p => p.filter(f => f.uid !== friendUid));
  }

  function getRelation(uid) {
    if ((userProfile?.friends || []).includes(uid)) return 'friend';
    if ((userProfile?.sentRequests || []).includes(uid)) return 'sent';
    return 'none';
  }

  const tabs = [
    { key: 'friends', label: t('myFriends'), count: friends.length },
    { key: 'requests', label: t('pendingRequests'), count: requests.length },
    { key: 'search', label: t('search').replace('...', ''), count: 0 },
  ];

  return (
    <div style={{ padding: '16px 12px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1877F2', marginBottom: 14 }}>{t('friends')}</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
              background: activeTab === tab.key ? '#1877F2' : '#E4E6EB',
              color: activeTab === tab.key ? 'white' : '#1877F2',
            }}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab === 'search' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} size={18} />
            <input className="input" placeholder={t('search')} value={search} onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          {loading && <p style={{ textAlign: 'center', color: '#65676B' }}>{t('loading')}</p>}
          {searchResults.map(user => {
            const rel = getRelation(user.uid);
            return (
              <div key={user.uid} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=1877F2&color=fff`}
                  alt=""
                  onClick={() => navigate(`/profile/${user.uid}`)}
                  style={{ cursor: 'pointer', width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{user.fullName}{user.isVip && <VIPBadge />}</p>
                  <p style={{ fontSize: 13, color: '#65676B' }}>@{user.username}</p>
                  <p style={{ fontSize: 12, color: '#65676B' }}>{user.friends?.length || 0} {t('myFriends').toLowerCase()}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rel === 'friend' ? (
                    <>
                      <button
                        onClick={() => navigate(`/messages/${getChatId(currentUser.uid, user.uid)}`)}
                        style={{ background: '#E4E6EB', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#1877F2', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <HiPaperAirplane size={14} /> {t('message')}
                      </button>
                      <button onClick={() => removeFriend(user.uid)} style={{ background: 'none', border: '1px solid #E4E6EB', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', color: '#65676B', fontSize: 12 }}>
                        {t('removeFriend')}
                      <button onClick={() => blockFriend(user.uid)} style={{ background: "none", border: "1px solid #1877F2", borderRadius: 20, padding: "5px 12px", cursor: "pointer", color: "#1877F2", fontSize: 12 }}>
                        🚫 Bloquer
                      </button>
                      </button>
                    </>
                  ) : rel === 'sent' ? (
                    <span style={{ color: '#65676B', fontSize: 13, fontStyle: 'italic' }}>Voaravina...</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(user)}
                      disabled={actionLoading[user.uid]}
                      className="btn-primary"
                      style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <HiUserAdd size={14} /> {t('addFriend')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Friends list */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <HiUsers size={48} color="#E4E6EB" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#65676B' }}>{t('noFriends')}</p>
              <button onClick={() => setActiveTab('search')} className="btn-primary" style={{ marginTop: 14, fontSize: 13 }}>{t('search')}</button>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.uid} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=1877F2&color=fff`}
                  alt=""
                  style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => navigate(`/profile/${friend.uid}`)}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{friend.fullName}{friend.isVip && <VIPBadge />}</p>
                  <p style={{ fontSize: 13, color: '#65676B' }}>@{friend.username}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => navigate(`/messages/${getChatId(currentUser.uid, friend.uid)}`)}
                    style={{ background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiPaperAirplane size={17} />
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${friend.uid}`)}
                    style={{ background: '#E4E6EB', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiUserAdd size={17} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests */}
      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#65676B' }}>Tsy misy fangatahana</div>
          ) : (
            requests.map(req => (
              <div key={req.reqId} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={req.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.fullName)}&background=1877F2&color=fff`}
                  alt=""
                  style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => navigate(`/profile/${req.fromUid}`)}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{req.user.fullName}{req.user.isVip && <VIPBadge />}</p>
                  <p style={{ fontSize: 13, color: '#65676B' }}>@{req.user.username}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => acceptRequest(req)}
                    disabled={actionLoading[req.reqId]}
                    style={{ background: '#1877F2', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiCheck size={18} />
                  </button>
                  <button
                    onClick={() => declineRequest(req)}
                    style={{ background: '#E4E6EB', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiX size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
