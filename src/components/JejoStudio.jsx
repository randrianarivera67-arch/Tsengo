// src/components/JejoStudio.jsx
// ══════════════════════════════════════════════════════════════════════════
// Jejo Studio (Reels, format TikTok) — caméra + studio pro.
// Capture (caméra live OU import), timer, filtre, coupé, vitesse, 60s max,
// musique (extraits artistes), texte, téléchargement. TSY react-icons.
// Défensif : raha tsy misy caméra → fallback capture native + galerie.
// ══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToTelegram } from '../utils/telegram';
import { captureVideoThumb } from '../utils/videoThumb';

const MAX_SECONDS = 60;

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
const cssFor = k => (FILTERS.find(f => f.key === k) || FILTERS[0]).css;
const SPEEDS = [0.5, 1, 2];
const CLIP_SECONDS = 15;

const Ic = {
  x:      s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  back:   s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  flip:   s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 8a8 8 0 0 1 14-3M20 16a8 8 0 0 1-14 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M18 3v3h-3M6 21v-3h3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  timer:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.9"/><path d="M12 9v4l2.5 2M9 2.5h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  gallery:s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.9"/><circle cx="8.5" cy="10" r="1.6" fill="currentColor"/><path d="M4 17l4.5-4.5 3 3L15 12l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  fx:     s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M18 15l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  speed:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 20a8 8 0 1 1 8-8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M12 12l4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  cut:    s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="6" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.8"/><circle cx="6" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8.5L20 17M8 15.5L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  music:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 18V6l10-2v11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2.2" stroke="currentColor" strokeWidth="1.9"/><ellipse cx="16.5" cy="15" rx="2.5" ry="2.2" stroke="currentColor" strokeWidth="1.9"/></svg>,
  text:   s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 6v-.5M12 6v13M8.5 19h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  dl:     s => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  play:   s => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>,
  pause:  s => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>,
};
const fmt = d => (!d || !isFinite(d)) ? '0:00' : Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0');

function pickMime() {
  const cands = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
  for (const m of cands) { try { if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m; } catch {} }
  return '';
}

// ── Traitement (coupé + vitesse + filtre cuit) via canvas — best-effort ──
function processClip(file, { startSec = 0, endSec = null, speed = 1, filterCss = 'none' }) {
  return new Promise(resolve => {
    let settled = false, url;
    const finish = out => { if (settled) return; settled = true; try { if (url) URL.revokeObjectURL(url); } catch {} resolve(out); };
    try {
      const mime = pickMime();
      if (!mime) return finish(null);
      const video = document.createElement('video');
      video.playsInline = true; video.preload = 'auto'; video.muted = false; video.volume = 0.0001;
      url = URL.createObjectURL(file);
      video.onerror = () => finish(null);
      video.onloadedmetadata = () => {
        try {
          const dur = video.duration || 0;
          const s = Math.max(0, Math.min(startSec, dur));
          const e = Math.min(endSec == null ? dur : endSec, dur);
          if (e - s < 0.2) return finish(null);
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;
          const ctx = canvas.getContext('2d');
          const cStream = canvas.captureStream(30);
          const tracks = [...cStream.getVideoTracks()];
          // Audio : gardé seulement si vitesse normale (évite désync/pitch géré nativement)
          let elStream = null;
          try { elStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null); } catch {}
          if (elStream) elStream.getAudioTracks().forEach(t => tracks.push(t));
          const stream = new MediaStream(tracks);
          const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
          const chunks = [];
          rec.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
          rec.onerror = () => finish(null);
          rec.onstop = () => {
            try {
              const blob = new Blob(chunks, { type: mime.split(';')[0] });
              if (!blob.size) return finish(null);
              const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
              finish(new File([blob], 'jejo_' + Date.now() + '.' + ext, { type: blob.type }));
            } catch { finish(null); }
          };
          try { video.playbackRate = speed || 1; } catch {}
          const draw = () => {
            if (settled) return;
            try { ctx.filter = filterCss; ctx.drawImage(video, 0, 0, canvas.width, canvas.height); ctx.filter = 'none'; } catch {}
            if (video.currentTime < e && !video.paused && !video.ended) {
              if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
              else setTimeout(draw, 33);
            }
          };
          const guard = setTimeout(() => { try { rec.state !== 'inactive' && rec.stop(); video.pause(); } catch {} }, ((e - s) / (speed || 1)) * 1000 + 1500);
          const onTime = () => { if (video.currentTime >= e) { clearTimeout(guard); try { rec.state !== 'inactive' && rec.stop(); video.pause(); } catch {} video.removeEventListener('timeupdate', onTime); } };
          video.addEventListener('timeupdate', onTime);
          video.onended = () => { clearTimeout(guard); try { rec.state !== 'inactive' && rec.stop(); } catch {} };
          const startPlay = () => { try { video.currentTime = s; } catch {} video.play().then(() => { rec.start(400); draw(); }).catch(() => finish(null)); };
          if (video.readyState >= 2) startPlay(); else video.oncanplay = startPlay;
        } catch { finish(null); }
      };
      video.src = url;
    } catch { finish(null); }
  });
}

function chooseDefaultTrack(list) {
  if (!list || !list.length) return null;
  const recent = list.slice(0, 8);
  const popular = [...list].sort((a, b) => (b._pop || 0) - (a._pop || 0)).slice(0, 8);
  const pool = [...recent, ...popular];
  const t = pool[Math.floor(Math.random() * pool.length)] || list[0];
  return { url: t.url, title: t.title, artist: t.artist, start: 0 };
}

export default function JejoStudio({ currentUser, userProfile, onClose, onPublished }) {
  const [stage, setStage]       = useState('capture');   // 'capture' | 'edit'
  const [camError, setCamError] = useState(false);
  const [facing, setFacing]     = useState('user');
  const [orient, setOrient]     = useState('portrait');   // 'portrait' | 'landscape'
  const [timerSel, setTimerSel] = useState(0);           // 0 | 3 | 10
  const [countdown, setCountdown] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs]   = useState(0);

  const [clipFile, setClipFile] = useState(null);
  const [clipURL, setClipURL]   = useState('');
  const [clipDur, setClipDur]   = useState(0);
  const [filterKey, setFilterKey] = useState('none');
  const [speed, setSpeed]       = useState(1);
  const [trim, setTrim]         = useState({ start: 0, end: 0 });
  const [caption, setCaption]   = useState('');
  const [music, setMusic]       = useState(null);
  const [panel, setPanel]       = useState(null);        // 'fx'|'speed'|'cut'|'music'|'caption'
  const [playing, setPlaying]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [progress, setProgress] = useState(0);

  const [tracks, setTracks]     = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [previewTrack, setPreviewTrack] = useState(null);
  const previewAudioRef = useRef(null);
  const defaultMusicRef = useRef(null);

  const liveVideoRef = useRef(null);
  const editVideoRef = useRef(null);
  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const recTimerRef  = useRef(null);
  const cdTimerRef   = useRef(null);
  const galleryRef   = useRef(null);
  const nativeRef    = useRef(null);

  // ── Caméra live ──
  async function startCamera(face = facing, ori = orient) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setCamError(true); return; }
      stopStream();
      const portrait = ori === 'portrait';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face, width: { ideal: portrait ? 1080 : 1920 }, height: { ideal: portrait ? 1920 : 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) { liveVideoRef.current.srcObject = stream; liveVideoRef.current.play().catch(() => {}); }
      setCamError(false);
    } catch (e) { setCamError(true); }
  }
  function stopStream() {
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
  }
  useEffect(() => { if (stage === 'capture') startCamera(facing, orient); return () => {}; }, [stage]); // eslint-disable-line
  useEffect(() => { loadTracks(); }, []); // eslint-disable-line
  useEffect(() => () => { stopStream(); clearInterval(recTimerRef.current); clearInterval(cdTimerRef.current); try { previewAudioRef.current?.pause(); } catch {} }, []);

  function flipCamera() {
    const nf = facing === 'user' ? 'environment' : 'user';
    setFacing(nf); startCamera(nf, orient);
  }
  function toggleOrient() {
    const no = orient === 'portrait' ? 'landscape' : 'portrait';
    setOrient(no); if (!camError) startCamera(facing, no);
  }

  // ── Enregistrement ──
  function beginRecording() {
    const stream = streamRef.current;
    if (!stream) { setCamError(true); return; }
    const mime = pickMime();
    try {
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5_000_000 } : undefined);
      recorderRef.current = rec;
      rec.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        clearInterval(recTimerRef.current);
        const type = (mime || 'video/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) { setRecording(false); return; }
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const f = new File([blob], 'jejo_' + Date.now() + '.' + ext, { type });
        loadClip(f);
      };
      rec.start(400);
      setRecording(true); setRecSecs(0);
      recTimerRef.current = setInterval(() => {
        setRecSecs(s => {
          const n = s + 0.1;
          if (n >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return n;
        });
      }, 100);
    } catch (e) { setCamError(true); }
  }
  function stopRecording() {
    clearInterval(recTimerRef.current);
    try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop(); } catch {}
    setRecording(false);
  }
  function onRecordPress() {
    if (recording) { stopRecording(); return; }
    if (timerSel > 0) {
      setCountdown(timerSel);
      cdTimerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(cdTimerRef.current); setCountdown(null); beginRecording(); return null; }
          return c - 1;
        });
      }, 1000);
    } else beginRecording();
  }

  // ── Charger un clip (enregistré ou importé) → édition ──
  function loadClip(file) {
    stopStream();
    setClipFile(file);
    let url = '';
    try { url = URL.createObjectURL(file); } catch {}
    setClipURL(url);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.src = url;
    v.onloadedmetadata = () => {
      const d = Math.min(v.duration || 0, MAX_SECONDS);
      setClipDur(v.duration || 0);
      setTrim({ start: 0, end: Math.min(v.duration || 0, MAX_SECONDS) });
    };
    setMusic(m => m || defaultMusicRef.current);
    setStage('edit');
  }
  function onImport(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('video/')) { alert('Choisissez une vidéo'); return; }
    loadClip(f);
    e.target.value = '';
  }

  // ── Musique ──
  async function loadTracks() {
    if (tracksLoaded) return;
    try {
      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.isMusic && p.mediaType === 'audio' && p.mediaURL && (p.artistId || p.artistName))
        .map(p => ({ id: p.id, url: p.mediaURL, title: p.songTitle || p.content || 'Sans titre', artist: p.artistName || '', _pop: Object.keys(p.reactions || {}).length + ((p.comments || []).length) }));
      setTracks(list);
      defaultMusicRef.current = chooseDefaultTrack(list);
      setMusic(m => m || defaultMusicRef.current);
    } catch {}
    setTracksLoaded(true);
  }
  function togglePreview(tr) {
    try {
      if (previewTrack === tr.id) { previewAudioRef.current?.pause(); setPreviewTrack(null); return; }
      previewAudioRef.current?.pause();
      const a = new Audio(tr.url); previewAudioRef.current = a; a.play().catch(() => {});
      setPreviewTrack(tr.id); a.onended = () => setPreviewTrack(null);
    } catch {}
  }

  // ── Aperçu édition : appliquer vitesse + filtre + musique ──
  useEffect(() => {
    const v = editVideoRef.current; if (!v) return;
    try { v.playbackRate = speed; } catch {}
    try { v.muted = !!music; } catch {}
  }, [speed, music, clipURL, stage]);

  function togglePlay() {
    const v = editVideoRef.current; if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); }
  }

  // ── Télécharger le clip (local) ──
  async function download() {
    if (busy) return;
    setBusy(true); setProgress(0);
    try {
      const needProc = filterKey !== 'none' || speed !== 1 || trim.start > 0.1 || (clipDur && trim.end < clipDur - 0.1);
      let out = clipFile;
      if (needProc) { const p = await processClip(clipFile, { startSec: trim.start, endSec: trim.end, speed, filterCss: cssFor(filterKey) }); if (p) out = p; }
      const a = document.createElement('a');
      const u = URL.createObjectURL(out);
      a.href = u; a.download = out.name || ('jejo_' + Date.now() + '.mp4');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(u); } catch {} }, 4000);
    } catch (e) { alert('Erreur téléchargement : ' + (e?.message || e)); }
    setBusy(false);
  }

  // ── Publier ──
  async function publish() {
    if (busy || !clipFile) return;
    setBusy(true); setProgress(0);
    try {
      const needProc = filterKey !== 'none' || speed !== 1 || trim.start > 0.1 || (clipDur && trim.end < clipDur - 0.1);
      let out = clipFile, baked = false;
      if (needProc) {
        const p = await processClip(clipFile, { startSec: trim.start, endSec: trim.end, speed, filterCss: cssFor(filterKey) });
        if (p) { out = p; baked = true; }
      }
      let thumbURL = '';
      try { const th = await captureVideoThumb(out, 0.3); if (th) { const tr = await uploadToTelegram(th); thumbURL = tr.url || ''; } } catch {}
      const r = await uploadToTelegram(out, pct => setProgress(pct));
      await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid,
        authorName: userProfile?.fullName || userProfile?.name || 'Utilisateur',
        authorUsername: userProfile?.username || '',
        authorPhoto: userProfile?.photoURL || '',
        content: caption.trim().slice(0, 500),
        mediaURL: r.url,
        mediaType: 'video',
        thumbURL,
        isReel: true,
        // Raha tsy voacuire (baked=false) → alefa ho métadonnée, ampiharin'ny visionneuse
        filter: baked ? 'none' : cssFor(filterKey),
        speed: baked ? 1 : speed,
        caption: caption.trim().slice(0, 200),
        music: music ? { url: music.url, title: music.title || '', artist: music.artist || '', start: music.start || 0 } : null,
        audience: 'public',
        reactions: {}, comments: [],
        createdAt: serverTimestamp(),
      });
      try { previewAudioRef.current?.pause(); } catch {}
      onPublished && onPublished();
    } catch (e) {
      alert('Erreur publication : ' + (e?.message || e));
      setBusy(false);
    }
  }

  // ── styles ──
  const overlay = { position: 'fixed', inset: 0, zIndex: 600, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins' };
  const topBtn  = { background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.25)', borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const chip    = a => ({ background: a ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.4)', border: a ? '1.5px solid #fff' : '1px solid rgba(255,255,255,.25)', borderRadius: 20, minWidth: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px', fontSize: 12.5, fontWeight: 700 });

  // ══════════════ CAPTURE ══════════════
  if (stage === 'capture') {
    const ring = Math.min(1, recSecs / MAX_SECONDS);
    return (
      <div style={overlay}>
        <input ref={galleryRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={onImport} />
        <input ref={nativeRef} type="file" accept="video/*" capture={facing === 'user' ? 'user' : 'environment'} style={{ display: 'none' }} onChange={onImport} />

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#000' }}>
          {!camError ? (
            <video ref={liveVideoRef} autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: cssFor(filterKey), transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', color: '#fff' }}>
              <span style={{ opacity: .7 }}>{Ic.gallery(48)}</span>
              <p style={{ fontSize: 14, opacity: .85, maxWidth: 280 }}>Caméra indisponible dans l'app. Enregistrez avec la caméra du téléphone ou importez une vidéo.</p>
              <button onClick={() => nativeRef.current?.click()} style={{ background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', borderRadius: 24, padding: '13px 26px', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Ouvrir la caméra</button>
              <button onClick={() => galleryRef.current?.click()} style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 24, padding: '11px 24px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Importer une vidéo</button>
            </div>
          )}

          {/* Compte à rebours */}
          {countdown != null && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ color: '#fff', fontSize: 96, fontWeight: 900, textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>{countdown}</span>
            </div>
          )}

          {/* Barre haut */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px', paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
            <button style={topBtn} onClick={() => { stopStream(); onClose && onClose(); }}>{Ic.x(20)}</button>
            <div style={{ flex: 1 }} />
            {!camError && <button style={topBtn} onClick={flipCamera}>{Ic.flip(20)}</button>}
            <button style={{ ...topBtn, width: 'auto', borderRadius: 21, padding: '0 14px', gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => setTimerSel(timerSel === 0 ? 3 : timerSel === 3 ? 10 : 0)}>
              {Ic.timer(18)} {timerSel === 0 ? 'Off' : timerSel + 's'}
            </button>
            <button style={{ ...topBtn, width: 'auto', borderRadius: 21, padding: '0 14px', fontSize: 13, fontWeight: 700 }} onClick={toggleOrient}>
              {orient === 'portrait' ? 'Portrait' : 'Paysage'}
            </button>
          </div>

          {/* Chrono enregistrement */}
          {recording && (
            <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,45,45,.9)', color: '#fff', borderRadius: 14, padding: '5px 14px', fontWeight: 800, fontSize: 13 }}>● {fmt(recSecs)} / 1:00</div>
          )}

          {/* Filtres rapides */}
          {!camError && (
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button style={chip(false)} onClick={() => setPanel(panel === 'fx' ? null : 'fx')}>{Ic.fx(20)}</button>
            </div>
          )}
        </div>

        {/* Barre bas : galerie / record / rien */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '14px 24px calc(20px + env(safe-area-inset-bottom))', background: '#000' }}>
          <button onClick={() => galleryRef.current?.click()} style={{ ...topBtn, width: 48, height: 48, borderRadius: 12 }}>{Ic.gallery(24)}</button>
          {!camError ? (
            <button onClick={onRecordPress} style={{ position: 'relative', width: 82, height: 82, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="82" height="82" viewBox="0 0 82 82" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                <circle cx="41" cy="41" r="37" stroke="rgba(255,255,255,.3)" strokeWidth="5" fill="none" />
                <circle cx="41" cy="41" r="37" stroke="#FF2D5A" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 37} strokeDashoffset={2 * Math.PI * 37 * (1 - ring)} />
              </svg>
              <span style={{ width: recording ? 30 : 62, height: recording ? 30 : 62, borderRadius: recording ? 8 : '50%', background: '#FF2D5A', transition: 'all .2s' }} />
            </button>
          ) : <div style={{ width: 82 }} />}
          <div style={{ width: 48 }} />
        </div>

        {panel === 'fx' && (
          <Sheet title="Effets" onClose={() => setPanel(null)}>
            <FilterStrip filterKey={filterKey} setFilterKey={setFilterKey} previewURL={null} live />
          </Sheet>
        )}
      </div>
    );
  }

  // ══════════════ ÉDITION ══════════════
  const filterCss = cssFor(filterKey);
  return (
    <div style={overlay}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        <button style={topBtn} onClick={() => { setStage('capture'); setClipFile(null); setClipURL(''); setPanel(null); }}>{Ic.back(20)}</button>
        <div style={{ flex: 1 }} />
        <button style={topBtn} onClick={download} disabled={busy}>{Ic.dl(20)}</button>
        <button onClick={publish} disabled={busy}
          style={{ background: busy ? 'rgba(255,255,255,.2)' : 'linear-gradient(135deg,#F2B300,#FFCB2E)', color: '#050505', border: 'none', borderRadius: 22, padding: '10px 22px', fontWeight: 800, fontSize: 14.5, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          {busy ? (progress > 0 && progress < 100 ? progress + '%' : '...') : <>Publier {Ic.check(17)}</>}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }} onClick={togglePlay}>
        {clipURL && (
          <video ref={editVideoRef} src={clipURL} autoPlay loop playsInline muted={!!music}
            style={{ maxWidth: '100%', maxHeight: '100%', filter: filterCss }} />
        )}
        {caption.trim() && (
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 90, textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 22, textShadow: '0 2px 10px rgba(0,0,0,.7)', pointerEvents: 'none', wordBreak: 'break-word' }}>{caption}</div>
        )}
        {music && (
          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '70%' }}>
            <span style={{ color: '#FF7AB8' }}>{Ic.music(15)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{music.title}{music.artist ? ' · ' + music.artist : ''}</span>
          </div>
        )}
        {!playing && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><span style={{ color: 'rgba(255,255,255,.85)' }}>{Ic.play(64)}</span></div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 12px calc(14px + env(safe-area-inset-bottom))', flexWrap: 'wrap', background: '#000' }}>
        <button style={chip(panel === 'fx')} onClick={() => setPanel(panel === 'fx' ? null : 'fx')}>{Ic.fx(18)} Effet</button>
        <button style={chip(panel === 'speed')} onClick={() => setPanel(panel === 'speed' ? null : 'speed')}>{Ic.speed(18)} {speed}x</button>
        <button style={chip(panel === 'cut')} onClick={() => setPanel(panel === 'cut' ? null : 'cut')}>{Ic.cut(18)} Couper</button>
        <button style={chip(panel === 'music')} onClick={() => { loadTracks(); setPanel(panel === 'music' ? null : 'music'); }}>{Ic.music(18)} {music ? 'Musique ✓' : 'Musique'}</button>
        <button style={chip(panel === 'caption')} onClick={() => setPanel(panel === 'caption' ? null : 'caption')}>{Ic.text(18)} Texte</button>
      </div>

      {panel === 'fx' && (
        <Sheet title="Effets" onClose={() => setPanel(null)}>
          <FilterStrip filterKey={filterKey} setFilterKey={setFilterKey} previewURL={clipURL} />
        </Sheet>
      )}
      {panel === 'speed' && (
        <Sheet title="Vitesse" onClose={() => setPanel(null)}>
          <div style={{ display: 'flex', gap: 10 }}>
            {SPEEDS.map(sp => (
              <button key={sp} onClick={() => setSpeed(sp)} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: speed === sp ? '2px solid #F2B300' : '1px solid rgba(255,255,255,.2)', background: speed === sp ? 'rgba(242,179,0,.15)' : 'rgba(255,255,255,.06)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>{sp}x</button>
            ))}
          </div>
          {speed !== 1 && <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 11.5, marginTop: 10 }}>La vitesse modifie le son original. Ajoutez une musique si besoin.</p>}
        </Sheet>
      )}
      {panel === 'cut' && (
        <Sheet title={'Couper (' + fmt(Math.min(trim.end - trim.start, MAX_SECONDS)) + ')'} onClose={() => setPanel(null)}>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 8 }}>Début : {fmt(trim.start)}</p>
          <input type="range" min={0} max={Math.max(0.1, clipDur)} step={0.1} value={trim.start}
            onChange={e => { const s = Math.min(parseFloat(e.target.value), trim.end - 0.5); setTrim(t => ({ ...t, start: Math.max(0, s), end: Math.min(t.end, s + MAX_SECONDS) })); const v = editVideoRef.current; if (v) try { v.currentTime = s; } catch {} }}
            style={{ width: '100%', accentColor: '#F2B300' }} />
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: '10px 0 8px' }}>Fin : {fmt(trim.end)}</p>
          <input type="range" min={0} max={Math.max(0.1, clipDur)} step={0.1} value={trim.end}
            onChange={e => { let en = Math.max(parseFloat(e.target.value), trim.start + 0.5); if (en - trim.start > MAX_SECONDS) en = trim.start + MAX_SECONDS; setTrim(t => ({ ...t, end: Math.min(en, clipDur) })); }}
            style={{ width: '100%', accentColor: '#F2B300' }} />
        </Sheet>
      )}
      {panel === 'music' && (
        <Sheet title="Musique (extraits artistes)" onClose={() => setPanel(null)}>
          {music && (
            <button onClick={() => setMusic(null)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,45,141,.18)', border: '1px solid rgba(255,45,141,.4)', color: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Retirer la musique — {music.title}</button>
          )}
          {!tracksLoaded && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>Chargement...</p>}
          {tracksLoaded && tracks.length === 0 && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>Aucun extrait disponible.</p>}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {tracks.map(tr => (
              <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 4px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <button onClick={() => togglePreview(tr)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{previewTrack === tr.id ? Ic.pause(18) : Ic.play(18)}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.title}</div>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.artist} · extrait {CLIP_SECONDS}s</div>
                </div>
                <button onClick={() => { try { previewAudioRef.current?.pause(); } catch {} setPreviewTrack(null); setMusic({ url: tr.url, title: tr.title, artist: tr.artist, start: 0 }); setPanel(null); }}
                  style={{ background: music?.url === tr.url ? '#F2B300' : 'rgba(255,255,255,.16)', color: music?.url === tr.url ? '#050505' : '#fff', border: 'none', borderRadius: 18, padding: '7px 15px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{music?.url === tr.url ? 'Choisi' : 'Utiliser'}</button>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {panel === 'caption' && (
        <Sheet title="Texte / légende" onClose={() => setPanel(null)}>
          <input autoFocus value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder="Ajouter du texte..."
            style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 15, fontFamily: 'Poppins', outline: 'none' }} />
        </Sheet>
      )}
    </div>
  );
}

function FilterStrip({ filterKey, setFilterKey, previewURL, live }) {
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
      {FILTERS.map(f => (
        <button key={f.key} onClick={() => setFilterKey(f.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, textAlign: 'center' }}>
          <div style={{ width: 62, height: 82, borderRadius: 12, overflow: 'hidden', border: filterKey === f.key ? '2.5px solid #F2B300' : '2px solid rgba(255,255,255,.15)', background: '#222' }}>
            {previewURL ? <video src={previewURL} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#3a3a44,#1a1a22)', filter: f.css }} />}
          </div>
          <div style={{ color: '#fff', fontSize: 11, marginTop: 5, fontWeight: 600 }}>{f.label}</div>
        </button>
      ))}
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
