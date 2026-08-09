/**
 * patch-viewer-supprimer.cjs   —  Bokotra « Supprimer » ao amin'ny viewer
 * ─────────────────────────────────────────────────────────────────────────────
 * ASA : bokotra fafana eo AKAIKIN'NY « Télécharger », aseho IHANY raha :
 *   • ny prop `onDelete` no nomena (ka ny Profile ihany no manome azy), ARY
 *   • ny publication dia an'ny mpampiasa ankehitriny.
 *
 * ⚠️ FIAROVANA :
 *   • Aseho amin'ny PROFIL ihany (photo de profil / couverture) — tsy amin'ny
 *     fil na ny groupe, satria tsy manome `onDelete` izy ireo.
 *   • Fanamarinana `post.uid === currentUser.uid` — tsy azo fafana ny an'olona.
 *   • `window.confirm` alohan'ny famafana.
 *
 * VOAKASIKA : components/MediaViewer.jsx · pages/Profile.jsx
 *
 * Fampandehanana :  node patch-viewer-supprimer.cjs --dry
 *                   node patch-viewer-supprimer.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');
const P = (r) => path.join(process.cwd(), r);
const read = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const files = {}; const touched = [];
const fail = (m) => { throw new Error('ASSERTION FAIL : ' + m); };

/* ═══ ① MediaViewer : prop + bokotra ══════════════════════════════════ */
{
  const rel = 'src/components/MediaViewer.jsx';
  let s = read(P(rel));
  if (s.includes('onDeletePhoto')) { console.log('  ⏭  MediaViewer.jsx : efa voapatch'); }
  else {
    const P_OLD = '  onReact, onOpenReactionModal, onDownload, onShare,';
    if (s.split(P_OLD).length - 1 !== 1) fail('lisitra props tsy hita');
    s = s.replace(P_OLD, P_OLD + '\n  onDeletePhoto,   // Profile ihany no manome — sary profil/couverture');

    const B_OLD = `        <button onClick={handleDownload} aria-label="Télécharger"`;
    if (s.split(B_OLD).length - 1 !== 1) fail('bokotra Télécharger tsy tokana');
    s = s.replace(B_OLD,
`        {/* Supprimer — aseho IHANY raha nomena \`onDeletePhoto\` (Profile)
            ARY an'ny mpampiasa ankehitriny ny publication. */}
        {onDeletePhoto && post?.uid && currentUser?.uid && post.uid === currentUser.uid && (
          <button aria-label="Supprimer"
            onClick={() => {
              if (!window.confirm('Supprimer cette photo ?')) return;
              onDeletePhoto(post);
            }}
            style={{ background: 'rgba(255,45,141,.22)', border: 'none', borderRadius: '50%',
                     width: 38, height: 38, color: '#FF7DC0', cursor: 'pointer',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
` + B_OLD);

    files[rel] = s; touched.push(rel);
    console.log('  • MediaViewer.jsx : bokotra Supprimer');
  }
}

/* ═══ ② Profile : manome ny handler ═══════════════════════════════════ */
{
  const rel = 'src/pages/Profile.jsx';
  let s = read(P(rel));
  if (s.includes('onDeletePhoto=')) { console.log('  ⏭  Profile.jsx : efa voapatch'); }
  else {
    const A = '          <MediaViewer\n            post={cur}';
    if (s.split(A).length - 1 !== 1) fail('antso MediaViewer tsy tokana');
    s = s.replace(A, `          <MediaViewer
            onDeletePhoto={async (p) => {
              // Sary profil / couverture ihany — voafetra amin'ny tompony
              if (!p?.id || p.uid !== currentUser?.uid) return;
              try {
                await deleteDoc(doc(db, 'posts', p.id));
                const isCov = !!p.isCoverPhoto;
                await updateDoc(doc(db, 'users', currentUser.uid),
                  isCov ? { coverURL: '' } : { photoURL: '', photoThumb: '' });
                setProfile(v => ({ ...v, ...(isCov ? { coverURL: '' } : { photoURL: '', photoThumb: '' }) }));
                setPhotoViewer(null);
              } catch (e) { alert('Erreur : ' + (e.message || e.code)); }
            }}
            post={cur}`);

    files[rel] = s; touched.push(rel);
    console.log('  • Profile.jsx : handler famafana');
  }
}

/* ═══ Fanamarinana ════════════════════════════════════════════════════ */
{
  const v = files['src/components/MediaViewer.jsx'] || read(P('src/components/MediaViewer.jsx'));
  if (!v.includes('onDeletePhoto,')) fail('prop very');
  if (!v.includes('post.uid === currentUser.uid')) fail('fiarovana tompony very');
  if (!v.includes("window.confirm('Supprimer cette photo ?')")) fail('confirmation very');
  if (!v.includes('handleDownload')) fail('Télécharger simba');

  const p = files['src/pages/Profile.jsx'] || read(P('src/pages/Profile.jsx'));
  if (!p.includes('onDeletePhoto={async (p)')) fail('handler very');
  if (!p.includes("p.uid !== currentUser?.uid) return;")) fail('fiarovana tompony very (Profile)');
  if (!p.includes('deleteDoc')) fail('deleteDoc tsy voaimport — hamarino');
  if (!p.includes('PhotoPlaceholder')) fail('placeholder simba');
}

if (!DRY) for (const r of touched) fs.writeFileSync(P(r), files[r]);
console.log(DRY ? '\n✅ DRY-RUN (tsy nisy nosoratana)' : '\n✅ Patch vita');
touched.forEach(f => console.log('   • ' + f));
