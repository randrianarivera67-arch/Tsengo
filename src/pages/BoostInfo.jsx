// src/pages/BoostInfo.jsx
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiSpeakerphone, HiCheckCircle, HiMail, HiTrendingUp } from 'react-icons/hi';

const BOOST_FEATURES = [
  'Votre post affiché en tête du fil d\'actualité',
  'Visible par tous les utilisateurs (amis ou non)',
  'Badge "Sponsorisé" discret sur votre post',
  'Statistiques de vues après boost',
  'Idéal pour les posts de vente (vente, pub)',
];

export default function BoostInfo() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>Booster un post</h2>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)', borderRadius: 20, padding: '30px 24px', textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <HiTrendingUp size={38} color="white" />
        </div>
        <h3 style={{ color: 'white', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Booster votre contenu</h3>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>
          Augmentez la visibilité de vos posts et touchez plus de personnes.
        </p>
      </div>

      {/* Features */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: '#E91E8C' }}>🚀 Ce que vous obtenez</h4>
        {BOOST_FEATURES.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <HiCheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{f}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#E91E8C' }}>📩 Comment booster ?</h4>
        <p style={{ fontSize: 14, color: '#8B5A6F', lineHeight: 1.7, marginBottom: 14 }}>
          Envoyez un email à l'administrateur Tsengo pour booster votre post. Précisez :<br/>
          • Le lien ou l'identifiant de votre post<br/>
          • La durée souhaitée du boost<br/>
          • Votre username Tsengo
        </p>
        <a
          href="mailto:randrianarivera67@gmail.com?subject=Demande boost post Tsengo"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: 'white', borderRadius: 25, padding: '13px 20px',
            textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}
        >
          <HiMail size={18} /> Contacter pour booster
        </a>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#C4829F', marginTop: 10 }}>
          randrianarivera67@gmail.com
        </p>
      </div>
    </div>
  );
}
