// services/productCache.js
// Carga el seed inmediatamente al arrancar.
// Intenta scraping en background — si falla, conserva el seed.
'use strict';

const fs      = require('fs');
const path    = require('path');
const scraper = require('./scraper');

// Seed siempre disponible (incluido en el repo, read-only)
const SEED_FILE = path.join(__dirname, '..', 'database', 'products_cache.json');

// Cache de escritura en /tmp (Render) o database/ (local)
const WRITE_DIR = (() => {
  const local = path.join(__dirname, '..', 'database');
  try { fs.accessSync(local, fs.constants.W_OK); return local; } catch { return '/tmp'; }
})();
const CACHE_FILE = path.join(WRITE_DIR, 'products_cache.json');

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hora

let memCache    = null;
let lastRefresh = 0;
let isRefreshing = false;

// ── Leer cache ────────────────────────────────────────────────────────────────
function readCache() {
  // 1. Intentar cache de runtime (/tmp o database/)
  if (CACHE_FILE !== SEED_FILE) {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        if (data.products?.length > 0) return data;
      }
    } catch {}
  }
  // 2. Seed incluido en el repo
  try {
    const data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    if (data.products?.length > 0) {
      console.log(`[Cache] 📦  Seed cargado: ${data.products.length} productos`);
      return data;
    }
  } catch {}
  return null;
}

function writeCache(products) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      products,
      cachedAt: new Date().toISOString(),
      count: products.length,
    }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Cache] No se pudo escribir cache:', err.message);
  }
}

// ── Scraping en background ────────────────────────────────────────────────────
async function refreshInBackground() {
  if (isRefreshing) return;
  isRefreshing = true;
  console.log('[Cache] 🔄  Iniciando scraping en background...');

  try {
    const products = await scraper.scrapeAll();

    // Solo actualizar si el scraping devolvió productos con precios reales
    const hasRealData = products.some(p =>
      p.storePrices?.some(s => s.url && s.url !== '#')
    );

    if (hasRealData) {
      memCache    = products;
      lastRefresh = Date.now();
      writeCache(products);
      console.log(`[Cache] ✅  Scraping exitoso: ${products.length} productos actualizados.`);
    } else {
      console.log('[Cache] ⚠️  Scraping sin datos reales — conservando cache actual.');
      lastRefresh = Date.now(); // evitar retry inmediato
    }
  } catch (err) {
    console.error('[Cache] ❌  Error en scraping:', err.message);
    lastRefresh = Date.now();
  } finally {
    isRefreshing = false;
  }
}

// ── Inicialización ────────────────────────────────────────────────────────────
function init() {
  const disk = readCache();

  if (disk) {
    memCache    = disk.products;
    lastRefresh = disk.cachedAt ? new Date(disk.cachedAt).getTime() : Date.now();
    console.log(`[Cache] 💾  Cache listo: ${memCache.length} productos.`);
  } else {
    // Sin cache de ningún tipo: usar datos base inmediatamente
    memCache    = scraper.getBaseProducts();
    lastRefresh = Date.now();
    console.log('[Cache] ⚠️  Sin cache en disco. Usando datos base.');
  }

  // Intentar scraping en background después de 10s (no bloquea el arranque)
  setTimeout(() => refreshInBackground(), 10000);

  // Refresco periódico cada hora
  setInterval(() => {
    if (Date.now() - lastRefresh >= REFRESH_INTERVAL) {
      refreshInBackground();
    }
  }, REFRESH_INTERVAL);
}

// ── API pública ───────────────────────────────────────────────────────────────
function getAll() { return memCache || []; }

function getById(id) {
  return (memCache || []).find(p => p.id === id) || null;
}

function getByCategory(category) {
  if (!memCache) return [];
  if (!category || category === 'todos') return memCache;
  return memCache.filter(p => p.category?.toLowerCase() === category.toLowerCase());
}

function search(query) {
  if (!memCache || !query) return memCache || [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return memCache.filter(p =>
    [p.name, p.brand, p.category, p.description].some(f =>
      f?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}

function getStatus() {
  return {
    loaded:        !!memCache,
    count:         memCache?.length || 0,
    lastRefreshAt: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    ageSeconds:    lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : null,
    isRefreshing,
  };
}

async function forceRefresh() {
  await refreshInBackground();
  return getStatus();
}

module.exports = { init, getAll, getById, getByCategory, search, getStatus, forceRefresh };
