// src/pages/Stats.jsx — Statistiques (compte + publications, format pro)
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { NeonChart, NeonEye } from '../components/NeonIcons';
import { HiArrowLeft, HiUserGroup, HiHeart, HiEye, HiCursorClick, HiChat, HiUser } from 'react-icons/hi';

export default function Stats() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), s => s.exists() && setMe(s.data()));
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'posts'), where('uid', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Stats posts:', err?.message || err));
    return () => unsub();
  }, [currentUser]);

  const S = useMemo(() => {
    const mine = posts.filter(p => !p.artistId && !p.shopId && !p.pageId);
    let reactions = 0, views = 0, clicks = 0, comments = 0;
    posts.forEach(p => {
      reactions += Object.keys(p.reactions || {}).length;
      views += p.views || 0;
      clicks += p.clicks || 0;
      comments += (p.comments || []).length;
    });
    const top = [...posts]
      .sort((a, b) => (Object.keys(b.reactions||{}).length + (b.views||0)) - (Object.keys(a.reactions||{}).length + (a.views||0)))
      .slice(0, 5);
    return { nPosts: posts.length, nMine: mine.length, reactions, views, clicks, comments, top };
  }, [posts]);

  const profile = me || userProfile || {};
  const followers = (profile.followers || []).length;
  const following = (profile.following || []).length;
  const friends = (profile.friends || []).length;
  const profileViews = profile.profileViews || 0;

  const Card = ({ icon, label, value, sub, c1 = '#63A9FF', c2 = '#1877F2' }) => (
    <div className="card" style={{ padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span className="icon-badge-3d" style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(145deg,${c1},${c2})`, flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{Number(value).toLocaleString()}</p>
        <p style={{ fontSize: 12, color: '#65676B' }}>{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '14px 12px 30px' }}>
      <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
        <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#3DD9C4,#12A48D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <NeonChart size={18} color="#fff" />
        </span>
        Statistiques
      </h2>
      <p style={{ fontSize: 12, color: '#65676B', margin: '8px 0 14px' }}>Vue d'ensemble de votre compte et de vos publications</p>

      <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Compte</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Card icon={<HiUserGroup size={22} color="#fff" />} label="Abonnés" value={followers} c1="#63A9FF" c2="#1877F2" />
        <Card icon={<HiUser size={22} color="#fff" />} label="Vues du profil" value={profileViews} c1="#8F7BFF" c2="#5E4BDB" />
        <Card icon={<HiUserGroup size={22} color="#fff" />} label="Abonnements" value={following} c1="#FFD84D" c2="#F2B300" />
        <Card icon={<HiUserGroup size={22} color="#fff" />} label="Amis" value={friends} c1="#3DD9C4" c2="#12A48D" />
      </div>

      <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Publications <span style={{ fontSize: 12, color: '#65676B', fontWeight: 600 }}>{S.nPosts} au total</span></p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Card icon={<HiHeart size={22} color="#fff" />} label="Réactions reçues" value={S.reactions} c1="#FF7AB8" c2="#FF2D8D" />
        <Card icon={<HiEye size={22} color="#fff" />} label="Vues publications" value={S.views} c1="#63A9FF" c2="#1877F2" />
        <Card icon={<HiChat size={22} color="#fff" />} label="Commentaires" value={S.comments} c1="#3DD9C4" c2="#12A48D" />
        <Card icon={<HiCursorClick size={22} color="#fff" />} label="Clics" value={S.clicks} c1="#FF9A5A" c2="#FF7A00" />
      </div>

      {S.top.length > 0 && (
        <>
          <p style={{ fontWeight: 800, fontSize: 14, margin: '4px 2px 8px' }}>Meilleures publications</p>
          {S.top.map(p => {
            const r = Object.keys(p.reactions || {}).length;
            return (
              <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} className="card" style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 8, borderRadius: 14, cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: '#F0F2F5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.mediaURL && p.mediaType === 'image'
                    ? <img src={p.mediaURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 18 }}>{p.mediaType === 'video' ? '🎬' : '📝'}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || 'Publication'}</p>
                  <p style={{ fontSize: 11.5, color: '#65676B', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span>❤ {r}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><NeonEye size={12} /> {(p.views || 0).toLocaleString()}</span>
                    <span>💬 {(p.comments || []).length}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </>
      )}

      {S.nPosts === 0 && (
        <div className="card" style={{ padding: 26, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucune publication encore</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Publiez pour voir vos statistiques apparaître ici.</p>
        </div>
      )}
    </div>
  );
}
