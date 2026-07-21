// src/hooks/useMessages.js
// ✅ FIX BUG #4: Filtered to current user's conversations only
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
    // ✅ FIX: filter by uid in chatId (Firebase Rules should also enforce this)
    const convsRef = ref(rtdb, `conversations`);
    const unsub = onValue(convsRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      let total = 0;
      const convList = [];
      Object.entries(data).forEach(([chatId, conv]) => {
        if (!chatId.includes(currentUser.uid)) return;
        const messages = conv.messages ? Object.values(conv.messages) : [];
        const unread = messages.filter(m => m.toUid === currentUser.uid && !m.read).length;
        total += unread;
        const lastMsg = messages[messages.length - 1];
        convList.push({ chatId, lastMsg, unread, ...conv.meta });
      });
      setUnreadCount(total);
      setConversations(convList);
    });
    return () => unsub();
  }, [currentUser]);

  return { unreadCount, conversations };
}
