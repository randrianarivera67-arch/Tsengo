// src/pages/OAuthCallback.jsx
// ✅ Page callback OAuth2 Google/YouTube
// URL: /oauth/callback  (configurée dans Google Cloud Console)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../utils/youtube';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connexion YouTube en cours...');

  useEffect(() => {
    async function handleCallback() {
      const params  = new URLSearchParams(window.location.search);
      const code    = params.get('code');
      const state   = params.get('state');
      const error   = params.get('error');

      if (error) {
        setStatus('❌ Connexion annulée.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // Vérification state (CSRF protection)
      const savedState = sessionStorage.getItem('yt_oauth_state');
      if (state && savedState && state !== savedState) {
        setStatus('❌ Erreur de sécurité.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!code) {
        setStatus('❌ Code manquant.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        await exchangeCodeForToken(code);
        setStatus('✅ YouTube connecté !');
        // Mamerina amin'ny page taloha na Home
        const returnTo = sessionStorage.getItem('yt_return_to') || '/';
        sessionStorage.removeItem('yt_return_to');
        setTimeout(() => navigate(returnTo), 1200);
      } catch (err) {
        console.error(err);
        setStatus('❌ Erreur: ' + err.message);
        setTimeout(() => navigate('/'), 3000);
      }
    }

    handleCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f',
      color: '#fff',
      fontFamily: 'sans-serif',
      gap: 16,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#FF0000"/>
        <polygon points="19,14 38,24 19,34" fill="white"/>
      </svg>
      <p style={{ fontSize: 18, fontWeight: 600 }}>{status}</p>
    </div>
  );
}
