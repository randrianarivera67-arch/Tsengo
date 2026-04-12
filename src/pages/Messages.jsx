// src/pages/Messages.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, set, remove } from 'firebase/database';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { sendPushNotification } from '../utils/onesignal';
import { uploadAudioToCloudinary } from '../utils/cloudinary';
import { useAuth } from '../context/AuthContext';
import {
  HiArrowLeft, HiPaperAirplane, HiSearch, HiDotsVertical, HiTrash,
  HiMicrophone, HiStop, HiX,
} from 'react-icons/hi';

function getChatId(uid1, uid2) { return [uid1, uid2].sort().join('_'); }

export default function Messages() {
  const { chatId: paramChatId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(paramChatId || null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [online, setOnline] = useState({});
  const [openConvMenu, setOpenConvMenu] = useState(null);

  // Voice message
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const bottomRef = useRef();

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

  useEffect(() => {
    if (!activeChatId) return;
    const msgsRef = ref(rtdb, `conversations/${activeChatId}/messages`);
    const unsub = onValue(msgsRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
      msgs.sort((a, b) => a.ts - b.ts);
      setMessages(msgs);
      msgs.forEach(m => {
        if (m.toUid === currentUser.uid && !m.read)
          update(ref(rtdb, `conversations/${activeChatId}/messages/${m.id}`), { read: true });
      });
    });
    return () => unsub();
  }, [activeChatId, currentUser]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!activeChatId) return;
    const otherUid = activeChatId.replace(currentUser.uid, '').replace('_', '');
    getDoc(doc(db, 'users', otherUid)).then(snap => { if (snap.exists()) setActiveUser(snap.data()); });
    const onlineRef = ref(rtdb, `online/${otherUid}`);
    const unsub = onValue(onlineRef, snap => { setOnline(p => ({ ...p, [otherUid]: snap.exists() && snap.val() === true })); });
    return () => unsub();
  }, [activeChatId]);

  useEffect(() => {
    if (!currentUser) return;
    const onlineRef = ref(rtdb, `online/${currentUser.uid}`);
    set(onlineRef, true);
    return () => set(onlineRef, false);
  }, [currentUser]);

  useEffect(() => {
    const handler = () => { setOpenConvMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  async function searchUsers(val) {
    setSearch(val);
    if (!val.trim() || val.length < 2) { setSearchResults([]); return; }
    try {
      const q1 = query(collection(db, 'users'), where('username', '>=', val.toLowerCase()), where('username', '<=', val.toLowerCase() + '\uf8ff'));
      const q2 = query(collection(db, 'users'), where('fullName', '>=', val), where('fullName', '<=', val + '\uf8ff'));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const map = {};
      [...s1.docs, ...s2.docs].forEach(d => { if (d.id !== currentUser.uid) map[d.id] = d.data(); });
      setSearchResults(Object.values(map).slice(0, 8));
    } catch {
      const friends = userProfile?.friends || [];
      const results = [];
      for (const uid of friends) {
        const s = await getDoc(doc(db, 'users', uid));
        if (s.exists()) {
          const u = s.data();
          if (u.fullName.toLowerCase().includes(val.toLowerCase())) results.push(u);
        }
      }
      setSearchResults(results);
    }
  }

  function openChat(uid) {
    const chatId = getChatId(currentUser.uid, uid);
    setActiveChatId(chatId); setSearch(''); setSearchResults([]);
  }

  async function sendMessage() {
    if (!text.trim() || !activeChatId) return;
    const otherUid = activeChatId.replace(currentUser.uid, '').replace('_', '');
    await push(ref(rtdb, `conversations/${activeChatId}/messages`), {
      fromUid: currentUser.uid, toUid: otherUid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
      text: text.trim(), type: 'text', ts: Date.now(), read: false,
    });
    sendPushNotification({ toExternalId: otherUid, title: `📩 ${userProfile.fullName}`, message: text.trim().substring(0, 60), data: { type: 'message', fromUid: currentUser.uid, chatId: activeChatId } });
    setText('');
  }

  // Voice recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch { alert('Microphone tsy azo ampiasaina'); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(recordTimerRef.current);
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(recordTimerRef.current);
    setAudioBlob(null); setAudioURL(null); setRecordDuration(0);
  }

  async function sendVoiceMessage() {
    if (!audioBlob || !activeChatId) return;
    const otherUid = activeChatId.replace(currentUser.uid, '').replace('_', '');
    setUploadingAudio(true);
    setAudioUploadProgress(0);
    try {
      // Upload audio any amin'ny Cloudinary (tsy base64 ao Firebase)
      const { url: audioURL_cloud } = await uploadAudioToCloudinary(
        audioBlob,
        'tsengo/audio',
        p => setAudioUploadProgress(p)
      );
      await push(ref(rtdb, `conversations/${activeChatId}/messages`), {
        fromUid: currentUser.uid, toUid: otherUid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        text: '🎤 Message vocal', type: 'audio', audioURL: audioURL_cloud,
        duration: recordDuration, ts: Date.now(), read: false,
      });
      sendPushNotification({ toExternalId: otherUid, title: `🎤 ${userProfile.fullName}`, message: 'Message vocal', data: { type: 'message' } });
    } catch (err) {
      alert('Nisy olana tamin\'ny fandidiana hafatra feo: ' + err.message);
    } finally {
      setUploadingAudio(false);
      setAudioUploadProgress(0);
      setAudioBlob(null); setAudioURL(null); setRecordDuration(0);
    }
  }

  async function deleteMessage(msgId) {
    if (!window.confirm('Supprimer ce message ?')) return;
    await remove(ref(rtdb, `conversations/${activeChatId}/messages/${msgId}`));
  }

  async function deleteConversation(chatId) {
    if (!window.confirm('Supprimer toute la conversation ?')) return;
    await remove(ref(rtdb, `conversations/${chatId}`));
    if (activeChatId === chatId) setActiveChatId(null);
  }

  const otherUid = activeChatId ? activeChatId.replace(currentUser.uid, '').replace('_', '') : null;
  const av = (name, photo) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=E91E8C&color=fff`;
  const fmtDuration = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', background: 'var(--gray-50)' }}>
      {/* Sidebar */}
      <div style={{ width: activeChatId ? '0' : '100%', maxWidth: 360, background: 'white', borderRight: '1px solid #FFE4F3', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(activeChatId ? { display: 'none' } : {}) }}>
        <div style={{ padding: '14px 14px 10px' }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#E91E8C', marginBottom: 10 }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <HiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} />
            <input className="input" placeholder="Rechercher..." value={search}
              onChange={e => searchUsers(e.target.value)} style={{ paddingLeft: 32, fontSize: 13 }} />
          </div>
          {searchResults.length > 0 && (
            <div className="card" style={{ marginTop: 6, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <div key={u.uid} onClick={() => openChat(u.uid)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #FFE4F3' }}>
                  <img src={av(u.fullName, u.photoURL)} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</p>
                    <p style={{ fontSize: 12, color: '#C4829F' }}>@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#C4829F', fontSize: 14 }}>Pas de messages</div>
          ) : (
            conversations.map(conv => (
              <div key={conv.chatId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: activeChatId === conv.chatId ? '#FFE4F3' : 'white', borderBottom: '1px solid #FDF4F8', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
                  onClick={() => { setActiveChatId(conv.chatId); setActiveUser(conv.user); }}>
                  <div style={{ position: 'relative' }}>
                    <img src={av(conv.user.fullName, conv.user.photoURL)} alt="" className="avatar" style={{ width: 46, height: 46 }} />
                    {online[conv.otherUid] && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#2D1220' }}>{conv.user.fullName}</p>
                      {conv.unread > 0 && <span style={{ background: '#E91E8C', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{conv.unread}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#C4829F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMsg?.fromUid === currentUser.uid ? 'Vous: ' : ''}{conv.lastMsg?.text || ''}
                    </p>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button onClick={e => { e.stopPropagation(); setOpenConvMenu(openConvMenu === conv.chatId ? null : conv.chatId); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4 }}>
                    <HiDotsVertical size={16} />
                  </button>
                  {openConvMenu === conv.chatId && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #FFE4F3', zIndex: 50, minWidth: 180 }}
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => { deleteConversation(conv.chatId); setOpenConvMenu(null); }}
                        style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E91E8C', fontFamily: 'Poppins' }}>
                        <HiTrash size={15} /> Supprimer la conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      {activeChatId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FDF4F8' }}>
          <div style={{ background: 'white', borderBottom: '1px solid #FFE4F3', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C' }}>
              <HiArrowLeft size={22} />
            </button>
            {activeUser && (
              <>
                <div style={{ position: 'relative' }}>
                  <img src={av(activeUser.fullName, activeUser.photoURL)} alt="" className="avatar" style={{ width: 40, height: 40 }} />
                  {online[otherUid] && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#2D1220' }}>{activeUser.fullName}</p>
                  <p style={{ fontSize: 11, color: online[otherUid] ? '#22c55e' : '#C4829F' }}>{online[otherUid] ? 'En ligne' : 'Hors ligne'}</p>
                </div>
              </>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(msg => {
              const isMe = msg.fromUid === currentUser.uid;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                  {!isMe && <img src={av(msg.fromName, msg.fromPhoto)} alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />}
                  <div>
                    <div className={isMe ? 'msg-bubble-me' : 'msg-bubble-other'}>
                      {msg.type === 'audio' && msg.audioURL
                        ? <audio src={msg.audioURL} controls style={{ height: 32, minWidth: 160 }} />
                        : msg.type === 'audio' && msg.audioData
                        ? <audio src={msg.audioData} controls style={{ height: 32, minWidth: 160 }} />
                        : msg.text
                      }
                    </div>
                    <p style={{ fontSize: 10, color: '#C4829F', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                      {msg.ts ? new Date(msg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {isMe && <span> · {msg.read ? '✓✓' : '✓'}</span>}
                    </p>
                  </div>
                  {isMe && (
                    <button onClick={() => deleteMessage(msg.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 2, opacity: 0.5 }}>
                      <HiTrash size={13} />
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ background: 'white', borderTop: '1px solid #FFE4F3', padding: '10px 14px' }}>
            {/* Audio preview */}
            {audioURL && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#FDF4F8', borderRadius: 12, padding: '8px 12px' }}>
                <audio src={audioURL} controls style={{ flex: 1, height: 32 }} />
                <button onClick={cancelRecording} disabled={uploadingAudio} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}><HiX size={16} /></button>
                <button onClick={sendVoiceMessage} disabled={uploadingAudio}
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingAudio ? 'not-allowed' : 'pointer', opacity: uploadingAudio ? 0.7 : 1, fontSize: 11, color: 'white', fontWeight: 700 }}>
                  {uploadingAudio ? `${audioUploadProgress}%` : <HiPaperAirplane size={16} color="white" style={{ transform: 'rotate(90deg)' }} />}
                </button>
              </div>
            )}

            {/* Recording indicator */}
            {recording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, background: '#FFE4F3', borderRadius: 12, padding: '8px 12px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E91E8C', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 13, color: '#E91E8C', fontWeight: 600, flex: 1 }}>Enregistrement... {fmtDuration(recordDuration)}</span>
                <button onClick={stopRecording} style={{ background: '#E91E8C', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiStop size={14} color="white" />
                </button>
                <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}><HiX size={16} /></button>
              </div>
            )}

            {!recording && !audioURL && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="input" placeholder="Écrivez un message..." value={text}
                  onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  style={{ flex: 1 }} />
                {/* Voice button */}
                <button onClick={startRecording}
                  style={{ background: '#FFE4F3', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <HiMicrophone size={18} color="#E91E8C" />
                </button>
                {/* Send button */}
                <button onClick={sendMessage} disabled={!text.trim()}
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #FF6BB5)', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: text.trim() ? 1 : 0.5, flexShrink: 0 }}>
                  <HiPaperAirplane size={18} color="white" style={{ transform: 'rotate(90deg)' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
