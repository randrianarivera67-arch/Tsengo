import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveStoryUids } from '../hooks/useActiveStoryUids';
import { useOnline } from '../hooks/useOnline';

export default function Avatar({ uid, src, name = 'U', size = 40, showStory = true, showOnline = true, style = {} }) {
  const navigate = useNavigate();
  const storyUids = useActiveStoryUids();
  const online = useOnline();
  const [menu, setMenu] = useState(false);

  const hasStory = !!(showStory && uid && storyUids.has(uid));
  const isOnline = !!(showOnline && uid && online[uid] === true);
  const photo = src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877F2&color=fff`;
  const ring = hasStory ? 2 : 0;
  const dot = Math.max(9, Math.round(size * 0.26));

  const handleClick = (e) => {
    e.stopPropagation();
    if (hasStory) setMenu(m => !m);
    else if (uid) navigate(`/profile/${uid}`);
  };

  const btnStyle = {
    display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px',
    background: 'none', border: 'none', borderBottom: '1px solid #f0f2f5',
    fontSize: 13, fontFamily: 'Poppins', color: '#050505', cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      <div
        onClick={handleClick}
        style={{
          width: size, height: size, borderRadius: '50%', cursor: 'pointer',
          padding: ring, boxSizing: 'border-box',
          background: hasStory ? '#1877F2' : 'transparent',
        }}
      >
        <img
          src={photo}
          alt=""
          loading="lazy"
          style={{
            width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
            border: hasStory ? '2px solid white' : 'none', display: 'block',
          }}
        />
      </div>

      {isOnline && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0, width: dot, height: dot,
          borderRadius: '50%', background: '#22c55e', border: '2px solid white',
        }} />
      )}

      {menu && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setMenu(false); }}
               style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: size + 6, left: 0, zIndex: 999, background: 'white',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.18)', overflow: 'hidden', minWidth: 150,
          }}>
            <button style={btnStyle}
              onClick={(e) => { e.stopPropagation(); setMenu(false); navigate('/', { state: { openStoryUid: uid } }); }}>
              📖 Voir la story
            </button>
            <button style={{ ...btnStyle, borderBottom: 'none' }}
              onClick={(e) => { e.stopPropagation(); setMenu(false); navigate(`/profile/${uid}`); }}>
              👤 Voir le profil
            </button>
          </div>
        </>
      )}
    </div>
  );
}
