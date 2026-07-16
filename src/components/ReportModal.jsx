// src/components/ReportModal.jsx
// Formulaire de signalement avec MOTIF (au lieu d'un simple window.confirm).
// Réutilisable partout : posts, comptes, boutiques, artistes, articles.
import { useState } from 'react';
import { HiX, HiFlag } from 'react-icons/hi';

const MOTIFS = [
  'Spam ou publicité',
  'Contenu inapproprié',
  'Harcèlement ou intimidation',
  'Fausse information',
  'Faux compte / usurpation',
  'Violence ou contenu choquant',
  'Autre',
];

export default function ReportModal({ title = 'Signaler', onConfirm, onClose }) {
  const [motif, setMotif] = useState('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!motif || sending) return;
    setSending(true);
    try { await onConfirm(motif, detail.trim()); } finally { setSending(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', fontFamily: 'Poppins' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #E4E6EB' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16 }}>
            <HiFlag size={18} color="#F2B300" /> {title}
          </span>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiX size={16} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#65676B' }}>Pourquoi signalez-vous ceci ?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {MOTIFS.map((m) => (
              <button key={m} onClick={() => setMotif(m)}
                style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 12, border: motif === m ? '2px solid #FF2D8D' : '1.5px solid #E4E6EB', background: motif === m ? '#FFF0F7' : 'white', cursor: 'pointer', fontSize: 13.5, fontWeight: motif === m ? 700 : 500, color: '#050505' }}>
                {m}
              </button>
            ))}
          </div>

          {motif === 'Autre' && (
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Précisez (facultatif)…"
              rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #E4E6EB', fontSize: 13, fontFamily: 'Poppins', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' }} />
          )}

          <button onClick={submit} disabled={!motif || sending}
            style={{ width: '100%', padding: '13px 0', borderRadius: 25, border: 'none', background: motif ? 'linear-gradient(135deg,#FF2D8D,#FF7AB8)' : '#E4E6EB', color: 'white', fontWeight: 800, fontSize: 14, cursor: motif ? 'pointer' : 'default' }}>
            {sending ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
        </div>
      </div>
    </div>
  );
}
