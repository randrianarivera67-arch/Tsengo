/**
 * patch-placeholder.cjs   —  Placeholder profil & couverture
 * ─────────────────────────────────────────────────────────────────────────────
 * Rehefa TSY MISY sary :
 *   • Profil      : fond FOTSY + icône olona MANGA MALEFAKA neon
 *   • Couverture  : fond FOTSY + icône fakan-tsary ROSE neon
 *
 * FOMBA : composant iray (`PhotoPlaceholder`) — TSY fanoloana ny antso 78
 *   `ui-avatars` manerana ny app. Ny Profile ihany no voakasika amin'ity
 *   dingana ity (io no toerana hita indrindra).
 *
 * VOAKASIKA : components/PhotoPlaceholder.jsx (VAOVAO) · pages/Profile.jsx
 *
 * Fampandehanana :  node patch-placeholder.cjs --dry
 *                   node patch-placeholder.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ═══ ① Composant ═════════════════════════════════════════════════════ */
const COMP = `// src/components/PhotoPlaceholder.jsx
// Placeholder rehefa TSY MISY sary — fond fotsy + icône neon.
//   type="person" → manga malefaka (profil)
//   type="camera" → rose (couverture)

const BLUE = '#7CB8FF';
const ROSE = '#FF7DC0';

const glow = (c) => ({ filter: \`drop-shadow(0 0 3px \${c}) drop-shadow(0 0 9px \${c}88)\` });

export default function PhotoPlaceholder({ type = 'person', size = 100, round = true, style = {} }) {
  const person = type === 'person';
  const color = person ? BLUE : ROSE;
  const s = Math.round(size * (person ? 0.58 : 0.42));

  return (
    <div style={{
      width: size, height: round ? size : '100%',
      borderRadius: round ? '50%' : 0,
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, ...style,
    }}>
      <svg width={s} height={s} viewBox="0 0 64 64" fill={color} style={glow(color)} aria-hidden="true">
        {person ? (
          <>
            <circle cx="32" cy="22" r="11" />
            <path d="M12 52 C12 40 21 33 32 33 C43 33 52 40 52 52 C52 54.5 50 56 47.5 56 L16.5 56 C14 56 12 54.5 12 52 Z" />
          </>
        ) : (
          <>
            <path d="M8 20 h9 l4-6 h22 l4 6 h9 a4 4 0 0 1 4 4 v24 a4 4 0 0 1-4 4 H8 a4 4 0 0 1-4-4 V24 a4 4 0 0 1 4-4 Z" />
            <circle cx="32" cy="36" r="10" fill="#fff" />
            <circle cx="32" cy="36" r="6" fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}
`;
{
  const rel = 'src/components/PhotoPlaceholder.jsx';
  if (fs.existsSync(P(rel))) console.log('  ⏭  PhotoPlaceholder.jsx : efa misy');
  else { files[rel] = COMP; touched.push(rel); console.log('  • PhotoPlaceholder.jsx'); }
}

/* ═══ ② Profile.jsx ═══════════════════════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = read(P(rel));
  if (s.includes('PhotoPlaceholder')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    // Import
    const m = s.match(/^import .* from '\.\.\/components\/[^']*';$/m);
    if (!m) fail('toerana import tsy hita');
    s = s.replace(m[0], m[0] + "\nimport PhotoPlaceholder from '../components/PhotoPlaceholder';");

    // ── Couverture : fond fotsy + icône fakan-tsary raha tsy misy sary
    const C_OLD = "<div style={{ height:200, background:'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)', position:'relative' }}>";
    if (s.split(C_OLD).length - 1 !== 1) fail('bandeau couverture tsy tokana');
    s = s.replace(C_OLD,
      "<div style={{ height:200, background: coverURL ? 'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)' : '#fff', position:'relative' }}>\n" +
      "        {/* Tsy misy couverture → icône fakan-tsary rose neon */}\n" +
      "        {!coverURL && <PhotoPlaceholder type=\"camera\" size={200} round={false} style={{ width:'100%', position:'absolute', inset:0 }} />}");

    // ── Avatar : icône olona raha tsy misy sary
    const A_OLD = "<img src={profile.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=1877F2&color=fff&size=100`}";
    const iA = s.indexOf(A_OLD);
    if (iA < 0) fail('avatar profil tsy hita');
    const iEnd = s.indexOf('/>', iA) + 2;
    const tag = s.slice(iA, iEnd);
    s = s.slice(0, iA) +
        '{profile.photoURL\n              ? ' + tag +
        '\n              : <PhotoPlaceholder type="person" size={100} style={{ boxShadow:\'0 0 0 4px #fff\' }} />}' +
        s.slice(iEnd);

    files[rel] = s; touched.push(rel);
    console.log('  • Profile.jsx : couverture + avatar');
  }
}

/* ═══ Fanamarinana ════════════════════════════════════════════════════ */
{
  const p = files['src/pages/Profile.jsx'] || read(P('src/pages/Profile.jsx'));
  if (!p.includes("import PhotoPlaceholder")) fail('import very');
  if (!p.includes('type="camera" size={200}')) fail('couverture very');
  if (!p.includes('type="person" size={100}')) fail('avatar very');
  if (!p.includes('coverRef')) fail('bokotra fampiakarana couverture simba');
  if (!p.includes('photoRef')) fail('bokotra fampiakarana avatar simba');
  if (!p.includes('setPhotoViewer')) fail('viewer simba');
  const c = files['src/components/PhotoPlaceholder.jsx'] || read(P('src/components/PhotoPlaceholder.jsx'));
  if (!c.includes("background: '#fff'")) fail('fond fotsy very');
  if (!c.includes("const BLUE = '#7CB8FF'")) fail('manga malefaka very');
  if (!c.includes("const ROSE = '#FF7DC0'")) fail('rose very');
  if (!c.includes('drop-shadow')) fail('neon very');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
