// src/pages/UserByName.jsx
// Mamaha ny /u/:username ho /profile/:uid.
//
// Ampiasaina ny requête `users where username == x` : ny Firestore dia mamorona
// index single-field HO AZY, ka tsy mila index composite.
// (Ny collection `usernames` dia tsy azo itokisana : tsy misy code manoratra azy.)
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function UserByName() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading');   // loading | notfound

  useEffect(() => {
    let alive = true;
    (async () => {
      const name = String(username || '').trim();
      if (!name) { if (alive) setState('notfound'); return; }
      try {
        // Andrana marina, dia amin'ny sora-baventy kely (Register dia mitahiry
        // araka ny nosoratana, fa ny mention dia mety hafa)
        for (const v of [name, name.toLowerCase()]) {
          const snap = await getDocs(query(collection(db, 'users'), where('username', '==', v), limit(1)));
          if (!snap.empty) {
            if (alive) navigate('/profile/' + snap.docs[0].id, { replace: true });
            return;
          }
        }
        if (alive) setState('notfound');
      } catch (e) {
        if (alive) setState('notfound');
      }
    })();
    return () => { alive = false; };
  }, [username, navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>
      {state === 'loading'
        ? 'Chargement…'
        : <>
            <p style={{ fontWeight: 700, color: '#050505', marginBottom: 6 }}>Utilisateur introuvable</p>
            <p>Aucun compte ne correspond à @{username}.</p>
            <button onClick={() => navigate('/')}
              style={{ marginTop: 16, background: '#1877F2', color: 'white', border: 'none', borderRadius: 10,
                       padding: '9px 18px', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Retour au fil
            </button>
          </>}
    </div>
  );
}
