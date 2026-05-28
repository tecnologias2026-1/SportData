'use strict';

const fs   = require('fs');
const path = require('path');

const DB_DIR     = path.join(__dirname, '..', 'database');
const SEED_CACHE = path.join(DB_DIR, 'products_cache.json');

let memCache    = null;
let lastRefresh = 0;

function loadFromDisk() {
  try {
    const raw  = fs.readFileSync(SEED_CACHE, 'utf8');
    const data = JSON.parse(raw);
    if (data.products && Array.isArray(data.products)) {
      memCache    = data.products;
      lastRefresh = new Date(data.cachedAt || Date.now()).getTime();
      console.log(`[Cache] 💾  Cargados ${memCache.length} productos desde JSON.`);
    }
  } catch (err) {
    console.warn('[Cache] No se pudo leer products_cache.json:', err.message);
    memCache = [];
  }
}

async function init() {
  loadFromDisk();
}

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
    loaded:        !!memCache,
    count:         memCache ? memCache.length : 0,
    lastRefreshAt: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    isRefreshing:  false,
  };
}
async function forceRefresh() { loadFromDisk(); return getStatus(); }

module.exports = { init, getAll, getById, getByCategory, search, getStatus, forceRefresh };
