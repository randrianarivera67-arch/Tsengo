// src/pages/VIPInfo.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiStar, HiCheckCircle } from 'react-icons/hi';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  'Badge VIP rose visible sur votre profil',
  'Badge affiché sur vos posts et commentaires',
  'Priorité dans les recommandations',
  'Profil mis en avant dans les suggestions',
  'Accès aux fonctionnalités premium en avant-première',
  'Soutien exclusif par email',
];

export default function VIPInfo() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [status, setStatus]   = useState('loading');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const isVip = !!userProfile?.isVip;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser) { setStatus('none'); return; }
      try {
        const snap = await getDocs(query(collection(db, 'vipRequests'), where('requesterUid', '==', currentUser.uid)));
        if (cancelled) return;
        const rows = snap.docs.map(d => d.data() || {});
        if (rows.some(r => r.status === 'pending'))       setStatus('pending');
        else if (rows.some(r => r.status === 'approved')) setStatus('approved');
        else if (rows.some(r => r.status === 'refused'))  setStatus('refused');
        else setStatus('none');
      } catch { if (!cancelled) setStatus('none'); }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  async function sendRequest() {
    if (!currentUser || sending) return;
    setSending(true); setError('');
    try {
      await addDoc(collection(db, 'vipRequests'), {
        requesterUid:   currentUser.uid,
        requesterName:  userProfile?.fullName || '',
        requesterPhoto: userProfile?.photoURL || '',
        username:       userProfile?.username || '',
        email:          currentUser.email || '',
        status:         'pending',
        createdAt:      serverTimestamp(),
      });
      setStatus('pending');
    } catch (e) {
      const m = String(e?.code || e?.message || '');
      setError(m.includes('permission')
        ? "Envoi refuse par le serveur (regles Firestore a publier)."
        : "La demande n'a pas pu etre envoyee. Verifiez votre connexion puis reessayez.");
    } finally { setSending(false); }
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1877F2' }}>Compte VIP</h2>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1877F2,#63A9FF,#FFB3D9)', borderRadius: 20, padding: '30px 24px', textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <HiStar size={38} color="white" />
        </div>
        <h3 style={{ color: 'white', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Devenir VIP</h3>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>
          Obtenez un badge rose 🌸 et des avantages exclusifs sur Trengo.
        </p>
      </div>

      {/* Features */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: '#1877F2' }}>✨ Avantages VIP</h4>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <HiCheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{f}</p>
          </div>
        ))}
      </div>

      {/* How to get */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#1877F2' }}>Comment obtenir le VIP ?</h4>
        <p style={{ fontSize: 14, color: '#65676B', lineHeight: 1.7, marginBottom: 14 }}>
          Envoyez votre demande d'activation VIP en un clic : elle arrive directement
          dans l'espace d'administration Trengo.<br/><br/>
          L'activation se fait dans les 24h ouvrables. Vous recevrez une notification
          des que votre demande sera traitee.
        </p>

        {isVip ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#E7F8EE', border:'1px solid #22c55e', borderRadius:16, padding:'13px 16px', color:'#15803d', fontWeight:700, fontSize:14 }}>
            <HiCheckCircle size={18} /> Votre compte est deja VIP
          </div>
        ) : status === 'loading' ? (
          <p style={{ textAlign:'center', fontSize:13, color:'#65676B' }}>Chargement...</p>
        ) : status === 'pending' ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#FFF6E5', border:'1px solid #f59e0b', borderRadius:16, padding:'13px 16px', color:'#b45309', fontWeight:700, fontSize:14 }}>
            <HiStar size={18} /> Demande envoyee - en attente de validation
          </div>
        ) : (
          <>
            <button onClick={sendRequest} disabled={sending}
              style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                background: sending ? '#E4E6EB' : 'linear-gradient(135deg,#FF2D8D,#FF7AB8)',
                color: sending ? '#65676B' : 'white', border:'none', borderRadius:25, padding:'13px 20px',
                fontWeight:700, fontSize:14, fontFamily:'Poppins', cursor: sending ? 'not-allowed' : 'pointer',
              }}>
              <HiStar size={18} /> {sending ? 'Envoi...' : 'Demander le compte VIP'}
            </button>
            {status === 'refused' && (
              <p style={{ textAlign:'center', fontSize:12, color:'#b45309', marginTop:10 }}>
                Votre demande precedente a ete refusee. Vous pouvez en envoyer une nouvelle.
              </p>
            )}
          </>
        )}

        {error && (
          <p style={{ textAlign:'center', fontSize:12.5, color:'#b91c1c', background:'#FEE2E2', border:'1px solid #fca5a5', borderRadius:12, padding:'9px 12px', marginTop:10 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
