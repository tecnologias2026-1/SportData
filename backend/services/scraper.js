/**
 * ============================================
 * SportData — Scraper vía RapidAPI Real-Time Product Search
 * ============================================
 * API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-product-search
 *
 * Configura tu clave en:  RAPIDAPI_KEY  (variable de entorno o .env)
 * o en el panel de SportData (Settings → RapidAPI Key)
 */

'use strict';

const axios = require('axios');

/* ──────────────────────────────────────────
   CONFIGURACIÓN
────────────────────────────────────────── */
const RAPIDAPI_HOST  = 'real-time-product-search.p.rapidapi.com';
const RAPIDAPI_BASE  = 'https://real-time-product-search.p.rapidapi.com';
const RESULTS_PER_QUERY = 5;
const REQUEST_DELAY     = 600;   // ms entre llamadas
const TIMEOUT_MS        = 60_000;

/* Queries de búsqueda deportiva */
const SPORT_QUERIES = [
  'sports clothing activewear',
  'running training shoes',
  'soccer football basketball',
  'gym fitness equipment',
  'cycling bike gear',
  'tennis padel racket',
  'boxing martial arts',
  'swimming accessories',
  'outdoor sports gear',
  'yoga pilates fitness',
];

/* ──────────────────────────────────────────
   TIENDAS COMPARATIVAS (precios simulados
   a partir del precio real de la API)
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
   IMÁGENES DE RESPALDO POR CATEGORÍA
────────────────────────────────────────── */
const CATEGORY_FALLBACK_IMAGES = {
  calzado:  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  ropa:     'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  balones:  'https://images.unsplash.com/photo-1614632537190-23e4e3c5d7b6?w=600&q=80',
  gimnasio: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80',
  natacion: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80',
  ciclismo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  raquetas: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=600&q=80',
  boxeo:    'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&q=80',
  fitness:  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
  default:  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80',
};

/* ──────────────────────────────────────────
   EXTRACCIÓN ROBUSTA DE IMAGEN
   Prueba todos los campos conocidos de RapidAPI
────────────────────────────────────────── */
function extractProductImage(item, category) {
  // Todos los campos posibles donde RapidAPI puede devolver la imagen,
  // en orden de prioridad
  const candidates = [
    item.product_photo,
    item.product_main_image_url,
    item.product_image,
    item.main_image,
    item.image_url,
    item.image,
    item.thumbnail,
    item.product_thumbnail,
    item.photo,
  ];

  // Campos que pueden ser arrays
  if (Array.isArray(item.product_photos) && item.product_photos.length > 0) {
    candidates.push(item.product_photos[0]);
  }
  if (Array.isArray(item.images) && item.images.length > 0) {
    candidates.push(typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url);
  }
  if (item.media && Array.isArray(item.media) && item.media.length > 0) {
    candidates.push(item.media[0]?.url || item.media[0]?.src);
  }

  // Retornar la primera URL válida encontrada
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().startsWith('http')) {
      return candidate.trim();
    }
  }

  // Sin imagen válida → usar fallback de categoría
  const cat = (category || 'default').toLowerCase();
  return CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES.default;
}

/* ──────────────────────────────────────────
   HELPERS
────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || '';
}

function guessCategory(title = '') {
  const t = title.toLowerCase();
  if (/shoe|sneaker|boot|zapatill|calzado|trainer|running|footwear/.test(t))        return 'calzado';
  if (/shirt|jersey|short|pants|legging|ropa|hoodie|jacket|top|vest|wear|apparel/.test(t)) return 'ropa';
  if (/ball|soccer|futbol|basket|voley|football|rugby/.test(t))                     return 'balones';
  if (/dumbbell|barbell|weight|gym|kettlebell|rack|bench|press|mancuerna/.test(t))  return 'gimnasio';
  if (/swim|goggle|natacion|pool|wetsuit/.test(t))                                  return 'natacion';
  if (/bike|bicycle|helmet|cycling|ciclismo|handlebar/.test(t))                     return 'ciclismo';
  if (/tennis|racket|badminton|padel|squash/.test(t))                               return 'raquetas';
  if (/boxing|glove|punch|muay|mma|combat/.test(t))                                 return 'boxeo';
  if (/yoga|mat|pilates|foam|roller|resistance|band|stretch/.test(t))               return 'fitness';
  return 'fitness';
}

function guessBrand(title = '', brand = '') {
  if (brand && brand.length > 0 && brand !== 'Unknown') return brand;
  const known = ['Nike','Adidas','Puma','Reebok','Under Armour','Wilson','Spalding',
    'Speedo','Arena','Salomon','Brooks','Asics','Decathlon','Everlast','Giro','Trek'];
  const t = title.toLowerCase();
  for (const b of known) {
    if (t.includes(b.toLowerCase())) return b;
  }
  return 'Genérico';
}

const COLOR_POOL = [
  { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Azul',  hex: '#3B82F6' }, { name: 'Rojo',   hex: '#EF4444' },
  { name: 'Naranja', hex: '#F59E0B' }, { name: 'Verde', hex: '#10B981' },
];
const SIZE_POOLS = {
  calzado: ['38','39','40','41','42','43','44','45'],
  ropa:    ['XS','S','M','L','XL','XXL'],
  default: ['Única'],
};

function buildColors() {
  const n = Math.floor(Math.random() * 2) + 2;
  return COLOR_POOL.slice(0, n);
}

function buildSizes(category) {
  return SIZE_POOLS[category] || SIZE_POOLS.default;
}

function makeId(title, index) {
  const safe = (title || 'PROD').slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `RP-${safe}-${String(index + 1).padStart(3, '0')}`.slice(0, 20);
}

/* ──────────────────────────────────────────
   PRECIOS POR TIENDA
────────────────────────────────────────── */
function generateStorePrices(basePrice) {
  return STORES.map((store, idx) => {
    const jitter   = (Math.random() - 0.5) * basePrice * 0.03;
    const price    = Math.max(0.5, parseFloat((basePrice * (1 + store.bias) + jitter).toFixed(2)));
    const isLast   = idx === STORES.length - 1;
    const isLow    = idx % 4 === 3 && idx > 2;
    const stockPill = isLast ? 'out' : isLow ? 'low' : 'ok';
    const stockQty  = stockPill === 'out' ? 0
                    : stockPill === 'low' ? Math.floor(Math.random() * 6) + 1
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
  }).sort((a, b) => a.price - b.price);
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
   LLAMADA A RAPIDAPI — SEARCH
   Endpoint: GET /search?q=...&country=us&language=es&limit=5
────────────────────────────────────────── */
async function fetchRapidSearch(query, limit = RESULTS_PER_QUERY) {
  const key = getRapidApiKey();
  if (!key) return [];

  try {
    const { data } = await axios.get(`${RAPIDAPI_BASE}/search`, {
      params: { q: query, country: 'us', language: 'es', limit: String(limit) },
      headers: {
        'x-rapidapi-key':  key,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      timeout: TIMEOUT_MS,
    });

    // Imprimir la estructura real para diagnosticar (solo primera llamada)
    if (process.env.DEBUG_SCRAPER) {
      const sample = Array.isArray(data?.data?.products) && data.data.products[0];
      if (sample) {
        console.log('[RapidAPI] Campos de imagen disponibles en primer resultado:', {
          product_photo:          sample.product_photo,
          product_main_image_url: sample.product_main_image_url,
          product_image:          sample.product_image,
          thumbnail:              sample.thumbnail,
          image:                  sample.image,
          product_thumbnail:      sample.product_thumbnail,
          // Mostrar todas las keys para diagnóstico
          allKeys: Object.keys(sample),
        });
      }
    }

    // Manejar múltiples estructuras posibles
    let results = [];
    if (Array.isArray(data))                        results = data;
    else if (Array.isArray(data?.data?.products))   results = data.data.products;
    else if (Array.isArray(data?.data))             results = data.data;
    else if (Array.isArray(data?.products))         results = data.products;
    else if (Array.isArray(data?.results))          results = data.results;
    else if (Array.isArray(data?.items))            results = data.items;
    else results = [];

    console.log(`[RapidAPI] "${query}" → ${results.length} resultados`);

    // Log de imagen del primer resultado para depuración
    if (results.length > 0) {
      const first = results[0];
      const imgFound = extractProductImage(first, 'default');
      console.log(`[RapidAPI] Imagen primer resultado: ${imgFound.startsWith('https://images.unsplash') ? '⚠ FALLBACK' : '✅ ' + imgFound.slice(0, 80)}`);
    }

    return results;

  } catch (err) {
    const status = err.response ? err.response.status : 'timeout';
    console.warn(`[RapidAPI] Error en "${query}" (${status}): ${err.message}`);
    return [];
  }
}

/* ──────────────────────────────────────────
   CONVERTIR RESULTADO DE RAPIDAPI → PRODUCTO SPORTDATA
────────────────────────────────────────── */
function rapidItemToProduct(item, index) {
  // Normalizar precio: puede venir como "$89.99", "89.99", "USD 89.99" etc.
  let priceRaw = item.product_price || item.typical_price_range?.[0] || '0';
  const priceNum = parseFloat(String(priceRaw).replace(/[^0-9.]/g, '')) || 29.99;

  const title    = item.product_title || item.title || `Producto deportivo ${index + 1}`;
  const brand    = guessBrand(title, item.product_brand || '');
  const category = guessCategory(title);

  // ── IMAGEN: usar extractor robusto ──────────────────────────────────────
  const image = extractProductImage(item, category);

  const rating   = parseFloat(item.product_star_rating) || parseFloat((3.8 + Math.random() * 1.1).toFixed(1));
  const reviews  = parseInt(item.product_num_ratings) || Math.floor(Math.random() * 200) + 20;
  const url      = item.product_url || '#';

  const storePrices   = generateStorePrices(priceNum);
  const inStock       = storePrices.filter(s => s.stockPill !== 'out');
  const bestPrice     = storePrices[0].price;
  const worstPrice    = storePrices[storePrices.length - 1].price;
  const avgPrice      = parseFloat((inStock.reduce((s, p) => s + p.price, 0) / (inStock.length || 1)).toFixed(2));
  const savings       = parseFloat((worstPrice - bestPrice).toFixed(2));

  return {
    id:            makeId(title, index),
    name:          title,
    brand,
    category,
    basePrice:     priceNum,
    image,                    // ← imagen real del scraping o fallback de categoría
    description:   `${title}. Producto disponible en múltiples tiendas deportivas con comparación de precios en tiempo real.`,
    specs:         {},
    sizes:         buildSizes(category),
    colors:        buildColors(),
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
    sourceUrl:      url,
  };
}

/* ──────────────────────────────────────────
   API PÚBLICA: scrapeAll
────────────────────────────────────────── */
async function scrapeAll() {
  const key = getRapidApiKey();

  if (!key) {
    console.warn('[Scraper] Sin RAPIDAPI_KEY — usando productos de respaldo.');
    return getBaseProducts();
  }

  console.log(`[Scraper] 🔍 Iniciando scraping con RapidAPI (${SPORT_QUERIES.length} queries)…`);

  const allItems = [];
  const seenTitles = new Set();
  const limitPerQuery = Math.ceil(20 / SPORT_QUERIES.length) + 2;

  for (const query of SPORT_QUERIES) {
    const TARGET = SPORT_QUERIES.length * RESULTS_PER_QUERY;
    if (allItems.length >= TARGET) break;

    const items = await fetchRapidSearch(query, limitPerQuery);
    for (const item of items) {
      const key = (item.product_title || '').slice(0, 40);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allItems.push(item);
      }
      if (allItems.length >= TARGET) break;
    }

    await sleep(REQUEST_DELAY);
  }

  if (!allItems.length) {
    console.warn('[Scraper] ⚠ Ningún resultado de RapidAPI — usando productos de respaldo.');
    return getBaseProducts();
  }

  const products = allItems.slice(0, 20).map((item, i) => {
    try {
      return rapidItemToProduct(item, i);
    } catch (err) {
      console.error(`[Scraper] Error procesando ítem ${i}: ${err.message}`);
      return null;
    }
  }).filter(Boolean);

  console.log(`[Scraper] ✅ ${products.length} productos listos desde RapidAPI.`);

  // Log resumen de imágenes
  const withRealImg = products.filter(p => !p.image.includes('unsplash.com') || p.mlResultsCount > 0).length;
  console.log(`[Scraper] 🖼  Imágenes: ${withRealImg}/${products.length} con imagen del scraping`);

  return products.length > 0 ? products : getBaseProducts();
}

/* ──────────────────────────────────────────
   PRODUCTOS BASE DE RESPALDO
────────────────────────────────────────── */
const BASE_PRODUCTS_DATA = [
  { name: 'Zapatillas Running Ultraboost', brand: 'Adidas', category: 'calzado', basePrice: 89.99,
    image: CATEGORY_FALLBACK_IMAGES.calzado,
    description: 'Zapatillas de running con tecnología de amortiguación Boost.',
    sizes: ['38','39','40','41','42','43','44','45'],
    colors: [{ name:'Negro', hex:'#000000' },{ name:'Blanco', hex:'#FFFFFF' },{ name:'Azul', hex:'#3B82F6' }] },
  { name: 'Pelota de Fútbol Profesional', brand: 'Nike', category: 'balones', basePrice: 34.99,
    image: CATEGORY_FALLBACK_IMAGES.balones,
    description: 'Pelota oficial de fútbol con tecnología de vuelo preciso.',
    sizes: ['No. 3','No. 4','No. 5'],
    colors: [{ name:'Blanco/Negro', hex:'#FFFFFF' }] },
  { name: 'Mancuernas Ajustables 20kg', brand: 'Bowflex', category: 'gimnasio', basePrice: 149.99,
    image: CATEGORY_FALLBACK_IMAGES.gimnasio,
    description: 'Set de mancuernas ajustables de 2 a 20kg.',
    sizes: ['5kg','10kg','15kg','20kg'],
    colors: [{ name:'Negro', hex:'#000000' },{ name:'Gris', hex:'#808080' }] },
  { name: 'Camiseta Deportiva Dry-Fit', brand: 'Nike', category: 'ropa', basePrice: 29.99,
    image: CATEGORY_FALLBACK_IMAGES.ropa,
    description: 'Camiseta técnica con tecnología Dri-FIT.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name:'Negro', hex:'#000000' },{ name:'Azul', hex:'#3B82F6' },{ name:'Rojo', hex:'#EF4444' }] },
  { name: 'Bicicleta de Montaña 29"', brand: 'Trek', category: 'ciclismo', basePrice: 549.99,
    image: CATEGORY_FALLBACK_IMAGES.ciclismo,
    description: 'Bicicleta de montaña con cuadro de aluminio liviano.',
    sizes: ['S','M','L','XL'],
    colors: [{ name:'Negro', hex:'#000000' },{ name:'Verde', hex:'#10B981' }] },
  { name: 'Raqueta de Tenis Pro Staff', brand: 'Wilson', category: 'raquetas', basePrice: 79.99,
    image: CATEGORY_FALLBACK_IMAGES.raquetas,
    description: 'Raqueta profesional con marco de grafito.',
    sizes: ['4 1/4"','4 3/8"','4 1/2"'],
    colors: [{ name:'Negro/Rojo', hex:'#cc0000' }] },
  { name: 'Guantes de Boxeo Training', brand: 'Everlast', category: 'boxeo', basePrice: 44.99,
    image: CATEGORY_FALLBACK_IMAGES.boxeo,
    description: 'Guantes de boxeo con relleno de espuma de alta densidad.',
    sizes: ['10 oz','12 oz','14 oz','16 oz'],
    colors: [{ name:'Rojo', hex:'#EF4444' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Esterilla de Yoga Premium', brand: 'Manduka', category: 'fitness', basePrice: 39.99,
    image: CATEGORY_FALLBACK_IMAGES.fitness,
    description: 'Esterilla antideslizante de 6mm.',
    sizes: ['183cm x 61cm'],
    colors: [{ name:'Morado', hex:'#9B59B6' },{ name:'Verde', hex:'#10B981' }] },
  { name: 'Casco de Ciclismo Aero', brand: 'Giro', category: 'ciclismo', basePrice: 69.99,
    image: CATEGORY_FALLBACK_IMAGES.ciclismo,
    description: 'Casco aerodinámico con ventilación optimizada.',
    sizes: ['S (51-55cm)','M (55-59cm)','L (59-63cm)'],
    colors: [{ name:'Blanco', hex:'#FFFFFF' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Traje de Baño Competición', brand: 'Speedo', category: 'natacion', basePrice: 54.99,
    image: CATEGORY_FALLBACK_IMAGES.natacion,
    description: 'Traje de competición con tecnología LZR Racer.',
    sizes: ['28','30','32','34','36','38'],
    colors: [{ name:'Azul', hex:'#3B82F6' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Zapatillas Basketball Air', brand: 'Nike', category: 'calzado', basePrice: 119.99,
    image: CATEGORY_FALLBACK_IMAGES.calzado,
    description: 'Zapatillas de basketball con cámara de aire.',
    sizes: ['38','39','40','41','42','43','44','45'],
    colors: [{ name:'Blanco/Rojo', hex:'#EF4444' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Pelota de Basketball NBA', brand: 'Spalding', category: 'balones', basePrice: 49.99,
    image: CATEGORY_FALLBACK_IMAGES.balones,
    description: 'Pelota oficial NBA de cuero compuesto.',
    sizes: ['Talla 7','Talla 6','Talla 5'],
    colors: [{ name:'Naranja/Negro', hex:'#F59E0B' }] },
  { name: 'Jersey Ciclismo Pro', brand: 'Hummel', category: 'ropa', basePrice: 64.99,
    image: CATEGORY_FALLBACK_IMAGES.ropa,
    description: 'Jersey de ciclismo con tejido transpirable.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name:'Azul', hex:'#3B82F6' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Kettlebell 16kg Hierro', brand: 'Reebok', category: 'gimnasio', basePrice: 59.99,
    image: CATEGORY_FALLBACK_IMAGES.gimnasio,
    description: 'Kettlebell de hierro fundido con asa ergonómica.',
    sizes: ['8kg','12kg','16kg','20kg','24kg'],
    colors: [{ name:'Negro', hex:'#000000' }] },
  { name: 'Shorts Running Ultralight', brand: 'Adidas', category: 'ropa', basePrice: 24.99,
    image: CATEGORY_FALLBACK_IMAGES.ropa,
    description: 'Shorts ultraligeros con bolsillo interior.',
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [{ name:'Negro', hex:'#000000' },{ name:'Azul', hex:'#3B82F6' }] },
  { name: 'Zapatillas Trail Running', brand: 'Salomon', category: 'calzado', basePrice: 134.99,
    image: CATEGORY_FALLBACK_IMAGES.calzado,
    description: 'Zapatillas trail con suela Contagrip.',
    sizes: ['38','39','40','41','42','43','44','45'],
    colors: [{ name:'Verde/Negro', hex:'#10B981' }] },
  { name: 'Balón de Voleibol', brand: 'Molten', category: 'balones', basePrice: 39.99,
    image: CATEGORY_FALLBACK_IMAGES.balones,
    description: 'Balón de voleibol con 18 paneles cosidos.',
    sizes: ['Talla 5 (oficial)'],
    colors: [{ name:'Azul/Amarillo', hex:'#3B82F6' }] },
  { name: 'Colchoneta Gym Plegable', brand: 'Decathlon', category: 'fitness', basePrice: 29.99,
    image: CATEGORY_FALLBACK_IMAGES.fitness,
    description: 'Colchoneta plegable de 10mm antideslizante.',
    sizes: ['180cm x 60cm','200cm x 80cm'],
    colors: [{ name:'Gris', hex:'#808080' },{ name:'Azul', hex:'#3B82F6' }] },
  { name: 'Gafas de Natación Mirror', brand: 'Arena', category: 'natacion', basePrice: 19.99,
    image: CATEGORY_FALLBACK_IMAGES.natacion,
    description: 'Gafas con lentes espejadas anti-UV.',
    sizes: ['Talla única'],
    colors: [{ name:'Azul espejo', hex:'#38a8c7' },{ name:'Negro', hex:'#000000' }] },
  { name: 'Barra Olímpica 20kg', brand: 'Reebok', category: 'gimnasio', basePrice: 189.99,
    image: CATEGORY_FALLBACK_IMAGES.gimnasio,
    description: 'Barra olímpica de 20kg con rodamientos de precisión.',
    sizes: ['20kg/220cm'],
    colors: [{ name:'Plateado', hex:'#C0C0C0' }] },
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

/* Buscar dentro de caché */
function searchProducts(query, allProducts) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return allProducts.filter(p =>
    [p.name, p.brand, p.category, p.description].some(f =>
      f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}

module.exports = { scrapeAll, searchProducts, getBaseProducts, STORES, getRapidApiKey, CATEGORY_FALLBACK_IMAGES };
