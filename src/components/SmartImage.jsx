import { useState } from 'react';

export default function SmartImage({ src, alt = '', style = {}, onClick, minH = 240 }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const radius = style.borderRadius != null ? style.borderRadius : 0;
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: style.width || '100%',
        overflow: 'hidden',
        borderRadius: radius,
        minHeight: loaded ? 0 : minH,
        background: loaded ? 'transparent' : '#f0f2f5',
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
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(true); }}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity .35s ease', display: 'block' }}
      />
    </div>
  );
}
