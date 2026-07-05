// cart-sync.js
// Background sync between localStorage (source of truth) and Supabase cart_items.
// Never blocks the UI. Never throws visibly. localStorage is authoritative.

const CART_KEY = 'cart';
const SYNC_DEBOUNCE_MS = 1000;
const SYNC_INTERVAL_MS = 30000;
const SYNC_TIMEOUT_MS = 5000;

let _syncTimer = null;

function _getLocalCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function _withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

// Replace-style push: delete all rows for this user, insert current local cart.
async function pushCartToServer() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return; // guests: nothing to sync

    const userId = session.user.id;
    const cart = _getLocalCart();

    await _withTimeout((async () => {
      await supabaseClient.from('cart_items').delete().eq('user_id', userId);
      if (cart.length > 0) {
        const rows = cart.map(item => ({
          user_id: userId,
          type: item.type || 'featured',
          name: item.name || null,
          description: item.description || null,
          size: item.size || null,
          color: item.color || null,
          flavor: item.flavor || null,
          icing: item.icing || null,
          decorations: item.decorations || null,
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || null
        }));
        await supabaseClient.from('cart_items').insert(rows);
      }
    })(), SYNC_TIMEOUT_MS);
  } catch (err) {
    // Silent failure by design — localStorage remains the source of truth.
    console.warn('Cart background sync failed (non-fatal):', err.message);
  }
}

function scheduleCartSync() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(pushCartToServer, SYNC_DEBOUNCE_MS);
}

// Pull server cart down into localStorage (used when local cart is empty at login).
async function pullCartFromServer(userId) {
  try {
    const { data, error } = await _withTimeout(
      supabaseClient.from('cart_items').select('*').eq('user_id', userId),
      SYNC_TIMEOUT_MS
    );
    if (error || !data) return;

    const cart = data.map(row => ({
      type: row.type,
      name: row.name,
      description: row.description,
      size: row.size,
      color: row.color,
      flavor: row.flavor,
      icing: row.icing,
      decorations: row.decorations,
      price: row.price,
      quantity: row.quantity,
      image: row.image
    }));
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.warn('Cart pull-from-server failed (non-fatal):', err.message);
  }
}

// Called once, right after a successful login, before redirect.
async function mergeCartOnLogin(userId) {
  const localCart = _getLocalCart();
  if (localCart.length > 0) {
    await pushCartToServer(); // local wins — overwrite server
  } else {
    await pullCartFromServer(userId); // nothing local — adopt server cart
  }
}

// Called on logout, before redirecting.
function clearLocalCartOnLogout() {
  localStorage.removeItem(CART_KEY);
}

// Expose to global scope for use in inline scripts.
window.scheduleCartSync = scheduleCartSync;
window.mergeCartOnLogin = mergeCartOnLogin;
window.clearLocalCartOnLogout = clearLocalCartOnLogout;

// Periodic background sync while any page with this script is open.
setInterval(scheduleCartSync, SYNC_INTERVAL_MS);

// Best-effort sync on tab close/navigate-away.
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') pushCartToServer();
});
