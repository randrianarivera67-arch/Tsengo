const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';

export async function uploadToTelegram(file, onProgress) {
  const form = new FormData();
  form.append('file', file, file.name || `file_${Date.now()}`);

  const res = await fetch(`${BACKEND_URL}/telegram/upload`, {
    method: 'POST',
    body: form
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return { url: data.url, fileId: data.fileId, type: data.type };
}
