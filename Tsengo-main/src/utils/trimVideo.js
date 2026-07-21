// src/utils/trimVideo.js
// Manapaka vidéo ho 30 segondra farafahabetsany (ho an'ny Story) — raha
// mihoatra izany ny vidéo dia alaina ny 30 segondra VOALOHANY ho azy.
// Miverina null raha tsy voatanty ny fanapahana (ampiasaina ny fichier tany am-boalohany amin'izay).
const MAX_SECONDS = 30;

export function trimVideoTo30s(file) {
  return new Promise(resolve => {
    let settled = false; let url;
    const finish = out => { if (settled) return; settled = true; try { if (url) URL.revokeObjectURL(url); } catch {} resolve(out); };
    try {
      if (typeof MediaRecorder === 'undefined') return finish(null);
      const mimeCandidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm'];
      let mime = null;
      for (const m of mimeCandidates) { try { if (MediaRecorder.isTypeSupported(m)) { mime = m; break; } } catch {} }
      if (!mime) return finish(null);

      const video = document.createElement('video');
      video.playsInline = true; video.preload = 'auto'; video.volume = 0;
      url = URL.createObjectURL(file);

      video.onerror = () => finish(null);
      video.onloadedmetadata = () => {
        // Fohy noho ny 30s : tsy ilaina fanapahana, avereno ny fichier tany am-boalohany
        if ((video.duration || 0) <= MAX_SECONDS + 0.5) return finish(null);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 720; canvas.height = video.videoHeight || 1280;
          const ctx = canvas.getContext('2d');
          const canvasStream = canvas.captureStream(30);
          let elStream = null;
          try { elStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null); } catch {}
          const tracks = [...canvasStream.getVideoTracks()];
          if (elStream) elStream.getAudioTracks().forEach(t => tracks.push(t));
          const stream = new MediaStream(tracks);

          const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_000_000 });
          const chunks = [];
          rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onerror = () => finish(null);
          rec.onstop = () => {
            try {
              const blob = new Blob(chunks, { type: mime.split(';')[0] });
              if (!blob.size) return finish(null);
              const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
              finish(new File([blob], (file.name || 'story').replace(/\.\w+$/, '') + `_30s.${ext}`, { type: blob.type }));
            } catch { finish(null); }
          };

          const draw = () => {
            if (settled) return;
            try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch {}
            if (video.currentTime < MAX_SECONDS && !video.paused && !video.ended) {
              if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
              else setTimeout(draw, 33);
            }
          };

          const stopAt30 = setTimeout(() => { try { rec.state !== 'inactive' && rec.stop(); video.pause(); } catch {} }, MAX_SECONDS * 1000 + 200);
          video.onended = () => { clearTimeout(stopAt30); try { rec.state !== 'inactive' && rec.stop(); } catch {} };

          video.play().then(() => { rec.start(500); draw(); }).catch(() => finish(null));
        } catch { finish(null); }
      };
      video.src = url;
    } catch { finish(null); }
  });
}
