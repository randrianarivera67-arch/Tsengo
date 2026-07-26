let pins = [];
const MAX_MS = 15 * 60 * 1000;

export function addPin(id) {
  if (id && !pins.some(x => x.id === id)) pins.push({ id, t: Date.now() });
}
export function getPins() {
  const now = Date.now();
  pins = pins.filter(x => now - x.t < MAX_MS);
  return pins.map(x => x.id);
}
export function removePin(id) { pins = pins.filter(x => x.id !== id); }
export function clearPins() { pins = []; }
