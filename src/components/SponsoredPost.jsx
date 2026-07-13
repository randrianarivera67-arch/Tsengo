// src/components/SponsoredPost.jsx
// Annonce affichée comme une PUBLICATION dans le fil (photo ou vidéo).
// Les annonces proviennent de la collection Firestore "ads" (active == true).
// Si aucune annonce active → une "house ad" Trengo s'affiche (auto-promo).
import { useState, useEffect } from 'react';
import {
  collection, query, where, limit, onSnapshot, doc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../firebase';

const HOUSE_AD = {
  id: '__house__',
  sponsor: 'Trengo',
  logo: '/trengo-logo.png',
  text: 'Trengo — ny tambajotra sosialy malagasy 🇲🇬. Zarao, mifandraisa, mifankahalala.',
  mediaType: 'image',
  mediaURL: '/trengo-icon-512.png',
  link: 'https://trengo-mg.vercel.app',
  cta: 'Hitsidika',
};

// Hook : charge les annonces actives (temps réel). Fallback → house ad.
export function useFeedAds() {
  const [ads, setAds] = useState([]);
  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'ads'), where('active', '==', true), limit(20));
      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAds(list.length ? list : [HOUSE_AD]);
        },
        () => setAds([HOUSE_AD])
      );
    } catch (e) {
      setAds([HOUSE_AD]);
    }
    return () => unsub();
  }, []);
  return ads;
}

function trackClick(ad) {
  if (!ad || ad.id === '__house__') return;
  try { updateDoc(doc(db, 'ads', ad.id), { clicks: increment(1) }); } catch (e) {}
}

export default function SponsoredPost({ ad }) {
  if (!ad) return null;
  const open = () => {
    trackClick(ad);
    if (ad.link) window.open(ad.link, '_blank', 'noopener');
  };
  return (
    <div className="card post-card animate-fade" style={{ marginBottom: 14, border: '1px solid #a855f733' }}>
      <div style={{ background: 'linear-gradient(135deg,#7c3aed18,#a855f718)', borderBottom: '1px solid #a855f733', padding: '5px 14px' }}>
        <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600 }}>⚡ Sponsorisé</span>
      </div>

      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        {ad.logo && (
          <img src={ad.logo} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Poppins' }}>{ad.sponsor || 'Annonce'}</div>
          <div style={{ fontSize: 11, color: '#8a8a8a' }}>Annonce · Sponsorisé</div>
        </div>
      </div>

      {ad.text && (
        <div style={{ padding: '10px 16px 12px', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{ad.text}</div>
      )}

      {ad.mediaURL && (ad.mediaType === 'video' ? (
        <video
          src={ad.mediaURL}
          poster={ad.thumbURL || undefined}
          controls
          playsInline
          onClick={open}
          style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', background: '#000', cursor: 'pointer' }}
        />
      ) : (
        <img
          src={ad.mediaURL}
          alt=""
          onClick={open}
          style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
        />
      ))}

      <div style={{ padding: '12px 16px' }}>
        <button
          onClick={open}
          style={{
            width: '100%', padding: '11px 0', border: 'none', borderRadius: 12, cursor: 'pointer',
            fontWeight: 700, fontSize: 14, fontFamily: 'Poppins', color: '#fff',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          }}
        >
          {ad.cta || 'En savoir plus'}
        </button>
      </div>
    </div>
  );
}
