// patch-gradle-fcm.cjs — expose firebase-messaging au module app (repo Tsengo)
// Corrige les 14 erreurs "cannot find symbol FirebaseMessagingService".
const fs = require('fs');
const p = 'android/app/build.gradle';
if (!fs.existsSync(p)) { console.log('FAIL build.gradle introuvable'); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
if (s.includes('firebase-messaging')) { console.log('SKIP deja present'); process.exit(0); }
const anchor = "implementation project(':capacitor-android')";
if (!s.includes(anchor)) { console.log('FAIL ancre capacitor-android introuvable'); process.exit(1); }
s = s.replace(anchor, anchor + "\n    implementation 'com.google.firebase:firebase-messaging:25.0.1'");
fs.writeFileSync(p, s);
console.log('OK firebase-messaging:25.0.1 ajoute a app/build.gradle');
