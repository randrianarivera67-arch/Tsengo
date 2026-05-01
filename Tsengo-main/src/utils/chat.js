// src/utils/chat.js
export function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}
