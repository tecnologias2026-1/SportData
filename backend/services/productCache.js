/**
 * ============================================
 * SportData — Cache de Productos
 * ============================================
 * Almacena los productos scrapeados en memoria
 * y en disco (JSON). Se refresca automáticamente.
 *
 * CAMBIOS v3:
 *  - Sin productos hardcoded de ejemplo
 *  - Primer arranque siempre hace scraping real de ML
 *  - Variable de entorno ML_TOTAL controla cuántos productos traer
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const scraper = require('./scraper');

/* ── Config ─────────────────────────────── */
const CACHE_FILE       = path.join(__dirname, '..', 'database', 'products_cache.json');
const REFRESH_INTERVAL = 30 * 60 * 1000;   // 30 min
const MAX_CACHE_AGE    = 60 * 60 * 1000;   // 1 hora

/* ── Estado interno ─────────────────────── */
let memCache        = null;
let lastRefresh     = 0;
let lastFullRefresh = 0;
let refreshTimer    = null;
let isRefreshing    = false;

/* ── Disco ──────────────────────────────── */
function readDiskCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) return null;
    return data;
  } catch { return null; }
}

function writeDiskCache(products) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      products,
      cachedAt: new Date().toISOString(),
      count:    products.length,
    }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Cache] No se pudo escribir en disco:', err.message);
  }
}

/* ── Refresco ───────────────────────────── */
async function refresh(forceFullScrape = false) {
  if (isRefreshing) return;
  isRefreshing = true;

  console.log(`[Cache] 🔄 Iniciando refresco (${forceFullScrape ? 'FULL SCRAPE ML' : 'LIGHT'})…`);

  try {
    let products;

    if (forceFullScrape) {
      // Scraping real de MercadoLibre
      products        = await scraper.scrapeAll();
      lastFullRefresh = Date.now();
    } else {
      // Refresco ligero: actualiza timestamps sin volver a ML
      if (memCache && memCache.length > 0) {
        const minAgo = Math.floor((Date.now() - lastFullRefresh) / 60000) + 1;
        products = memCache.map(p => ({ ...p, updatedAgo: `Hace ${minAgo} min` }));
      } else {
        // Primera vez sin caché en memoria → hacer scraping real
        products        = await scraper.scrapeAll();
        lastFullRefresh = Date.now();
      }
    }

    // Rechazar cachés vacías
    if (!products || products.length === 0) {
      console.warn('[Cache] ⚠ Scraping devolvió 0 productos, usando fallback.');
      products        = scraper.getBaseProducts();
      lastFullRefresh = Date.now();
    }

    memCache    = products;
    lastRefresh = Date.now();
    writeDiskCache(products);
    console.log(`[Cache] ✅ ${products.length} productos en caché.`);

  } catch (err) {
    console.error('[Cache] ❌ Error en refresco:', err.message);

    if (!memCache || memCache.length === 0) {
      // Intentar disco
      const disk = readDiskCache();
      if (disk && disk.products.length > 0) {
        memCache    = disk.products;
        lastRefresh = new Date(disk.cachedAt).getTime();
        lastFullRefresh = lastRefresh;
        console.log(`[Cache] 💾 Usando ${disk.products.length} productos del disco como fallback.`);
      } else {
        // Último recurso
        memCache        = scraper.getBaseProducts();
        lastRefresh     = Date.now();
        lastFullRefresh = Date.now();
        console.log('[Cache] ⚠ Usando productos fallback mínimos.');
      }
    }
  } finally {
    isRefreshing = false;
  }
}

/* ── Init ───────────────────────────────── */
async function init() {
  const disk    = readDiskCache();
  const diskAge = disk ? Date.now() - new Date(disk.cachedAt).getTime() : Infinity;

  if (disk && disk.products.length > 0 && diskAge < MAX_CACHE_AGE) {
    memCache        = disk.products;
    lastRefresh     = new Date(disk.cachedAt).getTime();
    lastFullRefresh = lastRefresh;
    console.log(`[Cache] 💾 Caché de disco cargada: ${disk.products.length} productos de ML (${Math.round(diskAge / 60000)} min).`);

    // Refrescar en background si tiene más de 5 minutos
    if (diskAge > 5 * 60 * 1000) {
      setTimeout(() => refresh(true), 3000);
    }
  } else {
    // Sin caché válida → hacer scraping inicial
    console.log('[Cache] 🌐 Sin caché válida. Iniciando scraping de MercadoLibre…');
    await refresh(true);
  }

  // Timer de refresco periódico
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const timeSinceFull = Date.now() - lastFullRefresh;
    refresh(timeSinceFull >= MAX_CACHE_AGE);
  }, REFRESH_INTERVAL);
}

/* ── API ────────────────────────────────── */
function getAll()              { return memCache || []; }
function getById(id)           { return (memCache || []).find(p => p.id === id) || null; }
function getByCategory(cat)    {
  if (!memCache) return [];
  if (cat === 'todos') return memCache;
  return memCache.filter(p => p.category.toLowerCase() === cat.toLowerCase());
}
function search(query) {
  if (!memCache || !query) return memCache || [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return memCache.filter(p =>
    [p.name, p.brand, p.category, p.description].some(f =>
      f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}
function getStatus() {
  return {
    loaded:        !!memCache && memCache.length > 0,
    count:         memCache ? memCache.length : 0,
    lastRefreshAt: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    ageSeconds:    lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : null,
    isRefreshing,
    source:        'MercadoLibre',
  };
}
async function forceRefresh(full = true) {
  await refresh(full);
  return getStatus();
}

module.exports = { init, getAll, getById, getByCategory, search, getStatus, forceRefresh };
