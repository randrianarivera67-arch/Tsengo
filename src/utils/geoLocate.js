// src/utils/geoLocate.js
// ─────────────────────────────────────────────────────────────────────────────
// Géolocalisation + reverse geocoding (ville + pays) — ampiasaina amin'ny
// inscription sy ny "Modifier le profil".
//  • Tsy misy clé API, tsy misy dependency ivelany (BigDataCloud client endpoint).
//  • Voatantana daholo : permission lavina, tsy misy réseau, réponse ratsy,
//    fotoana lany (timeout) → miverina hafatra mazava, TSY manipa mihitsy.
//  • Azo tsapaina 100 % (fetch sy geolocation azo ampidirina ho paramètre).
// NB : tsy mikasika ny utils/geo.js (haversine / zones boost) mihitsy ity.
// ─────────────────────────────────────────────────────────────────────────────

export const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
];

/** Fanadiovana anarana (espace mihoatra, halava voafetra) */
export function cleanName(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Code ISO2 madio (litera lehibe roa) na '' */
export function cleanCode(s) {
  const c = String(s == null ? '' : s).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : '';
}

/**
 * Manala ny ville + pays avy amin'ny réponse (BigDataCloud na endrika mitovy).
 * Miverina FOANA amin'ny endrika { city, country, countryCode }.
 */
export function parseGeoResult(data) {
  const d = (data && typeof data === 'object') ? data : {};
  const city = cleanName(d.city || d.locality || d.principalSubdivision || '');
  const country = cleanName(d.countryName || d.country || '');
  const countryCode = cleanCode(d.countryCode || d.countryCodeISO2 || '');
  return { city, country, countryCode };
}

/**
 * Toerana ankehitriny (lat/lon). Promise izay TSY manipa :
 *   { ok:true, lat, lon }  na  { ok:false, reason }
 * reason : 'unsupported' | 'denied' | 'unavailable' | 'timeout'
 */
export function getCurrentPosition(geo, timeoutMs = 12000) {
  const g = geo || (typeof navigator !== 'undefined' ? navigator.geolocation : null);
  const tmo = Math.max(1000, Number(timeoutMs) || 12000);
  return new Promise((resolve) => {
    if (!g || typeof g.getCurrentPosition !== 'function') {
      resolve({ ok: false, reason: 'unsupported' });
      return;
    }
    let done = false;
    const finish = (r) => { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), tmo + 500);
    try {
      g.getCurrentPosition(
        (pos) => {
          const lat = pos && pos.coords ? Number(pos.coords.latitude) : NaN;
          const lon = pos && pos.coords ? Number(pos.coords.longitude) : NaN;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) finish({ ok: false, reason: 'unavailable' });
          else finish({ ok: true, lat, lon });
        },
        (err) => {
          const code = err && err.code;
          finish({ ok: false, reason: code === 1 ? 'denied' : (code === 3 ? 'timeout' : 'unavailable') });
        },
        { enableHighAccuracy: false, timeout: tmo, maximumAge: 600000 }
      );
    } catch {
      finish({ ok: false, reason: 'unsupported' });
    }
  });
}

/**
 * Ville + pays avy amin'ny lat/lon. TSY manipa mihitsy.
 *   { ok:true, city, country, countryCode }  na  { ok:false, reason:'network' }
 */
export async function reverseGeocode(lat, lon, fetchImpl) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  // ⚠️ Number(null) === 0 : tsy maintsy lavina mazava ny null/undefined/''
  // fa raha tsy izany dia handefa fangatahana amin'ny 0°,0° (ranomasina).
  const okNum = (v) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));
  if (!f || !okNum(lat) || !okNum(lon)) {
    return { ok: false, reason: 'network' };
  }
  const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
    + '?latitude=' + encodeURIComponent(lat)
    + '&longitude=' + encodeURIComponent(lon)
    + '&localityLanguage=fr';
  try {
    const res = await f(url);
    if (!res || res.ok === false) return { ok: false, reason: 'network' };
    const data = await res.json();
    const parsed = parseGeoResult(data);
    if (!parsed.country && !parsed.city) return { ok: false, reason: 'network' };
    return { ok: true, ...parsed };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Hafatra frantsay mazava ho an'ny mpampiasa */
export function geoErrorMessage(reason) {
  switch (reason) {
    case 'denied':      return "Localisation refusée — saisissez votre ville et votre pays à la main.";
    case 'timeout':     return "La localisation a pris trop de temps — saisissez-les à la main.";
    case 'unsupported': return "Localisation indisponible sur cet appareil — saisissez-les à la main.";
    case 'network':     return "Lieu indéterminable (connexion) — saisissez-les à la main.";
    default:            return "Localisation impossible — saisissez-les à la main.";
  }
}

/**
 * Dingana feno : position → ville + pays.
 *   { ok:true, city, country, countryCode, lat, lon }
 *   { ok:false, reason, message }
 */
export async function detectLocation(opts) {
  const o = opts || {};
  const pos = await getCurrentPosition(o.geo, o.timeoutMs);
  if (!pos.ok) return { ok: false, reason: pos.reason, message: geoErrorMessage(pos.reason) };
  const geo = await reverseGeocode(pos.lat, pos.lon, o.fetchImpl);
  if (!geo.ok) return { ok: false, reason: geo.reason, message: geoErrorMessage(geo.reason) };
  return { ok: true, city: geo.city, country: geo.country, countryCode: geo.countryCode, lat: pos.lat, lon: pos.lon };
}
