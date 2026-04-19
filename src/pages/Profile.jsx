// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, collection, query, where,
  onSnapshot, orderBy, addDoc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { getChatId } from '../utils/chat';
import { v4 as uuidv4 } from 'uuid';
import {
  HiCamera, HiPencil, HiTag, HiChat, HiOutlineHeart,
  HiShare, HiStar, HiX, HiUserAdd, HiPhotograph, HiFilm, HiUserGroup
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];
function VIPBadge() {
  return <span style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:8, marginLeft:5, verticalAlign:'middle' }}>VIP ✓</span>;
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
  const isBlocked = (userProfile?.blocked || []).includes(targetUid);
  const targetUid = uid  || currentUser?.uid;

  const [profile,        setProfile]     = useState(null);
  const [posts,          setPosts]       = useState([]);
  const [activeTab,      setActiveTab]   = useState('posts');
  const [editing,        setEditing]     = useState(false);
  const [editForm,       setEditForm]    = useState({ fullName:'', bio:'' });
  const [uploadingPhoto, setUploading]   = useState(false);
  const [openCmt,        setOpenCmt]     = useState({});
  const [cmtText,        setCmtText]     = useState({});
  const [showReact,      setShowReact]   = useState({});
  const [friendsData,    setFriendsData] = useState([]);
  const [loadingFriends, setLoadingF]    = useState(false);
  const [friendStatus,   setFriendStatus] = useState('none');
  const photoRef = useRef();

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

  async function blockUser(targetUid) {
    if (!window.confirm("Bloquer cet utilisateur ?")) return;
    await updateDoc(doc(db,"users",currentUser.uid), { blocked: arrayUnion(targetUid), friends: arrayRemove(targetUid) });
    await updateDoc(doc(db,"users",targetUid), { friends: arrayRemove(currentUser.uid) });
    setUserProfile(p => ({ ...p, blocked: [...(p.blocked||[]), targetUid], friends: (p.friends||[]).filter(u=>u!==targetUid) }));
    setFriendStatus("blocked");
  }

  async function reactToPost(postId, emoji) {
    const post = posts.find(p=>p.id===postId); if (!post) return;
    const r = post.reactions||{}, my = r[currentUser.uid];
    if (my===emoji) { const u={...r}; delete u[currentUser.uid]; await updateDoc(doc(db,'posts',postId),{reactions:u}); }
    else await updateDoc(doc(db,'posts',postId),{[`reactions.${currentUser.uid}`]:emoji});
    setShowReact(p=>({...p,[postId]:false}));
  }

  async function addComment(postId) {
    const text = cmtText[postId]; if (!text?.trim()) return;
    const cmt = { id:uuidv4(), uid:currentUser.uid, authorName:userProfile.fullName, authorPhoto:userProfile.photoURL||'', authorIsVip:userProfile.isVip||false, text:text.trim(), createdAt:new Date().toISOString() };
    await updateDoc(doc(db,'posts',postId), { comments:arrayUnion(cmt) });
    setCmtText(p=>({...p,[postId]:''}));
  }

  async function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { try { await navigator.share({title:'Tsengo',url}); } catch {} }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
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

  if (!profile) return <div style={{ padding:40, textAlign:"center", color:"#C4829F" }}>{t("loading")}</div>;
  if (isBlocked) return <div style={{ padding:40, textAlign:"center", color:"#C4829F" }}><div style={{ fontSize:40 }}>🚫</div><p style={{ fontWeight:700, marginTop:16 }}>Utilisateur bloqué</p><p style={{ fontSize:13, marginTop:8 }}>Vous avez bloqué cet utilisateur.</p></div>;
  const friendCount = profile.friends?.length||0;

  return (
    <div>
      {/* Cover */}
      <div style={{ height:140, background:'linear-gradient(135deg,#E91E8C,#FF6BB5,#FFB3D9)', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-50, left:'50%', transform:'translateX(-50%)' }}>
          <div style={{ position:'relative' }}>
            <img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=E91E8C&color=fff&size=100`} alt="" className="avatar avatar-ring" style={{ width:100, height:100, border:'4px solid white', objectFit:'cover' }}/>
            {isOwn&&<><button onClick={() => photoRef.current.click()} disabled={uploadingPhoto} style={{ position:'absolute', bottom:2, right:2, background:'#E91E8C', border:'2px solid white', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>{uploadingPhoto?'...':<HiCamera size={14}/>}</button><input ref={photoRef} type="file" accept="image/*" onChange={uploadProfilePhoto} style={{ display:'none' }}/></>}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ paddingTop:60, textAlign:'center', padding:'60px 20px 16px' }}>
        {editing ? (
          <div style={{ maxWidth:300, margin:'0 auto' }}>
            <input className="input" value={editForm.fullName} onChange={e=>setEditForm(p=>({...p,fullName:e.target.value}))} style={{ marginBottom:10 }} placeholder={t('fullName')}/>
            <textarea className="input" value={editForm.bio} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} placeholder={t('bio')} rows={2} style={{ resize:'none', marginBottom:10 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary"   onClick={saveProfile}           style={{ flex:1 }}>{t('save')}</button>
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
                { label:'Ventes',       value:salePosts.length },
                { label:'Amis',         value:friendCount, onClick:()=>setActiveTab('amis') },
              ].map(({label,value,onClick}) => (
                <div key={label} style={{ textAlign:'center', cursor:onClick?'pointer':'default' }} onClick={onClick}>
                  <p style={{ fontWeight:700, fontSize:20, color:'#E91E8C' }}>{value}</p>
                  <p style={{ fontSize:11, color:'#C4829F' }}>{label}</p>
                </div>
              ))}
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:14 }}>
              {isOwn ? (
                <button onClick={() => setEditing(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#FFE4F3', border:'none', borderRadius:20, padding:'8px 18px', color:'#E91E8C', fontWeight:600, cursor:'pointer', fontSize:13 }}><HiPencil size={14}/>{t('editProfile')}</button>
              ) : (
                <>
                  <button onClick={() => navigate(`/messages/${getChatId(currentUser.uid,targetUid)}`)} className="btn-primary" style={{ fontSize:13, padding:'8px 18px' }}><HiChat size={14} style={{ display:'inline', marginRight:4 }}/>Message</button>
                  {friendStatus==='none'&&<button onClick={sendFriendRequest} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#FFE4F3', border:'none', borderRadius:20, padding:'8px 16px', color:'#E91E8C', fontWeight:600, cursor:'pointer', fontSize:13 }}><HiUserAdd size={14}/>Ajouter</button>}
                  {friendStatus==='requested'&&<span style={{ display:'inline-flex', alignItems:'center', background:'#F3F4F6', borderRadius:20, padding:'8px 16px', color:'#9CA3AF', fontSize:13 }}>Demande envoyée</span>}
                  {friendStatus==="friend"&&<span style={{ display:"inline-flex", alignItems:"center", background:"#D1FAE5", borderRadius:20, padding:"8px 16px", color:"#065F46", fontSize:13 }}>✓ Ami</span>}
                  {friendStatus==="friend"&&<button onClick={()=>blockUser(targetUid)} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"none", border:"1px solid #E91E8C", borderRadius:20, padding:"8px 16px", color:"#E91E8C", fontWeight:600, cursor:"pointer", fontSize:13 }}>🚫 Bloquer</button>}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
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

      <div style={{ padding:12 }}>
        {/* Photos grid */}
        {activeTab==='photos'&&(photoPosts.length===0
          ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucune photo</div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {photoPosts.map(p => <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} style={{ aspectRatio:'1', overflow:'hidden', borderRadius:8, cursor:'pointer' }}><img src={p.mediaURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/></div>)}
            </div>
        )}

        {/* Videos grid */}
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

        {/* Amis grid */}
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

        {/* Posts & Sales */}
        {(activeTab==='posts'||activeTab==='sales')&&(
          getTabContent().length===0
            ? <div style={{ textAlign:'center', padding:40, color:'#C4829F' }}>Aucun contenu</div>
            : getTabContent().map(post => {
              const myR   = post.reactions?.[currentUser.uid];
              const total = Object.keys(post.reactions||{}).length;
              return (
                <div key={post.id} className="card" style={{ marginBottom:12, overflow:'hidden' }}>
                  {post.isSale&&<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px 0' }}><span className="sale-badge"><HiTag size={12} style={{ display:'inline' }}/> Vente</span><span className="price-tag">{post.price} Ar</span></div>}
                  <div style={{ padding:'10px 14px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
                    {post.content&&<p style={{ fontSize:14, wordBreak:'break-word', lineHeight:1.6 }}>{post.content}</p>}
                    {post.mediaURL&&(post.mediaType==='image'?<img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:10, maxHeight:220, objectFit:'cover', marginTop:8 }}/>:<video src={post.mediaURL} controls style={{ width:'100%', borderRadius:10, marginTop:8 }} onClick={e=>e.stopPropagation()}/>)}
                  </div>
                  <div style={{ borderTop:'1px solid #FFE4F3', padding:'8px 14px', display:'flex', gap:4 }}>
                    <div style={{ position:'relative' }}>
                      <button onClick={() => setShowReact(p=>({...p,[post.id]:!p[post.id]}))} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:myR?'#E91E8C':'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}>
                        {myR?<span>{myR}</span>:<HiOutlineHeart size={17}/>}{total>0&&<span>{total}</span>}
                      </button>
                      {showReact[post.id]&&<div style={{ position:'absolute', bottom:'110%', left:0, background:'white', borderRadius:30, padding:'6px 10px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.15)', zIndex:10, border:'1px solid #FFE4F3' }}>
                        {REACTIONS.map(e=><button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20 }}>{e}</button>)}
                      </div>}
                    </div>
                    <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}>
                      <HiChat size={17}/>{post.comments?.length>0&&<span>{post.comments.length}</span>}
                    </button>
                    <button onClick={() => sharePost(post)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#C4829F', fontSize:13, padding:'6px 10px', borderRadius:20 }}><HiShare size={17}/></button>
                  </div>
                  {openCmt[post.id]&&(
                    <div style={{ padding:'0 14px 12px', borderTop:'1px solid #FFE4F3' }}>
                      {post.comments?.map(c=>(
                        <div key={c.id} style={{ display:'flex', gap:8, marginTop:8 }}>
                          <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:28, height:28, flexShrink:0, cursor:'pointer' }} onClick={()=>navigate(`/profile/${c.uid}`)}/>
                          <div><span style={{ fontWeight:600, fontSize:12 }}>{c.authorName}{c.authorIsVip&&<span style={{ marginLeft:3, background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', color:'white', fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:4 }}>VIP</span>} </span><span style={{ fontSize:12 }}>{c.text}</span></div>
                        </div>
                      ))}
                      <div style={{ display:'flex', gap:6, marginTop:8 }}>
                        <input className="input" placeholder={t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'6px 12px', fontSize:13 }}/>
                        <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#E91E8C,#FF6BB5)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>➤</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
