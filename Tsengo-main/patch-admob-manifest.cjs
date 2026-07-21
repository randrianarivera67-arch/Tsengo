const fs = require("fs");
process.chdir(__dirname);
const F = "android/app/src/main/AndroidManifest.xml";
let S = fs.readFileSync(F, "utf8");
const done = [];

// 1) Meta-data App ID AdMob (Test App ID an'i Google - hosoloina rehefa vita ny kaonty)
const oldClose = `        </provider>
    </application>`;
const newClose = `        </provider>

        <!-- AdMob App ID (TEST ID an'i Google - soloy amin'ny App ID tena izy rehefa vita ny kaonty AdMob) -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713"/>
    </application>`;
if (S.includes(oldClose) && !S.includes("com.google.android.gms.ads.APPLICATION_ID")) {
  S = S.replace(oldClose, newClose);
  done.push("Meta-data AdMob App ID (test) ajouté");
}

// 2) Permission AD_ID (ilaina amin'ny Android targetSdk vaovao)
const oldPerm = `    <uses-permission android:name="android.permission.INTERNET" />`;
const newPerm = `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />`;
if (S.includes(oldPerm) && !S.includes("permission.AD_ID")) {
  S = S.replace(oldPerm, newPerm);
  done.push("Permission AD_ID ajoutée");
}

fs.writeFileSync(F, S);
console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));
if (done.length === 0) console.log("   ⚠️ Tsy nisy nifanaraka — angamba efa novaina taloha.");
