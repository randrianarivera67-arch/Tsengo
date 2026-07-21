// src/pages/Saved.jsx — Enregistrements (publications & vidéos sauvegardées)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { SkeletonList } from '../components/Skeleton';
import VideoThumb from '../components/VideoThumb';
import { useAuth } from '../context/AuthContext';
import { HiBookmark, HiTrash, HiChevronRight, HiUserGroup, HiArrowLeft } from 'react-icons/hi';

export default function Saved() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const savedIds = userProfile?.saved || [];

  useEffect(() => {
    let alive = true;
    if (savedIds.length === 0) { setItems([]); setLoaded(true); return; }
    Promise.all(savedIds.map(id =>
      getDoc(doc(db, 'posts', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null).catch(() => null)
    )).then(list => {
      if (!alive) return;
      setItems(list.filter(Boolean).reverse()); // les plus récents enregistrés en premier
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [savedIds.join(',')]);

  async function removeSaved(postId) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { saved: arrayRemove(postId) });
      setUserProfile(p => ({ ...p, saved: (p.saved || []).filter(id => id !== postId) }));
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate(-1)} aria-label="Retour"
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HiArrowLeft size={19} />
        </button>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiBookmark size={24} color="#F2B300" /> Enregistrements
        </h2>
      </div>

      {!loaded && <SkeletonList rows={5} avatar={false} />}

      {loaded && items.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <HiBookmark size={40} color="#F2B300" style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucun enregistrement</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>
            Touchez ⋮ sur une publication ou une vidéo puis « Enregistrer » pour la retrouver ici.
          </p>
        </div>
      )}

      {items.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, cursor: 'pointer' }}
            onClick={() => navigate(`/post/${p.id}`)}>
            {/* Miniature */}
            {p.mediaURL ? (
              p.isMusic
                ? <div style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0, overflow: 'hidden', position: 'relative', background: p.thumbURL ? `url(${p.thumbURL}) center/cover` : 'linear-gradient(145deg,#FF6FA5,#0c0c12)' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, background: p.thumbURL ? 'rgba(0,0,0,.45)' : 'transparent' }}>
                      {[9, 17, 12, 24, 15, 28, 13, 20, 10].map((h, i) => <div key={i} style={{ width: 2.5, height: h, borderRadius: 2, background: i < 5 ? '#FF6FA5' : '#FF2D8D' }} />)}
                    </div>
                  </div>
                : p.mediaType === 'video'
                  ? <VideoThumb src={p.mediaURL} poster={p.thumbURL} style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0 }} playSize={24} minH={64} />
                  : <img src={p.mediaURL} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 10, background: '#E7F0FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>📝</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>
                {p.authorName}
                {p.groupName && <span style={{ color: '#65676B', fontWeight: 500 }}> · <HiUserGroup size={11} style={{ verticalAlign: '-1px' }} /> {p.groupName}</span>}
              </p>
              <p style={{ fontSize: 13, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.isMusic ? (p.songTitle || 'Musique') : (p.content || (p.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo'))}
              </p>
              <p style={{ fontSize: 11, color: '#65676B', marginTop: 2 }}>
                {p.isMusic ? (p.mediaType === 'video' ? 'Clip enregistré' : 'Musique enregistrée') : p.mediaType === 'video' ? 'Vidéo enregistrée' : 'Publication enregistrée'}
              </p>
            </div>
            <HiChevronRight size={18} color="#65676B" style={{ flexShrink: 0 }} />
          </div>
          <button onClick={() => removeSaved(p.id)}
            style={{ width: '100%', padding: '9px 0', background: '#F0F2F5', border: 'none', borderTop: '1px solid #E4E6EB', cursor: 'pointer', color: '#FF2D8D', fontSize: 12, fontWeight: 700, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <HiTrash size={14} /> Retirer des enregistrements
          </button>
        </div>
      ))}
    </div>
  );
}
