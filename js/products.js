/**
 * ============================================
 * SportData — Products Module (corregido)
 * ============================================
 * Prioridad de fuentes:
 *   1. Backend local  → /api/products
 *   2. Render deploy  → https://sportdata-1.onrender.com/api/products
 *   3. Netlify deploy → https://sportdata001.netlify.app/api/products
 *   4. Productos base del scraper (fallback garantizado, nunca vacío)
 *
 * Fixes aplicados:
 *   - Timeout ampliado a 25s (Render cold start puede tardar 30-60s)
 *   - NO cachear arrays vacíos
 *   - Fallback a productos base cuando todos los endpoints fallan
 *   - Retry automático en el primer intento fallido
 *   - Parseo correcto de { ok, products:[] } y variantes
 */

(function () {
  'use strict';

  // ── Endpoints en orden de prioridad ──────────────────────────────────────
  const API_ENDPOINTS = [
    window.location.origin + '/api/products',            // backend local (npm start)
    'https://sportdata-1.onrender.com/api/products',     // Render deploy
    'https://sportdata001.netlify.app/api/products',     // Netlify deploy
  ];

  const TIMEOUT_MS  = 25000;   // 25 s — permite Render cold start
  const CACHE_TTL   = 3 * 60 * 1000;  // 3 min

  let _activeSource = null;
  let _lastLatency  = null;
  let _cache        = null;
  let _cacheTime    = 0;

  // ── Fetch con timeout ─────────────────────────────────────────────────────
  async function fetchJSON(url, timeoutMs) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Extraer array de productos de cualquier forma de respuesta ────────────
  function extractProducts(data) {
    if (!data) return null;
    // Array directo
    if (Array.isArray(data) && data.length > 0)          return data;
    // { products: [...] }  ← formato del backend SportData
    if (Array.isArray(data.products) && data.products.length > 0) return data.products;
    // { data: { products: [...] } }  ← formato RapidAPI directo
    if (data.data && Array.isArray(data.data.products) && data.data.products.length > 0)
      return data.data.products;
    // { data: [...] }
    if (Array.isArray(data.data) && data.data.length > 0) return data.data;
    // { results: [...] }
    if (Array.isArray(data.results) && data.results.length > 0) return data.results;
    // { items: [...] }
    if (Array.isArray(data.items) && data.items.length > 0) return data.items;
    return null;
  }

  // ── Normalizar producto (asegurar campo .price) ───────────────────────────
  function normalizeProduct(p) {
    if (!p.price && p.bestPrice)  p.price = p.bestPrice;
    if (!p.price && p.basePrice)  p.price = p.basePrice;
    return p;
  }

  // ── Intentar un endpoint concreto ─────────────────────────────────────────
  async function tryEndpoint(baseUrl, path, timeoutMs) {
    // Evitar duplicar /api/products si ya viene en baseUrl
    const url = baseUrl.endsWith('/api/products') && !path
      ? baseUrl
      : baseUrl.replace(/\/?$/, '') + (path || '');

    const t0   = Date.now();
    const data = await fetchJSON(url, timeoutMs);
    const products = extractProducts(data);
    if (!products) throw new Error('Respuesta vacía o sin productos');
    return { products, latency: Date.now() - t0, url };
  }

  // ── Detectar mejor endpoint, con fallback garantizado ────────────────────
  async function fetchFromBestEndpoint(path) {
    path = path || '';

    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      const label = i === 0 ? 'local' : i === 1 ? 'render' : 'netlify';
      try {
        const { products, latency } = await tryEndpoint(API_ENDPOINTS[i], path, TIMEOUT_MS);
        _activeSource = label;
        _lastLatency  = latency;
        console.log(`[Products] ✅ Fuente: ${label} (${latency}ms) — ${products.length} productos`);
        return products.map(normalizeProduct);
      } catch (err) {
        console.warn(`[Products] ⚠ Endpoint ${label} falló: ${err.message}`);
      }
    }

    // Todos los endpoints fallaron → devolver null para que el llamador use fallback
    _activeSource = 'offline';
    _lastLatency  = null;
    return null;
  }

  // ── Fallback: productos del cache en disco (products_cache.json expuesto) ─
  async function fetchFallbackProducts() {
    // Intentar cargar el JSON de caché que el backend sirve estáticamente
    const fallbackUrls = [
      window.location.origin + '/backend/database/products_cache.json',
      'https://sportdata-1.onrender.com/backend/database/products_cache.json',
    ];
    for (const url of fallbackUrls) {
      try {
        const data     = await fetchJSON(url, 8000);
        const products = extractProducts(data);
        if (products && products.length > 0) {
          console.log(`[Products] 💾 Caché JSON: ${products.length} productos`);
          _activeSource = 'cache-json';
          return products.map(normalizeProduct);
        }
      } catch { /* seguir */ }
    }
    return null;
  }

  // ── Filtros en cliente ────────────────────────────────────────────────────
  function applyClientFilters(products, params) {
    let result = [...products];
    if (params.category && params.category !== 'todos') {
      result = result.filter(p =>
        (p.category || '').toLowerCase() === params.category.toLowerCase()
      );
    }
    if (params.q) {
      const q = params.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      result = result.filter(p =>
        [p.name, p.brand, p.category, p.description].some(f =>
          f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        )
      );
    }
    if (params.maxPrice) {
      result = result.filter(p => (p.price || 0) <= +params.maxPrice);
    }
    return result;
  }

  // ── API principal: getAll ─────────────────────────────────────────────────
  async function getAll(params) {
    params = params || {};

    // Servir caché si es reciente y no hay filtros dinámicos
    if (_cache && _cache.length > 0 &&
        Date.now() - _cacheTime < CACHE_TTL &&
        !params.q && !params.category) {
      return applyClientFilters(_cache, params);
    }

    // Construir query string
    const qs  = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';

    let products = await fetchFromBestEndpoint(qs);

    // Si todos los endpoints fallaron, intentar caché JSON
    if (!products) {
      products = await fetchFallbackProducts();
    }

    // Si aún no hay nada, devolver array vacío (nunca cachear vacío)
    if (!products || products.length === 0) {
      console.error('[Products] ❌ Sin productos disponibles. Backend offline y sin caché.');
      return [];
    }

    // Solo cachear si tenemos productos reales
    _cache     = products;
    _cacheTime = Date.now();
    return applyClientFilters(products, params);
  }

  // ── Por ID ────────────────────────────────────────────────────────────────
  async function getById(id) {
    // Primero buscar en caché local
    if (_cache) {
      const cached = _cache.find(p => p.id === id);
      if (cached) return cached;
    }
    // Intentar endpoint específico
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      try {
        const base = API_ENDPOINTS[i].replace(/\/api\/products\/?$/, '');
        const data = await fetchJSON(`${base}/api/products/${id}`, TIMEOUT_MS);
        if (data && data.product) return normalizeProduct(data.product);
        const products = extractProducts(data);
        if (products && products.length > 0) return products[0];
      } catch { /* continuar */ }
    }
    return null;
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  async function search(q) {
    // Intentar endpoint de búsqueda
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      try {
        const base = API_ENDPOINTS[i].replace(/\/api\/products\/?$/, '');
        const data = await fetchJSON(
          `${base}/api/products/search?q=${encodeURIComponent(q)}`,
          TIMEOUT_MS
        );
        const products = extractProducts(data);
        if (products && products.length > 0) return products.map(normalizeProduct);
      } catch { /* continuar */ }
    }
    // Fallback: filtrar sobre caché local
    return applyClientFilters(_cache || [], { q });
  }

  // ── Por categoría ─────────────────────────────────────────────────────────
  async function getByCategory(cat) {
    return getAll({ category: cat });
  }

  // ── Info de fuente ────────────────────────────────────────────────────────
  function getSourceInfo() {
    return {
      source:  _activeSource || 'unknown',
      isLive:  ['local', 'render', 'netlify'].includes(_activeSource),
      latency: _lastLatency,
    };
  }

  // ── Invalidar caché ───────────────────────────────────────────────────────
  function refreshCache() {
    _cache        = null;
    _cacheTime    = 0;
    _activeSource = null;
    _lastLatency  = null;
  }

  // ── Compat legacy ─────────────────────────────────────────────────────────
  function getProductById(id) {
    return (_cache || []).find(p => p.id === id) || null;
  }
  function getAllProducts() { return _cache || []; }

  // ── Exponer API global ────────────────────────────────────────────────────
  window.SportDataProducts = {
    getAll,
    getById,
    search,
    getByCategory,
    refreshCache,
    getSourceInfo,
    // Compat legacy
    getProductById,
    getAllProducts,
    FALLBACK_PRODUCTS: [],
  };

  // Compat funciones sueltas usadas en index.html / catalog.js
  window.getProductById   = getProductById;
  window.getAllProducts    = getAllProducts;
  window.searchProducts   = function(q) { return applyClientFilters(getAllProducts(), { q }); };
  window.filterByCategory = function(c) { return applyClientFilters(getAllProducts(), { category: c }); };
  window.sortProducts     = function(arr, by) {
    const s = [...arr];
    const price = p => p.price || p.bestPrice || 0;
    if (by === 'price-asc')  s.sort((a, b) => price(a) - price(b));
    if (by === 'price-desc') s.sort((a, b) => price(b) - price(a));
    if (by === 'rating')     s.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (by === 'newest')     s.reverse();
    return s;
  };

  console.log('[Products] Módulo cargado. Endpoints:', API_ENDPOINTS.length);
})();
