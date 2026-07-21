const fs = require('fs');
let L = fs.readFileSync('src/components/Layout.jsx', 'utf8');
if (!L.includes('doSoftRefresh')) {
  const anchor = "  const { unreadCount: msgCount }   = useMessages();";
  if (L.split(anchor).length - 1 !== 1) { console.log('ERR Layout states'); process.exit(1); }
  L = L.replace(anchor, anchor + `
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const doSoftRefresh = () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    return new Promise(res => setTimeout(() => { setRefreshing(false); res(); }, 850));
  };`);
}
const ptrOld = `      {/* Pull-to-refresh sur toutes les pages (Home a le sien en soft ; Reels exclu) */}
      {location.pathname !== '/' && !isReels && (
        <PullToRefresh onRefresh={() => { window.location.reload(); }} />
      )}`;
const ptrNew = `      {!isReels && <PullToRefresh onRefresh={doSoftRefresh} />}
      {refreshing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: isDark ? 'rgba(11,13,18,0.55)' : 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <img src="/icon-192.png" alt="" width={62} height={62}
            style={{ borderRadius: '50%', boxShadow: '0 4px 18px rgba(0,0,0,.18)', animation: 'trengo-spin .8s linear infinite' }} />
        </div>
      )}`;
if (!L.includes('backdropFilter')) {
  if (L.split(ptrOld).length - 1 !== 1) { console.log('ERR Layout PTR ('+(L.split(ptrOld).length-1)+')'); process.exit(1); }
  L = L.replace(ptrOld, ptrNew);
}
const mainOld = "      <main style={{ maxWidth: 680, margin: '0 auto', padding: 0, width: '100%' }}>{children}</main>";
const mainNew = "      <main key={refreshKey} style={{ maxWidth: 680, margin: '0 auto', padding: 0, width: '100%' }}>{children}</main>";
if (L.includes(mainOld)) L = L.replace(mainOld, mainNew);
else if (!L.includes('key={refreshKey}')) { console.log('ERR main'); process.exit(1); }
fs.writeFileSync('src/components/Layout.jsx', L);
console.log('OK Layout');
let H = fs.readFileSync('src/pages/Home.jsx', 'utf8');
const homePtr = '      <PullToRefresh onRefresh={refreshFeed} />';
if (H.includes(homePtr)) { H = H.replace(homePtr, '      {/* PullToRefresh gere par Layout */}'); fs.writeFileSync('src/pages/Home.jsx', H); console.log('OK Home'); }
else console.log('SKIP Home');
let C = fs.readFileSync('src/index.css', 'utf8');
if (!C.includes('@keyframes trengo-spin')) { C += '\n@keyframes trengo-spin { to { transform: rotate(360deg); } }\n'; fs.writeFileSync('src/index.css', C); console.log('OK css'); }
else console.log('SKIP css');
