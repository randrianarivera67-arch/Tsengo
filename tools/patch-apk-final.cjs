#!/usr/bin/env node
// patch-apk-final.cjs — APK final : assetlinks (plein écran, sans barre d'adresse)
// + vercel.json (.well-known servi) + workflow signé avec clé FIXE (GitHub Secret).
const fs=require('fs'); const path=require('path'); const ROOT=process.cwd();
let ok=0,fail=0;
const good=m=>{console.log('  \u2705 '+m);ok++;};
const skip=m=>{console.log('  \u26a0\ufe0f  '+m);};
const err=m=>{console.log('  \u274c '+m);fail++;};
const read=r=>{const p=path.join(ROOT,r);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;};
const write=(r,s)=>{const p=path.join(ROOT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8');};
function rep(r,from,to,l){const s=read(r);if(s==null){err('Introuvable: '+r);return;}if(s.includes(to)){good(l+' (déjà)');return;}if(!s.includes(from)){skip('Ancre manquante: '+l);return;}write(r,s.replace(from,to));good(l);}

console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  PATCH — APK final (signé + plein écran)');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

try { write('public/.well-known/assetlinks.json', "[\n  {\n    \"relation\": [\"delegate_permission/common.handle_all_urls\"],\n    \"target\": {\n      \"namespace\": \"android_app\",\n      \"package_name\": \"mg.tsengo.app\",\n      \"sha256_cert_fingerprints\": [\"05:2E:77:D6:8F:61:04:96:1E:8D:2A:5C:0C:84:D1:11:0C:54:DB:CF:C8:F9:05:5F:2A:F7:F4:94:2C:2D:F8:DB\"]\n    }\n  }\n]\n"); good('public/.well-known/assetlinks.json'); } catch(e){ err('assetlinks: '+e.message); }
rep('vercel.json', `"source": "/((?!OneSignalSDKWorker.js).*)",`, `"source": "/((?!OneSignalSDKWorker.js|.well-known/).*)",`, 'vercel.json: .well-known servi');
rep('.github/workflows/build-apk.yml', `      - name: Sign APK
        run: |
          APK=$(find twa -name "*.apk" | head -1)
          echo "APK: $APK"
          keytool -genkeypair -v -keystore key.jks -alias tsengo \\
            -keyalg RSA -keysize 2048 -validity 10000 \\
            -storepass tsengo123 -keypass tsengo123 \\
            -dname "CN=Trengo,O=Trengo,C=MG" -noprompt
          $ANDROID_HOME/build-tools/33.0.2/apksigner sign \\
            --ks key.jks --ks-pass pass:tsengo123 \\
            --key-pass pass:tsengo123 \\
            --out trengo.apk "$APK"`, `      - name: Sign APK
        env:
          KEYSTORE_B64: \${{ secrets.KEYSTORE_B64 }}
          KEYSTORE_PASS: \${{ secrets.KEYSTORE_PASS }}
        run: |
          APK=$(find twa -name "*.apk" | head -1)
          echo "APK: $APK"
          if [ -z "$KEYSTORE_B64" ]; then echo "ERREUR: secret KEYSTORE_B64 manquant (voir instructions)"; exit 1; fi
          echo "$KEYSTORE_B64" | base64 -d > key.jks
          $ANDROID_HOME/build-tools/33.0.2/apksigner sign \\
            --ks key.jks --ks-pass "pass:$KEYSTORE_PASS" \\
            --key-pass "pass:$KEYSTORE_PASS" \\
            --ks-key-alias trengo \\
            --out trengo.apk "$APK"`, 'Workflow: signature clé fixe');

console.log('\n  Résultat: '+ok+' \u2705   '+fail+' \u274c');
if(fail===0) console.log('\n\ud83c\udf89 Ajoute les 2 secrets GitHub, puis push (voir instructions).\n');
