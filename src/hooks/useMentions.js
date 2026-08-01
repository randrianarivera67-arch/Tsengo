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
import { doc, getDoc, collection, query, orderBy, startAt, endAt, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/** Mifanaraka amin'ny parser ao amin'ny appLink.js */
const AT_RE = /@([\p{L}0-9_.-]*)$/u;

export default function useMentions(userProfile, currentUser) {
  const [active, setActive] = useState(null);   // { key, q } | null
  const [people, setPeople] = useState([]);     // fifandraisana (friends/followers/following)
  const [found, setFound]   = useState([]);     // vokatry ny fikarohana mivantana
  const loadingRef = useRef(false);
  const searchRef  = useRef({ q: null, t: null });

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
  /**
   * Fikarohana MIVANTANA ao amin'ny `users` (prefix username).
   * Ampiasaina raha FOANA ny lisitra fifandraisana — raha tsy izany dia
   * manjavona mangina ny panneau ho an'ny kaonty vaovao.
   */
  const searchUsers = useCallback((q) => {
    if (!q || q.length < 1) { setFound([]); return; }
    if (searchRef.current.q === q) return;
    searchRef.current.q = q;
    clearTimeout(searchRef.current.t);
    searchRef.current.t = setTimeout(async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'users'), orderBy('username'),
          startAt(q), endAt(q + ''), limit(8),
        ));
        setFound(snap.docs
          .filter(d => d.id !== currentUser?.uid)
          .map(d => ({
            uid: d.id, fullName: d.data().fullName || '', username: d.data().username || '',
            photo: d.data().photoThumb || d.data().photoURL || '',
          })));
      } catch (e) { setFound([]); }
    }, 280);
  }, [currentUser]);

  const onType = useCallback((value, key = 'default') => {
    const m = String(value || '').match(AT_RE);
    if (m) {
      const q = m[1].toLowerCase();
      loadPeople();
      searchUsers(q);
      setActive({ key, q });
    } else setActive(null);
  }, [loadPeople, searchUsers]);

  const isOpen = useCallback((key = 'default') => active?.key === key, [active]);
  const close  = useCallback(() => setActive(null), []);

  /** Mamerina ny lahatsoratra misy ny mention voafidy. */
  /**
   * Mamerina ny lahatsoratra misy ny mention voafidy.
   * @param {string} value
   * @param {{name:string, uid:string}|string} pick  entité na tag tsotra
   *
   * Token entité :  @[Anarana Feno](uid)  → aseho « @Anarana Feno »
   * Ny anarana dia diovina : ny `[` `]` dia hanapaka ny token.
   */
  const insert = useCallback((value, pick) => {
    setActive(null);
    const v = String(value || '');
    if (pick && typeof pick === 'object' && pick.uid) {
      const name = String(pick.name || '').replace(/[\[\]\n]/g, '').trim() || 'Utilisateur';
      return v.replace(AT_RE, '@[' + name + '](' + pick.uid + ') ');
    }
    return v.replace(AT_RE, '@' + pick + ' ');
  }, []);

  /** Alias mazava kokoa — mitovy amin'ny `insert`. */
  const insertEntity = insert;

  // Fifandraisana aloha, dia ny vokatry ny fikarohana (dédoublonné)
  const merged = (() => {
    const seen = new Set(people.map(p => p.uid));
    return [...people, ...found.filter(f => !seen.has(f.uid))];
  })();

  return { people: merged, query: active?.q || '', isOpen, onType, close, insert, insertEntity };
}
