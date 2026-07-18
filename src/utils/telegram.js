const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';

async function compressImage(file, maxWidth=720, quality=0.62) {
  if (!file.type.startsWith('image/')) return file;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w=img.width, h=img.height;
      if (w>maxWidth) { h=Math.round(h*maxWidth/w); w=maxWidth; }
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>resolve(new File([blob],file.name,{type:'image/jpeg'})),'image/jpeg',quality);
    };
    img.src=url;
  });
}

const MAX_SIZE        = 500 * 1024 * 1024;  // 500 Mo maximum
const CHUNK_SIZE      = 18 * 1024 * 1024;   // morceaux 18 Mo (limite Bot API 20 Mo)
const CHUNK_THRESHOLD = 12 * 1024 * 1024;   // vidéo > 12 Mo → envoi en morceaux

// Envoi d'un FormData avec progression réelle (XHR)
function sendForm(endpoint, form, onPct, timeout = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}${endpoint}`);
    xhr.timeout = timeout;
    xhr.upload.onprogress = e => {
      if (onPct && e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json;
      try { json = JSON.parse(xhr.responseText); }
      catch { return reject(new Error(`HTTP ${xhr.status} — serveur indisponible`)); }
      if (xhr.status >= 200 && xhr.status < 300 && !json.error) resolve(json);
      else reject(new Error(json.error || `HTTP ${xhr.status}`));
    };
    xhr.onerror   = () => reject(new Error('Connexion interrompue'));
    xhr.ontimeout = () => reject(new Error('Délai dépassé — connexion trop lente'));
    xhr.send(form);
  });
}

async function jsonPost(endpoint, body) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Vidéo lehibe : tapatapahana morceaux ≤18 Mo, alefa tsirairay misy retry,
// dia atambatry ny serveur ho vidéo TOKANA amin'ny lecture
async function uploadVideoInChunks(file, onProgress) {
  const total = Math.ceil(file.size / CHUNK_SIZE);
  const { uploadId } = await jsonPost('/chunk/init', { total, mime: file.type || 'video/mp4', name: file.name || 'video.mp4' });

  for (let i = 0; i < total; i++) {
    const blob = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
    let attempt = 0;
    for (;;) {
      try {
        const form = new FormData();
        form.append('uploadId', uploadId);
        form.append('index', String(i));
        form.append('file', blob, `chunk_${i}.part`);
        await sendForm('/chunk/upload', form, pct => {
          if (onProgress) onProgress(Math.min(95, Math.round(((i + pct / 100) / total) * 95)));
        });
        break; // morceau tafita
      } catch (e) {
        attempt++;
        if (attempt >= 4) throw new Error(`Morceau ${i + 1}/${total} : ${e.message}`);
        // Retry automatique (tsy miverina any am-piandohana)
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
  }

  const done = await jsonPost('/chunk/complete', { uploadId });
  if (onProgress) onProgress(100);
  return { url: done.url, type: 'video' };
}

export async function uploadToTelegram(file, onProgress) {
  if (file.type.startsWith('image/')) {
    file = await compressImage(file);
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo). Maximum : 500 Mo.`);
  }

  // Vidéo > 12 Mo → envoi en morceaux (fiable sur Render, pas de timeout)
  if (file.type.startsWith('video/') && file.size > CHUNK_THRESHOLD) {
    return uploadVideoInChunks(file, onProgress);
  }

  // Fichiers kely : envoi tokana amin'ny Bot API
  const form = new FormData();
  form.append('file', file, file.name || `file_${Date.now()}`);
  const data = await sendForm('/telegram/upload', form, pct => {
    if (onProgress) onProgress(Math.min(95, Math.round(pct * 0.95)));
  });

  if (!data.url && !data.fileId) throw new Error("Upload échoué : réponse du serveur sans URL");
  if (onProgress) onProgress(100);

  const url = data.url || (data.fileId ? `${BACKEND_URL}/media-id?file_id=${data.fileId}` : null);
  return { url, fileId: data.fileId, messageId: data.messageId, type: data.type };
}
