const PREFIX = 'tg:cache:';
const MAX_BYTES = 700 * 1024;

export function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== 'number') return null;
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.v ?? null;
  } catch { return null; }
}

export function writeCache(key, value) {
  try {
    const raw = JSON.stringify({ t: Date.now(), v: value });
    if (raw.length > MAX_BYTES) return;
    localStorage.setItem(PREFIX + key, raw);
  } catch { /* silencieux */ }
}

export const SIX_HOURS = 6 * 60 * 60 * 1000;
