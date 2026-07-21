import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SmartImage — sary miseho MADIO (tsy tapatapaka kely kely) :
//   • Shimmer (skeleton) mandra-pahavitan'ny chargement FENO
//   • Ny sary dia miseho AMIN'NY INDRAY MIPI-MASO ihany (opacity 0→1) rehefa vita
//     load 100% — tsy hita mihitsy ny fisehoana progressif "tapatapaka"
//   • Effet "miaina" (breathe) : miondrika kely (scale 1.06→1) rehefa tonga,
//     mamerina endrika velona sy matihanina
//   • decoding async + fanovana onError madio (tsy misy sary maloto/vaky)
// ─────────────────────────────────────────────────────────────────────────────

export default function SmartImage({ src, alt = '', style = {}, onClick, minH = 240, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);
  const radius = style.borderRadius != null ? style.borderRadius : 0;

  // Miandry ny decode FENO alohan'ny hampisehoana (tsy misy "tapatapaka")
  async function handleLoad(e) {
    const img = e.currentTarget;
    try { if (img.decode) await img.decode(); } catch { /* ignore */ }
    setLoaded(true);
  }

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        width: style.width || '100%',
        overflow: 'hidden',
        borderRadius: radius,
        minHeight: loaded ? 0 : minH,
        background: loaded ? 'transparent' : '#eceff3',
        cursor: style.cursor,
        display: 'block',
      }}
    >
      {!loaded && !failed && (
        <div
          className="skeleton-shimmer"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: radius }}
        />
      )}
      {failed ? (
        <div style={{ width: '100%', minHeight: minH, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#e9edf3,#dfe4ec)', color: '#9aa3af', fontSize: 26 }}>🖼️</div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={() => { setFailed(true); setLoaded(true); }}
          style={{
            ...style,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scale(1)' : 'scale(1.06)',
            transition: 'opacity .45s ease, transform .6s cubic-bezier(.22,1,.36,1)',
            display: 'block',
            willChange: 'opacity, transform',
          }}
        />
      )}
    </div>
  );
}
