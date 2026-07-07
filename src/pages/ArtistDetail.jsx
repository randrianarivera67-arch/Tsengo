// src/pages/ArtistDetail.jsx — Page Artiste (format Spotify/Sera)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { captureVideoThumb } from '../utils/videoThumb';
import { timeAgo } from '../utils/timeAgo';
import { NeonMic, NeonGlobe, NeonPhone, NeonLocation } from '../components/NeonIcons';
import FollowListModal from '../components/FollowListModal';
import {
  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical,
  HiMusicNote, HiVideoCamera, HiPhotograph
} from 'react-icons/hi';

const GENRES = ['Salegy', 'Tsapiky', 'Kawitry', 'Pop', 'Hip-Hop', 'Gospel', 'Reggae', 'Rock', 'Autre'];
const GENRE_COLORS = {
  Salegy:'#FF7A00', Tsapiky:'#12A48D', Kawitry:'#8F6BFF', Pop:'#FF2D8D',
  'Hip-Hop':'#1877F2', Gospel:'#F2B300', Reggae:'#2E9E4B', Rock:'#E0242D', Autre:'#65676B',
};

export default function ArtistDetail() {
  const { artistId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [artist, setArtist] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', bio:'', label:'', manager:'', address:'', contact:'', website:'' });
  const [followersOpen, setFollowersOpen] = useState(false);

  const [content, setContent] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const audioRef = useRef(); const videoRef = useRef(); const thumbRef = useRef();
  const coverRef = useRef(); const photoRef = useRef();

  const isAdmin = !!artist?.admins?.includes(currentUser?.uid);
  const isFollowing = !!artist?.followers?.includes(currentUser?.uid);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'artists', artistId), snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      setArtist({ id: snap.id, ...snap.data() });
    }, err => console.error('Artist:', err?.message || err));
    return () => unsub();
  }, [artistId]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('artistId', '==', artistId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setTracks(list);
    }, err => console.error('Artist tracks:', err?.message || err));
    return () => unsub();
  }, [artistId]);

  useEffect(() => { const fn = () => setMenuOpen(false); document.addEventListener('click', fn); return () => document.removeEventListener('click', fn); }, []);

  async function changeImage(e, field) {
    const file = e.target.files[0]; if (!file) return;
    try { const r = await uploadToTelegram(file); await updateDoc(doc(db, 'artists', artistId), { [field]: r.url }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
    e.target.value = '';
  }

  async function toggleFollowArtist() {
    try { await updateDoc(doc(db, 'artists', artistId), { followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function openEdit() {
    setEditForm({ name: artist.name||'', bio: artist.bio||'', label: artist.label||'', manager: artist.manager||'', address: artist.address||'', contact: artist.contact||'', website: artist.website||'' });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editForm.name.trim()) return;
    try { await updateDoc(doc(db, 'artists', artistId), { ...editForm, name: editForm.name.trim() }); setEditOpen(false); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }
  async function deleteArtist() {
    if (!window.confirm(`Supprimer définitivement le canal "${artist.name}" ?`)) return;
    try { await deleteDoc(doc(db, 'artists', artistId)); navigate('/artists'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function pickAudio(e) { const f = e.target.files[0]; if (!f) return; setMediaFile(f); setMediaType('audio'); }
  function pickVideo(e) { const f = e.target.files[0]; if (!f) return; setMediaFile(f); setMediaType('video'); }
  function pickThumb(e) { const f = e.target.files[0]; if (!f) return; setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }

  async function publishTrack() {
    if (!mediaFile) { alert('Ajoutez un audio ou une vidéo'); return; }
    setPosting(true);
    try {
      const r = await uploadToTelegram(mediaFile);
      let thumbURL = '';
      if (mediaType === 'video' && !thumbFile) {
        try { const auto = await captureVideoThumb(mediaFile); if (auto) { const tr = await uploadToTelegram(auto); thumbURL = tr.url || ''; } } catch {}
      } else if (thumbFile) {
        const tr = await uploadToTelegram(thumbFile); thumbURL = tr.url || '';
      }
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: artist.name, authorPhoto: artist.photoURL || '',
        content: content.trim().slice(0, 500), mediaURL: r.url, mediaType: mediaType === 'audio' ? 'audio' : 'video', thumbURL,
        isSale: false, price: '', contact: '', lieu: '',
        artistId: artist.id, artistName: artist.name, artistPhoto: artist.photoURL || '', genre,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      const targets = artist.followers || [];
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: currentUser.uid, fromName: artist.name, fromPhoto: artist.photoURL || '',
          type: 'post', postId: postRef.id, message: `${artist.name} a publié un nouveau son : ${content.trim().slice(0,40) || genre}`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); setMediaFile(null); setMediaType(''); setThumbFile(null); setThumbPreview(null);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  if (notFound) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ fontWeight:700, marginBottom:10 }}>Ce canal n'existe plus.</p>
      <button className="btn-primary" onClick={() => navigate('/artists')} style={{ padding:'10px 20px', borderRadius:20 }}>Voir les artistes</button>
    </div>
  );
  if (!artist) return <div style={{ padding:40, textAlign:'center', color:'#65676B' }}>Chargement...</div>;

  return (
    <div style={{ paddingBottom:20 }}>
      <div style={{ position:'relative', height:170, background: artist.coverURL ? '#000' : 'linear-gradient(135deg,#FF2D8D,#8F6BFF,#050505)' }}>
        {artist.coverURL && <img src={artist.coverURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        <button onClick={() => navigate('/artists')} style={{ position:'absolute', top:10, left:10, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.45)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiArrowLeft size={20}/></button>
        {isAdmin && (<>
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'coverURL')} />
          <button onClick={() => coverRef.current?.click()} style={{ position:'absolute', bottom:10, right:10, background:'rgba(255,255,255,.92)', border:'none', borderRadius:18, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><HiCamera size={15}/> Couverture</button>
        </>)}
        <div style={{ position:'absolute', bottom:-32, left:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:74, height:74, borderRadius:'50%', background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'4px solid white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {artist.photoURL ? <img src={artist.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <NeonMic size={30} color="white"/>}
            </div>
            {isAdmin && (<>
              <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'photoURL')} />
              <button onClick={() => photoRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', background:'#FF2D8D', border:'2.5px solid white', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiCamera size={12}/></button>
            </>)}
          </div>
        </div>
      </div>

      <div style={{ padding:'40px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontWeight:800, fontSize:19, display:'flex', alignItems:'center', gap:6 }}>
              {artist.name}
              <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:'linear-gradient(135deg,#FF6FA5,#FF2D8D)', color:'white', fontSize:10, fontWeight:800, borderRadius:8, padding:'2px 8px' }}><NeonMic size={10} color="white"/> ARTISTE</span>
            </h2>
            <p style={{ fontSize:12, color:'#65676B' }}>
              <span onClick={() => (artist.followers||[]).length>0 && setFollowersOpen(true)} style={{ cursor:(artist.followers||[]).length>0?'pointer':'default', textDecoration:(artist.followers||[]).length>0?'underline':'none' }}>{(artist.followers||[]).length} abonnés</span>
            </p>
          </div>
          <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p=>!p)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer' }}><HiDotsVertical size={17}/></button>
            {menuOpen && (
              <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:180, zIndex:50, overflow:'hidden' }}>
                {isAdmin && <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#1877F2', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={16}/> Modifier le canal</button>}
                {isAdmin && <button onClick={() => { setMenuOpen(false); deleteArtist(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#FF2D8D' }}><HiTrash size={16}/> Supprimer le canal</button>}
              </div>
            )}
          </div>
        </div>

        {artist.bio && <p style={{ fontSize:14, marginTop:8 }}>{artist.bio}</p>}
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
          {artist.label && <p style={{ fontSize:13, color:'#65676B' }}>💿 Label/Studio : {artist.label}</p>}
          {artist.manager && <p style={{ fontSize:13, color:'#65676B' }}>👤 Manager : {artist.manager}</p>}
          {artist.address && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonLocation size={15}/> {artist.address}</p>}
          {artist.contact && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonPhone size={15}/> {artist.contact}</p>}
          {artist.website && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonGlobe size={15}/> <a href={artist.website.startsWith('http')?artist.website:`https://${artist.website}`} target="_blank" rel="noreferrer" style={{ color:'#1877F2' }}>{artist.website}</a></p>}
        </div>

        {!isAdmin && (
          <button onClick={toggleFollowArtist} className={isFollowing ? 'btn-secondary' : 'btn-gold'} style={{ width:'100%', marginTop:12, padding:'10px 0', fontSize:14, borderRadius:10 }}>
            {isFollowing ? '✓ Abonné' : '⭐ Suivre cet artiste'}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="card post-card" style={{ padding:14, marginTop:14, marginBottom:8 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Publier un nouveau son ou vidéo</p>
          <textarea className="input" placeholder="Titre / description..." value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ resize:'none', marginBottom:8 }} maxLength={500} />
          <select value={genre} onChange={e => setGenre(e.target.value)} className="input" style={{ marginBottom:8 }}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input ref={audioRef} type="file" accept="audio/*" style={{ display:'none' }} onChange={pickAudio} />
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={pickVideo} />
          <input ref={thumbRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pickThumb} />
          {mediaFile && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F0F2F5', borderRadius:10, padding:'8px 12px', marginBottom:8 }}>
              {mediaType === 'audio' ? <HiMusicNote color="#FF2D8D" /> : <HiVideoCamera color="#FF2D8D" />}
              <p style={{ fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mediaFile.name}</p>
              <button onClick={() => { setMediaFile(null); setMediaType(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={16}/></button>
            </div>
          )}
          {thumbPreview && <img src={thumbPreview} alt="" style={{ width:70, height:70, borderRadius:10, objectFit:'cover', marginBottom:8 }} />}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => audioRef.current.click()} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, borderRadius:20 }}><HiMusicNote size={14}/> Audio</button>
            <button onClick={() => videoRef.current.click()} className="btn-blue" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, borderRadius:20 }}><HiVideoCamera size={14}/> Vidéo</button>
            <button onClick={() => thumbRef.current.click()} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, borderRadius:20 }}><HiPhotograph size={14}/> Vignette</button>
            <button onClick={publishTrack} disabled={posting || !mediaFile} className="btn-gold" style={{ marginLeft:'auto', padding:'7px 18px', fontSize:13 }}>{posting ? '...' : 'Publier'}</button>
          </div>
        </div>
      )}

      {tracks.length === 0 && <p style={{ padding:30, textAlign:'center', color:'#65676B', fontSize:14 }}>Aucun titre publié pour le moment.</p>}
      {tracks.map(t => (
        <div key={t.id} className="card" style={{ marginTop:10, overflow:'hidden', borderLeft:`4px solid ${GENRE_COLORS[t.genre]||'#FF2D8D'}` }}>
          <div style={{ display:'flex', gap:10, padding:12 }}>
            <div style={{ width:56, height:56, borderRadius:10, background: t.thumbURL ? `url(${t.thumbURL}) center/cover` : `linear-gradient(145deg, ${GENRE_COLORS[t.genre]||'#FF2D8D'}, #050505)`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {!t.thumbURL && <NeonMic color="white" size={22}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:14 }}>{t.content || t.genre} <span style={{ fontSize:11, fontWeight:700, color: GENRE_COLORS[t.genre]||'#FF2D8D' }}>· {t.genre}</span></p>
              <p style={{ fontSize:11, color:'#65676B', marginTop:2 }}>{t.createdAt ? timeAgo(t.createdAt) : ''}</p>
            </div>
          </div>
          {t.mediaType === 'audio'
            ? <audio src={t.mediaURL} controls style={{ width:'100%', padding:'0 12px 12px' }} />
            : <video src={t.mediaURL} controls poster={t.thumbURL || undefined} style={{ width:'100%', maxHeight:340, background:'#000' }} />}
        </div>
      ))}

      {editOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setEditOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, color:'#FF2D8D' }}>Modifier le canal</h3>
              <button onClick={() => setEditOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            <input className="input" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} placeholder="Nom d'artiste" style={{ marginBottom:10 }}/>
            <textarea className="input" value={editForm.bio} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} placeholder="Biographie" rows={3} style={{ resize:'none', marginBottom:10 }}/>
            <input className="input" value={editForm.label} onChange={e=>setEditForm(p=>({...p,label:e.target.value}))} placeholder="Label / studio" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.manager} onChange={e=>setEditForm(p=>({...p,manager:e.target.value}))} placeholder="Manager" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.address} onChange={e=>setEditForm(p=>({...p,address:e.target.value}))} placeholder="Adresse (point exact)" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.contact} onChange={e=>setEditForm(p=>({...p,contact:e.target.value}))} placeholder="Contact" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.website} onChange={e=>setEditForm(p=>({...p,website:e.target.value}))} placeholder="Site web" style={{ marginBottom:14 }}/>
            <button onClick={saveEdit} className="btn-primary" style={{ width:'100%', padding:'11px 0', fontSize:14 }}>Enregistrer</button>
          </div>
        </div>
      )}

      {followersOpen && <FollowListModal uids={artist.followers||[]} title="Abonnés" onClose={() => setFollowersOpen(false)} />}
    </div>
  );
}
