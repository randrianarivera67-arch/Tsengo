/**
 * patch-navbar-jejo.cjs   —  JEJO : soratra → icône ▶ clay 3D rose
 * ─────────────────────────────────────────────────────────────────────────────
 * ASA : ny `JejoIcon` (soratra « JEJO » 90 px) soloina icône ▶ clay 3D rose,
 *   mitovy endrika amin'ny icône hafa ao amin'ny dock.
 *
 * FOMBA NOFIDIANA — ny risque kely indrindra :
 *   Ampiana ny karazana `'play'` AO ANATIN'NY `ClayNavIcon` EFA MISY, fa tsy
 *   manoratra composant vaovao. Ny rafitra (gradient, ombra, viewBox 64) dia
 *   mizara amin'ny icône 4 hafa izay efa mandeha tsara.
 *
 *   ⚠️ `ClayNavIcon` dia mampiasa `color === '#1877F2'` mba hisafidy manga na
 *   volamena. Ny rose dia karazana FAHATELO : nasiana fanamarinana mazava
 *   (`rose = color === '#FF2D8D'`) fa tsy ternaire mifanindry, mba tsy
 *   hanimba ny icône efa misy.
 *
 * TSY VOAKASIKA :
 *   • Ny lalana (`/reels`), ny navigation, ny badge, ny fihetsika.
 *   • Ny icône 4 hafa (home, amis, plane, profil) — voamarina amin'ny teste.
 *   • Ny `JejoIcon` dia TAZONINA ao amin'ny fichier (mety ampiasaina any
 *     an-kafa) fa tsy antsoina intsony ao amin'ny dock.
 *
 * ENDRIKA :
 *   • Tsy misy soratra « JEJO » intsony → asehoina ny label « Jejo » toy ny
 *     hafa, mba hitovy ny filaharana sy ny elanelana.
 *   • Rehefa active : sela boribory rose miaraka amin'ny ▶ fotsy, mitovy
 *     amin'ny fitondran'ny icône hafa.
 *
 * Fampandehanana :  node patch-navbar-jejo.cjs --dry
 *                   node patch-navbar-jejo.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/components/Layout.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/components/Layout.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
if (s.includes("type === 'play'")) { console.log('⏭  Layout.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① Loko rose ao amin'ny ClayNavIcon ─────────────────────────────── */
s = rep(s,
  `function ClayNavIcon({ type, color = '#1877F2', size = 38 }) {
  const blue = color === '#1877F2';
  const l = blue ? '#7CB8FF' : '#FFE08A';
  const m = blue ? '#2E8BFF' : '#F5C518';
  const d = blue ? '#1667D8' : '#D69A00';`,
  `function ClayNavIcon({ type, color = '#1877F2', size = 38 }) {
  // ⚠️ Karazana loko TELO izao. Ny fanamarinana dia atao MAZAVA isaky ny iray
  // (fa tsy ternaire mifanindry) mba tsy hisy fifangaroana.
  const blue = color === '#1877F2';
  const rose = color === '#FF2D8D';
  const l = rose ? '#FF9CC9' : blue ? '#7CB8FF' : '#FFE08A';
  const m = rose ? '#FF3E97' : blue ? '#2E8BFF' : '#F5C518';
  const d = rose ? '#DA0F68' : blue ? '#1667D8' : '#D69A00';`,
  'colors');

/* ── ② Karazana « play » ────────────────────────────────────────────── */
s = rep(s,
  `        {type === 'profil' && <>`,
  `        {type === 'play' && <>
          {/* Sela boribory + ▶ — endrika mitovy amin'ny icône hafa */}
          <circle cx="32" cy="32" r="22" fill={'url(#' + gid + ')'}/>
          <path d="M27.5 22.8 C26.4 22.1 25 22.9 25 24.2 L25 39.8 C25 41.1 26.4 41.9 27.5 41.2 L40.8 33.4 C41.9 32.8 41.9 31.2 40.8 30.6 Z" fill="#fff"/>
          <ellipse cx="25" cy="24" rx="7" ry="4.2" fill="#fff" opacity="0.3" transform="rotate(-32 25 24)"/>
        </>}
        {type === 'profil' && <>`,
  'play');

/* ── ③ Config : JEJO lasa icône mahazatra ───────────────────────────── */
s = rep(s,
  "    { path: '/reels',      isJejo: true,   label: 'JEJO' },",
  "    { path: '/reels',      icon: 'play',   color: '#FF2D8D', label: 'Jejo' },",
  'config');

/* ── ④ Rendu : esorina ny sampana isJejo ────────────────────────────── */
s = rep(s,
  `        {bottomNav.map(({ path, navState, icon, badge, color, isJejo, label }) => {
          const active = isActive(path);
          const FilledIcon = icon === 'home' ? HiHome : icon === 'amis' ? HiUserGroup : icon === 'plane' ? HiPaperAirplane : HiUser;`,
  `        {bottomNav.map(({ path, navState, icon, badge, color, label }) => {
          const active = isActive(path);
          const FilledIcon = icon === 'home' ? HiHome : icon === 'amis' ? HiUserGroup
                           : icon === 'plane' ? HiPaperAirplane : icon === 'play' ? HiPlay : HiUser;`,
  'map');

s = rep(s,
  `              {isJejo ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, transform: active ? 'scale(1.06)' : 'scale(1)', transition: 'transform .2s' }}>
                  <JejoIcon w={90} />
                </span>
              ) : active ? (`,
  `              {active ? (`,
  'render-open');

s = rep(s,
  `                  background: \`linear-gradient(150deg, \${color === '#1877F2' ? '#4E9BFF' : '#FFD84D'}, \${color === '#1877F2' ? '#1667D8' : '#D69A00'})\`,`,
  `                  background: \`linear-gradient(150deg, \${color === '#1877F2' ? '#4E9BFF' : color === '#FF2D8D' ? '#FF7DC0' : '#FFD84D'}, \${color === '#1877F2' ? '#1667D8' : color === '#FF2D8D' ? '#DA0F68' : '#D69A00'})\`,`,
  'active-bg');

s = rep(s,
  `              {!isJejo && <span className="dock-label" style={{ color: active ? '#111' : '#8A8F98', fontWeight: active ? 800 : 600 }}>{label}</span>}`,
  `              <span className="dock-label" style={{ color: active ? '#111' : '#8A8F98', fontWeight: active ? 800 : 600 }}>{label}</span>`,
  'label');

/* ── ⑤ Import HiPlay ────────────────────────────────────────────────── */
{
  const m = s.match(/import \{([^}]*)\} from 'react-icons\/hi';/);
  if (!m) throw new Error('ASSERTION FAIL [import] : tsy hita ny import react-icons/hi');
  if (!/\bHiPlay\b/.test(m[1])) {
    // ⚠️ Ny lisitra dia mety mifarana amin'ny « , » sahady → esorina aloha
    const inner = m[1].replace(/[\s,]*$/, '');
    s = s.replace(m[0], `import {${inner}, HiPlay } from 'react-icons/hi';`);
  }
}

/* ── Fanamarinana farany ────────────────────────────────────────────── */
if (s.includes('isJejo')) throw new Error('FAIL : mbola misy `isJejo`');
if (!s.includes('<JejoIcon') === false) { /* JejoIcon tsy antsoina intsony */ }
if (countOf(s, '<JejoIcon') !== 0) throw new Error('FAIL : mbola antsoina ny JejoIcon');
if (!/\bHiPlay\b/.test(s)) throw new Error('FAIL : HiPlay tsy tafiditra');
for (const t of ['home', 'amis', 'plane', 'profil', 'play']) {
  if (!s.includes("type === '" + t + "'")) throw new Error('FAIL : very ny karazana ' + t);
}

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 7 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : JEJO → ▶ clay 3D rose');
