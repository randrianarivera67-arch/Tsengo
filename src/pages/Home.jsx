// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit,
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc, getDocs, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { sendPushNotification } from '../utils/onesignal';
import { v4 as uuidv4 } from 'uuid';
import {
  HiPhotograph, HiVideoCamera, HiTag, HiOutlineHeart, HiChat,
  HiTrash, HiPencil, HiX, HiShare, HiFilm, HiOutlineChat,
  HiDotsVertical, HiDownload, HiLightningBolt, HiPhone, HiLocationMarker,
  HiReply, HiUserAdd
} from 'react-icons/hi';

const MAX_POST    = 2000;
const MAX_COMMENT = 500;
const MAX_PRICE   = 999_999_999;
const REACTIONS   = ['❤️','😂','😮','😢','😡','👍'];

function VIPBadge() {
  return <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>;
}

export default function Home() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [content, setContent]   = useState('');
  const [mediaFile, setMF]      = useState(null);
  const [mediaPreview, setMP]   = useState(null);
  const [mediaType, setMT]      = useState('');
  const [isSale, setIsSale]     = useState(false);
  const [price, setPrice]       = useState('');
  const [contact, setContact]   = useState('');
  const [lieu, setLieu]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [myGroups, setMyGroups] = useState([]);
  const [postGroup, setPostGroup] = useState('');   // '' = profil, sinon groupId

  // ── Stories (format Facebook) ──
  const [storyGroups, setStoryGroups] = useState([]);       // [{uid, name, photo, items:[...]}]
  const [storyViewer, setStoryViewer] = useState(null);     // {group, index}
  const [addingStory, setAddingStory] = useState(false);
  const storyFileRef = useRef();

  // ── Suggestions d'amis ──
  const [suggestions, setSuggestions] = useState([]);

  const lpTimer = useRef(null);
  const lpFired = useRef(false);

  const [posts, setPosts]           = useState([]);
  const [reelPosts, setReelPosts]   = useState([]);
  const [openCmt, setOpenCmt]       = useState({});
  const [cmtText, setCmtText]       = useState({});
  const [cmtMedia, setCmtMedia]     = useState({});
  const [showReact, setShowReact]   = useState({});
  const [reactionModal, setRM] = useState(null);
  const [cmtReactionPicker, setCmtReactionPicker] = useState(null);
  const [cmtReactions, setCmtReactions] = useState({});
  const [editPost, setEditPost]     = useState(null);
  const [editContent, setEditContent] = useState('');
  const [postMenu, setPostMenu]     = useState(null);
  const [editCmt, setEditCmt]       = useState(null);
  const [replyTo, setReplyTo]       = useState({});

  const photoRef = useRef(); const videoRef = useRef();
  const cPhotoRef = useRef({}); const cVideoRef = useRef({});

  // Close menus on outside click
  useEffect(() => {
    const fn = () => setPostMenu(null);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  // Mes groupes (pour publier dans un groupe)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    return onSnapshot(q, snap => setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
  }, [currentUser]);

  // Stories des dernières 24h, groupées par utilisateur
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('ts', 'desc'), limit(150));
    return onSnapshot(q, snap => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(st => (st.ts || 0) > cutoff);
      const byUser = {};
      fresh.forEach(st => {
        if (!byUser[st.uid]) byUser[st.uid] = { uid: st.uid, name: st.authorName, photo: st.authorPhoto || '', items: [] };
        byUser[st.uid].items.push(st);
      });
      Object.values(byUser).forEach(g => g.items.sort((a, b) => (a.ts || 0) - (b.ts || 0)));
      // Ma story en premier
      const list = Object.values(byUser).sort((a, b) => (a.uid === currentUser?.uid ? -1 : b.uid === currentUser?.uid ? 1 : 0));
      setStoryGroups(list);
    }, () => {});
  }, [currentUser]);

  // Suggestions d'amis (personnes non amies)
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    let alive = true;
    getDocs(collection(db, 'users')).then(snap => {
      if (!alive) return;
      const friends = userProfile.friends || [];
      const sent = userProfile.sentRequests || [];
      const list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.uid !== currentUser.uid && u.fullName && !friends.includes(u.uid) && !sent.includes(u.uid));
      // Mélange léger
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      setSuggestions(list.slice(0, 20));
    }).catch(() => {});
    return () => { alive = false; };
  }, [currentUser, userProfile?.friends?.length]);

  // Load posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      const blocked = userProfile?.blocked || [];
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !blocked.includes(p.uid));
      const now = new Date();
      const sorted = [...all].sort((a, b) => {
        const aB = a.isBoosted && a.boostUntil && new Date(a.boostUntil) > now;
        const bB = b.isBoosted && b.boostUntil && new Date(b.boostUntil) > now;
        return (aB && !bB) ? -1 : (!aB && bB) ? 1 : 0;
      });
      setPosts(sorted);
      setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
    });
  }, []);

  function handleMedia(e, type) {
    const file = e.target.files[0]; if (!file) return;
    const allowed = type === 'image'
      ? ['image/jpeg','image/png','image/gif','image/webp']
      : ['video/mp4','video/webm','video/quicktime'];
    if (!allowed.includes(file.type)) { alert('Type non accepté'); return; }
    // no size limit
    setMF(file); setMT(type); setMP(URL.createObjectURL(file));
  }
  function removeMedia() { setMF(null); setMP(null); setMT(''); }

  async function createPost() {
    if (!content.trim() && !mediaFile) return;
    if (content.length > MAX_POST) return;
    if (isSale) {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0 || p > MAX_PRICE) { alert('Prix invalide'); return; }
    }
    setPosting(true); setUploadPct(0);
    try {
      let mediaURL = '', finalMT = mediaType;
      if (mediaFile) {
        setUploadPct(20);
        const r = await uploadToTelegram(mediaFile);
        mediaURL = r.url; finalMT = r.type === 'video' ? 'video' : 'image';
        setUploadPct(80);
      }
      const selGroup = postGroup ? myGroups.find(g => g.id === postGroup) : null;
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: userProfile.fullName,
        authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
        authorIsVip: userProfile.isVip || false,
        content: content.trim().slice(0, MAX_POST), mediaURL, mediaType: finalMT,
        isSale, price: isSale ? parseFloat(price) : '',
        contact: isSale ? contact.trim() : '', lieu: isSale ? lieu.trim() : '',
        ...(selGroup ? { groupId: selGroup.id, groupName: selGroup.name, groupPhoto: selGroup.photoURL || '' } : {}),
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      // Notifier : membres du groupe si pub de groupe, sinon amis
      const targets = selGroup
        ? (selGroup.members || []).filter(m => m !== currentUser.uid)
        : (userProfile.friends || []);
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id,
          message: selGroup
            ? `${userProfile.fullName} a publié dans le groupe ${selGroup.name}`
            : `${userProfile.fullName} a publié un nouveau post`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); removeMedia(); setIsSale(false); setPrice(''); setContact(''); setLieu(''); setPostGroup('');
    } catch (err) { console.error(err); alert('Erreur lors de la publication'); }
    setPosting(false); setUploadPct(0);
  }

  async function reactToCmt(postId, cmtId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const updated = post.comments.map(c => {
      if (c.id !== cmtId) return c;
      const reactions = c.reactions || {};
      const my = reactions[currentUser.uid];
      if (my === emoji) { const u = {...reactions}; delete u[currentUser.uid]; return {...c, reactions: u}; }
      return {...c, reactions: {...reactions, [currentUser.uid]: emoji}};
    });
    await updateDoc(doc(db,"posts",postId), { comments: updated });
    setCmtReactionPicker(null);
  }

  async function reactToPost(postId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const reactions = post.reactions || {};
    const my = reactions[currentUser.uid];
    if (my === emoji) {
      const u = { ...reactions }; delete u[currentUser.uid];
      await updateDoc(doc(db,'posts',postId), { reactions: u });
    } else {
      await updateDoc(doc(db,'posts',postId), { [`reactions.${currentUser.uid}`]: emoji });
      if (post.uid !== currentUser.uid) {
        await addDoc(collection(db,'notifications'), {
          toUid: post.uid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'reaction', postId, emoji,
          message: `${userProfile.fullName} a réagi ${emoji} à votre publication`,
          read: false, createdAt: serverTimestamp(),
        });
        sendPushNotification({ toExternalId: post.uid, title: userProfile.fullName, message: `a réagi ${emoji}`, data: { type:'reaction', postId } });
      }
    }
    setShowReact(p => ({ ...p, [postId]: false }));
  }

  async function openReactionModal(post) {
    const reactions = post.reactions || {};
    if (!Object.keys(reactions).length) return;
    const userData = {};
    await Promise.all(Object.keys(reactions).map(async uid => {
      try {
        const s = await getDoc(doc(db,'users',uid));
        userData[uid] = s.exists() ? { name: s.data().fullName, photo: s.data().photoURL } : { name: uid, photo: '' };
      } catch { userData[uid] = { name: uid, photo: '' }; }
    }));
    setRM({ reactions, userData });
  }

  async function addComment(postId) {
    const rt = replyTo[postId];
    const raw = rt ? `@${rt} ${cmtText[postId]||''}` : (cmtText[postId]||'');
    const text = raw.trim(); const media = cmtMedia[postId];
    if (!text && !media) return;
    if (text.length > MAX_COMMENT) return;
    let mediaURL = '', cMT = '';
    if (media) { try { const r = await uploadToTelegram(media.file); mediaURL = r.url; cMT = r.type; } catch {} }
    const post = posts.find(p => p.id === postId);
    const cmt = {
      id: uuidv4(), uid: currentUser.uid,
      authorName: userProfile.fullName, authorPhoto: userProfile.photoURL || '',
      authorIsVip: userProfile.isVip || false,
      text: text.slice(0, MAX_COMMENT), mediaURL, mediaType: cMT,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db,'posts',postId), { comments: arrayUnion(cmt) });
    setCmtText(p => ({ ...p, [postId]: '' }));
    setCmtMedia(p => ({ ...p, [postId]: null }));
    setReplyTo(p => ({ ...p, [postId]: null }));
    if (post && post.uid !== currentUser.uid) {
      await addDoc(collection(db,'notifications'), {
        toUid: post.uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'comment', postId,
        message: `${userProfile.fullName} a commenté votre publication`,
        read: false, createdAt: serverTimestamp(),
      });
      sendPushNotification({ toExternalId: post.uid, title: userProfile.fullName, message: text?`a commenté : "${text.slice(0,50)}"`:' a commenté', data: { type:'comment', postId } });
    }
  }

  async function deleteCmt(postId, cmt) {
    const post = posts.find(p => p.id === postId);
    if (cmt.uid !== currentUser.uid && post?.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId), { comments: arrayRemove(cmt) });
  }

  async function saveEditCmt(postId, oldCmt, newText) {
    if (!newText.trim()) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const updated = post.comments.map(c => c.id === oldCmt.id ? { ...c, text: newText.trim() } : c);
    await updateDoc(doc(db,'posts',postId), { comments: updated });
    setEditCmt(null);
  }

  async function deletePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post || post.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer cette publication ?')) return;
    await deleteDoc(doc(db,'posts',postId));
  }

  async function saveEditPost() {
    if (!editContent.trim() || !editPost || editPost.uid !== currentUser.uid) return;
    await updateDoc(doc(db,'posts',editPost.id), { content: editContent.trim().slice(0,MAX_POST) });
    setEditPost(null);
  }

  async function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { try { await navigator.share({ title:'Traingo', text:post.content, url }); } catch {} }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
  }

  function countReactions(r = {}) {
    const c = {}; Object.values(r).forEach(e => { c[e] = (c[e]||0)+1; }); return c;
  }

  function isFriend(uid) { return (userProfile?.friends||[]).includes(uid); }
  function hasSentReq(uid) { return (userProfile?.sentRequests||[]).includes(uid); }

  async function sendFriendReq(toUid, toName) {
    if (isFriend(toUid) || hasSentReq(toUid)) return;
    await addDoc(collection(db,'friendRequests'), {
      fromUid: currentUser.uid, toUid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL||'',
      status: 'pending', createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db,'users',currentUser.uid), { sentRequests: arrayUnion(toUid) });
    setUserProfile(p=>({...p, sentRequests:[...(p.sentRequests||[]),toUid]}));
    await addDoc(collection(db,'notifications'), {
      toUid, fromUid: currentUser.uid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL||'',
      type: 'friendRequest',
      message: `${userProfile.fullName} vous a envoyé une demande d'ami`,
      read: false, createdAt: serverTimestamp(),
    });
    sendPushNotification({ toExternalId: toUid, title: userProfile.fullName, message:"vous a envoyé une demande d'ami 👥", data:{ type:'friendRequest' } });
  }

  // ── Stories ──
  async function addStory(e) {
    const file = e.target.files[0]; if (!file) return;
    const okTypes = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (!okTypes.includes(file.type)) { alert('Type non accepté'); return; }
    setAddingStory(true);
    try {
      const r = await uploadToTelegram(file);
      await addDoc(collection(db, 'stories'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorPhoto: userProfile.photoURL || '',
        mediaURL: r.url,
        mediaType: r.type === 'video' ? 'video' : 'image',
        ts: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) { alert('Erreur story : ' + (err?.message || err)); }
    setAddingStory(false);
    e.target.value = '';
  }

  async function deleteStory(st) {
    if (st.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer cette story ?')) return;
    await deleteDoc(doc(db, 'stories', st.id));
    setStoryViewer(null);
  }

  function openStories(group) { setStoryViewer({ group, index: 0 }); }
  function nextStory() {
    setStoryViewer(v => {
      if (!v) return null;
      if (v.index + 1 < v.group.items.length) return { ...v, index: v.index + 1 };
      const gi = storyGroups.findIndex(g => g.uid === v.group.uid);
      if (gi >= 0 && gi + 1 < storyGroups.length) return { group: storyGroups[gi + 1], index: 0 };
      return null;
    });
  }
  function prevStory() {
    setStoryViewer(v => {
      if (!v) return null;
      if (v.index > 0) return { ...v, index: v.index - 1 };
      return v;
    });
  }

  // Avance automatique des images (5s)
  useEffect(() => {
    if (!storyViewer) return;
    const cur = storyViewer.group.items[storyViewer.index];
    if (!cur || cur.mediaType === 'video') return;
    const tm = setTimeout(nextStory, 5000);
    return () => clearTimeout(tm);
  }, [storyViewer]);

  // ── J'aime rapide (clic) + appui long = choix de réaction (format Facebook) ──
  function quickLike(post) {
    if (lpFired.current) { lpFired.current = false; return; }
    const myR = post.reactions?.[currentUser.uid];
    reactToPost(post.id, myR || '👍');
  }
  function startLongPress(postId) {
    lpFired.current = false;
    lpTimer.current = setTimeout(() => { lpFired.current = true; setShowReact(p => ({ ...p, [postId]: true })); }, 450);
  }
  function endLongPress() { clearTimeout(lpTimer.current); }

  const rem = MAX_POST - content.length;
  const charColor = rem < 50 ? '#ef4444' : rem < 200 ? '#f97316' : '#65676B';

  return (
    <div style={{ padding:0 }}>

      {/* ── Stories (format Facebook) ─────────────────────────── */}
      <div className="stories-strip">
        {/* Carte : Créer une story */}
        <input ref={storyFileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={addStory} />
        <div className="story-card" onClick={() => !addingStory && storyFileRef.current?.click()} style={{ background:'white', border:'1px solid #E4E6EB' }}>
          <div style={{ height:'62%', overflow:'hidden' }}>
            <img src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`}
              alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ position:'absolute', top:'62%', left:'50%', transform:'translate(-50%,-50%)', width:34, height:34, borderRadius:'50%', background:'#1877F2', border:'3.5px solid white', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:20, fontWeight:700 }}>+</div>
          <p style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:11, fontWeight:600, color:'#050505' }}>
            {addingStory ? 'Envoi...' : 'Créer une story'}
          </p>
        </div>

        {/* Stories des utilisateurs */}
        {storyGroups.map(g => {
          const last = g.items[g.items.length - 1];
          return (
            <div key={g.uid} className="story-card" onClick={() => openStories(g)}>
              {last.mediaType === 'video'
                ? <video src={last.mediaURL} muted playsInline preload="metadata" />
                : <img src={last.mediaURL} alt="" />}
              <div className="story-gradient" />
              <img className="story-avatar"
                src={g.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name||'U')}&background=1877F2&color=fff`} alt="" />
              <span className="story-name">{g.uid === currentUser.uid ? 'Votre story' : g.name?.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* ── Visionneuse de story (plein écran) ─────────────────── */}
      {storyViewer && (() => {
        const cur = storyViewer.group.items[storyViewer.index];
        return (
          <div style={{ position:'fixed', inset:0, background:'#000', zIndex:300, display:'flex', flexDirection:'column' }}>
            {/* Barres de progression */}
            <div style={{ display:'flex', gap:4, padding:'10px 10px 6px' }}>
              {storyViewer.group.items.map((it, i) => (
                <div key={it.id} style={{ flex:1, height:3, borderRadius:2, background: i <= storyViewer.index ? 'white' : 'rgba(255,255,255,.35)' }} />
              ))}
            </div>
            {/* En-tête */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px' }}>
              <img src={storyViewer.group.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(storyViewer.group.name||'U')}&background=1877F2&color=fff`}
                alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid #1877F2' }} />
              <p style={{ color:'white', fontWeight:700, fontSize:14, flex:1 }}>{storyViewer.group.name}</p>
              {cur.uid === currentUser.uid && (
                <button onClick={() => deleteStory(cur)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', padding:6 }}><HiTrash size={20} /></button>
              )}
              <button onClick={() => setStoryViewer(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', fontSize:24, padding:'0 6px' }}>✕</button>
            </div>
            {/* Média + zones tactiles gauche/droite */}
            <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {cur.mediaType === 'video'
                ? <video key={cur.id} src={cur.mediaURL} autoPlay playsInline onEnded={nextStory} style={{ maxWidth:'100%', maxHeight:'100%' }} />
                : <img key={cur.id} src={cur.mediaURL} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />}
              <div onClick={prevStory} style={{ position:'absolute', left:0, top:0, bottom:0, width:'35%' }} />
              <div onClick={nextStory} style={{ position:'absolute', right:0, top:0, bottom:0, width:'65%' }} />
            </div>
          </div>
        );
      })()}

      {/* Create post */}
      <div className="card post-card" style={{ padding:16, marginBottom:8 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            {myGroups.length > 0 && (
              <select value={postGroup} onChange={e => setPostGroup(e.target.value)}
                style={{ marginBottom:8, padding:'6px 12px', borderRadius:16, border:'1.5px solid #E4E6EB', background:'#F0F2F5', fontFamily:'Poppins', fontSize:12, fontWeight:600, color: postGroup ? '#1877F2' : '#65676B', maxWidth:'100%' }}>
                <option value="">📍 Publier sur mon profil</option>
                {myGroups.map(g => <option key={g.id} value={g.id}>👥 Publier dans : {g.name}</option>)}
              </select>
            )}
            <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ resize:'none', width:'100%' }} maxLength={MAX_POST}/>
            {content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:'right', marginTop:2 }}>{rem} restants</p>}
          </div>
        </div>

        {mediaPreview && (
          <div style={{ position:'relative', marginTop:10 }}>
            {mediaType==='image'
              ? <img src={mediaPreview} alt="" style={{ width:'100%', borderRadius:10, maxHeight:250, objectFit:'cover' }}/>
              : <video src={mediaPreview} controls style={{ width:'100%', borderRadius:10, maxHeight:250 }}/>}
            <button onClick={removeMedia} style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiX size={16}/></button>
          </div>
        )}

        {isSale && (
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiTag color="#1877F2" size={18}/>
              <input className="input" type="number" placeholder={`${t('price')} (Ar)`} value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} min="1" max={MAX_PRICE}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiPhone color="#1877F2" size={18}/>
              <input className="input" type="tel" placeholder="Numéro de contact" value={contact} onChange={e => setContact(e.target.value)} style={{ flex:1 }} maxLength={20}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiLocationMarker color="#1877F2" size={18}/>
              <input className="input" type="text" placeholder="Lieu de vente" value={lieu} onChange={e => setLieu(e.target.value)} style={{ flex:1 }} maxLength={100}/>
            </div>
          </div>
        )}

        {posting && uploadPct > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:4, background:'#E4E6EB', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${uploadPct}%`, background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', borderRadius:2, transition:'width .3s' }}/>
            </div>
            <p style={{ fontSize:11, color:'#65676B', marginTop:3 }}>Upload en cours...</p>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => handleMedia(e,'image')} style={{ display:'none' }}/>
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime"       onChange={e => handleMedia(e,'video')} style={{ display:'none' }}/>
          <button onClick={() => photoRef.current.click()} className="btn-blue" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:13 }}><HiPhotograph size={16}/>{t('addPhoto')}</button>
          <button onClick={() => videoRef.current.click()} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:13 }}><HiVideoCamera size={16}/>{t('addVideo')}</button>
          <button onClick={() => setIsSale(p=>!p)} className="btn-gold" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:13, opacity:isSale?1:.85, outline:isSale?'2px solid #F2B300':'none' }}><HiTag size={16}/>{t('sell')}</button>
          <button className="btn-primary" onClick={createPost} disabled={posting||(!content.trim()&&!mediaFile)||content.length>MAX_POST} style={{ marginLeft:'auto', padding:'6px 20px', fontSize:13 }}>
            {posting?'...':t('publishPost')}
          </button>
        </div>
      </div>

      {/* Edit post modal */}
      {editPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier la publication</h3>
            <textarea className="input" rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} style={{ resize:'none' }} maxLength={MAX_POST}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditPost(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary"   onClick={saveEditPost}            style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit comment modal */}
      {editCmt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier le commentaire</h3>
            <textarea className="input" rows={3} value={editCmt.text} onChange={e => setEditCmt(p=>({...p,text:e.target.value}))} style={{ resize:'none' }} maxLength={MAX_COMMENT}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditCmt(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={() => saveEditCmt(editCmt.postId, editCmt.cmt, editCmt.text)} style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction users modal */}
      {reactionModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:360, padding:20, maxHeight:'70vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ color:'#1877F2', fontWeight:700 }}>Réactions</h3>
              <button onClick={() => setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid, emoji]) => {
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={() => { setRM(null); navigate(`/profile/${uid}`); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #E4E6EB', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                  <p style={{ fontSize:14, fontWeight:600, flex:1 }}>{uid===currentUser.uid?'Vous':(info.name||uid)}</p>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      {posts.map((post, pIdx) => {
        const rc     = countReactions(post.reactions);
        const myR    = post.reactions?.[currentUser.uid];
        const total  = Object.keys(post.reactions||{}).length;
        const isOwn  = post.uid === currentUser.uid;
        const boosted = post.isBoosted && post.boostUntil && new Date(post.boostUntil)>new Date();
        const isMyFriend = isFriend(post.uid);
        const sentReq    = hasSentReq(post.uid);

        return (
          <div key={post.id}>
          <div className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined }}>
            {boosted && (
              <div style={{ background:'linear-gradient(135deg,#7c3aed18,#a855f718)', borderBottom:'1px solid #a855f733', padding:'5px 14px' }}>
                <span style={{ fontSize:10, color:'#a855f7', fontWeight:600 }}>⚡ Sponsorisé</span>
              </div>
            )}

            {/* Header */}
            <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${post.uid}`)}>
                <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
                <div style={{ minWidth:0 }}>
                  {post.groupName ? (
                    <>
                      <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#1877F2' }}>👥 {post.groupName}</p>
                      <p style={{ fontSize:12, color:'#65676B' }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>} · {post.createdAt?.toDate?new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR'):'Maintenant'}</p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
                      <p style={{ fontSize:12, color:'#65676B' }}>@{post.authorUsername} · {post.createdAt?.toDate?new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR'):'Maintenant'}</p>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {post.isSale && <div style={{ textAlign:'right' }}><span className="sale-badge">{t('sale')}</span><p className="price-tag" style={{ marginTop:2, fontSize:13 }}>{post.price} Ar</p></div>}
                {!isOwn && <button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,post.uid)}`)} style={{ background:'#E4E6EB', border:'none', borderRadius:20, padding:'5px 10px', cursor:'pointer', color:'#1877F2', fontSize:12 }}><HiOutlineChat size={14}/></button>}
                {!isOwn && !isMyFriend && !sentReq && (
                  <button onClick={() => sendFriendReq(post.uid, post.authorName)}
                    style={{ background:'none', border:'1px solid #E4E6EB', borderRadius:20, padding:'5px 10px', cursor:'pointer', color:'#65676B', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                    <HiUserAdd size={13}/> Ajouter
                  </button>
                )}

                {/* 3-dot menu */}
                <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPostMenu(postMenu===post.id?null:post.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4, display:'flex', alignItems:'center' }}><HiDotsVertical size={18}/></button>
                  {postMenu === post.id && (
                    <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:170, zIndex:50, overflow:'hidden' }}>
                      {isOwn && <>
                        <button onClick={() => { setEditPost(post); setEditContent(post.content); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiPencil size={15} color="#1877F2"/> Modifier</button>
                        <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={15} color="#a855f7"/> Booster</button>
                        <button onClick={() => { deletePost(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#1877F2', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiTrash size={15}/> Supprimer</button>
                      </>}
                      {post.mediaURL && <button onClick={() => { window.open(post.mediaURL,'_blank'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, fontFamily:'Poppins' }}><HiDownload size={15} color="#3b82f6"/> Télécharger</button>}
                      {!isOwn && !post.mediaURL && <div style={{ padding:'10px 16px', color:'#65676B', fontSize:13 }}>Aucune action</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding:'10px 16px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
              {post.content && <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word' }}>{post.content}</p>}
              {post.isSale && (post.contact||post.lieu) && (
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {post.contact && <a href={`tel:${post.contact}`} onClick={e=>e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:5, background:'#E4E6EB', borderRadius:20, padding:'5px 12px', color:'#1877F2', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
                  {post.lieu   && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#F0F2F5', borderRadius:20, padding:'5px 12px', color:'#65676B', fontSize:13 }}><HiLocationMarker size={13} color="#1877F2"/>{post.lieu}</span>}
                </div>
              )}
              {post.mediaURL && (
                <div style={{ marginTop:8, marginLeft:-16, marginRight:-16 }}>
                  {post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }}/> : <div onClick={()=>navigate('/reels',{state:{startId:post.id}})} style={{ position:'relative', cursor:'pointer' }}><video src={post.mediaURL} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }} muted playsInline/><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:50, height:50, background:'rgba(0,0,0,0.5)', borderRadius:' 50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:20 }}>▶</span></div></div></div>}
                </div>
              )}
            </div>

            {/* Résumé réactions · commentaires (format Facebook) */}
            {(total > 0 || post.comments?.length > 0) && (
              <div style={{ padding:'8px 16px 6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div onClick={() => openReactionModal(post)} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', minHeight:18 }}>
                  {total > 0 && <>
                    <div style={{ display:'flex' }}>
                      {Object.entries(rc).slice(0,3).map(([e], i) =>
                        <span key={e} style={{ fontSize:15, marginLeft: i ? -3 : 0 }}>{e}</span>)}
                    </div>
                    <span style={{ fontSize:13, color:'#65676B' }}>{total}</span>
                  </>}
                </div>
                {post.comments?.length > 0 && (
                  <span onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ fontSize:13, color:'#65676B', cursor:'pointer' }}>
                    {post.comments.length} commentaire{post.comments.length>1?'s':''}
                  </span>
                )}
              </div>
            )}

            {/* Actions : J'aime · Commenter · Partager (format Facebook) */}
            <div className='post-actions-row'>
              <div style={{ position:'relative', flex:1, display:'flex' }}>
                <button
                  onClick={() => quickLike(post)}
                  onTouchStart={() => startLongPress(post.id)} onTouchEnd={endLongPress}
                  onMouseDown={() => startLongPress(post.id)} onMouseUp={endLongPress} onMouseLeave={endLongPress}
                  className={'post-action-btn'+(myR?' active':'')}
                  style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight:700 } : {}}>
                  <span style={{ fontSize:17 }}>{myR || '👍'}</span> J'aime
                </button>
                {showReact[post.id] && (
                  <div style={{ position:'absolute', bottom:'110%', left:8, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:10, border:'1px solid #E4E6EB' }}>
                    {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, transition:'transform .15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.transform='scale(1.3)'} onMouseLeave={ev => ev.currentTarget.style.transform='scale(1)'}>{e}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} className='post-action-btn'>
                <HiChat size={18}/> Commenter
              </button>
              <button onClick={() => sharePost(post)} className='post-action-btn'>
                <HiShare size={18}/> Partager
              </button>
            </div>

            {/* Comments */}
            {openCmt[post.id] && (
              <div style={{ padding:'0 16px 14px', borderTop:'1px solid #E4E6EB' }}>
                {post.comments?.map(c => {
                  const myCR = c.reactions?.[currentUser.uid];
                  const crCount = Object.keys(c.reactions||{}).length;
                  return (
                  <div key={c.id} style={{ display:'flex', gap:8, marginTop:10 }}>
                    <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Bulle (format Facebook) */}
                      <div style={{ position:'relative', display:'inline-block', maxWidth:'100%', background:'#F0F2F5', borderRadius:16, padding:'8px 12px' }}>
                        <p style={{ fontWeight:700, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}</p>
                        {c.text&&<p style={{ fontSize:14, wordBreak:'break-word' }}>{c.text}</p>}
                        {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                        {crCount > 0 && (
                          <span style={{ position:'absolute', bottom:-10, right:4, background:'white', borderRadius:12, padding:'1px 6px', fontSize:12, boxShadow:'0 1px 4px rgba(0,0,0,.25)', display:'flex', alignItems:'center', gap:2 }}>
                            {[...new Set(Object.values(c.reactions))].slice(0,3).join('')}
                            {crCount > 1 && <span style={{ fontSize:10, color:'#65676B' }}>{crCount}</span>}
                          </span>
                        )}
                      </div>
                      {/* Liens sous la bulle (format Facebook) */}
                      <div style={{ display:'flex', gap:14, padding:'4px 12px 0', fontSize:12, fontWeight:700, color:'#65676B', position:'relative', alignItems:'center' }}>
                        <span onClick={() => reactToCmt(post.id, c.id, '👍')}
                          style={{ cursor:'pointer', color: myCR ? (myCR === '👍' ? '#1877F2' : '#FF2D8D') : '#65676B' }}>
                          {myCR && myCR !== '👍' ? myCR + ' ' : ''}J'aime
                        </span>
                        <span onClick={() => setCmtReactionPicker(p => p===c.id?null:c.id)} style={{ cursor:'pointer' }}>😊</span>
                        <span onClick={() => setReplyTo(p=>({...p,[post.id]:c.authorName}))} style={{ cursor:'pointer' }}>Répondre</span>
                        {(c.uid===currentUser.uid||post.uid===currentUser.uid)&&<>
                          <span onClick={() => setEditCmt({ postId:post.id, cmt:c, text:c.text })} style={{ cursor:'pointer' }}>Modifier</span>
                          <span onClick={() => deleteCmt(post.id,c)} style={{ cursor:'pointer', color:'#FF2D8D' }}>Supprimer</span>
                        </>}
                        {cmtReactionPicker===c.id && (
                          <div style={{ display:'flex', gap:6, background:'white', borderRadius:20, padding:'6px 10px', boxShadow:'0 2px 12px rgba(0,0,0,.2)', position:'absolute', bottom:'110%', left:0, zIndex:10, border:'1px solid #E4E6EB' }}>
                            {REACTIONS.map(em=><span key={em} onClick={()=>reactToCmt(post.id,c.id,em)} style={{ fontSize:20, cursor:'pointer' }}>{em}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}

                {replyTo[post.id] && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, background:'#F0F2F5', padding:'6px 10px', borderRadius:10 }}>
                    <HiReply size={14} color="#1877F2"/>
                    <span style={{ fontSize:12, color:'#65676B' }}>Répondre à <strong>{replyTo[post.id]}</strong></span>
                    <button onClick={() => setReplyTo(p=>({...p,[post.id]:null}))} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={14}/></button>
                  </div>
                )}

                {cmtMedia[post.id] && (
                  <div style={{ position:'relative', marginTop:8, display:'inline-block' }}>
                    {cmtMedia[post.id].type==='image'?<img src={cmtMedia[post.id].preview} alt="" style={{ maxWidth:150, borderRadius:8 }}/>:<video src={cmtMedia[post.id].preview} style={{ maxWidth:150, borderRadius:8 }}/>}
                    <button onClick={() => setCmtMedia(p=>({...p,[post.id]:null}))} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10 }}>✕</button>
                  </div>
                )}

                <div style={{ display:'flex', gap:6, marginTop:10, alignItems:'center' }}>
                  <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0 }}/>
                  <input ref={el=>cPhotoRef.current[post.id]=el} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'image',preview:URL.createObjectURL(f)}}));}}/>
                  <input ref={el=>cVideoRef.current[post.id]=el} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'video',preview:URL.createObjectURL(f)}}));}}/>
                  <input className="input" placeholder={replyTo[post.id]?`Répondre à ${replyTo[post.id]}...`:t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} maxLength={MAX_COMMENT}/>
                  <button onClick={() => cPhotoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiPhotograph size={18}/></button>
                  <button onClick={() => cVideoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiVideoCamera size={18}/></button>
                  <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions d'amis toutes les 10 publications (format Facebook) */}
          {(pIdx + 1) % 10 === 0 && suggestions.length > 0 && (() => {
            const off = ((Math.floor((pIdx + 1) / 10) - 1) * 6) % suggestions.length;
            const chunk = [...suggestions.slice(off), ...suggestions.slice(0, off)].slice(0, 8);
            return (
              <div className="card post-card" style={{ marginBottom:14, padding:'12px 0' }}>
                <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Personnes que vous connaissez peut-être</p>
                <div style={{ display:'flex', gap:10, overflowX:'auto', padding:'0 16px 4px', scrollbarWidth:'none' }}>
                  {chunk.map(u => (
                    <div key={u.uid} style={{ flexShrink:0, width:136, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', background:'white' }}>
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=1877F2&color=fff`}
                        alt="" onClick={() => navigate(`/profile/${u.uid}`)}
                        style={{ width:'100%', height:110, objectFit:'cover', cursor:'pointer', display:'block' }} />
                      <div style={{ padding:'8px 8px 10px' }}>
                        <p onClick={() => navigate(`/profile/${u.uid}`)} style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>{u.fullName}</p>
                        {hasSentReq(u.uid)
                          ? <button disabled className="btn-secondary" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>Demande envoyée</button>
                          : <button onClick={() => sendFriendReq(u.uid, u.fullName)} className="btn-blue" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>
                              <HiUserAdd size={13} style={{ verticalAlign:'-2px' }}/> Ajouter
                            </button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>
        );
      })}
    </div>
  );
}
