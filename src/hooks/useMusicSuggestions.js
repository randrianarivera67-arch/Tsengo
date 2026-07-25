import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export function useMusicSuggestions(pageSize = 10) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cursorRef  = useRef(null);
  const loadingRef = useRef(false);
  const moreRef    = useRef(true);
  const seenRef    = useRef(new Set());

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !moreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const q = cursorRef.current
        ? query(collection(db, 'posts'), where('isMusic', '==', true), startAfter(cursorRef.current), limit(pageSize))
        : query(collection(db, 'posts'), where('isMusic', '==', true), limit(pageSize));
      const snap = await getDocs(q);
      if (snap.empty) {
        moreRef.current = false; setHasMore(false);
      } else {
        cursorRef.current = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < pageSize) { moreRef.current = false; setHasMore(false); }
        const rows = [];
        snap.docs.forEach(d => {
          if (seenRef.current.has(d.id)) return;
          seenRef.current.add(d.id);
          const data = d.data() || {};
          if (!data.mediaURL) return;
          rows.push({ id: d.id, ...data });
        });
        if (rows.length) setItems(prev => [...prev, ...rows]);
      }
    } catch {
      moreRef.current = false; setHasMore(false);
    }
    loadingRef.current = false;
    setLoading(false);
  }, [pageSize]);

  useEffect(() => { loadMore(); }, [loadMore]);

  return { items, loading, hasMore, loadMore };
}
