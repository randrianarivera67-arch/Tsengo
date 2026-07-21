// src/utils/beautyEngine.js
// ══════════════════════════════════════════════════════════════════════════
// Moteur Beauté MediaPipe (FaceLandmarker) — lissage peau + fond de teint +
// rouge à lèvres + blush, suivi du visage en temps réel (TENA miasa, tsy sarisary).
// Chargé depuis CDN (dynamique) — d\u00e9fensif : si indispo, renvoie l'image brute.
// ══════════════════════════════════════════════════════════════════════════

const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Indices du maillage (MediaPipe Face Mesh 468 pts)
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const LIPS_OUTER = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const LIPS_INNER = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];
const CHEEK_L = 50, CHEEK_R = 280;
const FOREHEAD = 10, CHIN = 152, JAW_L = 234, JAW_R = 454;

let _loader = null;
export function loadMediaPipe() {
  if (_loader) return _loader;
  _loader = (async () => {
    // import dynamique CDN (Vite ne doit pas le bundler)
    const vision = await import(/* @vite-ignore */ (MP_URL + '/vision_bundle.mjs'));
    const { FaceLandmarker, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    return landmarker;
  })().catch(err => { _loader = null; throw err; });
  return _loader;
}

export class BeautyProcessor {
  constructor() {
    this.landmarker = null;
    this.ready = false;
    this.failed = false;
    this.landmarks = null;
    this._off = null;   // canvas offscreen (flou)
    this._lastT = -1;
  }
  async init() {
    try { this.landmarker = await loadMediaPipe(); this.ready = true; }
    catch (e) { this.failed = true; this.ready = false; }
    return this.ready;
  }
  detect(video, tMs) {
    if (!this.ready || !this.landmarker) return;
    try {
      if (tMs <= this._lastT) tMs = this._lastT + 1;
      this._lastT = tMs;
      const res = this.landmarker.detectForVideo(video, tMs);
      this.landmarks = (res && res.faceLandmarks && res.faceLandmarks[0]) || null;
    } catch { /* garde les derniers landmarks */ }
  }
  _pt(lm, i, w, h) { const p = lm[i]; return [p.x * w, p.y * h]; }
  _path(ctx, lm, idxs, w, h) {
    ctx.beginPath();
    idxs.forEach((i, k) => { const [x, y] = this._pt(lm, i, w, h); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
  }
  // opts: { smooth, teint, blush, lips (couleur|null), lipsA, embellir }
  render(video, canvas, opts) {
    const w = video.videoWidth || canvas.width, h = video.videoHeight || canvas.height;
    if (!w || !h) return;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (opts && opts.baseFilter && opts.baseFilter !== 'none') ctx.filter = opts.baseFilter;
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = 'none';

    const lm = this.landmarks;
    const any = opts && (opts.smooth || opts.teint || opts.blush || opts.lips);
    if (!lm || !any) { ctx.restore(); return; }

    // taille visage (pour rayons)
    const [fx, fy] = this._pt(lm, FOREHEAD, w, h);
    const [cx2, cy2] = this._pt(lm, CHIN, w, h);
    const [jlx] = this._pt(lm, JAW_L, w, h);
    const [jrx] = this._pt(lm, JAW_R, w, h);
    const faceW = Math.abs(jrx - jlx) || w * 0.4;
    const faceH = Math.hypot(cx2 - fx, cy2 - fy) || h * 0.5;

    // ── Lissage peau : flou masqué à l'ovale du visage ──
    if (opts.smooth > 0) {
      if (!this._off) this._off = document.createElement('canvas');
      const off = this._off; if (off.width !== w) { off.width = w; off.height = h; }
      const octx = off.getContext('2d');
      const r = Math.max(2, Math.min(14, faceW * 0.02));
      octx.clearRect(0, 0, w, h);
      octx.filter = `blur(${r}px)`;
      octx.drawImage(video, 0, 0, w, h);
      octx.filter = 'none';
      ctx.save();
      this._path(ctx, lm, FACE_OVAL, w, h);
      ctx.clip();
      ctx.globalAlpha = Math.min(0.85, opts.smooth);
      ctx.drawImage(off, 0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Fond de teint : voile chaud sur l'ovale ──
    if (opts.teint > 0) {
      ctx.save();
      this._path(ctx, lm, FACE_OVAL, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.5, opts.teint * 0.5);
      ctx.fillStyle = 'rgb(255,224,196)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ── Blush : deux dégradés roses sur les joues ──
    if (opts.blush > 0) {
      const rad = faceW * 0.16;
      [[CHEEK_L], [CHEEK_R]].forEach(([ci]) => {
        const [x, y] = this._pt(lm, ci, w, h);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(255,120,140,${Math.min(0.4, opts.blush * 0.4)})`);
        g.addColorStop(1, 'rgba(255,120,140,0)');
        ctx.save(); ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    // ── Rouge à lèvres : lèvre extérieure moins bouche intérieure ──
    if (opts.lips) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = opts.lipsA == null ? 0.55 : opts.lipsA;
      ctx.fillStyle = opts.lips;
      this._path(ctx, lm, LIPS_OUTER, w, h);
      ctx.fill();
      // trou bouche
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      this._path(ctx, lm, LIPS_INNER, w, h);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
