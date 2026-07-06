// src/utils/download.js
// Télécharger TENA ny fichier (photo/vidéo) — tsy ilay lien/fichier code intsony.
// window.open(url) dia matetika manokatra ny fichier ao anaty onglet fa tsy
// mitelecharge azy (indrindra amin'ny Chrome Android sy amin'ny media servi
// avy amin'ny domaine hafa). Ny fetch + blob + <a download> no antoka.
export async function downloadMedia(url, mediaType = 'image', filename) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    // Ekstraika ny extension marina araka ny type-nao MIME an'ny blob
    let ext = mediaType === 'video' ? 'mp4' : 'jpg';
    if (blob.type) {
      const m = blob.type.split('/')[1];
      if (m) ext = m.replace('quicktime', 'mov').split(';')[0];
    }
    const name = filename || `traingo_${mediaType}_${Date.now()}.${ext}`;

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (err) {
    console.error('Téléchargement échoué:', err);
    // Solution de repli : sokafy amin'ny onglet vaovao (azo tehirizin'ny mpampiasa an-tanana)
    window.open(url, '_blank');
    alert("Le téléchargement direct a échoué — le fichier s'est ouvert dans un nouvel onglet, vous pouvez l'enregistrer depuis là.");
  }
}
