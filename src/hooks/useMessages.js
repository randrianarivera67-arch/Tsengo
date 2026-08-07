// src/hooks/useMessages.js
// ✅ PERF v2 : ny index `userChats/{uid}` ihany no vakina (~10 Ko)
// fa TSY ny `conversations` MANONTOLO (an'ny olona rehetra) toy ny taloha.
// Io no loharano lehibe indrindra nandany data isaky ny misokatra ny app.
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function useMessages() {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onValue(ref(rtdb, `userChats/${currentUser.uid}`), (snap) => {
      const data = snap.val() || {};
      let total = 0;
      const convList = [];
      Object.entries(data).forEach(([chatId, c]) => {
        if (!c || typeof c !== 'object') return;
        total += c.u || 0;
        convList.push({
          chatId,
          lastMsg: { text: c.lt || '', ts: c.ts || 0, mediaType: c.mt || '' },
          unread: c.u || 0,
          otherUid: c.o || '',
          type: c.t || 'd',
          name: c.n || c.fn || '',
          photo: c.ph || c.fu || '',
          meta: { lastMessage: c.lt || '', lastTs: c.ts || 0 },
        });
      });
      convList.sort((a, b) => ((b.lastMsg?.ts || 0) - (a.lastMsg?.ts || 0)));
      setUnreadCount(total);
      setConversations(convList);
    }, () => {});
    return () => unsub();
  }, [currentUser]);

  return { unreadCount, conversations };
}
