# 🌸 Tsengo — Tambajotra Sosialy Malagasy

Tambajotra sosialy malagasy miaraka amin'ny:
- 📸 Famoahana (sary, video, lahatsoratra, vente)
- 💬 Hafatra tsy miankina (private messages) amin'ny temps réel
- 👥 Namana marim-pototra
- 🔔 Fampandrenesana amin'ny temps réel + soratra
- 🌍 Fiteny 3: Malagasy, Français, English
- 🌸 Loko Rose Fuchsia sy Blanc

---

## 🚀 Fomba fampiasana

### 1. Firebase Project

1. Mankanesa amin'ny [console.firebase.google.com](https://console.firebase.google.com)
2. **New Project** → anarana: `tsengo`
3. Alefaso ireto services ireto:
   - **Authentication** → Email/Password → Enable
   - **Firestore Database** → Create database → Production mode
   - **Realtime Database** → Create database → any region
   - **Storage** → Get started

4. **Project Settings** → Web App → Copy config → Asiana ao amin'ny `.env`

### 2. Firebase Rules

Adikeo ny rules ao amin'ny `FIREBASE_RULES.js` ka asiana:
- Firestore: Console > Firestore > Rules
- Realtime DB: Console > Realtime Database > Rules
- Storage: Console > Storage > Rules

### 3. Firestore Indexes

Ao amin'ny Firestore > Indexes, mamorona:
```
Collection: posts
Fields: createdAt (Descending)

Collection: posts
Fields: uid (Ascending), createdAt (Descending)

Collection: notifications
Fields: toUid (Ascending), createdAt (Descending)

Collection: friendRequests
Fields: toUid (Ascending), status (Ascending)
```

### 4. Local development

```bash
# Copy env
cp .env.example .env
# Asio ny Firebase config values ao

npm install
npm run dev
```

### 5. Deploy amin'ny GitHub + Render

**GitHub:**
```bash
git init
git add .
git commit -m "Initial commit - Tsengo app"
git remote add origin https://github.com/ANARANAO/tsengo.git
git push -u origin main
```

**Render (Free):**
1. [render.com](https://render.com) → New Static Site
2. Connect GitHub repo
3. Settings:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Environment Variables: asio ny Firebase keys rehetra
5. Deploy!

---

## 📁 Structure

```
src/
├── context/
│   ├── AuthContext.jsx      # Authentication
│   ├── LanguageContext.jsx  # MG/FR/EN translations
│   └── ThemeContext.jsx     # Light/Dark theme
├── hooks/
│   ├── useNotifications.js  # Real-time notifications
│   └── useMessages.js       # Message count
├── pages/
│   ├── Home.jsx             # Feed + Create post
│   ├── Profile.jsx          # User profile
│   ├── Friends.jsx          # Find & manage friends
│   ├── Messages.jsx         # Private messaging
│   ├── Notifications.jsx    # Notifications center
│   ├── Settings.jsx         # App settings
│   ├── Login.jsx
│   └── Register.jsx
├── components/
│   └── Layout.jsx           # Bottom navigation
├── firebase.js              # Firebase config
└── index.css                # Rose Fuchsia theme
```

## ✨ Features

| Feature | Status |
|---------|--------|
| Auth (Register/Login) | ✅ |
| Create Post (text/photo/video/sale) | ✅ |
| Feed real-time | ✅ |
| Reactions (❤️😂😮😢😡👍) | ✅ |
| Comments | ✅ |
| Edit/Delete own posts | ✅ |
| Profile + photo upload | ✅ |
| Edit profile (name, bio) | ✅ |
| Friend requests | ✅ |
| Search users | ✅ |
| Private messages real-time | ✅ |
| Online status | ✅ |
| Read receipts (✓✓) | ✅ |
| Notifications real-time | ✅ |
| Notification sound | ✅ |
| Language switcher (MG/FR/EN) | ✅ |
| Dark/Light theme | ✅ |
| Deploy Render | ✅ |
