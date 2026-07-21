// src/hooks/useMessages.js
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function useMessages() {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    // Listen to conversations in Realtime DB
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
