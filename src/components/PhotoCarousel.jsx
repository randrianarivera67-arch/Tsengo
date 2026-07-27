// src/components/PhotoCarousel.jsx
// Grille photo façon Facebook : 1 à 4 visibles, "+N" sur la 4e si plus.
// Clic sur une image => onOpen(url). Sary rehetra : shimmer + fondu + "miaina"
// (effet SmartImage), ka miseho MADIO (tsy tapatapaka kely kely) na aiza na aiza.
import { useState, useRef, useEffect } from 'react';

// URLs deja affichees au moins une fois : permet de savoir DES LE PREMIER
// RENDU qu'une image n'a pas besoin de fondu (donc aucun clignotement).
const seenUrls = new Set();
function markSeen(u) {
  if (seenUrls.size > 800) seenUrls.clear();   // borne memoire
  seenUrls.add(u);
}

function Img({ u }) {
  const ref = useRef(null);
  // Etat initial SYNCHRONE : deja vue -> affichee pleine opacite tout de suite.
  const [loaded, setLoaded] = useState(() => seenUrls.has(u));
  useEffect(() => {
    setLoaded(seenUrls.has(u));                // si l'URL change
    const im = ref.current;
    if (im && im.complete && im.naturalWidth > 0) { markSeen(u); setLoaded(true); }
  }, [u]);
  return (
    <>
      {!loaded && <div className="skeleton-shimmer" style={{ position: 'absolute', inset: 0 }} />}
      <img ref={ref} src={u} alt="" loading="lazy" decoding="async"
        onLoad={e => { const im = e.currentTarget; (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { markSeen(u); setLoaded(true); }); }}
        onError={() => { markSeen(u); setLoaded(true); }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          opacity: loaded ? 1 : 0, transform: loaded ? 'scale(1)' : 'scale(1.06)',
          transition: loaded ? 'opacity .4s ease, transform .5s cubic-bezier(.22,1,.36,1)' : 'none' }} />
    </>
  );
}

export default function PhotoCarousel({ urls = [], onOpen }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const n = list.length;
  if (!n) return null;
  const open = (u) => (e) => { e.stopPropagation(); onOpen && onOpen(u); };
  const GAP = 2;

  const Cell = ({ u, style, badge }) => (
    <div onClick={open(u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', ...style }}>
      <Img u={u} />
      {badge != null && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>+{badge}</div>
      )}
    </div>
  );

  if (n === 1) {
    return (
      <div onClick={open(list[0])} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', maxHeight: 520 }}>
        <Img u={list[0]} />
      </div>
    );
  }
  if (n === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP, aspectRatio: '2 / 1' }}>
        <Cell u={list[0]} /><Cell u={list[1]} />
      </div>
    );
  }
  if (n === 3) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
        <Cell u={list[0]} style={{ gridColumn: '1 / span 2' }} />
        <Cell u={list[1]} /><Cell u={list[2]} />
      </div>
    );
  }
  const shown = list.slice(0, 4);
  const rest = n - 4;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
      {shown.map((u, i) => (
        <Cell key={i} u={u} badge={i === 3 && rest > 0 ? rest : null} />
      ))}
    </div>
  );
}
