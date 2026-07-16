// src/hooks/useViewerLocation.js
// Récupère la position approximative du visiteur (une seule fois par session),
// utilisée pour déterminer si un contenu boosté cible sa zone. Échec silencieux
// si la permission est refusée ou l'API indisponible — ne bloque jamais l'app.
import { useState, useEffect } from 'react';

export function useViewerLocation() {
  const [loc, setLoc] = useState(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { /* permission refusée ou indisponible : on continue sans filtrage */ },
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, []);

  return loc; // { lat, lng } | null
}
