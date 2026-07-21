// src/components/MusicPostCard.jsx
// Carte "onde musicale + pochette" réutilisable : fil, groupes, partages, détail.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeonMic } from './NeonIcons';
import { claimPlayback } from '../utils/mediaBus';

const GRADS = [['#FF6FA5', '#FF2D8D'], ['#A66BFF', '#7A2DFF'], ['#3DBEFF', '#1877F2']];

function waveBars(seed, n = 48) {
  let s = 0; for (let i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) % 100000;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n }, (_, i) => 9 + Math.abs(Math.sin(i * 0.4 + s)) * 42 + rnd() * 14);
}
const fmt = d => (!d || !isFinite(d)) ? '' : Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0');

export default function MusicPostCard({ post, index = 0, height = 130 }) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState('');
  const audioRef = useRef(null);
  const bars = useRef(waveBars(post.id || index));
  const grad = GRADS[index % 3];
  const isVideo = post.mediaType === 'video';

  useEffect(() => {
    if (isVideo || !post.mediaURL) return;
    const a = new Audio(); a.preload = 'metadata'; a.src = post.mediaURL;
    const on = () => setDur(fmt(a.duration));
    a.addEventListener('loadedmetadata', on);
    return () => { a.removeEventListener('loadedmetadata', on); a.src = ''; };
  }, [post.mediaURL, isVideo]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const cardRef = useRef(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlaying(false);
      }
    }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function toggle(e) {
    e?.stopPropagation();
    if (!post.mediaURL) return;
    if (!audioRef.current) { audioRef.current = new Audio(post.mediaURL); audioRef.current.onended = () => setPlaying(false); }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { claimPlayback(() => { audioRef.current?.pause(); setPlaying(false); }); audioRef.current.play().catch(() => {}); setPlaying(true); }
  }

  if (isVideo) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative' }}>
        <video src={post.mediaURL} poster={post.thumbURL} controls playsInline onPlay={e => { const v = e.currentTarget; claimPlayback(() => { try { v.pause(); } catch {} }); }} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
        {(post.songTitle || post.artistName) && (
          <div style={{ position: 'absolute', left: 10, bottom: 10, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.7)', pointerEvents: 'none' }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{post.songTitle}</div>
            <div style={{ fontSize: 11.5, opacity: .9 }}>{post.artistName}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={cardRef} style={{ borderRadius: 12, overflow: 'hidden', background: '#0c0c12' }}>
      <div style={{ position: 'relative', height, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {post.thumbURL && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${post.thumbURL})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(.45)', zIndex: 0 }} />}

        <div onClick={e => { e.stopPropagation(); post.artistId && navigate(`/artists/${post.artistId}`); }}
          style={{ position: 'absolute', top: 10, left: 10, width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,.85)', zIndex: 3, cursor: post.artistId ? 'pointer' : 'default', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {post.artistPhoto ? <img src={post.artistPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={16} color="white" />}
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5, padding: '0 14px', zIndex: 1 }}>
          {bars.current.map((h, i) => (
            <div key={i} style={{ width: 3, height: h, borderRadius: 3, background: i / bars.current.length < 0.5 ? grad[0] : grad[1], opacity: playing ? 0.95 : 0.7 }} />
          ))}
        </div>

        <div onClick={toggle} style={{ position: 'relative', zIndex: 2, width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.4)' }}>
          {playing
            ? <svg width="17" height="19" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
            : <svg width="17" height="19" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}><path d="M6 4l14 8-14 8z" /></svg>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '9px 12px 11px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.songTitle || 'Sans titre'}</div>
          <div style={{ fontSize: 11.5, color: '#b9b9c2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.artistName}{post.genre ? ` · ${post.genre}` : ''}
          </div>
        </div>
        {dur && <div style={{ fontSize: 11.5, color: '#e6e6ea', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{dur}</div>}
      </div>
    </div>
  );
}
