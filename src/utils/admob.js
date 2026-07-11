// src/utils/admob.js
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

// ⚠️ TEST Ad Unit ID an'i Google (miasa eran-tany, tsy mandoa vola).
// Soloy amin'ny Ad Unit ID tena an'ny Tsengo rehefa vita ny kaonty AdMob.
const BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

let initialized = false;

export async function initAdMob() {
  if (!Capacitor.isNativePlatform()) return; // Tsy miasa raha web/PWA fotsiny
  if (initialized) return;
  try {
    await AdMob.initialize({ initializeForTesting: true });
    initialized = true;
  } catch (e) {
    console.warn('AdMob init erreur:', e);
  }
}

export async function showBannerAd() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch (e) {
    console.warn('AdMob banner erreur:', e);
  }
}

export async function hideBannerAd() {
  if (!Capacitor.isNativePlatform()) return;
  try { await AdMob.hideBanner(); } catch {}
}
