// src/pages/MessagesSettings.jsx
// Paramètres des Messages : demandes de message (invitations), comptes
// bloqués, discussions archivées. Accessible depuis l'icône ⚙️ de Messages.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiArrowLeft, HiCheck, HiX, HiBan, HiArchive, HiChatAlt2 } from 'react-icons/hi';

function getOtherUid(chatId, myUid) {
  const parts = chatId.split('_');
  return parts[0] === myUid ? parts[1] : parts[0];
}

export default function MessagesSettings() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('requests'); // requests | blocked | archived
  const [requests, setRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [archivedChats, setArchivedChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Demandes de message (pending) ─────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onValue(ref(rtdb, 'conversations'), async (snap) => {
      const val = snap.val() || {};
      const myFriends = userProfile?.friends || [];
      const out = [];
      for (const [chatId, conv] of Object.entries(val)) {
        if (chatId.startsWith('group_') || chatId.startsWith('page_') || chatId.startsWith('artist_')) continue;
        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = getOtherUid(chatId, currentUser.uid);
        const msgs = conv.messages ? Object.values(conv.messages) : [];
        if (!msgs.length) continue;
        const iSentAny = msgs.some((m) => m.fromUid === currentUser.uid);
        const accepted = !!conv.meta?.acceptedBy?.[currentUser.uid];
        const declined = !!conv.meta?.declinedBy?.[currentUser.uid];
        const isPending = !myFriends.includes(otherUid) && !iSentAny && !accepted && !declined;
        if (!isPending) continue;
        try {
          const us = await getDoc(doc(db, 'users', otherUid));
          if (!us.exists()) continue;
          const last = msgs[msgs.length - 1];
          out.push({ chatId, otherUid, user: us.data(), lastText: last?.text || '' });
        } catch (e) { /* ignore */ }
      }
      out.sort((a, b) => (b.lastText ? 1 : 0) - (a.lastText ? 1 : 0));
      setRequests(out);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userProfile?.friends?.join?.(',')]);

  // ── Comptes bloqués ────────────────────────────────────────────
  useEffect(() => {
    const ids = userProfile?.blocked || [];
    if (!ids.length) { setBlockedUsers([]); return; }
    Promise.all(ids.map((uid) => getDoc(doc(db, 'users', uid)).then((s) => (s.exists() ? { uid: s.id, ...s.data() } : null))))
      .then((list) => setBlockedUsers(list.filter(Boolean)));
  }, [userProfile?.blocked?.join?.(',')]);

  // ── Discussions archivées ───────────────────────────────────────
  useEffect(() => {
    const ids = userProfile?.archivedChats || [];
    if (!ids.length || !currentUser) { setArchivedChats([]); return; }
    Promise.all(ids.map((chatId) => {
      const otherUid = getOtherUid(chatId, currentUser.uid);
      return getDoc(doc(db, 'users', otherUid)).then((s) => (s.exists() ? { chatId, otherUid, user: s.data() } : null));
    })).then((list) => setArchivedChats(list.filter(Boolean)));
  }, [userProfile?.archivedChats?.join?.(','), currentUser]);

  async function acceptRequest(r) {
    setRequests((p) => p.filter((x) => x.chatId !== r.chatId));
    try { await update(ref(rtdb, `conversations/${r.chatId}/meta/acceptedBy`), { [currentUser.uid]: true }); } catch (e) {}
    navigate(`/messages/${r.chatId}`);
  }
  async function declineRequest(r, spam) {
    setRequests((p) => p.filter((x) => x.chatId !== r.chatId));
    try { await update(ref(rtdb, `conversations/${r.chatId}/meta/declinedBy`), { [currentUser.uid]: true }); } catch (e) {}
    if (spam) {
      const list0 = userProfile?.blocked || [];
      if (!list0.includes(r.otherUid)) {
        setUserProfile((p) => ({ ...p, blocked: [...(p.blocked || []), r.otherUid] }));
        try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: [...list0, r.otherUid] }); } catch (e) {}
      }
    }
  }
  async function unblock(uid) {
    setBlockedUsers((p) => p.filter((u) => u.uid !== uid));
    setUserProfile((p) => ({ ...p, blocked: (p.blocked || []).filter((u) => u !== uid) }));
    try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: arrayRemove(uid) }); } catch (e) {}
  }
  async function unarchive(chatId) {
    setArchivedChats((p) => p.filter((c) => c.chatId !== chatId));
    setUserProfile((p) => ({ ...p, archivedChats: (p.archivedChats || []).filter((c) => c !== chatId) }));
    try { await updateDoc(doc(db, 'users', currentUser.uid), { archivedChats: arrayRemove(chatId) }); } catch (e) {}
  }

  const tabs = [
    { key: 'requests', label: 'Demandes', count: requests.length, icon: HiChatAlt2 },
    { key: 'blocked', label: 'Bloqués', count: blockedUsers.length, icon: HiBan },
    { key: 'archived', label: 'Archivées', count: archivedChats.length, icon: HiArchive },
  ];

  const Row = ({ u, chatId, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid #F0F2F5' }}>
      <img
        src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=1877F2&color=fff`}
        alt="" onClick={() => navigate(`/profile/${u.uid || u.id}`)}
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName}</p>
        <p style={{ fontSize: 12, color: '#65676B' }}>@{u.username}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #E4E6EB', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Paramètres des messages</h2>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #E4E6EB' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: tab === t.key ? '2.5px solid #1877F2' : '2.5px solid transparent', color: tab === t.key ? '#1877F2' : '#65676B', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <t.icon size={17} />
            {t.label}{t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#65676B', padding: 30 }}>Chargement…</p>
          ) : requests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#65676B', padding: 30, fontSize: 14 }}>Aucune demande de message</p>
          ) : requests.map((r) => (
            <Row key={r.chatId} u={r.user}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => acceptRequest(r)} style={{ background: '#1877F2', border: 'none', borderRadius: 16, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiCheck size={14} /> Accepter
                  </button>
                  <button onClick={() => declineRequest(r, false)} style={{ background: '#E4E6EB', border: 'none', borderRadius: 16, padding: '6px 12px', color: '#65676B', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiX size={14} /> Ignorer
                  </button>
                </div>
                <button onClick={() => declineRequest(r, true)} style={{ background: 'none', border: 'none', color: '#FF2D8D', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  Signaler comme spam
                </button>
              </div>
            </Row>
          ))}
        </div>
      )}

      {tab === 'blocked' && (
        <div>
          {blockedUsers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#65676B', padding: 30, fontSize: 14 }}>Aucun compte bloqué</p>
          ) : blockedUsers.map((u) => (
            <Row key={u.uid} u={u}>
              <button onClick={() => unblock(u.uid)} style={{ background: '#E4E6EB', border: 'none', borderRadius: 16, padding: '7px 14px', color: '#050505', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Débloquer
              </button>
            </Row>
          ))}
        </div>
      )}

      {tab === 'archived' && (
        <div>
          {archivedChats.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#65676B', padding: 30, fontSize: 14 }}>Aucune discussion archivée</p>
          ) : archivedChats.map((c) => (
            <Row key={c.chatId} u={c.user}>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => navigate(`/messages/${c.chatId}`)} style={{ background: '#1877F2', border: 'none', borderRadius: 16, padding: '7px 14px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Ouvrir
                </button>
                <button onClick={() => unarchive(c.chatId)} style={{ background: '#E4E6EB', border: 'none', borderRadius: 16, padding: '7px 14px', color: '#050505', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Désarchiver
                </button>
              </div>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}
