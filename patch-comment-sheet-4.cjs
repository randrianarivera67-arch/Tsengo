/**
 * patch-comment-sheet-4.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ① TOKEN MIHARIHARY EO AM-PANORATANA  (porofo : « @[Tonny](TAGxMh2Wm5…) »)
 *
 *    Ny `@[Anarana](uid)` dia endrika FITEHIRIZANA — tsy tokony ho hitan'ny
 *    mpampiasa. Fahadisoana tamin'ny famolavolana ny nampiseho azy mivantana.
 *
 *    → ASEHO : « @Tonny » (soratra tsotra)
 *      TEHIRIZINA : « @[Tonny](uid) »
 *      Ny fanovana dia atao AMIN'NY FANDEFASANA (`toStorage`).
 *
 *    Fomba : ny hook mitahiry ny lisitry ny mention VOAFIDY. Rehefa alefa dia
 *    soloina token ny `@Anarana` tsirairay (indray mandeha isaky ny mention).
 *    Raha novain'ny mpampiasa ny anarana → tsy lasa lien, fa tsy misy simba.
 *
 * ② « Copier » ampiana ao amin'ny menu appui long (Modifier · Supprimer · Copier)
 *    Ny « Copier » dia azon'ny REHETRA, tsy ny tompony ihany.
 *
 * ③ Valiny : mitanila bebe kokoa (40 → 48 px), connecteur mazava kokoa.
 *
 * VOAKASIKA : hooks/useMentions.js · components/CommentSheet.jsx · pages/PostDetail.jsx
 *
 * Fampandehanana :  node patch-comment-sheet-4.cjs --dry
 *                   node patch-comment-sheet-4.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(ROOT, r);

function read(f) {
  if (!fs.existsSync(f)) throw new Error('FICHIER TSY HITA : ' + f);
  return fs.readFileSync(f, 'utf8');
}
const countOf = (s, sub) => s.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

const files = {};
const touched = [];
const load = (r) => (files[r] = files[r] || read(P(r)));
const save = (r, s) => { files[r] = s; if (!touched.includes(r)) touched.push(r); };

/* ═══ ① useMentions : aseho tsotra, tehirizina ho token ═══════════════ */
{
  const rel = 'src/hooks/useMentions.js';
  let s = load(rel);
  if (s.includes('toStorage')) { console.log('  ⏭  useMentions.js : efa voapatch'); }
  else {
    s = rep(s,
      '  const searchRef  = useRef({ q: null, t: null });',
      `  const searchRef  = useRef({ q: null, t: null });
  // Mention voafidy : { name, uid }. Ampiasaina amin'ny FANDEFASANA mba
  // hanoloana ny « @Anarana » ho token « @[Anarana](uid) ».
  const pickedRef = useRef([]);`,
      'um:ref');

    s = rep(s,
      `  const insert = useCallback((value, pick) => {
    setActive(null);
    const v = String(value || '');
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\\[\\]\\n]/g, '').trim() || 'Utilisateur';
      return v.replace(AT_RE, '@[' + name + '](' + pick.uid + ') ');
    }
    return v.replace(AT_RE, '@' + pick + ' ');
  }, []);`,
      `  const insert = useCallback((value, pick) => {
    setActive(null);
    const v = String(value || '');
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\\[\\]\\n]/g, '').trim() || 'Utilisateur';
      // ⚠️ ASEHO ny anarana TSOTRA — ny token dia endrika fitehirizana, tsy
      // tokony ho hitan'ny mpampiasa eo am-panoratana.
      pickedRef.current = [...pickedRef.current.filter(p => p.uid !== pick.uid), { name, uid: pick.uid }];
      return v.replace(AT_RE, '@' + name + ' ');
    }
    return v.replace(AT_RE, '@' + pick + ' ');
  }, []);

  // Fanafarana marika regex — tsy misy regex literal eto (simba ny escapement).
  const SPECIAL = ['.', '*', '+', '?', '^', '(', ')', '|', '[', ']', String.fromCharCode(123),
                   String.fromCharCode(125), String.fromCharCode(36), String.fromCharCode(92)];
  const esc = (t) => String(t).split('').map(ch => SPECIAL.indexOf(ch) >= 0 ? String.fromCharCode(92) + ch : ch).join('');

  /**
   * Lahatsoratra ASEHO -> lahatsoratra TEHIRIZINA.
   * Soloina token ny « @Anarana » tsirairay voafidy (indray mandeha isaky ny
   * mention). Raha novain'ny mpampiasa ny anarana dia tsy lasa lien — tsy misy
   * simba, lahatsoratra tsotra fotsiny.
   */
  const toStorage = useCallback((text) => {
    let out = String(text || '');
    for (const p of pickedRef.current) {
      const re = new RegExp('@' + esc(p.name) + '(?![\\p{L}\\p{N}_])', 'u');
      if (re.test(out)) out = out.replace(re, () => '@[' + p.name + '](' + p.uid + ')');
    }
    return out;
  }, []);

  /** Antsoina aorian'ny fandefasana. */
  const clearPicked = useCallback(() => { pickedRef.current = []; }, []);`,
      'um:insert');

    s = rep(s,
      "  return { people: merged, query: active?.q || '', isOpen, onType, close, insert, insertEntity };",
      "  return { people: merged, query: active?.q || '', isOpen, onType, close, insert, insertEntity, toStorage, clearPicked };",
      'um:return');

    save(rel, s);
  }
}

/* ═══ ② PostDetail : fanovana amin'ny fandefasana ════════════════════ */
{
  const rel = 'src/pages/PostDetail.jsx';
  let s = load(rel);
  if (s.includes('toStorage')) { console.log('  ⏭  PostDetail.jsx : efa voapatch'); }
  else {
    s = rep(s,
      "    const text = (commentText || '').trim(); const media = commentMedia;",
      "    // ASEHO → TEHIRIZINA : ny « @Anarana » lasa token « @[Anarana](uid) »\n    const text = mentions.toStorage((commentText || '').trim()); const media = commentMedia;",
      'pd:tostorage');

    s = rep(s,
      "    setCmtText(''); setCmtMedia(null); setReplyTo(null);",
      "    setCmtText(''); setCmtMedia(null); setReplyTo(null); mentions.clearPicked();",
      'pd:clear');

    save(rel, s);
  }
}

/* ═══ ③ CommentSheet : Copier + valiny mitanila ══════════════════════ */
{
  const rel = 'src/components/CommentSheet.jsx';
  let s = load(rel);
  if (s.includes('Copier')) { console.log('  ⏭  CommentSheet.jsx : efa voapatch'); }
  else {
    // Menu : ny appui long dia misokatra ho an'ny REHETRA (Copier)
    s = rep(s,
      '      if (!movedRef.current && (canEdit(c, meUid) || canDelete(c, meUid, postUid))) setMenu(true);',
      '      if (!movedRef.current) setMenu(true);   // Copier : azon\'ny rehetra',
      'cs:menu-open');

    // Copier ampiana
    s = rep(s,
      `              {canEdit(c, meUid) && (`,
      `              <button onClick={() => {
                  setMenu(false);
                  const t = c.text || '';
                  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(() => {});
                  else {
                    const ta = document.createElement('textarea');
                    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
                    document.body.appendChild(ta); ta.select();
                    try { document.execCommand('copy'); } catch (e) {}
                    document.body.removeChild(ta);
                  }
                }}
                style={{ width: '100%', padding: '13px 20px', border: 'none', background: 'none', textAlign: 'left',
                         fontFamily: 'Poppins', fontSize: 14.5, color: C.txt, cursor: 'pointer' }}>Copier</button>
              {canEdit(c, meUid) && (`,
      'cs:copier');

    // Valiny : mitanila bebe kokoa
    s = rep(s, "marginLeft: isReply ? 40 : 0,", "marginLeft: isReply ? 48 : 0,", 'cs:indent');
    s = rep(s, "position: 'absolute', left: -22, top: -13, bottom: '50%',",
                "position: 'absolute', left: -26, top: -13, bottom: '50%',", 'cs:conn');
    s = rep(s, "width: 18, borderLeft: '2px solid ' + C.bord,",
                "width: 22, borderLeft: '2px solid ' + C.bord,", 'cs:conn2');
    s = rep(s, "style={{ marginLeft: 40, fontSize: 12.5, color: C.gris, fontWeight: 600,",
                "style={{ marginLeft: 48, fontSize: 12.5, color: C.gris, fontWeight: 600,", 'cs:voir');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
