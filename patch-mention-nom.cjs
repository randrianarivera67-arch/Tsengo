/**
 * patch-mention-nom.cjs   —  Mention amin'ny ANARANA (fomba Facebook)
 * ─────────────────────────────────────────────────────────────────────────────
 * OLANA : ny mention dia mampiditra `@username`. Ny Facebook dia maneho ny
 *   ANARANA (`@Tony Rakoto`).
 *
 * NAHOANA NO TSY AMPY NY MAMPIDITRA NY ANARANA FOTSINY :
 *   Misy elanelana ny anarana. Ny parser dia mizara amin'ny fetra teny, ka
 *   `@Tony Rakoto` dia ho voarain'ny `@Tony` ihany — tapaka ny anarana feno,
 *   ary tsy fantatra intsony hoe iza marina (olona roa mitovy anarana).
 *
 * VAHAOLANA — TOKEN ENTITÉ (fomba markdown) :
 *
 *      @[Tony Rakoto](kQ7x…uid)
 *      ▲ aseho : « @Tony Rakoto »   ▲ lalana : /profile/kQ7x…uid
 *
 *   • Ny anarana no ASEHO, ny uid no MITONDRA — mitovy amin'ny Facebook.
 *   • Ny uid dia MAZAVA : tsy misy fikarohana username, tsy misy fifangaroana.
 *   • Ny notification dia maka ny uid MIVANTANA ao anaty token — tsy misy
 *     fampifanarahana anarana intsony (io no loharanon'ny bug taloha).
 *   • TSY MISY fanovana schéma : lahatsoratra tsotra ihany. Ny commentaire
 *     TALOHA dia tsy voakasika.
 *   • Ny `@username` tsotra dia MBOLA mandeha (route /u/:username) — ho an'ny
 *     izay manoratra an-tanana.
 *
 * @followers / @everyone : token mitovy — `@[Abonnés](followers)`.
 *
 * VOAKASIKA : utils/appLink.js · components/Linkify.jsx · hooks/useMentions.js
 *             components/MentionPanel.jsx · pages/Home.jsx
 *
 * Fampandehanana :  node patch-mention-nom.cjs --dry
 *                   node patch-mention-nom.cjs
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

/* ═══ 1) appLink.js : parser ny token entité ═══════════════════════════ */
{
  const rel = 'src/utils/appLink.js';
  let s = load(rel);
  if (s.includes('ENTITY_RE')) { console.log('  ⏭  appLink.js : efa voapatch'); }
  else {
    s = rep(s,
      'const MENTION_RE = ',
      `/**
 * Token entité :  @[Anarana Feno](uid)
 * Ny anarana no ASEHO, ny uid no MITONDRA — mitovy amin'ny Facebook.
 * Ny anarana dia mety misy elanelana sy marika ; ny \`[^\\\\]]\` no fetra.
 */
const ENTITY_RE = /@\\[([^\\]\\n]{1,80})\\]\\(([A-Za-z0-9_-]{1,64})\\)/g;

const MENTION_RE = `,
      'appLink:entity');

    s = rep(s,
      `    let last = 0, m;
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(p.value)) !== null) {
      const at = m.index + m[1].length;              // toerana marin'ny '@'
      if (at > last) out.push({ type: 'text', value: p.value.slice(last, at) });
      out.push({ type: 'mention', value: '@' + m[2], username: m[2] });
      last = at + 1 + m[2].length;
    }
    if (last < p.value.length) out.push({ type: 'text', value: p.value.slice(last) });`,
      `    // ── ① Token entité @[Anarana](uid) — mandeha ALOHA ────────────────
    const chunks = [];
    let last = 0, m;
    ENTITY_RE.lastIndex = 0;
    while ((m = ENTITY_RE.exec(p.value)) !== null) {
      if (m.index > last) chunks.push({ text: p.value.slice(last, m.index) });
      chunks.push({ entity: { type: 'mention', value: '@' + m[1], name: m[1], uid: m[2] } });
      last = m.index + m[0].length;
    }
    if (last < p.value.length) chunks.push({ text: p.value.slice(last) });

    // ── ② @username tsotra ao anatin'ny ampahany sisa ─────────────────
    for (const c of chunks) {
      if (c.entity) { out.push(c.entity); continue; }
      let l2 = 0, m2;
      MENTION_RE.lastIndex = 0;
      while ((m2 = MENTION_RE.exec(c.text)) !== null) {
        const at = m2.index + m2[1].length;           // toerana marin'ny '@'
        if (at > l2) out.push({ type: 'text', value: c.text.slice(l2, at) });
        out.push({ type: 'mention', value: '@' + m2[2], username: m2[2] });
        l2 = at + 1 + m2[2].length;
      }
      if (l2 < c.text.length) out.push({ type: 'text', value: c.text.slice(l2) });
    }`,
      'appLink:split');

    s = rep(s,
      "export function splitRich(text) {",
      `export function splitRich(text) {`,
      'appLink:noop');

    // Helper : fakana ny uid rehetra voatonona
    s = rep(s,
      '/** Mizara ny lahatsoratra ho ampahany : { type: \'text\'|\'link\', value, internal } */',
      `/**
 * Ny uid REHETRA voatonona ao anaty lahatsoratra (token entité ihany).
 * Ampiasain'ny notification : mazava, tsy misy fampifanarahana anarana.
 * @returns {{uid:string, name:string}[]}
 */
export function mentionedEntities(text) {
  const out = [];
  if (!text) return out;
  let m; ENTITY_RE.lastIndex = 0;
  while ((m = ENTITY_RE.exec(text)) !== null) out.push({ uid: m[2], name: m[1] });
  return out;
}

/** Mizara ny lahatsoratra ho ampahany : { type: 'text'|'link', value, internal } */`,
      'appLink:helper');

    save(rel, s);
  }
}

/* ═══ 2) Linkify.jsx : rendu ny entité ═════════════════════════════════ */
{
  const rel = 'src/components/Linkify.jsx';
  let s = load(rel);
  if (s.includes('p.uid')) { console.log('  ⏭  Linkify.jsx : efa voapatch'); }
  else {
    s = rep(s,
      `          const SPECIAL_TAGS = { followers: 'Abonnés', everyone: 'Tout le monde' };
          const sp = SPECIAL_TAGS[String(p.username).toLowerCase()];`,
      `          // Token manokana (@followers / @everyone) : badge, tsy lien
          const SPECIAL_TAGS = { followers: 'Abonnés', everyone: 'Tout le monde' };
          const sp = SPECIAL_TAGS[String(p.uid || p.username).toLowerCase()];`,
      'linkify:special');

    s = rep(s,
      `          return (
            <a key={i} href={\`/u/\${p.username}\`}`,
      `          // Token entité : ny uid no mitondra — mazava, tsy misy fikarohana
          if (p.uid) {
            return (
              <a key={i} href={\`/profile/\${p.uid}\`}
                style={{ color: color || '#1877F2', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(\`/profile/\${p.uid}\`); }}>
                {p.value}
              </a>
            );
          }
          return (
            <a key={i} href={\`/u/\${p.username}\`}`,
      'linkify:entity');

    save(rel, s);
  }
}

/* ═══ 3) useMentions.js : insert mamorona ny token ════════════════════ */
{
  const rel = 'src/hooks/useMentions.js';
  let s = load(rel);
  if (s.includes('insertEntity')) { console.log('  ⏭  useMentions.js : efa voapatch'); }
  else {
    s = rep(s,
      `  const insert = useCallback((value, tag) => {
    setActive(null);
    return String(value || '').replace(AT_RE, '@' + tag + ' ');
  }, []);`,
      `  /**
   * Mamerina ny lahatsoratra misy ny mention voafidy.
   * @param {string} value
   * @param {{name:string, uid:string}|string} pick  entité na tag tsotra
   *
   * Token entité :  @[Anarana Feno](uid)  → aseho « @Anarana Feno »
   * Ny anarana dia diovina : ny \`[\` \`]\` dia hanapaka ny token.
   */
  const insert = useCallback((value, pick) => {
    setActive(null);
    const v = String(value || '');
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\\[\\]\\n]/g, '').trim() || 'Utilisateur';
      return v.replace(AT_RE, '@[' + name + '](' + pick.uid + ') ');
    }
    return v.replace(AT_RE, '@' + pick + ' ');
  }, []);

  /** Alias mazava kokoa — mitovy amin'ny \`insert\`. */
  const insertEntity = insert;`,
      'um:insert');

    s = rep(s,
      "  return { people: merged, query: active?.q || '', isOpen, onType, close, insert };",
      "  return { people: merged, query: active?.q || '', isOpen, onType, close, insert, insertEntity };",
      'um:return');

    save(rel, s);
  }
}

/* ═══ 4) MentionPanel.jsx : onPick mandefa ny entité ══════════════════ */
{
  const rel = 'src/components/MentionPanel.jsx';
  let s = load(rel);
  if (s.includes('uid: p.uid')) { console.log('  ⏭  MentionPanel.jsx : efa voapatch'); }
  else {
    s = rep(s,
      '          <Row key={s.tag} onClick={() => onPick(s.tag)}>',
      "          <Row key={s.tag} onClick={() => onPick({ name: s.label.replace(/^@/, ''), uid: s.tag })}>",
      'mp:special');

    s = rep(s,
      "          <Row key={p.uid} onClick={() => onPick(p.username || (p.fullName || '').split(' ')[0])}>",
      "          <Row key={p.uid} onClick={() => onPick({ name: p.fullName || p.username || 'Utilisateur', uid: p.uid })}>",
      'mp:person');

    save(rel, s);
  }
}

/* ═══ 5) Home.jsx : notification amin'ny uid mivantana ════════════════ */
{
  const rel = 'src/pages/Home.jsx';
  let s = load(rel);
  if (s.includes('mentionedEntities')) { console.log('  ⏭  Home.jsx : efa voapatch'); }
  else {
    const impRe = /import \{([^}]*)\} from '\.\.\/utils\/appLink';/;
    if (impRe.test(s)) {
      const m = s.match(impRe);
      s = s.replace(m[0], `import {${m[1].replace(/\s*$/, '')}, mentionedEntities } from '../utils/appLink';`);
    } else {
      s = rep(s, "import MentionPanel from '../components/MentionPanel';",
        "import MentionPanel from '../components/MentionPanel';\nimport { mentionedEntities } from '../utils/appLink';", 'home:import');
    }

    s = rep(s,
      `      const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;
      const mentionUsernames = new Set();
      let mm; RE.lastIndex = 0;
      while ((mm = RE.exec(text)) !== null) mentionUsernames.add(mm[2].toLowerCase());`,
      `      // ① Token entité @[Anarana](uid) → ny uid MIVANTANA, tsy misy fampifanarahana
      const entityUids = new Set(mentionedEntities(text).map(e => e.uid));
      // ② @username tsotra (nosoratana an-tanana)
      const RE = /(^|[^\\p{L}\\p{N}_@])@([a-zA-Z0-9_.]{2,30})/gu;
      const mentionUsernames = new Set([...entityUids].map(u => String(u).toLowerCase()));
      let mm; RE.lastIndex = 0;
      while ((mm = RE.exec(text)) !== null) mentionUsernames.add(mm[2].toLowerCase());`,
      'home:entities');

    s = rep(s,
      `      const mentioned = mentionFriends.filter(f => {
        const u = (f.username || '').toLowerCase();
        if (u && mentionUsernames.has(u)) return true;`,
      `      const mentioned = mentionFriends.filter(f => {
        if (entityUids.has(f.uid)) return true;        // token entité : mazava
        const u = (f.username || '').toLowerCase();
        if (u && mentionUsernames.has(u)) return true;`,
      'home:match');

    save(rel, s);
  }
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);

console.log(DRY ? '\n✅ DRY-RUN : fanoloana rehetra mety (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
if (!touched.length) console.log('   (tsy nisy fanovana — efa voapatch)');
