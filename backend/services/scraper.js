/**
 * ============================================
 * SportData — Scraper vía API pública de MercadoLibre
 * ============================================
 * Busca productos REALES de la sección Deportes
 * de MercadoLibre y los mapea al formato de la app.
 *
 * Site por defecto: MLA (Argentina)
 * Categoría Deportes: MLA1276
 *
 * Cambios respecto a la versión anterior:
 *  - Sin catálogo hardcoded de ejemplo
 *  - Pagina la API (offset/limit) para traer N productos
 *  - Genera imágenes, specs, tallas, colores y precios
 *    por tienda a partir de cada ítem real de ML
 *  - productCache.js sigue funcionando sin cambios
 */

'use strict';

const axios = require('axios');

/* ──────────────────────────────────────────
   CONFIGURACIÓN
────────────────────────────────────────── */
const ML_SITE          = process.env.ML_SITE    || 'MLA';
const ML_SPORT_CAT     = process.env.ML_SPORT_CAT || 'MLA1276'; // Deportes y Fitness
const ML_BASE          = 'https://api.mercadolibre.com';
const TOTAL_PRODUCTS   = parseInt(process.env.ML_TOTAL || '20', 10); // productos a traer
const RESULTS_PER_PAGE = 10;    // max por llamada a la API
const REQUEST_DELAY    = 500;   // ms entre llamadas (respeto de rate-limit)
const TIMEOUT_MS       = 12_000;

/* Tipos de cambio ARS → USD (aproximado) */
const FX = { MLA: 0.00105, MLM: 0.058, MLC: 0.0011, MCO: 0.00025, MLB: 0.20 };
function toUSD(price, site = ML_SITE) {
  const rate = FX[site] || 0.001;
  return Math.round(price * rate * 100) / 100;
}

/* ──────────────────────────────────────────
   TIENDAS INTERNAS (precios comparativos)
────────────────────────────────────────── */
const STORES = [
  { name: 'Amazon Sports', bias: -0.10, shipping: 'Gratis', traffic: '2.4B/mes', rating: 4.7, badge: 'AMZ',  color: '#ff9900' },
  { name: 'Decathlon',     bias: -0.05, shipping: '$4.99',  traffic: '90M/mes',  rating: 4.5, badge: 'DEC',  color: '#0082c8' },
  { name: 'SportZone',     bias:  0.00, shipping: 'Gratis', traffic: '45M/mes',  rating: 4.4, badge: 'SPZ',  color: '#e04d4d' },
  { name: 'FitnessOutlet', bias:  0.05, shipping: '$6.99',  traffic: '28M/mes',  rating: 4.3, badge: 'FIT',  color: '#1a1a2e' },
  { name: 'Reebok Store',  bias:  0.08, shipping: 'Gratis', traffic: '35M/mes',  rating: 4.2, badge: 'RBK',  color: '#2d2d2d' },
  { name: 'Nike Official', bias:  0.15, shipping: 'Gratis', traffic: '180M/mes', rating: 4.8, badge: 'NIKE', color: '#cc0000' },
  { name: 'MercadoSports', bias:  0.18, shipping: '$9.99',  traffic: '20M/mes',  rating: 4.0, badge: 'MKT',  color: '#666666' },
  { name: 'RunnerWorld',   bias:  0.22, shipping: '$7.50',  traffic: '12M/mes',  rating: 4.1, badge: 'RUN',  color: '#8B4513' },
];

/* ──────────────────────────────────────────
   MAPEO DE CATEGORÍAS ML → categorías internas
────────────────────────────────────────── */
const CAT_MAP = {
  'MLA1276': 'fitness',    // Deportes y Fitness (raíz)
  'MLA3281': 'calzado',    // Calzado deportivo
  'MLA109238': 'ropa',     // Ropa deportiva
  'MLA1234': 'balones',    // Pelotas / balones
  'MLA1284': 'gimnasio',   // Equipamiento de gimnasio
  'MLA1289': 'natacion',   // Natación
  'MLA1282': 'ciclismo',   // Ciclismo
  'MLA1279': 'raquetas',   // Tenis / Raquetas
};

function guessCategory(item) {
  if (!item) return 'fitness';
  const catId = item.category_id || '';
  if (CAT_MAP[catId]) return CAT_MAP[catId];

  const title = (item.title || '').toLowerCase();
  if (/zapatill|calzado|bota|bot[ií]n|sneaker|tenis/.test(title))  return 'calzado';
  if (/camiset|buzo|remera|short|ropa|camisa|polo/.test(title))    return 'ropa';
  if (/pelota|bal[oó]n|futbol|f[úu]tbol|basket|voley/.test(title)) return 'balones';
  if (/pesas|mancuerna|barra|kettlebell|gym|peso/.test(title))     return 'gimnasio';
  if (/nataci[oó]n|gafa|pileta|swimming/.test(title))              return 'natacion';
  if (/biciclet|ciclism|casco|rodado/.test(title))                 return 'ciclismo';
  if (/tenis|raqueta|p[aá]del|badminton/.test(title))              return 'raquetas';
  if (/yoga|esterilla|mat|pilates/.test(title))                    return 'fitness';
  return 'fitness';
}

function guessBrand(item) {
  if (!item) return 'Genérico';
  const title = (item.title || '').toLowerCase();
  const brands = ['nike', 'adidas', 'puma', 'reebok', 'under armour', 'fila', 'new balance',
                   'wilson', 'spalding', 'molten', 'hummel', 'speedo', 'arena', 'mizuno',
                   'asics', 'saucony', 'columbia', 'salomon', 'Brooks', 'decathlon', 'topper'];
  for (const b of brands) {
    if (title.includes(b)) return b.charAt(0).toUpperCase() + b.slice(1);
  }
  // Intentar desde atributos del item
  if (item.attributes) {
    const brandAttr = item.attributes.find(a => a.id === 'BRAND');
    if (brandAttr && brandAttr.value_name) return brandAttr.value_name;
  }
  return 'Genérico';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ──────────────────────────────────────────
   UPGRADER DE IMAGEN ML
────────────────────────────────────────── */
function upgradeMLImage(thumbnail) {
  if (!thumbnail) return null;
  return thumbnail
    .replace(/-[A-Z]\.jpg$/, '-W.jpg')
    .replace('-O.jpg', '-W.jpg');
}

/* ──────────────────────────────────────────
   GENERAR ID ÚNICO INTERNO
────────────────────────────────────────── */
function makeId(item, index) {
  const safe = (item.title || 'PROD')
    .slice(0, 10)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return `ML-${safe}-${index + 1}`.slice(0, 20);
}

/* ──────────────────────────────────────────
   GENERAR SPECS A PARTIR DEL ITEM ML
────────────────────────────────────────── */
function buildSpecs(item) {
  const specs = {};
  if (!item.attributes) return specs;
  const WANTED = ['BRAND','GENDER','COLOR','SIZE','MATERIAL','MODEL',
                  'ITEM_CONDITION','WITH_INITIAL_QUANTITY','WEIGHT'];
  for (const attr of item.attributes) {
    if (WANTED.includes(attr.id) && attr.value_name) {
      const key = attr.name.toLowerCase().replace(/\s+/g, '_');
      specs[key] = attr.value_name;
    }
  }
  return specs;
}

/* ──────────────────────────────────────────
   GENERAR COLORES / TALLAS APROXIMADOS
────────────────────────────────────────── */
const COLOR_POOL = [
  { name: 'Negro',   hex: '#000000' },
  { name: 'Blanco',  hex: '#FFFFFF' },
  { name: 'Azul',    hex: '#3B82F6' },
  { name: 'Rojo',    hex: '#EF4444' },
  { name: 'Naranja', hex: '#F59E0B' },
  { name: 'Verde',   hex: '#10B981' },
  { name: 'Gris',    hex: '#808080' },
];
const SIZE_POOLS = {
  calzado: ['36','37','38','39','40','41','42','43','44','45'],
  ropa:    ['XS','S','M','L','XL','XXL'],
  default: ['Única'],
};

function buildColors(item) {
  if (item.attributes) {
    const colorAttr = item.attributes.find(a => a.id === 'COLOR');
    if (colorAttr && colorAttr.value_name) {
      const name = colorAttr.value_name;
      const found = COLOR_POOL.find(c => name.toLowerCase().includes(c.name.toLowerCase()));
      return [found || { name, hex: '#888888' }];
    }
  }
  // Random 2-3 colores del pool
  const n = Math.floor(Math.random() * 2) + 2;
  return COLOR_POOL.slice(0, n);
}

function buildSizes(category) {
  return SIZE_POOLS[category] || SIZE_POOLS.default;
}

/* ──────────────────────────────────────────
   GENERAR PRECIOS POR TIENDA
────────────────────────────────────────── */
function generateStorePrices(mlPriceUSD, mlItem) {
  const anchor = mlPriceUSD;

  // MercadoLibre real como primera tienda
  const mlStore = {
    storeName:    'MercadoLibre',
    storeColor:   '#FFE600',
    storeBadge:   'ML',
    storeTraffic: '500M/mes',
    storeRating:  mlItem.reviews?.rating_average ?? 4.0,
    price:        mlPriceUSD,
    shipping:     mlItem.shipping?.free_shipping ? 'Gratis' : 'Ver en tienda',
    delivery:     'Según vendedor',
    stock:        mlItem.available_quantity > 0 ? 'En Stock' : 'Sin stock',
    stockQty:     mlItem.available_quantity ?? 0,
    stockPill:    mlItem.available_quantity > 0
                    ? (mlItem.available_quantity < 5 ? 'low' : 'ok')
                    : 'out',
    lastUpdate:   'En vivo',
    url:          mlItem.permalink || '#',
  };

  const simulated = STORES.map((store, idx) => {
    const jitter = (Math.random() - 0.5) * anchor * 0.03;
    const price  = Math.max(0.5, parseFloat((anchor * (1 + store.bias) + jitter).toFixed(2)));
    const isLast = idx === STORES.length - 1;
    const isLow  = idx % 4 === 3 && idx > 2;
    const stockPill  = isLast ? 'out' : isLow ? 'low' : 'ok';
    const stockQty   = stockPill === 'out' ? 0 : stockPill === 'low'
                        ? Math.floor(Math.random() * 6) + 1
                        : Math.floor(Math.random() * 80) + 10;
    const d1 = Math.floor(Math.random() * 3) + 1;
    return {
      storeName:    store.name,
      storeColor:   store.color,
      storeBadge:   store.badge,
      storeTraffic: store.traffic,
      storeRating:  store.rating,
      price,
      shipping:     store.shipping,
      delivery:     `${d1}–${d1 + Math.floor(Math.random() * 3) + 1} días hábiles`,
      stock:        stockPill === 'out' ? 'Sin stock' : stockPill === 'low' ? 'Pocas unidades' : 'En Stock',
      stockQty,
      stockPill,
      lastUpdate:   `Hace ${Math.floor(Math.random() * 55) + 5} min`,
      url:          '#',
    };
  });

  return [mlStore, ...simulated].sort((a, b) => a.price - b.price);
}

/* ──────────────────────────────────────────
   HISTORIAL DE PRECIOS
────────────────────────────────────────── */
function generatePriceHistory(anchor) {
  const series = (base, v) => {
    let x = base;
    return Array.from({ length: 30 }, () => {
      x += (Math.random() - 0.5) * v;
      x  = Math.max(base * 0.85, Math.min(base * 1.20, x));
      return parseFloat(x.toFixed(2));
    });
  };
  const labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  });
  return {
    labels,
    amazon:    series(anchor * 0.90, anchor * 0.025),
    decathlon: series(anchor * 0.95, anchor * 0.018),
    official:  series(anchor * 1.10, anchor * 0.012),
  };
}

/* ──────────────────────────────────────────
   BÚSQUEDA PAGINADA EN ML (categoría deporte)
────────────────────────────────────────── */
async function fetchMLSportProducts(total = TOTAL_PRODUCTS) {
  const items = [];
  let offset  = 0;

  while (items.length < total) {
    const limit = Math.min(RESULTS_PER_PAGE, total - items.length);
    const url   = `${ML_BASE}/sites/${ML_SITE}/search?category=${ML_SPORT_CAT}&limit=${limit}&offset=${offset}&condition=new&sort=relevance`;

    try {
      console.log(`[ML] Página offset=${offset} limit=${limit}…`);
      const { data } = await axios.get(url, { timeout: TIMEOUT_MS });
      const results  = data.results || [];
      if (!results.length) break;

      items.push(...results);
      offset += results.length;

      // Si ML no tiene más resultados
      if (results.length < limit) break;
      await sleep(REQUEST_DELAY);
    } catch (err) {
      console.warn(`[ML] Error en paginación offset=${offset}: ${err.message}`);
      break;
    }
  }

  console.log(`[ML] Total ítems obtenidos: ${items.length}`);
  return items.slice(0, total);
}

/* ──────────────────────────────────────────
   DETALLE DE ÍTEM (imagen HD)
────────────────────────────────────────── */
async function fetchMLItemDetail(itemId) {
  try {
    const { data } = await axios.get(`${ML_BASE}/items/${itemId}`, { timeout: TIMEOUT_MS });
    return data;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────
   CONVERTIR ÍTEM ML → PRODUCTO SPORTDATA
────────────────────────────────────────── */
async function mlItemToProduct(mlItem, index) {
  // Detalle completo (imagen HD, atributos, specs)
  let detail = null;
  try {
    detail = await fetchMLItemDetail(mlItem.id);
    await sleep(REQUEST_DELAY / 2);
  } catch { /* fallback al item de búsqueda */ }

  const item     = detail || mlItem;
  const category = guessCategory(item);
  const brand    = guessBrand(item);
  const priceUSD = toUSD(mlItem.price);

  // Imagen: preferir imagen HD del detalle, luego thumbnail de búsqueda
  let image = mlItem.thumbnail ? upgradeMLImage(mlItem.thumbnail) : null;
  if (item.pictures && item.pictures.length > 0) {
    image = item.pictures[0].url || image;
  }

  // Precios por tienda
  const storePrices   = generateStorePrices(priceUSD, mlItem);
  const inStock       = storePrices.filter(s => s.stockPill !== 'out');
  const bestPrice     = storePrices[0].price;
  const worstPrice    = storePrices[storePrices.length - 1].price;
  const avgPrice      = parseFloat((inStock.reduce((s, p) => s + p.price, 0) / (inStock.length || 1)).toFixed(2));
  const savings       = parseFloat((worstPrice - bestPrice).toFixed(2));
  const rating        = parseFloat((3.8 + Math.random() * 1.1).toFixed(1));
  const reviews       = Math.floor(Math.random() * 200) + 20;

  return {
    id:           makeId(mlItem, index),
    name:         mlItem.title,
    brand,
    category,
    basePrice:    priceUSD,
    image:        image || `../assets/img/main_produc_zapatillas.jpg`,
    description:  `${mlItem.title}. Producto deportivo de calidad disponible en MercadoLibre y múltiples tiendas. Condición: ${mlItem.condition === 'new' ? 'Nuevo' : 'Usado'}.`,
    specs:        buildSpecs(item),
    sizes:        buildSizes(category),
    colors:       buildColors(item),
    rating,
    reviews,
    storePrices,
    bestPrice,
    worstPrice,
    avgPrice,
    savings,
    storesTotal:   storePrices.length,
    storesInStock: inStock.length,
    priceHistory:  generatePriceHistory(bestPrice),
    updatedAgo:    'En vivo',
    scrapedAt:     new Date().toISOString(),
    price:         bestPrice,
    mlResultsCount: 1,
    mlId:          mlItem.id,
    mlUrl:         mlItem.permalink,
  };
}

/* ──────────────────────────────────────────
   API PÚBLICA — igual contrato que antes
────────────────────────────────────────── */

/**
 * Scraping completo: trae N productos deportivos de ML
 * y los convierte al formato SportData.
 */
async function scrapeAll() {
  console.log(`[Scraper] 🔍 Buscando ${TOTAL_PRODUCTS} productos en Deportes ML ${ML_SITE}…`);
  const mlItems = await fetchMLSportProducts(TOTAL_PRODUCTS);

  if (!mlItems.length) {
    console.warn('[Scraper] ⚠ ML no devolvió resultados, usando productos base.');
    return getBaseProducts();
  }

  const products = [];
  for (let i = 0; i < mlItems.length; i++) {
    try {
      const p = await mlItemToProduct(mlItems[i], i);
      products.push(p);
      console.log(`[Scraper] ✅ [${i + 1}/${mlItems.length}] ${p.id} — ${p.name.slice(0, 50)}`);
    } catch (err) {
      console.error(`[Scraper] ❌ Error en ítem ${i}: ${err.message}`);
    }
    await sleep(REQUEST_DELAY);
  }

  console.log(`[Scraper] ✅ Scraping completo: ${products.length} productos.`);
  return products;
}

/**
 * Datos base de fallback — si ML no responde,
 * devuelve 5 productos mínimos sin imagen real.
 */
function getBaseProducts() {
  return Array.from({ length: 5 }, (_, i) => {
    const anchor = 20 + i * 10;
    const storePrices   = STORES.map((s, idx) => ({
      storeName: s.name, storeColor: s.color, storeBadge: s.badge,
      storeTraffic: s.traffic, storeRating: s.rating,
      price: parseFloat((anchor * (1 + s.bias)).toFixed(2)),
      shipping: s.shipping, delivery: '3–5 días hábiles',
      stock: idx === STORES.length - 1 ? 'Sin stock' : 'En Stock',
      stockQty: idx === STORES.length - 1 ? 0 : 30,
      stockPill: idx === STORES.length - 1 ? 'out' : 'ok',
      lastUpdate: 'Hace 5 min', url: '#',
    })).sort((a, b) => a.price - b.price);
    const inStock = storePrices.filter(s => s.stockPill !== 'out');
    return {
      id: `FB-SPORT-${i + 1}`,
      name: `Artículo Deportivo ${i + 1}`,
      brand: 'Genérico', category: 'fitness', basePrice: anchor,
      image: '../assets/img/main_produc_zapatillas.jpg',
      description: 'Producto deportivo de alta calidad.',
      specs: {}, sizes: ['Única'], colors: [{ name: 'Negro', hex: '#000000' }],
      rating: 4.0, reviews: 50,
      storePrices, bestPrice: storePrices[0].price,
      worstPrice: storePrices[storePrices.length - 1].price,
      avgPrice: anchor, savings: parseFloat((anchor * 0.30).toFixed(2)),
      storesTotal: STORES.length, storesInStock: inStock.length,
      priceHistory: generatePriceHistory(anchor),
      updatedAgo: 'Hace 5 min', scrapedAt: new Date().toISOString(),
      price: storePrices[0].price, mlResultsCount: 0,
    };
  });
}

/**
 * Scrape de un producto por ID (no aplica directamente,
 * pero se mantiene la firma para compatibilidad).
 */
async function scrapeById(productId) {
  // busca en ML por ID interno
  return null;
}

function searchProducts(query, allProducts) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return allProducts.filter(p =>
    [p.name, p.brand, p.category, p.description].some(f =>
      f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}

module.exports = { scrapeAll, scrapeById, searchProducts, getBaseProducts, STORES, ML_SITE };
