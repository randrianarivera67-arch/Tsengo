// src/pages/Onboarding.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Onboarding aorian'ny inscription — dingana 3, tsiraray :
//   1) Ajouter vos premiers amis   (30 olona : firenena → ville → vaovao)
//   2) Suivre des boutiques
//   3) Suivre des artistes
// Ny "Suivre" dia abonnement (following) — tsy mila fankatoavana.
// Azo dinganina (Ignorer) amin'ny dingana rehetra. Ny fanoratana ao amin'ny
// Firestore dia atao amin'ny writeBatch rehefa "Suivant" (haingana, tsy misy
// fanoratana very antoandro).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, writeBatch, arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { suggestPeople, suggestPages } from '../utils/suggest';
import { NeonPeople, NeonStar } from '../components/NeonIcons';
import { HiShoppingBag, HiMusicNote, HiCheck, HiUser } from 'react-icons/hi';

const STEPS = [
  { key: 'people', title: 'Ajoutez vos premiers amis', sub: "Des personnes de votre région pour démarrer." },
  { key: 'shops',  title: 'Suivez des boutiques',      sub: 'Recevez leurs nouveautés dans votre fil.' },
  { key: 'artists',title: 'Suivez des artistes',       sub: 'Ne manquez aucune de leurs publications.' },
];

export default function Onboarding() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();

  const [stepIdx, setStepIdx] = useState(0);
  const [people, setPeople] = useState([]);
  const [shops, setShops] = useState([]);
  const [artists, setArtists] = useState([]);
  const [picked, setPicked] = useState({ people: {}, shops: {}, artists: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIdx];
  const me = useMemo(() => ({ ...(userProfile || {}), id: currentUser?.uid }), [userProfile, currentUser]);

  // ── Fakana ny data (indray mandeha) ────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const uid = currentUser?.uid;
      if (!uid) { setLoading(false); return; }
      try {
        const code = String(me.countryCode || '').trim().toUpperCase();
        const tasks = [
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(60))).catch(() => null),
          code ? getDocs(query(collection(db, 'users'), where('countryCode', '==', code), limit(60))).catch(() => null) : Promise.resolve(null),
          getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'), limit(60))).catch(() => null),
          getDocs(query(collection(db, 'artists'), limit(60))).catch(() => null),
        ];
        const [uSnap, cSnap, sSnap, aSnap] = await Promise.all(tasks);
        if (!alive) return;

        const byId = new Map();
        for (const snap of [uSnap, cSnap]) {
          if (!snap) continue;
          for (const d of snap.docs) byId.set(d.id, { id: d.id, ...d.data() });
        }
        setPeople(suggestPeople([...byId.values()], me, 30));
        setShops(suggestPages(sSnap ? sSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [], me, 30));
        setArtists(suggestPages(aSnap ? aSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [], me, 30));
      } catch { /* tsy manakana ny mpampiasa mihitsy */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [currentUser?.uid]);

  const toggle = (kind, id) =>
    setPicked(p => ({ ...p, [kind]: { ...p[kind], [id]: !p[kind][id] } }));

  const chosen = (kind) => Object.keys(picked[kind]).filter(id => picked[kind][id]);

  // ── Fanoratana (batch) dia mandroso ────────────────────────────────────
  async function saveAndNext(skip) {
    const uid = currentUser?.uid;
    const kind = step.key;
    const list = skip ? [] : chosen(kind);
    if (uid && list.length) {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        if (kind === 'people') {
          for (const targetId of list) {
            batch.update(doc(db, 'users', targetId), { followers: arrayUnion(uid) });
          }
          batch.update(doc(db, 'users', uid), { following: arrayUnion(...list) });
        } else {
          const col = kind === 'shops' ? 'shops' : 'artists';
          for (const id of list) batch.update(doc(db, col, id), { followers: arrayUnion(uid) });
        }
        await batch.commit();
        if (kind === 'people') {
          setUserProfile(p => ({ ...(p || {}), following: [...new Set([...(p?.following || []), ...list])] }));
        }
      } catch { /* raha tsy mety dia mandroso ihany — tsy tokony hijanona ny mpampiasa */ }
      setSaving(false);
    }
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1);
    else navigate('/', { replace: true });
  }

  const rows = step.key === 'people' ? people : (step.key === 'shops' ? shops : artists);
  const nPicked = chosen(step.key).length;

  const Avatar = ({ item }) => {
    const url = item.photoURL || item.logoURL || '';
    const Fallback = step.key === 'people' ? HiUser : (step.key === 'shops' ? HiShoppingBag : HiMusicNote);
    return (
      <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg,#C026D3,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             : <Fallback size={22} color="#fff" />}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', fontFamily: 'Poppins, sans-serif', color: '#050505', padding: '18px 14px 96px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Dingana */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STEPS.map((s, i) => (
            <span key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? '#FF2D8D' : '#E4E6EB' }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {step.key === 'people' ? <NeonPeople size={22} color="#FF2D8D" />
            : step.key === 'shops' ? <HiShoppingBag size={22} color="#F2960B" />
            : <HiMusicNote size={22} color="#7B3FE4" />}
          <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{step.title}</h1>
        </div>
        <p style={{ fontSize: 13, color: '#65676B', marginBottom: 16 }}>{step.sub}</p>

        {loading && <p style={{ fontSize: 13, color: '#65676B', padding: '24px 0', textAlign: 'center' }}>Chargement…</p>}

        {!loading && rows.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, color: '#65676B' }}>Rien à afficher pour le moment — vous pourrez en découvrir plus tard.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(item => {
            const on = !!picked[step.key][item.id];
            return (
              <div key={item.id} style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar item={item} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.fullName || item.name || 'Sans nom'}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#65676B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {step.key === 'people'
                      ? [item.username ? '@' + item.username : '', item.currentCity || item.country || ''].filter(Boolean).join(' · ')
                      : ((item.followers || []).length + ' abonné' + ((item.followers || []).length > 1 ? 's' : ''))}
                  </p>
                </div>
                <button onClick={() => toggle(step.key, item.id)}
                  style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                    border: on ? 'none' : '1px solid #1877F2', borderRadius: 20, padding: '8px 14px',
                    background: on ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : '#fff',
                    color: on ? '#fff' : '#1877F2', fontFamily: 'Poppins', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                  }}>
                  {on ? <><HiCheck size={14} /> Suivi</> : <><NeonStar size={12} color="#1877F2" /> Suivre</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bokotra ambany (fixe) */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #E4E6EB', padding: '12px 14px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', gap: 10 }}>
          <button onClick={() => saveAndNext(true)} disabled={saving}
            style={{ flex: 1, padding: '12px', borderRadius: 22, border: '1px solid #E4E6EB', background: '#fff', color: '#65676B',
              fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
            Ignorer
          </button>
          <button onClick={() => saveAndNext(false)} disabled={saving}
            style={{ flex: 2, padding: '12px', borderRadius: 22, border: 'none',
              background: saving ? '#E4E6EB' : 'linear-gradient(135deg,#FF2D8D,#FF7AB8)',
              color: saving ? '#65676B' : '#fff', fontFamily: 'Poppins', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Enregistrement…' : (stepIdx < STEPS.length - 1 ? 'Suivant' : 'Terminer')}
            {nPicked > 0 && !saving ? ' (' + nPicked + ')' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
