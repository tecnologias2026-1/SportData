/**
 * ============================================
 * SportData — Web Scraper Multi-Tienda
 * ============================================
 * Extrae precios y datos de productos deportivos
 * de múltiples tiendas usando axios + cheerio.
 *
 * Tiendas soportadas:
 *  - Decathlon (scraping HTML)
 *  - MercadoLibre (API pública)
 *  - Generador enriquecido con variación de precios
 *
 * Uso:
 *   const scraper = require('./scraper');
 *   const products = await scraper.scrapeAll('zapatillas running');
 */

'use strict';

const axios   = require('axios');
const cheerio = require('cheerio');

/* ────────────────────────────────────────────
   CONFIGURACIÓN GLOBAL
──────────────────────────────────────────── */
const TIMEOUT     = 12000;   // ms por petición
const DELAY_MS    = 800;     // pausa entre requests
const MAX_RETRIES = 2;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Connection': 'keep-alive',
};

/* ────────────────────────────────────────────
   UTILIDADES
──────────────────────────────────────────── */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePrice(raw) {
  if (!raw) return null;
  const clean = String(raw).replace(/[^\d.,]/g, '').replace(',', '.');
  const val   = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function slugify(text) {
  return String(text).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchPage(url, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
      return res.data;
    } catch (err) {
      if (i === retries) throw err;
      await sleep(DELAY_MS * (i + 1));
    }
  }
}

/* ────────────────────────────────────────────
   CATÁLOGO BASE (enriquecido con datos reales)
   Se usa como fallback y como fuente de metadatos
──────────────────────────────────────────── */
const BASE_PRODUCTS = [
  {
    id: 'NK-RNP-001', name: 'Zapatillas Running Pro', brand: 'Nike',
    category: 'calzado', basePrice: 89.99,
    image: '../assets/img/main_produc_zapatillas.jpg',
    searchQuery: 'zapatillas running nike',
    description: 'Diseñadas para corredores que buscan máximo rendimiento y comodidad. Combinan tecnología avanzada con un diseño moderno. Perfectas para entrenamientos diarios y competencias de alto nivel.',
    specs: {
      material: 'Mesh de nylon + poliéster reciclado', suela: 'Goma de carbono',
      peso: '245 g (talla 42)', drop: '10 mm',
      amortiguacion: 'Air Max Cushioning System', tipoUso: 'Carretera / asfalto',
      durabilidad: '500–800 km', tipoPie: 'Neutro',
      tecnologia: 'Flyknit + Zoom Air', nivelUsuario: 'Principiante → Avanzado',
    },
    sizes: ['36','37','38','39','40','41','42','43','44','45'],
    colors: [
      { name: 'Negro',         hex: '#000000' },
      { name: 'Azul Eléctrico',hex: '#3B82F6' },
      { name: 'Rojo',          hex: '#EF4444' },
      { name: 'Naranja',       hex: '#F59E0B' },
      { name: 'Blanco',        hex: '#FFFFFF' },
    ],
    rating: 4.5, reviews: 128,
  },
  {
    id: 'AD-BOT-002', name: 'Botín Skateboarding Elite', brand: 'Adidas',
    category: 'calzado', basePrice: 45.00,
    image: '../assets/img/botin_skateboarding.jpg',
    searchQuery: 'botin skateboarding adidas',
    description: 'Botín especializado para skateboarding con soporte lateral reforzado y protección en puntos de desgaste. Diseño clásico con tecnología moderna para máxima durabilidad y control del patín.',
    specs: {
      material: 'Cuero sintético con refuerzos de TPU', suela: 'Goma vulcanizada',
      peso: '320 g (talla 42)', drop: '5 mm',
      amortiguacion: 'Espuma EVA de alta densidad', tipoUso: 'Skateboarding',
      durabilidad: '300–500 km', tipoPie: 'Normal',
      tecnologia: 'VULC Construction + Cup Sole', nivelUsuario: 'Principiante → Avanzado',
    },
    sizes: ['36','37','38','39','40','41','42','43','44'],
    colors: [
      { name: 'Negro', hex: '#000000' },
      { name: 'Blanco',hex: '#FFFFFF' },
      { name: 'Gris',  hex: '#808080' },
    ],
    rating: 4.5, reviews: 89,
  },
  {
    id: 'NK-MOCH-003', name: 'Mochila Yoga Premium', brand: 'Nike',
    category: 'ropa', basePrice: 35.99,
    image: '../assets/img/mochila de yoga.jpg',
    searchQuery: 'mochila yoga nike premium',
    description: 'Mochila premium diseñada para yoga y actividades fitness. Con compartimentos especializados, correas ergonómicas y materiales sostenibles. Incluye bolsillo aislante para líquidos.',
    specs: {
      material: 'Poliéster reciclado 100%', capacidad: '20 L',
      peso: '480 g', resistenciaAgua: 'Sí — tratamiento DWR',
      compartimentos: '5 bolsillos + organizador', correas: 'Ergonómicas acolchadas',
      ventilacion: 'Paneles de malla transpirable', tecnologia: 'Nike Dry',
      tipoPie: 'N/A', nivelUsuario: 'Todos los niveles',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Negro', hex: '#000000' },
      { name: 'Rojo',  hex: '#EF4444' },
      { name: 'Azul',  hex: '#3B82F6' },
    ],
    rating: 4.8, reviews: 156,
  },
  {
    id: 'PU-CAM-004', name: 'Camiseta Deportiva DryCell', brand: 'Puma',
    category: 'ropa', basePrice: 29.99,
    image: '../assets/img/main_produc_camiseta.jpg',
    searchQuery: 'camiseta deportiva puma drycell',
    description: 'Camiseta deportiva versátil con tecnología DryCell que mantiene la piel seca y fresca durante el ejercicio más intenso. Corte regular sin restricciones de movimiento.',
    specs: {
      material: 'Poliéster 100%', peso: '150 g',
      corte: 'Regular fit', tecnologia: 'DryCell — gestión de humedad',
      costuras: 'Planas — sin rozaduras', transpirabilidad: 'Alta',
      elasticidad: 'Elástica en 4 direcciones', tipoPie: 'N/A',
      durabilidad: '2–3 años con cuidado adecuado', nivelUsuario: 'Todos los niveles',
    },
    sizes: ['XS','S','M','L','XL','XXL'],
    colors: [
      { name: 'Negro',hex: '#000000' },
      { name: 'Blanco',hex: '#FFFFFF' },
      { name: 'Azul', hex: '#3B82F6' },
      { name: 'Rojo', hex: '#EF4444' },
    ],
    rating: 3.9, reviews: 102,
  },
  {
    id: 'AD-BAL-005', name: 'Balón de Fútbol Telstar Pro', brand: 'Adidas',
    category: 'balones', basePrice: 35.99,
    image: '../assets/img/balon de futbol.jpg',
    searchQuery: 'balon futbol adidas telstar',
    description: 'Balón de fútbol profesional con paneles termosellados para máxima durabilidad y vuelo predecible. Diseño de bajo rebote y control óptimo en superficies naturales y artificiales.',
    specs: {
      material: 'Cuero sintético PU + vejiga de butilo', peso: '410–450 g',
      circunferencia: '68–70 cm', paneles: '32 paneles termosellados',
      presion: '0.6–1.1 bar', superficie: 'Césped natural y artificial',
      tecnologia: 'Termo-bonding sin costuras externas', tipoPie: 'N/A',
      durabilidad: '1–2 temporadas', nivelUsuario: 'Amateur → Profesional',
    },
    sizes: ['Único (Oficial)'],
    colors: [
      { name: 'Blanco/Negro', hex: '#FFFFFF' },
      { name: 'Blanco/Azul',  hex: '#DBEAFE' },
    ],
    rating: 4.2, reviews: 201,
  },
  {
    id: 'NK-MANC-006', name: 'Mancuerna Ajustable FlexPro', brand: 'Nike',
    category: 'fitness', basePrice: 120.00,
    image: '../assets/img/mancuerna ajustable.jpg',
    searchQuery: 'mancuerna ajustable nike gym',
    description: 'Mancuerna ajustable con incrementos de 2.5 kg ideal para entrenamientos progresivos de fuerza. Agarre ergonómico antideslizante y sistema de ajuste rápido en 3 segundos.',
    specs: {
      material: 'Hierro fundido + agarre neopreno', pesoRango: '2.5–20 kg (ajustable)',
      incremento: 'Pasos de 2.5 kg', ajuste: 'Sistema de clip rápido',
      dimensions: 'Compactas — ahorra espacio', balance: 'Perfectamente balanceada',
      tecnologia: 'DialTech Quick Adjust', tipoPie: 'N/A',
      durabilidad: '5+ años uso intenso', nivelUsuario: 'Todos los niveles',
    },
    sizes: ['2.5kg','5kg','7.5kg','10kg','12.5kg','15kg','17.5kg','20kg'],
    colors: [
      { name: 'Negro', hex: '#000000' },
      { name: 'Gris',  hex: '#808080' },
    ],
    rating: 4.1, reviews: 78,
  },
  {
    id: 'HM-BAND-007', name: 'Banda de Entrenamiento ResistPro', brand: 'Hummel',
    category: 'gimnasio', basePrice: 24.99,
    image: '../assets/img/banda entrenamiento.jpg',
    searchQuery: 'banda elastica entrenamiento resistencia gym',
    description: 'Banda elástica de entrenamiento con 4 niveles de resistencia. Ideal para rehabilitación, pilates y entrenamiento funcional. Fabricada en látex natural sin ftalatos, apta para uso diario.',
    specs: {
      material: 'Látex natural sin ftalatos', resistencia: '4 niveles (Ligero → Extra fuerte)',
      largo: '120 cm', ancho: '15 cm',
      ejercicios: '100+ ejercicios posibles', portabilidad: 'Ultra portátil (200 g)',
      tecnologia: 'NaturalFlex Latex', tipoPie: 'N/A',
      durabilidad: '2–3 años uso regular', nivelUsuario: 'Todos los niveles',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Rojo',    hex: '#EF4444' },
      { name: 'Verde',   hex: '#10B981' },
      { name: 'Azul',    hex: '#3B82F6' },
      { name: 'Púrpura', hex: '#8B5CF6' },
    ],
    rating: 4.5, reviews: 134,
  },
  {
    id: 'PU-GAF-008', name: 'Gafas de Natación Aqua Pro', brand: 'Puma',
    category: 'natacion', basePrice: 24.99,
    image: '../assets/img/gafas natacion.jpg',
    searchQuery: 'gafas natacion puma profesional',
    description: 'Gafas de natación profesionales con lentes anti-empañamiento permanente y protección UV 400. Montura de silicona hipoalergénica para horas de entrenamiento sin molestias.',
    specs: {
      lente: 'Policarbonato UV 400', antiEmpañamiento: 'Revestimiento permanente DualCoat',
      montura: 'Silicona hipoalergénica', campVisual: '180°',
      sumergible: 'Completamente sumergible', resistenciaCloro: 'Alta — tratado',
      tecnologia: 'SwimTech Anti-Fog', tipoPie: 'N/A',
      durabilidad: '2 años uso regular', nivelUsuario: 'Principiante → Avanzado',
    },
    sizes: ['Ajustable'],
    colors: [
      { name: 'Negro', hex: '#000000' },
      { name: 'Blanco',hex: '#FFFFFF' },
      { name: 'Azul',  hex: '#3B82F6' },
    ],
    rating: 4.3, reviews: 95,
  },
  {
    id: 'NK-ZAP-009', name: 'Zapatillas Training Crossfit', brand: 'Nike',
    category: 'calzado', basePrice: 75.00,
    image: '../assets/img/zapatillas running.jpg',
    searchQuery: 'zapatillas training crossfit nike',
    description: 'Zapatillas de entrenamiento versátiles para crossfit, gym y deportes. Soporte lateral reforzado y amortiguación equilibrada para múltiples actividades de alta intensidad.',
    specs: {
      material: 'Malla reforzada + sintético', suela: 'Goma de tracción multidireccional',
      peso: '280 g (talla 42)', drop: '8 mm',
      amortiguacion: 'React Foam', tipoUso: 'Crossfit, Gym, Deportes múltiples',
      durabilidad: '600–900 horas uso', tipoPie: 'Neutro',
      tecnologia: 'Metcon React', nivelUsuario: 'Todos los niveles',
    },
    sizes: ['36','37','38','39','40','41','42','43','44','45'],
    colors: [
      { name: 'Negro',     hex: '#000000' },
      { name: 'Gris',      hex: '#808080' },
      { name: 'Azul Marino',hex: '#1E40AF' },
      { name: 'Rojo',      hex: '#EF4444' },
    ],
    rating: 4.7, reviews: 167,
  },
  {
    id: 'SP-BAL-010', name: 'Balón de Baloncesto All Court', brand: 'Spalding',
    category: 'balones', basePrice: 45.00,
    image: '../assets/img/main_produc_basquet.jpg',
    searchQuery: 'balon baloncesto spalding oficial',
    description: 'Balón de baloncesto oficial Spalding con cubierta de cuero sintético de alta calidad. Apto para cancha cubierta y al aire libre con grip excepcional en toda condición.',
    specs: {
      material: 'Cuero sintético premium', peso: '600 g',
      circunferencia: '75.5–78 cm', vejiga: 'Butilo — retención de presión',
      superficie: 'Interior y exterior', presion: '7–9 PSI',
      tecnologia: 'Neverflat Technology', tipoPie: 'N/A',
      durabilidad: '2–3 temporadas', nivelUsuario: 'Recreativo → Competitivo',
    },
    sizes: ['Único (Oficial)'],
    colors: [
      { name: 'Naranja/Negro', hex: '#F59E0B' },
      { name: 'Rojo/Negro',    hex: '#EF4444' },
    ],
    rating: 4.8, reviews: 156,
  },
  {
    id: 'MK-ESTER-011', name: 'Esterilla de Yoga Premium Pro Lite', brand: 'Manduka',
    category: 'fitness', basePrice: 35.99,
    image: '../assets/img/main_produc_estirilla.jpg',
    searchQuery: 'esterilla yoga manduka premium',
    description: 'Esterilla de yoga premium con amortiguación superior y base antideslizante de doble cara. Diseño reversible con colores vibrantes para todas las prácticas de yoga.',
    specs: {
      material: 'Poliuretano de célula cerrada', grosor: '4.7 mm',
      peso: '1.6 kg', dimensiones: '180 × 61 cm',
      agarre: 'Doble cara antideslizante', amortiguacion: 'Superior — absorbe impacto',
      tecnologia: 'PROlite Closed-Cell Surface', tipoPie: 'N/A',
      durabilidad: '5–10 años cuidado adecuado', nivelUsuario: 'Principiante → Experto',
    },
    sizes: ['Única'],
    colors: [
      { name: 'Púrpura',    hex: '#8B5CF6' },
      { name: 'Azul Océano',hex: '#0369A1' },
      { name: 'Verde Salvia',hex: '#16A34A' },
      { name: 'Rosa',       hex: '#EC4899' },
    ],
    rating: 4.7, reviews: 189,
  },
];

/* ────────────────────────────────────────────
   TIENDAS DEFINIDAS CON SUS CARACTERÍSTICAS
──────────────────────────────────────────── */
const STORES = [
  { name: 'Amazon Sports',    bias: -0.10, shipping: 'Gratis',    traffic: '2.4B/mes', rating: 4.7, badge: 'AMZ',  color: '#ff9900' },
  { name: 'Decathlon',        bias: -0.05, shipping: '$4.99',     traffic: '90M/mes',  rating: 4.5, badge: 'DEC',  color: '#0082c8' },
  { name: 'SportZone',        bias:  0.00, shipping: 'Gratis',    traffic: '45M/mes',  rating: 4.4, badge: 'SPZ',  color: '#e04d4d' },
  { name: 'FitnessOutlet',    bias:  0.05, shipping: '$6.99',     traffic: '28M/mes',  rating: 4.3, badge: 'FIT',  color: '#1a1a2e' },
  { name: 'Reebok Store',     bias:  0.08, shipping: 'Gratis',    traffic: '35M/mes',  rating: 4.2, badge: 'RBK',  color: '#2d2d2d' },
  { name: 'Nike Official',    bias:  0.15, shipping: 'Gratis',    traffic: '180M/mes', rating: 4.8, badge: 'NIKE', color: '#cc0000' },
  { name: 'MercadoSports',    bias:  0.18, shipping: '$9.99',     traffic: '20M/mes',  rating: 4.0, badge: 'MKT',  color: '#666666' },
  { name: 'RunnerWorld',      bias:  0.22, shipping: '$7.50',     traffic: '12M/mes',  rating: 4.1, badge: 'RUN',  color: '#8B4513' },
];

/* ────────────────────────────────────────────
   SCRAPER: MERCADOLIBRE (API PÚBLICA)
──────────────────────────────────────────── */
async function scrapeMercadoLibre(query) {
  // Usamos el sitio MLA (Argentina) como base, puedes cambiarlo a MCO (Colombia) o MLM (México)
  const url = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=5`;
  try {
    const res  = await axios.get(url, { timeout: TIMEOUT });
    const data = res.data;
    if (!data.results || !data.results.length) return [];

    return data.results.slice(0, 5).map(item => ({
      source:    'MercadoLibre',
      title:     item.title,
      // Conversión aproximada a USD (o moneda base). Ajustar según el país del sitio.
      price:     item.currency_id === 'ARS' ? item.price * 0.0011 : item.price, 
      currency:  item.currency_id,
      url:       item.permalink,
      thumbnail: item.thumbnail ? item.thumbnail.replace('http://', 'https://') : null,
    }));
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────
   SCRAPER: DECATHLON (HTML scraping)
──────────────────────────────────────────── */
async function scrapeDecathlon(query) {
  const url = `https://www.decathlon.es/es/search?Ntt=${encodeURIComponent(query)}`;
  try {
    const html = await fetchPage(url);
    const $    = cheerio.load(html);
    const results = [];

    $('[data-testid="product-thumb"]').each((i, el) => {
      if (i >= 3) return false;
      const name  = $(el).find('[data-testid="product-title"]').text().trim();
      const price = parsePrice($(el).find('[data-testid="product-price"]').text());
      const img   = $(el).find('img').first().attr('src');
      const link  = $(el).find('a').first().attr('href');
      if (name && price) {
        results.push({ source: 'Decathlon', title: name, price, url: 'https://www.decathlon.es' + (link || ''), thumbnail: img });
      }
    });

    // Selector alternativo si cambia el HTML
    if (!results.length) {
      $('article.product-card, [class*="ProductCard"]').each((i, el) => {
        if (i >= 3) return false;
        const name  = $(el).find('h2, h3, [class*="title"]').first().text().trim();
        const price = parsePrice($(el).find('[class*="price"]').first().text());
        if (name && price) {
          results.push({ source: 'Decathlon', title: name, price, url: url });
        }
      });
    }
    return results;
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────
   GENERADOR DE PRECIOS POR TIENDA
   Aplica variación realista sobre el precio base
──────────────────────────────────────────── */
function generateStorePrices(baseProduct, scrapedItems = []) {
  // Precio de referencia: scraped si existe, sino el base
  const refPrice = scrapedItems.length
    ? scrapedItems.reduce((s, p) => s + p.price, 0) / scrapedItems.length
    : baseProduct.basePrice;

  const now = new Date();
  const lastUpdate = `Hace ${Math.floor(Math.random() * 55) + 5} min`;

  return STORES.map((store, idx) => {
    const raw    = refPrice * (1 + store.bias) + (Math.random() - 0.5) * refPrice * 0.03;
    const price  = Math.max(1, parseFloat(raw.toFixed(2)));
    const stocks = [
      { label: 'En Stock',        qty: Math.floor(Math.random() * 80) + 10, pill: 'ok'  },
      { label: 'En Stock',        qty: Math.floor(Math.random() * 40) + 10, pill: 'ok'  },
      { label: 'Pocas unidades',  qty: Math.floor(Math.random() * 8)  + 1,  pill: 'low' },
      { label: 'Sin stock',       qty: 0,                                    pill: 'out' },
    ];
    const stockIdx = idx === STORES.length - 1 ? 3 : (price < refPrice * 1.02 ? 0 : idx % 3 === 0 ? 2 : 1);
    const stock    = stocks[stockIdx];
    const delivery = store.shipping === 'Gratis'
      ? `${Math.floor(Math.random() * 3) + 1}–${Math.floor(Math.random() * 3) + 3} días hábiles`
      : `${Math.floor(Math.random() * 4) + 2}–${Math.floor(Math.random() * 3) + 5} días hábiles`;

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
      url:          '#',
    };
  });

  // Mapeamos los resultados REALES del scraper para que aparezcan en la lista
  const realResults = scrapedItems.map(item => ({
    storeName:    item.source,
    storeColor:   '#FFE600', // Amarillo corporativo de MercadoLibre
    storeBadge:   'ML',
    storeTraffic: '500M/mes',
    storeRating:  4.5,
    price:        parseFloat(item.price.toFixed(2)),
    shipping:     'Ver en tienda',
    delivery:     'Según vendedor',
    stock:        'En Stock',
    stockQty:     10,
    stockPill:    'ok',
    lastUpdate:   'En vivo',
    url:          item.url, // Enlace real al producto
  }));

  // Combinamos tiendas reales con las simuladas y ordenamos por precio
  return [...realResults, ...storePrices].sort((a, b) => a.price - b.price);
}

/* ────────────────────────────────────────────
   HISTORIAL DE PRECIOS (30 días simulado)
──────────────────────────────────────────── */
function generatePriceHistory(basePrice) {
  const buildSeries = (base, variance, days) => {
    let v = base;
    return Array.from({ length: days }, () => {
      v += (Math.random() - 0.5) * variance;
      v  = Math.max(base * 0.88, Math.min(base * 1.18, v));
      return parseFloat(v.toFixed(2));
    });
  };
  const labels30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  });
  return {
    labels: labels30,
    amazon:   buildSeries(basePrice * 0.90, basePrice * 0.02, 30),
    decathlon:buildSeries(basePrice * 0.95, basePrice * 0.015,30),
    official: buildSeries(basePrice * 1.10, basePrice * 0.01, 30),
  };
}

/* ────────────────────────────────────────────
   ENSAMBLADOR PRINCIPAL POR PRODUCTO
──────────────────────────────────────────── */
async function enrichProduct(baseProduct) {
  // 1. Obtener datos reales de múltiples fuentes
  let scrapedItems = [];

  try {
    const mlData = await scrapeMercadoLibre(baseProduct.searchQuery);
    if (mlData) scrapedItems.push(...mlData);

    const decathlonData = await scrapeDecathlon(baseProduct.searchQuery);
    if (decathlonData) scrapedItems.push(...decathlonData);
  } catch (err) {
    console.warn(`[Scraper] Error obteniendo datos externos para ${baseProduct.id}:`, err.message);
  }

  // 2. Generar precios por tienda con variación real
  const storePrices = generateStorePrices(baseProduct, scrapedItems);
  const bestPrice   = storePrices.find(s => s.stockPill !== 'out') || storePrices[0];
  const worstPrice  = [...storePrices].reverse().find(s => s.stockPill !== 'out') || storePrices[storePrices.length - 1];
  const storesInStock = storePrices.filter(s => s.stockPill !== 'out').length;

  // 3. Calcular estadísticas de precio
  const validPrices = storePrices.filter(s => s.stockPill !== 'out').map(s => s.price);
  const avgPrice    = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const savings     = parseFloat((worstPrice.price - bestPrice.price).toFixed(2));

  // 4. Historial de precios
  const priceHistory = generatePriceHistory(baseProduct.basePrice);

  // 5. Última actualización
  const updatedAgo = `Hace ${Math.floor(Math.random() * 50) + 5} min`;

  return {
    ...baseProduct,
    storePrices,
    bestPrice:      bestPrice.price,
    worstPrice:     worstPrice.price,
    avgPrice:       parseFloat(avgPrice.toFixed(2)),
    savings,
    storesTotal:    STORES.length,
    storesInStock,
    priceHistory,
    updatedAgo,
    scrapedAt:      new Date().toISOString(),
    // Compatibilidad con el frontend existente
    price:          bestPrice.price,
    image:          baseProduct.image,
  };
}

/* ────────────────────────────────────────────
   API PÚBLICA DEL MÓDULO
──────────────────────────────────────────── */

/**
 * Scrape completo de todos los productos del catálogo.
 * Devuelve el array enriquecido listo para la API.
 */
async function scrapeAll() {
  const results = [];
  for (const product of BASE_PRODUCTS) {
    try {
      const enriched = await enrichProduct(product);
      results.push(enriched);
    } catch (err) {
      console.error(`[Scraper] Error en ${product.id}:`, err.message);
      // Fallback mínimo
      results.push({
        ...product,
        price:         product.basePrice,
        storePrices:   generateStorePrices(product, []),
        bestPrice:     product.basePrice * 0.90,
        worstPrice:    product.basePrice * 1.22,
        avgPrice:      product.basePrice,
        savings:       parseFloat((product.basePrice * 0.32).toFixed(2)),
        storesTotal:   STORES.length,
        storesInStock: 6,
        priceHistory:  generatePriceHistory(product.basePrice),
        updatedAgo:    'Hace 1 min',
        scrapedAt:     new Date().toISOString(),
      });
    }
  }
  return results;
}

/**
 * Scrape de un único producto por ID.
 */
async function scrapeById(productId) {
  const base = BASE_PRODUCTS.find(p => p.id === productId);
  if (!base) return null;
  return enrichProduct(base);
}

/**
 * Búsqueda de productos por texto.
 */
async function searchProducts(query, allProducts) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return allProducts.filter(p =>
    [p.name, p.brand, p.category, p.description].some(field =>
      field && field.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  );
}

/**
 * Devuelve el catálogo base (sin scraping) para uso inmediato.
 */
function getBaseProducts() {
  return BASE_PRODUCTS.map(p => ({
    ...p,
    price:       p.basePrice,
    storePrices: generateStorePrices(p, []),
    bestPrice:   parseFloat((p.basePrice * 0.90).toFixed(2)),
    worstPrice:  parseFloat((p.basePrice * 1.22).toFixed(2)),
    avgPrice:    p.basePrice,
    savings:     parseFloat((p.basePrice * 0.32).toFixed(2)),
    storesTotal: STORES.length,
    storesInStock: 6,
    priceHistory:generatePriceHistory(p.basePrice),
    updatedAgo:  `Hace ${Math.floor(Math.random() * 50) + 2} min`,
    scrapedAt:   new Date().toISOString(),
  }));
}

module.exports = {
  scrapeAll,
  scrapeById,
  searchProducts,
  getBaseProducts,
  BASE_PRODUCTS,
  STORES,
};
