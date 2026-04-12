// src/pages/Notifications.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNotifications } from '../hooks/useNotifications';
import { useLang } from '../context/LanguageContext';
import { HiHeart, HiChat, HiUserAdd, HiCheck, HiBell, HiTrash } from 'react-icons/hi';

const ICONS = {
  comment: { icon: HiChat, color: '#3b82f6' },
  reaction: { icon: HiHeart, color: '#E91E8C' },
  friendRequest: { icon: HiUserAdd, color: '#8b5cf6' },
  friendAccepted: { icon: HiCheck, color: '#22c55e' },
};

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function Notifications() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { t } = useLang();
  const navigate = useNavigate();
  const prevCount = useRef(0);

  useEffect(() => {
    if (unreadCount > prevCount.current) playNotifSound();
    prevCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const timer = setTimeout(() => markAllRead(), 1500);
    return () => clearTimeout(timer);
  }, []);

  async function deleteNotification(e, notifId) {
    e.stopPropagation();
    await deleteDoc(doc(db, 'notifications', notifId));
  }

  function timeSince(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Izao ihany';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>{t('notifications')}</h2>
        {unreadCount > 0 && (
          <span style={{ background: '#E91E8C', color: 'white', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {unreadCount} vaovao
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <HiBell size={52} color="#E8C5D8" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#C4829F' }}>{t('noNotifications')}</p>
        </div>
      ) : (
        notifications.map(notif => {
          const cfg = ICONS[notif.type] || { icon: HiBell, color: '#E91E8C' };
          const Icon = cfg.icon;
          return (
            <div key={notif.id} className="card animate-fade"
              style={{ padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, background: notif.read ? 'white' : '#FFF0F8', borderLeft: notif.read ? 'none' : '3px solid #E91E8C', cursor: 'pointer' }}
              onClick={() => notif.postId && navigate('/')}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={notif.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName || 'U')}&background=E91E8C&color=fff`}
                  alt="" className="avatar" style={{ width: 44, height: 44 }} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: cfg.color, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  <Icon size={11} color="white" />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: '#2D1220', lineHeight: 1.4 }}>
                  <strong>{notif.fromName}</strong> {notif.message?.replace(notif.fromName, '').trim()}
                </p>
                <p style={{ fontSize: 11, color: '#C4829F', marginTop: 3 }}>{timeSince(notif.createdAt)}</p>
              </div>
              {!notif.read && <div style={{ width: 9, height: 9, background: '#E91E8C', borderRadius: '50%', flexShrink: 0 }} />}
              {/* Delete button */}
              <button onClick={e => deleteNotification(e, notif.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4, flexShrink: 0 }}
                title={t('deleteNotification')}>
                <HiTrash size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
