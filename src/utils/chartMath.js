// src/utils/chartMath.js
// ─────────────────────────────────────────────────────────────────────────────
// Calcul matematika ho an'ny graphes SVG — fonction MADIO (tsy misy React/SVG)
// ka azo tsapaina 100 % amin'ny Node. Antoka: tsy misy NaN/Infinity mivoaka.
// ─────────────────────────────────────────────────────────────────────────────

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Toerana (x, y) an'ny teboka isaky ny sanda.
 * w/h = habe anatiny (efa nesorina ny marge). max > 0 foana.
 */
export function points(values, w, h, max) {
  const vals = Array.isArray(values) ? values.map(num) : [];
  const W = num(w) > 0 ? num(w) : 1;
  const H = num(h) > 0 ? num(h) : 1;
  const M = num(max) > 0 ? num(max) : 1;
  const n = vals.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: r2(W / 2), y: r2(H - (Math.min(vals[0], M) / M) * H), v: vals[0] }];
  const step = W / (n - 1);
  return vals.map((v, i) => ({
    x: r2(i * step),
    y: r2(H - (Math.max(0, Math.min(v, M)) / M) * H),
    v,
  }));
}

/** Tsipika mahitsy (polyline) */
export function linePath(pts) {
  if (!Array.isArray(pts) || pts.length === 0) return '';
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
}

/**
 * Tsipika MALEFAKA (Catmull-Rom → Bézier cubique).
 * tension 0 → mahitsy ; 1 → malefaka be. Voafetra ao anatin'ny [0, 1].
 */
export function smoothPath(pts, tension = 0.85) {
  if (!Array.isArray(pts) || pts.length === 0) return '';
  if (pts.length < 3) return linePath(pts);
  const t = Math.max(0, Math.min(1, num(tension))) / 6;
  let d = 'M' + pts[0].x + ' ' + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = r2(p1.x + (p2.x - p0.x) * t);
    const c1y = r2(p1.y + (p2.y - p0.y) * t);
    const c2x = r2(p2.x - (p3.x - p1.x) * t);
    const c2y = r2(p2.y - (p3.y - p1.y) * t);
    d += ' C' + c1x + ' ' + c1y + ',' + c2x + ' ' + c2y + ',' + p2.x + ' ' + p2.y;
  }
  return d;
}

/** Faritra feno (area) — mihidy amin'ny fototra */
export function areaPath(pts, h, smooth = true) {
  if (!Array.isArray(pts) || pts.length === 0) return '';
  const H = num(h);
  const top = smooth ? smoothPath(pts) : linePath(pts);
  const last = pts[pts.length - 1];
  return top + ' L' + last.x + ' ' + H + ' L' + pts[0].x + ' ' + H + ' Z';
}

/**
 * Segments donut amin'ny stroke-dasharray (azo antoka kokoa noho ny arc path).
 * Miverina: [{ key, value, dash, offset, pct }] — pct ho an'ny fanaovana angle ihany.
 */
export function donutSegments(entries, circumference) {
  const C = num(circumference) > 0 ? num(circumference) : 1;
  const list = (Array.isArray(entries) ? entries : []).map(e => ({ key: e && e.key, value: Math.max(0, num(e && e.value)) }));
  const total = list.reduce((s, e) => s + e.value, 0);
  let acc = 0;
  return list.map(e => {
    const pct = total > 0 ? e.value / total : 0;
    const len = r2(pct * C);
    const seg = { key: e.key, value: e.value, dash: len + ' ' + r2(C - len), offset: r2(-acc), pct };
    acc = r2(acc + len);
    return seg;
  });
}

/** Loko araka ny isa (choroplèthe) — paliers mitovy amin'ny légende */
export const MAP_STEPS = [
  { min: 10000, color: '#4C1D95' },
  { min: 5000,  color: '#6D28D9' },
  { min: 1000,  color: '#8B5CF6' },
  { min: 500,   color: '#A78BFA' },
  { min: 100,   color: '#C4B5FD' },
  { min: 1,     color: '#E9D5FF' },
];
export function mapColor(count, empty = '#EEF0F4') {
  const n = num(count);
  if (n <= 0) return empty;
  for (const s of MAP_STEPS) if (n >= s.min) return s.color;
  return empty;
}

/** Sanda ambony boribory (ho an'ny axe Y) : 342 → 400, 3090 → 3500 */
export function niceMax(max) {
  const m = num(max);
  if (m <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const s of steps) { const cand = s * pow; if (cand >= m) return cand; }
  return 10 * pow;
}

/** Marika axe Y (4 sombiny) */
export function yTicks(max, count = 4) {
  const M = num(max) > 0 ? num(max) : 1;
  const n = Math.max(1, Math.floor(num(count)) || 4);
  const out = [];
  for (let i = n; i >= 0; i--) out.push(Math.round((M / n) * i));
  return out;
}

/** Teboka akaiky indrindra ny x nokitihina (ho an'ny tooltip) */
export function nearestIndex(pts, x) {
  if (!Array.isArray(pts) || pts.length === 0) return -1;
  const X = num(x);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = Math.abs(num(pts[i].x) - X);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
