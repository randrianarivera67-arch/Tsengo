// src/pages/Messages.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, set, remove } from 'firebase/database';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { sendPushNotification } from '../utils/onesignal';
import { playMessageSound } from '../utils/sound';
import {
  HiArrowLeft, HiPaperAirplane, HiSearch, HiPhotograph,
  HiVideoCamera, HiPaperClip, HiX, HiDownload, HiMicrophone, HiStop,
  HiTrash, HiPencil, HiReply, HiDotsVertical, HiCheck,
  HiArchive, HiColorSwatch, HiMusicNote, HiHeart, HiUserGroup,
} from 'react-icons/hi';

export default function Messages() {
  const { chatId: paramChatId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [conversations,   setConversations]  = useState([]);
  const [activeChatId,    setActiveChatId]   = useState(paramChatId || null);
  const [activeUser,      setActiveUser]     = useState(null);
  const [messages,        setMessages]       = useState([]);
  const [text,            setText]           = useState('');
  const [search,          setSearch]         = useState('');
  const [searchResults,   setSearchResults]  = useState([]);
  const [online,          setOnline]         = useState({});
  const [friendsProfiles, setFriendsProfiles] = useState([]);
  const [mediaFile,       setMediaFile]      = useState(null);
  const [mediaPreview,    setMediaPreview]   = useState(null);
  const [mediaType,       setMediaType]      = useState('');
  const [uploading,       setUploading]      = useState(false);
  const [recording,       setRecording]      = useState(false);
  const [recordSec,       setRecordSec]      = useState(0);

  // ── Nouvelles fonctionnalités ─────────────────────────────
  const [replyTo,       setReplyTo]       = useState(null);  // { id, text, fromName, fromPhoto }
  const [editingMsgId,  setEditingMsgId]  = useState(null);
  const [msgAction,     setMsgAction]     = useState(null);
  const [bottomSheet,   setBottomSheet]   = useState(null);
  const [msgReactions,  setMsgReactions]  = useState({});
  const [headerMenu,    setHeaderMenu]    = useState(false);
  const [mediaModal,    setMediaModal]    = useState(false);
  const [themeModal,    setThemeModal]    = useState(false);
  const [chatTheme,     setChatTheme]     = useState('blue');
  const [zoomMedia,     setZoomMedia]     = useState(null);

  const THEMES = {
    rose:   { me:'linear-gradient(135deg,#E91E8C,#FF6BB5)', other:'#F5E6EF', bg:'#FDF4F8' },
    violet: { me:'linear-gradient(135deg,#7c3aed,#a855f7)', other:'#EDE9FE', bg:'#F5F3FF' },
    blue:   { me:'linear-gradient(135deg,#2563eb,#3b82f6)', other:'#DBEAFE', bg:'#EFF6FF' },
  };
  const theme = THEMES[chatTheme]||THEMES.rose;
  const [convMenu,      setConvMenu]      = useState(null);  // chatId showing menu
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [transferMsg, setTransferMsg] = useState(null);  // chatId | 'all'

  const mrRef      = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);
  const bottomRef  = useRef();
  const prevMsgLen = useRef(0);
  const photoRef   = useRef(); const videoRef = useRef(); const fileRef = useRef();

  useEffect(() => { if (paramChatId) setActiveChatId(paramChatId); }, [paramChatId]);

  useEffect(() => {
    if (!userProfile?.friends?.length) { setFriendsProfiles([]); return; }
    Promise.all(userProfile.friends.map(uid =>
      getDoc(doc(db, 'users', uid)).then(s => s.exists() ? { uid, ...s.data() } : null)
    )).then(list => setFriendsProfiles(list.filter(Boolean)));
  }, [userProfile?.friends?.join?.(',')]);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'online'), snap => setOnline(snap.val() || {}));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onValue(ref(rtdb, 'conversations'), async snap => {
      if (!snap.exists()) return;
      const data = snap.val();
      const list = [];
      for (const [chatId, conv] of Object.entries(data)) {
        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = chatId.split('_').find(p => p !== currentUser.uid);
        if (!otherUid) continue;
        const blocked = userProfile?.blocked || [];
        if (blocked.includes(otherUid)) continue;
        try {
          const s = await getDoc(doc(db, 'users', otherUid));
          if (!s.exists()) continue;
          const msgs  = conv.messages ? Object.values(conv.messages) : [];
          const last  = msgs[msgs.length - 1];
          const unread = msgs.filter(m => m.toUid === currentUser.uid && !m.read).length;
          list.push({ chatId, otherUid, user: s.data(), lastMsg: last, unread });
        } catch {}
      }
      list.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0));
      setConversations(list);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatId) return;
    const unsub = onValue(ref(rtdb, `conversations/${activeChatId}/messages`), snap => {
      if (!snap.exists()) { setMessages([]); return; }
      const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
      msgs.sort((a, b) => a.ts - b.ts);
      setMessages(msgs);
      const r = {};
      msgs.forEach(m => { if (m.reactions) r[m.id]=m.reactions; });
      setMsgReactions(r);
      msgs.forEach(m => {
        if (m.toUid === currentUser.uid && !m.read) {
          update(ref(rtdb, `conversations/${activeChatId}/messages/${m.id}`), { read: true });
        }
      });
    });
    return () => unsub();
  }, [activeChatId, currentUser]);

  // ── Play sound on new incoming message ─────────────────────
  useEffect(() => {
    if (messages.length > prevMsgLen.current) {
      const last = messages[messages.length - 1];
      if (last && last.fromUid !== currentUser?.uid) {
        playMessageSound();
      }
    }
    prevMsgLen.current = messages.length;
  }, [messages]);

  undefined

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  useEffect(() => {
    if (!activeChatId) return;
    // Load theme
    const themeRef = ref(rtdb, `conversations/${activeChatId}/theme`);
    onValue(themeRef, snap => { if(snap.exists()) setChatTheme(snap.val()); else setChatTheme('blue'); }, {onlyOnce:true});
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    const otherUid = activeChatId.split('_').find(p => p !== currentUser.uid);
    if (!otherUid) return;
    getDoc(doc(db, 'users', otherUid)).then(s => { if (s.exists()) setActiveUser(s.data()); });
  }, [activeChatId]);

  // Close menus on outside click
  useEffect(() => {
    const fn = () => { setMsgAction(null); setConvMenu(null); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  function searchFriends(val) {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const low = val.toLowerCase();
    setSearchResults(friendsProfiles.filter(u =>
      u.fullName?.toLowerCase().includes(low) || u.username?.toLowerCase().includes(low)
    ));
  }

  async function openChat(uid) {
    const cid = getChatId(currentUser.uid, uid);
    setActiveChatId(cid);
    const s = await getDoc(doc(db, 'users', uid));
    if (s.exists()) setActiveUser(s.data());
    navigate(`/messages/${cid}`, { replace: true });
    setSearch(''); setSearchResults([]);
  }

  function handleMediaSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file); setMediaType(type);
    setMediaPreview(type !== 'raw' ? URL.createObjectURL(file) : null);
  }
  function removeMedia() { setMediaFile(null); setMediaPreview(null); setMediaType(''); }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setMediaFile(file); setMediaType('audio');
        setMediaPreview(URL.createObjectURL(blob));
      };
      mr.start(); mrRef.current = mr; setRecording(true); setRecordSec(0);
      timerRef.current = setInterval(() => setRecordSec(s => s + 1), 1000);
    } catch (err) { alert('Microphone non accessible: ' + err.message); }
  }

  function stopRecording() {
    if (mrRef.current && recording) { mrRef.current.stop(); clearInterval(timerRef.current); setRecording(false); }
  }

  function cancelRecording() {
    if (mrRef.current && recording) {
      mrRef.current.stop(); clearInterval(timerRef.current); setRecording(false);
      chunksRef.current = []; setMediaFile(null); setMediaPreview(null); setMediaType('');
    }
  }

  async function sendMessage() {
    if (!text.trim() && !mediaFile) return;
    if (!activeChatId) return;
    setUploading(true);
    try {
      let mediaURL = '', finalMT = '';
      if (mediaFile) { const r = await uploadToTelegram(mediaFile); mediaURL = r.url; finalMT = r.type; }
      const otherUid = activeChatId.split('_').find(p => p !== currentUser.uid);

      if (editingMsgId) {
        // ── Mode édition : modifier le message existant ─────
        await update(ref(rtdb, `conversations/${activeChatId}/messages/${editingMsgId}`), {
          text: text.trim(),
          edited: true,
          editedTs: Date.now(),
        });
        setEditingMsgId(null);
      } else {
        // ── Nouveau message ─────────────────────────────────
        const msgData = {
          fromUid: currentUser.uid,
          toUid: otherUid,
          fromName: userProfile.fullName,
          fromPhoto: userProfile.photoURL || '',
          text: text.trim(),
          mediaURL, mediaType: finalMT,
          ts: Date.now(),
          read: false,
          ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, fromName: replyTo.fromName } } : {}),
        };
        await push(ref(rtdb, `conversations/${activeChatId}/messages`), msgData);
        await set(ref(rtdb, `conversations/${activeChatId}/meta`), {
          lastMessage: text.trim() || (finalMT === 'audio' ? '🎤 Vocal' : '📎 Média'),
          lastTs: Date.now(),
        });
        sendPushNotification({
          toExternalId: otherUid,
          title: userProfile.fullName,
          message: text.trim() || (finalMT === 'audio' ? 'a envoyé un message vocal 🎤' : 'a envoyé un fichier'),
          data: { type: 'message', conversationId: activeChatId },
        });
      }
      setText(''); removeMedia(); setReplyTo(null);
    } catch (err) { console.error(err); alert('Erreur lors de l\'envoi'); }
    setUploading(false);
  }

  function startEdit(msg) {
    setEditingMsgId(msg.id);
    setText(msg.text || '');
    setMsgAction(null);
    setReplyTo(null);
  }

  function cancelEdit() {
    setEditingMsgId(null);
    setText('');
  }

  function startReply(msg) {
    setReplyTo({ id: msg.id, text: msg.text || (msg.mediaType === 'audio' ? '🎤 Vocal' : '📎 Média'), fromName: msg.fromName, fromPhoto: msg.fromPhoto });
    setMsgAction(null);
    setEditingMsgId(null);
  }

  async function deleteMessage(msgId) {
    await remove(ref(rtdb, `conversations/${activeChatId}/messages/${msgId}`));
    setMsgAction(null); setBottomSheet(null);
  }

  async function deleteForMe(msgId) {
    await remove(ref(rtdb, `conversations/${activeChatId}/messages/${msgId}`));
    setBottomSheet(null);
  }

  async function reactToMsg(msgId, emoji) {
    const msgRef = ref(rtdb, `conversations/${activeChatId}/messages/${msgId}/reactions/${currentUser.uid}`);
    const cur = msgReactions[msgId]?.[currentUser.uid];
    if (cur===emoji) { await remove(msgRef); }
    else {
      await set(msgRef, emoji);
      const msg = messages.find(m=>m.id===msgId);
      if (msg && msg.fromUid!==currentUser.uid) {
        await addDoc(collection(db,'notifications'),{
          toUid:msg.fromUid, fromUid:currentUser.uid,
          fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'',
          type:'reaction', message:`${userProfile.fullName} a réagi ${emoji} à votre message`,
          read:false, createdAt:serverTimestamp(),
        });
        sendPushNotification({toExternalId:msg.fromUid, title:userProfile.fullName, message:`a réagi ${emoji} à votre message`, fromPhoto:userProfile.photoURL||'', data:{type:'message'}});
      }
    }
    setBottomSheet(null);
  }

  async function deleteConversation(chatId) {
    await remove(ref(rtdb, `conversations/${chatId}`));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      navigate('/messages', { replace: true });
    }
    setDeleteConfirm(null);
    setConvMenu(null);
  }

  async function deleteAllConversations() {
    for (const conv of conversations) {
      await remove(ref(rtdb, `conversations/${conv.chatId}`));
    }
    setActiveChatId(null);
    setActiveUser(null);
    navigate('/messages', { replace: true });
    setDeleteConfirm(null);
  }

  const otherUid     = activeChatId?.split('_').find(p => p !== currentUser?.uid);
  const sortedFriends = [...friendsProfiles].sort((a, b) => (online[b.uid] ? 1 : 0) - (online[a.uid] ? 1 : 0));
  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', background: '#FDF4F8', fontFamily: 'Poppins,sans-serif' }}>

      {/* ── Confirmation dialog ───────────────────────────────── */}
      {transferMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setTransferMsg(null)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#2D1220", marginBottom: 16 }}>↪️ Transférer à...</p>
            {conversations.map(conv => (
              <div key={conv.chatId} onClick={async () => { await push(ref(rtdb, `conversations/${conv.chatId}/messages`), { fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || "", text: transferMsg.text || "", mediaURL: transferMsg.mediaURL || "", mediaType: transferMsg.mediaType || "", ts: Date.now(), read: false, forwarded: true }); setTransferMsg(null); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", cursor: "pointer", borderBottom: "1px solid #FFE4F3" }}>
                <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=E91E8C&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <p style={{ fontWeight: 600, fontSize: 14 }}>{conv.user.fullName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {transferMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setTransferMsg(null)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#2D1220", marginBottom: 16 }}>↪️ Transférer à...</p>
            {conversations.map(conv => (
              <div key={conv.chatId} onClick={async () => { await push(ref(rtdb, `conversations/${conv.chatId}/messages`), { fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || "", text: transferMsg.text || "", mediaURL: transferMsg.mediaURL || "", mediaType: transferMsg.mediaType || "", ts: Date.now(), read: false, forwarded: true }); setTransferMsg(null); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", cursor: "pointer", borderBottom: "1px solid #FFE4F3" }}>
                <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=E91E8C&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <p style={{ fontWeight: 600, fontSize: 14 }}>{conv.user.fullName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#2D1220', marginBottom: 8 }}>
              {deleteConfirm === 'all' ? 'Supprimer toutes les conversations ?' : 'Supprimer cette conversation ?'}
            </p>
            <p style={{ fontSize: 13, color: '#8B5A6F', marginBottom: 20 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px 0', background: '#FFE4F3', border: 'none', borderRadius: 14, fontWeight: 600, cursor: 'pointer', color: '#E91E8C' }}>Annuler</button>
              <button onClick={() => deleteConfirm === 'all' ? deleteAllConversations() : deleteConversation(deleteConfirm)}
                style={{ flex: 1, padding: '11px 0', background: '#E91E8C', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Liste des conversations ─────────────────────────────── */}
      <div style={{ width: activeChatId ? 0 : '100%', minWidth: activeChatId ? 0 : '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'white', transition: 'all .2s' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #FFE4F3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: '#E91E8C' }}>{t('messages')}</h2>
            {conversations.length > 0 && (
              <button onClick={() => setDeleteConfirm('all')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <HiTrash size={16} /> Tout supprimer
              </button>
            )}
          </div>

          {sortedFriends.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {sortedFriends.map(f => (
                  <div key={f.uid} onClick={() => openChat(f.uid)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=E91E8C&color=fff`}
                        alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: online[f.uid] ? '2.5px solid #22c55e' : '2.5px solid #C4829F' }} />
                      <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: online[f.uid] ? '#22c55e' : '#9ca3af', border: '2px solid white' }} />
                    </div>
                    <p style={{ fontSize: 10, color: '#8B5A6F', marginTop: 3, maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fullName.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <HiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} />
            <input className="input" placeholder={t('search')} value={search} onChange={e => searchFriends(e.target.value)} style={{ paddingLeft: 32, fontSize: 13 }} />
          </div>

          {searchResults.length > 0 && (
            <div className="card" style={{ marginTop: 6, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <div key={u.uid} onClick={() => openChat(u.uid)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #FFE4F3' }}>
                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                  <div><p style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</p><p style={{ fontSize: 12, color: '#C4829F' }}>@{u.username}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0
            ? <div style={{ padding: 30, textAlign: 'center', color: '#C4829F', fontSize: 14 }}>{t('noMessages')}</div>
            : conversations.map(conv => (
              <div key={conv.chatId} style={{ position: 'relative' }}>
                <div
                  onClick={() => { setActiveChatId(conv.chatId); setActiveUser(conv.user); navigate(`/messages/${conv.chatId}`, { replace: true }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', background: activeChatId === conv.chatId ? '#FFE4F3' : 'white', borderBottom: '1px solid #FDF4F8' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=E91E8C&color=fff`}
                      alt="" className="avatar" style={{ width: 46, height: 46 }} />
                    {/* ✅ Indicateur en ligne */}
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, background: online[conv.otherUid] ? '#22c55e' : '#9ca3af', borderRadius: '50%', border: '2px solid white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{conv.user.fullName}</p>
                      {conv.unread > 0 && <span style={{ background: '#E91E8C', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{conv.unread}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#C4829F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {online[conv.otherUid]
                        ? <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 11 }}>● En ligne</span>
                        : (conv.lastMsg?.fromUid === currentUser.uid ? 'Vous: ' : '') + (conv.lastMsg?.mediaType === 'audio' ? '🎤 Vocal' : conv.lastMsg?.text || (conv.lastMsg?.mediaURL ? '📎 Média' : ''))}
                    </p>
                  </div>
                  {/* Menu ⋮ pour supprimer */}
                  <button
                    onClick={e => { e.stopPropagation(); setConvMenu(convMenu === conv.chatId ? null : conv.chatId); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: '4px 6px', flexShrink: 0 }}>
                    <HiDotsVertical size={18} />
                  </button>
                </div>

                {/* Menu suppression conversation */}
                {convMenu === conv.chatId && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'white', border: '1px solid #FFE4F3', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.12)', overflow: 'hidden', minWidth: 140 }}>
                    <button onClick={() => { setConvMenu(null); setDeleteConfirm(conv.chatId); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', fontSize: 13, fontWeight: 600 }}>
                      <HiTrash size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Zone de discussion ──────────────────────────────────── */}
      {activeChatId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.bg, width: '100%' }}>

          {/* Header chat */}
          <div style={{ background: 'white', borderBottom: '1px solid #FFE4F3', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => { setActiveChatId(null); navigate('/messages', { replace: true }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C' }}>
              <HiArrowLeft size={22} />
            </button>
            {activeUser && <>
              <div style={{ position: 'relative' }}>
                <img src={activeUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.fullName)}&background=E91E8C&color=fff`}
                  alt="" className="avatar" style={{ width: 40, height: 40, cursor:'pointer' }} onClick={()=>navigate(`/profile/${otherUid}`)} />
                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: online[otherUid] ? '#22c55e' : '#9ca3af', borderRadius: '50%', border: '2px solid white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{activeUser.fullName}</p>
                <p style={{ fontSize: 11, color: online[otherUid] ? '#22c55e' : '#C4829F', fontWeight: online[otherUid] ? 600 : 400 }}>
                  {online[otherUid] ? '● En ligne' : t('offline')}
                </p>
              </div>
              <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setHeaderMenu(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiDotsVertical size={20}/></button>
                {headerMenu&&(
                  <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #FFE4F3', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:200, zIndex:50, overflow:'hidden' }}>
                    <button onClick={()=>{setMediaModal(true);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #FFE4F3', fontFamily:'Poppins', fontSize:14, color:'#2D1220' }}><HiArchive size={18} color='#E91E8C'/> Médias partagés</button>
                    <button onClick={()=>{setThemeModal(true);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #FFE4F3', fontFamily:'Poppins', fontSize:14, color:'#2D1220' }}><HiColorSwatch size={18} color='#a855f7'/> Thème</button>
                    <button onClick={()=>{setDeleteConfirm(activeChatId);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#ef4444' }}><HiTrash size={18}/> Supprimer</button>
                  </div>
                )}
              </div>
            </>}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(msg => {
              const isMe = msg.fromUid === currentUser.uid;
              const isActived = msgAction === msg.id;
              return (
                <div key={msg.id}>
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                    {!isMe && <img src={msg.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.fromName || 'U')}&background=E91E8C&color=fff`}
                      alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />}

                    <div style={{ maxWidth: '72%' }}>
                      {/* Citation (reply) */}
                      {msg.replyTo && (
                        <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : '#FFE4F3', borderLeft: '3px solid #E91E8C', borderRadius: '8px 8px 0 0', padding: '5px 10px', marginBottom: 2 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#E91E8C', marginBottom: 1 }}>{msg.replyTo.fromName}</p>
                          <p style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : '#8B5A6F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{msg.replyTo.text}</p>
                        </div>
                      )}

                      {/* Bulle du message */}
                      <div
                        style={{ position:'relative', wordBreak:'break-word', cursor:'pointer', borderRadius: msg.replyTo ? (isMe?'8px 8px 0 8px':'0 8px 8px 8px') : (isMe?'18px 18px 4px 18px':'18px 18px 18px 4px'), padding:'10px 14px', maxWidth:'100%', whiteSpace:'pre-wrap', lineHeight:1.5, fontSize:14, background: isMe ? theme.me : theme.other, color: isMe ? 'white' : '#2D1220' }}
                        onClick={e => { e.stopPropagation(); setMsgAction(isActived ? null : msg.id); }}
                        onContextMenu={e => { e.preventDefault(); setBottomSheet({msg, isMe}); }}
                      >
                        {msg.text && <p>{msg.text}</p>}
                        {msg.edited && <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>modifié</span>}
                        {msg.mediaURL && (
                          <div style={{ marginTop: msg.text ? 6 : 0 }}>
                            {msg.mediaType === 'image' && <img src={msg.mediaURL} alt="" onClick={()=>setZoomMedia({url:msg.mediaURL,type:'image'})} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', cursor:'pointer' }} />}
                            {msg.mediaType === 'video' && <div style={{position:'relative'}} onClick={()=>setZoomMedia({url:msg.mediaURL,type:'video'})}><video src={msg.mediaURL} style={{ maxWidth: '100%', borderRadius: 8, cursor:'pointer' }} /><div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,background:'rgba(0,0,0,0.5)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'white',fontSize:16}}>▶</span></div></div></div>}
                            {msg.mediaType === 'audio' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                <HiMicrophone size={16} color={isMe ? 'rgba(255,255,255,.8)' : '#E91E8C'} />
                                <audio src={msg.mediaURL} controls style={{ height: 32, flex: 1 }} />
                              </div>
                            )}
                            {msg.mediaType === 'raw' && (
                              <a href={msg.mediaURL} target="_blank" rel="noreferrer" style={{ color: isMe ? 'rgba(255,255,255,.9)' : '#3b82f6', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <HiDownload size={14} /> Télécharger
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: 10, color: '#C4829F', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                        {msg.ts ? new Date(msg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isMe && <span> · {msg.read ? '✓✓' : '✓'}</span>}
                      </p>
                    </div>
                    {Object.keys(msgReactions[msg.id]||{}).length>0&&(
                      <div style={{position:'relative',display:'flex',justifyContent:isMe?'flex-end':'flex-start',paddingLeft:isMe?0:40,marginTop:-14,marginBottom:4,zIndex:3}}>
                        <div style={{display:'flex',gap:1,background:'white',borderRadius:20,padding:'3px 7px',boxShadow:'0 2px 8px rgba(0,0,0,.2)',border:'1px solid #FFE4F3',fontSize:16}}>
                          {Object.entries(Object.entries(msgReactions[msg.id]||{}).reduce((a,[,e])=>{a[e]=(a[e]||0)+1;return a;},{})).map(([e,n])=><span key={e}>{e}{n>1?<span style={{fontSize:10,marginLeft:1}}>{n}</span>:''}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions du message */}
                  
                  {isActived && (
                    <div onClick={e=>e.stopPropagation()} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', marginTop:4, paddingLeft:isMe?0:34 }}>
                      <button onClick={()=>setBottomSheet({msg,isMe})} style={{ background:'rgba(233,30,140,0.08)', border:'none', borderRadius:20, padding:'4px 12px', fontSize:11, color:'#E91E8C', cursor:'pointer' }}>⋯ Options</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Preview média */}
          {(mediaPreview || (mediaFile && mediaType === 'audio')) && (
            <div style={{ background: 'white', borderTop: '1px solid #FFE4F3', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {mediaType === 'image' && <img src={mediaPreview} alt="" style={{ height: 60, borderRadius: 8 }} />}
              {mediaType === 'video' && <video src={mediaPreview} style={{ height: 60, borderRadius: 8 }} />}
              {mediaType === 'audio' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><HiMicrophone size={20} color="#E91E8C" /><audio src={mediaPreview} controls style={{ height: 32, flex: 1 }} /></div>}
              {mediaType === 'raw' && <span style={{ fontSize: 13, color: '#8B5A6F' }}>📎 {mediaFile?.name}</span>}
              <button onClick={removeMedia} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C' }}><HiX size={18} /></button>
            </div>
          )}

          {/* Répondre à / Modifier — indication */}
          {(replyTo || editingMsgId) && (
            <div style={{ background: '#FFF0F8', borderTop: '1px solid #FFE4F3', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ borderLeft: '3px solid #E91E8C', paddingLeft: 8, flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#E91E8C' }}>{editingMsgId ? '✏️ Modification' : `↩️ Répondre à ${replyTo?.fromName}`}</p>
                {replyTo && <p style={{ fontSize: 11, color: '#8B5A6F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text}</p>}
              </div>
              <button onClick={() => { setReplyTo(null); cancelEdit(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}><HiX size={16} /></button>
            </div>
          )}

          {/* Enregistrement vocal */}
          {recording && (
            <div style={{ background: '#FFF0F8', borderTop: '1px solid #FFE4F3', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E91E8C', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 13, color: '#E91E8C', fontWeight: 600 }}>Enregistrement... {fmt(recordSec)}</span>
              <button onClick={cancelRecording} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', fontSize: 12 }}>Annuler</button>
            </div>
          )}

          {/* Barre d'envoi */}
          <div style={{ background: 'white', borderTop: '1px solid #FFE4F3', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={photoRef} type="file" accept="image/*"  style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'image')} />
            <input ref={videoRef} type="file" accept="video/*"  style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'video')} />
            <input ref={fileRef}  type="file"                   style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'raw')} />
            <button onClick={() => photoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4, flexShrink: 0 }}><HiPhotograph size={22} /></button>
            <button onClick={() => videoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4, flexShrink: 0 }}><HiVideoCamera size={22} /></button>
            <button onClick={() => fileRef.current?.click()}  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4, flexShrink: 0 }}><HiPaperClip size={22} /></button>
            <button
              onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={e => { e.preventDefault(); startRecording(); }} onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
              style={{ background: recording ? 'linear-gradient(135deg,#E91E8C,#FF6BB5)' : 'none', border: 'none', borderRadius: recording ? '50%' : 0, width: recording ? 36 : 'auto', height: recording ? 36 : 'auto', cursor: 'pointer', color: recording ? 'white' : '#C4829F', padding: recording ? 0 : 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Appuyer et maintenir">
              {recording ? <HiStop size={18} /> : <HiMicrophone size={22} />}
            </button>
            <input
              className="input"
              placeholder={editingMsgId ? 'Modifier le message...' : t('typeMessage')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              style={{ flex: 1, border: editingMsgId ? '1.5px solid #E91E8C' : undefined }}
              disabled={recording}
            />
            <button onClick={sendMessage}
              disabled={(!text.trim() && !mediaFile) || uploading || recording}
              style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: (text.trim() || mediaFile) && !uploading && !recording ? 1 : 0.5, boxShadow: '0 2px 10px rgba(233,30,140,.35)' }}>
              {uploading ? <span style={{ color: 'white', fontSize: 11 }}>...</span> : editingMsgId ? <HiCheck size={18} color="white" /> : <HiPaperAirplane size={18} color="white" style={{ transform: 'rotate(90deg)' }} />}
            </button>
          </div>
        </div>
      )}
    

      {/* Zoom media modal */}
      {zoomMedia && (
        <div onClick={()=>setZoomMedia(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {zoomMedia.type==='image' ? <img src={zoomMedia.url} alt='' style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/> : <video src={zoomMedia.url} controls style={{ maxWidth:'100%', maxHeight:'100%' }}/>}
          <button onClick={()=>setZoomMedia(null)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'white', fontSize:28, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Médias partagés modal */}
      {mediaModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setMediaModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxHeight:'75vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:'#E91E8C' }}>Médias partagés</h3>
              <button onClick={()=>setMediaModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={20}/></button>
            </div>
            {/* Photos */}
            <p style={{ fontWeight:600, fontSize:13, color:'#8B5A6F', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiPhotograph size={16} color='#E91E8C'/> Photos</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginBottom:16 }}>
              {messages.filter(m=>m.mediaType==='image'&&m.mediaURL).map(m=>(
                <div key={m.id} onClick={()=>{setZoomMedia({url:m.mediaURL,type:'image'});setMediaModal(false);}} style={{ aspectRatio:'1', overflow:'hidden', borderRadius:8, cursor:'pointer' }}>
                  <img src={m.mediaURL} alt='' style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='image').length===0 && <p style={{ color:'#C4829F', fontSize:12, gridColumn:'span 3' }}>Aucune photo</p>}
            </div>
            {/* Vidéos */}
            <p style={{ fontWeight:600, fontSize:13, color:'#8B5A6F', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiVideoCamera size={16} color='#E91E8C'/> Vidéos</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
              {messages.filter(m=>m.mediaType==='video'&&m.mediaURL).map(m=>(
                <div key={m.id} onClick={()=>{setZoomMedia({url:m.mediaURL,type:'video'});setMediaModal(false);}} style={{ aspectRatio:'16/9', overflow:'hidden', borderRadius:8, cursor:'pointer', position:'relative', background:'#000' }}>
                  <video src={m.mediaURL} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:14 }}>▶</span></div></div>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='video').length===0 && <p style={{ color:'#C4829F', fontSize:12, gridColumn:'span 2' }}>Aucune vidéo</p>}
            </div>
            {/* Vocaux */}
            <p style={{ fontWeight:600, fontSize:13, color:'#8B5A6F', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiMicrophone size={16} color='#E91E8C'/> Vocaux</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {messages.filter(m=>m.mediaType==='audio'&&m.mediaURL).map(m=>(
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#FFF0F8', borderRadius:12, padding:'8px 12px' }}>
                  <HiMicrophone size={16} color='#E91E8C'/>
                  <audio src={m.mediaURL} controls style={{ flex:1, height:32 }}/>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='audio').length===0 && <p style={{ color:'#C4829F', fontSize:12 }}>Aucun vocal</p>}
            </div>
          </div>
        </div>
      )}

      {/* Thème modal */}
      {themeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setThemeModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:'#E91E8C' }}>Thème</h3>
              <button onClick={()=>setThemeModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={20}/></button>
            </div>
            {[
              { key:'rose', label:'Amour', icon:<HiHeart size={20} color='#E91E8C'/>, color:'#E91E8C' },
              { key:'violet', label:'Musique', icon:<HiMusicNote size={20} color='#a855f7'/>, color:'#a855f7' },
              { key:'blue', label:'Ami', icon:<HiUserGroup size={20} color='#3b82f6'/>, color:'#3b82f6' },
            ].map(t=>(
              <button key={t.key} onClick={()=>{setChatTheme(t.key);setThemeModal(false);
              set(ref(rtdb,`conversations/${activeChatId}/theme`),t.key);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 8px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #FFE4F3', fontFamily:'Poppins', fontSize:15, color:'#2D1220', fontWeight:chatTheme===t.key?700:400 }}>
                {t.icon} {t.label}
                {chatTheme===t.key && <HiCheck size={18} color={t.color} style={{ marginLeft:'auto' }}/>}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Bottom Sheet — Facebook style */}
      {bottomSheet && (
        <div onClick={()=>setBottomSheet(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'16px 0 30px', width:'100%', maxWidth:480 }}>
            {/* Reactions */}
            <div style={{ display:'flex', justifyContent:'center', gap:16, padding:'12px 20px 16px', borderBottom:'1px solid #FFE4F3' }}>
              {['❤️','😂','😮','😢','😡','👍'].map(em=>(
                <span key={em} onClick={()=>reactToMsg(bottomSheet.msg.id,em)} style={{ fontSize:32, cursor:'pointer', opacity: msgReactions[bottomSheet.msg.id]?.[currentUser.uid]===em?1:0.5 }}>{em}</span>
              ))}
            </div>
            {/* Actions */}
            {[
              { icon:'↩️', label:'Répondre', fn:()=>{ startReply(bottomSheet.msg); setBottomSheet(null); } },
              { icon:'📋', label:'Copier', fn:()=>{ navigator.clipboard.writeText(bottomSheet.msg.text||''); setBottomSheet(null); } },
              { icon:'↪️', label:'Transférer', fn:()=>{ setTransferMsg(bottomSheet.msg); setBottomSheet(null); } },
              ...(bottomSheet.isMe ? [
                { icon:'✏️', label:'Modifier', fn:()=>{ startEdit(bottomSheet.msg); setBottomSheet(null); } },
                { icon:'🗑️', label:'Supprimer pour moi', fn:()=>deleteForMe(bottomSheet.msg.id), red:true },
                { icon:'🗑️', label:'Supprimer pour tout le monde', fn:()=>deleteMessage(bottomSheet.msg.id), red:true },
              ] : [
                { icon:'🗑️', label:'Supprimer pour moi', fn:()=>deleteForMe(bottomSheet.msg.id), red:true },
              ]),
            ].map(({icon,label,fn,red})=>(
              <button key={label} onClick={fn} style={{ width:'100%', display:'flex', alignItems:'center', gap:16, padding:'14px 24px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins', fontSize:15, color:red?'#ef4444':'#2D1220', fontWeight:500 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
</div>
  );
}
