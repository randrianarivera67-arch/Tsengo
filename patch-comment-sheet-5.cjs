/**
 * patch-comment-sheet-5.cjs   —  Picker réaction : toerana refesina
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA (voamarina) : ny picker dia `position:absolute; bottom:'100%'` —
 *   RAIKITRA ambony foana. Ka amin'ny commentaire AMBONY INDRINDRA dia
 *   takona ambanin'ny en-tête, na mivoaka ny écran : tsy azo tsindriana.
 *
 *   Fahadisoana tamin'ny famolavolana : toerana raikitra nefa MIOVA ny
 *   toeran'ny commentaire ao anaty lisitra.
 *
 * VAHAOLANA — portal + refesina :
 *   • `getBoundingClientRect()` amin'ny fanokafana.
 *   • Misy toerana ambony → apetraka AMBONY.
 *     Tsy misy → MIVADIKA ambany (flip) — toy ny Facebook.
 *   • Voafetra ny sisiny havia/havanana mba tsy hivoaka amin'ny écran.
 *   • Portal → tsy voatapaky ny `overflow` an'ny lisitra.
 *
 * VOAKASIKA : src/components/CommentSheet.jsx ihany.
 *
 * Fampandehanana :  node patch-comment-sheet-5.cjs --dry
 *                   node patch-comment-sheet-5.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/components/CommentSheet.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/components/CommentSheet.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
if (s.includes('pickerPos')) { console.log('⏭  CommentSheet.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① State + ref ──────────────────────────────────────────────────── */
s = rep(s,
  '  const [picker, setPicker] = useState(false);',
  `  const [picker, setPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState(null);   // { top, left, flip }
  const likeElRef = useRef(null);                     // ancre ho an'ny fandrefesana`,
  'state');

/* ── ② Fonction fanokafana : refesina ny toerana ────────────────────── */
s = rep(s,
  '  const mine = reactCount(c) ? (c.reactions || {})[meUid] : null;',
  `  /**
   * Manokatra ny picker eo amin'ny toerana MARINA.
   * Misy toerana ambony → ambony ; tsy misy → mivadika ambany (flip).
   * Voafetra ny sisiny mba tsy hivoaka amin'ny écran.
   */
  const openPicker = () => {
    const W = 232, H = 44, PAD = 8;
    const el = likeElRef.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      setPickerPos({ top: PAD, left: PAD, flip: false }); setPicker(true); return;
    }
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth || 360;
    const flip = r.top < (H + 22);                      // tsy ampy toerana ambony
    const top = flip ? r.bottom + 6 : r.top - H - 6;
    const left = Math.max(PAD, Math.min(r.left - 6, vw - W - PAD));
    setPickerPos({ top: Math.round(top), left: Math.round(left), flip });
    setPicker(true);
  };

  const mine = reactCount(c) ? (c.reactions || {})[meUid] : null;`,
  'openPicker');

/* ── ③ Appui long → openPicker ──────────────────────────────────────── */
s = rep(s,
  '              likePressRef.current = setTimeout(() => { likeLongRef.current = true; setPicker(true); }, 480);',
  '              likePressRef.current = setTimeout(() => { likeLongRef.current = true; openPicker(); }, 480);',
  'long');

/* ── ④ Ref amin'ny « J'aime » ───────────────────────────────────────── */
s = rep(s,
  '          <span\n            onPointerDown={() => {',
  '          <span\n            ref={likeElRef}\n            onPointerDown={() => {',
  'ref');

/* ── ⑤ Pastille → openPicker ────────────────────────────────────────── */
s = rep(s,
  '            <span onClick={() => setPicker(p => !p)}',
  '            <span onClick={() => (picker ? setPicker(false) : openPicker())}',
  'pastille');

/* ── ⑥ Rendu : portal amin'ny toerana refesina ──────────────────────── */
s = rep(s,
  `        {picker && (
          <>
          <div onClick={() => setPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 5, display: 'flex', gap: 5,
                     background: 'white', borderRadius: 22, padding: '5px 9px', zIndex: 5,
                     boxShadow: '0 3px 14px rgba(0,0,0,.2)', border: '1px solid ' + C.bord }}>
            {REACTIONS.map(e => (
              <span key={e} onClick={() => { onReact && onReact(c, e); setPicker(false); }}
                style={{ fontSize: 21, cursor: 'pointer' }}>{e}</span>
            ))}
          </div>
          </>
        )}`,
  `        {picker && pickerPos && createPortal(
          <>
            <div onClick={() => setPicker(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9600 }} />
            {/* Toerana REFESINA : ambony raha misy, ambany raha tsy misy (flip) */}
            <div onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9601,
                       display: 'flex', gap: 5, background: 'white', borderRadius: 22, padding: '5px 9px',
                       boxShadow: '0 3px 14px rgba(0,0,0,.2)', border: '1px solid ' + C.bord }}>
              {REACTIONS.map(e => (
                <span key={e} onClick={() => { onReact && onReact(c, e); setPicker(false); }}
                  style={{ fontSize: 21, cursor: 'pointer', lineHeight: 1.35 }}>{e}</span>
              ))}
            </div>
          </>, document.body)}`,
  'render');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (s.includes("bottom: '100%'")) throw new Error('FAIL : mbola misy toerana raikitra');
if (countOf(s, 'openPicker()') !== 2) {
  throw new Error('FAIL : nandrasana 2 antso openPicker, nahitana ' + countOf(s, 'openPicker()'));
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 6 mety (tsy nisy nosoratana)'
  : "✅ Patch vita : picker amin'ny toerana refesina (flip)");
