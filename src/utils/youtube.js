// src/utils/youtube.js
// ✅ YouTube storage ho an'ny VIDEO — OAuth2 (Google Cloud "Tsengo" client)
// Photo mijanona amin'ny Telegram (telegram.js)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ─── 1. Hanomboka OAuth2 Google (misokatra popup) ───────────────────────────
export function startYouTubeAuth() {
  const clientId     = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri  = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  const scope        = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload');
  const state        = crypto.randomUUID();

  sessionStorage.setItem('yt_oauth_state', state);

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`;

  // Misokatra amin'ny tab vaovao (tsy misy popup blocker olana)
  window.open(url, '_blank', 'width=500,height=600');
}

// ─── 2. Maka access_token avy amin'ny sessionStorage ──────────────────────
export function getYouTubeToken() {
  return sessionStorage.getItem('yt_access_token') || null;
}

export function setYouTubeToken(token) {
  sessionStorage.setItem('yt_access_token', token);
}

export function clearYouTubeToken() {
  sessionStorage.removeItem('yt_access_token');
}

// ─── 3. Exchange code → token (atao ao amin'ny OAuthCallback page) ─────────
export async function exchangeCodeForToken(code) {
  const res = await fetch(`${BACKEND_URL}/youtube/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(data));
  setYouTubeToken(data.access_token);
  return data.access_token;
}

// ─── 4. Upload video mankany YouTube (unlisted) ────────────────────────────
export async function uploadToYouTube(file, title = 'Tsengo Video', onProgress) {
  let token = null; // Foana foana — backend fotsiny

  // Mivantana amin'ny backend (server-side OAuth)
  if (!token) {
    const r = await fetch(`${BACKEND_URL}/youtube/upload`, {
      method: 'POST',
      body: (() => { const f = new FormData(); f.append('video', file, file.name || `video_${Date.now()}.mp4`); f.append('title', title); return f; })(),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error('YouTube upload failed: ' + (err.error || r.statusText));
    }
    const data = await r.json();
    return { url: data.embedUrl, videoId: data.videoId, type: 'video' };
  }

  // Upload direct resumable (browser OAuth token)
  return await resumableUpload(file, title, token, onProgress);
}

// ─── 5. Resumable upload YouTube (browser → YouTube direct) ───────────────
async function resumableUpload(file, title, token, onProgress) {
  // Initiation
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'video/mp4',
        'X-Upload-Content-Length': file.size,
      },
      body: JSON.stringify({
        snippet: { title, description: 'Partagé via Tsengo', categoryId: '22' },
        status:  { privacyStatus: 'unlisted' }, // unlisted = hita fa tsy public
      }),
    }
  );

  if (!initRes.ok) {
    // Token expiré → vidy indray
    if (initRes.status === 401) {
      clearYouTubeToken();
      throw new Error('YouTube token expired. Please reconnect.');
    }
    throw new Error('YouTube init upload failed: ' + initRes.status);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('No upload URL from YouTube');

  // Upload ny file mihitsy
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const data = JSON.parse(xhr.responseText);
        const videoId = data.id;
        resolve({
          url: `https://www.youtube.com/embed/${videoId}`,
          videoId,
          type: 'video',
        });
      } else {
        reject(new Error('YouTube upload error: ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during YouTube upload'));
    xhr.send(file);
  });
}
