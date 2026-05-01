// src/utils/telegram.js
// ✅ Storage Telegram — invisible aux utilisateurs (pas de Cloudinary)
const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID;

export async function uploadToTelegram(file) {
  if (!BOT_TOKEN || !CHAT_ID) throw new Error('Telegram config manquante');

  const form = new FormData();
  form.append('chat_id', CHAT_ID);

  const t = (file.type || '').toLowerCase();
  let endpoint, field, mediaType;

  if (t.startsWith('audio/') || t.includes('ogg') || t.includes('webm')) {
    endpoint = 'sendVoice';   field = 'voice';    mediaType = 'audio';
  } else if (t.startsWith('video/')) {
    endpoint = 'sendDocument'; field = 'document'; mediaType = 'video';
  } else if (t.startsWith('image/')) {
    endpoint = 'sendDocument'; field = 'document'; mediaType = 'image';
  } else {
    endpoint = 'sendDocument'; field = 'document'; mediaType = 'raw';
  }

  form.append(field, file, file.name || `file_${Date.now()}`);

  const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram: ' + data.description);

  const r = data.result;
  let fileId =
    (r.voice?.file_id) ||
    (r.document?.file_id) ||
    (r.video?.file_id) ||
    (r.audio?.file_id) ||
    (r.photo?.[r.photo.length - 1]?.file_id);

  if (!fileId) throw new Error('file_id introuvable');

  const fRes  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fData = await fRes.json();
  if (!fData.ok) throw new Error('getFile: ' + fData.description);

  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fData.result.file_path}`;
  return { url, fileId, type: mediaType };
}
