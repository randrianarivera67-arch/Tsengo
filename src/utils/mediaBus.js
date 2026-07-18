// src/utils/mediaBus.js
// Coordinateur média : mitahiry hoe IZA no mandeha izao.
// Rehefa misy manomboka (claim), dia ajanony ny teo aloha.
let currentPause = null;

export function claimPlayback(pauseFn) {
  if (currentPause && currentPause !== pauseFn) {
    try { currentPause(); } catch {}
  }
  currentPause = pauseFn;
}

export function releasePlayback(pauseFn) {
  if (currentPause === pauseFn) currentPause = null;
}
