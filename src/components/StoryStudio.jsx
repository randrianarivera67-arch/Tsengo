// src/components/StoryStudio.jsx
// ══════════════════════════════════════════════════════════════════════════
// Studio Story (format Facebook) — Texte / Photo / Vidéo mandalo studio kely
// alohan'ny publication : texte, effets, audience, musique (extraits artistes),
// raccourci temps. TSY mampiasa react-icons (inline SVG) mba tsy hisy blank page.
// ══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToTelegram } from '../utils/telegram';
import { trimVideoTo30s } from '../utils/trimVideo';
import { captureVideoThumb } from '../utils/videoThumb';

// ── Fonds texte (mitovy amin'ny efa misy) ──
const BG = [
  'linear-gradient(135deg,#1877F2,#63A9FF)',
  'linear-gradient(135deg,#FF2D8D,#FF7AB8)',
  'linear-gradient(135deg,#F2B300,#FFE066)',
  'linear-gradient(135deg,#8F6BFF,#B49BFF)',
  'linear-gradient(135deg,#12A48D,#3DD9C4)',
  'linear-gradient(135deg,#FF7A00,#FF9A3D)',
  'linear-gradient(135deg,#0F2027,#2C5364)',
  '#050505',
];

// ── Effets/filtres (CSS filter — mora, tsy misy ré-encodage) ──
const FILTERS = [
  { key: 'none',      label: 'Original', css: 'none' },
  { key: 'clarendon', label: 'Clarendon', css: 'contrast(1.15) saturate(1.35) brightness(1.05)' },
  { key: 'smooth',    label: 'Lissage',  css: 'blur(0.5px) brightness(1.06) saturate(1.05) contrast(1.02)' },
  { key: 'beauty',    label: 'Beauté',   css: 'blur(0.7px) brightness(1.09) saturate(1.12) contrast(1.03)' },
  { key: 'bw',        label: 'N&B',      css: 'grayscale(1) contrast(1.1)' },
  { key: 'warm',      label: 'Chaud',    css: 'sepia(0.35) saturate(1.4) brightness(1.05)' },
  { key: 'cool',      label: 'Froid',    css: 'saturate(1.2) hue-rotate(15deg) brightness(1.03) contrast(1.05)' },
  { key: 'vivid',     label: 'Vif',      css: 'saturate(1.65) contrast(1.2)' },
  { key: 'vintage',   label: 'Vintage',  css: 'sepia(0.55) contrast(0.95) brightness(1.05) saturate(1.2)' },
];
const cssFor = key => (FILTERS.find(f => f.key === key) || FILTERS[0]).css;

const TXT_COLORS = ['#FFFFFF', '#050505', '#F2B300', '#FF2D8D', '#3DD9C4'];
const CLIP_SECONDS = 15; // raccourci temps musique (tsy hira complet)

// ── Icônes inline SVG (tsy react-icons) ──
const Ic = {
  x:     s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  back:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  text:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 6v-.5M12 6v13M8.5 19h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  photo: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><circle cx="8.5" cy="10" r="1.6" fill="currentColor"/><path d="M4 17l4.5-4.5 3 3L15 12l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  video: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="12.5" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.9"/><path d="M15.5 10l5-2.6v9.2l-5-2.6" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"/></svg>,
  music: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 18V6l10-2v11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2.2" stroke="currentColor" strokeWidth="1.9"/><ellipse cx="16.5" cy="15" rx="2.5" ry="2.2" stroke="currentColor" strokeWidth="1.9"/></svg>,
  fx:    s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M18 15l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  globe: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/><ellipse cx="12" cy="12" rx="3.5" ry="8.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.6"/></svg>,
  people:s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7"/><circle cx="16.5" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M15 14.8c2.4.2 4.3 2 4.3 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  play:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>,
  pause: s => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>,
};

const fmt = d => (!d || !isFinite(d)) ? '0:00' : Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0');

// ══════════════════════════════════════════════════════════════════════════
// Lecteur musique story (self-contained) — ampiasaina ao amin'ny visionneuse.
// Miloka avy amin'ny "start", mijanona rehefa pause na miova story.
// ══════════════════════════════════════════════════════════════════════════
function chooseDefaultTrack(list) {
  if (!list || !list.length) return null;
  const recent = list.slice(0, 8);
  const popular = [...list].sort((a, b) => (b._pop || 0) - (a._pop || 0)).slice(0, 8);
  const pool = [...recent, ...popular];
  const t = pool[Math.floor(Math.random() * pool.length)] || list[0];
  return { url: t.url, title: t.title, artist: t.artist, start: 0 };
}

export function StoryMusicPlayer({ url, start = 0, paused = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    a.preload = 'auto';
    a.loop = true;
    ref.current = a;
    const onMeta = () => { try { a.currentTime = start || 0; } catch {} if (!paused) a.play().catch(() => {}); };
    a.addEventListener('loadedmetadata', onMeta);
    a.play().catch(() => {});
    return () => {
      try { a.pause(); a.removeEventListener('loadedmetadata', onMeta); a.src = ''; } catch {}
      ref.current = null;
    };
  }, [url]); // eslint-disable-line
  useEffect(() => {
    const a = ref.current; if (!a) return;
    if (paused) { try { a.pause(); } catch {} }
    else { a.play().catch(() => {}); }
  }, [paused]);
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// STUDIO
// ══════════════════════════════════════════════════════════════════════════
export default function StoryStudio({ mode: initialMode = 'menu', currentUser, userProfile, onClose, onPublished }) {
  const [mode, setMode]         = useState(initialMode);   // 'menu'|'text'|'photo'|'video'
  const [file, setFile]         = useState(null);
  const [previewURL, setPreviewURL] = useState('');
  const [filterKey, setFilterKey]   = useState('none');
  const [caption, setCaption]       = useState('');
  const [captionPos, setCaptionPos] = useState({ x: 0.5, y: 0.8 });
  const [sonMode, setSonMode]       = useState('music'); // 'music' (muet+musique) | 'original'
  useEffect(() => { if (mode === 'video') { setSonMode('original'); setMusic(null); } }, [mode]);
  const previewRef = useRef(null);
  const capDragRef = useRef(false);
  const [audience, setAudience]     = useState('public');  // 'public'|'friends'|'me'
  const [music, setMusic]           = useState(null);      // {url,title,artist,start}
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState(0);

  // Texte
  const [text, setText]         = useState('');
  const [bgIdx, setBgIdx]       = useState(0);
  const [fontSize, setFontSize] = useState(34);
  const [align, setAlign]       = useState('center');
  const [txtColor, setTxtColor] = useState('#FFFFFF');

  // Panneaux
  const [panel, setPanel]       = useState(null);          // null|'fx'|'music'|'caption'|'audience'

  // Musique
  const [tracks, setTracks]     = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [previewTrack, setPreviewTrack] = useState(null);  // id en cours d'écoute
  const previewAudioRef = useRef(null);

  const fileInputRef = useRef(null);
  const videoElRef   = useRef(null);

  // Ouvrir automatiquement le sélecteur de fichier pour photo/vidéo
  useEffect(() => {
    if ((mode === 'photo' || mode === 'video') && !file) {
      setTimeout(() => fileInputRef.current?.click(), 60);
    }
  }, [mode]); // eslint-disable-line

  useEffect(() => { if (mode === 'photo' || mode === 'video') loadTracks(); }, [mode]); // eslint-disable-line

  // Charger les extraits musique (posts isMusic audio) — 1 seul orderBy, tri client (pas d'index composite)
  async function loadTracks() {
    if (tracksLoaded) return;
    try {
      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.isMusic && p.mediaType === 'audio' && p.mediaURL && (p.artistId || p.artistName))
        .map(p => ({ id: p.id, url: p.mediaURL, title: p.songTitle || p.content || 'Sans titre', artist: p.artistName || '', _pop: Object.keys(p.reactions || {}).length + ((p.comments || []).length) }));
      setTracks(list);
      if (list.length && !music && mode === 'photo') setMusic(chooseDefaultTrack(list));
    } catch (e) { /* silencieux */ }
    setTracksLoaded(true);
  }

  useEffect(() => () => { try { previewAudioRef.current?.pause(); } catch {} }, []);

  function togglePreview(tr) {
    try {
      if (previewTrack === tr.id) {
        previewAudioRef.current?.pause();
        setPreviewTrack(null);
        return;
      }
      previewAudioRef.current?.pause();
      const a = new Audio(tr.url);
      a.currentTime = tr._start || 0;
      previewAudioRef.current = a;
      a.play().catch(() => {});
      setPreviewTrack(tr.id);
      a.onended = () => setPreviewTrack(null);
    } catch {}
  }

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) { if (mode !== 'menu') setMode('menu'); return; }
    setFile(f);
    try { setPreviewURL(URL.createObjectURL(f)); } catch {}
  }

  // ── Compositer PHOTO sur canvas 1080×1920 (filtre + légende cuits) ──
  function bakePhoto() {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const W = 1080, H = 1920;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            // Fond flou (raha tsy 9:16 ilay sary)
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
            try {
              ctx.filter = 'blur(28px) brightness(.55)';
              const s2 = Math.max(W / img.width, H / img.height) * 1.25;
              ctx.drawImage(img, (W - img.width * s2) / 2, (H - img.height * s2) / 2, img.width * s2, img.height * s2);
              ctx.filter = 'none';
            } catch {}
            // Image principale (contain) + filtre
            const s = Math.min(W / img.width, H / img.height);
            const dw = img.width * s, dh = img.height * s;
            try { ctx.filter = cssFor(filterKey); } catch {}
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
            try { ctx.filter = 'none'; } catch {}
            // Légende (caption)
            if (caption.trim()) {
              const fs = 54;
              ctx.font = `800 ${fs}px Poppins, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const maxW = W - 120;
              const words = caption.trim().split(/\s+/);
              const lines = []; let line = '';
              for (const w of words) {
                const test = line ? line + ' ' + w : w;
                if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
                else line = test;
              }
              if (line) lines.push(line);
              const lh = fs * 1.25;
              const cxp = captionPos.x * W;
              let y = captionPos.y * H - ((lines.length - 1) * lh) / 2;
              for (const ln of lines) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
                ctx.fillStyle = '#fff';
                ctx.fillText(ln, cxp, y);
                ctx.restore();
                y += lh;
              }
            }
            canvas.toBlob(b => {
              if (!b) return reject(new Error('canvas'));
              resolve(new File([b], 'story.jpg', { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
          } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('image load'));
        img.src = previewURL;
      } catch (err) { reject(err); }
    });
  }

  function capPointerDown() { capDragRef.current = true; }
  function capPointerMove(e) {
    if (!capDragRef.current || !previewRef.current) return;
    const r = previewRef.current.getBoundingClientRect();
    const cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    let x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
    x = Math.max(0.12, Math.min(0.88, x)); y = Math.max(0.08, Math.min(0.92, y));
    setCaptionPos({ x, y });
  }
  function capPointerUp() { capDragRef.current = false; }
  function toggleSon() {
    if (sonMode === 'music') { setSonMode('original'); setMusic(null); }
    else { setSonMode('music'); if (!music) setMusic(chooseDefaultTrack(tracks)); }
  }

  const baseDoc = () => ({
    uid: currentUser.uid,
    authorName: userProfile?.fullName || userProfile?.name || 'Utilisateur',
    authorPhoto: userProfile?.photoURL || '',
    audience,
    music: music ? { url: music.url, title: music.title || '', artist: music.artist || '', start: music.start || 0 } : null,
    ts: Date.now(),
    createdAt: serverTimestamp(),
  });

  async function publish() {
    if (busy) return;
    setBusy(true); setProgress(0);
    try {
      if (mode === 'text') {
        if (!text.trim()) { setBusy(false); return; }
        await addDoc(collection(db, 'stories'), {
          ...baseDoc(),
          mediaType: 'text',
          text: text.trim().slice(0, 280),
          bgColor: BG[bgIdx],
          fontSize, align, textColor: txtColor,
        });
      } else if (mode === 'photo') {
        if (!file) { setBusy(false); return; }
        const baked = await bakePhoto().catch(() => file);
        const r = await uploadToTelegram(baked, p => setProgress(p));
        await addDoc(collection(db, 'stories'), {
          ...baseDoc(),
          mediaType: 'image',
          mediaURL: r.url,
        });
      } else if (mode === 'video') {
        if (!file) { setBusy(false); return; }
        let f = file;
        const trimmed = await trimVideoTo30s(file).catch(() => null);
        if (trimmed) f = trimmed;
        const r = await uploadToTelegram(f, p => setProgress(p));
        let _thumbURL = '';
        try {
          const tf = await captureVideoThumb(f);
          if (tf) { const tr = await uploadToTelegram(tf); _thumbURL = tr.url || ''; }
        } catch {}
        await addDoc(collection(db, 'stories'), {
          ...baseDoc(),
          mediaType: 'video',
          mediaURL: r.url,
          thumbURL: _thumbURL,
          filter: cssFor(filterKey),
          caption: caption.trim().slice(0, 200),
          captionPos,
        });
      }
      try { previewAudioRef.current?.pause(); } catch {}
      onPublished && onPublished();
    } catch (err) {
      alert('Erreur story : ' + (err?.message || err));
      setBusy(false);
    }
  }

  const canPublish = mode === 'text' ? !!text.trim() : !!file;

  // ── UI ──
  const overlay = { position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins' };
  const topBtn  = { background: 'rgba(255,255,255,.14)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const toolBtn = active => ({ background: active ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.35)', border: active ? '1.5px solid #fff' : '1px solid rgba(255,255,255,.25)', borderRadius: 22, minWidth: 46, height: 46, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px', fontSize: 12.5, fontWeight: 700 });

  // ── MENU (choix type) ──
  if (mode === 'menu') {
    const card = (icon, label, onClick, grad) => (
      <button onClick={onClick} style={{ flex: 1, aspectRatio: '3/4', borderRadius: 18, border: 'none', cursor: 'pointer', color: '#fff', background: grad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontWeight: 800, fontSize: 15, boxShadow: '0 8px 26px rgba(0,0,0,.4)' }}>
        {icon(40)}{label}
      </button>
    );
    return (
      <div style={{ ...overlay, background: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#101014', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 18px calc(26px + env(safe-area-inset-bottom))' }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.25)', margin: '0 auto 18px' }} />
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 18 }}>Créer une story</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {card(Ic.text,  'Texte', () => setMode('text'),  'linear-gradient(135deg,#1877F2,#63A9FF)')}
            {card(Ic.photo, 'Photo', () => setMode('photo'), 'linear-gradient(135deg,#FF2D8D,#FF7AB8)')}
            {card(Ic.video, 'Vidéo', () => setMode('video'), 'linear-gradient(135deg,#8F6BFF,#B49BFF)')}
          </div>
        </div>
      </div>
    );
  }

  // ── Preview central ──
  const previewFilter = cssFor(filterKey);
  const preview = (
    <div ref={previewRef} onPointerMove={capPointerMove} onPointerUp={capPointerUp} onPointerLeave={capPointerUp} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: mode === 'text' ? BG[bgIdx] : '#000' }}>
      {mode === 'text' && (
        <textarea
          autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={280}
          placeholder="Écrivez quelque chose..."
          style={{ width: '86%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: txtColor, fontFamily: 'Poppins', fontWeight: 800, fontSize, lineHeight: 1.28, textAlign: align, height: '60%', textShadow: txtColor === '#FFFFFF' ? '0 1px 8px rgba(0,0,0,.25)' : 'none' }}
        />
      )}
      {mode === 'photo' && previewURL && (
        <>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${previewURL})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px) brightness(.5)' }} />
          <img src={previewURL} alt="" style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: previewFilter }} />
        </>
      )}
      {mode === 'video' && previewURL && (
        <video ref={videoElRef} src={previewURL} autoPlay loop muted={sonMode !== 'original'} playsInline style={{ maxWidth: '100%', maxHeight: '100%', filter: previewFilter }} />
      )}
      {/* Légende overlay (photo/vidéo) */}
      {(mode === 'photo' || mode === 'video') && caption.trim() && (
        <div onPointerDown={capPointerDown} style={{ position: 'absolute', left: (captionPos.x * 100) + '%', top: (captionPos.y * 100) + '%', transform: 'translate(-50%,-50%)', maxWidth: '82%', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 22, textShadow: '0 2px 10px rgba(0,0,0,.7)', wordBreak: 'break-word', cursor: 'move', touchAction: 'none', userSelect: 'none' }}>{caption}</div>
      )}
      {/* Badge musique */}
      {music && (
        <div style={{ position: 'absolute', left: 14, bottom: mode === 'text' ? 14 : 54, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '70%' }}>
          <span style={{ color: '#FF7AB8' }}>{Ic.music(15)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{music.title}{music.artist ? ' · ' + music.artist : ''}</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={overlay}>
      <input ref={fileInputRef} type="file" accept={mode === 'photo' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'} style={{ display: 'none' }} onChange={pickFile} />

      {/* Barre haut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        <button style={topBtn} onClick={onClose}>{Ic.x(20)}</button>
        <div style={{ flex: 1 }} />
        <button
          onClick={publish} disabled={!canPublish || busy}
          style={{ background: canPublish && !busy ? 'linear-gradient(135deg,#F2B300,#FFCB2E)' : 'rgba(255,255,255,.2)', color: '#050505', border: 'none', borderRadius: 22, padding: '10px 22px', fontWeight: 800, fontSize: 14.5, cursor: canPublish && !busy ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 7 }}>
          {busy ? (progress > 0 && progress < 100 ? `${progress}%` : '...') : <>Publier {Ic.check(17)}</>}
        </button>
      </div>

      {preview}

      {/* Barre outils bas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 12px calc(14px + env(safe-area-inset-bottom))', flexWrap: 'wrap' }}>
        {mode === 'text' && (
          <>
            <button style={toolBtn(false)} onClick={() => setBgIdx((bgIdx + 1) % BG.length)}>Fond</button>
            <button style={toolBtn(false)} onClick={() => setFontSize(fontSize >= 52 ? 22 : fontSize + 6)}>Aa {fontSize}</button>
            <button style={toolBtn(false)} onClick={() => setAlign(align === 'center' ? 'left' : align === 'left' ? 'right' : 'center')}>
              {align === 'center' ? 'Centre' : align === 'left' ? 'Gauche' : 'Droite'}
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {TXT_COLORS.map(c => (
                <button key={c} onClick={() => setTxtColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: txtColor === c ? '2.5px solid #fff' : '1px solid rgba(255,255,255,.4)', cursor: 'pointer', flexShrink: 0 }} />
              ))}
            </div>
          </>
        )}
        {(mode === 'photo' || mode === 'video') && (
          <>
            <button style={toolBtn(panel === 'fx')} onClick={() => setPanel(panel === 'fx' ? null : 'fx')}>{Ic.fx(19)} Effet</button>
            <button style={toolBtn(panel === 'caption')} onClick={() => setPanel(panel === 'caption' ? null : 'caption')}>{Ic.text(18)} Texte</button>
          </>
        )}
        {mode === 'video' && (
          <button style={toolBtn(false)} onClick={toggleSon}>{sonMode === 'original' ? 'Son original' : 'Muet + musique'}</button>
        )}
        <button style={toolBtn(panel === 'music')} onClick={() => { loadTracks(); setPanel(panel === 'music' ? null : 'music'); }}>{Ic.music(18)} {music ? 'Musique ✓' : 'Musique'}</button>
        <button style={toolBtn(panel === 'audience')} onClick={() => setPanel(panel === 'audience' ? null : 'audience')}>
          {audience === 'friends' ? Ic.people(17) : audience === 'me' ? Ic.people(17) : Ic.globe(17)} {audience === 'friends' ? 'Amis' : audience === 'me' ? 'Moi' : 'Public'}
        </button>
      </div>

      {/* Panneau effets */}
      {panel === 'fx' && (
        <Sheet onClose={() => setPanel(null)} title="Effets">
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterKey(f.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ width: 62, height: 82, borderRadius: 12, overflow: 'hidden', border: filterKey === f.key ? '2.5px solid #F2B300' : '2px solid rgba(255,255,255,.15)', background: '#222' }}>
                  {previewURL && (mode === 'photo'
                    ? <img src={previewURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }} />
                    : <video src={previewURL} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }} />)}
                </div>
                <div style={{ color: '#fff', fontSize: 11, marginTop: 5, fontWeight: 600 }}>{f.label}</div>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* Panneau texte/légende */}
      {panel === 'caption' && (
        <Sheet onClose={() => setPanel(null)} title="Texte sur la story">
          <input autoFocus value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder="Ajouter du texte..."
            style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 15, fontFamily: 'Poppins', outline: 'none' }} />
        </Sheet>
      )}

      {/* Panneau musique */}
      {panel === 'music' && (
        <Sheet onClose={() => setPanel(null)} title="Musique (extraits artistes)">
          {music && (
            <button onClick={() => setMusic(null)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,45,141,.18)', border: '1px solid rgba(255,45,141,.4)', color: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Retirer la musique — {music.title}
            </button>
          )}
          {!tracksLoaded && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>Chargement...</p>}
          {tracksLoaded && tracks.length === 0 && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>Aucun extrait disponible pour le moment.</p>}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {tracks.map(tr => (
              <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 4px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <button onClick={() => togglePreview(tr)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {previewTrack === tr.id ? Ic.pause(18) : Ic.play(18)}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.title}</div>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.artist} · extrait {CLIP_SECONDS}s</div>
                </div>
                <button onClick={() => { try { previewAudioRef.current?.pause(); } catch {} setPreviewTrack(null); setMusic({ url: tr.url, title: tr.title, artist: tr.artist, start: 0 }); setPanel(null); }}
                  style={{ background: music?.url === tr.url ? '#F2B300' : 'rgba(255,255,255,.16)', color: music?.url === tr.url ? '#050505' : '#fff', border: 'none', borderRadius: 18, padding: '7px 15px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>
                  {music?.url === tr.url ? 'Choisi' : 'Utiliser'}
                </button>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {/* Panneau audience */}
      {panel === 'audience' && (
        <Sheet onClose={() => setPanel(null)} title="Qui peut voir ?">
          {[['public', 'Public', Ic.globe], ['friends', 'Amis', Ic.people], ['me', 'Moi uniquement', Ic.people]].map(([v, lb, ic]) => (
            <button key={v} onClick={() => { setAudience(v); setPanel(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 8px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,.08)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              <span style={{ color: audience === v ? '#F2B300' : '#fff' }}>{ic(20)}</span>{lb}
              {audience === v && <span style={{ marginLeft: 'auto', color: '#F2B300' }}>{Ic.check(18)}</span>}
            </button>
          ))}
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', background: '#16161c', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '16px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: 42, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.22)', margin: '0 auto 14px' }} />
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{title}</p>
        {children}
      </div>
    </div>
  );
}
