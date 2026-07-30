// patch-worker-media.cjs  (FRONTEND — src/utils/telegram.js)
// Dingana 1 : ny LECTURE media /media-id (photo + video kely) dia mandalo ny
// Cloudflare WORKER (fa tsy Render intsony) → tsy cold start, edge akaiky, cache.
//   • Ny UPLOAD mijanona amin'ny Render (tsy voakasika).
//   • Ny media TALOHA dia mbola mandeha (mitovy ny ?file_id=, Worker no mamaly).
//   • Ny video lehibe (/chunked) mbola amin'ny Render aloha (dingana manaraka).
// Idempotent + fiarovana.
const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');

const WORKER = 'https://tsengo-upload.randrianarivera67.workers.dev';

// Deja applique ?
if (s.includes('const MEDIA_URL')) { console.log('⏭️  Deja applique.'); process.exit(0); }

// 1) Ampidiro ny const MEDIA_URL eo ambanin'ny BACKEND_URL
const A1 = "const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://tsengo-backend.onrender.com';";
if (s.split(A1).length - 1 !== 1) { console.log('❌ ancre BACKEND_URL introuvable/multiple'); process.exit(1); }
s = s.replace(A1, A1 + "\n// Proxy media (lecture) : Cloudflare Worker (edge, cache) — fa tsy Render\nconst MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '" + WORKER + "';");

// 2) Ovay ny fananganana URL /media-id : BACKEND_URL → MEDIA_URL
const A2 = "const url = data.url || (data.fileId ? `${BACKEND_URL}/media-id?file_id=${data.fileId}` : null);";
const A2N = "const url = data.url || (data.fileId ? `${MEDIA_URL}/media-id?file_id=${data.fileId}` : null);";
if (s.split(A2).length - 1 !== 1) { console.log('❌ ancre media-id URL introuvable/multiple'); process.exit(1); }
s = s.replace(A2, A2N);

fs.writeFileSync(p, s);
console.log('✅ Lecture /media-id → Worker (' + WORKER + ').');
console.log('   Upload mijanona Render. Video lehibe /chunked mbola Render (dingana manaraka).');
