// src/utils/adminStats.js
// ─────────────────────────────────────────────────────────────────────────────
// Calcul stats admin — fonctions MADIO (tsy misy import Firebase / React) ka
// azo tsapaina 100 % amin'ny Node. Ny NOMBRE rehetra dia EXACT (tsy misy %).
// Voatantana daholo: champ tsy ampy, Timestamp Firestore, ISO string, Date,
// nombre, données maloto → tsy misy NaN, tsy misy crash.
// ─────────────────────────────────────────────────────────────────────────────

/** Miova ho millisecondes: Timestamp Firestore / Date / ISO / nombre → 0 raha tsy mety */
export function toMillis(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? (v < 1e11 ? v * 1000 : v) : 0;
  if (v instanceof Date) { const t = v.getTime(); return Number.isFinite(t) ? t : 0; }
  if (typeof v.toDate === 'function') { try { const t = v.toDate().getTime(); return Number.isFinite(t) ? t : 0; } catch { return 0; } }
  if (typeof v.seconds === 'number')  return v.seconds * 1000;
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  if (typeof v === 'string') { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; }
  return 0;
}

/** Isa MARINA an'ny "en ligne maintenant" avy amin'ny map RTDB { uid: true|false } */
export function countOnline(onlineMap) {
  if (!onlineMap || typeof onlineMap !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(onlineMap)) if (onlineMap[k] === true) n++;
  return n;
}

/** Fiandohan'ny andro (locale) */
function startOfDay(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }

/** Fanalahidin'ny andro YYYY-MM-DD (locale, tsy miankina amin'ny fuseau UTC) */
export function dayKey(ms) {
  const d = new Date(ms);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
export function dayLabel(ms) { const d = new Date(ms); return d.getDate() + ' ' + MOIS[d.getMonth()]; }

/** Isan'ny inscription tao anatin'ny N andro farany (EXACT) */
export function newSignups(users, days = 7, now = Date.now()) {
  if (!Array.isArray(users) || !(days > 0)) return 0;
  const from = startOfDay(now) - (days - 1) * 86400000;
  let n = 0;
  for (const u of users) { const t = toMillis(u && u.createdAt); if (t >= from && t <= now) n++; }
  return n;
}

/** Courbe "Inscriptions par jour" — N andro, misy ny andro 0 (tsy dinganina) */
export function signupsPerDay(users, days = 7, now = Date.now()) {
  const n = Math.max(1, Math.min(365, Math.floor(days) || 7));
  const today = startOfDay(now);
  const buckets = [];
  const index = new Map();
  for (let i = n - 1; i >= 0; i--) {
    const ms = today - i * 86400000;
    const b = { key: dayKey(ms), label: dayLabel(ms), ms, count: 0 };
    index.set(b.key, b); buckets.push(b);
  }
  if (Array.isArray(users)) {
    for (const u of users) {
      const t = toMillis(u && u.createdAt);
      if (!t) continue;
      const b = index.get(dayKey(t));
      if (b) b.count++;
    }
  }
  return buckets;
}

/** Normalisation genre → 'male' | 'female' | 'other' | '' (tsy voafeno) */
export function normGender(g) {
  if (typeof g !== 'string') return '';
  const s = g.trim().toLowerCase();
  if (!s) return '';
  if (['homme', 'male', 'm', 'h', 'lehilahy', 'man'].includes(s)) return 'male';
  if (['femme', 'female', 'f', 'vehivavy', 'woman'].includes(s)) return 'female';
  if (['autre', 'other', 'hafa', 'x', 'nonbinaire', 'non-binaire'].includes(s)) return 'other';
  return '';
}

/** Répartition genre — nombre EXACT (tsy %) */
export function genderStats(users) {
  const out = { male: 0, female: 0, other: 0, unknown: 0, total: 0 };
  if (!Array.isArray(users)) return out;
  for (const u of users) {
    out.total++;
    const g = normGender(u && u.gender);
    if (g === 'male') out.male++;
    else if (g === 'female') out.female++;
    else if (g === 'other') out.other++;
    else out.unknown++;
  }
  return out;
}

/** Normalisation anaran-firenena (accents/majuscules/espaces mihoatra) */
export function normCountryKey(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Utilisateurs par pays — izay firenena MISY user ihany, nombre EXACT, alahatra
 * midina. Ny groupement dia amin'ny countryCode (raha misy) na amin'ny anarana.
 */
export function countryStats(users) {
  if (!Array.isArray(users)) return [];
  const map = new Map();
  for (const u of users) {
    const rawName = (u && (u.country || u.pays)) || '';
    const code = (u && u.countryCode ? String(u.countryCode).trim().toUpperCase() : '');
    const nameKey = normCountryKey(rawName);
    if (!code && !nameKey) continue;                 // tsy voafeno → tsy tanisaina
    const key = code || nameKey;
    const cur = map.get(key);
    if (cur) { cur.count++; if (!cur.name && rawName) cur.name = String(rawName).trim(); }
    else map.set(key, { code: code || '', name: String(rawName).trim() || key.toUpperCase(), count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Isan'ny user tsy mbola nametra firenena (asehoina ho "Non renseigné") */
export function countryUnknown(users) {
  if (!Array.isArray(users)) return 0;
  let n = 0;
  for (const u of users) {
    const hasName = normCountryKey((u && (u.country || u.pays)) || '');
    const hasCode = u && u.countryCode ? String(u.countryCode).trim() : '';
    if (!hasName && !hasCode) n++;
  }
  return n;
}

/** Activité en temps réel — mifangaro dia alahatra araka ny vaovao indrindra */
export function buildActivity({ users = [], posts = [], shops = [], artists = [] } = {}, limit = 8) {
  const items = [];
  const push = (type, name, ms, extra) => { if (ms) items.push({ type, name: name || '—', ms, ...extra }); };
  for (const u of users)   push('user',   u && (u.fullName || u.username), toMillis(u && u.createdAt), { uid: u && u.id, photoURL: u && u.photoURL });
  for (const p of posts)   push('post',   p && (p.authorName || p.authorUsername), toMillis(p && p.createdAt), { uid: p && p.uid });
  for (const s of shops)   push('shop',   s && s.name, toMillis(s && s.createdAt), {});
  for (const a of artists) push('artist', a && a.name, toMillis(a && a.createdAt), {});
  items.sort((x, y) => y.ms - x.ms);
  const n = Math.max(0, Math.floor(limit) || 0);
  return items.slice(0, n);
}

/** "Il y a ..." fohy sy marina */
export function agoShort(ms, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return 'Il y a ' + s + ' sec';
  const m = Math.floor(s / 60);
  if (m < 60) return 'Il y a ' + m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return 'Il y a ' + h + ' h';
  const j = Math.floor(h / 24);
  if (j < 30) return 'Il y a ' + j + ' j';
  const mo = Math.floor(j / 30);
  if (mo < 12) return 'Il y a ' + mo + ' mois';
  return 'Il y a ' + Math.floor(mo / 12) + ' an' + (mo >= 24 ? 's' : '');
}

/** Fanoratana nombre: 24853 → "24 853" (espace fine, mora vakiana) */
export function fmt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
}

/** Sanda ambony indrindra amin'ny courbe (ho an'ny échelle) — tsy 0 mihitsy */
export function maxOf(list, pick = (x) => x.count) {
  let m = 0;
  if (Array.isArray(list)) for (const x of list) { const v = Number(pick(x)) || 0; if (v > m) m = v; }
  return m > 0 ? m : 1;
}
