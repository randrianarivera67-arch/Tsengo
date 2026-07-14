const fs = require('fs');
const p = 'src/components/PushDiagnostic.jsx';
let s = fs.readFileSync(p, 'utf8');

// refresh() robuste : state d'abord, jamais bloqué, tokens ensuite
const oldRe = /async function refresh\(\) \{[\s\S]*?setTokenCount\(null\); \}\s*\}/;
const neu =
`async function refresh() {
    try {
      const st = await getPushState();
      setState(st);
    } catch (e) {
      setState({ native:false, platform:'?', permission:'erreur', hasToken:false, token:null, error:(e&&e.message)||String(e), backend:'?', hasSecret:false });
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const toks = (snap.exists() && snap.data().fcmTokens) || [];
      setTokenCount(Array.isArray(toks) ? toks.length : 0);
    } catch { setTokenCount(null); }
  }`;
if (oldRe.test(s)) { s = s.replace(oldRe, neu); console.log('OK refresh() robuste'); }
else { console.log('❌ refresh() introuvable'); process.exit(1); }

fs.writeFileSync(p, s);
