/**
 * ============================================
 * SportData — Scraper vía API de MercadoLibre
 * ============================================
 * Reemplaza el scraper anterior (axios+cheerio+Python).
 * Usa la API REST pública de ML — sin autenticación,
 * sin Python, sin riesgo de bloqueo por bot-detection.
 *
 * Endpoints usados:
 *   GET https://api.mercadolibre.com/sites/{SITE}/search
 *        ?q=<query>&limit=<n>&category=<cat>
 *   GET https://api.mercadolibre.com/items/{id}
 *        (para imagen de alta resolución)
 *
 * Sites disponibles:
 *   MLA = Argentina | MLM = México | MLC = Chile
 *   MCO = Colombia  | MLB = Brasil
 *
 * Instalar dependencias (si aún no están):
 *   cd backend && npm install   (axios ya está en package.json)
 */

'use strict';

const axios = require('axios');

/* ────────────────────────────────────────────
   CONFIGURACIÓN
──────────────────────────────────────────── */
const ML_SITE       = process.env.ML_SITE || 'MLA';   // Argentina por volumen
const ML_BASE       = `https://api.mercadolibre.com`;
const ML_CATEGORY   = 'MLA1276';  // Deportes y Fitness en MLA
                                   // MCO1276 para Colombia, MLM1276 México, etc.
const RESULTS_PER_QUERY = 5;       // resultados ML por producto (1–50)
const ITEM_DETAIL_LIMIT = 3;       // cuántos items se enriquecen con imagen HD
const REQUEST_DELAY     = 400;     // ms entre llamadas para respetar rate-limit
const TIMEOUT_MS        = 10_000;

/* ────────────────────────────────────────────
   TIENDAS INTERNAS (simuladas con precios ML)
   Se mantiene el mismo contrato que el scraper
   anterior para no romper productCache.js
──────────────────────────────────────────── */
const STORES = [
  { name: 'Amazon Sports',  bias: -0.10, shipping: 'Gratis',  traffic: '2.4B/mes', rating: 4.7, badge: 'AMZ',  color: '#ff9900' },
  { name: 'Decathlon',      bias: -0.05, shipping: '$4.99',   traffic: '90M/mes',  rating: 4.5, badge: 'DEC',  color: '#0082c8' },
  { name: 'SportZone',      bias:  0.00, shipping: 'Gratis',  traffic: '45M/mes',  rating: 4.4, badge: 'SPZ',  color: '#e04d4d' },
  { name: 'FitnessOutlet',  bias:  0.05, shipping: '$6.99',   traffic: '28M/mes',  rating: 4.3, badge: 'FIT',  color: '#1a1a2e' },
  { name: 'Reebok Store',   bias:  0.08, shipping: 'Gratis',  traffic: '35M/mes',  rating: 4.2, badge: 'RBK',  color: '#2d2d2d' },
  { name: 'Nike Official',  bias:  0.15, shipping: 'Gratis',  traffic: '180M/mes', rating: 4.8, badge: 'NIKE', color: '#cc0000' },
  { name: 'MercadoSports',  bias:  0.18, shipping: '$9.99',   traffic: '20M/mes',  rating: 4.0, badge: 'MKT',  color: '#666666' },
  { name: 'RunnerWorld',    bias:  0.22, shipping: '$7.50',   traffic: '12M/mes',  rating: 4.1, badge: 'RUN',  color: '#8B4513' },
];

/* ────────────────────────────────────────────
   CATÁLOGO BASE
   Igual estructura que antes; imagen se
   sobreescribe con la thumbnail de ML.
──────────────────────────────────────────── */
const BASE_PRODUCTS = [
  {
    id: 'NK-RNP-001', name: 'Zapatillas Running Pro', brand: 'Nike',
    category: 'calzado', basePrice: 89.99,
    image: '../assets/img/main_produc_zapatillas.jpg',
    mlQuery: 'zapatillas running nike',
    description: 'Diseñadas para corredores que buscan máximo rendimiento. Mesh de nylon transpirable, amortiguación Air Max y suela de goma de carbono. Perfectas para entrenamientos diarios y competencias.',
    specs: {
      material: 'Mesh nylon + poliéster reciclado', suela: 'Goma de carbono',
      peso: '245 g (talla 42)', drop: '10 mm',
      amortiguacion: 'Air Max Cushioning', tipoUso: 'Carretera / asfalto',
      durabilidad: '500–800 km', tipoPie: 'Neutro',
      tecnologia: 'Flyknit + Zoom Air', nivelUsuario: 'Principiante → Avanzado',
    },
    sizes: ['36','37','38','39','40','41','42','43','44','45'],
    colors: [
      { name: 'Negro', hex: '#000000' }, { name: 'Azul', hex: '#3B82F6' },
      { name: 'Rojo',  hex: '#EF4444' }, { name: 'Naranja', hex: '#F59E0B' },
      { name: 'Blanco',hex: '#FFFFFF' },
    ],
    rating: 4.5, reviews: 128,
  },
  {
    id: 'AD-BOT-002', name: 'Botín Skateboarding Elite', brand: 'Adidas',
    category: 'calzado', basePrice: 45.00,
    image: '../assets/img/botin_skateboarding.jpg',
    mlQuery: 'botin skateboarding adidas',
    description: 'Botín especializado para skateboarding con soporte lateral reforzado y suela vulcanizada. Cuero sintético premium con protección en puntos de desgaste.',
    specs: {
      material: 'Cuero sintético + TPU', suela: 'Goma vulcanizada',
      peso: '320 g (talla 42)', drop: '5 mm',
      amortiguacion: 'EVA alta densidad', tipoUso: 'Skateboarding',
      durabilidad: '300–500 km', tipoPie: 'Normal',
      tecnologia: 'VULC Construction', nivelUsuario: 'Principiante → Avanzado',
    },
    sizes: ['36','37','38','39','40','41','42','43','44'],
    colors: [
      { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Gris',  hex: '#808080' },
    ],
    rating: 4.5, reviews: 89,
  },
  {
    id: 'NK-MOCH-003', name: 'Mochila Yoga Premium', brand: 'Nike',
    category: 'ropa', basePrice: 35.99,
    image: '../assets/img/mochila de yoga.jpg',
    mlQuery: 'mochila deportiva yoga',
    description: 'Mochila premium diseñada para yoga y fitness. 5 compartimentos especializados, correas ergonómicas acolchadas y materiales sostenibles.',
    specs: {
      material: 'Poliéster reciclado 100%', capacidad: '20 L',
      peso: '480 g', resistenciaAgua: 'Sí — DWR',
      compartimentos: '5 bolsillos', correas: 'Ergonómicas acolchadas',
      ventilacion: 'Malla transpirable', tecnologia: 'Nike Dry',
      tipoPie: 'N/A', nivelUsuario: 'Todos',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Negro', hex: '#000000' }, { name: 'Rojo', hex: '#EF4444' },
      { name: 'Azul',  hex: '#3B82F6' },
    ],
    rating: 4.8, reviews: 156,
  },
  {
    id: 'PU-CAM-004', name: 'Camiseta Deportiva DryCell', brand: 'Puma',
    category: 'ropa', basePrice: 29.99,
    image: '../assets/img/main_produc_camiseta.jpg',
    mlQuery: 'camiseta deportiva puma drycell',
    description: 'Camiseta deportiva con tecnología DryCell, evacúa la humedad hacia el exterior. Corte regular, costuras planas, elasticidad en 4 direcciones.',
    specs: {
      material: 'Poliéster 100%', peso: '150 g', corte: 'Regular fit',
      tecnologia: 'DryCell', costuras: 'Planas', transpirabilidad: 'Alta',
      elasticidad: '4 direcciones', tipoPie: 'N/A',
      durabilidad: '2–3 años', nivelUsuario: 'Todos',
    },
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [
      { name: 'Negro',  hex: '#000000' }, { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Azul',   hex: '#3B82F6' }, { name: 'Rojo',   hex: '#EF4444' },
    ],
    rating: 3.9, reviews: 102,
  },
  {
    id: 'AD-BAL-005', name: 'Balón de Fútbol Telstar Pro', brand: 'Adidas',
    category: 'balones', basePrice: 35.99,
    image: '../assets/img/balon de futbol.jpg',
    mlQuery: 'balon futbol adidas telstar',
    description: 'Balón de fútbol profesional con 32 paneles termosellados. Vejiga de butilo con excelente retención de presión. Apto para césped natural y artificial.',
    specs: {
      material: 'Cuero sintético PU', peso: '410–450 g',
      circunferencia: '68–70 cm', paneles: '32 termosellados',
      presion: '0.6–1.1 bar', superficie: 'Natural y artificial',
      tecnologia: 'Termo-bonding', tipoPie: 'N/A',
      durabilidad: '1–2 temporadas', nivelUsuario: 'Amateur → Pro',
    },
    sizes: ['Único'],
    colors: [
      { name: 'Blanco/Negro', hex: '#FFFFFF' }, { name: 'Blanco/Azul', hex: '#DBEAFE' },
    ],
    rating: 4.2, reviews: 201,
  },
  {
    id: 'NK-MANC-006', name: 'Mancuerna Ajustable FlexPro', brand: 'Nike',
    category: 'fitness', basePrice: 120.00,
    image: '../assets/img/mancuerna ajustable.jpg',
    mlQuery: 'mancuerna ajustable gym',
    description: 'Mancuerna ajustable de 2.5 a 20 kg. Sistema de clip rápido (3 s), agarre ergonómico de neopreno antideslizante. Reemplaza 8 mancuernas individuales.',
    specs: {
      material: 'Hierro fundido + neopreno', pesoRango: '2.5–20 kg',
      incremento: 'Pasos 2.5 kg', ajuste: 'Clip rápido',
      dimensions: 'Compactas', balance: 'Perfecta',
      tecnologia: 'DialTech Adjust', tipoPie: 'N/A',
      durabilidad: '5+ años', nivelUsuario: 'Todos',
    },
    sizes: ['2.5kg','5kg','7.5kg','10kg','12.5kg','15kg','17.5kg','20kg'],
    colors: [{ name: 'Negro', hex: '#000000' }, { name: 'Gris', hex: '#808080' }],
    rating: 4.1, reviews: 78,
  },
  {
    id: 'HM-BAND-007', name: 'Banda de Entrenamiento ResistPro', brand: 'Hummel',
    category: 'gimnasio', basePrice: 24.99,
    image: '../assets/img/banda entrenamiento.jpg',
    mlQuery: 'banda elastica resistencia gym',
    description: 'Banda elástica de látex natural (sin ftalatos) con 4 niveles de resistencia. Ultra portátil, 200 g. +100 ejercicios posibles.',
    specs: {
      material: 'Látex natural sin ftalatos', resistencia: '4 niveles',
      largo: '120 cm', ancho: '15 cm',
      ejercicios: '+100', portabilidad: '200 g',
      tecnologia: 'NaturalFlex', tipoPie: 'N/A',
      durabilidad: '2–3 años', nivelUsuario: 'Todos',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Rojo', hex: '#EF4444' }, { name: 'Verde', hex: '#10B981' },
      { name: 'Azul', hex: '#3B82F6' }, { name: 'Púrpura', hex: '#8B5CF6' },
    ],
    rating: 4.5, reviews: 134,
  },
  {
    id: 'PU-GAF-008', name: 'Gafas de Natación Aqua Pro', brand: 'Puma',
    category: 'natacion', basePrice: 24.99,
    image: '../assets/img/gafas natacion.jpg',
    mlQuery: 'gafas natacion profesional',
    description: 'Lentes de policarbonato UV 400 con revestimiento anti-empañamiento permanente DualCoat. Montura de silicona hipoalergénica, campo visual de 180°.',
    specs: {
      lente: 'Policarbonato UV 400', antiEmpañamiento: 'DualCoat permanente',
      montura: 'Silicona hipoalergénica', campVisual: '180°',
      sumergible: 'Sí', resistenciaCloro: 'Alta',
      tecnologia: 'SwimTech Anti-Fog', tipoPie: 'N/A',
      durabilidad: '2 años', nivelUsuario: 'Principiante → Pro',
    },
    sizes: ['Ajustable'],
    colors: [
      { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Azul',  hex: '#3B82F6' },
    ],
    rating: 4.3, reviews: 95,
  },
  {
    id: 'NK-ZAP-009', name: 'Zapatillas Training Crossfit', brand: 'Nike',
    category: 'calzado', basePrice: 75.00,
    image: '../assets/img/zapatillas running.jpg',
    mlQuery: 'zapatillas training crossfit',
    description: 'Zapatillas versátiles para crossfit, gym y deportes de alta intensidad. React Foam + suela multidireccional. Drop 8 mm.',
    specs: {
      material: 'Malla reforzada + sintético', suela: 'Goma multidireccional',
      peso: '280 g (talla 42)', drop: '8 mm',
      amortiguacion: 'React Foam', tipoUso: 'Crossfit, Gym',
      durabilidad: '600–900 h', tipoPie: 'Neutro',
      tecnologia: 'Metcon React', nivelUsuario: 'Todos',
    },
    sizes: ['36','37','38','39','40','41','42','43','44','45'],
    colors: [
      { name: 'Negro', hex: '#000000' }, { name: 'Gris', hex: '#808080' },
      { name: 'Azul',  hex: '#1E40AF' }, { name: 'Rojo', hex: '#EF4444' },
    ],
    rating: 4.7, reviews: 167,
  },
  {
    id: 'SP-BAL-010', name: 'Balón de Baloncesto All Court', brand: 'Spalding',
    category: 'balones', basePrice: 45.00,
    image: '../assets/img/main_produc_basquet.jpg',
    mlQuery: 'balon baloncesto spalding',
    description: 'Balón oficial Spalding con cuero sintético premium. Grip excepcional en piso duro y al aire libre. Tecnología Neverflat.',
    specs: {
      material: 'Cuero sintético premium', peso: '600 g',
      circunferencia: '75.5–78 cm', vejiga: 'Butilo',
      superficie: 'Interior y exterior', presion: '7–9 PSI',
      tecnologia: 'Neverflat', tipoPie: 'N/A',
      durabilidad: '2–3 temporadas', nivelUsuario: 'Recreativo → Competitivo',
    },
    sizes: ['Único'],
    colors: [
      { name: 'Naranja/Negro', hex: '#F59E0B' }, { name: 'Rojo/Negro', hex: '#EF4444' },
    ],
    rating: 4.8, reviews: 156,
  },
  {
    id: 'MK-ESTER-011', name: 'Esterilla de Yoga Premium Pro Lite', brand: 'Manduka',
    category: 'fitness', basePrice: 35.99,
    image: '../assets/img/main_produc_estirilla.jpg',
    mlQuery: 'esterilla yoga premium antideslizante',
    description: 'Poliuretano de célula cerrada, 4.7 mm de amortiguación, superficie reversible antideslizante. 180×61 cm.',
    specs: {
      material: 'Poliuretano célula cerrada', grosor: '4.7 mm',
      peso: '1.6 kg', dimensiones: '180×61 cm',
      agarre: 'Doble cara', amortiguacion: 'Superior',
      tecnologia: 'PROlite Closed-Cell', tipoPie: 'N/A',
      durabilidad: '5–10 años', nivelUsuario: 'Principiante → Experto',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Púrpura',    hex: '#8B5CF6' }, { name: 'Azul Océano', hex: '#0369A1' },
      { name: 'Verde Salvia',hex: '#16A34A' }, { name: 'Rosa',        hex: '#EC4899' },
    ],
    rating: 4.7, reviews: 189,
  },
];

/* ────────────────────────────────────────────
   UTILIDADES
──────────────────────────────────────────── */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Convierte precio en moneda local a USD aproximado.
 *  ARS→USD ≈ 0.00105 | MXN→USD ≈ 0.058 | CLP→USD ≈ 0.0011
 *  MCO→USD ≈ 0.00025 (COP)
 *  El valor final se redondea a 2 decimales. */
const FX = { MLA: 0.00105, MLM: 0.058, MLC: 0.0011, MCO: 0.00025, MLB: 0.20 };
function toUSD(price, site = ML_SITE) {
  const rate = FX[site] || 0.001;
  return Math.round(price * rate * 100) / 100;
}

/** Convierte thumbnail de ML a imagen de mayor resolución:
 *  ML devuelve imágenes en formato:
 *    https://http2.mlstatic.com/D_NQ_NP_{id}-O.jpg   (original, pesada)
 *    https://http2.mlstatic.com/D_NQ_NP_{id}-V.jpg   (variante web, 500px)
 *  La thumbnail default es de ~80px; pedimos la versión 400px. */
function upgradeMLImage(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  // Ejemplo: https://http2.mlstatic.com/D_NQ_NP_xxxxxx-I.jpg
  // Reemplazamos la variante al final por -W (640px), la más segura sin auth.
  return thumbnailUrl
    .replace(/-[A-Z]\.jpg$/, '-W.jpg')   // thumbnail → web 640px
    .replace('-O.jpg', '-W.jpg');
}

/* ────────────────────────────────────────────
   API DE MERCADO LIBRE
──────────────────────────────────────────── */

/**
 * Busca productos en la API pública de ML.
 * @param {string} query       Texto libre de búsqueda
 * @param {number} limit       Número de resultados (1–50)
 * @param {string} [category]  ID de categoría ML (ej: 'MLA1276')
 * @returns {Promise<Array>}   Array de items ML normalizados
 */
async function searchML(query, limit = RESULTS_PER_QUERY, category = ML_CATEGORY) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    ...(category ? { category } : {}),
  });
  const url = `${ML_BASE}/sites/${ML_SITE}/search?${params}`;

  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT_MS });
    if (!data.results || !data.results.length) return [];

    return data.results.map(item => ({
      mlId:      item.id,
      title:     item.title,
      priceLocal:item.price,
      priceUSD:  toUSD(item.price),
      currency:  item.currency_id,
      thumbnail: upgradeMLImage(item.thumbnail),
      url:       item.permalink,
      condition: item.condition,       // 'new' | 'used'
      available: item.available_quantity ?? 0,
      seller:    item.seller?.nickname ?? '',
      rating:    item.reviews?.rating_average ?? null,
      source:    'MercadoLibre',
    }));
  } catch (err) {
    console.warn(`[ML API] ⚠  searchML("${query}") falló: ${err.message}`);
    return [];
  }
}

/**
 * Obtiene la imagen de alta resolución de un item específico.
 * Útil para los primeros 1–3 resultados del catálogo.
 * @param {string} itemId   ID de ML (ej: 'MLA1234567890')
 * @returns {Promise<string|null>}  URL de imagen HD o null
 */
async function getMLItemImage(itemId) {
  try {
    const { data } = await axios.get(`${ML_BASE}/items/${itemId}`, { timeout: TIMEOUT_MS });
    // pictures[0].url es la imagen original ~800px
    const pic = data.pictures && data.pictures[0];
    return pic ? pic.url : null;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────
   GENERADOR DE PRECIOS POR TIENDA
   Usa el precio real de ML como ancla de mercado.
──────────────────────────────────────────── */
function generateStorePrices(baseProduct, mlResults) {
  // Precio ancla: mediana de los primeros resultados ML (en USD),
  // o el precio base del catálogo si ML no devolvió nada.
  let anchor = baseProduct.basePrice;
  if (mlResults.length > 0) {
    const validPrices = mlResults
      .map(r => r.priceUSD)
      .filter(p => p > 1 && p < baseProduct.basePrice * 5); // filtro anti-outlier
    if (validPrices.length) {
      validPrices.sort((a, b) => a - b);
      const mid = Math.floor(validPrices.length / 2);
      anchor = validPrices.length % 2 === 0
        ? (validPrices[mid - 1] + validPrices[mid]) / 2
        : validPrices[mid];
    }
  }

  const lastUpdate = `Hace ${Math.floor(Math.random() * 55) + 5} min`;

  const storePrices = STORES.map((store, idx) => {
    const jitter  = (Math.random() - 0.5) * anchor * 0.03;
    const price   = Math.max(1, parseFloat((anchor * (1 + store.bias) + jitter).toFixed(2)));

    // El último siempre sin stock; los que tienen bias bajo siempre en stock
    const pillOptions = [
      { label: 'En Stock',       qty: Math.floor(Math.random() * 80) + 10, pill: 'ok'  },
      { label: 'En Stock',       qty: Math.floor(Math.random() * 40) + 10, pill: 'ok'  },
      { label: 'Pocas unidades', qty: Math.floor(Math.random() * 8)  + 1,  pill: 'low' },
      { label: 'Sin stock',      qty: 0,                                    pill: 'out' },
    ];
    const pillIdx = idx === STORES.length - 1 ? 3 : (idx % 3 === 0 && idx > 3 ? 2 : 1);
    const stock   = pillOptions[pillIdx];
    const days1   = Math.floor(Math.random() * 3) + 1;
    const days2   = days1 + Math.floor(Math.random() * 3) + 2;
    const delivery= `${days1}–${days2} días hábiles`;

    return {
      storeName:    store.name,
      storeColor:   store.color,
      storeBadge:   store.badge,
      storeTraffic: store.traffic,
      storeRating:  store.rating,
      price,
      shipping:     store.shipping,
      delivery,
      stock:        stock.label,
      stockQty:     stock.qty,
      stockPill:    stock.pill,
      lastUpdate,
      url:          '#',    // ← tiendas internas no tienen URL real
    };
  });

  // Insertar resultados REALES de ML al inicio (con URL real y thumbnail real)
  const mlStoreEntries = mlResults.slice(0, 3).map((item, i) => ({
    storeName:    `MercadoLibre${i > 0 ? ` (${i + 1})` : ''}`,
    storeColor:   '#FFE600',
    storeBadge:   'ML',
    storeTraffic: '500M/mes',
    storeRating:  item.rating ?? 4.0,
    price:        item.priceUSD,
    shipping:     'Ver en tienda',
    delivery:     'Según vendedor',
    stock:        item.available > 0 ? 'En Stock' : 'Sin stock',
    stockQty:     item.available,
    stockPill:    item.available > 0 ? (item.available < 5 ? 'low' : 'ok') : 'out',
    lastUpdate:   'En vivo',
    url:          item.url,    // ← URL real del producto en ML
  }));

  // Combinar ML real + tiendas simuladas, ordenar por precio
  return [...mlStoreEntries, ...storePrices].sort((a, b) => a.price - b.price);
}

/* ────────────────────────────────────────────
   HISTORIAL DE PRECIOS (30 días, simulado)
──────────────────────────────────────────── */
function generatePriceHistory(anchor) {
  const series = (base, variance) => {
    let v = base;
    return Array.from({ length: 30 }, () => {
      v += (Math.random() - 0.5) * variance;
      v  = Math.max(base * 0.88, Math.min(base * 1.18, v));
      return parseFloat(v.toFixed(2));
    });
  };
  const labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  });
  return {
    labels,
    amazon:    series(anchor * 0.90, anchor * 0.02),
    decathlon: series(anchor * 0.95, anchor * 0.015),
    official:  series(anchor * 1.10, anchor * 0.01),
  };
}

/* ────────────────────────────────────────────
   ENRIQUECEDOR PRINCIPAL POR PRODUCTO
──────────────────────────────────────────── */
async function enrichProduct(base) {
  console.log(`[Scraper] 🔍  ${base.id} — buscando "${base.mlQuery}" en ML ${ML_SITE}…`);

  // 1. Búsqueda en ML
  const mlResults = await searchML(base.mlQuery);
  await sleep(REQUEST_DELAY);

  // 2. Imagen HD del primer resultado (si existe)
  let mainImage = base.image;  // fallback a imagen local
  if (mlResults.length > 0 && mlResults[0].mlId) {
    // Intentar obtener imagen HD; si falla, usar thumbnail
    const hdImage = await getMLItemImage(mlResults[0].mlId).catch(() => null);
    await sleep(REQUEST_DELAY / 2);
    mainImage = hdImage || mlResults[0].thumbnail || base.image;
  }

  // 3. Generar precios por tienda usando ML como ancla
  const storePrices    = generateStorePrices(base, mlResults);
  const inStockPrices  = storePrices.filter(s => s.stockPill !== 'out');
  const bestPrice      = inStockPrices[0]           ?? storePrices[0];
  const worstPrice     = inStockPrices[inStockPrices.length - 1] ?? storePrices[storePrices.length - 1];
  const avgPrice       = parseFloat(
    (inStockPrices.reduce((s, p) => s + p.price, 0) / (inStockPrices.length || 1)).toFixed(2)
  );
  const savings        = parseFloat((worstPrice.price - bestPrice.price).toFixed(2));

  // 4. Historial simulado anclado al precio real de ML
  const priceHistory = generatePriceHistory(bestPrice.price);

  // 5. Título preferido: del primer resultado ML (más descriptivo) o el del catálogo
  const mlTitle = mlResults[0]?.title;

  const enriched = {
    ...base,
    // Si ML encontró un título más específico, usarlo como referencia (pero mantener
    // el nombre corto del catálogo en `name` para la UI):
    mlTitle:      mlTitle || base.name,
    image:        mainImage,
    storePrices,
    bestPrice:    bestPrice.price,
    worstPrice:   worstPrice.price,
    avgPrice,
    savings,
    storesTotal:  storePrices.length,
    storesInStock:inStockPrices.length,
    priceHistory,
    updatedAgo:   `Hace ${Math.floor(Math.random() * 50) + 5} min`,
    scrapedAt:    new Date().toISOString(),
    price:        bestPrice.price,   // alias para el frontend
    mlResultsCount: mlResults.length,
  };

  console.log(
    `[Scraper] ✅  ${base.id} — ${mlResults.length} resultados ML | ` +
    `mejor precio: $${bestPrice.price.toFixed(2)} (${bestPrice.storeName})`
  );

  return enriched;
}

/* ────────────────────────────────────────────
   API PÚBLICA DEL MÓDULO
   Mismo contrato que el scraper anterior
   → productCache.js no necesita cambios.
──────────────────────────────────────────── */

/** Enriquece todos los productos del catálogo base con datos de ML. */
async function scrapeAll() {
  const results = [];
  for (const product of BASE_PRODUCTS) {
    try {
      results.push(await enrichProduct(product));
    } catch (err) {
      console.error(`[Scraper] ❌  Error en ${product.id}: ${err.message}`);
      // Fallback mínimo: producto base con precios generados sin ancla ML
      results.push(_fallback(product));
    }
    // Pausa entre productos para respetar el rate-limit de ML (10 req/s)
    await sleep(REQUEST_DELAY);
  }
  return results;
}

/** Enriquece un único producto por ID. */
async function scrapeById(productId) {
  const base = BASE_PRODUCTS.find(p => p.id === productId);
  if (!base) return null;
  try {
    return await enrichProduct(base);
  } catch (err) {
    console.error(`[Scraper] ❌  scrapeById(${productId}): ${err.message}`);
    return _fallback(base);
  }
}

/** Búsqueda de texto sobre un array de productos ya enriquecidos. */
function searchProducts(query, allProducts) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return allProducts.filter(p =>
    [p.name, p.brand, p.category, p.description, p.mlTitle].some(f =>
      f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}

/** Devuelve el catálogo base con precios simulados (sin llamadas a ML).
 *  Útil para arranque inmediato mientras el scraping se completa en background. */
function getBaseProducts() {
  return BASE_PRODUCTS.map(p => _fallback(p));
}

/** Fallback: producto con precios generados a partir del basePrice. */
function _fallback(p) {
  const storePrices = generateStorePrices(p, []);
  const inStock     = storePrices.filter(s => s.stockPill !== 'out');
  return {
    ...p,
    image:        p.image,
    storePrices,
    bestPrice:    inStock[0]?.price ?? p.basePrice,
    worstPrice:   inStock[inStock.length - 1]?.price ?? p.basePrice * 1.22,
    avgPrice:     p.basePrice,
    savings:      parseFloat((p.basePrice * 0.32).toFixed(2)),
    storesTotal:  STORES.length,
    storesInStock:inStock.length,
    priceHistory: generatePriceHistory(p.basePrice),
    updatedAgo:   `Hace ${Math.floor(Math.random() * 50) + 2} min`,
    scrapedAt:    new Date().toISOString(),
    price:        inStock[0]?.price ?? p.basePrice,
    mlResultsCount: 0,
  };
}

module.exports = {
  scrapeAll,
  scrapeById,
  searchProducts,
  getBaseProducts,
  BASE_PRODUCTS,
  STORES,
  // Exportaciones adicionales para testing y diagnóstico
  searchML,
  getMLItemImage,
  toUSD,
  ML_SITE,
};
