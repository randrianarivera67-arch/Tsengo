// src/pages/Reels.jsx — TikTok style vertical scroll
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { sendPushNotification } from '../utils/onesignal';
import { v4 as uuidv4 } from 'uuid';
import {
  HiHeart, HiOutlineHeart, HiChat, HiShare, HiArrowLeft,
  HiDownload, HiSpeakerphone, HiDotsVertical, HiTrash,
  HiPencil, HiReply, HiPhotograph, HiVideoCamera, HiX
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

function VIPBadge() {
  return <span style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8, marginLeft:4 }}>VIP</span>;
}

export default function Reels() {
  const { currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [posts,             setPosts]           = useState([]);
  const [activeIndex,       setActiveIndex]     = useState(0);
  const [showReactions,     setShowReactions]   = useState({});
  const [openComments,      setOpenComments]    = useState(false);
  const [commentText,       setCommentText]     = useState('');
  const [commentMedia,      setCommentMedia]    = useState(null);
  const [replyTo,           setReplyTo]         = useState(null);
  const [editCmt,           setEditCmt]         = useState(null);
  const [cmtReactPicker,    setCmtReactPicker]  = useState(null);
  const [postMenu,          setPostMenu]        = useState(false);
  const [reactionModal,     setRM]              = useState(null);

  const videoRefs  = useRef({});
  const containerRef = useRef();
  const cPhotoRef  = useRef();
  const cVideoRef  = useRef();

  useEffect(() => {
    const q = query(collection(db,'posts'), orderBy('createdAt','desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.mediaType==='video'&&p.mediaURL);
      setPosts(all);
      if (location.state?.startId) {
        const idx = all.findIndex(p=>p.id===location.state.startId);
        if (idx>=0) setActiveIndex(idx);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx,video]) => {
      if (!video) return;
      if (parseInt(idx)===activeIndex) { video.play().catch(()=>{}); }
      else { video.pause(); video.currentTime=0; }
    });
  }, [activeIndex, posts.length]);

  useEffect(() => {
    const fn = () => setPostMenu(false);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      setOpenComments(false);
      setShowReactions({});
      setPostMenu(false);
    }
  }, [activeIndex]);

  async function reactToPost(postId, emoji) {
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const reactions = post.reactions||{}, my = reactions[currentUser.uid];
    if (my===emoji) {
      const u={...reactions}; delete u[currentUser.uid];
      await updateDoc(doc(db,'posts',postId),{reactions:u});
    } else {
      await updateDoc(doc(db,'posts',postId),{[`reactions.${currentUser.uid}`]:emoji});
      if (post.uid!==currentUser.uid) {
        await addDoc(collection(db,'notifications'),{
          toUid:post.uid, fromUid:currentUser.uid,
          fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'',
          type:'reaction', postId, emoji,
          message:`${userProfile.fullName} a réagi ${emoji} à votre reel`,
          read:false, createdAt:serverTimestamp(),
        });
        sendPushNotification({toExternalId:post.uid, title:userProfile.fullName, message:`a réagi ${emoji}`, data:{type:'reaction',postId}});
      }
    }
    setShowReactions({});
  }

  async function openReactionModal(post) {
    const reactions = post.reactions||{};
    if (!Object.keys(reactions).length) return;
    const userData = {};
    await Promise.all(Object.keys(reactions).map(async uid => {
      try {
        const s = await getDoc(doc(db,'users',uid));
        userData[uid] = s.exists()?{name:s.data().fullName,photo:s.data().photoURL}:{name:uid,photo:''};
      } catch { userData[uid]={name:uid,photo:''}; }
    }));
    setRM({reactions,userData});
  }

  async function reactToCmt(postId, cmtId, emoji) {
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const updated = post.comments.map(c => {
      if (c.id!==cmtId) return c;
      const reactions = c.reactions||{}, my = reactions[currentUser.uid];
      if (my===emoji) { const u={...reactions}; delete u[currentUser.uid]; return {...c,reactions:u}; }
      return {...c,reactions:{...reactions,[currentUser.uid]:emoji}};
    });
    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setCmtReactPicker(null);
  }

  async function addComment(postId) {
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const rt = replyTo;
    const raw = rt?`@${rt} ${commentText}`:commentText;
    const text = raw.trim(); const media = commentMedia;
    if (!text&&!media) return;
    let mediaURL='', cMT='';
    if (media) { try { const r=await uploadToTelegram(media.file); mediaURL=r.url; cMT=r.type; } catch {} }
    const cmt = {
      id:uuidv4(), uid:currentUser.uid,
      authorName:userProfile.fullName, authorPhoto:userProfile.photoURL||'',
      authorIsVip:userProfile.isVip||false,
      text:text.slice(0,500), mediaURL, mediaType:cMT,
      createdAt:new Date().toISOString(),
    };
    await updateDoc(doc(db,'posts',postId),{comments:arrayUnion(cmt)});
    setCommentText(''); setCommentMedia(null); setReplyTo(null);
    if (post.uid!==currentUser.uid) {
      await addDoc(collection(db,'notifications'),{
        toUid:post.uid, fromUid:currentUser.uid,
        fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'',
        type:'comment', postId,
        message:`${userProfile.fullName} a commenté votre reel`,
        read:false, createdAt:serverTimestamp(),
      });
      sendPushNotification({toExternalId:post.uid, title:userProfile.fullName, message:text?`a commenté : "${text.slice(0,50)}"`:' a commenté', data:{type:'comment',postId}});
    }
  }

  async function deleteCmt(postId, cmt) {
    if (cmt.uid!==currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId),{comments:arrayRemove(cmt)});
  }

  async function saveEditCmt(postId, oldCmt, newText) {
    if (!newText.trim()) return;
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const updated = post.comments.map(c=>c.id===oldCmt.id?{...c,text:newText.trim()}:c);
    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setEditCmt(null);
  }

  async function deletePost(postId) {
    const post = posts.find(p=>p.id===postId);
    if (!post||post.uid!==currentUser.uid) return;
    if (!window.confirm('Supprimer ce reel ?')) return;
    await deleteDoc(doc(db,'posts',postId));
  }

  async function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { try { await navigator.share({title:'Tsengo Reel',text:post.content,url}); } catch {} }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
  }

  function countReactions(r={}) {
    const c={}; Object.values(r).forEach(e=>{c[e]=(c[e]||0)+1;}); return c;
  }

  if (posts.length===0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'calc(100vh - 130px)', color:'#C4829F', gap:16 }}>
        <span style={{ fontSize:48 }}>🎬</span>
        <p style={{ fontSize:15 }}>Tsy misy reels mbola</p>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ fontSize:13 }}>Miverina</button>
      </div>
    );
  }

  const activePost = posts[activeIndex];

  return (
    <div style={{ position:'relative', height:'calc(100vh - 130px)', overflow:'hidden', background:'#000' }}>
      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{ position:'absolute', top:14, left:14, zIndex:50, background:'rgba(0,0,0,0.4)', border:'none', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' }}>
        <HiArrowLeft size={20}/>
      </button>

      {/* Video feed */}
      <div ref={containerRef} onScroll={handleScroll} style={{ height:'100%', overflowY:'scroll', scrollSnapType:'y mandatory', scrollbarWidth:'none' }}>
        {posts.map((post, idx) => {
          const myR = post.reactions?.[currentUser.uid];
          const total = Object.keys(post.reactions||{}).length;
          const isOwn = post.uid===currentUser.uid;
          return (
            <div key={post.id} style={{ height:'100%', scrollSnapAlign:'start', position:'relative', flexShrink:0 }}>
              <video
                ref={el=>videoRefs.current[idx]=el}
                src={post.mediaURL} loop playsInline
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onClick={() => { const v=videoRefs.current[idx]; if(v) v.paused?v.play():v.pause(); }}
              />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', pointerEvents:'none' }}/>

              {/* Author info */}
              <div style={{ position:'absolute', bottom:80, left:14, right:80 }}>
                <div onClick={() => navigate(`/profile/${post.uid}`)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:8 }}>
                  <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', border:'2px solid white', flexShrink:0 }}/>
                  <p style={{ color:'white', fontWeight:700, fontSize:14 }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
                </div>
                {post.content&&<p style={{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{post.content}</p>}
              </div>

              {/* Right actions */}
              <div style={{ position:'absolute', right:14, bottom:80, display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
                {/* Reactions */}
                <div style={{ position:'relative' }}>
                  {idx===activeIndex&&showReactions[idx]&&(
                    <div style={{ position:'absolute', right:50, bottom:0, background:'rgba(0,0,0,0.7)', borderRadius:30, padding:'8px 10px', display:'flex', gap:8 }}>
                      {REACTIONS.map(emoji=><button key={emoji} onClick={()=>reactToPost(post.id,emoji)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24 }}>{emoji}</button>)}
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <button onClick={()=>idx===activeIndex&&setShowReactions(p=>({...p,[idx]:!p[idx]}))} style={{ background:'none', border:'none', cursor:'pointer', color:myR?'#FF6BB5':'white' }}>
                      {myR?<HiHeart size={28} color="#FF6BB5"/>:<HiOutlineHeart size={28}/>}
                    </button>
                    <span onClick={()=>idx===activeIndex&&openReactionModal(post)} style={{ color:'white', fontSize:12, cursor:'pointer' }}>{total}</span>
                  </div>
                </div>

                {/* Comment */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <button onClick={()=>idx===activeIndex&&setOpenComments(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}>
                    <HiChat size={28}/>
                  </button>
                  <span style={{ color:'white', fontSize:12 }}>{post.comments?.length||0}</span>
                </div>

                {/* Share */}
                <button onClick={()=>sharePost(post)} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}>
                  <HiShare size={26}/>
                </button>

                {/* Download */}
                <button onClick={()=>window.open(post.mediaURL,'_blank')} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}>
                  <HiDownload size={26}/>
                </button>

                {/* Boost */}
                <button onClick={()=>navigate('/boost')} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}>
                  <HiSpeakerphone size={24}/>
                </button>

                {/* Menu 3 points — anao ihany */}
                {isOwn&&(
                  <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>idx===activeIndex&&setPostMenu(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'white' }}>
                      <HiDotsVertical size={24}/>
                    </button>
                    {idx===activeIndex&&postMenu&&(
                      <div style={{ position:'absolute', right:40, bottom:0, background:'rgba(0,0,0,0.85)', borderRadius:12, minWidth:150, overflow:'hidden', border:'1px solid #4A2535' }}>
                        <button onClick={()=>{deletePost(post.id);setPostMenu(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#FF6BB5', fontSize:14, fontFamily:'Poppins' }}>
                          <HiTrash size={15}/> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments panel */}
      {openComments&&activePost&&(
        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.92)', borderRadius:'20px 20px 0 0', padding:'16px 16px 20px', maxHeight:'65%', display:'flex', flexDirection:'column', zIndex:100 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ color:'white', fontWeight:700 }}>Commentaires ({activePost.comments?.length||0})</p>
            <button onClick={()=>setOpenComments(false)} style={{ background:'none', border:'none', color:'#C4829F', cursor:'pointer' }}><HiX size={20}/></button>
          </div>
          <div style={{ flex:1, overflowY:'auto', marginBottom:10 }}>
            {activePost.comments?.map(c=>(
              <div key={c.id} style={{ display:'flex', gap:8, marginBottom:12 }}>
                <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, cursor:'pointer' }} onClick={()=>navigate(`/profile/${c.uid}`)}/>
                <div style={{ flex:1 }}>
                  <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'8px 10px' }}>
                    <span style={{ color:'#FF6BB5', fontWeight:700, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}{' '}</span>
                    {c.text&&<span style={{ color:'white', fontSize:13 }}>{c.text}</span>}
                    {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:180, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:180, borderRadius:8 }}/>}</div>}
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                    <button onClick={()=>setReplyTo(c.authorName)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiReply size={12}/> Répondre</button>
                    <button onClick={()=>setCmtReactPicker(p=>p===c.id?null:c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11 }}>{c.reactions?.[currentUser.uid]||'😊'} {Object.keys(c.reactions||{}).length||''}</button>
                    {cmtReactPicker===c.id&&<div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.8)', borderRadius:20, padding:'4px 8px' }}>{['❤️','😂','😮','😢','👍','🔥'].map(em=><span key={em} onClick={()=>reactToCmt(activePost.id,c.id,em)} style={{ fontSize:18, cursor:'pointer' }}>{em}</span>)}</div>}
                    {c.uid===currentUser.uid&&<>
                      <button onClick={()=>setEditCmt({cmt:c,text:c.text})} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiPencil size={12}/> Modifier</button>
                      <button onClick={()=>deleteCmt(activePost.id,c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#FF6BB5', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiTrash size={12}/> Supprimer</button>
                    </>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {replyTo&&(
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, background:'rgba(255,255,255,0.1)', padding:'6px 10px', borderRadius:10 }}>
              <HiReply size={14} color="#FF6BB5"/>
              <span style={{ fontSize:12, color:'#C4829F' }}>Répondre à <strong style={{ color:'white' }}>{replyTo}</strong></span>
              <button onClick={()=>setReplyTo(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={14}/></button>
            </div>
          )}

          {commentMedia&&(
            <div style={{ position:'relative', marginBottom:8, display:'inline-block' }}>
              {commentMedia.type==='image'?<img src={commentMedia.preview} alt="" style={{ maxWidth:120, borderRadius:8 }}/>:<video src={commentMedia.preview} style={{ maxWidth:120, borderRadius:8 }}/>}
              <button onClick={()=>setCommentMedia(null)} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,0.6)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10 }}>✕</button>
            </div>
          )}

          <input ref={cPhotoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCommentMedia({file:f,type:'image',preview:URL.createObjectURL(f)});}}/>
          <input ref={cVideoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCommentMedia({file:f,type:'video',preview:URL.createObjectURL(f)});}}/>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={()=>cPhotoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiPhotograph size={20}/></button>
            <button onClick={()=>cVideoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiVideoCamera size={20}/></button>
            <input
              placeholder={replyTo?`Répondre à ${replyTo}...`:"Écrire un commentaire..."}
              value={commentText} onChange={e=>setCommentText(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addComment(activePost.id)}
              style={{ flex:1, background:'#2D1220', border:'1px solid #4A2535', borderRadius:25, padding:'9px 14px', color:'white', fontFamily:'Poppins', fontSize:13 }}
            />
            <button onClick={()=>addComment(activePost.id)} style={{ background:'#E91E8C', border:'none', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <span style={{ color:'white', fontSize:16 }}>➤</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit comment modal */}
      {editCmt&&(
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#1A0A12', borderRadius:16, padding:20, width:'100%', maxWidth:360, border:'1px solid #4A2535' }}>
            <h3 style={{ color:'white', marginBottom:12 }}>Modifier le commentaire</h3>
            <textarea value={editCmt.text} onChange={e=>setEditCmt(p=>({...p,text:e.target.value}))} rows={3} style={{ width:'100%', background:'#2D1220', border:'1px solid #4A2535', borderRadius:10, padding:'8px 12px', color:'white', fontFamily:'Poppins', fontSize:13, resize:'none' }} maxLength={500}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button onClick={()=>setEditCmt(null)} style={{ flex:1, background:'#2D1220', border:'1px solid #4A2535', borderRadius:20, padding:'9px', color:'#C4829F', cursor:'pointer', fontFamily:'Poppins' }}>Annuler</button>
              <button onClick={()=>saveEditCmt(activePost.id,editCmt.cmt,editCmt.text)} style={{ flex:1, background:'#E91E8C', border:'none', borderRadius:20, padding:'9px', color:'white', cursor:'pointer', fontFamily:'Poppins', fontWeight:600 }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction modal */}
      {reactionModal&&(
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#1A0A12', borderRadius:16, padding:20, width:'100%', maxWidth:360, maxHeight:'70vh', overflowY:'auto', border:'1px solid #4A2535' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ color:'white', fontWeight:700 }}>Réactions</h3>
              <button onClick={()=>setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid,emoji])=>{
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={()=>{setRM(null);navigate(`/profile/${uid}`);}} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #4A2535', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                  <p style={{ fontSize:14, fontWeight:600, flex:1, color:'white' }}>{uid===currentUser.uid?'Vous':(info.name||uid)}</p>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
