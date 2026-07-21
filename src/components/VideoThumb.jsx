import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// VideoThumb — miniature vidéo AZO ANTOKA amin'ny APK natif (Android WebView).
//
// OLANA voavaha : ao amin'ny WebService natif, ny <video preload="metadata">
// (tsy misy poster) dia TSY mandoko frame → miseho mainty ny thumbnail (story,
// enregistrés, profil...). Ity component ity dia :
//   1) Raha misy `poster` (thumbURL) → aseho amin'ny <img> (shimmer + miaina) —
//      azo antoka 100% amin'ny WebView.
//   2) Raha tsy misy poster → andramana alaina frame client-side (canvas). Raha
//      mahomby → aseho. Raha tsy mety (CORS/taint) → gradient madio + bouton ▶.
//   → TSY MAINTY MIHITSY, ary manana bouton play mazava foana.
// ─────────────────────────────────────────────────────────────────────────────

const _cache = new Map(); // mediaURL -> dataURL (na 'fail')

export default function VideoThumb({
  src, poster, onClick, style = {}, radius,
  playSize = 46, minH = 160, className = '',
}) {
  const [thumb, setThumb] = useState(poster || _cache.get(src) || null);
  const [loaded, setLoaded] = useState(false);
  const [triedCapture, setTriedCapture] = useState(!!poster);
  const br = radius != null ? radius : (style.borderRadius != null ? style.borderRadius : 10);

  useEffect(() => {
    setThumb(poster || _cache.get(src) || null);
    setLoaded(false);
    setTriedCapture(!!poster);
  }, [src, poster]);

  // Fallback : maka frame avy amin'ny vidéo (raha tsy misy poster)
  useEffect(() => {
    if (poster || triedCapture || !src) return;
    const cached = _cache.get(src);
    if (cached) { if (cached !== 'fail') setThumb(cached); setTriedCapture(true); return; }

    let cancelled = false;
    let settled = false;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const finish = (dataUrl) => {
      if (settled || cancelled) return;
      settled = true;
      _cache.set(src, dataUrl || 'fail');
      if (!cancelled) { if (dataUrl) setThumb(dataUrl); setTriedCapture(true); }
      try { video.src = ''; video.load(); } catch {}
    };

    video.onloadedmetadata = () => {
      try { video.currentTime = Math.min(0.3, (video.duration || 1) / 2); }
      catch { finish(null); }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const vw = video.videoWidth || 480, vh = video.videoHeight || 270;
        const w = Math.min(480, vw);
        const h = Math.max(1, Math.round((vh / vw) * w));
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        finish(canvas.toDataURL('image/jpeg', 0.7)); // taint → throw → fail madio
      } catch { finish(null); }
    };
    video.onerror = () => finish(null);
    const guard = setTimeout(() => finish(null), 7000);
    try { video.src = src; } catch { finish(null); }

    return () => { cancelled = true; clearTimeout(guard); };
  }, [src, poster, triedCapture]);

  return (
    <div onClick={onClick} className={className}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: br,
        background: '#0c0c12', cursor: onClick ? 'pointer' : (style.cursor || 'default'),
        width: style.width || '100%', height: style.height, minHeight: style.height ? undefined : (thumb ? 0 : minH),
        ...style }}>
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: style.objectFit || 'cover', display: 'block',
            opacity: loaded ? 1 : 0, transform: loaded ? 'scale(1)' : 'scale(1.06)',
            transition: 'opacity .45s ease, transform .6s cubic-bezier(.22,1,.36,1)' }} />
      ) : (
        // Tsy misy thumb (mbola maka na tsy mety) : gradient madio fa tsy mainty
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(145deg,#1B84FF22,#0c0c12)' }} />
      )}
      {/* Bouton play — mazava foana */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: playSize, height: playSize, background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <span style={{ color: 'white', fontSize: playSize * 0.42, marginLeft: 2 }}>▶</span>
        </div>
      </div>
    </div>
  );
}
