// src/hooks/useMentions.js
// Logika mention mizara — mba tsy hiverimberina, ary indrindra mba tsy hisy
// toerana hadino. Ny pejy dia miantso ity hook ity ary mandefa <MentionPanel/>.
//
// Fampiasana :
//   const m = useMentions(userProfile, currentUser);
//   <input value={v} onChange={e => { setV(e.target.value); m.onType(e.target.value, key); }} />
//   <MentionPanel open={m.isOpen(key)} query={m.query} people={m.people}
//                 onPick={tag => setV(m.insert(v, tag))} onClose={m.close} />
import { useState, useRef, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** Mifanaraka amin'ny parser ao amin'ny appLink.js */
const AT_RE = /@([\p{L}0-9_.-]*)$/u;

export default function useMentions(userProfile, currentUser) {
  const [active, setActive] = useState(null);   // { key, q } | null
  const [people, setPeople] = useState([]);
  const loadingRef = useRef(false);

  /** Namana + abonnés + abonnements (fetra 60, dédoublonné). */
  const loadPeople = useCallback(async () => {
    if (people.length || loadingRef.current) return;
    const uids = [...new Set([
      ...(userProfile?.friends   || []),
      ...(userProfile?.followers || []),
      ...(userProfile?.following || []),
    ])].filter(u => u && u !== currentUser?.uid).slice(0, 60);
    if (!uids.length) return;
    loadingRef.current = true;
    try {
      const list = await Promise.all(uids.map(uid =>
        getDoc(doc(db, 'users', uid))
          .then(sn => sn.exists()
            ? { uid, fullName: sn.data().fullName || '', username: sn.data().username || '',
                photo: sn.data().photoThumb || sn.data().photoURL || '' }
            : null)
          .catch(() => null)
      ));
      setPeople(list.filter(Boolean).filter(p => p.fullName || p.username));
    } finally { loadingRef.current = false; }
  }, [people.length, userProfile, currentUser]);

  /** Antsoina isaky ny fanovana ny champ. `key` manavaka ny champ. */
  const onType = useCallback((value, key = 'default') => {
    const m = String(value || '').match(AT_RE);
    if (m) { loadPeople(); setActive({ key, q: m[1].toLowerCase() }); }
    else setActive(null);
  }, [loadPeople]);

  const isOpen = useCallback((key = 'default') => active?.key === key, [active]);
  const close  = useCallback(() => setActive(null), []);

  /** Mamerina ny lahatsoratra misy ny mention voafidy. */
  const insert = useCallback((value, tag) => {
    setActive(null);
    return String(value || '').replace(AT_RE, '@' + tag + ' ');
  }, []);

  return { people, query: active?.q || '', isOpen, onType, close, insert };
}
