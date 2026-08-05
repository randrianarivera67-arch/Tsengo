/**
 * patch-zoom-deplacable.cjs   —  Zoom AZO AKISAKA ao amin'ny viewer
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : `transform: scale(${scale})` ihany — tsy misy `translate`. Ka rehefa
 *   nozoomina dia MIJANONA EO AFOVOANY ny sary : tsy azo akisaka mba hijerena
 *   ny sisiny.
 *
 * FANOVANA :
 *   • `pan` state { x, y } + `translate()` ao amin'ny transform.
 *   • Rantsan-tanana IRAY rehefa `scale > 1` → mampihetsika ny sary.
 *     ⚠️ Rehefa `scale === 1` dia TSY VOAKASIKA — ny swipe (sary manaraka)
 *        dia mijanona toy ny teo aloha.
 *   • Ny pan dia VOAFETRA (clamp) mba tsy hivoaka tanteraka ny sary.
 *   • Averina ho 0 rehefa miverina amin'ny scale 1, na miova sary.
 *
 * VOAKASIKA : src/components/MediaViewer.jsx ihany.
 *
 * Fampandehanana :  node patch-zoom-deplacable.cjs --dry
 *                   node patch-zoom-deplacable.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/components/MediaViewer.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/components/MediaViewer.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('const [pan, setPan]')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① State pan ── */
const S_OLD = '  const [scale, setScale] = useState(1);';
if (c(S_OLD) !== 1) fail('state scale tsy hita');
s = s.replace(S_OLD, S_OLD + '\n  const [pan, setPan] = useState({ x: 0, y: 0 });   // fanakisahana rehefa zoom');

const P_OLD = '  const pinch = useRef({ d: 0, s: 1, lastTap: 0 });';
if (c(P_OLD) !== 1) fail('ref pinch tsy hita');
s = s.replace(P_OLD, '  const pinch = useRef({ d: 0, s: 1, lastTap: 0 });\n  const drag  = useRef({ on: false, x: 0, y: 0, px: 0, py: 0 });');

/* ── ② Touch start : mandray ny rantsan-tanana iray raha zoom ── */
const TS_OLD = `    } else {
      const now = Date.now();
      if (now - pinch.current.lastTap < 300) setScale((v) => (v > 1 ? 1 : 2.5));
      pinch.current.lastTap = now;
    }`;
if (c(TS_OLD) !== 1) fail('onTouchStartImg tsy hita');
s = s.replace(TS_OLD, `    } else {
      const now = Date.now();
      if (now - pinch.current.lastTap < 300) {
        // Double-tap : zoom / dézoom — ary averina afovoany ny pan
        setScale((v) => (v > 1 ? 1 : 2.5));
        setPan({ x: 0, y: 0 });
      }
      pinch.current.lastTap = now;
      // ⚠️ Rantsan-tanana iray : mampihetsika IHANY raha zoom (scale > 1).
      // Raha scale === 1 dia avela ho an'ny swipe (sary manaraka).
      if (scale > 1) {
        drag.current = { on: true, x: e.touches[0].clientX, y: e.touches[0].clientY,
                         px: pan.x, py: pan.y };
      }
    }`);

/* ── ③ Touch move : pan ── */
const TM_OLD = `      const ns = Math.min(Math.max(pinch.current.s * (d / (pinch.current.d || d)), 1), 4);
      setScale(ns);
    }
  }`;
if (c(TM_OLD) !== 1) fail('onTouchMoveImg tsy hita');
s = s.replace(TM_OLD, `      const ns = Math.min(Math.max(pinch.current.s * (d / (pinch.current.d || d)), 1), 4);
      setScale(ns);
      if (ns <= 1) setPan({ x: 0, y: 0 });
    } else if (drag.current.on && scale > 1) {
      // Fanakisahana VOAFETRA : tsy mivoaka tanteraka ny sary.
      // Ny fetra dia mitombo miaraka amin'ny zoom.
      const lim = (scale - 1) * 260;
      const nx = drag.current.px + (e.touches[0].clientX - drag.current.x);
      const ny = drag.current.py + (e.touches[0].clientY - drag.current.y);
      setPan({ x: Math.max(-lim, Math.min(lim, nx)), y: Math.max(-lim, Math.min(lim, ny)) });
    }
  }
  function onTouchEndImg() { drag.current.on = false; }`);

/* ── ④ Transform ── */
const T_OLD = "transform: i === index ? `scale(${scale})` : 'none'";
if (c(T_OLD) !== 1) fail('transform tsy hita');
s = s.replace(T_OLD,
  "transform: i === index ? `translate(${pan.x}px, ${pan.y}px) scale(${scale})` : 'none'");

/* ── ⑤ onTouchEnd voarohy ── */
// ⚠️ Voafetra amin'ny `i === index` — sary ankehitriny ihany.
const H_OLD = 'onTouchMove={i === index ? onTouchMoveImg : undefined}';
if (c(H_OLD) !== 1) fail('onTouchMove tsy voarohy (' + c(H_OLD) + ')');
s = s.replace(H_OLD, H_OLD +
  '\n                onTouchEnd={i === index ? onTouchEndImg : undefined}' +
  '\n                onTouchCancel={i === index ? onTouchEndImg : undefined}');

/* ── ⑥ Averina rehefa miova sary ── */
const I_OLD = 'setScale(1)';
if (c(I_OLD) < 1) fail('setScale(1) tsy hita (fanavaozana sary)');
s = s.split('setScale(1);').join('setScale(1); setPan({ x: 0, y: 0 });');

/* ── Fanamarinana ── */
if (!s.includes('const [pan, setPan]')) fail('state pan very');
if (!s.includes('translate(${pan.x}px, ${pan.y}px) scale(${scale})')) fail('transform tsy voaova');
if (!s.includes('drag.current.on && scale > 1')) fail('fanakisahana tsy voafetra amin\'ny zoom');
if (!s.includes('onTouchEnd={i === index ? onTouchEndImg : undefined}')) fail('onTouchEnd tsy voarohy');
if (!s.includes('Math.max(-lim, Math.min(lim, nx))')) fail('clamp very');
if (!s.includes("if (e.touches.length === 2)")) fail('pincement simba');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : zoom azo akisaka');
