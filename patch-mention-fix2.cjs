/**
 * patch-mention-fix2.cjs   —  Fanitsiana bug MARINA roa
 * ─────────────────────────────────────────────────────────────────────────────
 * ① KAJY CLAVIER DISO  (porofo : ny navbar mbola miseho amin'ny screenshot)
 *
 *      const gap = window.innerHeight - vv.height - vv.offsetTop;
 *
 *    Amin'ny Chrome Android dia MIHENA KOA ny `window.innerHeight` rehefa
 *    miakatra ny clavier (layout viewport resize). Ka `gap = 0` → tsy hita
 *    mihitsy ny clavier. Ny fitondrana iOS no nampihariko — diso.
 *
 *    → Tazomina ny haavo LEHIBE INDRINDRA hita (clavier mikatona), dia
 *      ampitahaina amin'ny `vv.height` ankehitriny. Mandeha amin'ny roa tonta.
 *
 * ② PANNEAU MANJAVONA MANGINA
 *
 *      if (!uids.length) return;                            // useMentions
 *      if (!specials.length && !list.length) return null;   // MentionPanel
 *
 *    Ny mpampiasa tsy manana friends/followers/following dia tsy mahazo
 *    soso-kevitra, ary ny panneau MANJAVONA — tsy misy erreur, tsy misy
 *    hafatra. Toy ny "tsy miasa".
 *
 *    → a) Fikarohana MIVANTANA ao amin'ny `users` (prefix username) raha foana
 *         ny lisitra fifandraisana sy raha ≥ 1 litera no voasoratra.
 *      b) Ny panneau dia MANEHO "Aucun résultat" fa tsy manjavona.
 *
 * VOAKASIKA : hooks/useKeyboardInset.js · hooks/useMentions.js · components/MentionPanel.jsx
 *
 * Fampandehanana :  node patch-mention-fix2.cjs --dry
 *                   node patch-mention-fix2.cjs
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

/* ═══ ① useKeyboardInset ═══════════════════════════════════════════════ */
{
  const rel = 'src/hooks/useKeyboardInset.js';
  let s = load(rel);
  if (s.includes('baseRef')) { console.log('  ⏭  useKeyboardInset.js : efa voapatch'); }
  else {
    s = rep(s,
      `    const update = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // < 80 px : barre navigateur, tsy clavier
      setInset(gap > 80 ? Math.round(gap) : 0);
    };`,
      `    // ⚠️ TSY azo ampiasaina ny \`window.innerHeight\` : amin'ny Chrome Android
    // dia MIHENA KOA izy rehefa miakatra ny clavier (layout viewport resize),
    // ka lasa 0 foana ny elanelana. Ny haavo LEHIBE INDRINDRA hita no fototra.
    const update = () => {
      const h = vv.height;
      if (h > baseRef.current) baseRef.current = h;      // clavier mikatona
      const gap = Math.max(0, baseRef.current - h);
      // < 80 px : barre navigateur na fiovana kely, tsy clavier
      setInset(gap > 80 ? Math.round(gap) : 0);
    };`,
      'kb:update');

    s = rep(s,
      "import { useEffect, useState } from 'react';",
      "import { useEffect, useState, useRef } from 'react';",
      'kb:import');

    // Commentaire lany daty (nilaza fa tsy miova ny innerHeight — diso)
    s = rep(s,
      "// Ny `visualViewport` dia fenitra navigateur : rehefa miakatra ny clavier dia\n// mihena ny haavony nefa tsy miova ny `window.innerHeight`. Ny elanelana no\n// haavon'ny clavier. Mandeha ao anaty WebView Capacitor.",
      "// Ny `visualViewport` dia fenitra navigateur : mihena ny haavony rehefa\n// miakatra ny clavier. Ny haavo LEHIBE INDRINDRA hita no fototra ampitahana\n// (ny `window.innerHeight` dia mihena koa amin'ny Chrome Android).",
      'kb:comment');

    s = rep(s,
      '  const [inset, setInset] = useState(0);',
      '  const [inset, setInset] = useState(0);\n  const baseRef = useRef(0);   // haavo lehibe indrindra hita (clavier mikatona)',
      'kb:state');

    save(rel, s);
  }
}

/* ═══ ② useMentions : fikarohana mivantana ═════════════════════════════ */
{
  const rel = 'src/hooks/useMentions.js';
  let s = load(rel);
  if (s.includes('searchUsers')) { console.log('  ⏭  useMentions.js : efa voapatch'); }
  else {
    s = rep(s,
      "import { doc, getDoc } from 'firebase/firestore';",
      "import { doc, getDoc, collection, query, orderBy, startAt, endAt, limit, getDocs } from 'firebase/firestore';",
      'um:import');

    s = rep(s,
      '  const [active, setActive] = useState(null);   // { key, q } | null\n  const [people, setPeople] = useState([]);\n  const loadingRef = useRef(false);',
      `  const [active, setActive] = useState(null);   // { key, q } | null
  const [people, setPeople] = useState([]);     // fifandraisana (friends/followers/following)
  const [found, setFound]   = useState([]);     // vokatry ny fikarohana mivantana
  const loadingRef = useRef(false);
  const searchRef  = useRef({ q: null, t: null });`,
      'um:state');

    s = rep(s,
      `  const onType = useCallback((value, key = 'default') => {
    const m = String(value || '').match(AT_RE);
    if (m) { loadPeople(); setActive({ key, q: m[1].toLowerCase() }); }
    else setActive(null);
  }, [loadPeople]);`,
      `  /**
   * Fikarohana MIVANTANA ao amin'ny \`users\` (prefix username).
   * Ampiasaina raha FOANA ny lisitra fifandraisana — raha tsy izany dia
   * manjavona mangina ny panneau ho an'ny kaonty vaovao.
   */
  const searchUsers = useCallback((q) => {
    if (!q || q.length < 1) { setFound([]); return; }
    if (searchRef.current.q === q) return;
    searchRef.current.q = q;
    clearTimeout(searchRef.current.t);
    searchRef.current.t = setTimeout(async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'users'), orderBy('username'),
          startAt(q), endAt(q + '\uf8ff'), limit(8),
        ));
        setFound(snap.docs
          .filter(d => d.id !== currentUser?.uid)
          .map(d => ({
            uid: d.id, fullName: d.data().fullName || '', username: d.data().username || '',
            photo: d.data().photoThumb || d.data().photoURL || '',
          })));
      } catch (e) { setFound([]); }
    }, 280);
  }, [currentUser]);

  const onType = useCallback((value, key = 'default') => {
    const m = String(value || '').match(AT_RE);
    if (m) {
      const q = m[1].toLowerCase();
      loadPeople();
      searchUsers(q);
      setActive({ key, q });
    } else setActive(null);
  }, [loadPeople, searchUsers]);`,
      'um:search');

    s = rep(s,
      "  return { people, query: active?.q || '', isOpen, onType, close, insert };",
      `  // Fifandraisana aloha, dia ny vokatry ny fikarohana (dédoublonné)
  const merged = (() => {
    const seen = new Set(people.map(p => p.uid));
    return [...people, ...found.filter(f => !seen.has(f.uid))];
  })();

  return { people: merged, query: active?.q || '', isOpen, onType, close, insert };`,
      'um:merge');

    save(rel, s);
  }
}

/* ═══ ② MentionPanel : "Aucun résultat" fa tsy manjavona ═══════════════ */
{
  const rel = 'src/components/MentionPanel.jsx';
  let s = load(rel);
  if (s.includes('Aucun résultat')) { console.log('  ⏭  MentionPanel.jsx : efa voapatch'); }
  else {
    s = rep(s,
      '  if (!specials.length && !list.length) return null;',
      `  // ⚠️ TSY mamerina \`null\` intsony raha foana : nanjavona mangina ny panneau,
  // ka toa "tsy miasa". Aleo maneho hoe tsy misy vokatra.
  const empty = !specials.length && !list.length;`,
      'mp:empty');

    s = rep(s,
      '        {specials.map(s => (',
      `        {empty && (
          <div style={{ padding: '16px 18px', fontSize: 13.5, color: '#65676B' }}>
            {q ? 'Aucun résultat pour « ' + q + ' »' : 'Commencez à taper un nom…'}
          </div>
        )}
        {specials.map(s => (`,
      'mp:render');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
