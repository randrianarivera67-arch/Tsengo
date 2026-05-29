const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';

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
  if (file.type.startsWith('image/')) {
    file = await compressImage(file);
  }

  const form = new FormData();
  form.append('file', file, file.name || `file_${Date.now()}`);

  // Video >= 19MB → /telegram/upload-large (GramJS 2GB)
  // Hafa → /telegram/upload (Bot API)
  const isLargeVideo = file.type.startsWith('video/') && file.size >= 19 * 1024 * 1024;
  const endpoint = isLargeVideo ? '/telegram/upload-large' : '/telegram/upload';

  if (onProgress) onProgress(10);

  const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'POST', body: form });

  if (onProgress) onProgress(90);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  if (onProgress) onProgress(100);

  const url = data.url || (data.fileId ? `${BACKEND_URL}/media-id?file_id=${data.fileId}` : null);
  return { url, fileId: data.fileId, messageId: data.messageId, type: data.type };
}
