/**
 * ============================================
 * SportData — Scraper vía API pública de MercadoLibre
 * ============================================
 * CAMBIOS v4 (fix 403):
 *  - Usa endpoint de BÚSQUEDA en lugar de categoría
 *  - Múltiples queries deportivas para variedad
 *  - Headers adecuados para evitar bloqueos
 *  - Fallback con productos reales (imágenes Unsplash)
 */

'use strict';

const axios = require('axios');

/* ──────────────────────────────────────────
   CONFIGURACIÓN
────────────────────────────────────────── */
const ML_SITE          = process.env.ML_SITE || 'MLA';
const ML_BASE          = 'https://api.mercadolibre.com';
const TOTAL_PRODUCTS   = parseInt(process.env.ML_TOTAL || '20', 10);
const RESULTS_PER_QUERY= 5;
const REQUEST_DELAY    = 800;
const TIMEOUT_MS       = 15_000;

/* Queries de búsqueda deportiva — mucho más confiables que la categoría */
const SPORT_QUERIES = [
  'zapatillas running',
  'pelota futbol',
  'mancuernas gym',
  'camiseta deportiva',
  'bicicleta montaña',
  'raqueta tenis',
  'guantes boxeo',
  'colchoneta yoga',
  'casco ciclismo',
  'trotadora caminadora',
];

/* Headers para evitar 403 */
const HTTP_HEADERS = {
  'Accept': 'application/json',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://www.mercadolibre.com.ar/',
};

/* Tipos de cambio ARS → USD */
const FX = { MLA: 0.00105, MLM: 0.058, MLC: 0.0011, MCO: 0.00025, MLB: 0.20 };
function toUSD(price, site = ML_SITE) {
  const rate = FX[site] || 0.001;
  return Math.round(price * rate * 100) / 100;
}

/* ──────────────────────────────────────────
   TIENDAS COMPARATIVAS
────────────────────────────────────────── */
const STORES = [
  { name: 'Amazon Sports',  bias: -0.10, shipping: 'Gratis', traffic: '2.4B/mes',  rating: 4.7, badge: 'AMZ',  color: '#ff9900' },
  { name: 'Decathlon',      bias: -0.05, shipping: '$4.99',  traffic: '90M/mes',   rating: 4.5, badge: 'DEC',  color: '#0082c8' },
  { name: 'SportZone',      bias:  0.00, shipping: 'Gratis', traffic: '45M/mes',   rating: 4.4, badge: 'SPZ',  color: '#e04d4d' },
  { name: 'FitnessOutlet',  bias:  0.05, shipping: '$6.99',  traffic: '28M/mes',   rating: 4.3, badge: 'FIT',  color: '#1a1a2e' },
  { name: 'Reebok Store',   bias:  0.08, shipping: 'Gratis', traffic: '35M/mes',   rating: 4.2, badge: 'RBK',  color: '#2d2d2d' },
  { name: 'Nike Official',  bias:  0.15, shipping: 'Gratis', traffic: '180M/mes',  rating: 4.8, badge: 'NIKE', color: '#cc0000' },
  { name: 'MercadoSports',  bias:  0.18, shipping: '$9.99',  traffic: '20M/mes',   rating: 4.0, badge: 'MKT',  color: '#666666' },
  { name: 'RunnerWorld',    bias:  0.22, shipping: '$7.50',  traffic: '12M/mes',   rating: 4.1, badge: 'RUN',  color: '#8B4513' },
];

/* ──────────────────────────────────────────
   MAPEO CATEGORÍAS POR TÍTULO
────────────────────────────────────────── */
function guessCategory(item) {
  const title = ((item && item.title) || '').toLowerCase();
  if (/zapatill|calzado|bota|bot[ií]n|sneaker|tenis/.test(title))  return 'calzado';
  if (/camiset|buzo|remera|short|ropa|camisa|polo/.test(title))    return 'ropa';
  if (/pelota|bal[oó]n|futbol|f[úu]tbol|basket|voley/.test(title)) return 'balones';
  if (/pesas|mancuerna|barra|kettlebell|gym|peso/.test(title))     return 'gimnasio';
  if (/nataci[oó]n|gafa|pileta|swimming/.test(title))              return 'natacion';
  if (/biciclet|ciclism|casco|rodado/.test(title))                 return 'ciclismo';
  if (/tenis|raqueta|p[aá]del|badminton/.test(title))              return 'raquetas';
  if (/boxeo|guante|saco|kick/.test(title))                        return 'boxeo';
  if (/yoga|esterilla|mat|pilates/.test(title))                    return 'fitness';
  return 'fitness';
}

function guessBrand(item) {
  if (!item) return 'Genérico';
  const title = (item.title || '').toLowerCase();
  const brands = [
    'nike', 'adidas', 'puma', 'reebok', 'under armour', 'fila',
    'new balance', 'wilson', 'spalding', 'molten', 'hummel', 'speedo',
    'arena', 'mizuno', 'asics', 'saucony', 'columbia', 'salomon',
    'brooks', 'decathlon', 'topper', 'umbro', 'lotto',
  ];
  for (const b of brands) {
    if (title.includes(b)) return b.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  if (item.attributes) {
    const brandAttr = item.attributes.find(a => a.id === 'BRAND');
    if (brandAttr && brandAttr.value_name) return brandAttr.value_name;
  }
  return 'Genérico';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ──────────────────────────────────────────
   MEJORAR URL DE IMAGEN ML
────────────────────────────────────────── */
function upgradeMLImage(thumbnail) {
  if (!thumbnail) return null;
  return thumbnail
    .replace(/-[A-Z]\.jpg$/, '-W.jpg')
    .replace('-O.jpg', '-W.jpg')
    .replace('http://', 'https://');
}

/* ──────────────────────────────────────────
   ID ÚNICO INTERNO
────────────────────────────────────────── */
function makeId(item, index) {
  const safe = (item.title || 'PROD')
    .slice(0, 10)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return `ML-${safe}-${index + 1}`.slice(0, 20);
}

/* ──────────────────────────────────────────
   SPECS DESDE ATRIBUTOS ML
────────────────────────────────────────── */
function buildSpecs(item) {
  const specs = {};
  if (!item.attributes) return specs;
  const WANTED = ['BRAND','GENDER','COLOR','SIZE','MATERIAL','MODEL',
                  'ITEM_CONDITION','WEIGHT'];
  for (const attr of item.attributes) {
    if (WANTED.includes(attr.id) && attr.value_name) {
      const key = attr.name.toLowerCase().replace(/\s+/g, '_');
      specs[key] = attr.value_name;
    }
  }
  return specs;
}

/* ──────────────────────────────────────────
   COLORES / TALLAS
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
  if (item && item.attributes) {
    const colorAttr = item.attributes.find(a => a.id === 'COLOR');
    if (colorAttr && colorAttr.value_name) {
      const name = colorAttr.value_name;
      const found = COLOR_POOL.find(c => name.toLowerCase().includes(c.name.toLowerCase()));
      return [found || { name, hex: '#888888' }];
    }
  }
  const n = Math.floor(Math.random() * 2) + 2;
  return COLOR_POOL.slice(0, n);
}

function buildSizes(category) {
  return SIZE_POOLS[category] || SIZE_POOLS.default;
}

/* ──────────────────────────────────────────
   PRECIOS POR TIENDA
────────────────────────────────────────── */
function generateStorePrices(mlPriceUSD, mlItem) {
  const anchor = mlPriceUSD;

  const mlStore = {
    storeName:    'MercadoLibre',
    storeColor:   '#FFE600',
    storeBadge:   'ML',
    storeTraffic: '500M/mes',
    storeRating:  4.0,
    price:        mlPriceUSD,
    shipping:     (mlItem.shipping && mlItem.shipping.free_shipping) ? 'Gratis' : 'Ver en tienda',
    delivery:     'Según vendedor',
    stock:        (mlItem.available_quantity > 0) ? 'En Stock' : 'Sin stock',
    stockQty:     mlItem.available_quantity || 0,
    stockPill:    (mlItem.available_quantity > 0)
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
    const stockPill = isLast ? 'out' : isLow ? 'low' : 'ok';
    const stockQty  = stockPill === 'out' ? 0 : stockPill === 'low'
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
   BÚSQUEDA EN ML — endpoint de SEARCH (no category)
────────────────────────────────────────── */
async function fetchMLByQuery(query, limit = RESULTS_PER_QUERY) {
  const encodedQuery = encodeURIComponent(query);
  const url = `${ML_BASE}/sites/${ML_SITE}/search?q=${encodedQuery}&limit=${limit}&condition=new&sort=relevance`;

  try {
    console.log(`[ML] Buscando: "${query}" (limit=${limit})…`);
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: HTTP_HEADERS,
    });
    const results = (data.results || []).filter(r => r.price > 0 && r.thumbnail);
    console.log(`[ML] "${query}" → ${results.length} resultados`);
    return results;
  } catch (err) {
    const status = err.response ? err.response.status : 'timeout';
    console.warn(`[ML] Error en query "${query}" (${status}): ${err.message}`);
    return [];
  }
}

/* ──────────────────────────────────────────
   DETALLE DE ÍTEM (imagen HD + atributos)
────────────────────────────────────────── */
async function fetchMLItemDetail(itemId) {
  try {
    const { data } = await axios.get(`${ML_BASE}/items/${itemId}`, {
      timeout: TIMEOUT_MS,
      headers: HTTP_HEADERS,
    });
    return data;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────
   CONVERTIR ÍTEM ML → PRODUCTO SPORTDATA
────────────────────────────────────────── */
async function mlItemToProduct(mlItem, index) {
  let detail = null;
  try {
    detail = await fetchMLItemDetail(mlItem.id);
    await sleep(REQUEST_DELAY / 2);
  } catch { /* usar datos de búsqueda */ }

  const item     = detail || mlItem;
  const category = guessCategory(item);
  const brand    = guessBrand(item);
  const priceUSD = toUSD(mlItem.price);

  // Imagen: preferir HD del detalle, luego mejorar thumbnail
  let image = upgradeMLImage(mlItem.thumbnail);
  if (item.pictures && item.pictures.length > 0) {
    const hd = item.pictures[0].secure_url || item.pictures[0].url;
    if (hd) image = hd;
  }

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
    image:        image || '../assets/img/main_produc_zapatillas.jpg',
    description:  `${mlItem.title}. Producto deportivo disponible en MercadoLibre y múltiples tiendas. Condición: ${mlItem.condition === 'new' ? 'Nuevo' : 'Usado'}.`,
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
    storesTotal:    storePrices.length,
    storesInStock:  inStock.length,
    priceHistory:   generatePriceHistory(bestPrice),
    updatedAgo:     'En vivo',
    scrapedAt:      new Date().toISOString(),
    price:          bestPrice,
    mlResultsCount: 1,
    mlId:           mlItem.id,
    mlUrl:          mlItem.permalink,
  };
}

/* ──────────────────────────────────────────
   API PÚBLICA
────────────────────────────────────────── */

/**
 * Scraping completo: usa múltiples queries de búsqueda
 * para evitar el 403 del endpoint de categoría.
 */
async function scrapeAll() {
  console.log(`[Scraper] 🔍 Iniciando scraping con ${SPORT_QUERIES.length} queries deportivas…`);

  const allItems = [];
  const seenIds  = new Set();
  const limitPerQuery = Math.ceil(TOTAL_PRODUCTS / SPORT_QUERIES.length) + 2;

  for (const query of SPORT_QUERIES) {
    if (allItems.length >= TOTAL_PRODUCTS) break;

    const items = await fetchMLByQuery(query, limitPerQuery);
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push(item);
      }
      if (allItems.length >= TOTAL_PRODUCTS) break;
    }

    await sleep(REQUEST_DELAY);
  }

  console.log(`[Scraper] Total ítems únicos de ML: ${allItems.length}`);

  if (!allItems.length) {
    console.warn('[Scraper] ⚠ Ninguna query devolvió resultados, usando productos base.');
    return getBaseProducts();
  }

  const products = [];
  const toProcess = allItems.slice(0, TOTAL_PRODUCTS);

  for (let i = 0; i < toProcess.length; i++) {
    try {
      const p = await mlItemToProduct(toProcess[i], i);
      products.push(p);
      console.log(`[Scraper] ✅ [${i + 1}/${toProcess.length}] ${p.id} — ${p.name.slice(0, 50)}`);
    } catch (err) {
      console.error(`[Scraper] ❌ Error en ítem ${i}: ${err.message}`);
    }
    await sleep(REQUEST_DELAY);
  }

  console.log(`[Scraper] ✅ Scraping completo: ${products.length} productos.`);
  return products.length > 0 ? products : getBaseProducts();
}

/* ──────────────────────────────────────────
   PRODUCTOS BASE DE RESPALDO
   (imágenes reales de Unsplash vía CDN)
────────────────────────────────────────── */
const BASE_PRODUCTS_DATA = [
  {
    name: 'Zapatillas Running Ultraboost',
    brand: 'Adidas',
    category: 'calzado',
    basePrice: 89.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    description: 'Zapatillas de running de alto rendimiento con tecnología de amortiguación Boost.',
    sizes: ['38','39','40','41','42','43','44','45'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#FFFFFF' }, { name: 'Azul', hex: '#3B82F6' }],
  },
  {
    name: 'Pelota de Fútbol Profesional',
    brand: 'Nike',
    category: 'balones',
    basePrice: 34.99,
    image: 'https://images.unsplash.com/photo-1614632537190-23e4e3c5d7b6?w=600&q=80',
    description: 'Pelota oficial de fútbol con tecnología de vuelo preciso y durabilidad superior.',
    sizes: ['No. 3', 'No. 4', 'No. 5'],
    colors: [{ name: 'Blanco/Negro', hex: '#FFFFFF' }],
  },
  {
    name: 'Mancuernas Ajustables 20kg',
    brand: 'Bowflex',
    category: 'gimnasio',
    basePrice: 149.99,
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80',
    description: 'Set de mancuernas ajustables de 2 a 20kg. Perfectas para entrenamiento en casa.',
    sizes: ['5kg','10kg','15kg','20kg'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Gris', hex: '#808080' }],
  },
  {
    name: 'Camiseta Deportiva Dry-Fit',
    brand: 'Nike',
    category: 'ropa',
    basePrice: 29.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    description: 'Camiseta técnica con tecnología Dri-FIT que aleja la humedad del cuerpo.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Azul', hex: '#3B82F6' }, { name: 'Rojo', hex: '#EF4444' }],
  },
  {
    name: 'Bicicleta de Montaña 29"',
    brand: 'Trek',
    category: 'ciclismo',
    basePrice: 549.99,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    description: 'Bicicleta de montaña con cuadro de aluminio liviano, 21 velocidades y suspensión delantera.',
    sizes: ['S','M','L','XL'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Verde', hex: '#10B981' }],
  },
  {
    name: 'Raqueta de Tenis Pro Staff',
    brand: 'Wilson',
    category: 'raquetas',
    basePrice: 79.99,
    image: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=600&q=80',
    description: 'Raqueta de tenis profesional con marco de grafito y tecnología de control de vibración.',
    sizes: ['4 1/4"', '4 3/8"', '4 1/2"'],
    colors: [{ name: 'Negro/Rojo', hex: '#cc0000' }],
  },
  {
    name: 'Guantes de Boxeo Training',
    brand: 'Everlast',
    category: 'boxeo',
    basePrice: 44.99,
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&q=80',
    description: 'Guantes de boxeo para entrenamiento con relleno de espuma de alta densidad.',
    sizes: ['10 oz','12 oz','14 oz','16 oz'],
    colors: [{ name: 'Rojo', hex: '#EF4444' }, { name: 'Negro', hex: '#000000' }, { name: 'Azul', hex: '#3B82F6' }],
  },
  {
    name: 'Esterilla de Yoga Premium',
    brand: 'Manduka',
    category: 'fitness',
    basePrice: 39.99,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    description: 'Esterilla de yoga antideslizante de alta densidad, 6mm de grosor y superficie texturizada.',
    sizes: ['183cm x 61cm'],
    colors: [{ name: 'Morado', hex: '#9B59B6' }, { name: 'Verde', hex: '#10B981' }, { name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Casco de Ciclismo Aero',
    brand: 'Giro',
    category: 'ciclismo',
    basePrice: 69.99,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600&q=80',
    description: 'Casco aerodinámico con ventilación optimizada y sistema de ajuste Roc Loc Air.',
    sizes: ['S (51-55cm)','M (55-59cm)','L (59-63cm)'],
    colors: [{ name: 'Blanco', hex: '#FFFFFF' }, { name: 'Negro', hex: '#000000' }, { name: 'Azul', hex: '#3B82F6' }],
  },
  {
    name: 'Traje de Baño Natación Competición',
    brand: 'Speedo',
    category: 'natacion',
    basePrice: 54.99,
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80',
    description: 'Traje de baño de competición con tecnología LZR Racer que reduce la resistencia al agua.',
    sizes: ['28','30','32','34','36','38'],
    colors: [{ name: 'Azul', hex: '#3B82F6' }, { name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Zapatillas Basketball Air',
    brand: 'Nike',
    category: 'calzado',
    basePrice: 119.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&hue=200',
    description: 'Zapatillas de basketball con cámara de aire visible y soporte de tobillo reforzado.',
    sizes: ['38','39','40','41','42','43','44','45','46'],
    colors: [{ name: 'Blanco/Rojo', hex: '#EF4444' }, { name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Pelota de Basketball NBA',
    brand: 'Spalding',
    category: 'balones',
    basePrice: 49.99,
    image: 'https://images.unsplash.com/photo-1546519638405-a9f9c8e5c48f?w=600&q=80',
    description: 'Pelota oficial NBA de cuero compuesto con grip superior y rebote consistente.',
    sizes: ['Talla 7','Talla 6','Talla 5'],
    colors: [{ name: 'Naranja/Negro', hex: '#F59E0B' }],
  },
  {
    name: 'Camiseta Ciclismo Jersey Pro',
    brand: 'Hummel',
    category: 'ropa',
    basePrice: 64.99,
    image: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=600&q=80',
    description: 'Jersey de ciclismo profesional con tejido transpirable, 3 bolsillos traseros y cremallera completa.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name: 'Azul', hex: '#3B82F6' }, { name: 'Negro', hex: '#000000' }, { name: 'Rojo', hex: '#EF4444' }],
  },
  {
    name: 'Kettlebell 16kg Hierro',
    brand: 'Reebok',
    category: 'gimnasio',
    basePrice: 59.99,
    image: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=80',
    description: 'Kettlebell de hierro fundido de 16kg con base plana y asa ergonómica.',
    sizes: ['8kg','12kg','16kg','20kg','24kg'],
    colors: [{ name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Shorts Running Ultralight',
    brand: 'Adidas',
    category: 'ropa',
    basePrice: 24.99,
    image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80',
    description: 'Shorts de running ultraligeros con bolsillo interior y tecnología Climalite.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Azul', hex: '#3B82F6' }, { name: 'Verde', hex: '#10B981' }],
  },
  {
    name: 'Zapatillas Trail Running',
    brand: 'Salomon',
    category: 'calzado',
    basePrice: 134.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&sat=-30',
    description: 'Zapatillas para trail running con suela Contagrip y sistema de amarre QuickLace.',
    sizes: ['38','39','40','41','42','43','44','45'],
    colors: [{ name: 'Verde/Negro', hex: '#10B981' }, { name: 'Naranja', hex: '#F59E0B' }],
  },
  {
    name: 'Balón de Voleibol Mikasa',
    brand: 'Molten',
    category: 'balones',
    basePrice: 39.99,
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80',
    description: 'Balón de voleibol con 18 paneles cosidos y superficie de microfiber.',
    sizes: ['Talla 5 (oficial)'],
    colors: [{ name: 'Azul/Amarillo', hex: '#3B82F6' }],
  },
  {
    name: 'Colchoneta Gym Plegable 10mm',
    brand: 'Decathlon',
    category: 'fitness',
    basePrice: 29.99,
    image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&q=80',
    description: 'Colchoneta de gimnasio plegable de 10mm, antideslizante, lavable y compacta.',
    sizes: ['180cm x 60cm', '200cm x 80cm'],
    colors: [{ name: 'Gris', hex: '#808080' }, { name: 'Azul', hex: '#3B82F6' }, { name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Gafas de Natación Mirror',
    brand: 'Arena',
    category: 'natacion',
    basePrice: 19.99,
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80&hue=120',
    description: 'Gafas de natación con lentes espejadas anti-UV y sello de silicona doble.',
    sizes: ['Talla única'],
    colors: [{ name: 'Azul espejo', hex: '#38a8c7' }, { name: 'Negro', hex: '#000000' }],
  },
  {
    name: 'Barra Olímpica 20kg',
    brand: 'Reebok',
    category: 'gimnasio',
    basePrice: 189.99,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    description: 'Barra olímpica de 20kg y 220cm, acabado cromado con rodamientos de precisión.',
    sizes: ['20kg/220cm'],
    colors: [{ name: 'Plateado', hex: '#C0C0C0' }],
  },
];

function getBaseProducts() {
  return BASE_PRODUCTS_DATA.map((p, i) => {
    const anchor = p.basePrice;
    const storePrices = STORES.map((s, idx) => ({
      storeName:    s.name,
      storeColor:   s.color,
      storeBadge:   s.badge,
      storeTraffic: s.traffic,
      storeRating:  s.rating,
      price:        parseFloat((anchor * (1 + s.bias)).toFixed(2)),
      shipping:     s.shipping,
      delivery:     '3–5 días hábiles',
      stock:        idx === STORES.length - 1 ? 'Sin stock' : 'En Stock',
      stockQty:     idx === STORES.length - 1 ? 0 : Math.floor(Math.random() * 60) + 10,
      stockPill:    idx === STORES.length - 1 ? 'out' : 'ok',
      lastUpdate:   `Hace ${Math.floor(Math.random() * 30) + 2} min`,
      url:          '#',
    })).sort((a, b) => a.price - b.price);

    const inStock    = storePrices.filter(s => s.stockPill !== 'out');
    const bestPrice  = storePrices[0].price;
    const worstPrice = storePrices[storePrices.length - 1].price;
    const savings    = parseFloat((worstPrice - bestPrice).toFixed(2));
    const rating     = parseFloat((3.9 + Math.random() * 0.9).toFixed(1));
    const reviews    = Math.floor(Math.random() * 300) + 50;

    return {
      id:           `BASE-SPORT-${String(i + 1).padStart(3, '0')}`,
      name:         p.name,
      brand:        p.brand,
      category:     p.category,
      basePrice:    anchor,
      image:        p.image,
      description:  p.description,
      specs:        {},
      sizes:        p.sizes,
      colors:       p.colors,
      rating,
      reviews,
      storePrices,
      bestPrice,
      worstPrice,
      avgPrice:     anchor,
      savings,
      storesTotal:   STORES.length,
      storesInStock: inStock.length,
      priceHistory:  generatePriceHistory(bestPrice),
      updatedAgo:    'Hace 5 min',
      scrapedAt:     new Date().toISOString(),
      price:         bestPrice,
      mlResultsCount: 0,
    };
  });
}

async function scrapeById(productId) {
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
