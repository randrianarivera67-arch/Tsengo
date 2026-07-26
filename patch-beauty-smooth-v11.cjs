const fs = require('fs');
const p = 'src/utils/beautyEngine.js';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('LEFT_EYE')) { console.log('SKIP deja applique'); process.exit(0); }

const aC = "const CHEEK_L = 50, CHEEK_R = 280;";
if (s.split(aC).length - 1 !== 1) { console.log('ERR ancre constantes'); process.exit(1); }
s = s.replace(aC, `const LEFT_EYE  = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const RIGHT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
const LEFT_BROW  = [70,63,105,66,107,55,65,52,53,46];
const RIGHT_BROW = [300,293,334,296,336,285,295,282,283,276];
${aC}`);

const OLD = `    if (opts.smooth > 0) {
      if (!this._off) this._off = document.createElement('canvas');
      const off = this._off; if (off.width !== w) { off.width = w; off.height = h; }
      const octx = off.getContext('2d');
      const r = Math.max(2, Math.min(14, faceW * 0.02));
      octx.clearRect(0, 0, w, h);
      octx.filter = \`blur(\${r}px)\`;
      octx.drawImage(video, 0, 0, w, h);
      octx.filter = 'none';
      ctx.save();
      this._path(ctx, lm, FACE_OVAL, w, h);
      ctx.clip();
      ctx.globalAlpha = Math.min(0.85, opts.smooth);
      ctx.drawImage(off, 0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    }`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre lissage ('+(s.split(OLD).length-1)+')'); process.exit(1); }

s = s.replace(OLD, `    if (opts.smooth > 0) {
      if (!this._off)  this._off  = document.createElement('canvas');
      if (!this._mask) this._mask = document.createElement('canvas');
      const off = this._off, mask = this._mask;
      if (off.width !== w)  { off.width = w;  off.height = h; }
      if (mask.width !== w) { mask.width = w; mask.height = h; }
      const octx = off.getContext('2d');
      const mctx = mask.getContext('2d');

      const r = Math.max(2, Math.min(16, faceW * 0.022));

      octx.clearRect(0, 0, w, h);
      octx.filter = \`blur(\${r}px)\`;
      octx.drawImage(video, 0, 0, w, h);
      octx.filter = 'none';

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

      octx.globalCompositeOperation = 'destination-in';
      octx.drawImage(mask, 0, 0, w, h);
      octx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = Math.min(0.72, opts.smooth * 0.8);
      ctx.drawImage(off, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }`);

fs.writeFileSync(p, s);
console.log('OK : lissage v1.1');
