// src/pages/Artists.jsx — Canal Artiste (musique, vidéos) + découverte
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { captureVideoThumb } from '../utils/videoThumb';
import { timeAgo } from '../utils/timeAgo';
import { NeonMic } from '../components/NeonIcons';
import { HiMusicNote, HiVideoCamera, HiPhotograph, HiX } from 'react-icons/hi';

const GENRES = ['Salegy', 'Tsapiky', 'Kawitry', 'Pop', 'Hip-Hop', 'Gospel', 'Reggae', 'Rock', 'Autre'];
const GENRE_COLORS = {
  Salegy:'#FF7A00', Tsapiky:'#12A48D', Kawitry:'#8F6BFF', Pop:'#FF2D8D',
  'Hip-Hop':'#1877F2', Gospel:'#F2B300', Reggae:'#2E9E4B', Rock:'#E0242D', Autre:'#65676B',
};

export default function Artists() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const isArtist = userProfile?.accountType === 'artist';

  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [genreFilter, setGenreFilter] = useState('Tout');

  const [content, setContent] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const audioRef = useRef(); const videoRef = useRef(); const thumbRef = useRef();

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('accountType', '==', 'artist'))).then(snap => {
      setArtists(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('isArtistPost', '==', true), orderBy('createdAt', 'desc'), limit(60));
    const unsub = onSnapshot(q, snap => setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Artists tracks:', err?.message || err));
    return () => unsub();
  }, []);

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
        uid: currentUser.uid, authorName: userProfile.fullName, authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || '', authorIsVip: userProfile.isVip || false,
        content: content.trim().slice(0, 500), mediaURL: r.url, mediaType: mediaType === 'audio' ? 'audio' : 'video', thumbURL,
        isSale: false, price: '', contact: '', lieu: '',
        isArtistPost: true, genre,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      const targets = (userProfile.followers || []);
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id, message: `${userProfile.fullName} a publié un nouveau son : ${content.trim().slice(0,40) || genre}`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); setMediaFile(null); setMediaType(''); setThumbFile(null); setThumbPreview(null);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  const filteredTracks = genreFilter === 'Tout' ? tracks : tracks.filter(t => t.genre === genreFilter);

  return (
    <div style={{ padding: '14px 12px' }}>
      <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' }}>
          <NeonMic size={17} color="white" />
        </span>
        Artistes
      </h2>
      <p style={{ fontSize: 12, color: '#65676B', marginBottom: 14 }}>Découvrez et écoutez les talents de Traingo</p>

      {!isArtist && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: 'linear-gradient(135deg,#FFE9F2,#FFD3E8)' }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>Vous êtes musicien ou créateur ?</p>
          <p style={{ fontSize: 12, color: '#65676B', marginTop: 2 }}>Activez le Compte Artiste depuis votre profil pour publier vos sons et vidéos ici.</p>
          <button onClick={() => navigate(`/profile/${currentUser.uid}`)} className="btn-primary" style={{ marginTop: 10, padding: '8px 18px', fontSize: 13 }}>Aller à mon profil</button>
        </div>
      )}

      {isArtist && (
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Publier un nouveau son ou vidéo</p>
          <textarea className="input" placeholder="Titre / description..." value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: 8 }} maxLength={500} />
          <select value={genre} onChange={e => setGenre(e.target.value)} className="input" style={{ marginBottom: 8 }}>
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

      {artists.length > 0 && (
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:10, marginBottom: 14 }}>
          {artists.map(a => (
            <div key={a.uid} onClick={() => navigate(`/profile/${a.uid}`)} style={{ flexShrink:0, width:84, textAlign:'center', cursor:'pointer' }}>
              <img src={a.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.fullName)}&background=FF2D8D&color=fff`} alt=""
                style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', border:'2.5px solid #FF2D8D' }} />
              <p style={{ fontSize:11, fontWeight:700, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.fullName}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:10, scrollbarWidth:'none' }}>
        {['Tout', ...GENRES].map(g => (
          <button key={g} onClick={() => setGenreFilter(g)}
            style={{ flexShrink:0, padding:'7px 14px', borderRadius:18, border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:12, fontWeight:700,
              background: genreFilter===g ? (GENRE_COLORS[g]||'#FF2D8D') : '#F0F2F5', color: genreFilter===g ? 'white' : '#050505' }}>
            {g}
          </button>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="card" style={{ padding:30, textAlign:'center', marginTop:10 }}>
          <p style={{ fontWeight:700 }}>Aucun titre pour le moment</p>
        </div>
      )}

      {filteredTracks.map(t => (
        <div key={t.id} className="card" style={{ marginTop:10, overflow:'hidden', borderLeft:`4px solid ${GENRE_COLORS[t.genre]||'#FF2D8D'}` }}>
          <div style={{ display:'flex', gap:10, padding:12 }}>
            <div onClick={() => navigate(`/profile/${t.uid}`)} style={{ width:56, height:56, borderRadius:10, background: t.thumbURL ? `url(${t.thumbURL}) center/cover` : `linear-gradient(145deg, ${GENRE_COLORS[t.genre]||'#FF2D8D'}, #050505)`, flexShrink:0, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {!t.thumbURL && <NeonMic color="white" size={22}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:14 }}>{t.authorName} <span style={{ fontSize:11, fontWeight:700, color: GENRE_COLORS[t.genre]||'#FF2D8D' }}>· {t.genre}</span></p>
              <p style={{ fontSize:13, color:'#050505', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{t.content}</p>
              <p style={{ fontSize:11, color:'#65676B', marginTop:2 }}>{t.createdAt ? timeAgo(t.createdAt) : ''}</p>
            </div>
          </div>
          {t.mediaType === 'audio'
            ? <audio src={t.mediaURL} controls style={{ width:'100%', padding:'0 12px 12px' }} />
            : <video src={t.mediaURL} controls poster={t.thumbURL || undefined} style={{ width:'100%', maxHeight:340, background:'#000' }} />}
        </div>
      ))}
    </div>
  );
}
