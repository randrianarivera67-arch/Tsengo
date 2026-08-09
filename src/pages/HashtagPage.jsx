// src/pages/HashtagPage.jsx
// Publication rehetra misy marika iray.
//
// ⚠️ Ny publication TALOHA dia tsy manana `hashtags[]` → tsy ho hita eto.
// Ny vaovao ihany (fanapahan-kevitra nekena : tsy misy migration).
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { HiArrowLeft } from 'react-icons/hi';
import Linkify from '../components/Linkify';
import { avatarSrc } from '../utils/avatarSrc';
import SmartImage from '../components/SmartImage';
import { timeAgo } from '../utils/timeAgo';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState('loading');   // loading | ok | empty | error

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = String(tag || '').toLowerCase().trim();
      if (!t) { if (alive) setState('empty'); return; }
      setState('loading');
      try {
        // `array-contains` + `orderBy` : mila index composite. Raha tsy misy
        // izy dia mianjera — ka averina tsy misy orderBy, alahatra eto.
        let docs = [];
        try {
          const snap = await getDocs(query(
            collection(db, 'posts'),
            where('hashtags', 'array-contains', t),
            orderBy('createdAt', 'desc'), limit(40),
          ));
          docs = snap.docs;
        } catch (e) {
          const snap = await getDocs(query(
            collection(db, 'posts'),
            where('hashtags', 'array-contains', t), limit(40),
          ));
          docs = snap.docs.sort((a, b) => {
            const ta = a.data().createdAt, tb = b.data().createdAt;
            const na = ta?.seconds ? ta.seconds : Date.parse(ta || 0) / 1000 || 0;
            const nb = tb?.seconds ? tb.seconds : Date.parse(tb || 0) / 1000 || 0;
            return nb - na;
          });
        }
        if (!alive) return;
        const list = docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.audience !== 'me');
        setPosts(list);
        setState(list.length ? 'ok' : 'empty');
      } catch (e) {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [tag]);

  return (
    <div style={{ padding: '14px 12px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', display: 'flex' }}>
          <HiArrowLeft size={22} />
        </button>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 19, fontWeight: 800, color: '#1877F2', lineHeight: 1.2 }}>#{tag}</p>
          {state === 'ok' && (
            <p style={{ fontSize: 12, color: '#65676B' }}>
              {posts.length} publication{posts.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {state === 'loading' && (
        <p style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, padding: '40px 0' }}>Chargement…</p>
      )}

      {state === 'error' && (
        <p style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, padding: '40px 0' }}>
          Impossible de charger pour le moment.
        </p>
      )}

      {state === 'empty' && (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucune publication</p>
          <p style={{ fontSize: 13, color: '#65676B', lineHeight: 1.6 }}>
            Personne n'a encore utilisé #{tag}.<br />Soyez le premier !
          </p>
        </div>
      )}

      {state === 'ok' && posts.map(p => (
        <div key={p.id} className="card" onClick={() => navigate('/post/' + p.id)}
          style={{ padding: 12, marginBottom: 10, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <img src={avatarSrc(p.authorPhoto)}
              alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.authorName}
              </p>
              <p style={{ fontSize: 11, color: '#65676B' }}>{p.createdAt ? timeAgo(p.createdAt) : ''}</p>
            </div>
          </div>
          {p.content && (
            <p style={{ fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', marginBottom: p.mediaURL ? 8 : 0 }}>
              <Linkify text={p.content} />
            </p>
          )}
          {p.mediaType === 'image' && p.mediaURL && (
            <SmartImage src={p.thumbURL || p.mediaURL} minH={160}
              style={{ width: '100%', borderRadius: 10, objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  );
}
