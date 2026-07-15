const PTR_SRC="// src/components/PullToRefresh.jsx\n// Rafitra \"tirer pour actualiser\" mahomby amin'ny WEB **sy** ny APK natif\n// (JS/touch tsotra \u2014 tsy miankina amin'ny overscroll an'ny navigateur, izay\n// tsy misy ao anaty WebView Capacitor). Mamaly koa ny \"tapotra Accueil\n// rehefa efa ao Accueil\" (\u00e9v\u00e9nement window \"trengo:refresh-home\").\nimport { useEffect, useRef, useState } from 'react';\n\nconst THRESHOLD = 70;   // segondra fitiavana mba hiantsoana ny refresh\nconst MAX_PULL  = 110;\n\nexport default function PullToRefresh({ onRefresh }) {\n  const [pull, setPull] = useState(0);      // 0..MAX_PULL, an'ny visuel\n  const [spinning, setSpinning] = useState(false);\n  const startY = useRef(0);\n  const dragging = useRef(false);\n  const atTop = useRef(true);\n\n  function scrollTop() {\n    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;\n  }\n\n  function doRefresh(fromGesture) {\n    setSpinning(true);\n    window.scrollTo({ top: 0, behavior: fromGesture ? 'auto' : 'smooth' });\n    try { onRefresh && onRefresh(); } catch (e) { /* ignore */ }\n    setTimeout(() => { setSpinning(false); setPull(0); }, 700);\n  }\n\n  useEffect(() => {\n    function onTouchStart(e) {\n      if (spinning) return;\n      atTop.current = scrollTop() <= 2;\n      if (!atTop.current) return;\n      startY.current = e.touches[0].clientY;\n      dragging.current = true;\n    }\n    function onTouchMove(e) {\n      if (!dragging.current || spinning) return;\n      if (scrollTop() > 2) { dragging.current = false; setPull(0); return; }\n      const dy = e.touches[0].clientY - startY.current;\n      if (dy <= 0) { setPull(0); return; }\n      // resistance : tsy mihoatra ny MAX_PULL, ary mihena kely arakaraka ny halavany\n      const p = Math.min(MAX_PULL, dy * 0.5);\n      setPull(p);\n      if (p > 12 && e.cancelable) e.preventDefault();\n    }\n    function onTouchEnd() {\n      if (!dragging.current) return;\n      dragging.current = false;\n      if (pull >= THRESHOLD) doRefresh(true);\n      else setPull(0);\n    }\n    window.addEventListener('touchstart', onTouchStart, { passive: true });\n    window.addEventListener('touchmove', onTouchMove, { passive: false });\n    window.addEventListener('touchend', onTouchEnd, { passive: true });\n    return () => {\n      window.removeEventListener('touchstart', onTouchStart);\n      window.removeEventListener('touchmove', onTouchMove);\n      window.removeEventListener('touchend', onTouchEnd);\n    };\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [pull, spinning]);\n\n  // Tapotra \"Accueil\" rehefa efa ao Accueil -> mitovy fihetsika\n  useEffect(() => {\n    function onHomeTap() { doRefresh(false); }\n    window.addEventListener('trengo:refresh-home', onHomeTap);\n    return () => window.removeEventListener('trengo:refresh-home', onHomeTap);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);\n\n  const visible = pull > 0 || spinning;\n  const size = spinning ? 34 : Math.min(34, 14 + pull * 0.2);\n  const rotation = spinning ? undefined : Math.min(180, (pull / THRESHOLD) * 180);\n\n  return (\n    <div\n      aria-hidden=\"true\"\n      style={{\n        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,\n        display: 'flex', justifyContent: 'center',\n        height: visible ? Math.max(pull, spinning ? 50 : 0) : 0,\n        overflow: 'hidden', transition: dragging.current ? 'none' : 'height .25s ease',\n        pointerEvents: 'none',\n      }}\n    >\n      <div style={{\n        marginTop: 10, width: size, height: size, borderRadius: '50%',\n        background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.18)',\n        display: 'flex', alignItems: 'center', justifyContent: 'center',\n        transform: rotation !== undefined ? `rotate(${rotation}deg)` : 'none',\n      }}>\n        <svg width={size * 0.55} height={size * 0.55} viewBox=\"0 0 24 24\" fill=\"none\"\n          style={spinning ? { animation: 'trengo-spin .7s linear infinite' } : undefined}>\n          <path d=\"M12 4a8 8 0 1 1-7.446 5.032\" stroke=\"#FF2D8D\" strokeWidth=\"2.6\" strokeLinecap=\"round\" />\n          <path d=\"M4 4v5h5\" stroke=\"#FF2D8D\" strokeWidth=\"2.6\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\n        </svg>\n      </div>\n      <style>{`@keyframes trengo-spin { to { transform: rotate(360deg); } }`}</style>\n    </div>\n  );\n}\n";

const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

// 1) PullToRefresh.jsx (composant)
try {
  if (!fs.existsSync('src/components')) throw new Error('src/components introuvable');
  fs.writeFileSync('src/components/PullToRefresh.jsx', PTR_SRC);
  ok('PullToRefresh.jsx cree (pull-to-refresh natif JS + refresh-home)');
} catch (e) { fail('PullToRefresh.jsx: ' + e.message); }

// 2) Home.jsx : branchement
try {
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("import PullToRefresh from '../components/PullToRefresh'")) {
    skip('Home.jsx deja branche sur PullToRefresh');
  } else {
    let n = 0;
    const a1 = "import MediaViewer from '../components/MediaViewer';";
    if (!s.includes(a1)) throw new Error('ancre import MediaViewer introuvable');
    s = s.replace(a1, a1 + "\nimport PullToRefresh from '../components/PullToRefresh';"); n++;

    const a2 = "  return (\n    <div style={{ padding:0 }}>\n      {viewerState && (";
    if (!s.includes(a2)) throw new Error('ancre racine JSX introuvable');
    s = s.replace(a2, "  return (\n    <div style={{ padding:0 }}>\n      <PullToRefresh />\n      {viewerState && ("); n++;

    fs.writeFileSync(p, s);
    ok('Home.jsx : ' + n + ' modifications (PullToRefresh branche)');
  }
} catch (e) { fail('Home.jsx: ' + e.message); }

// 3) Layout.jsx : tapotra Accueil rehefa efa ao Accueil -> refresh
try {
  const p = 'src/components/Layout.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("trengo:refresh-home")) {
    skip('Layout.jsx deja branche (evenement refresh-home)');
  } else {
    const old = "<button key={label} className={`dock-item ${active ? 'active' : ''}`} onClick={() => navigate(path, navState ? { state: navState } : undefined)}";
    if (!s.includes(old)) throw new Error('ancre bouton nav introuvable');
    const neu = `<button key={label} className={\`dock-item \${active ? 'active' : ''}\`} onClick={() => {
                if (path === '/' && location.pathname === '/') { window.dispatchEvent(new CustomEvent('trengo:refresh-home')); return; }
                navigate(path, navState ? { state: navState } : undefined);
              }}`;
    s = s.replace(old, neu);
    fs.writeFileSync(p, s);
    ok('Layout.jsx : tapotra Accueil (deja ao Accueil) -> declenche le refresh');
  }
} catch (e) { fail('Layout.jsx: ' + e.message); }

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
