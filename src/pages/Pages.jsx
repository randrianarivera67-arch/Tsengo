// src/pages/Pages.jsx — Sera (pages publiques, format Facebook Page)
// Création amin'ny dingana (wizard) toy ny Facebook : Nom → Catégorie →
// Site web (Ignorer) → Images (Terminé), miaraka amin'ny barre de progression.
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { parseAppLink } from '../utils/appLink';
import { NeonPlane } from '../components/NeonIcons';
import { HiIdentification, HiPlus, HiX, HiChevronRight, HiArrowLeft, HiSearch, HiCheck, HiCamera, HiCheckCircle } from 'react-icons/hi';

const CATEGORIES = ['Blog personnel', 'Produit/service', 'Art', 'Musique/groupe', 'Shopping et vente au détail', 'Entreprise', 'Influenceur', 'Association', 'Commerce local', 'Service', 'Communauté', 'Autre'];
const POPULAR = ['Blog personnel', 'Produit/service', 'Art', 'Musique/groupe', 'Shopping et vente au détail'];

export default function Pages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [q, setQ] = useState('');

  // ── Wizard création (dingana 1 → 4) ──
  const [wizOpen, setWizOpen] = useState(false);
  const [step, setStep] = useState(0);            // 0 intro, 1 nom, 2 catégorie, 3 site web, 4 images
  const [name, setName] = useState('');
  const [cats, setCats] = useState([]);           // hatramin'ny 3
  const [website, setWebsite] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [photoPrev, setPhotoPrev] = useState(null);
  const [coverPrev, setCoverPrev] = useState(null);
  const [creating, setCreating] = useState(false);
  const photoRef = useRef(); const coverRef = useRef();

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'pages')), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
      setPages(list);
    }, err => console.error('Pages:', err?.message || err));
    return () => unsub();
  }, []);

  const myPages = pages.filter(p => p.admins?.includes(currentUser?.uid));
  const low = q.trim().toLowerCase();
  const shown = useMemo(() => !low ? pages : pages.filter(p => (p.name || '').toLowerCase().includes(low) || (p.category || '').toLowerCase().includes(low)), [pages, low]);

  function toggleCat(c) {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length >= 3 ? prev : [...prev, c]);
  }

  function resetWiz() {
    setStep(0); setName(''); setCats([]); setWebsite('');
    setPhotoFile(null); setCoverFile(null); setPhotoPrev(null); setCoverPrev(null);
  }

  async function toggleFollow(pgId) {
    const pg = pages.find(x => x.id === pgId);
    const on = (pg?.followers || []).includes(currentUser.uid);
    try { await updateDoc(doc(db, 'pages', pgId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); }
    catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function finishCreate() {
    if (creating) return;
    setCreating(true);
    try {
      let photoURL = '', coverURL = '';
      if (photoFile) { const r = await uploadToTelegram(photoFile); photoURL = r.url; }
      if (coverFile) { const r = await uploadToTelegram(coverFile); coverURL = r.url; }
      const ref = await addDoc(collection(db, 'pages'), {
        name: name.trim(), category: cats[0] || 'Autre', categories: cats,
        description: '', photoURL, coverURL,
        website: website.trim(), phone: '', location: '', email: '',
        admins: [currentUser.uid], followers: [],
        createdBy: currentUser.uid, createdAt: serverTimestamp(),
      });
      setWizOpen(false); resetWiz();
      navigate(`/pages/${ref.id}`);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  const canNext = step === 1 ? !!name.trim() : step === 2 ? cats.length > 0 : true;

  // ── Barre de progression (4 dingana, toy ny Facebook) ──
  const Progress = () => (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: step === i ? '#1877F2' : '#E4E6EB', transition: 'background .2s' }} />
      ))}
    </div>
  );

  return (
    <div style={{ padding: '14px 12px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#63A9FF,#1877F2)' }}>
            <HiIdentification size={18} color="white" />
          </span>
          Sera
        </h2>
        <button onClick={() => { resetWiz(); setWizOpen(true); }} className="btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#65676B', margin: '8px 0 12px' }}>Pages publiques pour votre entreprise, marque personnelle ou organisation</p>

      {/* Recherche */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E4E6EB', borderRadius: 22, padding: '10px 14px', marginBottom: 12 }}>
        <HiSearch size={18} color="#65676B" />
        <input value={q} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setQ(''); navigate(l); return; } setQ(e.target.value); }} placeholder="Rechercher une page… ou coller un lien"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#050505' }} />
        {q && <button onClick={() => setQ('')} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B' }}><HiX size={14} /></button>}
      </div>

      {/* Mes pages */}
      {myPages.length > 0 && !low && (
        <div style={{ background: 'linear-gradient(135deg,#EAF2FF,#F2F8FF)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <HiIdentification size={16} color="#1877F2" /> Mes pages
          </span>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {myPages.map(pg => (
              <div key={pg.id} onClick={() => navigate(`/pages/${pg.id}`)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 12, padding: '8px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(145deg,#63A9FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {pg.photoURL ? <img src={pg.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiIdentification size={18} color="white" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>{pg.name}
                    <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 7, padding: '1px 6px' }}>ADMIN</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#65676B' }}>{(pg.followers || []).length} abonnés</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{low ? 'Aucun résultat' : 'Aucune page pour le moment'}</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>{low ? 'Essayez un autre mot-clé' : 'Créez la première Sera de la communauté !'}</p>
        </div>
      )}

      {shown.length > 0 && <p style={{ fontWeight: 800, fontSize: 15, margin: '4px 2px 8px' }}>{low ? 'Pages' : 'Découvrir des pages'}</p>}
      {shown.map(pg => {
        const admin = pg.admins?.includes(currentUser.uid);
        const on = (pg.followers || []).includes(currentUser.uid);
        return (
          <div key={pg.id} className="card" style={{ padding: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => navigate(`/pages/${pg.id}`)} style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(145deg,#63A9FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}>
              {pg.photoURL ? <img src={pg.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiIdentification size={24} color="white" />}
            </div>
            <div onClick={() => navigate(`/pages/${pg.id}`)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <p style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pg.name}</span>
                {admin ? <span style={{ fontSize: 10, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 8, padding: '2px 7px', flexShrink: 0 }}>ADMIN</span>
                       : <HiCheckCircle size={15} color="#1877F2" style={{ flexShrink: 0 }} />}
              </p>
              <p style={{ fontSize: 12, color: '#65676B' }}>{pg.category} · {(pg.followers || []).length} abonnés</p>
            </div>
            {!admin && (
              <button onClick={() => toggleFollow(pg.id)} className={on ? '' : 'btn-blue'}
                style={{ borderRadius: 16, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, border: on ? '1.5px solid #1877F2' : 'none',
                  ...(on ? { background: '#fff', color: '#1877F2', display: 'flex', alignItems: 'center', gap: 3 } : {}) }}>
                {on ? <><HiCheck size={13} /> Abonné</> : 'Suivre'}
              </button>
            )}
            <button onClick={() => navigate(`/pages/${pg.id}/messages`)} title="Message"
              style={{ background: '#F0F2F5', border: 'none', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <NeonPlane size={19} />
            </button>
          </div>
        );
      })}

      {/* ══════════ WIZARD CRÉATION (plein écran, toy ny Facebook) ══════════ */}
      {wizOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 400, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #E4E6EB', position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
            <button onClick={() => step === 0 ? (setWizOpen(false)) : setStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', padding: 4 }}><HiArrowLeft size={22} /></button>
            <h3 style={{ fontWeight: 800, fontSize: 16, flex: 1, textAlign: 'center' }}>
              {step === 0 ? 'Créez votre Sera' : step === 1 ? 'Nom de la page' : step === 2 ? 'Catégories de la page' : step === 3 ? 'Ajoutez un site Web' : 'Ajoutez des images'}
            </h3>
            {(step === 3 || step === 4) ? (
              <button onClick={() => step === 3 ? setStep(4) : finishCreate()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', fontWeight: 700, fontSize: 14, fontFamily: 'Poppins' }}>Ignorer</button>
            ) : <span style={{ width: 30 }} />}
          </div>

          {/* ── Dingana 0 : Intro ── */}
          {step === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
              <div style={{ background: '#242526', borderRadius: 16, padding: '20px 18px', color: '#fff' }}>
                <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Créez votre Sera</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, marginBottom: 14, display: 'flex', gap: 12 }}><span style={{ fontSize: 20 }}>👤</span> Une Sera est un espace où les gens peuvent communiquer publiquement avec votre entreprise, votre marque personnelle ou votre organisation.</p>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, marginBottom: 14, display: 'flex', gap: 12 }}><span style={{ fontSize: 20 }}>🗂️</span> Vous pouvez par exemple présenter vos produits et services, publier des actualités et échanger avec vos abonnés.</p>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, display: 'flex', gap: 12 }}><span style={{ fontSize: 20 }}>👥</span> Toute la communauté Trengo peut découvrir et suivre votre Sera.</p>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setStep(1)} className="btn-blue" style={{ width: '100%', padding: '13px 0', fontSize: 16, borderRadius: 12, fontWeight: 800 }}>Commencer</button>
            </div>
          )}

          {/* ── Dingana 1 : Nom ── */}
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 16 }}>Quel nom voulez-vous donner à cette page ?</h2>
              <input className="input" autoFocus placeholder="Nom de la page" value={name} onChange={e => setName(e.target.value)} maxLength={80} style={{ fontSize: 15, padding: '13px 14px' }} />
              <p style={{ fontSize: 13.5, color: '#65676B', marginTop: 10, lineHeight: 1.5 }}>Le nom de la page doit être le nom de votre entreprise, marque personnelle ou organisation. Vous pourrez le modifier plus tard.</p>
              <div style={{ flex: 1 }} />
              <Progress />
              <button onClick={() => canNext && setStep(2)} disabled={!canNext} className="btn-blue" style={{ width: '100%', padding: '13px 0', fontSize: 16, borderRadius: 12, fontWeight: 800, opacity: canNext ? 1 : .5 }}>Suivant</button>
            </div>
          )}

          {/* ── Dingana 2 : Catégories ── */}
          {step === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Quelle catégorie décrit le mieux cette page ?</h2>
              {cats.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {cats.map(c => (
                    <span key={c} onClick={() => toggleCat(c)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#E7F0FE', color: '#1877F2', borderRadius: 16, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {c} <HiX size={13} />
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 13.5, color: '#65676B', marginBottom: 14, lineHeight: 1.5 }}>Une catégorie permet de trouver cette page dans les résultats de recherche. Vous pouvez en ajouter jusqu'à 3.</p>
              <p style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 10 }}>Catégories populaires :</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 16 }}>
                {POPULAR.map(c => (
                  <button key={c} onClick={() => toggleCat(c)}
                    style={{ background: cats.includes(c) ? '#E7F0FE' : '#F0F2F5', color: cats.includes(c) ? '#1877F2' : '#050505', border: 'none', borderRadius: 18, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>
                    {c}
                  </button>
                ))}
              </div>
              <p style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 10 }}>Autres catégories :</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {CATEGORIES.filter(c => !POPULAR.includes(c)).map(c => (
                  <button key={c} onClick={() => toggleCat(c)}
                    style={{ background: cats.includes(c) ? '#E7F0FE' : '#F0F2F5', color: cats.includes(c) ? '#1877F2' : '#050505', border: 'none', borderRadius: 18, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, minHeight: 20 }} />
              <Progress />
              <button onClick={() => canNext && setStep(3)} disabled={!canNext} className="btn-blue" style={{ width: '100%', padding: '13px 0', fontSize: 16, borderRadius: 12, fontWeight: 800, opacity: canNext ? 1 : .5 }}>Suivant</button>
            </div>
          )}

          {/* ── Dingana 3 : Site web (Ignorer azo atao) ── */}
          {step === 3 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Avez-vous un site web pour {name.trim() || 'cette page'} ?</h2>
              <p style={{ fontSize: 14, color: '#65676B', marginBottom: 10 }}>Indiquez le site Web</p>
              <input className="input" placeholder="https://…" value={website} onChange={e => setWebsite(e.target.value)} style={{ fontSize: 15, padding: '13px 14px' }} />
              <p style={{ fontSize: 13.5, color: '#65676B', marginTop: 10, lineHeight: 1.5 }}>Ajoutez un lien pour que les gens puissent accéder à votre site web ou votre blog à partir de cette page.</p>
              <div style={{ flex: 1 }} />
              <Progress />
              <button onClick={() => setStep(4)} className="btn-blue" style={{ width: '100%', padding: '13px 0', fontSize: 16, borderRadius: 12, fontWeight: 800 }}>Suivant</button>
            </div>
          )}

          {/* ── Dingana 4 : Images (Terminé) ── */}
          {step === 4 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Ajoutez des images à cette page</h2>
              <p style={{ fontSize: 13.5, color: '#65676B', marginBottom: 14, lineHeight: 1.5 }}>Utilisez des images qui représentent le thème de cette page, par exemple un logo. Cela apparaîtra dans les résultats de recherche.</p>

              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPrev(URL.createObjectURL(f)); } }} />
              <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setCoverFile(f); setCoverPrev(URL.createObjectURL(f)); } }} />

              {/* Aperçu (toy ny Facebook) */}
              <div style={{ border: '1px solid #E4E6EB', borderRadius: 14, overflow: 'hidden' }}>
                <div onClick={() => coverRef.current?.click()} style={{ position: 'relative', height: 130, background: coverPrev ? '#000' : 'linear-gradient(135deg,#9DC3E6,#7FA8D0)', cursor: 'pointer' }}>
                  {coverPrev && <img src={coverPrev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.94)', borderRadius: 14, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}><HiPlus size={14} color="#1877F2" /> Couverture</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                  <div onClick={() => photoRef.current?.click()} style={{ position: 'relative', width: 74, height: 74, borderRadius: '50%', background: '#E4E6EB', flexShrink: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -34, border: '3px solid #fff' }}>
                    {photoPrev ? <img src={photoPrev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiCamera size={24} color="#65676B" />}
                    <span style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiPlus size={13} color="#fff" /></span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 18 }}>{name.trim() || 'Ma page'}</p>
                    <p style={{ fontSize: 13, color: '#65676B' }}>{cats[0] || 'Catégorie'}</p>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 20 }} />
              <Progress />
              <button onClick={finishCreate} disabled={creating} className="btn-blue" style={{ width: '100%', padding: '13px 0', fontSize: 16, borderRadius: 12, fontWeight: 800, opacity: creating ? .6 : 1 }}>
                {creating ? 'Création…' : 'Terminé'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
