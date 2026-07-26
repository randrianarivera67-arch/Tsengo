const fs = require('fs');
const p = 'src/utils/beautyEngine.js';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('_lipLayer')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD = `    if (opts.lips) {
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
    }`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre levres ('+(s.split(OLD).length-1)+')'); process.exit(1); }

s = s.replace(OLD, `    if (opts.lips) {
      if (!this._lipLayer) this._lipLayer = document.createElement('canvas');
      const ll = this._lipLayer;
      if (ll.width !== w) { ll.width = w; ll.height = h; }
      const lctx = ll.getContext('2d');
      const lipFeather = Math.max(1.5, faceW * 0.006);

      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, w, h);
      lctx.filter = \`blur(\${lipFeather}px)\`;
      lctx.fillStyle = opts.lips;
      this._path(lctx, lm, LIPS_OUTER, w, h);
      lctx.fill();

      // Ouverture de la bouche : retiree DU CALQUE (jamais de l'image)
      lctx.globalCompositeOperation = 'destination-out';
      this._path(lctx, lm, LIPS_INNER, w, h);
      lctx.fill();
      lctx.globalCompositeOperation = 'source-over';
      lctx.filter = 'none';

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = opts.lipsA == null ? 0.5 : opts.lipsA;
      ctx.drawImage(ll, 0, 0, w, h);
      ctx.restore();
    }`);

fs.writeFileSync(p, s);
console.log('OK : rouge a levres v1.1');
