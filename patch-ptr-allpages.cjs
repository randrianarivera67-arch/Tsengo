const fs = require('fs');
const p = 'src/components/Layout.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes("import PullToRefresh from './PullToRefresh'")) { console.log('SKIP import deja'); }
else {
  const impAnchor = "import { NeonChart } from './NeonIcons';";
  if (s.split(impAnchor).length - 1 !== 1) { console.log('ERR import anchor'); process.exit(1); }
  s = s.replace(impAnchor, impAnchor + "\nimport PullToRefresh from './PullToRefresh';");
}
if (s.includes('Pull-to-refresh sur toutes les pages')) { console.log('SKIP render deja'); process.exit(0); }
const rvAnchor = `      {/* Apparition "ressort" des cartes au defilement (toute l'app) */}
      <ScrollReveal />`;
if (s.split(rvAnchor).length - 1 !== 1) { console.log('ERR ScrollReveal anchor ('+(s.split(rvAnchor).length-1)+')'); process.exit(1); }
const add = rvAnchor + `

      {/* Pull-to-refresh sur toutes les pages (Home a le sien en soft ; Reels exclu) */}
      {location.pathname !== '/' && !isReels && (
        <PullToRefresh onRefresh={() => { window.location.reload(); }} />
      )}`;
s = s.replace(rvAnchor, add);
fs.writeFileSync(p, s);
console.log('OK PullToRefresh ajoute au Layout');
