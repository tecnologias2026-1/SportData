/**
 * ============================================
 * SportData — Products Module (API-driven, sin hardcode)
 * ============================================
 * Obtiene productos REALES scrapeados de MercadoLibre.
 * Sin productos de ejemplo. Sin catálogo estático.
 *
 * Prioridad de fuentes:
 *   1. Backend local  → http://localhost:3000/api/products
 *   2. Netlify deploy → https://sportdata001.netlify.app/api/products
 *   3. Estado vacío con mensaje de error (no hay fallback falso)
 */

(function () {
  'use strict';

  const API_ENDPOINTS = [
    'http://localhost:3000/api/products',
    'https://sportdata001.netlify.app/api/products',
  ];
  const TIMEOUT = 10000;

  let _activeSource = null;
  let _lastLatency  = null;
  let _cache        = null;
  let _cacheTime    = 0;
  const CACHE_TTL   = 3 * 60 * 1000;

  /* ── Fetch con timeout ────────────────── */
  async function fetchJSON(url, timeoutMs = TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ── Detectar mejor endpoint ──────────── */
  async function fetchFromBestEndpoint(path = '') {
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      const url = API_ENDPOINTS[i] + path;
      const t0  = Date.now();
      try {
        const data = await fetchJSON(url, TIMEOUT);
        _activeSource = i === 0 ? 'local' : 'netlify';
        _lastLatency  = Date.now() - t0;
        console.log(`[Products] ✅ Fuente: ${_activeSource} (${_lastLatency}ms)`);
        return data;
      } catch (err) {
        console.warn(`[Products] ⚠ Endpoint ${i + 1} falló: ${err.message}`);
      }
    }
    _activeSource = 'offline';
    _lastLatency  = null;
    return null;
  }

  /* ── Normalizar producto del backend ─── */
  function normalizeProduct(p) {
    if (!p.price && p.bestPrice) p.price = p.bestPrice;
    if (!p.price && p.basePrice) p.price = p.basePrice;
    return p;
  }

  /* ── Filtros en cliente ─────────────── */
  function _applyClientFilters(products, params) {
    let result = [...products];
    if (params.category && params.category !== 'todos') {
      result = result.filter(p => p.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.q) {
      const q = params.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      result = result.filter(p =>
        [p.name, p.brand, p.category, p.description].some(f =>
          f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        )
      );
    }
    if (params.maxPrice) result = result.filter(p => (p.price || 0) <= +params.maxPrice);
    return result;
  }

  /* ── Obtener todos ─────────────────── */
  async function getAll(params = {}) {
    if (_cache && _cache.length > 0 && Date.now() - _cacheTime < CACHE_TTL && !params.q && !params.category) {
      return _applyClientFilters(_cache, params);
    }

    const qs   = new URLSearchParams(params).toString();
    const data = await fetchFromBestEndpoint(qs ? '?' + qs : '');

    if (data) {
      const raw      = Array.isArray(data) ? data : (data.products || []);
      const products = raw.map(normalizeProduct);
      _cache     = products;
      _cacheTime = Date.now();
      return _applyClientFilters(products, params);
    }

    // Backend offline — devolver array vacío (sin datos falsos)
    console.error('[Products] Backend offline. No se pueden mostrar productos.');
    return [];
  }

  /* ── Por ID ─────────────────────────── */
  async function getById(id) {
    if (_cache) {
      const cached = _cache.find(p => p.id === id);
      if (cached) return cached;
    }
    const data = await fetchFromBestEndpoint('/' + id);
    if (data && data.product) return normalizeProduct(data.product);
    return null;
  }

  /* ── Búsqueda ───────────────────────── */
  async function search(q) {
    const data = await fetchFromBestEndpoint('/search?q=' + encodeURIComponent(q));
    if (data && data.products) return data.products.map(normalizeProduct);
    return _applyClientFilters(_cache || [], { q });
  }

  /* ── Por categoría ─────────────────── */
  async function getByCategory(cat) {
    return getAll({ category: cat });
  }

  /* ── Info de fuente ─────────────────── */
  function getSourceInfo() {
    return {
      source:  _activeSource || 'unknown',
      isLive:  _activeSource === 'local' || _activeSource === 'netlify',
      latency: _lastLatency,
    };
  }

  /* ── Invalidar caché ─────────────────── */
  function refreshCache() {
    _cache     = null;
    _cacheTime = 0;
    _activeSource = null;
  }

  /* ── Compatibilidad legacy ───────────── */
  function getProductById(id) {
    return (_cache || []).find(p => p.id === id) || null;
  }
  function getAllProducts() { return _cache || []; }

  /* ── Exponer API global ──────────────── */
  window.SportDataProducts = {
    getAll, getById, search, getByCategory,
    refreshCache, getSourceInfo,
    getProductById, getAllProducts,
    FALLBACK_PRODUCTS: [],  // sin productos hardcoded
  };

  // Compat legacy
  window.getProductById   = getProductById;
  window.getAllProducts    = getAllProducts;
  window.searchProducts   = (q) => _applyClientFilters(getAllProducts(), { q });
  window.filterByCategory = (c) => _applyClientFilters(getAllProducts(), { category: c });
  window.sortProducts     = (arr, by) => {
    const s = [...arr];
    const price = p => p.price ?? p.bestPrice ?? 0;
    if (by === 'price-asc')  s.sort((a, b) => price(a) - price(b));
    if (by === 'price-desc') s.sort((a, b) => price(b) - price(a));
    if (by === 'rating')     s.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (by === 'newest')     s.reverse();
    return s;
  };

})();
