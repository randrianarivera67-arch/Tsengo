// src/pages/PageDetail.jsx — Page Sera (format Facebook Page)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { timeAgo } from '../utils/timeAgo';
import { NeonGlobe, NeonPhone, NeonLocation } from '../components/NeonIcons';
import FollowListModal from '../components/FollowListModal';
import {
  HiIdentification, HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash,
  HiPhotograph, HiVideoCamera, HiChat, HiShare, HiDotsVertical
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

export default function PageDetail() {
  const { pageId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [pg, setPg] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [posting, setPosting] = useState(false);
  const [pgAllowMessages, setPgAllowMessages] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', description:'', website:'', phone:'', location:'', team:'', hobbies:'' });
  const [showReact, setShowReact] = useState({});
  const [followersOpen, setFollowersOpen] = useState(false);

  const coverRef = useRef(); const photoRef = useRef();
  const postPhotoRef = useRef(); const postVideoRef = useRef();

  const isAdmin = !!pg?.admins?.includes(currentUser?.uid);
  const isFollowing = !!pg?.followers?.includes(currentUser?.uid);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'pages', pageId), snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      setPg({ id: snap.id, ...snap.data() });
    }, err => console.error('Page:', err?.message || err));
    return () => unsub();
  }, [pageId]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('pageId', '==', pageId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setPosts(list);
    }, err => console.error('Page posts:', err?.message || err));
    return () => unsub();
  }, [pageId]);

  useEffect(() => { const fn = () => setMenuOpen(false); document.addEventListener('click', fn); return () => document.removeEventListener('click', fn); }, []);

  async function changeImage(e, field) {
    const file = e.target.files[0]; if (!file) return;
    try { const r = await uploadToTelegram(file); await updateDoc(doc(db, 'pages', pageId), { [field]: r.url }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
    e.target.value = '';
  }

  async function toggleFollowPage() {
    try {
      await updateDoc(doc(db, 'pages', pageId), { followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function openEdit() {
    setEditForm({ name: pg.name||'', description: pg.description||'', website: pg.website||'', phone: pg.phone||'', location: pg.location||'', team: pg.team||'', hobbies: pg.hobbies||'' });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editForm.name.trim()) return;
    try { await updateDoc(doc(db, 'pages', pageId), { ...editForm, name: editForm.name.trim() }); setEditOpen(false); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }
  async function deletePage() {
    if (!window.confirm(`Supprimer définitivement la page "${pg.name}" ?`)) return;
    try { await deleteDoc(doc(db, 'pages', pageId)); navigate('/pages'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function handleMedia(e, type) {
    const file = e.target.files[0]; if (!file) return;
    setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));
  }

  async function publish() {
    if (!content.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let mediaURL = '', finalMT = mediaType;
      if (mediaFile) { const r = await uploadToTelegram(mediaFile); mediaURL = r.url; finalMT = r.type === 'video' ? 'video' : 'image'; }
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: pg.name, authorUsername: '', authorPhoto: pg.photoURL || '',
        authorIsVip: false, content: content.trim().slice(0, 2000), mediaURL, mediaType: finalMT,
        isSale: false, price:'', contact:'', lieu:'',
        allowMessages: pgAllowMessages,
        pageId: pg.id, pageName: pg.name, pagePhoto: pg.photoURL || '',
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      try {
        const targets = pg.followers || [];
        if (targets.length > 0) {
          const batch = writeBatch(db);
          targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
            toUid: fUid, fromUid: currentUser.uid, fromName: pg.name, fromPhoto: pg.photoURL || '',
            type: 'post', postId: postRef.id, message: `${pg.name} a publié une nouvelle actualité`,
            read: false, createdAt: serverTimestamp(),
          }));
          await batch.commit();
        }
      } catch (notifErr) { console.warn('Notification échouée (publication déjà faite) :', notifErr?.message || notifErr); }
      setContent(''); setMediaFile(null); setMediaPreview(null); setMediaType('');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  async function reactToPost(postId, emoji) {
    const post = posts.find(p => p.id === postId); if (!post) return;
    const reactions = post.reactions || {}; const my = reactions[currentUser.uid];
    if (my === emoji) { const u = { ...reactions }; delete u[currentUser.uid]; await updateDoc(doc(db,'posts',postId), { reactions: u }); }
    else await updateDoc(doc(db,'posts',postId), { [`reactions.${currentUser.uid}`]: emoji });
    setShowReact(p => ({ ...p, [postId]: false }));
  }

  if (notFound) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ fontWeight:700, marginBottom:10 }}>Cette page n'existe plus.</p>
      <button className="btn-blue" onClick={() => navigate('/pages')} style={{ padding:'10px 20px', borderRadius:20 }}>Voir les Sera</button>
    </div>
  );
  if (!pg) return <div style={{ padding:40, textAlign:'center', color:'#65676B' }}>Chargement...</div>;

  return (
    <div style={{ paddingBottom:20 }}>
      <div style={{ position:'relative', height:170, background: pg.coverURL ? '#000' : 'linear-gradient(135deg,#1877F2,#63A9FF,#1877F2)' }}>
        {pg.coverURL && <img src={pg.coverURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        <button onClick={() => navigate('/pages')} style={{ position:'absolute', top:10, left:10, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.45)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiArrowLeft size={20}/></button>
        {isAdmin && (<>
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'coverURL')} />
          <button onClick={() => coverRef.current?.click()} style={{ position:'absolute', bottom:10, right:10, background:'rgba(255,255,255,.92)', border:'none', borderRadius:18, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><HiCamera size={15}/> Couverture</button>
        </>)}
        <div style={{ position:'absolute', bottom:-32, left:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:74, height:74, borderRadius:16, background:'linear-gradient(145deg,#63A9FF,#1877F2)', border:'4px solid white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {pg.photoURL ? <img src={pg.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <HiIdentification size={32} color="white"/>}
            </div>
            {isAdmin && (<>
              <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'photoURL')} />
              <button onClick={() => photoRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', background:'#1877F2', border:'2.5px solid white', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiCamera size={12}/></button>
            </>)}
          </div>
        </div>
      </div>

      <div style={{ padding:'40px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontWeight:800, fontSize:19 }}>{pg.name}</h2>
            <p style={{ fontSize:12, color:'#65676B' }}>{pg.category} · <span onClick={() => (pg.followers||[]).length>0 && setFollowersOpen(true)} style={{ cursor: (pg.followers||[]).length>0?'pointer':'default', textDecoration: (pg.followers||[]).length>0?'underline':'none' }}>{(pg.followers||[]).length} abonnés</span></p>
          </div>
          <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p=>!p)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer' }}><HiDotsVertical size={17}/></button>
            {menuOpen && (
              <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:180, zIndex:50, overflow:'hidden' }}>
                {isAdmin && <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#1877F2', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={16}/> Modifier la page</button>}
                {isAdmin && <button onClick={() => { setMenuOpen(false); deletePage(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#FF2D8D' }}><HiTrash size={16}/> Supprimer la page</button>}
              </div>
            )}
          </div>
        </div>

        {pg.description && <p style={{ fontSize:14, marginTop:8 }}>{pg.description}</p>}
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
          {pg.location && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonLocation size={15}/> {pg.location}</p>}
          {pg.phone && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonPhone size={15}/> {pg.phone}</p>}
          {pg.website && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonGlobe size={15}/> <a href={pg.website.startsWith('http')?pg.website:`https://${pg.website}`} target="_blank" rel="noreferrer" style={{ color:'#1877F2' }}>{pg.website}</a></p>}
          {pg.team && <p style={{ fontSize:13, color:'#65676B' }}>👥 Équipe : {pg.team}</p>}
          {pg.hobbies && <p style={{ fontSize:13, color:'#65676B' }}>🎯 {pg.hobbies}</p>}
        </div>

        {!isAdmin && (
          <button onClick={toggleFollowPage} className={isFollowing ? 'btn-secondary' : 'btn-blue'} style={{ width:'100%', marginTop:12, padding:'10px 0', fontSize:14, borderRadius:10 }}>
            {isFollowing ? '✓ Vous suivez cette page' : "⭐ J'aime cette page"}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="card post-card" style={{ padding:14, marginTop:14, marginBottom:8 }}>
          <textarea className="input" placeholder="Publier une actualité..." value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ resize:'none' }} maxLength={2000}/>
          {mediaPreview && (
            <div style={{ position:'relative', marginTop:10 }}>
              {mediaType==='image' ? <img src={mediaPreview} alt="" style={{ width:'100%', borderRadius:10, maxHeight:240, objectFit:'cover' }}/> : <video src={mediaPreview} controls style={{ width:'100%', borderRadius:10, maxHeight:240 }}/>}
              <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(''); }} style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white' }}><HiX size={15}/></button>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
            <input ref={postPhotoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleMedia(e,'image')} />
            <input ref={postVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={e => handleMedia(e,'video')} />
            <button onClick={() => postPhotoRef.current?.click()} className="btn-blue" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:12 }}><HiPhotograph size={15}/> Photo</button>
            <button onClick={() => postVideoRef.current?.click()} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:12 }}><HiVideoCamera size={15}/> Vidéo</button>
            <button onClick={() => navigate('/events')} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:12 }}>📅 Événement</button>
            <button onClick={() => setPgAllowMessages(p => !p)} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:5, borderRadius:20, padding:'6px 12px', fontSize:12, opacity: pgAllowMessages ? 1 : .6 }}>💬 Messages {pgAllowMessages ? 'ON' : 'OFF'}</button>
            <button onClick={publish} disabled={posting || (!content.trim() && !mediaFile)} className="btn-gold" style={{ marginLeft:'auto', padding:'7px 18px', fontSize:13 }}>{posting ? '...' : 'Publier'}</button>
          </div>
        </div>
      )}

      {posts.length === 0 && <p style={{ padding:30, textAlign:'center', color:'#65676B', fontSize:14 }}>Aucune actualité publiée pour le moment.</p>}
      {posts.map(post => {
        const rc = {}; Object.values(post.reactions||{}).forEach(e => { rc[e]=(rc[e]||0)+1; });
        const total = Object.keys(post.reactions||{}).length;
        const myR = post.reactions?.[currentUser.uid];
        return (
          <div key={post.id} className="card post-card animate-fade" style={{ marginBottom:8 }}>
            <div style={{ padding:'12px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
              <img src={pg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(pg.name)}&background=1877F2&color=fff`} alt="" style={{ width:40, height:40, borderRadius:10, objectFit:'cover' }}/>
              <div><p style={{ fontWeight:700, fontSize:14 }}>{pg.name}</p><p style={{ fontSize:12, color:'#65676B' }}>{post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p></div>
            </div>
            <div style={{ padding:'8px 16px' }}>
              {post.content && <p style={{ fontSize:15, lineHeight:1.6 }}>{post.content}</p>}
              {post.mediaURL && (
                <div style={{ marginTop:8, marginLeft:-16, marginRight:-16 }}>
                  {post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', maxHeight:520, objectFit:'cover', display:'block' }}/> : <video src={post.mediaURL} controls style={{ width:'100%', maxHeight:520, background:'#000' }}/>}
                </div>
              )}
            </div>
            {total > 0 && <div style={{ padding:'4px 16px 6px', display:'flex', alignItems:'center', gap:4 }}><div style={{ display:'flex' }}>{Object.keys(rc).slice(0,3).map((e,i)=><span key={e} style={{ fontSize:15, marginLeft:i?-3:0 }}>{e}</span>)}</div><span style={{ fontSize:13, color:'#65676B' }}>{total}</span></div>}
            <div className="post-actions-row">
              <div style={{ position:'relative', flex:1, display:'flex' }}>
                <button onClick={() => reactToPost(post.id, myR || '👍')} onContextMenu={e => { e.preventDefault(); setShowReact(p=>({...p,[post.id]:!p[post.id]})); }} className={'post-action-btn'+(myR?' active':'')} style={myR?{ color: myR==='👍'?'#1877F2':'#FF2D8D', fontWeight:700 }:{}}>
                  <span style={{ fontSize:17 }}>{myR||'👍'}</span> J'aime
                </button>
                {showReact[post.id] && <div style={{ position:'absolute', bottom:'110%', left:8, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:10, border:'1px solid #E4E6EB' }}>{REACTIONS.map(e=><button key={e} onClick={()=>reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24 }}>{e}</button>)}</div>}
              </div>
              <button onClick={() => navigate(`/post/${post.id}`)} className="post-action-btn"><HiChat size={18}/> Commenter</button>
              <button className="post-action-btn"><HiShare size={18}/> Partager</button>
            </div>
          </div>
        );
      })}

      {editOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setEditOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, color:'#1877F2' }}>Modifier la page</h3>
              <button onClick={() => setEditOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            <input className="input" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} placeholder="Nom" style={{ marginBottom:10 }}/>
            <textarea className="input" value={editForm.description} onChange={e=>setEditForm(p=>({...p,description:e.target.value}))} placeholder="Description" rows={3} style={{ resize:'none', marginBottom:10 }}/>
            <input className="input" value={editForm.location} onChange={e=>setEditForm(p=>({...p,location:e.target.value}))} placeholder="Lieu (point exact)" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} placeholder="Téléphone" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.website} onChange={e=>setEditForm(p=>({...p,website:e.target.value}))} placeholder="Site web" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.team} onChange={e=>setEditForm(p=>({...p,team:e.target.value}))} placeholder="Équipe (personnes qui gèrent la page)" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.hobbies} onChange={e=>setEditForm(p=>({...p,hobbies:e.target.value}))} placeholder="Loisirs / activités" style={{ marginBottom:14 }}/>
            <button onClick={saveEdit} className="btn-blue" style={{ width:'100%', padding:'11px 0', fontSize:14 }}>Enregistrer</button>
          </div>
        </div>
      )}
      {followersOpen && <FollowListModal uids={pg.followers||[]} title="Abonnés" onClose={() => setFollowersOpen(false)} />}
    </div>
  );
}
