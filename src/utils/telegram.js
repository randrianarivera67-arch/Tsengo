const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';
const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL || 'https://empowering-enthusiasm-production.up.railway.app';

async function compressImage(file, maxWidth=1080, quality=0.8) {
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

export async function uploadToTelegram(file, onProgress) {
  if (!file.type.startsWith('video/')) {
    if (file.type.startsWith('image/')) file = await compressImage(file);
    const form = new FormData();
    form.append('file', file, file.name || `file_${Date.now()}`);
    const res = await fetch(`${BACKEND_URL}/telegram/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const proxyUrl = data.fileId ? `${BACKEND_URL}/media-id?file_id=${data.fileId}` : data.url;
    return { url: proxyUrl, fileId: data.fileId, type: data.type };
  }

  const CHUNK_SIZE = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = Date.now() + '_' + Math.random().toString(36).slice(2);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const form = new FormData();
    form.append('chunk', chunk, file.name);
    form.append('uploadId', uploadId);
    form.append('chunkIndex', String(i));
    form.append('totalChunks', String(totalChunks));
    form.append('filename', file.name);
    form.append('mimetype', file.type);
    await fetch(`${RAILWAY_URL}/upload/chunk`, { method: 'POST', body: form });
    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 90));
  }

  const res = await fetch(`${RAILWAY_URL}/upload/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (onProgress) onProgress(100);
  return { url: data.url, fileId: data.fileId, type: data.type };
}
