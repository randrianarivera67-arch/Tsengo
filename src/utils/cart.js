// src/utils/cart.js — Panier boutique (localStorage, mijanona na miala ny app)
// Ny panier dia fitehirizana ny articles tian'ny mpividy : avy eo izy miantso (tel:)
// na mandefa message mivantana amin'ny page boutique.

const KEY = 'trengo_cart_v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  // Avela ho fantatry ny composants rehetra (badge, modale…) fa niova ny panier
  try { window.dispatchEvent(new Event('trengo-cart-updated')); } catch {}
}

/** Lisitry ny articles ao anaty panier. */
export function getCart() { return read(); }

/** Isan'ny articles (ho an'ny badge). */
export function cartCount() { return read().length; }

/** Ao anaty panier ve ilay article ? */
export function inCart(postId) { return read().some(i => i.id === postId); }

/** Manampy article (post boutique) ao anaty panier. Mamerina true raha vao nampidirina. */
export function addToCart(post) {
  if (!post?.id) return false;
  const items = read();
  if (items.some(i => i.id === post.id)) return false;   // efa ao — tsy averina indroa
  items.unshift({
    id: post.id,
    name: (post.content || 'Article').slice(0, 120),
    price: post.price || 0,
    mediaURL: post.mediaURL || '',
    shopId: post.shopId || '',
    shopName: post.shopName || post.authorName || '',
    shopPhoto: post.shopPhoto || post.authorPhoto || '',
    contact: post.contact || '',
    lieu: post.lieu || '',
    addedAt: Date.now(),
  });
  write(items);
  return true;
}

/** Manala article iray amin'ny panier. */
export function removeFromCart(postId) {
  write(read().filter(i => i.id !== postId));
}

/** Mihaino ny fiovan'ny panier — mamerina fonction unsubscribe. */
export function subscribeCart(cb) {
  const fn = () => cb(read());
  window.addEventListener('trengo-cart-updated', fn);
  window.addEventListener('storage', fn);   // fiovana avy amin'ny onglet hafa
  return () => { window.removeEventListener('trengo-cart-updated', fn); window.removeEventListener('storage', fn); };
}

/** Numéro voalohany azo antsoina ao amin'ny contact ("034... / 032..." → "034..."). */
export function firstPhone(contact) {
  if (!contact) return '';
  return String(contact).split(/[\/,;|]/)[0].trim();
}
