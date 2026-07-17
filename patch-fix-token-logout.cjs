const AUTH_SRC="// src/context/AuthContext.jsx\nimport { createContext, useContext, useEffect, useState } from 'react';\nimport {\n  createUserWithEmailAndPassword,\n  signInWithEmailAndPassword,\n  signOut,\n  onAuthStateChanged,\n  updateProfile,\n} from 'firebase/auth';\nimport { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';\nimport { auth, db } from '../firebase';\n// \u2705 FIX BUG #1: Import OneSignal utils\nimport { setOneSignalExternalId, removeOneSignalExternalId, requestNotificationPermission } from '../utils/onesignal';\nimport { initNativePush, removeNativePush } from '../utils/nativePush';\n\nconst AuthContext = createContext();\n\nexport function AuthProvider({ children }) {\n  const [currentUser, setCurrentUser] = useState(null);\n  const [userProfile, setUserProfile] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  async function register(email, password, fullName, username) {\n    const res = await createUserWithEmailAndPassword(auth, email, password);\n    await updateProfile(res.user, { displayName: fullName });\n    const userData = {\n      uid: res.user.uid,\n      email,\n      fullName,\n      username: username.toLowerCase(),\n      photoURL: '',\n      coverURL: '',\n      bio: '',\n      work: '',\n      study: '',\n      phone: '',\n      website: '',\n      currentCity: '',\n      hometown: '',\n      friends: [],\n      friendRequests: [],\n      sentRequests: [],\n      createdAt: serverTimestamp(),\n    };\n    await setDoc(doc(db, 'users', res.user.uid), userData);\n    setUserProfile(userData);\n    return res;\n  }\n\n  async function login(email, password) {\n    return signInWithEmailAndPassword(auth, email, password);\n  }\n\n  async function logout() {\n    // \u26a0\ufe0f IMPORTANT : le nettoyage du token FCM doit se faire ICI, PENDANT que\n    // l'utilisateur est encore authentifi\u00e9 \u2014 pas dans le onAuthStateChanged\n    // ci-dessous, qui ne se d\u00e9clenche qu'APR\u00c8S signOut() (donc sans permission\n    // Firestore pour modifier son propre document -> le token restait bloqu\u00e9\n    // sur l'ancien compte, et le prochain compte connect\u00e9 sur cet appareil\n    // recevait AUSSI ses notifications).\n    try { removeOneSignalExternalId(); } catch (e) {}\n    try { await removeNativePush(); } catch (e) {}\n    return signOut(auth);\n  }\n\n  async function fetchUserProfile(uid) {\n    const snap = await getDoc(doc(db, 'users', uid));\n    if (snap.exists()) {\n      setUserProfile(snap.data());\n      return snap.data();\n    }\n    return null;\n  }\n\n  useEffect(() => {\n    const unsub = onAuthStateChanged(auth, async (user) => {\n      setCurrentUser(user);\n      if (user) {\n        await fetchUserProfile(user.uid);\n        // \u2705 FIX BUG #1: Link OneSignal to Firebase UID on login\n        setOneSignalExternalId(user.uid);\n        initNativePush(user.uid);\n\n        requestNotificationPermission();\n      } else {\n        setUserProfile(null);\n        // \u2705 FIX BUG #1: Unlink OneSignal on logout\n        removeOneSignalExternalId();\n        removeNativePush();\n      }\n      setLoading(false);\n    });\n    return unsub;\n  }, []);\n\n  return (\n    <AuthContext.Provider value={{ currentUser, userProfile, setUserProfile, register, login, logout, fetchUserProfile, loading }}>\n      {loading ? (<div style={{minHeight:\"100vh\",display:\"flex\",alignItems:\"center\",justifyContent:\"center\",background:\"#FFFFFF\"}}><style>{`@keyframes dot{0%,80%,100%{opacity:0}40%{opacity:1}}`}</style><div style={{textAlign:\"center\"}}><div style={{fontWeight:900,fontSize:38,color:\"#1877F2\",letterSpacing:-1}}>Trengo<span style={{animation:\"dot 1.4s infinite\",animationDelay:\"0s\"}}>.</span><span style={{animation:\"dot 1.4s infinite\",animationDelay:\"0.2s\"}}>.</span><span style={{animation:\"dot 1.4s infinite\",animationDelay:\"0.4s\"}}>.</span></div></div></div>) : children}\n    </AuthContext.Provider>\n  );\n}\n\nexport const useAuth = () => useContext(AuthContext);\n";

const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

try {
  const p = 'src/context/AuthContext.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('doit se faire ICI, PENDANT que')) {
    skip('AuthContext.jsx : deja corrige');
  } else {
    fs.writeFileSync(p, AUTH_SRC);
    ok('AuthContext.jsx : nettoyage token FCM AVANT signOut (fix notifications croisees)');
  }
} catch (e) { fail('AuthContext.jsx: ' + e.message); }

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
console.log('\nCAUSE DU BUG "les deux comptes recoivent la notification" :');
console.log('logout() faisait juste signOut(auth). Le nettoyage du token FCM se');
console.log('trouvait dans onAuthStateChanged, qui ne se declenche QU\'APRES');
console.log('signOut() -> l\'utilisateur n\'est deja plus authentifie a ce moment,');
console.log('et la regle Firestore exige request.auth != null pour modifier son');
console.log('propre document -> le retrait du token echouait SILENCIEUSEMENT.');
console.log('Le token restait donc enregistre sur l\'ancien compte. En se');
console.log('reconnectant avec un AUTRE compte sur le meme appareil, ce dernier');
console.log('recevait le MEME token -> les DEUX comptes recevaient la notification.');
console.log('\n⚠️ Les comptes de test DEJA utilises avant ce fix peuvent encore avoir');
console.log('un token "fantome". Deconnecte-toi puis reconnecte-toi UNE FOIS sur');
console.log('chaque compte de test pour nettoyer proprement (ou vide manuellement');
console.log('le champ fcmTokens de ces comptes dans la Console Firebase).');
