const fs = require('fs');
const p = 'src/utils/beautyEngine.js';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('_teintLayer')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD = `    // ── Fond de teint : voile chaud sur l'ovale ──
    if (opts.teint > 0) {
      ctx.save();
      this._path(ctx, lm, FACE_OVAL, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.5, opts.teint * 0.5);
      ctx.fillStyle = 'rgb(255,224,196)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre teint ('+(s.split(OLD).length-1)+')'); process.exit(1); }

s = s.replace(OLD, `    // ── Fond de teint : voile applique a la PEAU seule, bords fondus ──
    if (opts.teint > 0) {
      if (!this._mask) this._mask = document.createElement('canvas');
      const mask = this._mask;
      if (mask.width !== w) { mask.width = w; mask.height = h; }

      if (!(opts.smooth > 0)) {
        const mctx = mask.getContext('2d');
        const feather = Math.max(6, faceW * 0.06);
        mctx.clearRect(0, 0, w, h);
        mctx.filter = \`blur(\${feather}px)\`;
        mctx.fillStyle = '#fff';
        this._path(mctx, lm, FACE_OVAL, w, h);
        mctx.fill();
        mctx.globalCompositeOperation = 'destination-out';
        [LEFT_EYE, RIGHT_EYE, LEFT_BROW, RIGHT_BROW, LIPS_OUTER].forEach(idxs => {
          this._path(mctx, lm, idxs, w, h);
          mctx.fill();
        });
        mctx.globalCompositeOperation = 'source-over';
        mctx.filter = 'none';
      }

      if (!this._teintLayer) this._teintLayer = document.createElement('canvas');
      const tl = this._teintLayer;
      if (tl.width !== w) { tl.width = w; tl.height = h; }
      const tctx = tl.getContext('2d');
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, w, h);
      tctx.fillStyle = 'rgb(255,226,205)';
      tctx.fillRect(0, 0, w, h);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(mask, 0, 0, w, h);
      tctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.38, opts.teint * 0.42);
      ctx.drawImage(tl, 0, 0, w, h);
      ctx.restore();
    }`);

fs.writeFileSync(p, s);
console.log('OK : fond de teint v1.1');
