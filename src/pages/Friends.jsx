// src/pages/Friends.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  onSnapshot, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { sendNotification } from '../utils/notify';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { HiSearch, HiUserAdd, HiUserRemove, HiChat, HiCheck, HiX, HiUsers } from 'react-icons/hi';

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

  // Load friends
  useEffect(() => {
    if (!userProfile?.friends?.length) { setFriends([]); return; }
    Promise.all(
      userProfile.friends.map(uid =>
        getDoc(doc(db, 'users', uid)).then(s => s.exists() ? s.data() : null)
      )
    ).then(list => setFriends(list.filter(Boolean)));
  }, [userProfile?.friends]);

  // Load incoming requests
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', currentUser.uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, async (snap) => {
      const reqs = [];
      for (const d of snap.docs) {
        const data = d.data();
        const userSnap = await getDoc(doc(db, 'users', data.fromUid));
        if (userSnap.exists()) {
          reqs.push({ reqId: d.id, ...data, user: userSnap.data() });
        }
      }
      setRequests(reqs);
    });
    return unsub;
  }, [currentUser]);

  // Search users
  async function handleSearch(val) {
    setSearch(val);
    if (!val.trim() || val.length < 2) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const byUsername = query(collection(db, 'users'), where('username', '>=', val.toLowerCase()), where('username', '<=', val.toLowerCase() + '\uf8ff'));
      const byName = query(collection(db, 'users'), where('fullName', '>=', val), where('fullName', '<=', val + '\uf8ff'));
      const [snap1, snap2] = await Promise.all([getDocs(byUsername), getDocs(byName)]);
      const seen = new Set();
      const results = [];
      [...snap1.docs, ...snap2.docs].forEach(d => {
        if (d.id === currentUser.uid || seen.has(d.id)) return;
        seen.add(d.id);
        results.push({ uid: d.id, ...d.data() });
      });
      setSearchResults(results);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  // Send friend request
  async function sendRequest(toUser) {
    if (!toUser?.uid) return;
    setActionLoading(p => ({ ...p, [toUser.uid]: true }));
    try {
      // Check if already sent
      const existing = query(collection(db, 'friendRequests'),
        where('fromUid', '==', currentUser.uid),
        where('toUid', '==', toUser.uid)
      );
      const snap = await getDocs(existing);
      if (!snap.empty) return;

      await addDoc(collection(db, 'friendRequests'), {
        fromUid: currentUser.uid,
        toUid: toUser.uid,
        fromName: userProfile.fullName,
        fromPhoto: userProfile.photoURL || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // Notify
      await sendNotification({
        toUid: toUser.uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendRequest',
        message: `${userProfile.fullName} vous a envoyé une demande d'ami`,
      });
      // Update sent requests
      await updateDoc(doc(db, 'users', currentUser.uid), { sentRequests: arrayUnion(toUser.uid) });
      setUserProfile(p => ({ ...p, sentRequests: [...(p.sentRequests || []), toUser.uid] }));
    } catch (err) { console.error(err); }
    setActionLoading(p => ({ ...p, [toUser.uid]: false }));
  }

  // Accept request
  async function acceptRequest(req) {
    setActionLoading(p => ({ ...p, [req.reqId]: true }));
    try {
      // Add to both friends lists
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(req.fromUid) });
      await updateDoc(doc(db, 'users', req.fromUid), { friends: arrayUnion(currentUser.uid) });
      // Delete request
      await deleteDoc(doc(db, 'friendRequests', req.reqId));
      // Notify sender
      await sendNotification({
        toUid: req.fromUid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'friendAccepted',
        message: `${userProfile.fullName} a accepté votre demande d'ami`,
      });
      setUserProfile(p => ({ ...p, friends: [...(p.friends || []), req.fromUid] }));
    } catch (err) { console.error(err); }
    setActionLoading(p => ({ ...p, [req.reqId]: false }));
  }

  // Decline request
  async function declineRequest(req) {
    await deleteDoc(doc(db, 'friendRequests', req.reqId));
  }

  // Remove friend
  async function removeFriend(friendUid) {
    if (!window.confirm('Esory ny namana?')) return;
    await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayRemove(friendUid) });
    await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(currentUser.uid) });
    setUserProfile(p => ({ ...p, friends: (p.friends || []).filter(u => u !== friendUid) }));
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
      <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C', marginBottom: 14 }}>{t('friends')}</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
              background: activeTab === tab.key ? '#E91E8C' : '#FFE4F3',
              color: activeTab === tab.key ? 'white' : '#E91E8C',
            }}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {activeTab === 'search' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} size={18} />
            <input
              className="input"
              placeholder={t('search')}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {loading && <p style={{ textAlign: 'center', color: '#C4829F' }}>{t('loading')}</p>}

          {searchResults.map(user => {
            const rel = getRelation(user.uid);
            return (
              <div key={user.uid} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=E91E8C&color=fff`}
                  alt=""
                  onClick={() => navigate(`/profile/${user.uid}`)}
                  style={{ cursor: 'pointer', width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#2D1220' }}>{user.fullName}</p>
                  <p style={{ fontSize: 13, color: '#C4829F' }}>@{user.username}</p>
                  <p style={{ fontSize: 12, color: '#8B5A6F' }}>{user.friends?.length || 0} {t('myFriends').toLowerCase()}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rel === 'friend' ? (
                    <>
                      <button onClick={() => navigate(`/messages`)} style={{ background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#E91E8C', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiChat size={14} /> {t('message')}
                      </button>
                      <button onClick={() => removeFriend(user.uid)} style={{ background: 'none', border: '1px solid #E8C5D8', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', color: '#C4829F', fontSize: 12 }}>
                        {t('removeFriend')}
                      </button>
                    </>
                  ) : rel === 'sent' ? (
                    <span style={{ color: '#C4829F', fontSize: 13, fontStyle: 'italic' }}>Voaravina...</span>
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

      {/* Friends tab */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <HiUsers size={48} color="#E8C5D8" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#C4829F' }}>{t('noFriends')}</p>
              <button onClick={() => setActiveTab('search')} className="btn-primary" style={{ marginTop: 14, fontSize: 13 }}>
                {t('search')}
              </button>
            </div>
          ) : (
            friends.map(friend => (
              <div key={friend.uid} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=E91E8C&color=fff`}
                  alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${friend.uid}`)}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#2D1220' }}>{friend.fullName}</p>
                  <p style={{ fontSize: 13, color: '#C4829F' }}>@{friend.username}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => navigate('/messages')}
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiChat size={16} />
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${friend.uid}`)}
                    style={{ background: '#FFE4F3', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiUserAdd size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests tab */}
      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#C4829F' }}>Tsy misy fangatahana</div>
          ) : (
            requests.map(req => (
              <div key={req.reqId} className="card" style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={req.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.fullName)}&background=E91E8C&color=fff`}
                  alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${req.fromUid}`)}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#2D1220' }}>{req.user.fullName}</p>
                  <p style={{ fontSize: 13, color: '#C4829F' }}>@{req.user.username}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => acceptRequest(req)}
                    disabled={actionLoading[req.reqId]}
                    style={{ background: '#E91E8C', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiCheck size={18} />
                  </button>
                  <button
                    onClick={() => declineRequest(req)}
                    style={{ background: '#FFE4F3', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
