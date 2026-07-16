// src/components/BoostOrderModal.jsx
// Formulaire de commande de boost (façon Facebook Ads) :
//   - Durée (jours) → prix = jours × 3000 Ar
//   - Zone préférée : point + rayon sur carte (Leaflet/OpenStreetMap)
//   - Objectif : Messages / Abonnés / Vues (n'affecte pas le prix)
//   - Envoi → doc Firestore "boostOrders" (status:'pending'), l'admin valide/refuse.
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiX, HiCheckCircle, HiChatAlt2, HiUserAdd, HiEye, HiLocationMarker } from 'react-icons/hi';
import L from 'leaflet';

// Corrige les icônes par défaut de Leaflet (chemins cassés par les bundlers) via CDN.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const PRICE_PER_DAY = 3000;
const ANTANANARIVO = { lat: -18.8792, lng: 47.5079 };

const OBJECTIVES = [
  { key: 'messages', label: 'Obtenir des messages', desc: 'Incite les gens à vous écrire', icon: HiChatAlt2 },
  { key: 'followers', label: 'Obtenir des abonnés', desc: 'Fait connaître votre profil/page', icon: HiUserAdd },
  { key: 'views', label: 'Obtenir plus de vues', desc: 'Maximise la portée du contenu', icon: HiEye },
];

function ClickToPlace({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

export default function BoostOrderModal({ target, onClose }) {
  // target = { type:'post'|'profile'|'shop'|'artist', id, ownerUid, title, thumbnailURL }
  const { currentUser, userProfile } = useAuth();
  const [step, setStep] = useState(1); // 1: formulaire, 2: confirmation
  const [days, setDays] = useState(1);
  const [objective, setObjective] = useState('views');
  const [center, setCenter] = useState(ANTANANARIVO);
  const [radiusKm, setRadiusKm] = useState(10);
  const [zoneName, setZoneName] = useState('');
  const [searchingZone, setSearchingZone] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);

  const price = Math.max(1, Number(days) || 1) * PRICE_PER_DAY;

  // Essaie de centrer sur la position de l'utilisateur au premier affichage (facultatif).
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { timeout: 4000 }
    );
  }, []);

  async function searchZoneName() {
    const query = zoneName.trim();
    if (!query || searchingZone) return;
    setSearchingZone(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data[0]) setCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch (e) { /* silencieux : la carte reste sur la position actuelle */ }
    setSearchingZone(false);
  }

  function incDays(delta) {
    setDays((d) => Math.max(1, (Number(d) || 1) + delta));
  }

  async function submitOrder() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'boostOrders'), {
        targetType: target.type,
        targetId: target.id,
        targetOwnerUid: target.ownerUid || currentUser.uid,
        targetTitle: target.title || '',
        targetThumb: target.thumbnailURL || '',
        requesterUid: currentUser.uid,
        requesterName: userProfile?.fullName || '',
        requesterPhoto: userProfile?.photoURL || '',
        days: Math.max(1, Number(days) || 1),
        price,
        objective,
        zone: { lat: center.lat, lng: center.lng, radiusKm, label: zoneName.trim() || null },
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setStep(2);
    } catch (e) {
      setError("Échec de l'envoi. Réessayez.");
    }
    setSubmitting(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 900, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', fontFamily: 'Poppins' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #E4E6EB', position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
          <h3 style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>
            {step === 1 ? 'Booster' : 'Commande envoyée'}
          </h3>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiX size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div style={{ padding: 18 }}>
            {/* Cible */}
            {target.title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7F8FA', borderRadius: 12, padding: '10px 12px', marginBottom: 18 }}>
                {target.thumbnailURL && <img src={target.thumbnailURL} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                <p style={{ fontSize: 13, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.title}</p>
              </div>
            )}

            {/* Objectif */}
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Objectif</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {OBJECTIVES.map((o) => (
                <button key={o.key} onClick={() => setObjective(o.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: objective === o.key ? '2px solid #1877F2' : '1.5px solid #E4E6EB', background: objective === o.key ? '#EBF2FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                  <o.icon size={20} color={objective === o.key ? '#1877F2' : '#65676B'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#050505' }}>{o.label}</p>
                    <p style={{ fontSize: 12, color: '#65676B' }}>{o.desc}</p>
                  </div>
                  {objective === o.key && <HiCheckCircle size={18} color="#1877F2" style={{ flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            {/* Durée */}
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Durée</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 6 }}>
              <button onClick={() => incDays(-1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #E4E6EB', background: 'white', fontSize: 20, fontWeight: 700, cursor: 'pointer', color: '#1877F2' }}>−</button>
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <p style={{ fontSize: 28, fontWeight: 800 }}>{days}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>jour{days > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => incDays(1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #E4E6EB', background: 'white', fontSize: 20, fontWeight: 700, cursor: 'pointer', color: '#1877F2' }}>+</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#65676B', marginBottom: 20 }}>{PRICE_PER_DAY.toLocaleString()} Ar / jour</p>

            {/* Zone préférée */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HiLocationMarker size={16} color="#65676B" />
              <p style={{ fontWeight: 700, fontSize: 14 }}>Zone préférée</p>
              {locating && <span style={{ fontSize: 11, color: '#65676B' }}>(localisation…)</span>}
            </div>
            <p style={{ fontSize: 12, color: '#65676B', marginBottom: 10 }}>Touchez la carte, ou tapez un nom de lieu (ex : Madagascar, Mahajanga, Maurice).</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={zoneName} onChange={(e) => setZoneName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchZoneName()}
                placeholder="Ex : Antananarivo, Mahajanga, Maurice…"
                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E4E6EB', fontSize: 13, outline: 'none' }} />
              <button onClick={searchZoneName} disabled={searchingZone || !zoneName.trim()}
                style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: searchingZone ? '#93B8F5' : '#1877F2', color: 'white', fontWeight: 700, fontSize: 13, cursor: zoneName.trim() ? 'pointer' : 'default' }}>
                {searchingZone ? '…' : 'Chercher'}
              </button>
            </div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E4E6EB', marginBottom: 12 }}>
              <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height: 220, width: '100%' }} ref={mapRef}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[center.lat, center.lng]} icon={markerIcon} />
                <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#1877F2', fillColor: '#1877F2', fillOpacity: 0.15 }} />
                <ClickToPlace onPick={(latlng) => setCenter({ lat: latlng.lat, lng: latlng.lng })} />
              </MapContainer>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <span style={{ fontSize: 12, color: '#65676B', flexShrink: 0 }}>Rayon</span>
              <input type="range" min="1" max="100" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1877F2', flexShrink: 0, minWidth: 50, textAlign: 'right' }}>{radiusKm} km</span>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

            {/* Récap + envoi */}
            <div style={{ background: '#F7F8FA', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#65676B' }}>Durée</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{days} jour{days > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>Total à payer</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#1877F2' }}>{price.toLocaleString()} Ar</span>
              </div>
            </div>

            <button onClick={submitOrder} disabled={submitting}
              style={{ width: '100%', padding: '14px 0', borderRadius: 25, border: 'none', background: submitting ? '#93B8F5' : 'linear-gradient(135deg,#1B84FF,#1877F2)', color: 'white', fontWeight: 800, fontSize: 15, cursor: submitting ? 'wait' : 'pointer', boxShadow: '0 4px 16px rgba(24,119,242,.35)' }}>
              {submitting ? 'Envoi…' : "Envoyer à l'administrateur"}
            </button>
          </div>
        ) : (
          <div style={{ padding: '30px 24px', textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#EBF9F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <HiCheckCircle size={38} color="#16a34a" />
            </div>
            <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Commande envoyée !</p>
            <p style={{ fontSize: 14, color: '#65676B', lineHeight: 1.6, marginBottom: 24 }}>
              Votre demande de boost ({days} jour{days > 1 ? 's' : ''}, {price.toLocaleString()} Ar) est en attente de validation par l'administrateur.
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: '13px 0', borderRadius: 25, border: 'none', background: '#F0F2F5', color: '#050505', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
