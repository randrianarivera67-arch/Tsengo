// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, collection, query, where,
  onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, limit, increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { timeAgo } from '../utils/timeAgo';
import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';
import { downloadMedia } from '../utils/download';
import ShareModal from '../components/ShareModal';
import MediaViewer from '../components/MediaViewer';
import PhotoCarousel from '../components/PhotoCarousel';
import FollowListModal from '../components/FollowListModal';
import { useActiveStoryUids } from '../hooks/useActiveStoryUids';
import { NeonBriefcase, NeonGraduation, NeonPhone, NeonGlobe, NeonLocation, NeonHome, NeonMic, NeonArchive, NeonClock, NeonLike, NeonComment, NeonShare, NeonStar } from '../components/NeonIcons';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { sendPushNotification } from '../utils/onesignal';
import { v4 as uuidv4 } from 'uuid';
import {
  HiCamera, HiPencil, HiTag, HiChat, HiOutlineHeart,
  HiShare, HiStar, HiX, HiUserAdd, HiPhotograph, HiVideoCamera,
  HiDotsVertical, HiTrash, HiLightningBolt, HiDownload, HiPaperAirplane, HiFlag, HiBan,
  HiReply, HiPhone, HiLocationMarker, HiLink
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡'];
const FB_REACTIONS = [
  { emoji:'❤️', label:"J'aime"    },
  { emoji:'😂', label:'Haha'      },
  { emoji:'😮', label:'Wouah'     },
  { emoji:'😢', label:'Triste'    },
  { emoji:'😡', label:'En colère' },
];

function VIPBadge() {
  return <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>;
}

const TABS = [
  { key:'posts',  label:'Publications' },
  { key:'sales',  label:'Ventes'       },
  { key:'photos', label:'Photos'       },
  { key:'videos', label:'Vidéos'       },
  { key:'amis',   label:'Amis'         },
];

export default function Profile() {
  const { uid }  = useParams();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const activeStoryUids = useActiveStoryUids();
  const { t }    = useLang();
  const navigate = useNavigate();

  const isOwn     = !uid || uid === currentUser?.uid;
  const [profMenu,     setProfMenu]     = useState(false);
  const [otherMenu,    setOtherMenu]    = useState(false);
  const [followListOpen, setFollowListOpen] = useState(null); // null | 'followers' | 'following'
  const [storyArchive, setStoryArchive] = useState(null);   // null | []
  const [dataSaver, setDataSaverState] = useState(isDataSaverOn());
  useEffect(() => subscribeDataSaver(setDataSaverState), []);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [souvenirs,    setSouvenirs]    = useState(null);   // null | []
  const targetUid = uid  || currentUser?.uid;

  const [profile,        setProfile]     = useState(null);
  const [posts,          setPosts]       = useState([]);
  const [visibleCount,   setVisibleCount] = useState(10);
  const [activeTab,      setActiveTab]   = useState('posts');
  const [editing,        setEditing]     = useState(false);
  const [editForm,       setEditForm]    = useState({
    fullName:'', bio:'', work:'', study:'', phone:'', website:'',
    currentCity:'', hometown:'', accountType:'personal',
  });
  const [uploadingPhoto, setUploading]   = useState(false);
  const [coverURL,       setCoverURL]    = useState(null);
  const [uploadingCover, setUploadCover] = useState(false);
  const [openCmt,        setOpenCmt]     = useState({});
  const [cmtText,        setCmtText]     = useState({});
  const [cmtMedia,       setCmtMedia]    = useState({});
  const [showReact,      setShowReact]   = useState({});
  const [reactionModal,  setRM]          = useState(null);
  const [cmtReactionPicker, setCmtReactionPicker] = useState(null);
  const [editPost,       setEditPost]    = useState(null);
  const [editContent,    setEditContent] = useState('');
  const [postMenu,       setPostMenu]    = useState(null);
  const [expandedPosts,  setExpandedPosts] = useState({});

  // ── Menus mikatona rehefa scroll ──
  useEffect(() => {
    const close = () => { setPostMenu(null); setShowReact({}); setCmtReactionPicker(null); setProfMenu(false); };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);

  // ── Compteur "Vues du profil" (indray mandeha isaky ny session, profil an'olon-kafa) ──
  useEffect(() => {
    if (!uid || !currentUser || uid === currentUser.uid) return;
    const key = 'viewedProfiles';
    let vs; try { vs = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch { vs = []; }
    if (vs.includes(uid)) return;
    try { sessionStorage.setItem(key, JSON.stringify([...vs, uid])); } catch {}
    updateDoc(doc(db, 'users', uid), { profileViews: increment(1) }).catch(() => {});
  }, [uid, currentUser]);
  const [editCmt,        setEditCmt]     = useState(null);
  const [replyTo,        setReplyTo]     = useState({});
  const [friendsData,    setFriendsData] = useState([]);
  const [loadingFriends, setLoadingF]    = useState(false);
  const [zoomPhoto,      setZoomPhoto]   = useState(null);
  const [viewerState,    setViewerState] = useState(null); // { post, index }
  const [selectedPost,   setSelectedPost] = useState(null);
  const [friendStatus,   setFriendStatus] = useState('none');

  const photoRef  = useRef();
  const coverRef  = useRef();
  const cPhotoRef = useRef({});
  const cVideoRef = useRef({});

  useEffect(() => {
    const fn = () => { setPostMenu(null); setOtherMenu(false); };
    document.addEventListener('click', fn);
  return () => document.removeEventListener('click', fn);
  }, []);

  useEffect(() => {
    if (!targetUid) return;
    getDoc(doc(db,'users',targetUid)).then(s => {
      if (s.exists()) {
        const d = s.data();
        setProfile(d);
        setEditForm({
          fullName: d.fullName || '', bio: d.bio || '',
          work: d.work || '', study: d.study || '', phone: d.phone || '', website: d.website || '',
          currentCity: d.currentCity || '', hometown: d.hometown || '', accountType: d.accountType || 'personal',
        });
        setCoverURL(d.coverURL || null);
      }
    });
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db,'posts'), where('uid','==',targetUid), orderBy('createdAt','desc'), limit(60));
    // ✅ Les publications d'une page artiste restent sur la page (pas sur le profil perso)
    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data()})).filter(p => !p.artistId && !p.isMusic && !p.shopId && !p.pageId)));
  }, [targetUid]);

  useEffect(() => {
    if (!profile||isOwn) return;
    const f = userProfile?.friends||[], s = userProfile?.sentRequests||[];
    setFriendStatus(f.includes(targetUid)?'friend':s.includes(targetUid)?'requested':'none');
  }, [profile, userProfile, targetUid, isOwn]);

  useEffect(() => {
    if (activeTab!=='amis'||!profile) return;
    const friends = profile.friends||[];
    if (!friends.length) { setFriendsData([]); return; }
    setLoadingF(true);
    Promise.all(friends.map(fuid => getDoc(doc(db,'users',fuid)).then(s => s.exists()?{uid:fuid,...s.data()}:null)))
      .then(list => { setFriendsData(list.filter(Boolean)); setLoadingF(false); });
  }, [activeTab, profile]);

  async function uploadProfilePhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const r = await uploadToTelegram(file);
      await updateDoc(doc(db,'users',currentUser.uid), { photoURL: r.url });
      setProfile(p=>({...p,photoURL:r.url})); setUserProfile(p=>({...p,photoURL:r.url}));
      await addDoc(collection(db,'posts'),{
        uid:currentUser.uid, authorName:userProfile.fullName,
        authorPhoto:r.url, authorUsername:userProfile.username,
        authorIsVip:userProfile.isVip||false,
        content:'📸 a mis à jour sa photo de profil',
        mediaURL:r.url, mediaType:'image',
        isProfilePhoto:true, reactions:{}, comments:[],
        createdAt:serverTimestamp(),
      });
    } catch(err) { alert('Erreur upload'); }
    setUploading(false);
  }

  async function uploadCoverPhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadCover(true);
    try {
      const r = await uploadToTelegram(file);
      await updateDoc(doc(db,'users',currentUser.uid), { coverURL: r.url });
      setCoverURL(r.url);
      setProfile(p=>({...p,coverURL:r.url}));
      // Voatahiry ao amin'ny photos tab
      await addDoc(collection(db,'posts'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorPhoto: userProfile.photoURL||'',
        authorUsername: userProfile.username,
        authorIsVip: userProfile.isVip||false,
        content: 'Photo de couverture',
        mediaURL: r.url,
        mediaType: 'image',
        isCoverPhoto: true,
        reactions: {},
        comments: [],
        createdAt: serverTimestamp(),
      });
    } catch(err) { alert('Erreur upload cover'); }
    setUploadCover(false);
  }

  async function saveProfile() {
    if (!editForm.fullName.trim()) return;
    await updateDoc(doc(db,'users',currentUser.uid), {
      fullName: editForm.fullName, bio: editForm.bio,
      work: editForm.work.trim(), study: editForm.study.trim(),
      phone: editForm.phone.trim(), website: editForm.website.trim(),
      currentCity: editForm.currentCity.trim(), hometown: editForm.hometown.trim(),
      accountType: editForm.accountType,
    });
    setProfile(p=>({...p,...editForm})); setUserProfile(p=>({...p,...editForm})); setEditing(false);
  }

  async function cancelFriendRequest() {
    try {
      await updateDoc(doc(db,'users',currentUser.uid), { sentRequests: arrayRemove(targetUid) });
      setUserProfile(p => ({ ...p, sentRequests: (p.sentRequests||[]).filter(id => id !== targetUid) }));
      setFriendStatus('none');
    } catch(e) { console.warn(e); }
  }

  async function sendFriendRequest() {
    if (!currentUser||!targetUid) return;
    await addDoc(collection(db,'friendRequests'), { fromUid:currentUser.uid, toUid:targetUid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', status:'pending', createdAt:serverTimestamp() });
    await updateDoc(doc(db,'users',currentUser.uid), { sentRequests:arrayUnion(targetUid) });
    await addDoc(collection(db,'notifications'), { toUid:targetUid, fromUid:currentUser.uid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', type:'friendRequest', message:`${userProfile.fullName} vous a envoyé une demande d'ami`, read:false, createdAt:serverTimestamp() });
    setFriendStatus('requested');
  }

  const isBlockedByMe = (userProfile?.blocked || []).includes(targetUid);
  async function toggleBlockUser() {
    if (!targetUid || targetUid === currentUser.uid) return;
    const msg = isBlockedByMe ? `Débloquer ${profile.fullName} ?` : `Bloquer ${profile.fullName} ? Vous ne verrez plus ses publications.`;
    if (!window.confirm(msg)) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blocked: isBlockedByMe ? arrayRemove(targetUid) : arrayUnion(targetUid),
      });
      setUserProfile(p => ({ ...p, blocked: isBlockedByMe ? (p.blocked||[]).filter(u=>u!==targetUid) : [...(p.blocked||[]), targetUid] }));
      setOtherMenu(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function copyProfileLink() {
    setProfMenu(false); setOtherMenu(false);
    const url = `${window.location.origin}/profile/${targetUid}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => alert('Lien copié !'), () => alert(url));
    else { const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); alert('Lien copié !'); }
  }

  async function reportUser() {
    if (!window.confirm(`Signaler le profil de ${profile.fullName} aux administrateurs ?`)) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'user', targetUid, targetName: profile.fullName,
        reportedBy: currentUser.uid, reportedByName: userProfile.fullName,
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
      setOtherMenu(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  const isFollowing = (profile?.followers || []).includes(currentUser?.uid);
  async function toggleFollow() {
    if (!currentUser || !targetUid || targetUid === currentUser.uid) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
      // Miroir ao amin'ny compte-nao ihany koa : mora jerena avy amin'ny fil d'actualités
      await updateDoc(doc(db, 'users', currentUser.uid), {
        following: isFollowing ? arrayRemove(targetUid) : arrayUnion(targetUid),
      });
      setProfile(p => ({ ...p, followers: isFollowing ? (p.followers || []).filter(u => u !== currentUser.uid) : [...(p.followers || []), currentUser.uid] }));
      setUserProfile(p => ({ ...p, following: isFollowing ? (p.following || []).filter(u => u !== targetUid) : [...(p.following || []), targetUid] }));
      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          toUid: targetUid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'general', message: `${userProfile.fullName} s'est abonné(e) à votre profil`, read: false, createdAt: serverTimestamp(),
        });
      }
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function reactToPost(postId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const reactions = post.reactions||{}, my = reactions[currentUser.uid];
    if (my===emoji) {
      const u={...reactions}; delete u[currentUser.uid];
      await updateDoc(doc(db,'posts',postId),{reactions:u});
    } else {
      await updateDoc(doc(db,'posts',postId),{[`reactions.${currentUser.uid}`]:emoji});
      if (post.uid !== currentUser.uid) {
        await addDoc(collection(db,'notifications'), {
          toUid:post.uid, fromUid:currentUser.uid,
          fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'',
          type:'reaction', postId, emoji,
          message:`${userProfile.fullName} a réagi ${emoji} à votre publication`,
          read:false, createdAt:serverTimestamp(),
        });
        sendPushNotification({ toExternalId:post.uid, title:userProfile.fullName, message:`a réagi ${emoji}`, data:{type:'reaction',postId} });
      }
    }
    setShowReact(p=>({...p,[postId]:false}));
  }

  async function openReactionModal(post) {
    const reactions = post.reactions||{};
    if (!Object.keys(reactions).length) return;
    const userData = {};
    await Promise.all(Object.keys(reactions).map(async uid => {
      try {
        const s = await getDoc(doc(db,'users',uid));
        userData[uid] = s.exists() ? { name:s.data().fullName, photo:s.data().photoURL } : { name:uid, photo:'' };
      } catch { userData[uid] = { name:uid, photo:'' }; }
    }));
    setRM({ reactions, userData });
  }

  async function reactToCmt(postId, cmtId, emoji) {
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const updated = post.comments.map(c => {
      if (c.id !== cmtId) return c;
      const reactions = c.reactions||{};
      const my = reactions[currentUser.uid];
      if (my===emoji) { const u={...reactions}; delete u[currentUser.uid]; return {...c,reactions:u}; }
      return {...c,reactions:{...reactions,[currentUser.uid]:emoji}};
    });
    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setCmtReactionPicker(null);
  }

  async function addComment(postId) {
    const rt = replyTo[postId];
    const raw = rt ? `@${rt} ${cmtText[postId]||''}` : (cmtText[postId]||'');
    const text = raw.trim(); const media = cmtMedia[postId];
    if (!text && !media) return;
    let mediaURL='', cMT='';
    if (media) { try { const r=await uploadToTelegram(media.file); mediaURL=r.url; cMT=r.type; } catch {} }
    const post = posts.find(p=>p.id===postId);
    const cmt = {
      id:uuidv4(), uid:currentUser.uid,
      authorName:userProfile.fullName, authorPhoto:userProfile.photoURL||'',
      authorIsVip:userProfile.isVip||false,
      text:text.slice(0,500), mediaURL, mediaType:cMT,
      createdAt:new Date().toISOString(),
    };
    await updateDoc(doc(db,'posts',postId),{comments:arrayUnion(cmt)});
    setCmtText(p=>({...p,[postId]:''}));
    setCmtMedia(p=>({...p,[postId]:null}));
    setReplyTo(p=>({...p,[postId]:null}));
    if (post && post.uid !== currentUser.uid) {
      await addDoc(collection(db,'notifications'), {
        toUid:post.uid, fromUid:currentUser.uid,
        fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'',
        type:'comment', postId,
        message:`${userProfile.fullName} a commenté votre publication`,
        read:false, createdAt:serverTimestamp(),
      });
      sendPushNotification({ toExternalId:post.uid, title:userProfile.fullName, message:text?`a commenté : "${text.slice(0,50)}"`:' a commenté', data:{type:'comment',postId} });
    }
  }

  async function deleteCmt(postId, cmt) {
    if (cmt.uid !== currentUser.uid && post.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId),{comments:arrayRemove(cmt)});
  }

  async function saveEditCmt(postId, oldCmt, newText) {
    if (!newText.trim()) return;
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const updated = post.comments.map(c => c.id===oldCmt.id ? {...c,text:newText.trim()} : c);
    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setEditCmt(null);
  }

  async function deletePost(postId) {
    const post = posts.find(p=>p.id===postId);
    if (!post || post.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer cette publication ?')) return;
    await deleteDoc(doc(db,'posts',postId));
  }

  async function saveEditPost() {
    if (!editContent.trim()||!editPost||editPost.uid!==currentUser.uid) return;
    await updateDoc(doc(db,'posts',editPost.id),{content:editContent.trim().slice(0,2000)});
    setEditPost(null);
  }

  function sharePost(post) {
    setShareModalPost(post);
  }

  function countReactions(r={}) {
    const c={}; Object.values(r).forEach(e=>{c[e]=(c[e]||0)+1;}); return c;
  }

  const regularPosts = posts.filter(p=>!p.isSale);
  const salePosts    = posts.filter(p=>p.isSale);
  const photoPosts   = posts.filter(p=>p.mediaType==='image'&&p.mediaURL);
  const videoPosts   = posts.filter(p=>p.mediaType==='video'&&p.mediaURL);

  function getTabContent() {
    if (activeTab==='posts')  return regularPosts;
    if (activeTab==='sales')  return salePosts;
    if (activeTab==='photos') return photoPosts;
    if (activeTab==='videos') return videoPosts;
    return [];
  }

  if (!profile) return <div style={{ padding:40, textAlign:'center', color:'#65676B' }}>{t('loading')}</div>;
  const friendCount = profile.friends?.length||0;
  const profilePhoto = profile.photoURL ? [posts.find(p=>p.isProfilePhoto && p.mediaURL===profile.photoURL) || { id:'profile-photo', uid:targetUid, authorName:profile.fullName, authorPhoto:profile.photoURL, mediaURL:profile.photoURL, mediaType:'image', isProfilePhoto:true, reactions:{}, comments:[] }] : [];
  const coverPhotoArr = coverURL ? [posts.find(p=>p.isCoverPhoto && p.mediaURL===coverURL) || { id:'cover-photo', uid:targetUid, authorName:profile.fullName, authorPhoto:profile.photoURL, mediaURL:coverURL, mediaType:'image', isCoverPhoto:true, reactions:{}, comments:[] }] : [];
  const allPhotos = [...coverPhotoArr, ...profilePhoto, ...photoPosts];

  function renderPost(post) {
    const rc     = countReactions(post.reactions);
    const myR    = post.reactions?.[currentUser.uid];
    const total  = Object.keys(post.reactions||{}).length;
    const isOwnPost = post.uid === currentUser?.uid;
    const boosted = post.isBoosted && post.boostUntil && new Date(post.boostUntil)>new Date();

    return (
      <div key={post.id} className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined }}>
        {boosted && (
          <div style={{ background:'linear-gradient(135deg,#7c3aed18,#a855f718)', borderBottom:'1px solid #a855f733', padding:'5px 14px' }}>
            <span style={{ fontSize:10, color:'#a855f7', fontWeight:600 }}>⚡ Sponsorisé</span>
          </div>
        )}

        <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
            <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <p style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.fullName}{profile.isVip&&<VIPBadge/>}</p>
              <p style={{ fontSize:12, color:'#65676B' }}>@{profile.username} · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {post.isSale && <div style={{ textAlign:'right' }}><span className="sale-badge">{t('sale')}</span><p className="price-tag" style={{ marginTop:2, fontSize:13 }}>{post.price} Ar</p></div>}
            <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
              <button onClick={() => setPostMenu(postMenu===post.id?null:post.id)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4, display:'flex', alignItems:'center' }}><HiDotsVertical size={18}/></button>
              {postMenu===post.id && (
                <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:170, zIndex:50, overflow:'hidden' }}>
                  {isOwnPost && <>
                    <button onClick={() => { setEditPost(post); setEditContent(post.content); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiPencil size={15} color="#1877F2"/> Modifier</button>
                    <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={15} color="#a855f7"/> Booster</button>
                    <button onClick={() => { deletePost(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#1877F2', fontSize:14, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiTrash size={15}/> Supprimer</button>
                  </>}
                  {post.mediaURL && <button onClick={() => { downloadMedia(post.mediaURL, post.mediaType); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:14, fontFamily:'Poppins' }}><HiDownload size={15} color="#3b82f6"/> Télécharger</button>}
                  {!isOwnPost && !post.mediaURL && <div style={{ padding:'10px 16px', color:'#65676B', fontSize:13 }}>Aucune action</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding:'10px 16px', cursor:'pointer' }} onClick={() => setSelectedPost(post)}>
          {post.content && (<>
            {post.textBg ? (
            <p style={{ background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8 }}>{post.content}</p>
            ) : (
            <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word',
              ...(expandedPosts[post.id] ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }) }}>
              {post.content}
            </p>
            )}
            {post.content.length > 120 && (
              <span onClick={e => { e.stopPropagation(); setExpandedPosts(pv => ({ ...pv, [post.id]: !pv[post.id] })); }}
                style={{ fontSize:13, fontWeight:700, color:'#65676B', cursor:'pointer' }}>
                {expandedPosts[post.id] ? 'Voir moins' : 'Voir plus'}
              </span>
            )}
          </>)}
          {post.isSale && (post.contact||post.lieu) && (
            <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:8 }}>
              {post.contact && <a href={`tel:${post.contact}`} onClick={e=>e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:5, background:'#E4E6EB', borderRadius:20, padding:'5px 12px', color:'#1877F2', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
              {post.lieu && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#F0F2F5', borderRadius:20, padding:'5px 12px', color:'#65676B', fontSize:13 }}><HiLocationMarker size={13} color="#1877F2"/>{post.lieu}</span>}
            </div>
          )}
          {post.sharedFrom && (
            <div onClick={e => { e.stopPropagation(); navigate(`/post/${post.sharedFrom.id}`); }}
              style={{ marginTop:8, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px' }}>
                <img src={post.sharedFrom.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedFrom.authorName||'U')}&background=1877F2&color=fff`}
                  alt="" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }}/>
                <p style={{ fontWeight:700, fontSize:13 }}>{post.sharedFrom.groupName ? `${post.sharedFrom.groupName} · ${post.sharedFrom.authorName}` : post.sharedFrom.authorName}</p>
              </div>
              {post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}>{post.sharedFrom.content}</p>}
              {post.sharedFrom.mediaURL && (
                post.sharedFrom.mediaType === 'image'
                  ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block' }}/>
                  : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>
              )}
            </div>
          )}
          {post.mediaURL && (
            <div style={{ marginTop:8 }}>
              {post.mediaType==='image'
                ? (post.mediaURLs?.length > 1
                    ? <PhotoCarousel urls={post.mediaURLs} onOpen={() => navigate(`/post/${post.id}`)} />
                    : <img src={post.mediaURL} alt="" onClick={() => navigate(`/post/${post.id}`)} style={{ width:'100%', borderRadius:10, maxHeight:350, objectFit:'cover', cursor:'zoom-in' }}/>)
                : <div onClick={()=>navigate('/reels',{state:{startId:post.id}})} style={{ position:'relative', cursor:'pointer' }}><video src={post.mediaURL} poster={post.thumbURL || undefined} preload={(dataSaver || post.thumbURL) ? 'none' : 'metadata'} style={{ width:'100%', borderRadius:10, maxHeight:350, objectFit:'cover', background:'#000' }} muted playsInline/><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:50, height:50, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:20 }}>▶</span></div></div></div>}
            </div>
          )}
        </div>

        {(total > 0 || post.comments?.length > 0) && (
          <div style={{ padding:'0 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div onClick={() => openReactionModal(post)} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', minHeight:18 }}>
              {total > 0 && <>
                <div style={{ display:'flex', gap:3 }}>{Object.entries(rc).slice(0,3).map(([e]) => <span key={e} style={{ fontSize:14, background:'white', borderRadius:'50%', boxShadow:'0 0 0 1.5px white', lineHeight:1 }}>{e}</span>)}</div>
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

        <div className='post-actions-row'>
          <div style={{ position:'relative', flex:1, display:'flex' }}>
            <button onClick={() => { const m = post.reactions?.[currentUser.uid]; reactToPost(post.id, m || '❤️'); }}
              onContextMenu={e => { e.preventDefault(); setShowReact(p=>({...p,[post.id]:!p[post.id]})); }}
              className={'post-action-btn'+(myR?' active':'')}
              style={myR ? { color:'#1877F2', fontWeight:700 } : {}}>
              <NeonLike size={19} color={myR ? '#1877F2' : '#65676B'}/> J'aime
            </button>
            {showReact[post.id] && (
              <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, background:'white', borderRadius:20, padding:'10px 8px 6px', display:'flex', gap:4, boxShadow:'0 4px 24px rgba(0,0,0,.18)', zIndex:50, border:'1px solid #E4E6EB', whiteSpace:'nowrap' }}>
                {FB_REACTIONS.map(r => (
                  <button key={r.emoji}
                    onClick={()=>{ reactToPost(post.id, r.emoji); setShowReact(p=>({...p,[post.id]:false})); }}
                    style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'0 4px', minWidth:44 }}>
                    <span style={{ fontSize:28, lineHeight:1, display:'block', transition:'transform .15s' }}
                      onTouchStart={ev=>ev.currentTarget.style.transform='scale(1.35) translateY(-4px)'}
                      onTouchEnd={ev=>ev.currentTarget.style.transform='scale(1)'}
                    >{r.emoji}</span>
                    <span style={{ fontSize:10, color:'#65676B', fontWeight:600, fontFamily:'Poppins' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} className='post-action-btn'>
            <NeonComment size={18}/> Commenter
          </button>
          <button onClick={() => sharePost(post)} className='post-action-btn'>
            <NeonShare size={18}/> Partager
          </button>
        </div>

        {openCmt[post.id] && (
          <div style={{ padding:'0 16px 14px', borderTop:'1px solid #E4E6EB' }}>
            {post.comments?.map(c => (
              <div key={c.id} style={{ display:'flex', gap:8, marginTop:10 }}>
                <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
                <div style={{ flex:1, background:'#F0F2F5', borderRadius:12, padding:'8px 10px' }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}{' '}</span>
                  {c.text&&<span style={{ fontSize:13 }}>{c.text}</span>}
                  {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                  <div style={{ display:'flex', gap:14, marginTop:5, flexWrap:'wrap', fontSize:12, fontWeight:700, color:'#65676B', position:'relative', alignItems:'center' }}>
                    <span onClick={() => reactToCmt(post.id, c.id, c.reactions?.[currentUser.uid] || '❤️')} style={{ cursor:'pointer', color: c.reactions?.[currentUser.uid] ? '#FF2D8D' : '#65676B', fontWeight: c.reactions?.[currentUser.uid] ? 700 : 400 }}>
                      {c.reactions?.[currentUser.uid] && c.reactions[currentUser.uid] !== '❤️' ? c.reactions[currentUser.uid] + ' ' : ''}J'aime
                    </span>
                    <span onClick={() => setCmtReactionPicker(p => p===c.id?null:c.id)} style={{ cursor:'pointer' }}>😊</span>
                    <span onClick={() => setReplyTo(p=>({...p,[post.id]:c.authorName}))} style={{ cursor:'pointer' }}>Répondre</span>
                    {cmtReactionPicker===c.id && <div style={{ display:'flex', gap:6, background:'white', borderRadius:20, padding:'6px 10px', boxShadow:'0 2px 12px rgba(0,0,0,.2)', position:'absolute', bottom:'110%', left:0, zIndex:10, border:'1px solid #E4E6EB' }}>{REACTIONS.map(em=><span key={em} onClick={()=>reactToCmt(post.id,c.id,em)} style={{ fontSize:20, cursor:'pointer' }}>{em}</span>)}</div>}
                    {c.uid===currentUser.uid && (
                      <span onClick={() => setEditCmt({ postId:post.id, cmt:c, text:c.text })} style={{ cursor:'pointer' }}>Modifier</span>
                    )}
                    {(c.uid===currentUser.uid||post.uid===currentUser.uid) && (
                      <span onClick={() => deleteCmt(post.id,c)} style={{ cursor:'pointer', color:'#FF2D8D' }}>Supprimer</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

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
              <input className="input" placeholder={replyTo[post.id]?`Répondre à ${replyTo[post.id]}...`:t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} maxLength={500}/>
              <button onClick={() => cPhotoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiPhotograph size={18}/></button>
              <button onClick={() => cVideoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiVideoCamera size={18}/></button>
              <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Archive de votre story (stories rehetra, na efa lany 24h aza) ──
  async function openStoryArchive() {
    setProfMenu(false); setStoryArchive([]);
    try {
      const { getDocs, collection, query, where } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'stories'), where('uid', '==', currentUser.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setStoryArchive(list);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); setStoryArchive(null); }
  }

  async function deleteArchivedStory(st) {
    if (!window.confirm('Supprimer cette story de l\'archive ?')) return;
    try {
      const { deleteDoc: dd, doc: dc } = await import('firebase/firestore');
      await dd(dc(db, 'stories', st.id));
      setStoryArchive(a => (a || []).filter(x => x.id !== st.id));
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  // ── Souvenirs : publications tamin'ny andro sy volana mitovy, taona lasa ──
  function openSouvenirs() {
    setProfMenu(false);
    const today = new Date();
    const list = (posts || []).filter(p => {
      if (!p.createdAt?.toDate) return false;
      const d = p.createdAt.toDate();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() < today.getFullYear();
    });
    setSouvenirs(list);
  }

  return (
    <>
      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
          zIndex:500, overflowY:'auto', display:'flex',
          alignItems:'flex-start', justifyContent:'center', padding:'16px 0 60px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:16, width:'100%',
            maxWidth:520, margin:'0 12px', overflow:'hidden'
          }}>
            <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <img
                src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName||'U')}&background=1877F2&color=fff`}
                alt="" style={{ width:42,height:42,borderRadius:'50%',objectFit:'cover' }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700,fontSize:14 }}>{profile.fullName}</p>
                <p style={{ fontSize:12,color:'#65676B' }}>{timeAgo(selectedPost.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedPost(null)} style={{
                background:'#F0F2F5',border:'none',borderRadius:'50%',
                width:34,height:34,cursor:'pointer',fontSize:20,
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>✕</button>
            </div>
            {selectedPost.content && (
              selectedPost.textBg
                ? <div style={{ background:selectedPost.textBg,minHeight:160,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 20px' }}>
                    <p style={{ fontSize:22,fontWeight:800,color:'white',textAlign:'center' }}>{selectedPost.content}</p>
                  </div>
                : <p style={{ padding:'0 16px 10px',fontSize:15,lineHeight:1.6,wordBreak:'break-word' }}>{selectedPost.content}</p>
            )}
            {selectedPost.mediaURL && (
              selectedPost.mediaType==='image'
                ? <img src={selectedPost.mediaURL} alt="" style={{ width:'100%',maxHeight:420,objectFit:'contain',background:'#000',display:'block' }}/>
                : <video src={selectedPost.mediaURL} controls style={{ width:'100%',maxHeight:420,background:'#000',display:'block' }}/>
            )}
            {(Object.keys(selectedPost.reactions||{}).length > 0 || (selectedPost.comments||[]).length > 0) && (
              <div style={{ padding:'8px 16px',display:'flex',justifyContent:'space-between',borderTop:'1px solid #F0F2F5' }}>
                <span style={{ fontSize:13,color:'#65676B' }}>{Object.keys(selectedPost.reactions||{}).length} réaction{Object.keys(selectedPost.reactions||{}).length!==1?'s':''}</span>
                <span style={{ fontSize:13,color:'#65676B' }}>{(selectedPost.comments||[]).length} commentaire{(selectedPost.comments||[]).length!==1?'s':''}</span>
              </div>
            )}
            <div className="post-actions-row">
              <button onClick={() => reactToPost(selectedPost.id, selectedPost.reactions?.[currentUser.uid] || '❤️')}
                className={'post-action-btn'+(selectedPost.reactions?.[currentUser.uid]?' active':'')}>
                <NeonLike size={19} color={selectedPost.reactions?.[currentUser.uid]?'#FF2D8D':'#65676B'}/> J'aime
              </button>
              <button onClick={() => navigate(`/post/${selectedPost.id}`)} className="post-action-btn">
                <NeonComment size={18}/> Commenter
              </button>
              <button onClick={() => sharePost(selectedPost)} className="post-action-btn">
                <NeonShare size={18}/> Partager
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
      <div style={{ height:200, background:'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)', position:'relative' }}>
        {coverURL && <img src={coverURL} alt='cover' onClick={()=>{ const cp=coverPhotoArr[0]; cp && cp.id!=='cover-photo' ? navigate(`/post/${cp.id}`) : setZoomPhoto(coverURL); }} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0, cursor:'pointer' }}/>}
        {isOwn && <>
          <button onClick={()=>coverRef.current.click()} disabled={uploadingCover} style={{ position:'absolute', bottom:10, right:10, background:'#1877F2', border:'2px solid white', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>{uploadingCover?'...':<HiCamera size={16}/>}</button>
          <input ref={coverRef} type='file' accept='image/*' onChange={uploadCoverPhoto} style={{ display:'none' }}/>
        </>}
        <div style={{ position:'absolute', bottom:-55, left:'50%', transform:'translateX(-50%)' }}>
          <div style={{ position:'relative' }}>
            <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=1877F2&color=fff&size=100`} alt="" className="avatar avatar-ring" onClick={()=>{ if(!profile.photoURL) return; const pp=profilePhoto[0]; pp && pp.id!=='profile-photo' ? navigate(`/post/${pp.id}`) : setZoomPhoto(profile.photoURL); }} style={{ width:100, height:100, border: activeStoryUids.has(targetUid) ? '4px solid #1877F2' : '4px solid white', boxShadow: activeStoryUids.has(targetUid) ? '0 0 0 3px white, 0 0 0 6px #63A9FF' : 'none', objectFit:'cover', cursor:'pointer' }}/>
            {isOwn&&<><button onClick={() => photoRef.current.click()} disabled={uploadingPhoto} style={{ position:'absolute', bottom:2, right:2, background:'#1877F2', border:'2px solid white', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>{uploadingPhoto?'...':<HiCamera size={14}/>}</button><input ref={photoRef} type="file" accept="image/*" onChange={uploadProfilePhoto} style={{ display:'none' }}/></>}
          </div>
        </div>
      </div>

      <div style={{ textAlign:'center', padding:'65px 20px 16px' }}>
        {editing ? (
          <div style={{ maxWidth:300, margin:'0 auto' }}>
            <input className="input" value={editForm.fullName} onChange={e=>setEditForm(p=>({...p,fullName:e.target.value}))} style={{ marginBottom:10 }} placeholder={t('fullName')}/>
            <textarea className="input" value={editForm.bio} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} placeholder={t('bio')} rows={2} style={{ resize:'none', marginBottom:10 }}/>

            <p style={{ fontSize:11, fontWeight:700, color:'#65676B', textAlign:'left', margin:'6px 0 6px' }}>INFORMATIONS</p>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><NeonBriefcase/><input className="input" value={editForm.work} onChange={e=>setEditForm(p=>({...p,work:e.target.value}))} placeholder="Travail (ex : Développeur chez Trengo)" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><NeonGraduation/><input className="input" value={editForm.study} onChange={e=>setEditForm(p=>({...p,study:e.target.value}))} placeholder="Études (ex : Université d'Antananarivo)" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><NeonLocation/><input className="input" value={editForm.currentCity} onChange={e=>setEditForm(p=>({...p,currentCity:e.target.value}))} placeholder="Ville actuelle" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><NeonHome/><input className="input" value={editForm.hometown} onChange={e=>setEditForm(p=>({...p,hometown:e.target.value}))} placeholder="Ville d'origine" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><NeonPhone/><input className="input" value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} placeholder="Numéro de téléphone" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}><NeonGlobe/><input className="input" value={editForm.website} onChange={e=>setEditForm(p=>({...p,website:e.target.value}))} placeholder="Site web" style={{ flex:1 }}/></div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveProfile} style={{ flex:1 }}>{t('save')}</button>
            </div>
            <div onClick={() => navigate('/vip')} style={{ marginTop:12, padding:'10px 16px', background:'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, border:'1px solid #fcd34d' }}>
              <HiStar size={18} color="#f59e0b"/>
              <div style={{ textAlign:'left' }}><p style={{ fontWeight:700, fontSize:13, color:'#92400e' }}>Compte VIP</p><p style={{ fontSize:11, color:'#a16207' }}>Cliquez pour en savoir plus</p></div>
              {profile.isVip&&<span style={{ marginLeft:'auto', background:'#1877F2', color:'white', fontSize:10, padding:'2px 6px', borderRadius:6, fontWeight:700 }}>ACTIF</span>}
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight:700, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {profile.fullName}{profile.isVip&&<VIPBadge/>}
              {profile.accountType === 'artist' && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'linear-gradient(135deg,#FF6FA5,#FF2D8D)', color:'white', fontSize:11, fontWeight:800, borderRadius:10, padding:'2px 9px' }}>
                  <NeonMic size={11} color="white"/> ARTISTE
                </span>
              )}
            </h2>
            <p style={{ color:'#65676B', fontSize:14 }}>@{profile.username}</p>
            {profile.bio&&<p style={{ marginTop:8, fontSize:14, color:'#65676B', maxWidth:280, margin:'8px auto 0' }}>{profile.bio}</p>}

            {/* ── Informations complètes (format Facebook) ── */}
            {(profile.work || profile.study || profile.currentCity || profile.hometown || profile.phone || profile.website) && (
              <div style={{ maxWidth:320, margin:'14px auto 0', textAlign:'left', display:'flex', flexDirection:'column', gap:9 }}>
                {profile.work && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonBriefcase/> Travaille chez <strong>{profile.work}</strong></p>}
                {profile.study && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonGraduation/> A étudié à <strong>{profile.study}</strong></p>}
                {profile.currentCity && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonLocation/> Vit à <strong>{profile.currentCity}</strong></p>}
                {profile.hometown && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonHome/> Originaire de <strong>{profile.hometown}</strong></p>}
                {profile.phone && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonPhone/> {profile.phone}</p>}
                {profile.website && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:9 }}><NeonGlobe/> <a href={profile.website.startsWith('http')?profile.website:`https://${profile.website}`} target="_blank" rel="noreferrer" style={{ color:'#1877F2', textDecoration:'none' }}>{profile.website}</a></p>}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'center', gap:24, marginTop:16 }}>
              {[
                { label:'Publications', value:regularPosts.length },
                { label:'Ventes', value:salePosts.length },
                { label:'Amis', value:friendCount, onClick:()=>setActiveTab('amis') },
                { label:'Abonnés', value:(profile.followers||[]).length, onClick:()=>(profile.followers||[]).length>0&&setFollowListOpen('followers') },
                { label:'Suivi(e)s', value:(profile.following||[]).length, onClick:()=>(profile.following||[]).length>0&&setFollowListOpen('following') },
              ].map(({label,value,onClick}) => (
                <div key={label} style={{ textAlign:'center', cursor:onClick?'pointer':'default' }} onClick={onClick}>
                  <p style={{ fontWeight:700, fontSize:20, color:'#1877F2' }}>{value}</p>
                  <p style={{ fontSize:11, color:'#65676B' }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:14 }}>
              {isOwn ? (
                <>
                <button onClick={() => setEditing(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:"linear-gradient(180deg,#1B84FF,#1877F2)", border:"none", borderRadius:20, padding:'8px 18px', color:"white", fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:"0 3px 12px rgba(24,119,242,.35)" }}><HiPencil size={14}/>{t('editProfile')}</button>
                <div style={{ position:'relative', display:'inline-block' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setProfMenu(p => !p)} style={{ width:36, height:36, borderRadius:'50%', background:'#F0F2F5', border:'none', cursor:'pointer', color:'#050505', display:'flex', alignItems:'center', justifyContent:'center' }}><HiDotsVertical size={17}/></button>
                  {profMenu && (
                    <div style={{ position:'absolute', top:'110%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:210, zIndex:60, overflow:'hidden' }}>
                      <button onClick={openStoryArchive} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, fontWeight:400, color:'#050505', borderBottom:'1px solid #F0F2F5', whiteSpace:'nowrap' }}><NeonArchive/> Archive</button>
                      <button onClick={openSouvenirs} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><NeonClock/> Souvenirs</button>
                      <button onClick={copyProfileLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505' }}><HiLink size={16} color="#12A48D"/> Copier le lien</button>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <>
                  <button onClick={toggleFollow} className={isFollowing ? 'btn-secondary' : 'btn-gold'} style={{ fontSize:13, padding:'8px 16px' }}>
                    {isFollowing ? '✓ Abonné' : <><NeonStar size={13} color="#4A3400"/> Suivre</>}
                  </button>
                  <button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,targetUid)}`)} className="btn-primary" style={{ fontSize:13, padding:'8px 18px' }}><HiPaperAirplane size={14} style={{ display:'inline', marginRight:4 }}/>Message</button>
                  {friendStatus==='none'&&<button onClick={sendFriendRequest} style={{ display:'inline-flex', alignItems:'center', gap:6, background:"linear-gradient(180deg,#1B84FF,#1877F2)", border:"none", borderRadius:20, padding:'8px 16px', color:"white", fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:"0 3px 12px rgba(24,119,242,.35)" }}><HiUserAdd size={14}/>Ajouter</button>}
                  {friendStatus==='requested'&&<button onClick={cancelFriendRequest} style={{ display:'inline-flex', alignItems:'center', background:'#F3F4F6', border:'none', borderRadius:20, padding:'8px 16px', color:'#65676B', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Poppins' }}>Annulé</button>}
                  {friendStatus==='friend'&&<span style={{ display:'inline-flex', alignItems:'center', background:'#D1FAE5', borderRadius:20, padding:'8px 16px', color:'#065F46', fontSize:13 }}>✓ Ami</span>}
                  <div style={{ position:'relative', display:'inline-block' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOtherMenu(p => !p)} style={{ width:36, height:36, borderRadius:'50%', background:'#F0F2F5', border:'none', cursor:'pointer', color:'#050505', display:'flex', alignItems:'center', justifyContent:'center' }}><HiDotsVertical size={17}/></button>
                    {otherMenu && (
                      <div style={{ position:'absolute', top:'110%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:210, zIndex:60, overflow:'hidden' }}>
                        <button onClick={copyProfileLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLink size={16} color="#12A48D"/> Copier le lien</button>
                        <button onClick={reportUser} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={16} color="#F2B300"/> Signaler à l'admin</button>
                        <button onClick={toggleBlockUser} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:14, color:'#FF2D8D' }}><HiBan size={16}/> {isBlockedByMe ? 'Débloquer' : 'Bloquer'} cette personne</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ display:'flex', borderTop:'1px solid #E4E6EB', borderBottom:'1px solid #E4E6EB', background:'white', overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ flexShrink:0, padding:'12px 16px', border:'none', background:'none', cursor:'pointer',
              fontWeight:activeTab===tab.key?700:400, color:activeTab===tab.key?'#1877F2':'#65676B',
              borderBottom:activeTab===tab.key?'2px solid #1877F2':'2px solid transparent',
              fontSize:13, fontFamily:'Poppins' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {zoomPhoto && (
        <div onClick={()=>setZoomPhoto(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={zoomPhoto} alt='' style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/>
          <button onClick={()=>setZoomPhoto(null)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'white', fontSize:28, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {editPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier la publication</h3>
            <textarea className="input" rows={4} value={editContent} onChange={e=>setEditContent(e.target.value)} style={{ resize:'none' }} maxLength={2000}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditPost(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveEditPost} style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {editCmt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier le commentaire</h3>
            <textarea className="input" rows={3} value={editCmt.text} onChange={e=>setEditCmt(p=>({...p,text:e.target.value}))} style={{ resize:'none' }} maxLength={500}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditCmt(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={() => saveEditCmt(editCmt.postId, editCmt.cmt, editCmt.text)} style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {reactionModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
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

      <div style={{ padding:12 }}>
        {activeTab==='photos'&&(photoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucune photo</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {allPhotos.map(p => <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} style={{ aspectRatio:'1', overflow:'hidden', borderRadius:8, cursor:'pointer' }}><img src={p.mediaURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/></div>)}
            </div>
        )}

        {activeTab==='videos'&&(videoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucune vidéo</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {videoPosts.map(p => (
                <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} style={{ aspectRatio:'9/16', overflow:'hidden', borderRadius:10, cursor:'pointer', position:'relative' }}>
                  <video src={p.mediaURL} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:40, height:40, background:'rgba(0,0,0,.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:16 }}>▶</span></div>
                  </div>
                </div>
              ))}
            </div>
        )}

        {activeTab==='amis'&&(
          loadingFriends ? <div style={{ textAlign:'center', padding:30, color:'#65676B' }}>{t('loading')}</div>
          : friendsData.length===0 ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucun ami pour le moment</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {friendsData.map(f => (
                <div key={f.uid} onClick={() => navigate(`/profile/${f.uid}`)} className="card"
                  style={{ padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', textAlign:'center' }}>
                  <img src={f.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:60, height:60, borderRadius:'50%', objectFit:'cover', border:'2px solid #E4E6EB' }}/>
                  <div>
                    <p style={{ fontWeight:600, fontSize:13, color:'#050505' }}>{f.fullName}{f.isVip&&<img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>}</p>
                    <p style={{ fontSize:11, color:'#65676B' }}>@{f.username}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();navigate(`/messages/${getChatId(currentUser.uid,f.uid)}`);}} style={{ background:'#E4E6EB', border:'none', borderRadius:16, padding:'5px 12px', color:'#1877F2', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><HiPaperAirplane size={12}/>Message</button>
                </div>
              ))}
            </div>
        )}

        {(activeTab==='posts'||activeTab==='sales')&&(
          getTabContent().length===0
            ? <div style={{ textAlign:'center', padding:40, color:'#65676B' }}>Aucun contenu</div>
            : (<>
                {getTabContent().slice(0, visibleCount).map(post => renderPost(post))}
                {getTabContent().length > visibleCount && (
                  <div ref={el => { if (!el) return; const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setVisibleCount(c => c + 10); }, { rootMargin: '400px' }); io.observe(el); }}
                    style={{ padding: 18, textAlign: 'center', color: '#65676B', fontSize: 13 }}>Chargement…</div>
                )}
              </>)
        )}
      </div>

      {/* ── Modal : Archive de votre story ─────────────────── */}
      {storyArchive !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setStoryArchive(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:18, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontWeight:800, color:'#1877F2' }}>🗂️ Archive</h3>
              <button onClick={() => setStoryArchive(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {storyArchive.length === 0 && <p style={{ fontSize:14, color:'#65676B', textAlign:'center', padding:'20px 0' }}>Aucune story dans l'archive.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
              {storyArchive.map(st => (
                <div key={st.id} style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'9/16', background:'#000' }}>
                  {st.mediaType === 'video'
                    ? <video src={st.mediaURL} muted playsInline preload="metadata" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <img src={st.mediaURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                  <span style={{ position:'absolute', bottom:4, left:6, color:'white', fontSize:10, fontWeight:600, textShadow:'0 1px 4px rgba(0,0,0,.8)' }}>
                    {st.ts ? new Date(st.ts).toLocaleDateString('fr-FR') : ''}
                  </span>
                  <button onClick={() => deleteArchivedStory(st)}
                    style={{ position:'absolute', top:4, right:4, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <HiTrash size={12}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Souvenirs ──────────────────────────────── */}
      {souvenirs !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setSouvenirs(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:18, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontWeight:800, color:'#1877F2' }}>🕰️ Souvenirs</h3>
              <button onClick={() => setSouvenirs(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {souvenirs.length === 0 && (
              <p style={{ fontSize:14, color:'#65676B', textAlign:'center', padding:'20px 0' }}>
                Aucun souvenir aujourd'hui.<br/>
                <span style={{ fontSize:12 }}>Les publications faites le même jour les années passées apparaîtront ici.</span>
              </p>
            )}
            {souvenirs.map(sp => (
              <div key={sp.id} onClick={() => { setSouvenirs(null); navigate(`/post/${sp.id}`); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 4px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
                {sp.mediaURL
                  ? (sp.mediaType === 'video'
                      ? <video src={sp.mediaURL} muted playsInline preload="metadata" style={{ width:56, height:56, borderRadius:10, objectFit:'cover', flexShrink:0, background:'#000' }}/>
                      : <img src={sp.mediaURL} alt="" style={{ width:56, height:56, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>)
                  : <div style={{ width:56, height:56, borderRadius:10, background:'#E7F0FE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 }}>📝</div>}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:'#050505', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {sp.content || (sp.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo')}
                  </p>
                  <p style={{ fontSize:11, color:'#1877F2', fontWeight:700, marginTop:2 }}>
                    Il y a {new Date().getFullYear() - sp.createdAt.toDate().getFullYear()} an(s) — {sp.createdAt.toDate().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewerState && (
        <MediaViewer
          post={viewerState.post}
          startIndex={viewerState.index}
          onClose={() => setViewerState(null)}
          currentUser={currentUser}
          userProfile={userProfile}
          navigate={navigate}
          myR={viewerState.post.reactions?.[currentUser.uid]}
          rc={countReactions(viewerState.post.reactions)}
          total={Object.keys(viewerState.post.reactions||{}).length}
          onReact={(emoji) => reactToPost(viewerState.post.id, emoji)}
          onOpenReactionModal={() => openReactionModal(viewerState.post)}
          onDownload={(url) => downloadMedia(url, 'image')}
          onShare={() => sharePost(viewerState.post)}
          reactToCmt={reactToCmt}
          addComment={addComment}
          deleteCmt={deleteCmt}
          cmtText={cmtText}
          setCmtText={setCmtText}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          VIPBadge={VIPBadge}
        />
      )}
      {shareModalPost && <ShareModal post={shareModalPost} onClose={() => setShareModalPost(null)} />}
      {followListOpen && (
        <FollowListModal
          uids={followListOpen === 'followers' ? (profile.followers||[]) : (profile.following||[])}
          title={followListOpen === 'followers' ? 'Abonnés' : 'Suivi(e)s'}
          onClose={() => setFollowListOpen(null)}
        />
      )}
    </div>
    </>
  );
}