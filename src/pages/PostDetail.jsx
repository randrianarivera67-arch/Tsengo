// src/pages/PostDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, addDoc, serverTimestamp,
  arrayUnion, arrayRemove, collection, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { NeonPlaneWhite } from '../components/NeonIcons';
import MusicPostCard from '../components/MusicPostCard';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { downloadMedia } from '../utils/download';
import ShareModal from '../components/ShareModal';
import PhotoCarousel from '../components/PhotoCarousel';
import MediaViewer from '../components/MediaViewer';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { v4 as uuidv4 } from 'uuid';
import {
  HiArrowLeft, HiOutlineHeart, HiChat, HiShare, HiUserGroup, HiIdentification, HiShoppingBag,
  HiPhotograph, HiVideoCamera, HiTag, HiX, HiPhone, HiShoppingCart,
  HiLocationMarker, HiPencil, HiTrash, HiReply, HiUserAdd, HiDownload, HiPaperAirplane
} from 'react-icons/hi';
import { addToCart } from '../utils/cart';

const REACTIONS = ['❤️','😂','😮','😢','😡'];
function VIPBadge() {
  return <img src='/vip-badge.png' style={{ width:24, height:24, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>;
}

export default function PostDetail() {
  const { postId }  = useParams();
  const { currentUser, userProfile } = useAuth();
  const { t }       = useLang();
  const navigate    = useNavigate();

  const [post,          setPost]       = useState(null);
  const [showReactions, setShowReact]  = useState(false);
  const [reactionModal, setRM]         = useState(null);
  const [commentText,   setCmtText]    = useState('');
  const [commentMedia,  setCmtMedia]   = useState(null);
  const [editCmt,       setEditCmt]    = useState(null);
  const [replyTo,       setReplyTo]    = useState(null);
  const [cmtReactPicker, setCmtReactPicker] = useState(null);
  const [viewerState,   setViewerState] = useState(null); // { index }
  const cPhotoRef = useRef(); const cVideoRef = useRef();

  useEffect(() => {
    if (!postId) return;
    return onSnapshot(doc(db,'posts',postId), snap => { if (snap.exists()) setPost({id:snap.id,...snap.data()}); });
  }, [postId]);

  async function reactToPost(emoji) {
    const r = post.reactions||{}, my = r[currentUser.uid];
    if (my===emoji) { const u={...r}; delete u[currentUser.uid]; await updateDoc(doc(db,'posts',postId),{reactions:u}); }
    else {
      await updateDoc(doc(db,'posts',postId),{[`reactions.${currentUser.uid}`]:emoji});
      if (post.uid!==currentUser.uid) {
        await addDoc(collection(db,'notifications'), { toUid:post.uid, fromUid:currentUser.uid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', type:'reaction', postId, emoji, message:`${userProfile.fullName} a réagi ${emoji}`, read:false, createdAt:serverTimestamp() });
      }
    }
    setShowReact(false);
  }

  async function submitViewerComment(text) {
    const v = (text||'').trim();
    if (!v || !post) return;
    const cmt = { id:uuidv4(), uid:currentUser.uid, authorName:userProfile.fullName, authorPhoto:userProfile.photoURL||'', authorIsVip:userProfile.isVip||false, text:v.slice(0,500), mediaURL:'', mediaType:'', createdAt:new Date().toISOString() };
    await updateDoc(doc(db,'posts',postId), { comments:arrayUnion(cmt) });
    if (post.uid!==currentUser.uid) {
      await addDoc(collection(db,'notifications'), { toUid:post.uid, fromUid:currentUser.uid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', type:'comment', postId, message:`${userProfile.fullName} a commenté votre publication`, read:false, createdAt:serverTimestamp() });
    }
  }

  async function openRM() {
    const r = post.reactions||{}; if (!Object.keys(r).length) return;
    const ud = {};
    await Promise.all(Object.keys(r).map(async uid => {
      try { const s=await getDoc(doc(db,'users',uid)); ud[uid]=s.exists()?{name:s.data().fullName,photo:s.data().photoURL}:{name:uid,photo:''}; } catch { ud[uid]={name:uid,photo:''}; }
    }));
    setRM({reactions:r,userData:ud});
  }

  async function addComment() {
    const rt   = replyTo;
    const raw  = rt ? `@${rt} ${commentText}` : commentText;
    const text = raw.trim(); const media = commentMedia;
    if (!text&&!media) return;
    let mediaURL='', mT='';
    if (media) { try { const r=await uploadToTelegram(media.file); mediaURL=r.url; mT=r.type; } catch {} }
    const cmt = { id:uuidv4(), uid:currentUser.uid, authorName:userProfile.fullName, authorPhoto:userProfile.photoURL||'', authorIsVip:userProfile.isVip||false, text:text.slice(0,500), mediaURL, mediaType:mT, createdAt:new Date().toISOString() };
    await updateDoc(doc(db,'posts',postId), { comments:arrayUnion(cmt) });
    setCmtText(''); setCmtMedia(null); setReplyTo(null);
    if (post.uid!==currentUser.uid) {
      await addDoc(collection(db,'notifications'), { toUid:post.uid, fromUid:currentUser.uid, fromName:userProfile.fullName, fromPhoto:userProfile.photoURL||'', type:'comment', postId, message:`${userProfile.fullName} a commenté votre publication`, read:false, createdAt:serverTimestamp() });
    }
  }

  async function deleteCmt(cmt) {
    if (cmt.uid!==currentUser.uid && post.uid!==currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId), { comments:arrayRemove(cmt) });
  }

  async function saveEditCmt(oldCmt, newText) {
    if (oldCmt.uid !== currentUser.uid) return;
    if (!newText.trim()) return;
    const updated = post.comments.map(c => c.id===oldCmt.id?{...c,text:newText.trim()}:c);
    await updateDoc(doc(db,'posts',postId), { comments:updated });
    setEditCmt(null);
  }

  async function reactToCmt(cmtId, emoji) {
    const updated = post.comments.map(c => {
      if (c.id!==cmtId) return c;
      const reactions = c.reactions||{}, my = reactions[currentUser.uid];
      if (my===emoji) { const u={...reactions}; delete u[currentUser.uid]; return {...c,reactions:u}; }
      return {...c,reactions:{...reactions,[currentUser.uid]:emoji}};
    });
    await updateDoc(doc(db,'posts',postId),{comments:updated});
    setCmtReactPicker(null);
  }

  function sharePost() {
    setShareModalOpen(true);
  }

  function isFriend(uid) { return (userProfile?.friends||[]).includes(uid); }
  const [shareModalOpen, setShareModalOpen] = useState(false);

  if (!post) return <div style={{ padding:40, textAlign:'center', color:'#65676B' }}>{t('loading')}</div>;

  const myR   = post.reactions?.[currentUser.uid];
  const total = Object.keys(post.reactions||{}).length;
  const rc    = {};
  Object.values(post.reactions||{}).forEach(e => { rc[e]=(rc[e]||0)+1; });

  return (
    <div style={{ padding:'16px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1877F2' }}><HiArrowLeft size={22}/></button>
        <h2 style={{ fontWeight:700, fontSize:18, color:'#1877F2' }}>Publication</h2>
      </div>

      {/* Reaction modal */}
      {reactionModal&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:360, padding:20, maxHeight:'70vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ color:'#1877F2' }}>Réactions</h3>
              <button onClick={() => setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid,emoji]) => {
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={() => { setRM(null); navigate(`/profile/${uid}`); }} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #E4E6EB', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                  <p style={{ fontSize:14, fontWeight:600, flex:1 }}>{uid===currentUser.uid?'Vous':(info.name||uid)}</p>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit comment modal */}
      {editCmt&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier le commentaire</h3>
            <textarea className="input" rows={3} value={editCmt.text} onChange={e=>setEditCmt(p=>({...p,text:e.target.value}))} style={{ resize:'none' }}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditCmt(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={() => saveEditCmt(editCmt.cmt,editCmt.text)} style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card post-card">
        {/* Header */}
        <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {post.groupName ? (
            <div onClick={() => navigate(`/groups/${post.groupId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'linear-gradient(145deg,#1B84FF,#1877F2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                {post.groupPhoto ? <img src={post.groupPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <HiUserGroup size={20} color="white"/>}
              </div>
              <div><p style={{ fontWeight:700, fontSize:15 }}>{post.groupName}</p><p style={{ fontSize:12, color:'#65676B' }}>Groupe · {post.createdAt?timeAgo(post.createdAt):''}</p></div>
            </div>
          ) : post.pageId ? (
            <div onClick={() => navigate(`/pages/${post.pageId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'linear-gradient(145deg,#63A9FF,#1877F2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                {post.pagePhoto ? <img src={post.pagePhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <HiIdentification size={20} color="white"/>}
              </div>
              <div><p style={{ fontWeight:700, fontSize:15 }}>{post.pageName}</p><p style={{ fontSize:12, color:'#65676B' }}>Sera · {post.createdAt?timeAgo(post.createdAt):''}</p></div>
            </div>
          ) : post.artistId ? (
            <div onClick={() => navigate(`/artists/${post.artistId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                {post.artistPhoto ? <img src={post.artistPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ color:'white' }}>🎤</span>}
              </div>
              <div><p style={{ fontWeight:700, fontSize:15 }}>{post.artistName} 🎤</p><p style={{ fontSize:12, color:'#65676B' }}>{post.genre} · {post.createdAt?timeAgo(post.createdAt):''}</p></div>
            </div>
          ) : post.shopId ? (
            <div onClick={() => navigate(`/shop/${post.shopId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                {post.shopPhoto ? <img src={post.shopPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <HiShoppingBag size={20} color="white"/>}
              </div>
              <div><p style={{ fontWeight:700, fontSize:15 }}>{post.shopName} 🏪</p><p style={{ fontSize:12, color:'#65676B' }}>Boutique · {post.createdAt?timeAgo(post.createdAt):''}</p></div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${post.uid}`)}>
              <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>
              <div>
                <p style={{ fontWeight:700, fontSize:15 }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
                <p style={{ fontSize:12, color:'#65676B' }}>@{post.authorUsername} · {post.createdAt?timeAgo(post.createdAt):''}</p>
              </div>
            </div>
          )}
          {!post.groupName && !post.pageId && !post.artistId && !post.shopId && (
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              {post.uid!==currentUser.uid&&<button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,post.uid)}`)} style={{ background:'#E4E6EB', border:'none', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#1877F2', fontSize:12, fontWeight:600 }}><HiPaperAirplane size={13} style={{ transform:'rotate(90deg)', display:'inline', marginRight:4 }}/>Message</button>}
              {post.uid!==currentUser.uid&&!isFriend(post.uid)&&!(userProfile?.sentRequests||[]).includes(post.uid)&&(
                <button onClick={async()=>{
                  await addDoc(collection(db,'friendRequests'),{fromUid:currentUser.uid,toUid:post.uid,fromName:userProfile.fullName,fromPhoto:userProfile.photoURL||'',status:'pending',createdAt:serverTimestamp()});
                  alert('Demande envoyée !');
                }} style={{ background:'none', border:'1px solid #E4E6EB', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#65676B', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><HiUserAdd size={13}/> Ajouter</button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {post.shopId && post.isSale ? (
          // ── Article boutique (sary 3) : sary lehibe ambony, informations ambany ──
          <>
            {post.mediaURL && (
              <div className="post-media" style={{ position:'relative' }}>
                <img src={post.mediaURL} alt="" onClick={() => setViewerState({ index: 0 })} style={{ cursor:'zoom-in' }}/>
                <button onClick={() => downloadMedia(post.mediaURL, 'image')}
                  style={{ position:'absolute', top:8, right:8, width:34, height:34, borderRadius:'50%', background:'rgba(0,0,0,.5)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <HiDownload size={16}/>
                </button>
              </div>
            )}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <span style={{ fontWeight:800, fontSize:22, color:'#FF2D8D' }}>{post.price ? `${Number(post.price).toLocaleString()} Ar` : 'À discuter'}</span>
                <button onClick={() => navigate(`/shop/${post.shopId}/messages`)}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'#fff', border:'1.5px solid #FF2D8D', borderRadius:20, padding:'8px 18px', fontSize:13.5, fontWeight:700, color:'#FF2D8D', cursor:'pointer', flexShrink:0 }}>
                  <NeonPlaneWhite size={16}/> Message
                </button>
              </div>
              {Number(post.oldPrice) > Number(post.price) && (
                <p style={{ fontSize:13, color:'#8A8D91', textDecoration:'line-through', marginTop:2 }}>{Number(post.oldPrice).toLocaleString()} Ar</p>
              )}
              {(post.lieu || post.contact) && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                  {post.lieu && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#F0F2F5', borderRadius:20, padding:'5px 12px', color:'#65676B', fontSize:13 }}><HiLocationMarker size={13} color="#1877F2"/>{post.lieu}</span>}
                  {post.contact && <a href={`tel:${String(post.contact).split(/[\/,;|]/)[0].trim()}`} style={{ display:'flex', alignItems:'center', gap:5, background:'#E4E6EB', borderRadius:20, padding:'5px 12px', color:'#1877F2', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
                  {post.saleCategory && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE3EF', borderRadius:20, padding:'5px 12px', color:'#FF2D8D', fontSize:13, fontWeight:600 }}><HiTag size={12}/>{post.saleCategory}</span>}
                </div>
              )}
              {post.content && <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginTop:12 }}>{post.content}</p>}
              <button onClick={() => { const ok = addToCart(post); alert(ok ? 'Article ajouté au panier 🛒' : 'Cet article est déjà dans votre panier'); }}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'none', borderRadius:22, padding:'12px 0', marginTop:14, fontSize:15, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'Poppins' }}>
                <HiShoppingCart size={18}/> Ajouter au panier
              </button>
            </div>
          </>
        ) : (
        <div style={{ padding:'12px 16px' }}>
          {post.isSale&&<div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}><span className="sale-badge"><HiTag size={12} style={{ display:'inline' }}/> Vente</span><span className="price-tag">{post.price} Ar</span></div>}
          {post.isSale&&(post.contact||post.lieu)&&(
            <div style={{ marginBottom:10, display:'flex', flexWrap:'wrap', gap:8 }}>
              {post.contact&&<a href={`tel:${post.contact}`} style={{ display:'flex', alignItems:'center', gap:5, background:'#E4E6EB', borderRadius:20, padding:'5px 12px', color:'#1877F2', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
              {post.lieu&&<span style={{ display:'flex', alignItems:'center', gap:5, background:'#F0F2F5', borderRadius:20, padding:'5px 12px', color:'#65676B', fontSize:13 }}><HiLocationMarker size={13} color="#1877F2"/>{post.lieu}</span>}
            </div>
          )}
          {post.content&&(post.textBg ? <p style={{ background: post.textBg, minHeight:180, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff', fontSize:24, fontWeight:800, padding:'24px 18px', lineHeight:1.4, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0, borderRadius:8 }}>{post.content}</p> : <p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}>{post.content}</p>)}
          {post.sharedFrom && (
            <div onClick={() => navigate(`/post/${post.sharedFrom.id}`)}
              style={{ marginBottom:10, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
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
          {post.mediaURLs?.length > 1 ? (
            <div className="post-media">
              <PhotoCarousel urls={post.mediaURLs} onOpen={(u) => setViewerState({ index: Math.max(0, post.mediaURLs.indexOf(u)) })} />
            </div>
          ) : post.mediaURL&&(
            <div className="post-media" style={{ position:'relative' }}>
              {post.isMusic
                ? <MusicPostCard post={post} height={150}/>
                : post.mediaType==='image'
                  ? <img src={post.mediaURL} alt="" onClick={() => setViewerState({ index: 0 })} style={{ cursor:'zoom-in' }}/>
                  : <video src={post.mediaURL} poster={post.thumbURL || undefined} controls/>}
              <button onClick={() => downloadMedia(post.mediaURL, post.mediaType)}
                style={{ position:'absolute', top:8, right:8, width:34, height:34, borderRadius:'50%', background:'rgba(0,0,0,.5)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <HiDownload size={16}/>
              </button>
            </div>
          )}
        </div>
        )}

        {/* Reaction count */}
        {total>0&&(
          <div style={{ padding:'0 16px 10px', cursor:'pointer', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }} onClick={openRM}>
            {Object.entries(rc).map(([e,c]) => <span key={e} style={{ background:'#E4E6EB', borderRadius:12, padding:'3px 10px', fontSize:13 }}>{e} {c}</span>)}
            <span style={{ fontSize:12, color:'#65676B' }}>· {total} {t('reactions')} — voir qui</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ borderTop:'1px solid #E4E6EB', padding:'8px 16px', display:'flex', gap:4 }}>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowReact(p=>!p)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:myR?'#1877F2':'#65676B', fontSize:13, padding:'6px 12px', borderRadius:20, fontWeight:500 }}>
              {myR?<span style={{ fontSize:17 }}>{myR}</span>:<HiOutlineHeart size={19}/>}{total>0&&<span>{total}</span>}
            </button>
            {showReactions&&<div style={{ position:'absolute', bottom:'110%', left:0, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.15)', zIndex:10, border:'1px solid #E4E6EB' }}>
              {REACTIONS.map(e=><button key={e} onClick={() => reactToPost(e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22 }}>{e}</button>)}
            </div>}
          </div>
          <button style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#1877F2', fontSize:13, padding:'6px 12px', borderRadius:20 }}><HiChat size={19}/>{post.comments?.length||0}</button>
          <button onClick={sharePost} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#65676B', fontSize:13, padding:'6px 12px', borderRadius:20 }}><HiShare size={19}/></button>
        </div>

        {/* Comments */}
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid #E4E6EB' }}>
          <p style={{ fontWeight:700, fontSize:14, marginTop:10, marginBottom:12 }}>Commentaires ({post.comments?.length||0})</p>

          {post.comments?.map(c => (
            <div key={c.id} style={{ display:'flex', gap:8, marginBottom:12 }}>
              <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
              <div style={{ background:'#F0F2F5', borderRadius:12, padding:'8px 12px', flex:1 }}>
                <p style={{ fontWeight:700, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}</p>
                {c.text&&<p style={{ fontSize:13, lineHeight:1.5, marginTop:2 }}>{c.text}</p>}
                {c.mediaURL&&<div style={{ marginTop:6 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                <p style={{ fontSize:10, color:'#65676B', marginTop:4 }}>{c.createdAt?timeAgo(c.createdAt):''}</p>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button onClick={() => setReplyTo(c.authorName)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiReply size={11}/> Répondre</button><button onClick={() => setCmtReactPicker(p=>p===c.id?null:c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', fontSize:11 }}>{c.reactions?.[currentUser.uid]||'😊'} {Object.keys(c.reactions||{}).length||''}</button>{cmtReactPicker===c.id&&<div style={{ display:'flex', gap:4, background:'white', borderRadius:20, padding:'4px 8px', boxShadow:'0 2px 12px rgba(0,0,0,.15)' }}>{['❤️','😂','😮','😢','👍','🔥'].map(em=><span key={em} onClick={()=>reactToCmt(c.id,em)} style={{ fontSize:18, cursor:'pointer' }}>{em}</span>)}</div>}
                  {c.uid===currentUser.uid && (
                    <button onClick={() => setEditCmt({cmt:c,text:c.text})} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiPencil size={11}/> Modifier</button>
                  )}
                  {(c.uid===currentUser.uid||post.uid===currentUser.uid) && (
                    <button onClick={() => deleteCmt(c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#FF2D8D', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiTrash size={11}/> Supprimer</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {replyTo&&(
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, background:'#F0F2F5', padding:'6px 10px', borderRadius:10 }}>
              <HiReply size={14} color="#1877F2"/>
              <span style={{ fontSize:12, color:'#65676B' }}>Répondre à <strong>{replyTo}</strong></span>
              <button onClick={() => setReplyTo(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={14}/></button>
            </div>
          )}

          {commentMedia&&(
            <div style={{ position:'relative', marginBottom:8, display:'inline-block' }}>
              {commentMedia.type==='image'?<img src={commentMedia.preview} alt="" style={{ maxWidth:130, borderRadius:8 }}/>:<video src={commentMedia.preview} style={{ maxWidth:130, borderRadius:8 }}/>}
              <button onClick={() => setCmtMedia(null)} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10 }}>
            <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0 }}/>
            <input className="input" placeholder={replyTo?`Répondre à ${replyTo}...`:t('writeComment')} value={commentText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} style={{ flex:1, padding:'8px 12px', fontSize:13 }}/>
            <input ref={cPhotoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'image',preview:URL.createObjectURL(f)});}}/>
            <input ref={cVideoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'video',preview:URL.createObjectURL(f)});}}/>
            <button onClick={() => cPhotoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiPhotograph size={20}/></button>
            <button onClick={() => cVideoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiVideoCamera size={20}/></button>
            <button onClick={addComment} style={{ background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
          </div>
        </div>
      </div>

      {viewerState && post && (
        <MediaViewer
          post={post}
          startIndex={viewerState.index}
          onClose={() => setViewerState(null)}
          currentUser={currentUser}
          userProfile={userProfile}
          navigate={navigate}
          myR={post.reactions?.[currentUser.uid]}
          rc={(() => { const c={}; Object.values(post.reactions||{}).forEach(e=>{c[e]=(c[e]||0)+1;}); return c; })()}
          total={Object.keys(post.reactions||{}).length}
          onReact={reactToPost}
          onOpenReactionModal={openRM}
          onDownload={(url) => downloadMedia(url, post.mediaType || 'image')}
          onShare={sharePost}
          onSubmitComment={submitViewerComment}
          onReactCmt={reactToCmt}
          onDeleteCmt={deleteCmt}
          VIPBadge={VIPBadge}
        />
      )}
      {shareModalOpen && <ShareModal post={post} onClose={() => setShareModalOpen(false)} />}
    </div>
  );
}
