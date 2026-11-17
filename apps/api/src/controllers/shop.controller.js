// Proxy katalogu sklepu przystan-pupila.pl — read-only + link do kasy.
// Zewnętrzny sklep wystawia /api/shop/* (routes/api-public.js po ich stronie).
const { query } = require('../config/database');

const SHOP_BASE = process.env.PRZYSTAN_API_URL || 'http://127.0.0.1:8000';
const SHOP_SITE = process.env.PRZYSTAN_SITE_URL || 'https://przystan-pupila.pl';
const SHOP_LOOKUP_KEY = process.env.PRZYSTAN_API_KEY || '';
const CACHE_TTL = 45_000;
const cache = new Map();

const fetchShop = async (path) => {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.t < CACHE_TTL) return hit.data;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(SHOP_BASE + path, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`shop upstream ${res.status}`);
    const data = await res.json();
    cache.set(path, { t: now, data });
    return data;
  } finally {
    clearTimeout(timer);
  }
};

const fetchShopPost = async (path, body) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(SHOP_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
};

const upstreamError = (res) =>
  res.status(503).json({ error: { message: 'Sklep jest chwilowo niedostępny — spróbuj za chwilę.', status: 503 } });

// GET /api/shop/categories
const getCategories = async (req, res) => {
  try {
    res.json(await fetchShop('/api/shop/categories'));
  } catch (e) {
    console.error('Shop categories proxy error:', e.message);
    upstreamError(res);
  }
};

// GET /api/shop/products?search=&category=&sort=&page=&limit=
const getProducts = async (req, res) => {
  try {
    const qs = new URLSearchParams();
    for (const k of ['search', 'category', 'sort', 'page', 'limit']) {
      if (req.query[k] !== undefined) qs.set(k, String(req.query[k]).slice(0, 120));
    }
    res.json(await fetchShop(`/api/shop/products?${qs}`));
  } catch (e) {
    console.error('Shop products proxy error:', e.message);
    upstreamError(res);
  }
};

// GET /api/shop/products/:id
const getProduct = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: { message: 'Nieprawidłowe ID produktu', status: 400 } });
    res.json(await fetchShop(`/api/shop/products/${id}`));
  } catch (e) {
    console.error('Shop product proxy error:', e.message);
    upstreamError(res);
  }
};

// GET /api/shop/checkout-link?items=ID:QTY,ID:QTY — link otwierany w nowej karcie,
// dokłada produkty do koszyka na przystan-pupila.pl i przenosi do kasy.
const getCheckoutLink = async (req, res) => {
  const raw = String(req.query.items || '');
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+:\d+$/.test(s))
    .slice(0, 30)
    .join(',');
  if (!items) {
    return res.status(400).json({ error: { message: 'Brak produktów do zakupu', status: 400 } });
  }
  res.json({ url: `${SHOP_SITE}/sklep/import-koszyka?items=${encodeURIComponent(items)}` });
};

// GET /api/shop/checkout-info?items=ID:QTY — pozycje + metody dostawy + dostępność P24
const getCheckoutInfo = async (req, res) => {
  try {
    const raw = String(req.query.items || '');
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d+:\d+$/.test(s))
      .slice(0, 30)
      .join(',');
    if (!items) {
      return res.status(400).json({ error: { message: 'Brak produktów do zakupu', status: 400 } });
    }
    // bez cache — stan magazynowy i metody muszą być świeże
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(`${SHOP_BASE}/api/shop/checkout-info?items=${encodeURIComponent(items)}`, { signal: ctrl.signal });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json(data);
      res.json(data);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error('Shop checkout-info proxy error:', e.message);
    upstreamError(res);
  }
};

// POST /api/shop/order — zamówienie gościnne z pozycji koszyka PetVio.
// Płatność realizowana w całości przez Przelewy24 sklepu Przystań Pupila.
const createOrder = async (req, res) => {
  try {
    const { status, data } = await fetchShopPost('/api/shop/order', req.body);
    res.status(status).json(data);
  } catch (e) {
    console.error('Shop order proxy error:', e.message);
    upstreamError(res);
  }
};

// POST /api/shop/validate-code — sprawdzenie kodu rabatowego dla pozycji
const validateCode = async (req, res) => {
  try {
    const { status, data } = await fetchShopPost('/api/shop/validate-code', req.body);
    res.status(status).json(data);
  } catch (e) {
    console.error('Shop validate-code proxy error:', e.message);
    upstreamError(res);
  }
};

// POST /api/shop/check-delivery — podgląd zasięgu dostawy „Zamów dziś, otrzymaj dziś"
const checkDelivery = async (req, res) => {
  try {
    const { status, data } = await fetchShopPost('/api/shop/check-delivery', {
      address: String(req.body?.address || '').slice(0, 200),
      postcode: String(req.body?.postcode || '').slice(0, 10),
    });
    res.status(status).json(data);
  } catch (e) {
    console.error('Shop check-delivery proxy error:', e.message);
    upstreamError(res);
  }
};

// GET /api/shop/my-orders — historia zamówień zalogowanego użytkownika.
// E-mail bierzemy z konta PetVio (JWT), a nie z parametru — nie da się podejrzeć cudzych zamówień.
const getMyOrders = async (req, res) => {
  try {
    if (!SHOP_LOOKUP_KEY) {
      return res.status(503).json({ error: { message: 'Historia zamówień jest chwilowo niedostępna', status: 503 } });
    }
    const u = await query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    const email = u.rows[0]?.email;
    if (!email) return res.json({ orders: [] });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(
        `${SHOP_BASE}/api/shop/orders-lookup?email=${encodeURIComponent(email)}&key=${encodeURIComponent(SHOP_LOOKUP_KEY)}`,
        { signal: ctrl.signal }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json(data);
      res.json({ orders: data.orders || [] });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error('Shop my-orders proxy error:', e.message);
    upstreamError(res);
  }
};

// GET /api/shop/paczkomaty?q= — wyszukiwanie paczkomatów InPost
const getPaczkomaty = async (req, res) => {
  try {
    const q = String(req.query.q || '').slice(0, 120);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`${SHOP_BASE}/api/shop/paczkomaty?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      const data = await r.json().catch(() => ({ ok: false, items: [] }));
      res.json(data);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error('Shop paczkomaty proxy error:', e.message);
    upstreamError(res);
  }
};

module.exports = { getCategories, getProducts, getProduct, getCheckoutLink, getCheckoutInfo, createOrder, validateCode, getPaczkomaty, checkDelivery, getMyOrders };
