/**
 * ============================================
 * SportData — Cache de Productos
 * ============================================
 * Lee productos desde RapidAPI (vía scraper.js)
 * y los guarda en memoria y disco.
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const scraper = require('./scraper');

const CACHE_FILE       = path.join(__dirname, '..', 'database', 'products_cache.json');
const REFRESH_INTERVAL = 30 * 60 * 1000;  // 30 min
const MAX_CACHE_AGE    = 60 * 60 * 1000;  // 1 hora

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

  const hasKey = !!scraper.getRapidApiKey();
  console.log(`[Cache] 🔄 Refresco (${forceFullScrape ? 'FULL' : 'LIGHT'}) | RapidAPI key: ${hasKey ? '✅ configurada' : '❌ no configurada'}`);

  try {
    let products;

    if (forceFullScrape) {
      products        = await scraper.scrapeAll();
      lastFullRefresh = Date.now();
    } else {
      if (memCache && memCache.length > 0) {
        const minAgo = Math.floor((Date.now() - lastFullRefresh) / 60000) + 1;
        products = memCache.map(p => ({ ...p, updatedAgo: `Hace ${minAgo} min` }));
      } else {
        products        = await scraper.scrapeAll();
        lastFullRefresh = Date.now();
      }
    }

    if (!products || products.length === 0) {
      console.warn('[Cache] ⚠ Scraping vacío — usando fallback.');
      products        = scraper.getBaseProducts();
      lastFullRefresh = Date.now();
    }

    memCache    = products;
    lastRefresh = Date.now();
    writeDiskCache(products);
    console.log(`[Cache] ✅ ${products.length} productos en caché.`);

  } catch (err) {
    console.error('[Cache] ❌ Error:', err.message);

    if (!memCache || memCache.length === 0) {
      const disk = readDiskCache();
      if (disk && disk.products.length > 0) {
        memCache        = disk.products;
        lastRefresh     = new Date(disk.cachedAt).getTime();
        lastFullRefresh = lastRefresh;
        console.log(`[Cache] 💾 Disco: ${disk.products.length} productos.`);
      } else {
        memCache        = scraper.getBaseProducts();
        lastRefresh     = Date.now();
        lastFullRefresh = Date.now();
        console.log('[Cache] ⚠ Usando productos de respaldo.');
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
    console.log(`[Cache] 💾 Caché de disco: ${disk.products.length} productos (${Math.round(diskAge / 60000)} min).`);
    if (diskAge > 5 * 60 * 1000) setTimeout(() => refresh(true), 3000);
  } else {
    await refresh(true);
  }

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const timeSinceFull = Date.now() - lastFullRefresh;
    refresh(timeSinceFull >= MAX_CACHE_AGE);
  }, REFRESH_INTERVAL);
}

/* ── API pública ────────────────────────── */
function getAll()           { return memCache || []; }
function getById(id)        { return (memCache || []).find(p => p.id === id) || null; }
function getByCategory(cat) {
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
    loaded:         !!memCache && memCache.length > 0,
    count:          memCache ? memCache.length : 0,
    lastRefreshAt:  lastRefresh ? new Date(lastRefresh).toISOString() : null,
    ageSeconds:     lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : null,
    isRefreshing,
    source:         'RapidAPI Real-Time Product Search',
    apiKeySet:      !!scraper.getRapidApiKey(),
  };
}
async function forceRefresh(full = true) {
  await refresh(full);
  return getStatus();
}

module.exports = { init, getAll, getById, getByCategory, search, getStatus, forceRefresh };
