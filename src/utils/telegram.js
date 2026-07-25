const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const MEDIA_URL   = import.meta.env.VITE_MEDIA_URL   || 'https://tsengo-upload.randrianarivera67.workers.dev';

const MB              = 1024 * 1024;
const MAX_SIZE        = 500 * MB;
const CHUNK_THRESHOLD = 12 * MB;
const MAX_CHUNKS      = 120;
const CHUNK_TIMEOUT   = 120 * 1000;
const SOLO_TIMEOUT    = 180 * 1000;

function chunkSizeFor(size) { return size > 200 * MB ? 8 * MB : 4 * MB; }

const sleep = ms => new Promise(r => setTimeout(r, ms));

function monotonic(onProgress) {
  let last = 0;
  return p => {
    const v = Math.max(last, Math.min(100, Math.round(p)));
    if (v !== last) { last = v; onProgress && onProgress(v); }
  };
}

async function compressImage(file, maxWidth = 720, quality = 0.62) {
  if (!file.type.startsWith('image/')) return file;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function workerSend(blob, { name, mime, kind }, onPct, timeout) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const qs = '?name=' + encodeURIComponent(name || 'file')
             + '&mime=' + encodeURIComponent(mime || 'application/octet-stream')
             + (kind ? '&kind=' + kind : '');
    xhr.open('POST', MEDIA_URL + '/upload' + qs);
    xhr.timeout = timeout || CHUNK_TIMEOUT;
    xhr.setRequestHeader('Content-Type', mime || 'application/octet-stream');
    xhr.upload.onprogress = e => { if (onPct && e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let json;
      try { json = JSON.parse(xhr.responseText); }
      catch { return reject(new Error('HTTP ' + xhr.status + ' — réponse illisible')); }
      if (xhr.status >= 200 && xhr.status < 300 && json.ok && json.fileId) resolve(json);
      else reject(new Error(json.error || ('HTTP ' + xhr.status)));
    };
    xhr.onerror   = () => reject(new Error('Connexion interrompue'));
    xhr.ontimeout = () => reject(new Error('Délai dépassé — connexion trop lente'));
    xhr.send(blob);
  });
}

function renderSend(blob, filename, onPct, timeout) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', blob, filename);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BACKEND_URL + '/telegram/upload');
    xhr.timeout = timeout || CHUNK_TIMEOUT;
    xhr.upload.onprogress = e => { if (onPct && e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let json;
      try { json = JSON.parse(xhr.responseText); }
      catch { return reject(new Error('HTTP ' + xhr.status + ' — serveur indisponible')); }
      if (xhr.status >= 200 && xhr.status < 300 && !json.error && json.fileId) resolve(json);
      else reject(new Error(json.error || ('HTTP ' + xhr.status)));
    };
    xhr.onerror   = () => reject(new Error('Connexion interrompue'));
    xhr.ontimeout = () => reject(new Error('Délai dépassé'));
    xhr.send(form);
  });
}

function waitFor(message, attempt) {
  const msg = String(message || '');
  const m = msg.match(/retry.?after[^\d]*(\d+)/i);
  if (m) return (parseInt(m[1]) + 1) * 1000;
  if (/too many requests|429|flood/i.test(msg)) return 4000 * attempt;
  return 1500 * attempt;
}

async function sendOne(blob, { name, mime, kind, timeout, label }, onPct) {
  let attempt = 0;
  for (;;) {
    attempt++;
    const useRender = attempt >= 3;
    try {
      if (useRender) {
        const r = await renderSend(blob, name, onPct, timeout);
        return { fileId: r.fileId, via: 'render' };
      }
      const r = await workerSend(blob, { name, mime, kind }, onPct, timeout);
      return { fileId: r.fileId, url: r.url, type: r.type, via: 'worker' };
    } catch (e) {
      if (attempt >= 6) throw new Error((label ? label + ' : ' : '') + e.message);
      await sleep(waitFor(e.message, attempt));
    }
  }
}

async function uploadVideoInChunks(file, onProgress) {
  const report = monotonic(onProgress);
  const CH = chunkSizeFor(file.size);
  const total = Math.ceil(file.size / CH);
  if (total > MAX_CHUNKS) {
    throw new Error('Vidéo trop volumineuse (' + Math.round(file.size / MB) + ' Mo). Réduisez la durée ou la qualité.');
  }

  const ids = [], sizes = [];
  for (let i = 0; i < total; i++) {
    const blob = file.slice(i * CH, Math.min((i + 1) * CH, file.size));
    const base = (i / total) * 95, span = 95 / total;
    const r = await sendOne(blob, {
      name: 'chunk_' + i + '.part',
      mime: 'application/octet-stream',
      timeout: CHUNK_TIMEOUT,
      label: 'Morceau ' + (i + 1) + '/' + total,
    }, p => report(base + span * (p / 100)));

    ids.push(r.fileId);
    sizes.push(blob.size);
    report(((i + 1) / total) * 95);
    if (i < total - 1) await sleep(200);
  }

  const mime = file.type || 'video/mp4';
  const url = MEDIA_URL + '/chunked?ids=' + ids.join(',')
            + '&sizes=' + sizes.join(',')
            + '&mime=' + encodeURIComponent(mime);
  report(100);
  return { url, type: 'video', chunks: ids.length };
}

export async function uploadToTelegram(file, onProgress) {
  if (file.type.startsWith('image/')) file = await compressImage(file);

  if (file.size > MAX_SIZE) {
    throw new Error('Fichier trop volumineux (' + Math.round(file.size / MB) + ' Mo). Maximum : 500 Mo.');
  }

  if (file.type.startsWith('video/') && file.size > CHUNK_THRESHOLD) {
    return uploadVideoInChunks(file, onProgress);
  }

  const report = monotonic(onProgress);
  const isAudio = file.type.startsWith('audio/');
  const r = await sendOne(file, {
    name: file.name || ('file_' + Date.now()),
    mime: file.type || 'application/octet-stream',
    kind: isAudio ? 'audio' : undefined,
    timeout: SOLO_TIMEOUT,
  }, p => report(p * 0.95));

  if (!r.fileId) throw new Error('Envoi échoué : réponse sans identifiant de fichier');
  report(100);

  const url = r.url || (MEDIA_URL + '/media-id?file_id=' + r.fileId);
  const type = r.type || (file.type.startsWith('video') ? 'video' : isAudio ? 'audio' : 'image');
  return { url, fileId: r.fileId, type };
}
