// src/utils/download.js
// Télécharger TENA ny fichier (photo/vidéo) amin'ny alalan'ny backend, izay
// mametraka Content-Disposition: attachment — ny NAVIGATEUR mihitsy no
// mitantana ny "enregistrer sous" (tsy misy fetch/blob/CORS eto amin'ny
// frontend intsony), ka tsy hisy intsony ilay "fichier code" (index.html)
// voatahiry raha injay ny CORS na ny type an'ny blob.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';

export function downloadMedia(url, mediaType = 'image', filename) {
  if (!url) return;
  const name = (filename || `trengo_${mediaType}_${Date.now()}`).replace(/\.[a-zA-Z0-9]+$/, '');
  const dlUrl = `${BACKEND_URL}/download?url=${encodeURIComponent(url)}&type=${encodeURIComponent(mediaType)}&name=${encodeURIComponent(name)}`;

  // Lien réel avec attribut download — déclenche le téléchargement natif du navigateur
  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
