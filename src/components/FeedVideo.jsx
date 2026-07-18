import { useState, useEffect, useRef } from 'react';
import { claimPlayback } from '../utils/mediaBus';
export default function FeedVideo({ src, poster, dataSaver, style, onOpen }) {
  const vidRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    if (dataSaver) { setPlaying(false); return; }
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        vidRef.current?.play?.().catch(() => {}); setPlaying(true);
      } else { vidRef.current?.pause?.(); setPlaying(false); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [dataSaver]);
  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: onOpen ? 'pointer' : 'default' }} onClick={() => { onOpen?.(); }}>
      <video ref={vidRef} src={src}
        onPlay={() => claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); })}
        poster={poster || undefined} preload={(dataSaver || poster) ? 'none' : 'metadata'}
        style={style} muted={muted} loop playsInline />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 50, height: 50, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 20 }}>▶</span>
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
