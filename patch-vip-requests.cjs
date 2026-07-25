const fs = require('fs');
const done = [];

{
  const p = 'src/components/AdminIcons.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("case 'vip':")) { done.push('icone vip (deja)'); }
  else {
    const a = "    case 'orders':";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre AdminIcons orders'); process.exit(1); }
    s = s.replace(a, "    case 'vip': return (<g {...p}><path d=\"M12 3.2l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.5l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85Z\"/></g>);\n" + a);
    fs.writeFileSync(p, s);
    done.push('icone vip');
  }
}

{
  const p = 'src/pages/VIPInfo.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("vipRequests")) { done.push('VIPInfo (deja)'); }
  else {
    const impOld = "import { useNavigate } from 'react-router-dom';\nimport { HiArrowLeft, HiStar, HiCheckCircle, HiMail } from 'react-icons/hi';";
    if (s.split(impOld).length - 1 !== 1) { console.log('ERR ancre imports VIPInfo'); process.exit(1); }
    s = s.replace(impOld, `import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiStar, HiCheckCircle } from 'react-icons/hi';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';`);

    const fnOld = "export default function VIPInfo() {\n  const navigate = useNavigate();\n";
    if (s.split(fnOld).length - 1 !== 1) { console.log('ERR ancre fonction VIPInfo'); process.exit(1); }
    s = s.replace(fnOld, `export default function VIPInfo() {
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
`);

    const START = "        <p style={{ fontSize: 14, color: '#65676B', lineHeight: 1.7, marginBottom: 14 }}>";
    const TAIL  = "      </div>\n    </div>\n  );\n}";
    const i0 = s.indexOf(START);
    const i1 = s.lastIndexOf(TAIL);
    if (i0 < 0 || i1 < 0 || i1 <= i0) { console.log('ERR ancres bloc mailto'); process.exit(1); }
    const NEW = `        <p style={{ fontSize: 14, color: '#65676B', lineHeight: 1.7, marginBottom: 14 }}>
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
`;
    s = s.slice(0, i0) + NEW + s.slice(i1);
    s = s.replace(">\u{1F4CB} Comment obtenir le VIP ?<", ">Comment obtenir le VIP ?<");
    fs.writeFileSync(p, s);
    done.push('VIPInfo');
  }
}

{
  const p = 'src/pages/AdminPanel.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('vipRequests')) { done.push('AdminPanel (deja)'); }
  else {
    const a1 = "  const [boostOrders, setBoostOrders] = useState([]);";
    if (s.split(a1).length - 1 !== 1) { console.log('ERR ancre state boostOrders'); process.exit(1); }
    s = s.replace(a1, a1 + "\n  const [vipRequests, setVipRequests] = useState([]);\n  const [vipLoading, setVipLoading]   = useState(false);");

    const a2 = "  async function loadBoostOrders() {";
    if (s.split(a2).length - 1 !== 1) { console.log('ERR ancre loadBoostOrders'); process.exit(1); }
    s = s.replace(a2, `  async function loadVipRequests() {
    setVipLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'vipRequests'), orderBy('createdAt', 'desc')));
      setVipRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setVipRequests([]); }
    setVipLoading(false);
  }

  async function approveVip(req) {
    try {
      await updateDoc(doc(db, 'users', req.requesterUid), { isVip: true });
      await updateDoc(doc(db, 'vipRequests', req.id), { status: 'approved', processedAt: new Date().toISOString() });
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: req.requesterUid, fromUid: currentUser.uid, fromName: 'Trengo Admin', fromPhoto: '',
          type: 'general', message: 'Votre compte VIP a ete active. Bienvenue !',
          read: false, createdAt: serverTimestamp(),
        });
      } catch (e) { }
      setVipRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      setUsers(prev => prev.map(u => u.id === req.requesterUid ? { ...u, isVip: true } : u));
      showMsg('✅ VIP active pour ' + (req.requesterName || req.username || 'utilisateur'));
    } catch (err) { showMsg('❌ Erreur : ' + (err?.message || err)); }
  }

  async function refuseVip(req) {
    try {
      await updateDoc(doc(db, 'vipRequests', req.id), { status: 'refused', processedAt: new Date().toISOString() });
      try {
        await addDoc(collection(db, 'notifications'), {
          toUid: req.requesterUid, fromUid: currentUser.uid, fromName: 'Trengo Admin', fromPhoto: '',
          type: 'general', message: 'Votre demande de compte VIP a ete refusee.',
          read: false, createdAt: serverTimestamp(),
        });
      } catch (e) { }
      setVipRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'refused' } : r));
      showMsg('Demande VIP refusee');
    } catch (err) { showMsg('❌ Erreur : ' + (err?.message || err)); }
  }

${a2}`);

    const a3 = "loadUsers(); loadPosts(); loadShops(); loadArtists(); loadBoostOrders(); loadReports();";
    if (s.split(a3).length - 1 !== 1) { console.log('ERR ancre chargement initial'); process.exit(1); }
    s = s.replace(a3, "loadUsers(); loadPosts(); loadShops(); loadArtists(); loadBoostOrders(); loadReports(); loadVipRequests();");

    const a4 = "  const nPendingReports = reports.filter(r => r.status === 'pending' || !r.status).length;";
    if (s.split(a4).length - 1 !== 1) { console.log('ERR ancre nPendingReports'); process.exit(1); }
    s = s.replace(a4, a4 + "\n  const nPendingVip = vipRequests.filter(r => r.status === 'pending').length;");

    const a5 = "    { key: 'reports', label: 'Signalements',    group: 'GESTION', ic: 'report', badge: nPendingReports },";
    if (s.split(a5).length - 1 !== 1) { console.log('ERR ancre NAV reports'); process.exit(1); }
    s = s.replace(a5, a5 + "\n    { key: 'vip',     label: 'Demandes VIP',    group: 'GESTION', ic: 'vip', badge: nPendingVip },");

    const a6 = "        {activeTab === 'orders' && (";
    if (s.split(a6).length - 1 !== 1) { console.log('ERR ancre onglet orders'); process.exit(1); }
    s = s.replace(a6, `        {activeTab === 'vip' && (
          <div>
            {vipLoading ? (
              <SkeletonList rows={3} />
            ) : vipRequests.length === 0 ? (
              <p style={{ textAlign:'center', color:'#65676B', padding:30, fontSize:13 }}>Aucune demande VIP</p>
            ) : vipRequests.map(req => (
              <div key={req.id} style={{ background:'#FFFFFF', borderRadius:14, padding:'12px 14px', marginBottom:10, border: req.status==='pending' ? '1px solid #f59e0b' : '1px solid #E4E6EB' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <img src={req.requesterPhoto || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(req.requesterName||'U')}&background=1877F2&color=fff\`} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:13, color:'#050505', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.requesterName || 'Utilisateur'}</p>
                    <p style={{ fontSize:11, color:'#65676B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {req.username ? '@' + req.username : ''}{req.email ? ' · ' + req.email : ''}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop:10 }}>
                  {req.status === 'pending' ? (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => approveVip(req)} style={{ flex:1, background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:16, padding:'9px 0', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Activer le VIP</button>
                      <button onClick={() => refuseVip(req)} style={{ flex:1, background:'#FFFFFF', border:'1px solid #ef4444', borderRadius:16, padding:'9px 0', color:'#ef4444', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins' }}>Refuser</button>
                    </div>
                  ) : (
                    <span style={{ fontSize:12, fontWeight:700, color: req.status==='approved' ? '#22c55e' : '#ef4444' }}>
                      {req.status==='approved' ? 'VIP active' : 'Refusee'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

${a6}`);

    fs.writeFileSync(p, s);
    done.push('AdminPanel');
  }
}

console.log('OK : ' + done.join(', '));
