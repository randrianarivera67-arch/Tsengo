#!/usr/bin/env node
// patch-native-apk.cjs — Phase 1 : APK NATIF Capacitor (pas d'URL bar) via GitHub Actions.
// capacitor server.url = Vercel (WebView natif charge le site en direct).
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>{const p=path.join(ROOT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8');};
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r);return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — APK Natif Capacitor (Phase 1)');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

try { write('.github/workflows/build-native.yml', "name: Build Native APK\n\non:\n  workflow_dispatch:\n\njobs:\n  build:\n    runs-on: ubuntu-22.04\n    steps:\n      - uses: actions/checkout@v4\n\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"20\"\n\n      - uses: actions/setup-java@v4\n        with:\n          java-version: \"17\"\n          distribution: \"temurin\"\n\n      - uses: android-actions/setup-android@v3\n\n      - name: Install SDK packages\n        run: sdkmanager \"platform-tools\" \"platforms;android-36\" \"build-tools;36.0.0\"\n\n      - name: Install npm deps\n        run: npm install --legacy-peer-deps\n\n      - name: Web build (pour cap sync)\n        run: npm run build || (mkdir -p dist && echo '<!doctype html><title>Trengo</title>' > dist/index.html)\n\n      - name: Capacitor sync\n        run: npx cap sync android\n\n      - name: Gradle assembleRelease\n        run: |\n          cd android\n          chmod +x gradlew\n          ./gradlew assembleRelease --no-daemon -x lint --stacktrace\n\n      - name: Sign APK\n        env:\n          KEYSTORE_B64: ${{ secrets.KEYSTORE_B64 }}\n          KEYSTORE_PASS: ${{ secrets.KEYSTORE_PASS }}\n        run: |\n          if [ -z \"$KEYSTORE_B64\" ]; then echo \"ERREUR: secret KEYSTORE_B64 manquant\"; exit 1; fi\n          echo \"$KEYSTORE_B64\" | base64 -d > key.jks\n          APK=$(find android/app/build/outputs/apk/release -name \"*.apk\" | head -1)\n          echo \"APK trouvé: $APK\"\n          \"$ANDROID_HOME/build-tools/36.0.0/zipalign\" -f 4 \"$APK\" aligned.apk\n          \"$ANDROID_HOME/build-tools/36.0.0/apksigner\" sign \\\n            --ks key.jks --ks-pass \"pass:$KEYSTORE_PASS\" \\\n            --key-pass \"pass:$KEYSTORE_PASS\" \\\n            --ks-key-alias trengo \\\n            --out trengo-native.apk aligned.apk\n\n      - name: Upload APK\n        uses: actions/upload-artifact@v4\n        with:\n          name: Trengo-Native-APK\n          path: trengo-native.apk\n          if-no-files-found: error\n"); good('.github/workflows/build-native.yml'); } catch(e){ err('workflow: '+e.message); }
rep('capacitor.config.json', `  "server": {
    "androidScheme": "https"
  }`, `  "server": {
    "androidScheme": "https",
    "url": "https://trengo-mg.vercel.app",
    "cleartext": false
  }`, 'capacitor server.url = Vercel');

console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 Commit + push, puis Actions -> Build Native APK -> Run workflow.\n');
