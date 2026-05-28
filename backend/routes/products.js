/**
 * ============================================
 * SportData — Products API Route
 * ============================================
 * Endpoints:
 *
 *  GET  /api/products              → todos los productos
 *  GET  /api/products/:id          → un producto por ID
 *  GET  /api/products/search?q=    → búsqueda por texto
 *  GET  /api/products/category/:cat→ filtro por categoría
 *  GET  /api/products/status       → estado de la caché
 *  POST /api/products/refresh      → fuerza refresco (admin)
 */

'use strict';

const express = require('express');
const cache   = require('../services/productCache');

const router = express.Router();

/* ── Helpers ──────────────────────────────── */
function sortProducts(products, sortBy) {
  const arr = [...products];
  switch (sortBy) {
    case 'price-asc':  arr.sort((a, b) => a.price - b.price);   break;
    case 'price-desc': arr.sort((a, b) => b.price - a.price);   break;
    case 'rating':     arr.sort((a, b) => b.rating - a.rating); break;
    case 'newest':     arr.reverse();                            break;
    default: /* relevance — mantener orden original */           break;
  }
  return arr;
}

function filterProducts(products, { category, brand, store, maxPrice }) {
  return products.filter(p => {
    if (category && category !== 'todos' && p.category.toLowerCase() !== category.toLowerCase()) return false;
    if (brand    && brand    !== 'todas' && p.brand.toLowerCase()    !== brand.toLowerCase())    return false;
    if (maxPrice && p.price > parseFloat(maxPrice))                                               return false;
    if (store    && store    !== 'todas') {
      const bestStore = p.storePrices && p.storePrices[0];
      if (!bestStore || bestStore.storeName.toLowerCase() !== store.toLowerCase()) return false;
    }
    return true;
  });
}

/* ─────────────────────────────────────────────
   GET /api/products/status
   Estado del sistema de caché
───────────────────────────────────────────── */
router.get('/status', (req, res) => {
  res.json({ ok: true, ...cache.getStatus() });
});

/* ─────────────────────────────────────────────
   POST /api/products/refresh
   Fuerza un refresco completo (scraping)
───────────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const status = await cache.forceRefresh(true);
    res.json({ ok: true, message: 'Refresco completado.', ...status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/products/search?q=texto&sort=price-asc
───────────────────────────────────────────── */
router.get('/search', (req, res) => {
  const { q = '', sort = 'relevance', maxPrice } = req.query;

  let results = cache.search(q);

  if (maxPrice) {
    results = results.filter(p => p.price <= parseFloat(maxPrice));
  }

  results = sortProducts(results, sort);

  res.json({
    ok: true,
    query: q,
    count: results.length,
    products: results,
  });
});

/* ─────────────────────────────────────────────
   GET /api/products/category/:cat
───────────────────────────────────────────── */
router.get('/category/:cat', (req, res) => {
  const { cat } = req.params;
  const { sort = 'relevance', maxPrice } = req.query;

  let results = cache.getByCategory(cat);

  if (maxPrice) results = results.filter(p => p.price <= parseFloat(maxPrice));
  results = sortProducts(results, sort);

  res.json({
    ok: true,
    category: cat,
    count: results.length,
    products: results,
  });
});

/* ─────────────────────────────────────────────
   GET /api/products/:id
   Producto específico + scraping en tiempo real
───────────────────────────────────────────── */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const product = cache.getById(id);

  if (!product) {
    return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
  }

  res.json({ ok: true, product });
});

/* ─────────────────────────────────────────────
   GET /api/products
   Listado completo con filtros y ordenamiento
───────────────────────────────────────────── */
router.get('/', (req, res) => {
  const {
    sort     = 'relevance',
    category,
    brand,
    store,
    maxPrice,
    q,
  } = req.query;

  let products = q ? cache.search(q) : cache.getAll();

  products = filterProducts(products, { category, brand, store, maxPrice });
  products = sortProducts(products, sort);

  res.json({
    ok:      true,
    count:   products.length,
    total:   cache.getAll().length,
    filters: { sort, category, brand, store, maxPrice, q },
    products,
  });
});

module.exports = router;
