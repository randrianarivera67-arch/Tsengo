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

/**
 * Mampifanandrify ny URL feno sy ny vignette.
 * @returns {{u:string,d:string}[]}  u = URL feno (onOpen) · d = aseho (vignette)
 *
 * ZAVA-DEHIBE : ny `u` dia mitazona ny URL TANY AM-BOALOHANY foana. Ny mpiantso
 * sasany (PostDetail) dia manao `mediaURLs.indexOf(u)` — raha vignette no
 * alefa dia -1 ny valiny, ka diso ny sary sokafana.
 */
export function pairPhotos(urls, thumbs) {
  const U = Array.isArray(urls) ? urls : [];
  const T = Array.isArray(thumbs) ? thumbs : [];
  const out = [];
  for (let i = 0; i < U.length; i++) {
    const u = U[i];
    if (!u) continue;                       // index tsy mifindra : T[i] mifanaraka
    out.push({ u, d: T[i] || u });          // tsy misy vignette → sary feno
  }
  return out;
}

export default function PhotoCarousel({ urls = [], thumbs = [], onOpen }) {
  const list = pairPhotos(urls, thumbs);
  const n = list.length;
  if (!n) return null;
  const open = (u) => (e) => { e.stopPropagation(); onOpen && onOpen(u); };
  const GAP = 2;

  const Cell = ({ p, style, badge }) => (
    <div onClick={open(p.u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', ...style }}>
      <Img u={p.d} />
      {badge != null && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>+{badge}</div>
      )}
    </div>
  );

  if (n === 1) {
    return (
      <div onClick={open(list[0].u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eceff3', maxHeight: '72vh' }}>
        <Img u={list[0].d} />
      </div>
    );
  }
  if (n === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP, aspectRatio: '2 / 1' }}>
        <Cell p={list[0]} /><Cell p={list[1]} />
      </div>
    );
  }
  if (n === 3) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
        <Cell p={list[0]} style={{ gridColumn: '1 / span 2' }} />
        <Cell p={list[1]} /><Cell p={list[2]} />
      </div>
    );
  }
  const shown = list.slice(0, 4);
  const rest = n - 4;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
      {shown.map((p, i) => (
        <Cell key={i} p={p} badge={i === 3 && rest > 0 ? rest : null} />
      ))}
    </div>
  );
}
