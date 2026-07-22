// src/utils/suggest.js
// ─────────────────────────────────────────────────────────────────────────────
// Suggestions ho an'ny onboarding (aorian'ny inscription) — fonction MADIO
// (tsy misy React/Firebase) ka azo tsapaina 100 %.
//   • Olona  : firenena mitovy aloha → ville mitovy → vao nisoratra
//   • Boutique/Artiste : be mpanaraka aloha → vaovao
// Esorina FOANA : ny tenanao, izay efa arahinao, izay voasakana.
// ─────────────────────────────────────────────────────────────────────────────

/** Fanamboarana lakile (accents/majuscules/espaces mihoatra esorina) */
export function norm(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Millisecondes avy amin'ny createdAt (Timestamp / Date / ISO / nombre) */
export function ms(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? (v < 1e11 ? v * 1000 : v) : 0;
  if (v instanceof Date) { const t = v.getTime(); return Number.isFinite(t) ? t : 0; }
  if (typeof v.toDate === 'function') { try { return v.toDate().getTime() || 0; } catch { return 0; } }
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  if (typeof v === 'string') { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; }
  return 0;
}

const idOf = (x) => (x && (x.id || x.uid)) || '';

/**
 * Olona atolotra — 30 (na `limit`).
 * Filaharana : firenena mitovy (+100) → ville mitovy (+50) → vao nisoratra (0→20).
 */
export function suggestPeople(users, me, limit = 30) {
  const list = Array.isArray(users) ? users : [];
  const m = me || {};
  const myId = idOf(m);
  const excl = new Set([
    myId,
    ...(Array.isArray(m.following) ? m.following : []),
    ...(Array.isArray(m.blocked) ? m.blocked : []),
    ...(Array.isArray(m.friends) ? m.friends : []),
  ].filter(Boolean));

  const myCode = String(m.countryCode || '').trim().toUpperCase();
  const myCountry = norm(m.country);
  const myCity = norm(m.currentCity);

  // Fotoana ho an'ny "vao nisoratra" (0 → 20 poti-isa)
  let newest = 0;
  for (const u of list) { const t = ms(u && u.createdAt); if (t > newest) newest = t; }
  const span = 90 * 86400000;   // 90 andro

  const scored = [];
  for (const u of list) {
    if (!u || typeof u !== 'object') continue;
    const id = idOf(u);
    if (!id || excl.has(id)) continue;
    if (u.disabled === true || u.isBanned === true) continue;

    const code = String(u.countryCode || '').trim().toUpperCase();
    const country = norm(u.country);
    const sameCountry = (myCode && code && myCode === code) || (myCountry && country && myCountry === country);
    const city = norm(u.currentCity);
    const sameCity = myCity && city && myCity === city;

    const t = ms(u.createdAt);
    const fresh = (newest > 0 && t > 0) ? Math.max(0, Math.min(20, 20 - ((newest - t) / span) * 20)) : 0;

    scored.push({
      item: u,
      score: (sameCountry ? 100 : 0) + (sameCity ? 50 : 0) + fresh,
      t,
      name: norm(u.fullName || u.username),
    });
  }

  scored.sort((a, b) => b.score - a.score || b.t - a.t || a.name.localeCompare(b.name));
  const n = Math.max(0, Math.floor(Number(limit)) || 0);
  return scored.slice(0, n).map(x => x.item);
}

/**
 * Boutiques / Artistes atolotra.
 * Filaharana : be mpanaraka indrindra → vaovao indrindra.
 */
export function suggestPages(items, me, limit = 30) {
  const list = Array.isArray(items) ? items : [];
  const m = me || {};
  const myId = idOf(m);
  const blocked = new Set(Array.isArray(m.blocked) ? m.blocked : []);

  const scored = [];
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    const id = idOf(it);
    if (!id || blocked.has(id)) continue;
    const followers = Array.isArray(it.followers) ? it.followers : [];
    if (myId && followers.includes(myId)) continue;      // efa arahina
    if (it.disabled === true) continue;
    scored.push({ item: it, n: followers.length, t: ms(it.createdAt), name: norm(it.name) });
  }
  scored.sort((a, b) => b.n - a.n || b.t - a.t || a.name.localeCompare(b.name));
  const n = Math.max(0, Math.floor(Number(limit)) || 0);
  return scored.slice(0, n).map(x => x.item);
}
