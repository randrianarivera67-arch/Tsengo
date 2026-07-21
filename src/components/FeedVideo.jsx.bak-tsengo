import { useState, useEffect, useRef } from 'react';
import { claimPlayback } from '../utils/mediaBus';

// FeedVideo — lecteur vidéo in-feed :
//  • Lecture auto rehefa hita (IntersectionObserver) raha tsy "Économiser données"
//  • Poster AZO ANTOKA : ny thumbURL dia aseho amin'ny <img> mifanindry (overlay)
//    mandra-panombohan'ny lecture — tsy mainty amin'ny APK natif intsony
//    (ny attribut poster="" irery dia tsy ampy amin'ny Android WebView)
export default function FeedVideo({ src, poster, dataSaver, style, onOpen, onOpenReels }) {
  const vidRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);   // efa nanomboka lecture na tsia
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (dataSaver) { setPlaying(false); return; }
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        vidRef.current?.play?.().then(() => { setPlaying(true); setStarted(true); }).catch(() => {});
      } else { vidRef.current?.pause?.(); setPlaying(false); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [dataSaver]);

  const handleClick = () => { (onOpen || onOpenReels)?.(); };

  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: (onOpen || onOpenReels) ? 'pointer' : 'default', background: '#000', ...style, height: style?.height }} onClick={handleClick}>
      <video ref={vidRef} src={src}
        onPlay={() => { setStarted(true); claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); }); }}
        preload="none"
        style={{ ...style, cursor: undefined, display: 'block' }} muted={muted} loop playsInline />

      {/* Poster (thumbURL) — overlay <img> azo antoka amin'ny WebView.
          Manjavona mora rehefa tena manomboka ny lecture. */}
      {poster && (
        <img src={poster} alt="" loading="lazy" decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: style?.objectFit || 'cover', display: 'block',
            opacity: (started && playing) ? 0 : 1, transition: 'opacity .35s ease', pointerEvents: 'none' }} />
      )}
      {/* Raha tsy misy poster fa tsy mbola nilalao : lokolokom-mainty tsara tarehy fa tsy mainty foana */}
      {!poster && !started && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#1B84FF18,#0c0c12)', pointerEvents: 'none' }} />
      )}

      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 54, height: 54, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
            <span style={{ color: 'white', fontSize: 22, marginLeft: 3 }}>▶</span>
          </div>
        </div>
      )}
      {playing && (
        <button onClick={e => { e.stopPropagation(); setMuted(m => { const nx = !m; if (vidRef.current) { vidRef.current.muted = nx; if (!nx) vidRef.current.play?.().catch(() => {}); } return nx; }); }}
          style={{ position: 'absolute', bottom: 10, right: 10, width: 34, height: 34, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 15 }}>{muted ? '🔇' : '🔊'}</span>
        </button>
      )}
    </div>
  );
}
