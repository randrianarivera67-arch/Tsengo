// src/pages/PostDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, addDoc, serverTimestamp,
  arrayUnion, arrayRemove, collection, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { v4 as uuidv4 } from 'uuid';
import {
  HiArrowLeft, HiOutlineHeart, HiChat, HiShare,
  HiPhotograph, HiVideoCamera, HiTag, HiX, HiPhone,
  HiLocationMarker, HiPencil, HiTrash, HiReply, HiUserAdd
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];
function VIPBadge() {
  return <span style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:6, marginLeft:4 }}>VIP</span>;
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
    if (cmt.uid!==currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId), { comments:arrayRemove(cmt) });
  }

  async function saveEditCmt(oldCmt, newText) {
    if (!newText.trim()) return;
    const updated = post.comments.map(c => c.id===oldCmt.id?{...c,text:newText.trim()}:c);
    await updateDoc(doc(db,'posts',postId), { comments:updated });
    setEditCmt(null);
  }

  async function sharePost() {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({title:'Tsengo',url}); } catch {} }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
  }

  function isFriend(uid) { return (userProfile?.friends||[]).includes(uid); }

  if (!post) return <div style={{ padding:40, textAlign:'center', color:'#C4829F' }}>{t('loading')}</div>;

  const myR   = post.reactions?.[currentUser.uid];
  const total = Object.keys(post.reactions||{}).length;
  const rc    = {};
  Object.values(post.reactions||{}).forEach(e => { rc[e]=(rc[e]||0)+1; });

  return (
    <div style={{ padding:'16px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#E91E8C' }}><HiArrowLeft size={22}/></button>
        <h2 style={{ fontWeight:700, fontSize:18, color:'#E91E8C' }}>Publication</h2>
      </div>

      {/* Reaction modal */}
      {reactionModal&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:360, padding:20, maxHeight:'70vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ color:'#E91E8C' }}>Réactions</h3>
              <button onClick={() => setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid,emoji]) => {
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={() => { setRM(null); navigate(`/profile/${uid}`); }} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #FFE4F3', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=E91E8C&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
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
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${post.uid}`)}>
            <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>
            <div>
              <p style={{ fontWeight:700, fontSize:15 }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
              <p style={{ fontSize:12, color:'#C4829F' }}>@{post.authorUsername} · {post.createdAt?.toDate?new Date(post.createdAt.toDate()).toLocaleString('fr-FR'):''}</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {post.uid!==currentUser.uid&&<button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,post.uid)}`)} style={{ background:'#FFE4F3', border:'none', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#E91E8C', fontSize:12, fontWeight:600 }}>💬 Message</button>}
            {post.uid!==currentUser.uid&&!isFriend(post.uid)&&!(userProfile?.sentRequests||[]).includes(post.uid)&&(
              <button onClick={async()=>{
                await addDoc(collection(db,'friendRequests'),{fromUid:currentUser.uid,toUid:post.uid,fromName:userProfile.fullName,fromPhoto:userProfile.photoURL||'',status:'pending',createdAt:serverTimestamp()});
                alert('Demande envoyée !');
              }} style={{ background:'none', border:'1px solid #FFE4F3', borderRadius:20, padding:'6px 12px', cursor:'pointer', color:'#C4829F', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><HiUserAdd size={13}/> Ajouter</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:'12px 16px' }}>
          {post.isSale&&<div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}><span className="sale-badge"><HiTag size={12} style={{ display:'inline' }}/> Vente</span><span className="price-tag">{post.price} Ar</span></div>}
          {post.isSale&&(post.contact||post.lieu)&&(
            <div style={{ marginBottom:10, display:'flex', flexWrap:'wrap', gap:8 }}>
              {post.contact&&<a href={`tel:${post.contact}`} style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE4F3', borderRadius:20, padding:'5px 12px', color:'#E91E8C', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
              {post.lieu&&<span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFF0F8', borderRadius:20, padding:'5px 12px', color:'#8B5A6F', fontSize:13 }}><HiLocationMarker size={13} color="#E91E8C"/>{post.lieu}</span>}
            </div>
          )}
          {post.content&&<p style={{ fontSize:15, lineHeight:1.7, wordBreak:'break-word', marginBottom:10 }}>{post.content}</p>}
          {post.mediaURL&&<div className="post-media">{post.mediaType==='image'?<img src={post.mediaURL} alt=""/>:<video src={post.mediaURL} controls/>}</div>}
        </div>

        {/* Reaction count */}
        {total>0&&(
          <div style={{ padding:'0 16px 10px', cursor:'pointer', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }} onClick={openRM}>
            {Object.entries(rc).map(([e,c]) => <span key={e} style={{ background:'#FFE4F3', borderRadius:12, padding:'3px 10px', fontSize:13 }}>{e} {c}</span>)}
            <span style={{ fontSize:12, color:'#C4829F' }}>· {total} {t('reactions')} — voir qui</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ borderTop:'1px solid #FFE4F3', padding:'8px 16px', display:'flex', gap:4 }}>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowReact(p=>!p)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:myR?'#E91E8C':'#C4829F', fontSize:13, padding:'6px 12px', borderRadius:20, fontWeight:500 }}>
              {myR?<span style={{ fontSize:17 }}>{myR}</span>:<HiOutlineHeart size={19}/>}{total>0&&<span>{total}</span>}
            </button>
            {showReactions&&<div style={{ position:'absolute', bottom:'110%', left:0, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.15)', zIndex:10, border:'1px solid #FFE4F3' }}>
              {REACTIONS.map(e=><button key={e} onClick={() => reactToPost(e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22 }}>{e}</button>)}
            </div>}
          </div>
          <button style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:13, padding:'6px 12px', borderRadius:20 }}><HiChat size={19}/>{post.comments?.length||0}</button>
          <button onClick={sharePost} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:13, padding:'6px 12px', borderRadius:20 }}><HiShare size={19}/></button>
        </div>

        {/* Comments */}
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid #FFE4F3' }}>
          <p style={{ fontWeight:700, fontSize:14, marginTop:10, marginBottom:12 }}>Commentaires ({post.comments?.length||0})</p>

          {post.comments?.map(c => (
            <div key={c.id} style={{ display:'flex', gap:8, marginBottom:12 }}>
              <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
              <div style={{ background:'#FFF0F8', borderRadius:12, padding:'8px 12px', flex:1 }}>
                <p style={{ fontWeight:700, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}</p>
                {c.text&&<p style={{ fontSize:13, lineHeight:1.5, marginTop:2 }}>{c.text}</p>}
                {c.mediaURL&&<div style={{ marginTop:6 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                <p style={{ fontSize:10, color:'#C4829F', marginTop:4 }}>{c.createdAt?new Date(c.createdAt).toLocaleString('fr-FR'):''}</p>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button onClick={() => setReplyTo(c.authorName)} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiReply size={11}/> Répondre</button>
                  {c.uid===currentUser.uid&&<>
                    <button onClick={() => setEditCmt({cmt:c,text:c.text})} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiPencil size={11}/> Modifier</button>
                    <button onClick={() => deleteCmt(c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:11, display:'flex', alignItems:'center', gap:3 }}><HiTrash size={11}/> Supprimer</button>
                  </>}
                </div>
              </div>
            </div>
          ))}

          {replyTo&&(
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, background:'#FFF0F8', padding:'6px 10px', borderRadius:10 }}>
              <HiReply size={14} color="#E91E8C"/>
              <span style={{ fontSize:12, color:'#8B5A6F' }}>Répondre à <strong>{replyTo}</strong></span>
              <button onClick={() => setReplyTo(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#C4829F' }}><HiX size={14}/></button>
            </div>
          )}

          {commentMedia&&(
            <div style={{ position:'relative', marginBottom:8, display:'inline-block' }}>
              {commentMedia.type==='image'?<img src={commentMedia.preview} alt="" style={{ maxWidth:130, borderRadius:8 }}/>:<video src={commentMedia.preview} style={{ maxWidth:130, borderRadius:8 }}/>}
              <button onClick={() => setCmtMedia(null)} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10 }}>
            <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0 }}/>
            <input className="input" placeholder={replyTo?`Répondre à ${replyTo}...`:t('writeComment')} value={commentText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} style={{ flex:1, padding:'8px 12px', fontSize:13 }}/>
            <input ref={cPhotoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'image',preview:URL.createObjectURL(f)});}}/>
            <input ref={cVideoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia({file:f,type:'video',preview:URL.createObjectURL(f)});}}/>
            <button onClick={() => cPhotoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiPhotograph size={20}/></button>
            <button onClick={() => cVideoRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#C4829F', padding:4 }}><HiVideoCamera size={20}/></button>
            <button onClick={addComment} style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
