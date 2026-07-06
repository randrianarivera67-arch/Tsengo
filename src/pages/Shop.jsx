// src/pages/Shop.jsx — Boutique (parcourir toutes les publications "Vendre")
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { HiShoppingBag, HiLocationMarker } from 'react-icons/hi';

export default function Shop() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('isSale', '==', true), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    }, err => { console.error('Boutique:', err?.message || err); setLoaded(true); });
    return () => unsub();
  }, []);

  return (
    <div style={{ padding: '14px 12px' }}>
      <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' }}>
          <HiShoppingBag size={18} color="white" />
        </span>
        Boutique
      </h2>
      <p style={{ fontSize: 12, color: '#65676B', marginBottom: 14 }}>Toutes les annonces de vente publiées sur Traingo</p>

      {!loaded && <p style={{ textAlign: 'center', color: '#65676B', padding: 30, fontSize: 14 }}>Chargement...</p>}
      {loaded && items.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucun article en vente pour le moment</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Utilisez le bouton « Vendre » depuis l'accueil pour publier un article.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(p => (
          <div key={p.id} onClick={() => navigate(`/post/${p.id}`)}
            className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
            {p.mediaURL ? (
              p.mediaType === 'video'
                ? <video src={p.mediaURL} poster={p.thumbURL || undefined} muted style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', background: '#000' }} />
                : <img src={p.mediaURL} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: 130, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🏷️</div>
            )}
            <div style={{ padding: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#FF2D8D' }}>{p.price ? `${Number(p.price).toLocaleString()} Ar` : 'Prix à discuter'}</p>
              <p style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.content}</p>
              {p.lieu && <p style={{ fontSize: 11, color: '#65676B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}><HiLocationMarker size={11} />{p.lieu}</p>}
              <p style={{ fontSize: 11, color: '#65676B', marginTop: 4 }}>{p.authorName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
