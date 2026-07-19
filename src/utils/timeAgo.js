// src/utils/timeAgo.js
// Format harmonisé ho an'ny daty publication/notification/message
// - < 60s : "À l'instant"
// - < 1h  : "X min"
// - < 24h : "Xh"
// - < 5j  : "Xj"
// - >= 5j : date feno (jj/mm/aaaa)
export function timeAgo(ts) {
  if (!ts) return '';
  let d;
  if (ts && typeof ts.toDate === 'function') d = ts.toDate();
  else if (ts && typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);
  else if (ts && typeof ts._seconds === 'number') d = new Date(ts._seconds * 1000);
  else if (ts instanceof Date) d = ts;
  else d = new Date(ts);
  if (isNaN(d.getTime())) return '';

  const s = (Date.now() - d.getTime()) / 1000;

  if (s < 60) return "À l'instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;

  const days = Math.floor(s / 86400);
  if (days < 7) return `Il y a ${days}j`;

  // >= 5 jours -> date complète jj/mm/aaaa
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
