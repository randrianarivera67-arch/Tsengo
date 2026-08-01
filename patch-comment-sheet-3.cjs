/**
 * patch-comment-sheet-3.cjs   —  Appui long réaction + fil mazava
 * ─────────────────────────────────────────────────────────────────────────────
 * ① APPUI LONG AMIN'NY « J'aime » → panneau réaction
 *
 *    Fahadisoana tamin'ny famolavolana : ny picker dia tsy nisokatra afa-tsy
 *    tamin'ny PASTILLE, izay tsy miseho raha tsy misy réaction (n === 0).
 *    Ka tsy nisy fomba nahazoana ny réaction VOALOHANY.
 *
 *    → Appui long (480 ms) amin'ny « J'aime » = panneau.
 *      Tsindry fohy = 👍 avy hatrany (toy ny Facebook).
 *      Ary ny pastille dia mbola manokatra azy koa.
 *
 * ② FIL — valiny mazava kokoa
 *
 *    Ny valiny dia mitanila 40 px sahady, fa tsy hita tsara. Ampiana :
 *      • tsipika mifandray (connecteur) toy ny Facebook
 *      • ny anaran'ny novaliana aseho raha valiny amin'ny valiny
 *
 * ③ « J'aime » manondro ny toe-javatra
 *    Manga raha efa nanao réaction ianao — na inona na inona emoji.
 *
 * VOAKASIKA : src/components/CommentSheet.jsx ihany.
 *
 * Fampandehanana :  node patch-comment-sheet-3.cjs --dry
 *                   node patch-comment-sheet-3.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/components/CommentSheet.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) {
  console.error('❌ Tsy hita : src/components/CommentSheet.jsx — alefaso aloha ny dingana 1.');
  process.exit(1);
}

let s = fs.readFileSync(F, 'utf8');
if (s.includes('likePressRef')) { console.log('⏭  CommentSheet.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① Ref ho an'ny appui long amin'ny « J'aime » ───────────────────── */
s = rep(s,
  '  const pressRef = useRef(null);\n  const movedRef = useRef(false);',
  `  const pressRef = useRef(null);
  const movedRef = useRef(false);
  const likePressRef = useRef(null);   // appui long amin'ny « J'aime »
  const likeLongRef  = useRef(false);  // marika : appui long ve sa tsindry fohy`,
  'ref');

/* ── ② « J'aime » : tsindry fohy = 👍 · appui long = panneau ────────── */
s = rep(s,
  `          <span onClick={() => onReact && onReact(c, '👍')}
            style={{ cursor: 'pointer', color: mine ? C.bleu : C.gris }}>J'aime</span>`,
  `          <span
            onPointerDown={() => {
              likeLongRef.current = false;
              likePressRef.current = setTimeout(() => { likeLongRef.current = true; setPicker(true); }, 480);
            }}
            onPointerUp={() => clearTimeout(likePressRef.current)}
            onPointerLeave={() => clearTimeout(likePressRef.current)}
            onPointerMove={() => clearTimeout(likePressRef.current)}
            onClick={() => {
              // Appui long : ny panneau no misokatra — tsy manao 👍 koa.
              if (likeLongRef.current) { likeLongRef.current = false; return; }
              onReact && onReact(c, mine || '👍');
            }}
            style={{ cursor: 'pointer', color: mine ? C.bleu : C.gris,
                     WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}>
            {mine ? 'Je n\\'aime plus' : "J'aime"}
          </span>`,
  'like');

/* ── ③ Picker : mikatona amin'ny fikasihana ivelany ─────────────────── */
s = rep(s,
  `        {picker && (
          <div onClick={e => e.stopPropagation()}`,
  `        {picker && (
          <>
          <div onClick={() => setPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div onClick={e => e.stopPropagation()}`,
  'picker-open');

s = rep(s,
  `            {REACTIONS.map(e => (
              <span key={e} onClick={() => { onReact && onReact(c, e); setPicker(false); }}
                style={{ fontSize: 21, cursor: 'pointer' }}>{e}</span>
            ))}
          </div>
        )}`,
  `            {REACTIONS.map(e => (
              <span key={e} onClick={() => { onReact && onReact(c, e); setPicker(false); }}
                style={{ fontSize: 21, cursor: 'pointer' }}>{e}</span>
            ))}
          </div>
          </>
        )}`,
  'picker-close');

/* ── ④ Valiny : connecteur mazava (fomba Facebook) ──────────────────── */
s = rep(s,
  `    <div style={{ display: 'flex', gap: 8, marginBottom: 13, marginLeft: isReply ? 40 : 0 }}>
      <img src={ava(c.authorPhoto, c.authorName)} alt="" loading="lazy"`,
  `    <div style={{ display: 'flex', gap: 8, marginBottom: 13, marginLeft: isReply ? 40 : 0,
                  position: 'relative' }}>
      {/* Connecteur — mampiseho mazava fa VALINY izy (fomba Facebook) */}
      {isReply && (
        <span aria-hidden="true" style={{ position: 'absolute', left: -22, top: -13, bottom: '50%',
                                          width: 18, borderLeft: '2px solid ' + C.bord,
                                          borderBottom: '2px solid ' + C.bord,
                                          borderBottomLeftRadius: 10 }} />
      )}
      <img src={ava(c.authorPhoto, c.authorName)} alt="" loading="lazy"`,
  'connecteur');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (countOf(s, 'likePressRef') < 4) throw new Error('FAIL : appui long tsy feno');
if (!s.includes('borderBottomLeftRadius: 10')) throw new Error('FAIL : connecteur tsy tafiditra');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 5 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : appui long réaction + fil mazava');
