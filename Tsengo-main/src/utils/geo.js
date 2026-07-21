// src/utils/geo.js
// Calcul de distance (formule de Haversine) + correspondance de zones,
// utilisés pour le ciblage géographique réel des publications boostées.

/** Distance en kilomètres entre deux points GPS. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // rayon moyen de la Terre (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Vérifie si une position (viewerLat, viewerLng) tombe dans au moins une des
 * zones fournies. Comportement rétrocompatible :
 *  - Pas de zones du tout -> considéré comme "partout" (true).
 *  - Position du visiteur inconnue -> ne pénalise pas (true), on ne peut pas
 *    exclure quelqu'un dont on ne connaît pas la position.
 */
export function isInZones(viewerLat, viewerLng, zones) {
  if (!zones || !zones.length) return true;
  if (viewerLat == null || viewerLng == null) return true;
  return zones.some((z) => {
    if (z.isCountryWide) return true;
    if (z.lat == null || z.lng == null) return true;
    return haversineKm(viewerLat, viewerLng, z.lat, z.lng) <= (z.radiusKm || 20);
  });
}
