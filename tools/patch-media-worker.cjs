const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');
const OLD = "  const url = data.url || (data.fileId ? `${MEDIA_URL}/media-id?file_id=${data.fileId}` : null);";
const NEW = "  const url = (data.fileId ? `${MEDIA_URL}/media-id?file_id=${data.fileId}` : data.url) || null;";
if (s.includes('data.fileId ? `${MEDIA_URL}/media-id?file_id=${data.fileId}` : data.url')) { console.log('SKIP deja'); process.exit(0); }
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre ('+(s.split(OLD).length-1)+')'); process.exit(1); }
s = s.replace(OLD, NEW);
fs.writeFileSync(p, s);
console.log('OK media via Cloudflare Worker');
