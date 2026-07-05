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

  // Garde : 300 Mo maximum
  const MAX_SIZE = 300 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo). Maximum : 300 Mo.`);
  }

  // XHR : progression d'envoi tena izy (0 → 95%), ny sisa = traitement serveur
  const data = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}${endpoint}`);
    xhr.timeout = 30 * 60 * 1000; // 30 minitra ho an'ny vidéo lehibe amin'ny connexion miadana
    xhr.upload.onprogress = e => {
      if (onProgress && e.lengthComputable) onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      let json;
      try { json = JSON.parse(xhr.responseText); }
      catch { return reject(new Error(`Upload échoué (HTTP ${xhr.status}). Serveur indisponible ou fichier trop volumineux.`)); }
      if (xhr.status >= 200 && xhr.status < 300 && !json.error) resolve(json);
      else reject(new Error(json.error || `Upload échoué (HTTP ${xhr.status})`));
    };
    xhr.onerror   = () => reject(new Error('Serveur injoignable (connexion ou CORS)'));
    xhr.ontimeout = () => reject(new Error("Upload trop long : vérifiez votre connexion ou réduisez la taille de la vidéo"));
    xhr.send(form);
  });

  if (!data.url && !data.fileId) throw new Error("Upload échoué : réponse du serveur sans URL");
  if (onProgress) onProgress(100);

  const url = data.url || (data.fileId ? `${BACKEND_URL}/media-id?file_id=${data.fileId}` : null);
  return { url, fileId: data.fileId, messageId: data.messageId, type: data.type };
}
