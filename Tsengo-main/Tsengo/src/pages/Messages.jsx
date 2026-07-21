// src/pages/Messages.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, serverTimestamp, set } from 'firebase/database';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { HiArrowLeft, HiPaperAirplane, HiSearch, HiDotsVertical } from 'react-icons/hi';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export default function Messages() {
  const { chatId: paramChatId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(paramChatId || null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [online, setOnline] = useState({});
  const bottomRef = useRef();

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    const convsRef = ref(rtdb, 'conversations');
    const unsub = onValue(convsRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const list = [];
      for (const [chatId, conv] of Object.entries(data)) {
        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = chatId.replace(currentUser.uid, '').replace('_', '');
        try {
          const userSnap = await getDoc(doc(db, 'users', otherUid));
          if (!userSnap.exists()) continue;
          const msgs = conv.messages ? Object.values(conv.messages) : [];
          const lastMsg = msgs[msgs.length - 1];
          const unread = msgs.filter(m => m.toUid === currentUser.uid && !m.read).length;
          list.push({ chatId, otherUid, user: userSnap.data(), lastMsg, unread });
        } catch {}
      }
      list.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0));
      setConversations(list);
    });
    return () => unsub();
  }, [currentUser]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    const msgsRef = ref(rtdb, `conversations/${activeChatId}/messages`);
    const unsub = onValue(msgsRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
      msgs.sort((a, b) => a.ts - b.ts);
      setMessages(msgs);
      // Mark as read
      msgs.forEach(m => {
        if (m.toUid === currentUser.uid && !m.read) {
          update(ref(rtdb, `conversations/${activeChatId}/messages/${m.id}`), { read: true });
        }
      });
    });
    return () => unsub();
  }, [activeChatId, currentUser]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load active user info
  useEffect(() => {
    if (!activeChatId) return;
    const otherUid = activeChatId.replace(currentUser.uid, '').replace('_', '');
    getDoc(doc(db, 'users', otherUid)).then(snap => {
      if (snap.exists()) setActiveUser(snap.data());
    });
    // Online status
    const onlineRef = ref(rtdb, `online/${otherUid}`);
    const unsub = onValue(onlineRef, snap => {
      setOnline(p => ({ ...p, [otherUid]: snap.exists() && snap.val() === true }));
    });
    return () => unsub();
  }, [activeChatId]);

  // Set own online status
  useEffect(() => {
    if (!currentUser) return;
    const onlineRef = ref(rtdb, `online/${currentUser.uid}`);
    set(onlineRef, true);
    return () => set(onlineRef, false);
  }, [currentUser]);

  // Search friends to chat
  async function searchFriends(val) {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const friends = userProfile?.friends || [];
    if (friends.length === 0) return;
    const results = [];
    for (const uid of friends) {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const u = snap.data();
        if (u.fullName.toLowerCase().includes(val.toLowerCase()) || u.username.toLowerCase().includes(val.toLowerCase())) {
          results.push(u);
        }
      }
    }
    setSearchResults(results);
  }

  function openChat(uid) {
    const chatId = getChatId(currentUser.uid, uid);
    setActiveChatId(chatId);
    setSearch('');
    setSearchResults([]);
  }

  async function sendMessage() {
    if (!text.trim() || !activeChatId) return;
    const otherUid = activeChatId.replace(currentUser.uid, '').replace('_', '');
    const msgsRef = ref(rtdb, `conversations/${activeChatId}/messages`);
    await push(msgsRef, {
      fromUid: currentUser.uid,
      toUid: otherUid,
      fromName: userProfile.fullName,
      fromPhoto: userProfile.photoURL || '',
      text: text.trim(),
      ts: Date.now(),
      read: false,
    });
    setText('');
  }

  const otherUid = activeChatId ? activeChatId.replace(currentUser.uid, '').replace('_', '') : null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', background: 'var(--gray-50)' }}>
      {/* Sidebar: conversations */}
      <div style={{
        width: activeChatId ? '0' : '100%',
        maxWidth: 360,
        background: 'white',
        borderRight: '1px solid #FFE4F3',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s',
        ...(activeChatId ? { display: 'none' } : {})
      }}>
        <div style={{ padding: '14px 14px 10px' }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#E91E8C', marginBottom: 10 }}>{t('messages')}</h2>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <HiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} />
            <input
              className="input"
              placeholder={t('search')}
              value={search}
              onChange={e => searchFriends(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="card" style={{ marginTop: 6, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <div key={u.uid} onClick={() => openChat(u.uid)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #FFE4F3' }}>
                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</p>
                    <p style={{ fontSize: 12, color: '#C4829F' }}>@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#C4829F', fontSize: 14 }}>
              {t('noMessages')}
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.chatId}
                onClick={() => { setActiveChatId(conv.chatId); setActiveUser(conv.user); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', cursor: 'pointer',
                  background: activeChatId === conv.chatId ? '#FFE4F3' : 'white',
                  borderBottom: '1px solid #FDF4F8',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 46, height: 46 }} />
                  {online[conv.otherUid] && (
                    <span className="pulse-dot" style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#2D1220' }}>{conv.user.fullName}</p>
                    {conv.unread > 0 && (
                      <span style={{ background: '#E91E8C', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{conv.unread}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#C4829F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMsg?.fromUid === currentUser.uid ? 'Ianao: ' : ''}{conv.lastMsg?.text || ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      {activeChatId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FDF4F8' }}>
          {/* Chat header */}
          <div style={{ background: 'white', borderBottom: '1px solid #FFE4F3', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', display: 'flex', alignItems: 'center' }}>
              <HiArrowLeft size={22} />
            </button>
            {activeUser && (
              <>
                <div style={{ position: 'relative' }}>
                  <img src={activeUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.fullName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                  {online[otherUid] && (
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#2D1220' }}>{activeUser.fullName}</p>
                  <p style={{ fontSize: 11, color: online[otherUid] ? '#22c55e' : '#C4829F' }}>
                    {online[otherUid] ? t('online') : t('offline')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(msg => {
              const isMe = msg.fromUid === currentUser.uid;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                  {!isMe && (
                    <img src={msg.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.fromName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />
                  )}
                  <div>
                    <div className={isMe ? 'msg-bubble-me' : 'msg-bubble-other'}>
                      {msg.text}
                    </div>
                    <p style={{ fontSize: 10, color: '#C4829F', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                      {msg.ts ? new Date(msg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {isMe && <span> · {msg.read ? '✓✓' : '✓'}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ background: 'white', borderTop: '1px solid #FFE4F3', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              placeholder={t('typeMessage')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1 }}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              style={{ background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: text.trim() ? 1 : 0.5 }}
            >
              <HiPaperAirplane size={18} color="white" style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Empty state when no chat selected on desktop */}
      {!activeChatId && conversations.length > 0 && (
        <div style={{ flex: 1, display: 'none' }} />
      )}
    </div>
  );
}
