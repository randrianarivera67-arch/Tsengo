// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc
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
  return <span style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8, marginLeft:4, verticalAlign:'middle' }}>VIP</span>;
}

export default function Home() {
  const { currentUser, userProfile } = useAuth();
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

  // Load posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
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
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: userProfile.fullName,
        authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
        authorIsVip: userProfile.isVip || false,
        content: content.trim().slice(0, MAX_POST), mediaURL, mediaType: finalMT,
        isSale, price: isSale ? parseFloat(price) : '',
        contact: isSale ? contact.trim() : '', lieu: isSale ? lieu.trim() : '',
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      const friends = userProfile.friends || [];
      if (friends.length > 0) {
        const batch = writeBatch(db);
        friends.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id,
          message: `${userProfile.fullName} a publié un nouveau post`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); removeMedia(); setIsSale(false); setPrice(''); setContact(''); setLieu('');
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
    if (cmt.uid !== currentUser.uid) return;
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
    if (navigator.share) { try { await navigator.share({ title:'Tsengo', text:post.content, url }); } catch {} }
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
    await addDoc(collection(db,'notifications'), {
      toUid, fromUid: currentUser.uid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL||'',
      type: 'friendRequest',
      message: `${userProfile.fullName} vous a envoyé une demande d'ami`,
      read: false, createdAt: serverTimestamp(),
    });
    sendPushNotification({ toExternalId: toUid, title: userProfile.fullName, message:"vous a envoyé une demande d'ami 👥", data:{ type:'friendRequest' } });
  }

  const rem = MAX_POST - content.length;
  const charColor = rem < 50 ? '#ef4444' : rem < 200 ? '#f97316' : '#C4829F';

  return (
    <div style={{ padding:'16px 12px' }}>

      {/* Reels strip */}
      {reelPosts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#E91E8C', display:'flex', alignItems:'center', gap:4 }}><HiFilm size={16}/> Reels</p>
            <button onClick={() => navigate('/reels')} style={{ background:'none', border:'none', color:'#C4829F', fontSize:12, cursor:'pointer' }}>Voir tout</button>
          </div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, scrollbarWidth:'none' }}>
            {reelPosts.slice(0,10).map(p => (
              <div key={p.id} onClick={() => navigate('/reels',{state:{startId:p.id}})}
                style={{ flexShrink:0, width:90, height:130, borderRadius:12, overflow:'hidden', position:'relative', cursor:'pointer', border:'2px solid #FFE4F3' }}>
                <video src={p.mediaURL} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.6))', padding:'20px 6px 6px' }}>
                  <img src={p.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorName||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:22, height:22, borderRadius:'50%', border:'1.5px solid white' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create post */}
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
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
              <HiTag color="#E91E8C" size={18}/>
              <input className="input" type="number" placeholder={`${t('price')} (Ar)`} value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} min="1" max={MAX_PRICE}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiPhone color="#E91E8C" size={18}/>
              <input className="input" type="tel" placeholder="Numéro de contact" value={contact} onChange={e => setContact(e.target.value)} style={{ flex:1 }} maxLength={20}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiLocationMarker color="#E91E8C" size={18}/>
              <input className="input" type="text" placeholder="Lieu de vente" value={lieu} onChange={e => setLieu(e.target.value)} style={{ flex:1 }} maxLength={100}/>
            </div>
          </div>
        )}

        {posting && uploadPct > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:4, background:'#FFE4F3', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${uploadPct}%`, background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', borderRadius:2, transition:'width .3s' }}/>
            </div>
            <p style={{ fontSize:11, color:'#C4829F', marginTop:3 }}>Upload en cours...</p>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => handleMedia(e,'image')} style={{ display:'none' }}/>
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime"       onChange={e => handleMedia(e,'video')} style={{ display:'none' }}/>
          <button onClick={() => photoRef.current.click()} style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE4F3', border:'none', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#E91E8C', fontSize:13 }}><HiPhotograph size={16}/>{t('addPhoto')}</button>
          <button onClick={() => videoRef.current.click()} style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE4F3', border:'none', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#E91E8C', fontSize:13 }}><HiVideoCamera size={16}/>{t('addVideo')}</button>
          <button onClick={() => setIsSale(p=>!p)} style={{ display:'flex', alignItems:'center', gap:5, background:isSale?'#E91E8C':'#FFE4F3', border:'none', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:isSale?'white':'#E91E8C', fontSize:13 }}><HiTag size={16}/>{t('sell')}</button>
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
              <h3 style={{ color:'#E91E8C', fontWeight:700 }}>Réactions</h3>
              <button onClick={() => setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid, emoji]) => {
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={() => { setRM(null); navigate(`/profile/${uid}`); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #FFE4F3', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                  <p style={{ fontSize:14, fontWeight:600, flex:1 }}>{uid===currentUser.uid?'Vous':(info.name||uid)}</p>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      {posts.map(post => {
        const rc     = countReactions(post.reactions);
        const myR    = post.reactions?.[currentUser.uid];
        const total  = Object.keys(post.reactions||{}).length;
        const isOwn  = post.uid === currentUser.uid;
        const boosted = post.isBoosted && post.boostUntil && new Date(post.boostUntil)>new Date();
        const isMyFriend = isFriend(post.uid);
        const sentReq    = hasSentReq(post.uid);

        return (
          <div key={post.id} className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined }}>
            {boosted && (
              <div style={{ background:'linear-gradient(135deg,#7c3aed18,#a855f718)', borderBottom:'1px solid #a855f733', padding:'5px 14px' }}>
                <span style={{ fontSize:10, color:'#a855f7', fontWeight:600 }}>⚡ Sponsorisé</span>
              </div>
            )}

            {/* Header */}
            <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${post.uid}`)}>
                <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
                  <p style={{ fontSize:12, color:'#C4829F' }}>@{post.authorUsername} · {post.createdAt?.toDate?new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR'):'Maintenant'}</p>
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {post.isSale && <div style={{ textAlign:'right' }}><span className="sale-badge">{t('sale')}</span><p className="price-tag" style={{ marginTop:2, fontSize:13 }}>{post.price} Ar</p></div>}
                {!isOwn && <button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,post.uid)}`)} style={{ background:'#FFE4F3', border:'none', borderRadius:20, padding:'5px 10px', cursor:'pointer', color:'#E91E8C', fontSize:12 }}><HiOutlineChat size={14}/></button>}
                {!isOwn && !isMyFriend && !sentReq && (
                  <button onClick={() => sendFriendReq(post.uid, post.authorName)}
                    style={{ background:'none', border:'1px solid #FFE4F3', borderRadius:20, padding:'5px 10px', cursor:'pointer', color:'#C4829F', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                    <HiUserAdd size={13}/> Ajouter
                  </button>
                )}

                {/* 3-dot menu */}
                <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPostMenu(postMenu===post.id?null:post.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4, display:'flex', alignItems:'center' }}><HiDotsVertical size={18}/></button>
                  {postMenu === post.id && (
                    <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #FFE4F3', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:170, zIndex:50, overflow:'hidden' }}>
                      {isOwn && <>
                        <button onClick={() => { setEditPost(post); setEditContent(post.content); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiPencil size={15} color="#E91E8C"/> Modifier</button>
                        <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiLightningBolt size={15} color="#a855f7"/> Booster</button>
                        <button onClick={() => { deletePost(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiTrash size={15}/> Supprimer</button>
                      </>}
                      {post.mediaURL && <button onClick={() => { window.open(post.mediaURL,'_blank'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, fontFamily:'Poppins' }}><HiDownload size={15} color="#3b82f6"/> Télécharger</button>}
                      {!isOwn && !post.mediaURL && <div style={{ padding:'10px 16px', color:'#C4829F', fontSize:13 }}>Aucune action</div>}
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
                  {post.contact && <a href={`tel:${post.contact}`} onClick={e=>e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE4F3', borderRadius:20, padding:'5px 12px', color:'#E91E8C', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
                  {post.lieu   && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFF0F8', borderRadius:20, padding:'5px 12px', color:'#8B5A6F', fontSize:13 }}><HiLocationMarker size={13} color="#E91E8C"/>{post.lieu}</span>}
                </div>
              )}
              {post.mediaURL && (
                <div style={{ marginTop:8 }}>
                  {post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:10, maxHeight:350, objectFit:'cover' }}/> : <video src={post.mediaURL} controls onClick={e=>e.stopPropagation()} style={{ width:'100%', borderRadius:10 }}/>}
                </div>
              )}
            </div>

            {/* Reaction count */}
            {total > 0 && (
              <div style={{ padding:'0 16px 8px', display:'flex', gap:4, flexWrap:'wrap', cursor:'pointer' }} onClick={() => openReactionModal(post)}>
                {Object.entries(rc).map(([e,c]) => <span key={e} style={{ background:'#FFE4F3', borderRadius:12, padding:'2px 8px', fontSize:12 }}>{e} {c}</span>)}
                <span style={{ fontSize:11, color:'#C4829F', alignSelf:'center' }}>· {total} {t('reactions')}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ borderTop:'1px solid #FFE4F3', padding:'8px 16px', display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowReact(p=>({...p,[post.id]:!p[post.id]}))} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:myR?'#E91E8C':'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}>
                  {myR?<span style={{ fontSize:16 }}>{myR}</span>:<HiOutlineHeart size={18}/>}
                  {total>0&&<span>{total}</span>}
                </button>
                {showReact[post.id] && (
                  <div style={{ position:'absolute', bottom:'110%', left:0, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.15)', zIndex:10, border:'1px solid #FFE4F3' }}>
                    {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22 }}>{e}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}>
                <HiChat size={18}/>{post.comments?.length>0&&<span>{post.comments.length}</span>}
              </button>
              <button onClick={() => sharePost(post)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}>
                <HiShare size={18}/>
              </button>
            </div>

            {/* Comments */}
            {openCmt[post.id] && (
              <div style={{ padding:'0 16px 14px', borderTop:'1px solid #FFE4F3' }}>
                {post.comments?.map(c => (
                  <div key={c.id} style={{ display:'flex', gap:8, marginTop:10 }}>
                    <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
                    <div style={{ flex:1, background:'#FFF8FC', borderRadius:12, padding:'8px 10px' }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}{' '}</span>
                      {c.text&&<span style={{ fontSize:13 }}>{c.text}</span>}
                      {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                      <div style={{ display:'flex', gap:10, marginTop:5 }}>
                        <button onClick={() => setReplyTo(p=>({...p,[post.id]:c.authorName}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#C4829F", fontSize:11, display:"flex", alignItems:"center", gap:3 }}><HiReply size={12}/> Répondre</button>
                        <button onClick={() => setCmtReactionPicker(p => p===c.id?null:c.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#C4829F", fontSize:11 }}>{Object.values(c.reactions||{}).find(r=>r===c.reactions?.[currentUser.uid]) || "😊"} {Object.keys(c.reactions||{}).length||""}</button>
                        {cmtReactionPicker===c.id && <div style={{ display:"flex", gap:4, background:"white", borderRadius:20, padding:"4px 8px", boxShadow:"0 2px 12px rgba(0,0,0,.15)", position:"absolute", zIndex:10 }}>{["❤️","😂","😮","😢","👍","🔥"].map(em=><span key={em} onClick={()=>reactToCmt(post.id,c.id,em)} style={{ fontSize:18, cursor:"pointer" }}>{em}</span>)}</div>}
                        {c.uid===currentUser.uid&&<>
                          <button onClick={() => setEditCmt({ postId:post.id, cmt:c, text:c.text })} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiPencil size={12}/> Modifier</button>
                          <button onClick={() => deleteCmt(post.id,c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiTrash size={12}/> Supprimer</button>
                        </>}
                      </div>
                    </div>
                  </div>
                ))}

                {replyTo[post.id] && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, background:'#FFF0F8', padding:'6px 10px', borderRadius:10 }}>
                    <HiReply size={14} color="#E91E8C"/>
                    <span style={{ fontSize:12, color:'#8B5A6F' }}>Répondre à <strong>{replyTo[post.id]}</strong></span>
                    <button onClick={() => setReplyTo(p=>({...p,[post.id]:null}))} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={14}/></button>
                  </div>
                )}

                {cmtMedia[post.id] && (
                  <div style={{ position:'relative', marginTop:8, display:'inline-block' }}>
                    {cmtMedia[post.id].type==='image'?<img src={cmtMedia[post.id].preview} alt="" style={{ maxWidth:150, borderRadius:8 }}/>:<video src={cmtMedia[post.id].preview} style={{ maxWidth:150, borderRadius:8 }}/>}
                    <button onClick={() => setCmtMedia(p=>({...p,[post.id]:null}))} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10 }}>✕</button>
                  </div>
                )}

                <div style={{ display:'flex', gap:6, marginTop:10, alignItems:'center' }}>
                  <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0 }}/>
                  <input ref={el=>cPhotoRef.current[post.id]=el} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'image',preview:URL.createObjectURL(f)}}));}}/>
                  <input ref={el=>cVideoRef.current[post.id]=el} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'video',preview:URL.createObjectURL(f)}}));}}/>
                  <input className="input" placeholder={replyTo[post.id]?`Répondre à ${replyTo[post.id]}...`:t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} maxLength={MAX_COMMENT}/>
                  <button onClick={() => cPhotoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiPhotograph size={18}/></button>
                  <button onClick={() => cVideoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiVideoCamera size={18}/></button>
                  <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
