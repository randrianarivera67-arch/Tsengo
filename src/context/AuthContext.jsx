// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
// ✅ FIX BUG #1: Import OneSignal utils
import { setOneSignalExternalId, removeOneSignalExternalId, requestNotificationPermission } from '../utils/onesignal';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, fullName, username) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName: fullName });
    const userData = {
      uid: res.user.uid,
      email,
      fullName,
      username: username.toLowerCase(),
      photoURL: '',
      coverURL: '',
      bio: '',
      work: '',
      study: '',
      phone: '',
      website: '',
      currentCity: '',
      hometown: '',
      friends: [],
      friendRequests: [],
      sentRequests: [],
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', res.user.uid), userData);
    setUserProfile(userData);
    return res;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      setUserProfile(snap.data());
      return snap.data();
    }
    return null;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
        // ✅ FIX BUG #1: Link OneSignal to Firebase UID on login
        setOneSignalExternalId(user.uid);

        requestNotificationPermission();
      } else {
        setUserProfile(null);
        // ✅ FIX BUG #1: Unlink OneSignal on logout
        removeOneSignalExternalId();
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, setUserProfile, register, login, logout, fetchUserProfile, loading }}>
      {loading ? (<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FFFFFF"}}><style>{`@keyframes dot{0%,80%,100%{opacity:0}40%{opacity:1}}`}</style><div style={{textAlign:"center"}}><div style={{fontWeight:900,fontSize:38,color:"#1877F2",letterSpacing:-1}}>Trengo<span style={{animation:"dot 1.4s infinite",animationDelay:"0s"}}>.</span><span style={{animation:"dot 1.4s infinite",animationDelay:"0.2s"}}>.</span><span style={{animation:"dot 1.4s infinite",animationDelay:"0.4s"}}>.</span></div></div></div>) : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
