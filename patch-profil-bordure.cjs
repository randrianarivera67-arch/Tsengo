/**
 * patch-profil-bordure.cjs   —  Sisiny + fanindriana amin'ny placeholder
 * ─────────────────────────────────────────────────────────────────────────────
 * ① AVATAR : sisiny boribory FOTSY 4 px + tsipika manga malefaka — mba tsy
 *    hitambatra amin'ny couverture fotsy.
 * ② COUVERTURE : tsipika fetra ambany — misaraka amin'ny votoaty.
 * ③ ROA CLICABLE : ny placeholder dia manokatra ny viewer, toy ny sary marina.
 *    ⚠️ Ny viewer dia foana raha tsy misy sary — ka ny clic dia manokatra ny
 *      FAMPIAKARANA raha TOMPONY, ary tsy manao na inona raha olon-kafa.
 *
 * VOAKASIKA : pages/Profile.jsx
 *
 * Fampandehanana :  node patch-profil-bordure.cjs --dry
 *                   node patch-profil-bordure.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const F = path.join(process.cwd(), 'src/pages/Profile.jsx');
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(F)) { console.error('❌ Tsy hita'); process.exit(1); }
let s = fs.readFileSync(F, 'utf8');
const c = (x) => s.split(x).length - 1;
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };
if (s.includes('placeholder-clic')) { console.log('⏭  efa voapatch'); process.exit(0); }

/* ── ① + ③ Avatar : sisiny + clic ── */
const A_OLD = `: <PhotoPlaceholder type="person" size={100} style={{ boxShadow:'0 0 0 4px #fff' }} />}`;
if (c(A_OLD) !== 1) fail('placeholder avatar tsy hita');
s = s.replace(A_OLD,
`: <div /* placeholder-clic */
                  onClick={() => { if (isOwn) photoRef.current?.click(); }}
                  style={{ cursor: isOwn ? 'pointer' : 'default', borderRadius: '50%',
                           boxShadow: '0 0 0 4px #fff, 0 0 0 5.5px #DCEBFF, 0 2px 10px rgba(5,5,5,.10)' }}>
                  <PhotoPlaceholder type="person" size={100} />
                </div>}`);

/* ── ② Couverture : fetra ambany ── */
const C_OLD = "background: hasPhoto(coverURL) ? 'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)' : '#fff', position:'relative' }}>";
if (c(C_OLD) !== 1) fail('bandeau couverture tsy hita');
s = s.replace(C_OLD,
  "background: hasPhoto(coverURL) ? 'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)' : '#fff', position:'relative',\n" +
  "                     borderBottom: hasPhoto(coverURL) ? 'none' : '1px solid #E4E6EB' }}>");

/* ── ③ Couverture : clic ── */
const P_OLD = '{!hasPhoto(coverURL) && <PhotoPlaceholder type="camera" size={200} round={false} style={{ width:\'100%\', position:\'absolute\', inset:0 }} />}';
if (c(P_OLD) !== 1) fail('placeholder couverture tsy hita');
s = s.replace(P_OLD,
`{!hasPhoto(coverURL) && (
          <div onClick={() => { if (isOwn) coverRef.current?.click(); }}
            style={{ position:'absolute', inset:0, cursor: isOwn ? 'pointer' : 'default' }}>
            <PhotoPlaceholder type="camera" size={200} round={false} style={{ width:'100%' }} />
          </div>
        )}`);

/* ── Fanamarinana ── */
if (!s.includes('placeholder-clic')) fail('marika very');
if (!s.includes("boxShadow: '0 0 0 4px #fff, 0 0 0 5.5px #DCEBFF")) fail('sisiny avatar very');
if (!s.includes("borderBottom: hasPhoto(coverURL) ? 'none' : '1px solid #E4E6EB'")) fail('fetra couverture very');
if (!s.includes("if (isOwn) photoRef.current?.click();")) fail('clic avatar very');
if (!s.includes("if (isOwn) coverRef.current?.click();")) fail('clic couverture very');
if (!s.includes('type="person" size={100}')) fail('placeholder avatar very');
if (!s.includes('type="camera" size={200}')) fail('placeholder couverture very');
if (!s.includes('setPhotoViewer')) fail('viewer simba');
if (!s.includes('const hasPhoto =')) fail('helper very');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY ? '✅ DRY-RUN (tsy nisy nosoratana)' : '✅ Patch vita : sisiny + clic');
