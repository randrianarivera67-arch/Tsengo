/**
 * patch-compte-desactiver-supprimer.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Ampiana ao amin'ny Paramètres → Sécurité :
 *   • Désactiver mon compte   (azo averina)
 *   • Supprimer mon compte    (TSY azo averina)
 *
 * ⚠️ FIASA MANIMBA — fitandremana napetraka :
 *   1. Mot de passe TAKIANA (réauthentification). Firebase mitaky izany ho an'ny
 *      fanafoanana kaonty, ary io no manakana ny fanafoanana tsy nahy na
 *      nataon'olona nahazo ny findaina.
 *   2. Fanamarinana an-tsoratra : tsy maintsy soratana « SUPPRIMER ».
 *   3. Fampitandremana mazava momba izay ho very.
 *
 * FANAPAHAN-KEVITRA — inona no atao amin'ny données :
 *   • DÉSACTIVER : `disabled: true` ao amin'ny users/{uid}. Ny publication sy
 *     ny commentaire dia TAZONINA. Miverina rehefa miditra indray.
 *   • SUPPRIMER  : `deletedAt` + fanadiovana ny données manokana (photoURL,
 *     bio, sns.), dia `deleteUser()` ao amin'ny Auth.
 *     ⚠️ Ny publication sy commentaire dia TSY fafana amin'ny client :
 *        an-jatony ny écriture, ary tsy azo antoka raha tapaka eo antenatenany.
 *        Ny fomba mety dia asa backend — nomarihina ho asa manaraka.
 *
 * VOAKASIKA : src/pages/SecuritySettings.jsx ihany.
 *
 * Fampandehanana :  node patch-compte-desactiver-supprimer.cjs --dry
 *                   node patch-compte-desactiver-supprimer.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

const F = path.join(process.cwd(), 'src/pages/SecuritySettings.jsx');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(F)) { console.error('❌ Tsy hita : src/pages/SecuritySettings.jsx'); process.exit(1); }

let s = fs.readFileSync(F, 'utf8');
if (s.includes('handleDeleteAccount')) { console.log('⏭  SecuritySettings.jsx : efa voapatch'); process.exit(0); }

const countOf = (str, sub) => str.split(sub).length - 1;
function rep(src, old, neo, label) {
  const n = countOf(src, old);
  if (n !== 1) {
    throw new Error('ASSERTION FAIL [' + label + '] : nandrasana 1, nahitana ' + n +
      '\n--- old ---\n' + old.slice(0, 240) + '\n-----------');
  }
  return src.replace(old, neo);
}

/* ── ① Import ───────────────────────────────────────────────────────── */
s = rep(s,
  "import { verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';\nimport { auth } from '../firebase';",
  "import { verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, signOut } from 'firebase/auth';\nimport { doc, updateDoc, serverTimestamp } from 'firebase/firestore';\nimport { auth, db } from '../firebase';",
  'import');

s = rep(s,
  "import { HiArrowLeft, HiMail, HiLockClosed, HiQuestionMarkCircle, HiChevronRight, HiCheckCircle, HiX } from 'react-icons/hi';",
  "import { HiArrowLeft, HiMail, HiLockClosed, HiQuestionMarkCircle, HiChevronRight, HiCheckCircle, HiX, HiPause, HiTrash } from 'react-icons/hi';",
  'icons');

/* ── ② State fanamarinana ───────────────────────────────────────────── */
s = rep(s,
  "  const [error, setError] = useState(null);",
  "  const [error, setError] = useState(null);\n  const [confirmText, setConfirmText] = useState('');   // fanamarinana « SUPPRIMER »",
  'state');

/* ── ③ Fiasa ────────────────────────────────────────────────────────── */
s = rep(s,
  '  const items = [',
  `  /**
   * DÉSACTIVER — azo averina. Ny publication sy commentaire TAZONINA.
   * Miverina ho velona rehefa miditra indray ny mpampiasa.
   */
  async function handleDeactivate() {
    if (!currentPassword) { setError('Entrez votre mot de passe.'); return; }
    if (!window.confirm(
      'Désactiver votre compte ?\\n\\n' +
      "Votre profil ne sera plus visible. Vos publications et commentaires sont conservés.\\n" +
      'Vous pouvez réactiver à tout moment en vous reconnectant.'
    )) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await reauthenticate();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        disabled: true, disabledAt: serverTimestamp(),
      });
      await signOut(auth);
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect.'
             : e.code === 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez plus tard.'
             : 'Erreur : ' + (e.message || e.code));
    } finally { setLoading(false); }
  }

  /**
   * SUPPRIMER — TSY AZO AVERINA.
   *
   * ⚠️ Ny publication sy ny commentaire dia TSY fafana eto : an-jatony ny
   * écriture, ary raha tapaka eo antenatenany dia hisy données very antsasany.
   * Ny fomba mety dia asa backend (fanadiovana miandalana). Eto dia :
   *   • marihina deletedAt sy disabled
   *   • diovina ny données manokana (sary, bio, telefaona…)
   *   • fafana ny kaonty Auth → tsy azo idirana intsony
   */
  async function handleDeleteAccount() {
    if (!currentPassword) { setError('Entrez votre mot de passe.'); return; }
    if (confirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      setError('Tapez SUPPRIMER pour confirmer.'); return;
    }
    if (!window.confirm(
      'SUPPRIMER DÉFINITIVEMENT votre compte ?\\n\\n' +
      'Cette action est IRRÉVERSIBLE.\\n' +
      'Vous perdrez l\\'accès à votre profil, vos messages et votre boutique.'
    )) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await reauthenticate();
      // Fanadiovana ny données manokana ALOHAN'ny famafana ny Auth
      await updateDoc(doc(db, 'users', currentUser.uid), {
        disabled: true, deletedAt: serverTimestamp(),
        photoURL: '', photoThumb: '', coverURL: '', bio: '', phone: '',
      }).catch(() => {});
      await deleteUser(currentUser);
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Mot de passe incorrect.'
             : e.code === 'auth/requires-recent-login' ? 'Reconnectez-vous puis réessayez.'
             : e.code === 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez plus tard.'
             : 'Erreur : ' + (e.message || e.code));
    } finally { setLoading(false); }
  }

  const items = [`,
  'functions');

/* ── ④ Menu ─────────────────────────────────────────────────────────── */
s = rep(s,
  "    { key: 'help', icon: HiQuestionMarkCircle, label: 'Aide & Support', desc: 'Contacter l\\'assistance', color: '#10b981' },\n  ];",
  `    { key: 'help', icon: HiQuestionMarkCircle, label: 'Aide & Support', desc: 'Contacter l\\'assistance', color: '#10b981' },
    { key: 'deactivate', icon: HiPause, label: 'Désactiver mon compte', desc: 'Réversible à tout moment', color: '#f59e0b' },
    { key: 'delete', icon: HiTrash, label: 'Supprimer mon compte', desc: 'Action irréversible', color: '#ef4444' },
  ];`,
  'items');

/* ── ⑤ Section ──────────────────────────────────────────────────────── */
s = rep(s,
  '    </div>\n  );\n}',
  `      {(section === 'deactivate' || section === 'delete') && (() => {
        const isDel = section === 'delete';
        const col = isDel ? '#ef4444' : '#f59e0b';
        return (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ background: isDel ? '#fef2f2' : '#fffbeb',
                          border: '1px solid ' + (isDel ? '#fca5a5' : '#fcd34d'),
                          borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: isDel ? '#991b1b' : '#92400e', marginBottom: 6 }}>
                {isDel ? 'Action irréversible' : 'Action réversible'}
              </p>
              <p style={{ fontSize: 12.5, lineHeight: 1.65, color: '#65676B' }}>
                {isDel
                  ? "Votre compte sera supprimé définitivement. Vous perdrez l'accès à votre profil, vos messages et votre boutique. Cette action ne peut pas être annulée."
                  : "Votre profil ne sera plus visible. Vos publications et commentaires sont conservés. Reconnectez-vous à tout moment pour réactiver."}
              </p>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mot de passe actuel
            </label>
            <input type="password" className="input" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', fontSize: 14, marginBottom: 14 }} />

            {isDel && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Tapez <b style={{ color: col }}>SUPPRIMER</b> pour confirmer
                </label>
                <input className="input" value={confirmText}
                  onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, marginBottom: 14 }} />
              </>
            )}

            <button
              onClick={isDel ? handleDeleteAccount : handleDeactivate}
              disabled={loading || !currentPassword || (isDel && confirmText.trim().toUpperCase() !== 'SUPPRIMER')}
              style={{
                width: '100%', padding: '13px', borderRadius: 25, border: 'none',
                background: col, color: 'white', fontFamily: 'Poppins', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                opacity: (loading || !currentPassword || (isDel && confirmText.trim().toUpperCase() !== 'SUPPRIMER')) ? .5 : 1,
              }}>
              {loading ? 'Veuillez patienter…' : (isDel ? 'Supprimer définitivement' : 'Désactiver mon compte')}
            </button>

            <button onClick={() => { setSection(null); setConfirmText(''); setCurrentPassword(''); setError(null); }}
              style={{ width: '100%', padding: '11px', marginTop: 10, borderRadius: 25,
                       border: '1px solid #E4E6EB', background: 'white', fontFamily: 'Poppins',
                       fontSize: 14, color: '#65676B', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        );
      })()}
    </div>
  );
}`,
  'section');

/* ── Fanamarinana farany ────────────────────────────────────────────── */
for (const k of ['handleDeactivate', 'handleDeleteAccount', "key: 'deactivate'", "key: 'delete'"]) {
  if (!s.includes(k)) throw new Error('FAIL : tsy hita ' + k);
}
if (!s.includes('await reauthenticate();')) throw new Error('FAIL : réauthentification tsy misy');
if (countOf(s, 'await reauthenticate();') < 3) throw new Error('FAIL : réauth tsy ampiharina amin\'ny roa');

if (!DRY) fs.writeFileSync(F, s);
console.log(DRY
  ? '✅ DRY-RUN : fanoloana 5 mety (tsy nisy nosoratana)'
  : '✅ Patch vita : Désactiver + Supprimer mon compte');
