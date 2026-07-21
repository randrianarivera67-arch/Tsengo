const fs = require('fs');
const p = 'src/utils/nativePush.js';
let s = fs.readFileSync(p, 'utf8');
// ajoute un timeout autour du checkPermissions natif
s = s.replace(
  "const P = await getPlugin();\n      state.permission = (await P.checkPermissions()).receive;",
  "const P = await getPlugin();\n      const r = await Promise.race([P.checkPermissions(), new Promise((res)=>setTimeout(()=>res({receive:'timeout'}),2500))]);\n      state.permission = r.receive;"
);
fs.writeFileSync(p, s);
console.log('OK getPushState timeout');
