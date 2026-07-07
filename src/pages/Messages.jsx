// src/pages/Messages.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, push, onValue, update, set, remove } from 'firebase/database';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, onSnapshot, updateDoc, deleteDoc, arrayRemove, arrayUnion, writeBatch } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
function getOtherUid(chatId, myUid) { const parts = chatId.split('_'); return parts[0] === myUid ? parts[1] : parts[0]; }
import { sendPushNotification } from '../utils/onesignal';
import {
  HiArrowLeft, HiPaperAirplane, HiSearch, HiPhotograph,
  HiVideoCamera, HiPaperClip, HiX, HiDownload, HiMicrophone, HiStop,
  HiTrash, HiPencil, HiReply, HiDotsVertical, HiCheck,
  HiArchive, HiColorSwatch, HiMusicNote, HiHeart, HiUserGroup, HiUserAdd,
  HiPhone, HiVideoCamera, HiBan,
} from 'react-icons/hi';

export default function Messages() {
  const { chatId: paramChatId } = useParams();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

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
    rose:   { me:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', other:'#F0F2F5', bg:'#FFFFFF' },
    violet: { me:'linear-gradient(135deg,#7c3aed,#a855f7)', other:'#F0F2F5', bg:'#FFFFFF' },
    blue:   { me:'linear-gradient(180deg,#1B84FF,#1877F2)', other:'#F0F2F5', bg:'#FFFFFF' },
  };
  const theme = THEMES[chatTheme]||THEMES.rose;
  const [convMenu,      setConvMenu]      = useState(null);  // chatId showing menu
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [transferMsg, setTransferMsg] = useState(null);  // chatId | 'all'

  // ── Groupes ───────────────────────────────────────────────
  const [groups,          setGroups]          = useState([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName,       setGroupName]       = useState('');
  const [groupSel,        setGroupSel]        = useState({});
  const [creatingGroup,   setCreatingGroup]   = useState(false);
  const isGroupChat = !!activeChatId?.startsWith('group_');
  const activeGroup = isGroupChat ? groups.find(g => `group_${g.id}` === activeChatId) : null;
  const isGroupAdmin = !!activeGroup?.admins?.includes(currentUser?.uid);

  const mrRef      = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);
  const bottomRef  = useRef();
  const prevMsgLen = useRef(0);
  const photoRef   = useRef(); const videoRef = useRef(); const fileRef = useRef();
  const groupPhotoRef = useRef();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [friendsListG, setFriendsListG] = useState([]);
  const [memberSearchG, setMemberSearchG] = useState('');
  const [selectedFriendsG, setSelectedFriendsG] = useState({});
  const [addingMembersG, setAddingMembersG] = useState(false);
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false);
  const [callInfoOpen, setCallInfoOpen] = useState(false);
  const [editGroupOpen,  setEditGroupOpen]  = useState(false);
  const [msgSearchOpen,  setMsgSearchOpen]  = useState(false);
  const [groupMetas,     setGroupMetas]     = useState({});
  const [editGroupName,  setEditGroupName]  = useState('');
  const [savingGroup,    setSavingGroup]    = useState(false);
  const [groupMemberProfiles, setGroupMemberProfiles] = useState([]);

  useEffect(() => { if (paramChatId) setActiveChatId(paramChatId); }, [paramChatId]);

  // Mes groupes (temps réel)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => g.type !== 'page')),
      err => console.error('Lecture groupes refusée:', err?.message || err));
    return () => unsub();
  }, [currentUser]);

  // Ouvrir "Créer un groupe" depuis le menu latéral
  useEffect(() => {
    if (location.state?.createGroup) setCreateGroupOpen(true);
  }, [location.state]);

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
      if (!snap.exists()) { setConversations([]); return; }
      const data = snap.val();
      const list = [];
      const gMetas = {};
      for (const [chatId, conv] of Object.entries(data)) {
        if (chatId.startsWith('group_')) {
          const msgs = conv.messages ? Object.values(conv.messages) : [];
          const last = msgs[msgs.length - 1];
          gMetas[chatId.slice(6)] = last ? { text: last.text || (last.mediaType === 'audio' ? '🎤 Vocal' : last.mediaURL ? '📎 Média' : ''), from: last.fromName, ts: last.ts } : null;
          continue;
        }
        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = getOtherUid(chatId, currentUser.uid);

        const msgEntries = Object.entries(conv.messages || {});
        const msgs  = msgEntries.map(([, m]) => m);
        const last  = msgs[msgs.length - 1];
        const unread = msgs.filter(m => m.toUid === currentUser.uid && !m.read).length;

        // ✅ Marquer "lu" avy hatrany — ALOHAN'ny fakana ny profil, ka na conversation
        // misy compte voafafa/tsy hita aza dia voamarika (io no namela ny badge nijanona)
        if (unread > 0) {
          const upd = {};
          msgEntries.forEach(([mid, m]) => {
            if (m.toUid === currentUser.uid && !m.read) upd[`${mid}/read`] = true;
          });
          update(ref(rtdb, `conversations/${chatId}/messages`), upd)
            .catch(e => console.error('Marquage lu refusé pour', chatId, ':', e?.message || e));
        }

        try {
          const s = await getDoc(doc(db, 'users', otherUid));
          if (!s.exists()) continue;
          list.push({ chatId, otherUid, user: s.data(), lastMsg: last, unread });
        } catch {}
      }
      list.sort((a, b) => (b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0));
      setConversations(list);
      setGroupMetas(gMetas);
    }, err => {
      console.error('Lecture conversations refusée:', err?.message || err);
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
          update(ref(rtdb, `conversations/${activeChatId}/messages/${m.id}`), { read: true }).catch(() => {});
        }
      });
    }, err => {
      console.error('Lecture messages refusée:', err?.message || err);
    });
    return () => unsub();
  }, [activeChatId, currentUser]);

  // ── Play sound on new incoming message ─────────────────────
  useEffect(() => {
    if (messages.length > prevMsgLen.current) {
      const last = messages[messages.length - 1];
      if (last && last.fromUid !== currentUser?.uid) {
      }
    }
    prevMsgLen.current = messages.length;
  }, [messages]);
  const atBottomRef = useRef(true);
  const prevChatRef = useRef(null);
  useEffect(() => {
    const isNewChat = prevChatRef.current !== activeChatId;
    prevChatRef.current = activeChatId;
    if (isNewChat) {
      // Chat vao misokatra : midina any amin'ny farany
      setTimeout(() => bottomRef.current?.scrollIntoView(), 60);
      atBottomRef.current = true;
      return;
    }
    // Raha mijery messages taloha (scroll ambony) dia TSY averina midina
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatId]);

  useEffect(() => {
    if (!activeChatId || activeChatId.startsWith('group_')) { setActiveUser(null); return; }
    const otherUid = getOtherUid(activeChatId, currentUser.uid);
    getDoc(doc(db, 'users', otherUid)).then(snap => { if (snap.exists()) setActiveUser(snap.data()); });
    const onlineRef = ref(rtdb, `online/${otherUid}`);
    const unsub = onValue(onlineRef, snap => { setOnline(p => ({ ...p, [otherUid]: snap.exists() && snap.val() === true })); });
    return () => unsub();
  }, [activeChatId]);

  // Close menus on outside click
  useEffect(() => {
    const fn = () => { setMsgAction(null); setConvMenu(null); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  function handleMediaSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file); setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  }

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
    if (mrRef.current && recording) { mrRef.current.stop(); }
    clearInterval(timerRef.current);
    setRecording(false); setRecordSec(0);
    removeMedia();
  }

  async function sendMessage() {
    if (!text.trim() && !mediaFile) return;
    if (!activeChatId) return;
    setUploading(true);
    try {
      let mediaURL = '', finalMT = '';
      atBottomRef.current = true;
      if (mediaFile) { const r = await uploadToTelegram(mediaFile); mediaURL = r.url; finalMT = r.type; }
      const otherUid = isGroupChat ? null : activeChatId.split('_').find(p => p !== currentUser.uid);

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
          ...(otherUid ? { toUid: otherUid } : {}),
          fromName: userProfile.fullName,
          fromPhoto: userProfile.photoURL || '',
          text: text.trim(),
          mediaURL, mediaType: finalMT,
          ts: Date.now(),
          read: false,
          ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, fromName: replyTo.fromName } } : {}),
        };
        await push(ref(rtdb, `conversations/${activeChatId}/messages`), msgData);
        await update(ref(rtdb, `conversations/${activeChatId}/meta`), {
          lastMessage: text.trim() || (finalMT === 'audio' ? '🎤 Vocal' : '📎 Média'),
          lastTs: Date.now(),
        });
        const notifBody = text.trim() || (finalMT === 'audio' ? 'a envoyé un message vocal 🎤' : 'a envoyé un fichier');
        if (isGroupChat && activeGroup) {
          activeGroup.members.filter(m => m !== currentUser.uid).forEach(m =>
            sendPushNotification({
              toExternalId: m,
              title: `${activeGroup.name} — ${userProfile.fullName}`,
              message: notifBody,
              fromPhoto: userProfile.photoURL || '',
              data: { type: 'message', conversationId: activeChatId },
            })
          );
        } else if (otherUid) {
          sendPushNotification({
            toExternalId: otherUid,
            title: userProfile.fullName,
            message: notifBody,
            fromPhoto: userProfile.photoURL || '',
            data: { type: 'message', conversationId: activeChatId },
          });
        }
      }
      setText(''); removeMedia(); setReplyTo(null);
    } catch (err) { console.error(err); alert('Erreur lors de l\'envoi : ' + (err?.message || err)); }
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

  async function deleteAllConversations() {
    const { ref: r, get } = await import('firebase/database');
    const snap = await get(r(rtdb, 'conversations'));
    if (!snap.exists()) { setDeleteConfirm(null); return; }
    const all = Object.keys(snap.val()).filter(id => id.includes(currentUser.uid));
    await Promise.all(all.map(id => remove(ref(rtdb, 'conversations/' + id))));
    setActiveChatId(null); setDeleteConfirm(null);
    navigate('/messages', { replace: true });
  }
  async function createGroup() {
    const name = groupName.trim();
    const members = Object.keys(groupSel).filter(k => groupSel[k]);
    if (!name) { alert('Donnez un nom au groupe'); return; }
    if (members.length === 0) { alert('Choisissez au moins un ami'); return; }
    setCreatingGroup(true);
    try {
      const refDoc = await addDoc(collection(db, 'groups'), {
        name,
        type: 'chat',
        photoURL: '',
        admins: [currentUser.uid],
        members: [currentUser.uid, ...members],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setCreateGroupOpen(false); setGroupName(''); setGroupSel({});
      setActiveChatId(`group_${refDoc.id}`);
      navigate(`/messages/group_${refDoc.id}`, { replace: true });
    } catch (err) { alert('Erreur création groupe : ' + (err?.message || err)); }
    setCreatingGroup(false);
  }

  async function openGroupEdit() {
    if (!activeGroup) return;
    setEditGroupName(activeGroup.name || '');
    setEditGroupOpen(true);
    const list = await Promise.all((activeGroup.members || []).slice(0, 60).map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setGroupMemberProfiles(list.filter(Boolean));
  }

  async function saveGroupEdit() {
    const n = editGroupName.trim();
    if (!n) { alert('Le nom ne peut pas être vide'); return; }
    setSavingGroup(true);
    try {
      await updateDoc(doc(db, 'groups', activeGroup.id), { name: n });
      setEditGroupOpen(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setSavingGroup(false);
  }

  async function toggleGroupAdmin(uid) {
    const isA = activeGroup.admins?.includes(uid);
    if (isA && activeGroup.admins.length === 1) { alert('Le groupe doit garder au moins un admin.'); return; }
    try {
      await updateDoc(doc(db, 'groups', activeGroup.id), { admins: isA ? arrayRemove(uid) : arrayUnion(uid) });
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function changeGroupPhoto(e) {
    const file = e.target.files[0]; if (!file || !activeGroup) return;
    setUploadingGroupPhoto(true);
    try {
      const r = await uploadToTelegram(file);
      await updateDoc(doc(db, 'groups', activeGroup.id), { photoURL: r.url });
    } catch (err) { alert('Erreur photo : ' + (err?.message || err)); }
    setUploadingGroupPhoto(false);
    e.target.value = '';
  }

  async function openAddMemberToChat() {
    if (!activeGroup) return;
    setAddMemberOpen(true); setMemberSearchG(''); setSelectedFriendsG({});
    const myFriends = userProfile?.friends || [];
    const notIn = myFriends.filter(uid => !activeGroup.members?.includes(uid));
    const list = await Promise.all(notIn.map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setFriendsListG(list.filter(Boolean));
  }

  function copyGroupInviteLink() {
    if (!activeGroup) return;
    const url = `${window.location.origin}/messages/group_${activeGroup.id}`;
    if (navigator.share) { navigator.share({ title: activeGroup.name, text: `Rejoignez la discussion "${activeGroup.name}" sur Traingo !`, url }).catch(() => {}); }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
  }

  async function addSelectedMembersToChat() {
    const uids = Object.keys(selectedFriendsG).filter(k => selectedFriendsG[k]);
    if (uids.length === 0 || !activeGroup) return;
    setAddingMembersG(true);
    try {
      await updateDoc(doc(db, 'groups', activeGroup.id), { members: arrayUnion(...uids) });
      const batch = writeBatch(db);
      uids.forEach(uid => batch.set(doc(collection(db, 'notifications')), {
        toUid: uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'general', message: `${userProfile.fullName} vous a ajouté(e) à la discussion "${activeGroup.name}"`,
        read: false, createdAt: serverTimestamp(),
      }));
      await batch.commit();
      setAddMemberOpen(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setAddingMembersG(false);
  }

  async function leaveGroup() {
    if (!activeGroup) return;
    if (!window.confirm(`Quitter le groupe "${activeGroup.name}" ?`)) return;
    await updateDoc(doc(db, 'groups', activeGroup.id), {
      members: arrayRemove(currentUser.uid),
      admins: arrayRemove(currentUser.uid),
    });
    setActiveChatId(null); navigate('/messages', { replace: true });
  }

  async function deleteGroup() {
    if (!activeGroup || !isGroupAdmin) return;
    if (!window.confirm(`Supprimer définitivement le groupe "${activeGroup.name}" ?`)) return;
    await remove(ref(rtdb, `conversations/group_${activeGroup.id}`)).catch(() => {});
    await deleteDoc(doc(db, 'groups', activeGroup.id));
    setActiveChatId(null); navigate('/messages', { replace: true });
  }

  async function toggleBlockInChat() {
    if (!otherUid) return;
    const already = (userProfile?.blocked || []).includes(otherUid);
    const msg = already ? 'Débloquer cette personne ?' : 'Bloquer cette personne ? Vous ne verrez plus ses messages ni publications.';
    if (!window.confirm(msg)) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blocked: already ? arrayRemove(otherUid) : arrayUnion(otherUid),
      });
      setUserProfile(p => ({ ...p, blocked: already ? (p.blocked||[]).filter(u=>u!==otherUid) : [...(p.blocked||[]), otherUid] }));
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
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

  const otherUid = (activeChatId && !isGroupChat) ? getOtherUid(activeChatId, currentUser.uid) : null;
  const av = (name, photo) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1877F2&color=fff`;
  const fmtDuration = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', height: activeChatId ? 'calc(100dvh - 120px)' : 'calc(100dvh - 216px)', background: 'white', fontFamily: 'Poppins,sans-serif' }}>

      {/* ── Confirmation dialog ───────────────────────────────── */}
      {transferMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 430, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setTransferMsg(null)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#050505", marginBottom: 16 }}>↪️ Transférer à...</p>
            {conversations.map(conv => (
              <div key={conv.chatId} onClick={async () => { await push(ref(rtdb, `conversations/${conv.chatId}/messages`), { fromUid: currentUser.uid, toUid: conv.otherUid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || "", text: transferMsg.text || "", mediaURL: transferMsg.mediaURL || "", mediaType: transferMsg.mediaType || "", ts: Date.now(), read: false, forwarded: true }); setTransferMsg(null); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", cursor: "pointer", borderBottom: "1px solid #E4E6EB" }}>
                <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=1877F2&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
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
            <p style={{ fontWeight: 700, fontSize: 16, color: '#050505', marginBottom: 8 }}>
              {deleteConfirm === 'all' ? 'Supprimer toutes les conversations ?' : 'Supprimer cette conversation ?'}
            </p>
            <p style={{ fontSize: 13, color: '#65676B', marginBottom: 20 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px 0', background: '#E4E6EB', border: 'none', borderRadius: 14, fontWeight: 600, cursor: 'pointer', color: '#1877F2' }}>Annuler</button>
              <button onClick={() => deleteConfirm === 'all' ? deleteAllConversations() : deleteConversation(deleteConfirm)}
                style={{ flex: 1, padding: '11px 0', background: '#1877F2', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Liste des conversations ─────────────────────────────── */}
      <div style={{ width: activeChatId ? 0 : '100%', minWidth: activeChatId ? 0 : '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'white', transition: 'all .2s' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E4E6EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1877F2' }}>{t('messages')}</h2>
            <button onClick={() => setCreateGroupOpen(true)} className="btn-gold"
              style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <HiUserGroup size={15} /> Groupe
            </button>
            <button onClick={() => setMsgSearchOpen(p => !p)}
              style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: '50%', background: msgSearchOpen ? '#E7F0FE' : '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiSearch size={17} />
            </button>

          </div>

          {friendsProfiles.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {friendsProfiles.map(f => (
                  <div key={f.uid} onClick={() => openChat(f.uid)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=1877F2&color=fff`}
                        alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: online[f.uid] ? '2.5px solid #22c55e' : '2.5px solid #65676B' }} />
                      <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: online[f.uid] ? '#22c55e' : '#9ca3af', border: '2px solid white' }} />
                    </div>
                    <p style={{ fontSize: 10, color: '#65676B', marginTop: 3, maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fullName.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgSearchOpen && (
            <div style={{ position: 'relative' }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} />
              <input className="input" autoFocus placeholder={t('search')} value={search} onChange={e => searchFriends(e.target.value)} style={{ paddingLeft: 34, fontSize: 13, borderRadius: 30 }} />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="card" style={{ marginTop: 6, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <div key={u.uid} onClick={() => openChat(u.uid)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #E4E6EB' }}>
                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                  <div><p style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName}</p><p style={{ fontSize: 12, color: '#65676B' }}>@{u.username}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.length > 0 && (
            <div style={{ borderBottom: '1px solid #E4E6EB' }}>
              <p style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 1 }}>👥 Groupes</p>
              {groups.map(g => (
                <div key={g.id}
                  onClick={() => { setActiveChatId(`group_${g.id}`); navigate(`/messages/group_${g.id}`, { replace: true }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', background: activeChatId === `group_${g.id}` ? '#E7F0FE' : 'white', borderBottom: '1px solid #F0F2F5' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(24,119,242,.35)' }}>
                    {g.photoURL ? <img src={g.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <HiUserGroup size={22} color="white" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                    <p style={{ fontSize: 12, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {groupMetas[g.id]?.text
                        ? `${groupMetas[g.id].from ? groupMetas[g.id].from.split(' ')[0] + ' : ' : ''}${groupMetas[g.id].text}`
                        : `${g.members?.length || 0} membres${g.admins?.includes(currentUser.uid) ? ' · Vous êtes admin' : ''}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {conversations.length === 0
            ? <div style={{ padding: 30, textAlign: 'center', color: '#65676B', fontSize: 14 }}>{t('noMessages')}</div>
            : conversations.map(conv => (
              <div key={conv.chatId} style={{ position: 'relative' }}>
                <div
                  onClick={() => { setActiveChatId(conv.chatId); setActiveUser(conv.user); navigate(`/messages/${conv.chatId}`, { replace: true }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', background: activeChatId === conv.chatId ? '#E4E6EB' : 'white', borderBottom: '1px solid #F0F2F5' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={conv.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.fullName)}&background=1877F2&color=fff`}
                      alt="" className="avatar" style={{ width: 46, height: 46 }} />
                    {/* ✅ Indicateur en ligne */}
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, background: online[conv.otherUid] ? '#22c55e' : '#9ca3af', borderRadius: '50%', border: '2px solid white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{conv.user.fullName}</p>
                      {conv.unread > 0 && <span style={{ background: '#1877F2', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{conv.unread}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {/* Ny point maitso amin'ny avatar no milaza "en ligne" — ny message farany no hita foana eto (format Facebook) */}
                      <span style={{ fontWeight: conv.unread > 0 ? 700 : 400, color: conv.unread > 0 ? '#050505' : '#65676B' }}>
                        {(conv.lastMsg?.fromUid === currentUser.uid ? 'Vous: ' : '') + (conv.lastMsg?.mediaType === 'audio' ? '🎤 Vocal' : conv.lastMsg?.text || (conv.lastMsg?.mediaURL ? '📎 Média' : ''))}
                      </span>
                      {conv.lastMsg?.fromUid === currentUser.uid && (
                        <span style={{ marginLeft: 5, fontWeight: 700, color: conv.lastMsg?.read ? '#1877F2' : '#8A8D91', fontSize: 11 }}>
                          {conv.lastMsg?.read ? '✓✓ Vu' : '✓ Envoyé'}
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Menu ⋮ pour supprimer */}
                  <button
                    onClick={e => { e.stopPropagation(); setConvMenu(convMenu === conv.chatId ? null : conv.chatId); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: '4px 6px', flexShrink: 0 }}>
                    <HiDotsVertical size={18} />
                  </button>
                </div>

                {/* Menu suppression conversation */}
                {convMenu === conv.chatId && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'white', border: '1px solid #E4E6EB', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.12)', overflow: 'hidden', minWidth: 140 }}>
                    <button onClick={() => { setConvMenu(null); setDeleteConfirm(conv.chatId); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', fontSize: 13, fontWeight: 600 }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', flexDirection: 'column', background: theme.bg, width: '100%', height: '100dvh', overflow: 'hidden' }}>

          {/* Header chat */}
          <div style={{ background: 'white', borderBottom: '1px solid #E4E6EB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 10 }}>
            <button onClick={() => { setActiveChatId(null); navigate('/messages', { replace: true }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2' }}>
              <HiArrowLeft size={22} />
            </button>
            {isGroupChat && activeGroup && <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {activeGroup.photoURL ? <img src={activeGroup.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <HiUserGroup size={20} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeGroup.name}</p>
                <p style={{ fontSize: 11, color: '#65676B' }}>{activeGroup.members?.length || 0} membres{isGroupAdmin ? ' · Admin' : ''}</p>
              </div>
              <button onClick={() => setCallInfoOpen(true)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HiVideoCamera size={18} /></button>
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setHeaderMenu(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: 4 }}><HiDotsVertical size={20} /></button>
                {headerMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #E4E6EB', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.12)', minWidth: 200, zIndex: 50, overflow: 'hidden' }}>
                    <button onClick={() => { setMediaModal(true); setHeaderMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #E4E6EB', fontFamily: 'Poppins', fontSize: 14, color: '#050505' }}><HiArchive size={18} color='#1877F2' /> Médias partagés</button>
                    <button onClick={() => { setHeaderMenu(false); openAddMemberToChat(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #E4E6EB', fontFamily: 'Poppins', fontSize: 14, color: '#050505' }}><HiUserAdd size={18} color='#1877F2' /> Ajouter un membre</button>
                    {isGroupAdmin && (
                      <button onClick={() => { setHeaderMenu(false); openGroupEdit(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #E4E6EB', fontFamily: 'Poppins', fontSize: 14, color: '#1877F2' }}><HiPencil size={18} /> Modifier le groupe</button>
                    )}
                    {isGroupAdmin && (
                      <button onClick={() => { setHeaderMenu(false); groupPhotoRef.current?.click(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #E4E6EB', fontFamily: 'Poppins', fontSize: 14, color: '#050505' }}><HiPhotograph size={18} color='#F2B300' /> {uploadingGroupPhoto ? 'Envoi de la photo...' : 'Photo du groupe'}</button>
                    )}
                    <button onClick={() => { setHeaderMenu(false); leaveGroup(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #E4E6EB', fontFamily: 'Poppins', fontSize: 14, color: '#F2B300' }}><HiArrowLeft size={18} /> Quitter le groupe</button>
                    {isGroupAdmin && (
                      <button onClick={() => { setHeaderMenu(false); deleteGroup(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 14, color: '#ef4444' }}><HiTrash size={18} /> Supprimer le groupe</button>
                    )}
                  </div>
                )}
              </div>
            </>}
            {!isGroupChat && activeUser && <>
              <div style={{ position: 'relative' }}>
                <img src={activeUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.fullName)}&background=1877F2&color=fff`}
                  alt="" className="avatar" style={{ width: 40, height: 40, cursor:'pointer' }} onClick={()=>navigate(`/profile/${otherUid}`)} />
                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: online[otherUid] ? '#22c55e' : '#9ca3af', borderRadius: '50%', border: '2px solid white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{activeUser.fullName}</p>
                <p style={{ fontSize: 11, color: online[otherUid] ? '#22c55e' : '#65676B', fontWeight: online[otherUid] ? 600 : 400 }}>
                  {online[otherUid] ? '● En ligne' : t('offline')}
                </p>
              </div>
              <button onClick={() => setCallInfoOpen(true)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HiPhone size={17} /></button>
              <button onClick={() => setCallInfoOpen(true)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><HiVideoCamera size={18} /></button>
              <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setHeaderMenu(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiDotsVertical size={20}/></button>
                {headerMenu&&(
                  <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:200, zIndex:50, overflow:'hidden' }}>
                    <button onClick={()=>{setMediaModal(true);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #E4E6EB', fontFamily:'Poppins', fontSize:14, color:'#050505' }}><HiArchive size={18} color='#1877F2'/> Médias partagés</button>
                    <button onClick={()=>{setThemeModal(true);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #E4E6EB', fontFamily:'Poppins', fontSize:14, color:'#050505' }}><HiColorSwatch size={18} color='#a855f7'/> Thème</button>
                    <button onClick={()=>{toggleBlockInChat();setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #E4E6EB', fontFamily:'Poppins', fontSize:14, color:'#FF2D8D' }}><HiBan size={18}/> {(userProfile?.blocked||[]).includes(otherUid) ? 'Débloquer' : 'Bloquer'} cette personne</button>
                    <button onClick={()=>{setDeleteConfirm(activeChatId);setHeaderMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#ef4444' }}><HiTrash size={18}/> Supprimer</button>
                  </div>
                )}
              </div>
            </>}
          </div>

          {/* Messages */}
          <div onScroll={e => { const el = e.currentTarget; atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150; }}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(msg => {
              const isMe = msg.fromUid === currentUser.uid;
              const isActived = msgAction === msg.id;
              return (
                <div key={msg.id}>
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                    {!isMe && <img src={msg.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.fromName || 'U')}&background=1877F2&color=fff`}
                      alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />}

                    <div style={{ maxWidth: '78%' }}>
                      {/* Citation (reply) */}
                      {msg.replyTo && (
                        <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : '#E4E6EB', borderLeft: '3px solid #1877F2', borderRadius: '8px 8px 0 0', padding: '5px 10px', marginBottom: 2 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#1877F2', marginBottom: 1 }}>{msg.replyTo.fromName}</p>
                          <p style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{msg.replyTo.text}</p>
                        </div>
                      )}

                      {!isMe && isGroupChat && msg.fromName && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#1877F2', marginBottom: 2, marginLeft: 4 }}>{msg.fromName}</p>
                      )}
                      {/* Bulle du message */}
                      <div
                        style={{ position:'relative', wordBreak:'break-word', cursor:'pointer', borderRadius: msg.replyTo ? (isMe?'8px 8px 0 8px':'0 8px 8px 8px') : (isMe?'18px 18px 4px 18px':'18px 18px 18px 4px'), padding:'10px 14px', maxWidth:'100%', whiteSpace:'pre-wrap', lineHeight:1.55, fontSize:15, background: isMe ? theme.me : theme.other, color: isMe ? 'white' : '#050505' }}
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
                                <HiMicrophone size={16} color={isMe ? 'rgba(255,255,255,.8)' : '#1877F2'} />
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
                        {/* Réaction — ancrée sur le coin de la BULLE elle-même (position:relative
                            ci-dessus), donc jamais décalée par la longueur du texte/timestamp */}
                        {Object.keys(msgReactions[msg.id]||{}).length>0&&(
                          <div style={{position:'absolute',bottom:-11,[isMe?'right':'left']:8,zIndex:3,display:'flex',gap:1,background:'white',borderRadius:20,padding:'2px 6px',boxShadow:'0 2px 8px rgba(0,0,0,.2)',border:'1px solid #E4E6EB',fontSize:14,lineHeight:1,alignItems:'center'}}>
                            {Object.entries(Object.entries(msgReactions[msg.id]||{}).reduce((a,[,e])=>{a[e]=(a[e]||0)+1;return a;},{})).map(([e,n])=>
                              <span key={e} style={{display:'flex',alignItems:'center'}}>{e}{n>1?<span style={{fontSize:9,marginLeft:1,color:'#65676B'}}>{n}</span>:''}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: 10, color: '#65676B', marginTop: Object.keys(msgReactions[msg.id]||{}).length>0 ? 8 : 2, textAlign: isMe ? 'right' : 'left' }}>
                        {msg.ts ? new Date(msg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {isMe && <span style={{ color: msg.read ? '#1877F2' : undefined, fontWeight: msg.read ? 700 : 400 }}> · {msg.read ? '✓✓ Vu' : '✓'}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Actions du message */}
                  
                  {isActived && (
                    <div onClick={e=>e.stopPropagation()} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', marginTop:4, paddingLeft:isMe?0:34 }}>
                      <button onClick={()=>setBottomSheet({msg,isMe})} style={{ background:'rgba(24,119,242,0.08)', border:'none', borderRadius:20, padding:'4px 12px', fontSize:11, color:'#1877F2', cursor:'pointer' }}>⋯ Options</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Preview média */}
          {(mediaPreview || (mediaFile && mediaType === 'audio')) && (
            <div style={{ background: 'white', borderTop: '1px solid #E4E6EB', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {mediaType === 'image' && <img src={mediaPreview} alt="" style={{ height: 60, borderRadius: 8 }} />}
              {mediaType === 'video' && <video src={mediaPreview} style={{ height: 60, borderRadius: 8 }} />}
              {mediaType === 'audio' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><HiMicrophone size={20} color="#1877F2" /><audio src={mediaPreview} controls style={{ height: 32, flex: 1 }} /></div>}
              {mediaType === 'raw' && <span style={{ fontSize: 13, color: '#65676B' }}>📎 {mediaFile?.name}</span>}
              <button onClick={removeMedia} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2' }}><HiX size={18} /></button>
            </div>
          )}

          {/* Répondre à / Modifier — indication */}
          {(replyTo || editingMsgId) && (
            <div style={{ background: '#F0F2F5', borderTop: '1px solid #E4E6EB', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ borderLeft: '3px solid #1877F2', paddingLeft: 8, flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#1877F2' }}>{editingMsgId ? '✏️ Modification' : `↩️ Répondre à ${replyTo?.fromName}`}</p>
                {replyTo && <p style={{ fontSize: 11, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text}</p>}
              </div>
              <button onClick={() => { setReplyTo(null); cancelEdit(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={16} /></button>
            </div>
          )}

          {/* Enregistrement vocal */}
          {recording && (
            <div style={{ background: '#F0F2F5', borderTop: '1px solid #E4E6EB', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1877F2', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 13, color: '#1877F2', fontWeight: 600 }}>Enregistrement... {fmtDuration(recordSec)}</span>
              <button onClick={cancelRecording} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 12 }}>Annuler</button>
            </div>
          )}

          {/* Barre d'envoi */}
          <div style={{ background: 'white', borderTop: '1px solid #E4E6EB', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={photoRef} type="file" accept="image/*"  style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'image')} />
            <input ref={videoRef} type="file" accept="video/*"  style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'video')} />
            <input ref={fileRef}  type="file"                   style={{ display: 'none' }} onChange={e => handleMediaSelect(e, 'raw')} />
            <input ref={groupPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeGroupPhoto} />
            <button onClick={() => photoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: 4, flexShrink: 0 }}><HiPhotograph size={22} /></button>
            <button onClick={() => videoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: 4, flexShrink: 0 }}><HiVideoCamera size={22} /></button>
            <button onClick={() => fileRef.current?.click()}  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: 4, flexShrink: 0 }}><HiPaperClip size={22} /></button>
            <button
              onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={e => { e.preventDefault(); startRecording(); }} onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
              style={{ background: recording ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : 'none', border: 'none', borderRadius: recording ? '50%' : 0, width: recording ? 36 : 'auto', height: recording ? 36 : 'auto', cursor: 'pointer', color: recording ? 'white' : '#65676B', padding: recording ? 0 : 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Appuyer et maintenir">
              {recording ? <HiStop size={18} /> : <HiMicrophone size={22} />}
            </button>
            <input
              className="input"
              placeholder={editingMsgId ? 'Modifier le message...' : t('typeMessage')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              style={{ flex: 1, border: editingMsgId ? '1.5px solid #1877F2' : undefined }}
              disabled={recording}
            />
            <button onClick={sendMessage}
              disabled={(!text.trim() && !mediaFile) || uploading || recording}
              style={{ background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: (text.trim() || mediaFile) && !uploading && !recording ? 1 : 0.5, boxShadow: '0 2px 10px rgba(24,119,242,.35)' }}>
              {uploading ? <span style={{ color: 'white', fontSize: 11 }}>...</span> : editingMsgId ? <HiCheck size={18} color="white" /> : <HiPaperAirplane size={18} color="white" style={{ transform: 'rotate(90deg)' }} />}
            </button>
          </div>
        </div>
      )}
    

      {/* Zoom media modal */}
      {zoomMedia && (
        <div onClick={()=>setZoomMedia(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:450, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {zoomMedia.type==='image' ? <img src={zoomMedia.url} alt='' style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/> : <video src={zoomMedia.url} controls style={{ maxWidth:'100%', maxHeight:'100%' }}/>}
          <button onClick={()=>setZoomMedia(null)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'white', fontSize:28, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Médias partagés modal */}
      {mediaModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:420, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setMediaModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxHeight:'75vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:'#1877F2' }}>Médias partagés</h3>
              <button onClick={()=>setMediaModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {/* Photos */}
            <p style={{ fontWeight:600, fontSize:13, color:'#65676B', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiPhotograph size={16} color='#1877F2'/> Photos</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginBottom:16 }}>
              {messages.filter(m=>m.mediaType==='image'&&m.mediaURL).map(m=>(
                <div key={m.id} onClick={()=>{setZoomMedia({url:m.mediaURL,type:'image'});setMediaModal(false);}} style={{ aspectRatio:'1', overflow:'hidden', borderRadius:8, cursor:'pointer' }}>
                  <img src={m.mediaURL} alt='' style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='image').length===0 && <p style={{ color:'#65676B', fontSize:12, gridColumn:'span 3' }}>Aucune photo</p>}
            </div>
            {/* Vidéos */}
            <p style={{ fontWeight:600, fontSize:13, color:'#65676B', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiVideoCamera size={16} color='#1877F2'/> Vidéos</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
              {messages.filter(m=>m.mediaType==='video'&&m.mediaURL).map(m=>(
                <div key={m.id} onClick={()=>{setZoomMedia({url:m.mediaURL,type:'video'});setMediaModal(false);}} style={{ aspectRatio:'16/9', overflow:'hidden', borderRadius:8, cursor:'pointer', position:'relative', background:'#000' }}>
                  <video src={m.mediaURL} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:14 }}>▶</span></div></div>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='video').length===0 && <p style={{ color:'#65676B', fontSize:12, gridColumn:'span 2' }}>Aucune vidéo</p>}
            </div>
            {/* Vocaux */}
            <p style={{ fontWeight:600, fontSize:13, color:'#65676B', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><HiMicrophone size={16} color='#1877F2'/> Vocaux</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {messages.filter(m=>m.mediaType==='audio'&&m.mediaURL).map(m=>(
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#F0F2F5', borderRadius:12, padding:'8px 12px' }}>
                  <HiMicrophone size={16} color='#1877F2'/>
                  <audio src={m.mediaURL} controls style={{ flex:1, height:32 }}/>
                </div>
              ))}
              {messages.filter(m=>m.mediaType==='audio').length===0 && <p style={{ color:'#65676B', fontSize:12 }}>Aucun vocal</p>}
            </div>
          </div>
        </div>
      )}

      {/* Thème modal */}
      {themeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:420, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setThemeModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:'#1877F2' }}>Thème</h3>
              <button onClick={()=>setThemeModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {[
              { key:'rose', label:'Amour', icon:<HiHeart size={20} color='#1877F2'/>, color:'#1877F2' },
              { key:'violet', label:'Musique', icon:<HiMusicNote size={20} color='#a855f7'/>, color:'#a855f7' },
              { key:'blue', label:'Ami', icon:<HiUserGroup size={20} color='#3b82f6'/>, color:'#3b82f6' },
            ].map(t=>(
              <button key={t.key} onClick={()=>{setChatTheme(t.key);setThemeModal(false);
              set(ref(rtdb,`conversations/${activeChatId}/theme`),t.key);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 8px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #E4E6EB', fontFamily:'Poppins', fontSize:15, color:'#050505', fontWeight:chatTheme===t.key?700:400 }}>
                {t.icon} {t.label}
                {chatTheme===t.key && <HiCheck size={18} color={t.color} style={{ marginLeft:'auto' }}/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal : Ajouter un membre (groupe de discussion) ─── */}
      {addMemberOpen && activeGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 430, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setAddMemberOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2', fontSize: 16 }}>Ajouter un membre</h3>
              <button onClick={() => setAddMemberOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>

            <button onClick={copyGroupInviteLink} className="btn-secondary" style={{ width: '100%', padding: '10px 0', fontSize: 13, borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              🔗 Copier / envoyer le lien d'invitation
            </button>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} />
              <input className="input" placeholder="Rechercher un ami..." value={memberSearchG} onChange={e => setMemberSearchG(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>

            {friendsListG.length === 0 && (
              <p style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: '16px 0' }}>
                Tous vos amis sont déjà dans cette discussion, ou vous n'avez pas d'amis à ajouter directement.
              </p>
            )}
            {friendsListG
              .filter(f => !memberSearchG.trim() || f.fullName?.toLowerCase().includes(memberSearchG.trim().toLowerCase()))
              .map(f => (
                <label key={f.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5' }}>
                  <input type="checkbox" checked={!!selectedFriendsG[f.uid]} onChange={e => setSelectedFriendsG(p => ({ ...p, [f.uid]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#1877F2' }} />
                  <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{f.fullName}</p>
                    <p style={{ fontSize: 12, color: '#65676B' }}>@{f.username}</p>
                  </div>
                </label>
              ))}

            {friendsListG.length > 0 && (
              <button onClick={addSelectedMembersToChat} disabled={addingMembersG || Object.values(selectedFriendsG).every(v => !v)} className="btn-primary"
                style={{ width: '100%', marginTop: 14, padding: '12px 0', fontSize: 15 }}>
                {addingMembersG ? 'Ajout...' : 'Ajouter à la discussion'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal : Modifier le groupe de discussion (admin) ── */}
      {editGroupOpen && activeGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditGroupOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2' }}>Modifier le groupe</h3>
              <button onClick={() => setEditGroupOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', marginBottom: 6 }}>NOM DU GROUPE</p>
            <input className="input" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} maxLength={60} style={{ marginBottom: 10 }} />
            <button onClick={saveGroupEdit} disabled={savingGroup} className="btn-blue" style={{ width: '100%', padding: '11px 0', fontSize: 14, borderRadius: 10 }}>
              {savingGroup ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 6, textAlign: 'center' }}>La photo du groupe se change via le menu ⋮ → Photo du groupe.</p>

            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', margin: '16px 0 6px' }}>MEMBRES & ADMINS</p>
            {groupMemberProfiles.length === 0 && <p style={{ fontSize: 13, color: '#65676B' }}>Chargement des membres...</p>}
            {groupMemberProfiles.map(m => {
              const mAdmin = activeGroup.admins?.includes(m.uid);
              return (
                <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F2F5' }}>
                  <img src={m.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.fullName}{m.uid === currentUser.uid ? ' (vous)' : ''}
                    </p>
                    {mAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: '#F2B300' }}>ADMIN</span>}
                  </div>
                  <button onClick={() => toggleGroupAdmin(m.uid)}
                    className={mAdmin ? 'btn-secondary' : 'btn-gold'}
                    style={{ padding: '6px 12px', fontSize: 11, borderRadius: 10, flexShrink: 0 }}>
                    {mAdmin ? 'Retirer admin' : 'Nommer admin'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal : Créer un groupe ─────────────────────────── */}
      {createGroupOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setCreateGroupOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2', display: 'flex', alignItems: 'center', gap: 8 }}><HiUserGroup size={20} /> Créer un groupe de discussion</h3>
              <button onClick={() => setCreateGroupOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <input className="input" placeholder="Nom du groupe" value={groupName} onChange={e => setGroupName(e.target.value)} maxLength={60} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Ajouter des amis</p>
            {friendsProfiles.length === 0 && <p style={{ fontSize: 13, color: '#65676B', padding: '8px 0' }}>Ajoutez d'abord des amis pour créer un groupe.</p>}
            {friendsProfiles.map(f => (
              <label key={f.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5' }}>
                <input type="checkbox" checked={!!groupSel[f.uid]} onChange={e => setGroupSel(p => ({ ...p, [f.uid]: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: '#1877F2' }} />
                <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=1877F2&color=fff`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{f.fullName}</p>
                  <p style={{ fontSize: 12, color: '#65676B' }}>@{f.username}</p>
                </div>
              </label>
            ))}
            <button onClick={createGroup} disabled={creatingGroup} className="btn-primary" style={{ width: '100%', marginTop: 16, padding: '12px 0', fontSize: 15 }}>
              {creatingGroup ? 'Création...' : 'Créer le groupe ✨'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 8, textAlign: 'center' }}>Vous serez administrateur du groupe.</p>
          </div>
        </div>
      )}

      {/* Bottom Sheet — Facebook style */}
      {bottomSheet && (
        <div onClick={()=>setBottomSheet(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'16px 0 30px', width:'100%', maxWidth:480 }}>
            {/* Reactions */}
            <div style={{ display:'flex', justifyContent:'center', gap:16, padding:'12px 20px 16px', borderBottom:'1px solid #E4E6EB' }}>
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
              <button key={label} onClick={fn} style={{ width:'100%', display:'flex', alignItems:'center', gap:16, padding:'14px 24px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins', fontSize:15, color:red?'#ef4444':'#050505', fontWeight:500 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Info honnête : appels vocaux/vidéo bientôt disponibles ── */}
      {callInfoOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setCallInfoOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:24, maxWidth:320, textAlign:'center' }}>
            <div className="icon-badge-3d" style={{ width:60, height:60, borderRadius:18, background:'linear-gradient(145deg,#63A9FF,#1877F2)', margin:'0 auto 14px' }}>
              <HiVideoCamera size={28} color="white" />
            </div>
            <h3 style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>Bientôt disponible</h3>
            <p style={{ fontSize:13, color:'#65676B', lineHeight:1.6, marginBottom:16 }}>
              Les appels vocaux, vidéo et vidéoconférence de groupe arrivent prochainement sur Traingo.
            </p>
            <button onClick={() => setCallInfoOpen(false)} className="btn-blue" style={{ padding:'10px 28px', fontSize:14, borderRadius:20 }}>Compris</button>
          </div>
        </div>
      )}
</div>
  );
}
