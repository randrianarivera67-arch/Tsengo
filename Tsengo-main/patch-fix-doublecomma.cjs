const fs = require('fs');
const p = 'src/pages/Messages.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('HiBan,, HiPlus')) {
  s = s.replace('HiBan,, HiPlus', 'HiBan, HiPlus');
  fs.writeFileSync(p, s);
  console.log('OK virgule double corrigee (HiBan, HiPlus)');
} else if (s.includes('HiBan, HiPlus')) {
  console.log('SKIP deja correct');
} else {
  console.log('FAIL motif introuvable - verification manuelle necessaire');
}
