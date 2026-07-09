// src/pages/Artists.jsx — Canaux Artiste : recherche live, mes pages, musiques, clips
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { parseAppLink } from '../utils/appLink';
import { NeonMic } from '../components/NeonIcons';
import { HiPlus, HiX, HiChevronRight, HiArrowLeft, HiSearch, HiDotsVertical, HiCheckCircle, HiCheck } from 'react-icons/hi';

const GRADS = [['#FF6FA5', '#FF2D8D'], ['#A66BFF', '#7A2DFF'], ['#3DBEFF', '#1877F2']];

function waveBars(seed, n = 40) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n }, (_, i) => 8 + Math.abs(Math.sin(i * 0.4 + s)) * 36 + rnd() * 12);
}

function fmtDur(sec) {
  if (!sec || !isFinite(sec)) return '';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function TrackCard({ track, index, playing, onToggle, onArtist }) {
  const [dur, setDur] = useState('');
  const bars = useRef(waveBars(track.id || String(index)));
  const grad = GRADS[index % 3];
  useEffect(() => {
    if (!track.mediaURL) return;
    const a = new Audio(); a.preload = 'metadata'; a.src = track.mediaURL;
    const on = () => setDur(fmtDur(a.duration));
    a.addEventListener('loadedmetadata', on);
    return () => { a.removeEventListener('loadedmetadata', on); a.src = ''; };
  }, [track.mediaURL]);
  return (
    <div style={{ flex: '0 0 180px', background: '#0c0c12', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div onClick={() => onArtist?.(track.artistId)} style={{ position: 'absolute', top: 8, left: 8, width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,.85)', zIndex: 3, cursor: 'pointer', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {track.artistPhoto ? <img src={track.artistPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={16} color="white" />}
        </div>
        {track.thumbURL && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + track.thumbURL + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(.45)', zIndex: 0 }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 10px', zIndex: 1 }}>
          {bars.current.map((h, i) => <div key={i} style={{ width: 3, height: h, borderRadius: 3, background: i / bars.current.length < 0.5 ? grad[0] : grad[1], opacity: playing ? 0.95 : 0.7 }} />)}
        </div>
        <div onClick={() => onToggle?.(track)} style={{ position: 'relative', zIndex: 2, width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {playing ? <svg width="16" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
                   : <svg width="16" height="18" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}><path d="M6 4l14 8-14 8z" /></svg>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 10px 10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.songTitle || 'Sans titre'}</div>
          <div style={{ fontSize: 11, color: '#b9b9c2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artistName}</div>
        </div>
        {dur && <div style={{ fontSize: 11, color: '#e6e6ea', fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{dur}</div>}
      </div>
    </div>
  );
}

export default function Artists() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [media, setMedia] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  function toggleTrack(t) {
    if (!t?.mediaURL) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (playingId === t.id) { a.pause(); setPlayingId(null); return; }
    a.src = t.mediaURL; a.onended = () => setPlayingId(null);
    a.play().catch(() => {});
    setPlayingId(t.id);
  }

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'artists')), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
      setArtists(list);
    }, err => console.error('Artists:', err?.message || err));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)), snap => {
      setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isMusic));
    }, err => console.error('Media:', err?.message || err));
    return () => unsub();
  }, []);

  const myPages = artists.filter(a => a.admins?.includes(currentUser?.uid));
  const low = q.trim().toLowerCase();

  const fArtists = useMemo(() => !low ? artists : artists.filter(a => a.name?.toLowerCase().includes(low)), [artists, low]);
  const fTracks  = useMemo(() => {
    const t = media.filter(m => m.mediaType === 'audio');
    return !low ? t : t.filter(m => m.songTitle?.toLowerCase().includes(low) || m.artistName?.toLowerCase().includes(low) || m.genre?.toLowerCase().includes(low));
  }, [media, low]);
  const fVideos  = useMemo(() => {
    const v = media.filter(m => m.mediaType === 'video');
    return !low ? v : v.filter(m => m.songTitle?.toLowerCase().includes(low) || m.artistName?.toLowerCase().includes(low) || m.content?.toLowerCase().includes(low));
  }, [media, low]);

  async function toggleFollowArtist(artistId) {
    if (!artistId || !currentUser) return;
    const a = artists.find(x => x.id === artistId);
    const on = (a?.followers || []).includes(currentUser.uid);
    try { await updateDoc(doc(db, 'artists', artistId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function createArtist() {
    if (!name.trim()) { alert('Donnez un nom à votre canal artiste'); return; }
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'artists'), {
        name: name.trim(), bio: '', label: '', manager: '', address: '', contact: '', website: '',
        photoURL: '', coverURL: '', admins: [currentUser.uid], followers: [],
        createdBy: currentUser.uid, createdAt: serverTimestamp(),
      });
      setOpen(false); setName('');
      navigate(`/artists/${ref.id}`);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  const rowStyle = { display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 0 10px', WebkitOverflowScrolling: 'touch' };
  const secHd = (title, count, type) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</span>
      {count > 0 && (
        <button onClick={() => navigate(`/artists/all/${type}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', padding: 0 }}>
          Voir tout <HiChevronRight size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' }}>
            <NeonMic size={17} color="white" />
          </span>
          Artistes
        </h2>
        <button onClick={() => setOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#65676B', margin: '10px 0 12px' }}>Découvrez les canaux musique/vidéo des créateurs de Trengo</p>

      {/* Recherche live */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E4E6EB', borderRadius: 22, padding: '10px 14px', marginBottom: 12 }}>
        <HiSearch size={18} color="#65676B" />
        <input value={q} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setQ(''); navigate(l); return; } setQ(e.target.value); }} placeholder="Rechercher une chanson, un artiste… ou coller un lien"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#050505' }} />
        {q && <button onClick={() => setQ('')} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B' }}><HiX size={14} /></button>}
      </div>

      {/* Mes pages artiste — section séparée */}
      {myPages.length > 0 && !low && (
        <div style={{ background: 'linear-gradient(135deg,#FFF0F7,#F3ECFF)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#050505', display: 'flex', alignItems: 'center', gap: 7 }}>
              <NeonMic size={16} color="#FF2D8D" /> Mes pages artiste
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {myPages.map(a => (
              <div key={a.id} onClick={() => navigate(`/artists/${a.id}`)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 12, padding: '8px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {a.photoURL ? <img src={a.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={18} color="white" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>{a.name}
                    <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 7, padding: '1px 6px' }}>ADMIN</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#65676B' }}>{(a.followers || []).length} abonnés</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions d'artistes */}
      {fArtists.length > 0 && (
        <>
          {secHd(low ? 'Artistes' : "Suggestions d'artistes", fArtists.length, 'artists')}
          <div style={rowStyle}>
            {fArtists.map(a => (
              <div key={a.id} className="card" style={{ flex: '0 0 150px', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                <div onClick={() => navigate(`/artists/${a.id}`)} style={{ width: 74, height: 74, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {a.photoURL ? <img src={a.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={26} color="white" />}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name} <HiCheckCircle size={14} color="#1877F2" />
                </div>
                <div style={{ fontSize: 11, color: '#65676B', margin: '1px 0 9px' }}>{(a.followers || []).length} abonnés</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(() => { const on = (a.followers || []).includes(currentUser?.uid);
                    return (
                      <button onClick={() => toggleFollowArtist(a.id)} className={on ? '' : 'btn-primary'}
                        style={{ flex: 1, borderRadius: 16, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                          ...(on ? { background: '#F0F2F5', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 } : {}) }}>
                        {on ? <><HiCheck size={13} /> Abonné</> : 'Suivre'}
                      </button>
                    ); })()}
                  <button onClick={() => navigate(`/artists/${a.id}/messages`)} style={{ flex: 1, background: '#F0F2F5', color: '#050505', border: 'none', borderRadius: 16, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Message</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Musiques pour vous */}
      {fTracks.length > 0 && (
        <>
          {secHd('Musiques pour vous', fTracks.length, 'music')}
          <div style={rowStyle}>
            {fTracks.map((t, i) => (
              <TrackCard key={t.id} track={t} index={i} playing={playingId === t.id} onToggle={toggleTrack} onArtist={aid => aid && navigate(`/artists/${aid}`)} />
            ))}
          </div>
        </>
      )}

      {/* Vidéos / Clips */}
      {fVideos.length > 0 && (
        <>
          {secHd('Vidéos / Clips / Articles', fVideos.length, 'videos')}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: fVideos.length > 1 ? '1fr 1fr' : '1fr', gap: 10, overflowX: 'auto', padding: '2px 0 12px', WebkitOverflowScrolling: 'touch' }}>
            {fVideos.map(v => (
              <div key={v.id} onClick={() => navigate(`/post/${v.id}`)} style={{ width: 230, cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  {v.thumbURL ? <img src={v.thumbURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <video src={v.mediaURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '6px 2px 0' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {v.artistPhoto ? <img src={v.artistPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={14} color="white" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.songTitle || v.content || 'Vidéo'}</div>
                    <div style={{ fontSize: 11, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.artistName}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Vide */}
      {fArtists.length === 0 && fTracks.length === 0 && fVideos.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{low ? 'Aucun résultat' : 'Aucun canal artiste pour le moment'}</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>{low ? 'Essayez un autre mot-clé' : 'Créez le vôtre et publiez vos sons !'}</p>
        </div>
      )}

      {/* Modale création */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, padding: '18px 20px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Créer un canal artiste</span>
              <button onClick={() => setOpen(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#65676B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiX size={18} /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de votre canal artiste"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #E4E6EB', fontSize: 15, marginBottom: 14, outline: 'none' }} />
            <button onClick={createArtist} disabled={creating} className="btn-primary" style={{ width: '100%', padding: '13px 0', borderRadius: 14, fontSize: 15, fontWeight: 700 }}>
              {creating ? 'Création…' : 'Créer le canal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
