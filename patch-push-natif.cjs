// AUTO-GÉNÉRÉ — bloc NATIVE_PUSH_SRC injecté automatiquement
const NATIVE_PUSH_SRC = "// src/utils/nativePush.js\n// Push notifications NATIVES (APK) via @capacitor/push-notifications + FCM.\n// Le token natif est enregistr\u00e9 dans users/{uid}.fcmTokens \u2014 LE M\u00caME champ que\n// le push web. Donc le backend Render (/notify \u2192 firebase-admin \u2192 FCM) d\u00e9livre\n// aussi bien au PWA qu'\u00e0 l'APK, sans rien changer c\u00f4t\u00e9 serveur.\n// Sur le web / PWA, ce module ne fait rien (garde isNativePlatform).\nimport { Capacitor } from '@capacitor/core';\nimport { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';\nimport { db } from '../firebase';\n\nlet currentUid = null;\nlet currentToken = null;\nlet listenersAdded = false;\n\nasync function getPlugin() {\n  const mod = await import('@capacitor/push-notifications');\n  return mod.PushNotifications;\n}\n\n// Route \u00e0 ouvrir au tap, selon le type de notification\nfunction routeFor(data = {}) {\n  if (data.url) return data.url;\n  if (data.link) return data.link;\n  const { type, postId, conversationId } = data;\n  if (postId && ['comment', 'reaction', 'post', 'boost', 'mention', 'share'].includes(type)) return `/post/${postId}`;\n  if (type === 'message') return conversationId ? `/messages/${conversationId}` : '/messages';\n  if (type === 'friendRequest' || type === 'friendAccepted') return '/friends';\n  return '/notifications';\n}\n\nexport async function initNativePush(uid) {\n  if (!Capacitor.isNativePlatform() || !uid) return; // web/PWA \u2192 g\u00e9r\u00e9 par FCM web\n  currentUid = uid;\n  try {\n    const PushNotifications = await getPlugin();\n\n    let perm = await PushNotifications.checkPermissions();\n    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {\n      perm = await PushNotifications.requestPermissions();\n    }\n    if (perm.receive !== 'granted') return;\n\n    if (!listenersAdded) {\n      listenersAdded = true;\n\n      // Token FCM natif \u2192 users/{uid}.fcmTokens (lu par le backend)\n      PushNotifications.addListener('registration', (token) => {\n        currentToken = token.value;\n        if (currentUid) {\n          updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayUnion(token.value) }).catch(() => {});\n        }\n      });\n\n      PushNotifications.addListener('registrationError', (err) => {\n        console.warn('Push registration error:', err?.error || err);\n      });\n\n      // App au premier plan : la cloche in-app se met \u00e0 jour via Firestore (rien \u00e0 afficher ici)\n      PushNotifications.addListener('pushNotificationReceived', () => { /* no-op */ });\n\n      // Tap sur la notification (app en arri\u00e8re-plan/ferm\u00e9e) \u2192 ouvre la bonne page\n      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {\n        try {\n          const data = (action && action.notification && action.notification.data) || {};\n          window.location.href = routeFor(data);\n        } catch (e) { /* ignore */ }\n      });\n    }\n\n    await PushNotifications.register();\n  } catch (e) {\n    console.warn('initNativePush failed:', (e && e.message) || e);\n  }\n}\n\nexport async function removeNativePush() {\n  try {\n    if (Capacitor.isNativePlatform() && currentUid && currentToken) {\n      await updateDoc(doc(db, 'users', currentUid), { fcmTokens: arrayRemove(currentToken) }).catch(() => {});\n    }\n  } catch (e) { /* ignore */ }\n  currentUid = null;\n  currentToken = null;\n}\n";

/* ============================================================================
 *  patch-push-natif.cjs  —  Trengo/Tsengo
 *  Push notifications NATIVES pour l'APK (façon Facebook, même app fermée) :
 *    1. package.json      → dépendance @capacitor/push-notifications
 *    2. src/utils/nativePush.js → enregistre le token FCM natif dans
 *       users/{uid}.fcmTokens (le backend Render existant délivre au natif)
 *    3. AuthContext.jsx   → init/remove au login/logout (à côté du push web)
 *    4. capacitor.config.json → plugin PushNotifications
 *    5. build-native.yml  → écrit google-services.json depuis un secret GitHub
 *
 *  ⚠️ AVANT DE BUILDER :
 *   • Firebase Console → app Android com.tsengo.app → télécharge google-services.json
 *   • GitHub → Settings → Secrets → Actions → nouveau secret
 *       GOOGLE_SERVICES_JSON = (contenu du fichier encodé base64)
 *       Termux: base64 -w0 google-services.json   → copie le résultat
 *   • Le backend /notify doit envoyer un bloc `notification:{title,body}`
 *     (pas seulement `data`) pour l'affichage en arrière-plan/app fermée.
 *
 *  Usage (Termux) :
 *    cp /sdcard/Download/patch-push-natif.cjs ~/Tsengo-fresh/
 *    cd ~/Tsengo-fresh && node patch-push-natif.cjs
 *    git add -A && git commit -m "Push natif APK (FCM)" && git push origin main
 *    Puis relance le workflow "Build Native APK".
 * ==========================================================================*/
const fs = require('fs');

let OK = 0, SKIP = 0, FAIL = 0;
const ok   = (m) => { OK++;   console.log('✅ ' + m); };
const skip = (m) => { SKIP++; console.log('⏭️  ' + m + ' (déjà fait)'); };
const fail = (m) => { FAIL++; console.log('❌ ' + m); };
const exists = (p) => fs.existsSync(p);

/* 1) package.json — dépendance ---------------------------------------------- */
(function () {
  const p = 'package.json';
  try {
    if (!exists(p)) return fail('package.json introuvable');
    let src = fs.readFileSync(p, 'utf8');
    if (src.includes('@capacitor/push-notifications')) return skip('package.json : dépendance');
    const anchor = '"@capacitor/core": "^8.4.1",';
    if (!src.includes(anchor)) return fail('package.json : ancre @capacitor/core introuvable');
    src = src.replace(anchor, anchor + '\n    "@capacitor/push-notifications": "^8.0.0",');
    fs.writeFileSync(p, src);
    ok('package.json : @capacitor/push-notifications ajouté');
  } catch (e) { fail('package.json : ' + e.message); }
})();

/* 2) src/utils/nativePush.js ------------------------------------------------ */
(function () {
  try {
    if (!exists('src/utils')) return fail('src/utils introuvable');
    fs.writeFileSync('src/utils/nativePush.js', NATIVE_PUSH_SRC);
    ok('src/utils/nativePush.js créé/mis à jour');
  } catch (e) { fail('nativePush.js : ' + e.message); }
})();

/* 3) AuthContext.jsx — wiring ----------------------------------------------- */
(function () {
  const p = 'src/context/AuthContext.jsx';
  try {
    if (!exists(p)) return fail('AuthContext.jsx introuvable');
    let src = fs.readFileSync(p, 'utf8');
    let changed = false;

    if (!src.includes('utils/nativePush')) {
      const impAnchor = "import { setOneSignalExternalId, removeOneSignalExternalId, requestNotificationPermission } from '../utils/onesignal';";
      if (!src.includes(impAnchor)) throw new Error('ancre import onesignal introuvable');
      src = src.replace(impAnchor, impAnchor + "\nimport { initNativePush, removeNativePush } from '../utils/nativePush';");
      changed = true;
    }
    if (!src.includes('initNativePush(')) {
      src = src.replace('setOneSignalExternalId(user.uid);', 'setOneSignalExternalId(user.uid);\n        initNativePush(user.uid);');
      changed = true;
    }
    if (!src.includes('removeNativePush(')) {
      src = src.replace('removeOneSignalExternalId();', 'removeOneSignalExternalId();\n        removeNativePush();');
      changed = true;
    }
    if (!changed) return skip('AuthContext.jsx : wiring push natif');
    fs.writeFileSync(p, src);
    ok('AuthContext.jsx : init/remove push natif (login/logout)');
  } catch (e) { fail('AuthContext.jsx : ' + e.message); }
})();

/* 4) capacitor.config.json — plugin ----------------------------------------- */
(function () {
  const p = 'capacitor.config.json';
  try {
    if (!exists(p)) return fail('capacitor.config.json introuvable');
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (cfg.plugins && cfg.plugins.PushNotifications) return skip('capacitor.config.json : plugin');
    cfg.plugins = cfg.plugins || {};
    cfg.plugins.PushNotifications = { presentationOptions: ['badge', 'sound', 'alert'] };
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
    ok('capacitor.config.json : plugin PushNotifications');
  } catch (e) { fail('capacitor.config.json : ' + e.message); }
})();

/* 5) build-native.yml — écrit google-services.json depuis le secret --------- */
(function () {
  const p = '.github/workflows/build-native.yml';
  try {
    if (!exists(p)) return fail('build-native.yml introuvable');
    let src = fs.readFileSync(p, 'utf8');
    if (src.includes('google-services.json')) return skip('build-native.yml : step google-services');
    const anchor = '      - name: Web build (pour cap sync)';
    if (!src.includes(anchor)) throw new Error('ancre "Web build" introuvable');
    const step =
      '      - name: Write google-services.json\n' +
      '        env:\n' +
      '          GOOGLE_SERVICES_JSON: ${{ secrets.GOOGLE_SERVICES_JSON }}\n' +
      '        run: |\n' +
      '          if [ -n "$GOOGLE_SERVICES_JSON" ]; then\n' +
      '            echo "$GOOGLE_SERVICES_JSON" | base64 -d > android/app/google-services.json\n' +
      '            echo "google-services.json ecrit"\n' +
      '          else\n' +
      '            echo "secret GOOGLE_SERVICES_JSON manquant - push natif desactive"\n' +
      '          fi\n\n';
    src = src.replace(anchor, step + anchor);
    fs.writeFileSync(p, src);
    ok('build-native.yml : écriture google-services.json (secret)');
  } catch (e) { fail('build-native.yml : ' + e.message); }
})();

/* --------------------------------------------------------------------------*/
console.log('\n────────────── RÉSUMÉ ──────────────');
console.log(`✅ ${OK}   ⏭️  ${SKIP}   ❌ ${FAIL}`);
console.log('\nÀ FAIRE avant le build APK :');
console.log('  1) Firebase Console → app Android com.tsengo.app → google-services.json');
console.log('  2) base64 -w0 google-services.json  → GitHub Secret GOOGLE_SERVICES_JSON');
console.log('  3) git add -A && git commit -m "Push natif APK (FCM)" && git push origin main');
console.log('  4) GitHub → Actions → "Build Native APK" → Run workflow → installe l\'APK');
console.log('\nBackend : /notify doit envoyer notification:{title,body} (pas seulement data)');
console.log('pour l\'affichage quand l\'app est fermée (comme Facebook).');
