const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

try {
  const p = 'src/pages/Profile.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("flexWrap:'wrap', rowGap:8, gap:10, marginTop:14")) {
    skip('Profile.jsx : boutons deja corriges');
  } else {
    const old = "            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:14 }}>";
    if (!s.includes(old)) throw new Error('ancre introuvable');
    const neu = "            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flexWrap:'wrap', rowGap:8, gap:10, marginTop:14 }}>";
    s = s.replace(old, neu);
    fs.writeFileSync(p, s);
    ok('Profile.jsx : boutons Suivre/Message/Ami/... -> alignes proprement (flexWrap)');
  }
} catch (e) { fail('Profile.jsx: ' + e.message); }

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
