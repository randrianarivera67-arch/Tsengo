// Corrige package.json en toute sécurité : garantit la présence de TOUTES les
// dépendances ajoutées au fil des patches (JSON-aware, ne supprime jamais rien).
const fs = require('fs');
const p = 'package.json';
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
pkg.dependencies = pkg.dependencies || {};

const required = {
  '@capacitor/app': '^8.0.0',
  '@capacitor/push-notifications': '^8.0.0',
  '@capacitor/core': '^8.4.1',
  '@capacitor/android': '^8.4.1',
  'leaflet': '^1.9.4',
  'react-leaflet': '^4.2.1',
};

let added = [];
for (const [name, version] of Object.entries(required)) {
  if (!pkg.dependencies[name]) {
    pkg.dependencies[name] = version;
    added.push(name);
  }
}

if (added.length === 0) {
  console.log('SKIP toutes les dependances sont deja presentes');
} else {
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
  console.log('OK dependances restaurees/ajoutees: ' + added.join(', '));
}

console.log('\nRESUME: ' + (added.length ? 'OK=1' : 'SKIP=1'));
console.log('\n⚠️ ETAPE OBLIGATOIRE : npm install --legacy-peer-deps');
console.log('(re-synchronise package-lock.json avec TOUTES les dependances)');
