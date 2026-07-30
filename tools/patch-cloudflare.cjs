const REDIRECTS="# Cloudflare Pages \u2014 routage SPA (React Router)\n# Les fichiers statiques existants (assets, service workers, .well-known...)\n# sont servis en priorite par Cloudflare ; tout le reste retombe sur index.html.\n/*    /index.html   200\n";
const HEADERS="# Cloudflare Pages \u2014 en-tetes personnalises\n\n# Service workers : autorises a controler toute l'origine (equivalent\n# du \"Service-Worker-Allowed\" qui etait dans vercel.json)\n/OneSignalSDKWorker.js\n  Service-Worker-Allowed: /\n  Cache-Control: no-cache\n\n/firebase-messaging-sw.js\n  Service-Worker-Allowed: /\n  Cache-Control: no-cache\n\n# Verification Android (TWA mg.tsengo.app)\n/.well-known/assetlinks.json\n  Content-Type: application/json\n  Access-Control-Allow-Origin: *\n";

const fs = require('fs');
let OK = 0, SKIP = 0, FAIL = 0;
const ok = (m) => { OK++; console.log('OK ' + m); };
const skip = (m) => { SKIP++; console.log('SKIP ' + m); };
const fail = (m) => { FAIL++; console.log('FAIL ' + m); };

try {
  if (!fs.existsSync('public')) throw new Error('dossier public/ introuvable');

  if (fs.existsSync('public/_redirects') && fs.readFileSync('public/_redirects','utf8').includes('/index.html')) {
    skip('public/_redirects (deja present)');
  } else {
    fs.writeFileSync('public/_redirects', REDIRECTS);
    ok('public/_redirects : routage SPA (React Router) pour Cloudflare');
  }

  if (fs.existsSync('public/_headers') && fs.readFileSync('public/_headers','utf8').includes('Service-Worker-Allowed')) {
    skip('public/_headers (deja present)');
  } else {
    fs.writeFileSync('public/_headers', HEADERS);
    ok('public/_headers : service workers + assetlinks (TWA)');
  }
} catch (e) { fail('Cloudflare config: ' + e.message); }

console.log('\nRESUME: OK=' + OK + ' SKIP=' + SKIP + ' FAIL=' + FAIL);
console.log('\nCes fichiers sont copies automatiquement dans dist/ par Vite.');
console.log('Ils ne changent RIEN pour Vercel : celui-ci continue de tourner normalement.');
