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
  if (file.type.startsWith('image/')) file = await compressImage(file);
  const form = new FormData();
  form.append('file', file, file.name || `file_${Date.now()}`);

  const res = await fetch(`${BACKEND_URL}/telegram/upload`, {
    method: 'POST',
    body: form
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const proxyUrl = data.fileId ? `${BACKEND_URL}/file?file_id=${data.fileId}` : data.url;
  return { url: proxyUrl, fileId: data.fileId, type: data.type };
}
