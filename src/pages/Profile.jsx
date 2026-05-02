// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, collection, query, where,
  onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { sendPushNotification } from '../utils/onesignal';
import { v4 as uuidv4 } from 'uuid';
import {
  HiCamera, HiPencil, HiTag, HiChat, HiOutlineHeart,
  HiShare, HiStar, HiX, HiUserAdd, HiPhotograph, HiVideoCamera,
  HiDotsVertical, HiTrash, HiLightningBolt, HiDownload,
  HiReply, HiPhone, HiLocationMarker
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

function VIPBadge() {
  return <span style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8, marginLeft:4, verticalAlign:'middle' }}>VIP</span>;
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
  const { t }    = useLang();
  const navigate = useNavigate();

  const isOwn     = !uid || uid === currentUser?.uid;
  const targetUid = uid  || currentUser?.uid;

  const [profile,        setProfile]     = useState(null);
  const [posts,          setPosts]       = useState([]);
  const [activeTab,      setActiveTab]   = useState('posts');
  const [editing,        setEditing]     = useState(false);
  const [editForm,       setEditForm]    = useState({ fullName:'', bio:'' });
  const [uploadingPhoto, setUploading]   = useState(false);
  const [openCmt,        setOpenCmt]     = useState({});
  const [cmtText,        setCmtText]     = useState({});
  const [cmtMedia,       setCmtMedia]    = useState({});
  const [showReact,      setShowReact]   = useState({});
  const [reactionModal,  setRM]          = useState(null);
  const [cmtReactionPicker, setCmtReactionPicker] = useState(null);
  const [editPost,       setEditPost]    = useState(null);
  const [editContent,    setEditContent] = useState('');
  const [postMenu,       setPostMenu]    = useState(null);
  const [editCmt,        setEditCmt]     = useState(null);
  const [replyTo,        setReplyTo]     = useState({});
  const [friendsData,    setFriendsData] = useState([]);
  const [loadingFriends, setLoadingF]    = useState(false);
  const [friendStatus,   setFriendStatus] = useState('none');

  const photoRef  = useRef();
  const cPhotoRef = useRef({});
  const cVideoRef = useRef({});

  useEffect(() => {
    const fn = () => setPostMenu(null);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  useEffect(() => {
    if (!targetUid) return;
    getDoc(doc(db,'users',targetUid)).then(s => {
      if (s.exists()) { setProfile(s.data()); setEditForm({ fullName:s.data().fullName, bio:s.data().bio||'' }); }
    });
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db,'posts'), where('uid','==',targetUid), orderBy('createdAt','desc'));
    return onSnapshot(q, snap => setPosts(snap.docs.map(d=>({id:d.id,...d.data()}))));
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
    } catch(err) { alert('Erreur upload'); }
    setUploading(false);
  }

  async function saveProfile() {
    if (!editForm.fullName.trim()) return;
    await updateDoc(doc(db,'users',currentUser.uid), { fullName:editForm.fullName, bio:editForm.bio });
    setProfile(p=>({...p,...editForm})); setUserProfile(p=>({...p,...editForm})); setEditing(false);
  }

  async function sendFriendRequest() {
    if (!currentUser||!targetUid) return;
    await addDoc(collection(db,'friendRequests'), { fromUid:currentUser.uid, toUid:targetUid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', status:'pending', createdAt:serverTimestamp() });
    await updateDoc(doc(db,'users',currentUser.uid), { sentRequests:arrayUnion(targetUid) });
    await addDoc(collection(db,'notifications'), { toUid:targetUid, fromUid:currentUser.uid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', type:'friendRequest', message:`${userProfile.fullName} vous a envoyé une demande d'ami`, read:false, createdAt:serverTimestamp() });
    setFriendStatus('requested');
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

  async function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { try { await navigator.share({title:'Tsengo',text:post.content,url}); } catch {} }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
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

  if (!profile) return <div style={{ padding:40, textAlign:'center', color:'#C4829F' }}>{t('loading')}</div>;
  const friendCount = profile.friends?.length||0;

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
            <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <p style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.fullName}{profile.isVip&&<VIPBadge/>}</p>
              <p style={{ fontSize:12, color:'#C4829F' }}>@{profile.username} · {post.createdAt?.toDate?new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR'):'Maintenant'}</p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {post.isSale && <div style={{ textAlign:'right' }}><span className="sale-badge">{t('sale')}</span><p className="price-tag" style={{ marginTop:2, fontSize:13 }}>{post.price} Ar</p></div>}
            <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
              <button onClick={() => setPostMenu(postMenu===post.id?null:post.id)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4, display:'flex', alignItems:'center' }}><HiDotsVertical size={18}/></button>
              {postMenu===post.id && (
                <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #FFE4F3', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:170, zIndex:50, overflow:'hidden' }}>
                  {isOwnPost && <>
                    <button onClick={() => { setEditPost(post); setEditContent(post.content); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiPencil size={15} color="#E91E8C"/> Modifier</button>
                    <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiLightningBolt size={15} color="#a855f7"/> Booster</button>
                    <button onClick={() => { deletePost(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:14, borderBottom:'1px solid #FFF0F8', fontFamily:'Poppins' }}><HiTrash size={15}/> Supprimer</button>
                  </>}
                  {post.mediaURL && <button onClick={() => { window.open(post.mediaURL,'_blank'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#2D1220', fontSize:14, fontFamily:'Poppins' }}><HiDownload size={15} color="#3b82f6"/> Télécharger</button>}
                  {!isOwnPost && !post.mediaURL && <div style={{ padding:'10px 16px', color:'#C4829F', fontSize:13 }}>Aucune action</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding:'10px 16px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
          {post.content && <p style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word' }}>{post.content}</p>}
          {post.isSale && (post.contact||post.lieu) && (
            <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:8 }}>
              {post.contact && <a href={`tel:${post.contact}`} onClick={e=>e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE4F3', borderRadius:20, padding:'5px 12px', color:'#E91E8C', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
              {post.lieu && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFF0F8', borderRadius:20, padding:'5px 12px', color:'#8B5A6F', fontSize:13 }}><HiLocationMarker size={13} color="#E91E8C"/>{post.lieu}</span>}
            </div>
          )}
          {post.mediaURL && (
            <div style={{ marginTop:8 }}>
              {post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:10, maxHeight:350, objectFit:'cover' }}/> : <div onClick={()=>navigate('/reels',{state:{startId:post.id}})} style={{ position:'relative', cursor:'pointer' }}><video src={post.mediaURL} style={{ width:'100%', borderRadius:10, maxHeight:350, objectFit:'cover' }} muted playsInline/><div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:50, height:50, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:20 }}>▶</span></div></div></div>}
            </div>
          )}
        </div>

        {total > 0 && (
          <div style={{ padding:'0 16px 8px', display:'flex', gap:4, flexWrap:'wrap', cursor:'pointer' }} onClick={() => openReactionModal(post)}>
            {Object.entries(rc).map(([e,c]) => <span key={e} style={{ background:'#FFE4F3', borderRadius:12, padding:'2px 8px', fontSize:12 }}>{e} {c}</span>)}
            <span style={{ fontSize:11, color:'#C4829F', alignSelf:'center' }}>· {total} {t('reactions')}</span>
          </div>
        )}

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

        {openCmt[post.id] && (
          <div style={{ padding:'0 16px 14px', borderTop:'1px solid #FFE4F3' }}>
            {post.comments?.map(c => (
              <div key={c.id} style={{ display:'flex', gap:8, marginTop:10 }}>
                <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
                <div style={{ flex:1, background:'#FFF8FC', borderRadius:12, padding:'8px 10px' }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}{' '}</span>
                  {c.text&&<span style={{ fontSize:13 }}>{c.text}</span>}
                  {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                  <div style={{ display:'flex', gap:10, marginTop:5, flexWrap:'wrap' }}>
                    <button onClick={() => setReplyTo(p=>({...p,[post.id]:c.authorName}))} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiReply size={12}/> Répondre</button>
                    <button onClick={() => setCmtReactionPicker(p => p===c.id?null:c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11 }}>{c.reactions?.[currentUser.uid] || '😊'} {Object.keys(c.reactions||{}).length||''}</button>
                    {cmtReactionPicker===c.id && <div style={{ display:'flex', gap:4, background:'white', borderRadius:20, padding:'4px 8px', boxShadow:'0 2px 12px rgba(0,0,0,.15)', zIndex:10 }}>{['❤️','😂','😮','😢','👍','🔥'].map(em=><span key={em} onClick={()=>reactToCmt(post.id,c.id,em)} style={{ fontSize:18, cursor:'pointer' }}>{em}</span>)}</div>}
                    {(c.uid===currentUser.uid||post.uid===currentUser.uid)&&<>
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
              <input className="input" placeholder={replyTo[post.id]?`Répondre à ${replyTo[post.id]}...`:t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} maxLength={500}/>
              <button onClick={() => cPhotoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiPhotograph size={18}/></button>
              <button onClick={() => cVideoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiVideoCamera size={18}/></button>
              <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ height:140, background:'linear-gradient(135deg,#E91E8C,#FF6BB5,#FFB3D9)', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-50, left:'50%', transform:'translateX(-50%)' }}>
          <div style={{ position:'relative' }}>
            <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=E91E8C&color=fff&size=100`} alt="" className="avatar avatar-ring" style={{ width:100, height:100, border:'4px solid white', objectFit:'cover' }}/>
            {isOwn&&<><button onClick={() => photoRef.current.click()} disabled={uploadingPhoto} style={{ position:'absolute', bottom:2, right:2, background:'#E91E8C', border:'2px solid white', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>{uploadingPhoto?'...':<HiCamera size={14}/>}</button><input ref={photoRef} type="file" accept="image/*" onChange={uploadProfilePhoto} style={{ display:'none' }}/></>}
          </div>
        </div>
      </div>

      <div style={{ paddingTop:60, textAlign:'center', padding:'60px 20px 16px' }}>
        {editing ? (
          <div style={{ maxWidth:300, margin:'0 auto' }}>
            <input className="input" value={editForm.fullName} onChange={e=>setEditForm(p=>({...p,fullName:e.target.value}))} style={{ marginBottom:10 }} placeholder={t('fullName')}/>
            <textarea className="input" value={editForm.bio} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} placeholder={t('bio')} rows={2} style={{ resize:'none', marginBottom:10 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveProfile} style={{ flex:1 }}>{t('save')}</button>
            </div>
            <div onClick={() => navigate('/vip')} style={{ marginTop:12, padding:'10px 16px', background:'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, border:'1px solid #fcd34d' }}>
              <HiStar size={18} color="#f59e0b"/>
              <div style={{ textAlign:'left' }}><p style={{ fontWeight:700, fontSize:13, color:'#92400e' }}>Compte VIP</p><p style={{ fontSize:11, color:'#a16207' }}>Cliquez pour en savoir plus</p></div>
              {profile.isVip&&<span style={{ marginLeft:'auto', background:'#E91E8C', color:'white', fontSize:10, padding:'2px 6px', borderRadius:6, fontWeight:700 }}>ACTIF</span>}
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight:700, fontSize:20 }}>{profile.fullName}{profile.isVip&&<VIPBadge/>}</h2>
            <p style={{ color:'#C4829F', fontSize:14 }}>@{profile.username}</p>
            {profile.bio&&<p style={{ marginTop:8, fontSize:14, color:'#8B5A6F', maxWidth:280, margin:'8px auto 0' }}>{profile.bio}</p>}
            <div style={{ display:'flex', justifyContent:'center', gap:28, marginTop:16 }}>
              {[
                { label:'Publications', value:regularPosts.length },
                { label:'Ventes', value:salePosts.length },
                { label:'Amis', value:friendCount, onClick:()=>setActiveTab('amis') },
              ].map(({label,value,onClick}) => (
                <div key={label} style={{ textAlign:'center', cursor:onClick?'pointer':'default' }} onClick={onClick}>
                  <p style={{ fontWeight:700, fontSize:20, color:'#E91E8C' }}>{value}</p>
                  <p style={{ fontSize:11, color:'#C4829F' }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:14 }}>
              {isOwn ? (
                <button onClick={() => setEditing(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#0a0a2e,#2d1b69)', border:'1px solid rgba(150,130,255,0.3)', borderRadius:20, padding:'8px 18px', color:'rgba(180,160,255,0.95)', fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:'0 2px 12px rgba(45,27,105,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}><HiPencil size={14}/>{t('editProfile')}</button>
              ) : (
                <>
                  <button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,targetUid)}`)} className="btn-primary" style={{ fontSize:13, padding:'8px 18px' }}><HiChat size={14} style={{ display:'inline', marginRight:4 }}/>Message</button>
                  {friendStatus==='none'&&<button onClick={sendFriendRequest} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#0a0a2e,#2d1b69)', border:'1px solid rgba(150,130,255,0.3)', borderRadius:20, padding:'8px 16px', color:'rgba(180,160,255,0.95)', fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:'0 2px 12px rgba(45,27,105,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}><HiUserAdd size={14}/>Ajouter</button>}
                  {friendStatus==='requested'&&<span style={{ display:'inline-flex', alignItems:'center', background:'#F3F4F6', borderRadius:20, padding:'8px 16px', color:'#9CA3AF', fontSize:13 }}>Demande envoyée</span>}
                  {friendStatus==='friend'&&<span style={{ display:'inline-flex', alignItems:'center', background:'#D1FAE5', borderRadius:20, padding:'8px 16px', color:'#065F46', fontSize:13 }}>✓ Ami</span>}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ display:'flex', borderTop:'1px solid #FFE4F3', borderBottom:'1px solid #FFE4F3', background:'white', overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ flexShrink:0, padding:'12px 16px', border:'none', background:'none', cursor:'pointer',
              fontWeight:activeTab===tab.key?700:400, color:activeTab===tab.key?'#E91E8C':'#C4829F',
              borderBottom:activeTab===tab.key?'2px solid #E91E8C':'2px solid transparent',
              fontSize:13, fontFamily:'Poppins' }}>
            {tab.label}
          </button>
        ))}
      </div>

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

      <div style={{ padding:12 }}>
        {activeTab==='photos'&&(photoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucune photo</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {photoPosts.map(p => <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} style={{ aspectRatio:'1', overflow:'hidden', borderRadius:8, cursor:'pointer' }}><img src={p.mediaURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/></div>)}
            </div>
        )}

        {activeTab==='videos'&&(videoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucune vidéo</div>
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
          loadingFriends ? <div style={{ textAlign:'center', padding:30, color:'#C4829F' }}>{t('loading')}</div>
          : friendsData.length===0 ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucun ami pour le moment</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {friendsData.map(f => (
                <div key={f.uid} onClick={() => navigate(`/profile/${f.uid}`)} className="card"
                  style={{ padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', textAlign:'center' }}>
                  <img src={f.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:60, height:60, borderRadius:'50%', objectFit:'cover', border:'2px solid #FFE4F3' }}/>
                  <div>
                    <p style={{ fontWeight:600, fontSize:13, color:'#2D1220' }}>{f.fullName}{f.isVip&&<span style={{ marginLeft:4, background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:8, fontWeight:700, padding:'1px 4px', borderRadius:5 }}>VIP</span>}</p>
                    <p style={{ fontSize:11, color:'#C4829F' }}>@{f.username}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();navigate(`/messages/${getChatId(currentUser.uid,f.uid)}`);}} style={{ background:'#FFE4F3', border:'none', borderRadius:16, padding:'5px 12px', color:'#E91E8C', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><HiChat size={12}/>Message</button>
                </div>
              ))}
            </div>
        )}

        {(activeTab==='posts'||activeTab==='sales')&&(
          getTabContent().length===0
            ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucun contenu</div>
            : getTabContent().map(post => renderPost(post))
        )}
      </div>
    </div>
  );
}
