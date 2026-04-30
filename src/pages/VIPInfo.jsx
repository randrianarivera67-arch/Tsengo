// src/pages/VIPInfo.jsx
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiStar, HiCheckCircle, HiMail } from 'react-icons/hi';

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

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C' }}>
          <HiArrowLeft size={22} />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>Compte VIP</h2>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6BB5,#FFB3D9)', borderRadius: 20, padding: '30px 24px', textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <HiStar size={38} color="white" />
        </div>
        <h3 style={{ color: 'white', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Devenir VIP</h3>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>
          Obtenez un badge rose 🌸 et des avantages exclusifs sur Tsengo.
        </p>
      </div>

      {/* Features */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: '#E91E8C' }}>✨ Avantages VIP</h4>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <HiCheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{f}</p>
          </div>
        ))}
      </div>

      {/* How to get */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#E91E8C' }}>📋 Comment obtenir le VIP ?</h4>
        <p style={{ fontSize: 14, color: '#8B5A6F', lineHeight: 1.7, marginBottom: 14 }}>
          Pour activer le compte VIP, envoyez un email à notre administrateur avec :<br/>
          • Votre nom d'utilisateur Tsengo<br/>
          • Votre demande d'activation VIP<br/><br/>
          L'activation se fait dans les 24h ouvrables.
        </p>
        <a
          href="mailto:randrianarivera67@gmail.com?subject=Demande activation compte VIP Tsengo"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)',
            color: 'white', borderRadius: 25, padding: '13px 20px',
            textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}
        >
          <HiMail size={18} /> Contacter l'admin
        </a>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#C4829F', marginTop: 10 }}>
          randrianarivera67@gmail.com
        </p>
      </div>
    </div>
  );
}
