const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID;

export async function uploadToTelegram(file, onProgress) {
  if (!BOT_TOKEN || !CHAT_ID) throw new Error('Telegram config manquante');
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('document', file, file.name || `file_${Date.now()}`);
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram: ' + data.description);
  const fileId = data.result.document?.file_id || data.result.video?.file_id || data.result.photo?.[data.result.photo.length-1]?.file_id;
  const fRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fData = await fRes.json();
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fData.result.file_path}`;
  const t = (file.type||'').toLowerCase();
  const type = t.startsWith('video/') ? 'video' : t.startsWith('image/') ? 'image' : 'raw';
  return { url, fileId, type };
}
