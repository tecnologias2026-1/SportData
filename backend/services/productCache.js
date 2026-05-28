/**
 * ============================================
 * SportData — Cache de Productos
 * ============================================
 * Almacena los productos scrapeados en memoria
 * y en disco (JSON). Se refresca automáticamente
 * cada REFRESH_INTERVAL minutos.
 *
 * Uso:
 *   const cache = require('./productCache');
 *   await cache.init();
 *   const products = cache.getAll();
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const scraper = require('./scraper');

/* ── Config ─────────────────────────────── */
const CACHE_FILE       = path.join(__dirname, '..', 'database', 'products_cache.json');
const REFRESH_INTERVAL = 30 * 60 * 1000;   // 30 min en ms
const MAX_CACHE_AGE    = 60 * 60 * 1000;   // 1 hora — cache "fresco"

/* ── Estado interno ─────────────────────── */
let memCache      = null;   // productos en memoria
let lastRefresh   = 0;      // timestamp del último scraping
let lastFullRefresh = 0;    // timestamp del último scraping real (externo)
let refreshTimer  = null;   // setInterval handle
let isRefreshing  = false;  // flag para evitar doble scraping

/* ────────────────────────────────────────────
   LECTURA / ESCRITURA DE CACHÉ EN DISCO
──────────────────────────────────────────── */
function readDiskCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw  = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.products || !Array.isArray(data.products)) return null;
    return data;
  } catch {
    return null;
  }
}

function writeDiskCache(products) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      products,
      cachedAt:  new Date().toISOString(),
      count:     products.length,
    }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Cache] No se pudo escribir en disco:', err.message);
  }
}

/* ────────────────────────────────────────────
   REFRESCO DE PRODUCTOS
──────────────────────────────────────────── */
async function refresh(forceFullScrape = false) {
  if (isRefreshing) return;
  isRefreshing = true;

  console.log(`[Cache] 🔄  Iniciando refresco de productos (${forceFullScrape ? 'FULL' : 'LIGHT'})…`);

  try {
    let products;

    if (forceFullScrape) {
      // Scraping completo (tarda ~15 s por los delays anti-bot)
      products = await scraper.scrapeAll();
      lastFullRefresh = Date.now();
    } else {
      // Refresco rápido: mantenemos los datos de scraping si existen
      if (memCache) {
        products = memCache.map(p => ({
          ...p,
          updatedAgo: `Hace ${Math.floor((Date.now() - lastFullRefresh) / 60000) + 1} min`
        }));
      } else {
        products = scraper.getBaseProducts();
        if (lastFullRefresh === 0) lastFullRefresh = Date.now();
      }
    }

    memCache    = products;
    lastRefresh = Date.now();
    writeDiskCache(products);

    console.log(`[Cache] ✅  ${products.length} productos cargados (${forceFullScrape ? 'scraping' : 'base'}).`);
  } catch (err) {
    console.error('[Cache] ❌  Error en refresco:', err.message);

    // Fallback a disco si hay caché guardada
    if (!memCache) {
      const disk = readDiskCache();
      if (disk) {
        memCache    = disk.products;
        lastRefresh = new Date(disk.cachedAt).getTime();
        lastFullRefresh = lastRefresh;
        console.log('[Cache]    Usando caché de disco como fallback.');
      } else {
        // Último recurso: datos base sin enriquecer
        memCache    = scraper.getBaseProducts();
        lastRefresh = Date.now();
      }
    }
  } finally {
    isRefreshing = false;
  }
}

/* ────────────────────────────────────────────
   INICIALIZACIÓN
──────────────────────────────────────────── */
async function init() {
  // 1. Intentar cargar desde disco para responder de inmediato
  const disk = readDiskCache();
  const diskAge = disk ? Date.now() - new Date(disk.cachedAt).getTime() : Infinity;

  if (disk && diskAge < MAX_CACHE_AGE) {
    memCache    = disk.products;
    lastRefresh = new Date(disk.cachedAt).getTime();
    lastFullRefresh = lastRefresh;
    console.log(`[Cache] 💾  Caché de disco cargada (${disk.products.length} productos, ${Math.round(diskAge / 60000)} min antigüedad).`);
  } else {
    // Carga inicial desde datos base (rápida)
    await refresh(false);
  }

  // 2. Programar refresco periódico inteligente
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    // Si los datos reales son más viejos que MAX_CACHE_AGE, forzamos scraping
    const timeSinceFull = Date.now() - lastFullRefresh;
    const forceFull = timeSinceFull >= MAX_CACHE_AGE;
    refresh(forceFull);
  }, REFRESH_INTERVAL);

  // 3. Si la caché de disco es vieja, lanzar scraping completo en background
  if (diskAge >= MAX_CACHE_AGE) {
    setTimeout(() => refresh(true), 5000);   // 5 s después de iniciar
  }
}

/* ────────────────────────────────────────────
   API PÚBLICA
──────────────────────────────────────────── */
function getAll() {
  return memCache || [];
}

function getById(productId) {
  if (!memCache) return null;
  return memCache.find(p => p.id === productId) || null;
}

function getByCategory(category) {
  if (!memCache) return [];
  if (category === 'todos') return memCache;
  return memCache.filter(p => p.category.toLowerCase() === category.toLowerCase());
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
  const age = lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : null;
  return {
    loaded:        !!memCache,
    count:         memCache ? memCache.length : 0,
    lastRefreshAt: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    ageSeconds:    age,
    isRefreshing,
  };
}

/** Fuerza un refresco manual (con scraping completo opcional) */
async function forceRefresh(full = true) {
  await refresh(full);
  return getStatus();
}

module.exports = {
  init,
  getAll,
  getById,
  getByCategory,
  search,
  getStatus,
  forceRefresh,
};
