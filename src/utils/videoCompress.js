// src/utils/videoCompress.js
// Compression vidéo AO AMIN'NY TÉLÉPHONE alohan'ny upload (canvas + MediaRecorder).
// Vidéo lehibe (bitrate avo) → 720p ~2,5 Mbps → maivana sy FLUIDE amin'ny mpijery rehetra.
// Faharetany ≈ ny halavan'ilay vidéo (mandeha amin'ny arrière-plan miaraka amin'ny %).

const TARGET_HEIGHT = 480;              // 480p (toy ny apps compression matanjaka)
const TARGET_TOTAL_MB = 40;             // tanjona : ≤ ~40 Mo na video 500 Mo aza
const MIN_VIDEO_BPS = 350_000;
const MAX_VIDEO_BPS = 1_400_000;
const AUDIO_BPS = 64_000;

function pickMime() {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
  }
  return null;
}

/**
 * @param {File} file
 * @param {(pct:number)=>void} onPct  0..100
 * @returns {Promise<File|null>}  null = tsy vita (ampiasao ny original)
 */
export function compressVideo(file, onPct) {
  return new Promise(resolve => {
    let settled = false;
    let url = null;
    const finish = out => {
      if (settled) return;
      settled = true;
      try { if (url) URL.revokeObjectURL(url); } catch {}
      resolve(out);
    };

    try {
      if (typeof MediaRecorder === 'undefined') return finish(null);
      const mime = pickMime();
      if (!mime) return finish(null);

      const video = document.createElement('video');
      video.playsInline = true;
      video.preload = 'auto';
      video.volume = 0;              // tsy re, fa ny piste audio dia voaraikitra ihany
      url = URL.createObjectURL(file);

      video.onerror = () => finish(null);

      video.onloadedmetadata = () => {
        try {
          const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
          const scale = Math.min(1, TARGET_HEIGHT / Math.min(vw, vh));
          const w = Math.round((vw * scale) / 2) * 2;
          const h = Math.round((vh * scale) / 2) * 2;

          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');

          const canvasStream = canvas.captureStream(30);
          // Audio avy amin'ny élément (raha misy)
          let elStream = null;
          try { elStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null); } catch {}
          const tracks = [...canvasStream.getVideoTracks()];
          if (elStream) elStream.getAudioTracks().forEach(t => tracks.push(t));
          const stream = new MediaStream(tracks);

          // Bitrate adaptatif : kajiana mba ho ≤ ~40 Mo ny totale
          const dur = Math.max(1, video.duration || 60);
          const budgetBits = TARGET_TOTAL_MB * 8 * 1024 * 1024;
          const videoBps = Math.max(MIN_VIDEO_BPS, Math.min(MAX_VIDEO_BPS, Math.floor(budgetBits / dur) - AUDIO_BPS));
          const rec = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: videoBps,
            audioBitsPerSecond: AUDIO_BPS,
          });
          const chunks = [];
          rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onerror = () => finish(null);
          rec.onstop = () => {
            try {
              const blob = new Blob(chunks, { type: mime.split(';')[0] });
              if (!blob.size) return finish(null);
              const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
              finish(new File([blob], (file.name || 'video').replace(/\.\w+$/, '') + `_traingo.${ext}`, { type: blob.type }));
            } catch { finish(null); }
          };

          // Boucle de dessin
          const draw = () => {
            if (settled) return;
            try { ctx.drawImage(video, 0, 0, w, h); } catch {}
            if (onPct && video.duration) onPct(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
            if (!video.ended && !video.paused) {
              if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
              else setTimeout(draw, 33);
            }
          };

          video.onended = () => { try { rec.state !== 'inactive' && rec.stop(); } catch {} };
          // Garde : durée + 60s
          setTimeout(() => { try { rec.state !== 'inactive' && rec.stop(); } catch {}; setTimeout(() => finish(null), 5000); },
            ((video.duration || 600) + 60) * 1000);

          video.play().then(() => {
            rec.start(1000);
            draw();
          }).catch(() => finish(null));
        } catch { finish(null); }
      };

      video.src = url;
    } catch { finish(null); }
  });
}
