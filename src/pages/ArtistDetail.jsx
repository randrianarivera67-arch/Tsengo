// src/pages/ArtistDetail.jsx — Page Artiste (format Spotify/Sera)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { captureVideoThumb } from '../utils/videoThumb';
import { timeAgo } from '../utils/timeAgo';
import { NeonMic, NeonGlobe, NeonPhone, NeonLocation } from '../components/NeonIcons';
import FollowListModal from '../components/FollowListModal';
import { downloadMedia } from '../utils/download';
import {
  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical, HiPaperAirplane,
  HiMusicNote, HiVideoCamera, HiPhotograph
} from 'react-icons/hi';

const GENRES = ['Salegy', 'Tsapiky', 'Kawitry', 'Pop', 'Hip-Hop', 'Gospel', 'Reggae', 'Rock', 'Autre'];
const GENRE_COLORS = {
  Salegy:'#FF7A00', Tsapiky:'#12A48D', Kawitry:'#8F6BFF', Pop:'#FF2D8D',
  'Hip-Hop':'#1877F2', Gospel:'#F2B300', Reggae:'#2E9E4B', Rock:'#E0242D', Autre:'#65676B',
};

export default function ArtistDetail() {
  const { artistId } = useParams();
  const { currentUser, userProfile } = useAuth();
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
  // Champs hira (Résaka artiste)
  const [songFullOpen, setSongFullOpen] = useState(false);
  const [songTitle, setSongTitle]   = useState('');
  const [songAC, setSongAC]         = useState('');   // Auteur / Compositeur
  const [songLabel, setSongLabel]   = useState('');
  const [songStudio, setSongStudio] = useState('');
  const [songTeam, setSongTeam]     = useState('');   // équipe
  const [songArt, setSongArt]       = useState('');   // direction artistique
  const [publishTarget, setPublishTarget] = useState('page');  // 'page' | 'groups'
  const [myGroups, setMyGroups]     = useState([]);
  const [songGroupSel, setSongGroupSel] = useState({});
  // Lecteur (Spotify-style)
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [trackMenu, setTrackMenu] = useState(null);   // piste dont le menu est ouvert
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
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

  // Lecteur : démarrage auto quand le titre change
  useEffect(() => {
    if (!currentTrack || !playerRef.current) return;
    const p = playerRef.current;
    p.load();
    if (playing) p.play().catch(() => {});
  }, [currentTrack]);

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
  async function reportArtist() {
    setMenuOpen(false);
    if (!window.confirm('Signaler cette page aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'artist', targetId: artistId, targetUid: artist.createdBy || '', targetAuthor: artist.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function blockArtist() {
    setMenuOpen(false);
    if (!window.confirm(`Bloquer la page "${artist.name}" ?`)) return;
    try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: arrayUnion(artistId) }); alert('Page bloquée.'); navigate('/artists'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function reportTrack(t) {
    setTrackMenu(null);
    if (!window.confirm('Signaler ce contenu aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post', targetId: t.id, targetUid: t.uid || '', targetAuthor: artist.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteTrack(t) {
    setTrackMenu(null);
    if (!window.confirm(`Supprimer "${t.songTitle || 'ce titre'}" ?`)) return;
    try { await deleteDoc(doc(db, 'posts', t.id)); }
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

  async function loadMyGroups() {
    try {
      const snap = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid)));
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('loadMyGroups:', e?.message); }
  }
  function chooseTarget(target) {
    setPublishTarget(target);
    if (target === 'groups' && myGroups.length === 0) loadMyGroups();
  }

  function playTrack(t) {
    if (currentTrack?.id === t.id) { togglePlay(); return; }
    setCurrentTrack(t);
    setPlaying(true);
    setCurTime(0);
    // La lecture démarre via useEffect (quand la source est prête)
  }
  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused) { p.play().catch(()=>{}); setPlaying(true); }
    else { p.pause(); setPlaying(false); }
  }
  function playAdjacent(dir) {
    if (!currentTrack) return;
    const idx = tracks.findIndex(x => x.id === currentTrack.id);
    const ni = idx + dir;
    if (ni >= 0 && ni < tracks.length) playTrack(tracks[ni]);
  }
  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  async function publishTrack() {
    if (!mediaFile) { alert('Ajoutez un audio ou une vidéo'); return; }
    if (!songTitle.trim()) { alert('Ajoutez un titre'); return; }
    setPosting(true);
    try {
      const r = await uploadToTelegram(mediaFile);
      let thumbURL = '';
      if (mediaType === 'video' && !thumbFile) {
        try { const auto = await captureVideoThumb(mediaFile); if (auto) { const tr = await uploadToTelegram(auto); thumbURL = tr.url || ''; } } catch {}
      } else if (thumbFile) {
        try { const tr = await uploadToTelegram(thumbFile); thumbURL = tr.url || ''; } catch {}
      }
      // Groupes cibles (si "publier dans groupes") — sinon page artiste
      const targetGroups = publishTarget === 'groups' ? Object.keys(songGroupSel).filter(k => songGroupSel[k]) : [];

      const baseData = {
        uid: currentUser.uid, authorName: artist.name, authorUsername: '', authorPhoto: artist.photoURL || '',
        content: content.trim().slice(0, 500), mediaURL: r.url, mediaType: mediaType === 'audio' ? 'audio' : 'video', thumbURL,
        isSale: false, price: '', contact: '', lieu: '',
        artistId: artist.id, artistName: artist.name, artistPhoto: artist.photoURL || '', genre,
        isMusic: true,
        songTitle: songTitle.trim().slice(0, 120),
        songAuthorComposer: songAC.trim().slice(0, 160),   // A/C (auteur/compositeur)
        songLabel: songLabel.trim().slice(0, 120),
        songStudio: songStudio.trim().slice(0, 120),
        songTeam: songTeam.trim().slice(0, 250),           // équipe
        songArt: songArt.trim().slice(0, 160),             // art / direction artistique
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      };

      if (targetGroups.length > 0) {
        // Publier dans chaque groupe (la page artiste publie directement dedans)
        const batch = writeBatch(db);
        targetGroups.forEach(gid => {
          const g = myGroups.find(x => x.id === gid);
          const ref = doc(collection(db, 'posts'));
          batch.set(ref, { ...baseData, groupId: gid, groupName: g?.name || '', postedByArtist: true });
        });
        await batch.commit();
      } else {
        // Publier sur la page artiste (+ fil d'actualités, canal audio)
        await addDoc(collection(db, 'posts'), baseData);
      }

      // ✅ Le titre est publié — une notification qui échoue ne doit JAMAIS
      // déclencher un faux message "Erreur"
      try {
        const targets = artist.followers || [];
        if (targets.length > 0) {
          const batch = writeBatch(db);
          targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
            toUid: fUid, fromUid: currentUser.uid, fromName: artist.name, fromPhoto: artist.photoURL || '',
            type: 'post', message: `${artist.name} a publié un nouveau son : ${songTitle.trim().slice(0,40)}`,
            read: false, createdAt: serverTimestamp(),
          }));
          await batch.commit();
        }
      } catch (notifErr) { console.warn('Notification abonnés échouée (titre déjà publié) :', notifErr?.message || notifErr); }
      setContent(''); setMediaFile(null); setMediaType(''); setThumbFile(null); setThumbPreview(null);
      setSongTitle(''); setSongAC(''); setSongLabel(''); setSongStudio(''); setSongTeam(''); setSongArt('');
      setPublishTarget('page'); setSongGroupSel({}); setSongFullOpen(false);
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
              <span onClick={() => (artist.followers||[]).length>0 && setFollowersOpen(true)} style={{ cursor:(artist.followers||[]).length>0?'pointer':'default', textDecoration:(artist.followers||[]).length>0?'underline':'none' }}><b style={{ fontWeight:800 }}>{(artist.followers||[]).length}</b> abonnés</span>
            </p>
          </div>
          <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => navigate(`/artists/${artistId}/messages`)} title="Messages" style={{ background:'linear-gradient(150deg,#FFD84D,#D69A00)', border:'none', borderRadius:12, width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', boxShadow:'0 4px 10px rgba(214,154,0,.4)' }}><HiPaperAirplane size={22} style={{ transform:'rotate(90deg)' }}/></button>
              <button onClick={() => setMenuOpen(p=>!p)} title={isAdmin ? 'Paramètres' : 'Options'} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#050505' }}>{isAdmin ? <HiCog size={21}/> : <HiDotsVertical size={20}/>}</button>
            </span>
            {menuOpen && (
              <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:180, zIndex:50, overflow:'hidden' }}>
                {isAdmin ? (<>
                  <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={18} color="#1877F2"/> Modifier la page</button>
                  <button onClick={() => { setMenuOpen(false); deleteArtist(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={18}/> Supprimer la page</button>
                </>) : (<>
                  <button onClick={reportArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={18} color="#F2B300"/> Signaler aux admins</button>
                  <button onClick={blockArtist} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiBan size={18}/> Bloquer cette page</button>
                </>)}
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
        <div className="card post-card" style={{ padding:12, marginTop:14, marginBottom:8 }}>
          <button onClick={() => setSongFullOpen(true)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'none', borderRadius:22, padding:'12px', color:'white', fontWeight:800, fontSize:15, fontFamily:'Poppins', cursor:'pointer' }}>
            <HiMusicNote size={20}/> Publier un nouveau son / vidéo
          </button>
        </div>
      )}

      {/* ── PAGE FENO : Publier un titre (artiste) ── */}
      {songFullOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto' }}>
      <div className="card post-card" style={{ padding:16, width:'100%', maxWidth:600, minHeight:'100vh', borderRadius:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #E4E6EB' }}>
          <button onClick={() => setSongFullOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><HiX size={24} color="#050505"/></button>
          <h3 style={{ fontWeight:800, fontSize:18, flex:1 }}>Publier un titre</h3>
          <button onClick={publishTrack} disabled={posting || !mediaFile || !songTitle.trim()} className="btn-gold" style={{ padding:'7px 20px', fontSize:14 }}>{posting ? '...' : 'Publier'}</button>
        </div>

        <input ref={audioRef} type="file" accept="audio/*" style={{ display:'none' }} onChange={pickAudio} />
        <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={pickVideo} />
        <input ref={thumbRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pickThumb} />

        {/* Média : Audio / Vidéo + Vignette (art) */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button onClick={() => audioRef.current.click()} className="btn-primary" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', fontSize:13, borderRadius:12 }}><HiMusicNote size={18}/> Audio</button>
          <button onClick={() => videoRef.current.click()} className="btn-blue" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', fontSize:13, borderRadius:12 }}><HiVideoCamera size={18}/> Vidéo</button>
          <button onClick={() => thumbRef.current.click()} className="btn-secondary" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', fontSize:13, borderRadius:12 }}><HiPhotograph size={18}/> Art</button>
        </div>
        {mediaFile && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F0F2F5', borderRadius:10, padding:'8px 12px', marginBottom:8 }}>
            {mediaType === 'audio' ? <HiMusicNote color="#FF2D8D" /> : <HiVideoCamera color="#FF2D8D" />}
            <p style={{ fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mediaFile.name}</p>
            <button onClick={() => { setMediaFile(null); setMediaType(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={16}/></button>
          </div>
        )}
        {thumbPreview && <img src={thumbPreview} alt="" style={{ width:80, height:80, borderRadius:10, objectFit:'cover', marginBottom:10 }} />}

        {/* Champs du titre */}
        <input className="input" placeholder="Titre du morceau *" value={songTitle} onChange={e => setSongTitle(e.target.value)} style={{ marginBottom:8 }} maxLength={120} />
        <select value={genre} onChange={e => setGenre(e.target.value)} className="input" style={{ marginBottom:8 }}>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <input className="input" placeholder="A/C — Auteur / Compositeur" value={songAC} onChange={e => setSongAC(e.target.value)} style={{ marginBottom:8 }} maxLength={160} />
        <input className="input" placeholder="Label" value={songLabel} onChange={e => setSongLabel(e.target.value)} style={{ marginBottom:8 }} maxLength={120} />
        <input className="input" placeholder="Studio" value={songStudio} onChange={e => setSongStudio(e.target.value)} style={{ marginBottom:8 }} maxLength={120} />
        <input className="input" placeholder="Équipe (musiciens, réalisateur…)" value={songTeam} onChange={e => setSongTeam(e.target.value)} style={{ marginBottom:8 }} maxLength={250} />
        <input className="input" placeholder="Direction artistique / Art" value={songArt} onChange={e => setSongArt(e.target.value)} style={{ marginBottom:8 }} maxLength={160} />
        <textarea className="input" placeholder="Description..." value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', marginBottom:12 }} maxLength={500} />

        {/* Choix : publier dans ma page artiste OU dans des groupes */}
        <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
          <button onClick={() => chooseTarget('page')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', background: publishTarget==='page' ? '#E7F0FE' : 'none', border:'none', borderBottom:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, fontWeight:700, color:'#050505' }}>
            <span style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #1877F2', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{publishTarget==='page' && <span style={{ width:9, height:9, borderRadius:'50%', background:'#1877F2' }}/>}</span>
            Publier dans ma page artiste
          </button>
          <button onClick={() => chooseTarget('groups')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', background: publishTarget==='groups' ? '#E7F0FE' : 'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, fontWeight:700, color:'#050505' }}>
            <span style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #1877F2', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{publishTarget==='groups' && <span style={{ width:9, height:9, borderRadius:'50%', background:'#1877F2' }}/>}</span>
            Publier dans des groupes
          </button>
        </div>

        {/* Liste des groupes (si "dans groupes") */}
        {publishTarget === 'groups' && (
          <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
            {myGroups.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe accessible.</p>}
            {myGroups.map(g => (
              <button key={g.id} onClick={() => setSongGroupSel(p => ({ ...p, [g.id]: !p[g.id] }))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', borderTop:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, color:'#050505' }}>
                <span style={{ width:20, height:20, borderRadius:5, border:'2px solid #1877F2', background: songGroupSel[g.id] ? '#1877F2' : 'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13 }}>{songGroupSel[g.id] && '✓'}</span>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
      )}

      {tracks.length === 0 && <p style={{ padding:30, textAlign:'center', color:'#65676B', fontSize:14 }}>Aucun titre publié pour le moment.</p>}

      {/* ── Liste des titres — style Spotify ─────────────────── */}
      {tracks.length > 0 && (
        <div className="card" style={{ marginTop:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px 8px' }}>
            <NeonMic color="#FF2D8D" size={20}/>
            <h3 style={{ fontWeight:800, fontSize:16 }}>Titres</h3>
            <span style={{ fontSize:12, color:'#65676B' }}>{tracks.length}</span>
          </div>
          {tracks.map((t, i) => {
            const isCur = currentTrack?.id === t.id;
            return (
              <div key={t.id} onClick={() => playTrack(t)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', cursor:'pointer', background: isCur ? 'rgba(255,45,141,.08)' : 'transparent', borderTop: i>0?'1px solid #F0F2F5':'none' }}>
                {/* Numéro / indicateur lecture */}
                <div style={{ width:24, textAlign:'center', flexShrink:0 }}>
                  {isCur && playing
                    ? <span style={{ color:'#FF2D8D', fontSize:15 }}>▶</span>
                    : <span style={{ color:'#65676B', fontSize:14, fontWeight:600 }}>{i+1}</span>}
                </div>
                {/* Pochette */}
                <div style={{ width:44, height:44, borderRadius:8, background: t.thumbURL ? `url(${t.thumbURL}) center/cover` : `linear-gradient(145deg, ${GENRE_COLORS[t.genre]||'#FF2D8D'}, #050505)`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  {!t.thumbURL && <NeonMic color="white" size={16}/>}
                  {t.mediaType === 'video' && <span style={{ position:'absolute', bottom:2, right:2, fontSize:10 }}>🎬</span>}
                </div>
                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, fontSize:14, color: isCur ? '#FF2D8D' : '#050505', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.songTitle || t.content || 'Sans titre'}</p>
                  <p style={{ fontSize:12, color:'#65676B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {[artist.name, t.songAuthorComposer].filter(Boolean).join(' · ')} <span style={{ color: GENRE_COLORS[t.genre]||'#FF2D8D' }}>· {t.genre}</span>
                  </p>
                </div>
                {/* Menu / détails */}
                <button onClick={e => { e.stopPropagation(); setTrackMenu(t); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', flexShrink:0 }}><HiDotsVertical size={18}/></button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fiche titre (détails : équipe, art, studio…) ── */}
      {trackMenu && (
        <div onClick={() => setTrackMenu(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, overflow:'hidden' }}>
            {isAdmin ? (<>
              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setTrackInfo(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={19} color="#1877F2"/> Modifier</button>
              <button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => { setTrackMenu(null); navigate('/boost'); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLightningBolt size={19} color="#a855f7"/> Booster</button>
              <button onClick={() => deleteTrack(trackMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={19}/> Supprimer</button>
            </>) : (<>
              <button onClick={() => { const t = trackMenu; setTrackMenu(null); setTrackInfo(t); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiInformationCircle size={19} color="#1877F2"/> Informations</button>
              <button onClick={() => { downloadMedia(trackMenu.mediaURL, trackMenu.mediaType || 'audio', trackMenu.songTitle || 'titre'); setTrackMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => reportTrack(trackMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiFlag size={19}/> Signaler aux admins</button>
            </>)}
          </div>
        </div>
      )}

      {trackInfo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setTrackInfo(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'10px 0 22px', width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'6px auto 14px' }} />
            <div style={{ display:'flex', gap:14, padding:'0 20px 14px' }}>
              <div style={{ width:80, height:80, borderRadius:12, background: trackInfo.thumbURL ? `url(${trackInfo.thumbURL}) center/cover` : `linear-gradient(145deg, ${GENRE_COLORS[trackInfo.genre]||'#FF2D8D'}, #050505)`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {!trackInfo.thumbURL && <NeonMic color="white" size={28}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:800, fontSize:17 }}>{trackInfo.songTitle || 'Sans titre'}</p>
                <p style={{ fontSize:13, color:'#65676B' }}>{artist.name} · {trackInfo.genre}</p>
                {trackInfo.createdAt && <p style={{ fontSize:12, color:'#8A8D91', marginTop:2 }}>{timeAgo(trackInfo.createdAt)}</p>}
              </div>
            </div>
            {trackInfo.content && <p style={{ fontSize:14, padding:'0 20px 10px', lineHeight:1.5 }}>{trackInfo.content}</p>}
            <div style={{ padding:'0 20px' }}>
              {trackInfo.songAuthorComposer && <InfoRow label="A/C (Auteur / Compositeur)" value={trackInfo.songAuthorComposer} />}
              {trackInfo.songLabel  && <InfoRow label="Label"  value={trackInfo.songLabel} />}
              {trackInfo.songStudio && <InfoRow label="Studio" value={trackInfo.songStudio} />}
              {trackInfo.songTeam   && <InfoRow label="Équipe" value={trackInfo.songTeam} />}
              {trackInfo.songArt    && <InfoRow label="Direction artistique" value={trackInfo.songArt} />}
            </div>
            <div style={{ padding:'14px 20px 0' }}>
              <button onClick={() => { playTrack(trackInfo); setTrackInfo(null); }} className="btn-gold" style={{ width:'100%', padding:'12px', fontSize:15 }}>▶ Lire</button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── LECTEUR (mini-player Spotify) ── */}
      {currentTrack && (
        <>
          {/* Élément média (audio ou vidéo) */}
          {currentTrack.mediaType === 'video' ? (
            <video ref={playerRef} src={currentTrack.mediaURL} playsInline
              onTimeUpdate={e => setCurTime(e.target.currentTime)}
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onEnded={() => playAdjacent(1)}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              style={{ position:'fixed', bottom:150, right:12, width:150, borderRadius:12, zIndex:250, background:'#000', boxShadow:'0 6px 20px rgba(0,0,0,.4)' }} />
          ) : (
            <audio ref={playerRef} src={currentTrack.mediaURL}
              onTimeUpdate={e => setCurTime(e.target.currentTime)}
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onEnded={() => playAdjacent(1)}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
          )}

          <div style={{ position:'fixed', bottom:92, left:0, right:0, zIndex:260, display:'flex', justifyContent:'center', padding:'0 8px', pointerEvents:'none' }}>
            <div style={{ pointerEvents:'auto', width:'100%', maxWidth:600, background:'linear-gradient(135deg,#2A0A1B,#4A0E2E)', borderRadius:14, padding:'8px 12px', boxShadow:'0 6px 24px rgba(0,0,0,.4)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:8, background: currentTrack.thumbURL ? `url(${currentTrack.thumbURL}) center/cover` : `linear-gradient(145deg, ${GENRE_COLORS[currentTrack.genre]||'#FF2D8D'}, #050505)`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {!currentTrack.thumbURL && <NeonMic color="white" size={16}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:13, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentTrack.songTitle || 'Sans titre'}</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{artist.name}</p>
                {/* Barre de progression */}
                <div style={{ marginTop:4, height:3, background:'rgba(255,255,255,.25)', borderRadius:2, cursor:'pointer' }}
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - r.left) / r.width; if (playerRef.current && duration) { playerRef.current.currentTime = pct * duration; } }}>
                  <div style={{ width: duration ? `${(curTime/duration)*100}%` : '0%', height:'100%', background:'#FF2D8D', borderRadius:2 }} />
                </div>
              </div>
              <button onClick={() => playAdjacent(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', flexShrink:0 }}>⏮</button>
              <button onClick={togglePlay} style={{ background:'white', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'#4A0E2E', fontSize:15, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{playing ? '❚❚' : '▶'}</button>
              <button onClick={() => playAdjacent(1)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', flexShrink:0 }}>⏭</button>
              <button onClick={() => { setCurrentTrack(null); setPlaying(false); }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.6)', flexShrink:0 }}><HiX size={16}/></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid #F0F2F5' }}>
      <span style={{ fontSize:13, color:'#65676B', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, textAlign:'right' }}>{value}</span>
    </div>
  );
}
