const fs = require('fs');

// 1) vite.config.js : externalize @capacitor/push-notifications (chargé au natif seulement)
const vp = 'vite.config.js';
let v = fs.readFileSync(vp, 'utf8');
if (!v.includes('@capacitor/push-notifications')) {
  if (v.includes('rollupOptions:')) {
    v = v.replace('rollupOptions:', "rollupOptions: {\n        external: ['@capacitor/push-notifications'],\n      } && {");
  } else if (/build:\s*\{/.test(v)) {
    v = v.replace(/build:\s*\{/, "build: {\n    rollupOptions: { external: ['@capacitor/push-notifications'] },");
  } else {
    v = v.replace(/export default defineConfig\(\{/, "export default defineConfig({\n  build: { rollupOptions: { external: ['@capacitor/push-notifications'] } },");
  }
  fs.writeFileSync(vp, v);
  console.log('OK vite.config externalize push-notifications');
} else console.log('vite.config deja fait');
