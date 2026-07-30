// patch-username-check.cjs — Fixe le bug "Missing or insufficient permissions"
// à l'étape 1 de l'inscription.
//
// Cause : Register.jsx vérifie la disponibilité du username en interrogeant
// la collection `users` (query where username==...) AVANT que le compte ne
// soit créé, donc AVANT que request.auth existe. Or la règle Firestore
// /users/{userId} exige request.auth != null pour la lecture -> refus.
//
// Les règles prévoient déjà une collection dédiée /usernames/{username}
// avec `allow read: if true` (donc lisible sans authentification), mais
// rien dans le code ne l'utilise ni ne la remplit. Ce patch :
//  1) Register.jsx  : remplace les 2 vérifications "users query" par une
//     simple lecture de usernames/{username} (getDoc), lisible pré-auth.
//  2) AuthContext.jsx : après création du compte, réserve le doc
//     usernames/{username} = { uid } (autorisé par la règle : l'utilisateur
//     vient d'être authentifié et request.auth.uid == uid).
//
// Idempotent : peut être relancé sans casser un patch déjà appliqué.

const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

function patchFile(path, edits) {
  if (!fs.existsSync(path)) { fail(path + ' : fichier introuvable'); return; }
  let src = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { name, marker, from, to } of edits) {
    if (src.includes(marker)) {
      skip(path + ' : ' + name + ' (deja applique)');
      continue;
    }
    if (!src.includes(from)) {
      fail(path + ' : ' + name + ' (motif introuvable, verifier manuellement)');
      continue;
    }
    src = src.replace(from, to);
    changed = true;
    ok(path + ' : ' + name);
  }
  if (changed) fs.writeFileSync(path, src);
}

// ── 1) src/pages/Register.jsx ──────────────────────────────────────────
patchFile('src/pages/Register.jsx', [
  {
    name: "import getDoc",
    marker: "getDoc } from 'firebase/firestore'",
    from: "import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';",
    to: "import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';",
  },
  {
    name: "verif username etape 1 (pre-auth via usernames/{username})",
    marker: "// ✅ FIX permissions: verif username via doc usernames (etape1)",
    from: `      const q = query(collection(db, 'users'), where('username', '==', form.username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLoading(false);
        return setError('Username efa ampiasaina / Username déjà utilisé');
      }
      setStep(2);`,
    to: `      // ✅ FIX permissions: verif username via doc usernames (etape1)
      const unameSnap = await getDoc(doc(db, 'usernames', form.username.toLowerCase()));
      if (unameSnap.exists()) {
        setLoading(false);
        return setError('Username efa ampiasaina / Username déjà utilisé');
      }
      setStep(2);`,
  },
  {
    name: "verif username finalizeAccount (pre-auth via usernames/{username})",
    marker: "// ✅ FIX permissions: verif username via doc usernames (finalize)",
    from: `      const q = query(collection(db, 'users'), where('username', '==', form.username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCreating(false);
        setLoading(false);
        setStep(1);
        return setError('Username efa ampiasaina / Username déjà utilisé — avero ny étape 1');
      }`,
    to: `      // ✅ FIX permissions: verif username via doc usernames (finalize)
      const unameSnap2 = await getDoc(doc(db, 'usernames', form.username.toLowerCase()));
      if (unameSnap2.exists()) {
        setCreating(false);
        setLoading(false);
        setStep(1);
        return setError('Username efa ampiasaina / Username déjà utilisé — avero ny étape 1');
      }`,
  },
]);

// ── 2) src/context/AuthContext.jsx ─────────────────────────────────────
patchFile('src/context/AuthContext.jsx', [
  {
    name: "reservation usernames/{username} apres creation compte",
    marker: "// ✅ FIX permissions: reserve usernames/{username}",
    from: `    await setDoc(doc(db, 'users', res.user.uid), userData);
    setUserProfile(userData);
    return res;`,
    to: `    await setDoc(doc(db, 'users', res.user.uid), userData);
    // ✅ FIX permissions: reserve usernames/{username} (lecture publique
    // pre-auth pour la verif de disponibilite a l'etape 1 de l'inscription)
    await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: res.user.uid });
    setUserProfile(userData);
    return res;`,
  },
]);

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
console.log("\nAthese: npx vite build && npx cap sync android (ho an'ny APK native).");
