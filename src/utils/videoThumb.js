// src/utils/videoThumb.js
// Maka sary (miniature JPEG) avy amin'ny vidéo alohan'ny upload —
// ampiasaina ho "poster" mba hipoitra sary avy hatrany amin'ny fil d'actualités.
export function captureVideoThumb(file, seekTo = 0.4) {
  return new Promise(resolve => {
    let settled = false;
    const done = blob => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(url); } catch {}
      resolve(blob ? new File([blob], 'thumb.jpg', { type: 'image/jpeg' }) : null);
    };
    let url;
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        try { video.currentTime = Math.min(seekTo, (video.duration || 1) / 2); }
        catch { done(null); }
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const vw = video.videoWidth || 720, vh = video.videoHeight || 405;
          const w = Math.min(720, vw);
          const h = Math.max(1, Math.round((vh / vw) * w));
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(video, 0, 0, w, h);
          canvas.toBlob(b => done(b), 'image/jpeg', 0.75);
        } catch { done(null); }
      };
      video.onerror = () => done(null);
      setTimeout(() => done(null), 8000); // garde : tsy mihantona mihitsy
      video.src = url;
    } catch { done(null); }
  });
}
