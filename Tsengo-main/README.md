# 🌸 Tsengo — Tambajotra Sosialy Malagasy

## Stack
- **React + Vite** — Frontend
- **Firebase** — Auth + Firestore + Realtime DB (FREE)
- **Cloudinary** — Sary sy Video storage (FREE 25GB)
- **OneSignal** — Push Notifications (FREE unlimited)
- **Render** — Hosting (FREE)

---

## 🚀 Setup complet

### 1. Firebase
1. console.firebase.google.com → New Project `tsengo`
2. Enable: **Authentication** (Email/Password) + **Firestore** + **Realtime Database**
3. Project Settings → Web App → copy config → asiana `.env`

### 2. Cloudinary
1. cloudinary.com → Free account
2. Dashboard → copy **Cloud Name**
3. Settings → Upload → Add upload preset → **Unsigned** → copy preset name

### 3. OneSignal ✅ VITA
- **App ID:** `4906cf47-153d-4eac-bf4a-2d8ca0df0f26`
- **REST API Key:** ao amin'ny Render Environment Variables

#### Farany: Configure Web Push ao OneSignal
1. onesignal.com → Tsengo App → **Settings → Platforms**
2. Tsindrio **Web** → Configure
3. **Site URL:** `https://tsengo.onrender.com`
4. **Auto-prompt:** Enable
5. Save

### 4. Environment Variables (.env)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_ONESIGNAL_APP_ID=4906cf47-153d-4eac-bf4a-2d8ca0df0f26
VITE_ONESIGNAL_REST_API_KEY=os_v2_app_jedm6...
```

### 5. GitHub + Render
```bash
git add . && git commit -m "OneSignal push notifications"
git push
```
Render → Environment Variables → asio ireo keys rehetra → Redeploy

---

## 🔔 Fomba fiasan'ny notifications

| Event | Firestore | OneSignal Push |
|-------|-----------|----------------|
| Message vaovao | ✅ | ✅ milatra telefona |
| Reaction | ✅ | ✅ milatra telefona |
| Comment | ✅ | ✅ milatra telefona |
| Friend request | ✅ | ✅ milatra telefona |
| Friend accepted | ✅ | ✅ milatra telefona |

**Rehefa mikantona ny app** → OneSignal push no milatra ny telefona 📱
**Rehefa miasa ny app** → Firestore real-time notification no miasa ⚡
