
// /*auto-update-v1*/
(async function checkUpdate() {
  try {
    const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    const remote = await r.json();
    const local = localStorage.getItem('app_version');
    if (local && local !== remote.version) {
      console.log('[Update] Version vaovao:', remote.version, '(taloha:', local, ')');
      if (confirm('Misy fanavaozana vaovao (' + remote.version + ').\n\n' + remote.notes + '\n\nHavaozina izao?')) {
        localStorage.setItem('app_version', remote.version);
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) await reg.unregister();
        }
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
        window.location.reload(true);
      }
    } else if (!local) {
      localStorage.setItem('app_version', remote.version);
    }
  } catch(e) { console.log('[Update] Tsy afaka nijery version:', e.message); }
})();
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './utils/pwaInstall';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
