/**
 * ============================================
 * SportData — Products Module (API-driven)
 * ============================================
 * Obtiene productos desde la API del backend con
 * fallback a datos locales si el servidor no está
 * disponible.
 *
 * Expone window.SportDataProducts con:
 *   .getAll()          → Promise<Product[]>
 *   .getById(id)       → Promise<Product|null>
 *   .search(q)         → Promise<Product[]>
 *   .getByCategory(c)  → Promise<Product[]>
 *   .refreshCache()    → Promise<void>
 */

(function () {
  'use strict';

  // Cambiamos el localhost por el dominio público de Netlify donde reside la API
  const API_BASE = 'https://sportdata001.netlify.app/api/products';
  const TIMEOUT  = 20000;  // Aumentado a 20s para permitir que el scraper termine

  /* ── Caché en memoria del frontend ─────── */
  let _cache     = null;
  let _cacheTime = 0;
  const CACHE_TTL = 5 * 60 * 1000;  // 5 min

  /* ── Datos de respaldo (FALLBACK) ────────
     Se usan si el servidor no está activo.
     Contienen todos los campos enriquecidos.
  ──────────────────────────────────────── */
  const FALLBACK_STORES = [
    { storeName:'Amazon Sports',  storeColor:'#ff9900', storeBadge:'AMZ',  storeTraffic:'2.4B/mes', storeRating:4.7, shipping:'Gratis',  delivery:'2-3 días', stockPill:'ok'  },
    { storeName:'Decathlon',      storeColor:'#0082c8', storeBadge:'DEC',  storeTraffic:'90M/mes',  storeRating:4.5, shipping:'$4.99',   delivery:'3-5 días', stockPill:'ok'  },
    { storeName:'SportZone',      storeColor:'#e04d4d', storeBadge:'SPZ',  storeTraffic:'45M/mes',  storeRating:4.4, shipping:'Gratis',  delivery:'1-2 días', stockPill:'low' },
    { storeName:'FitnessOutlet',  storeColor:'#1a1a2e', storeBadge:'FIT',  storeTraffic:'28M/mes',  storeRating:4.3, shipping:'$6.99',   delivery:'4-6 días', stockPill:'ok'  },
    { storeName:'Nike Official',  storeColor:'#cc0000', storeBadge:'NIKE', storeTraffic:'180M/mes', storeRating:4.8, shipping:'Gratis',  delivery:'2-4 días', stockPill:'ok'  },
    { storeName:'MercadoSports',  storeColor:'#666666', storeBadge:'MKT',  storeTraffic:'20M/mes',  storeRating:4.0, shipping:'$9.99',   delivery:'5-7 días', stockPill:'ok'  },
    { storeName:'RunnerWorld',    storeColor:'#8B4513', storeBadge:'RUN',  storeTraffic:'12M/mes',  storeRating:4.1, shipping:'$7.50',   delivery:'3-5 días', stockPill:'out' },
    { storeName:'Reebok Store',   storeColor:'#2d2d2d', storeBadge:'RBK',  storeTraffic:'35M/mes',  storeRating:4.2, shipping:'Gratis',  delivery:'2-4 días', stockPill:'ok'  },
  ];

  function makeFallbackPrices(base) {
    const biases = [-0.10,-0.05,0,0.05,0.15,0.18,0.22,0.08];
    return FALLBACK_STORES.map((s, i) => ({
      ...s,
      price:     parseFloat((base * (1 + biases[i])).toFixed(2)),
      stockQty:  s.stockPill === 'out' ? 0 : s.stockPill === 'low' ? 4 : 35,
      lastUpdate:`Hace ${Math.floor(Math.random()*50)+5} min`,
      url:       '#',
    })).sort((a, b) => a.price - b.price);
  }

  function makePriceHistory(base) {
    const days = 30;
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - days + 1 + i);
      return d.toLocaleDateString('es', { day:'2-digit', month:'short' });
    });
    const series = (b, v) => {
      let x = b;
      return Array.from({ length: days }, () => {
        x += (Math.random() - 0.5) * v;
        return Math.max(b * 0.88, Math.min(b * 1.18, parseFloat(x.toFixed(2))));
      });
    };
    return { labels, amazon: series(base*0.90,base*0.02), decathlon: series(base*0.95,base*0.015), official: series(base*1.10,base*0.01) };
  }

  const FALLBACK_PRODUCTS = [
    {
      id:'NK-RNP-001', name:'Zapatillas Running Pro', brand:'Nike', category:'calzado',
      basePrice:89.99,
      image:'../assets/img/main_produc_zapatillas.jpg',
      description:'Diseñadas para corredores que buscan máximo rendimiento. Combinan tecnología Air Max con mesh transpirable de nylon y poliéster reciclado. Perfectas para entrenamientos diarios y competencias.',
      specs:{ material:'Mesh nylon + poliéster', suela:'Goma de carbono', peso:'245 g (talla 42)', drop:'10 mm', amortiguacion:'Air Max Cushioning', tipoUso:'Carretera / asfalto', durabilidad:'500–800 km', tipoPie:'Neutro', tecnologia:'Flyknit + Zoom Air', nivelUsuario:'Principiante → Avanzado' },
      sizes:['36','37','38','39','40','41','42','43','44','45'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Azul',hex:'#3B82F6'},{name:'Rojo',hex:'#EF4444'},{name:'Naranja',hex:'#F59E0B'},{name:'Blanco',hex:'#FFFFFF'}],
      rating:4.5, reviews:128,
    },
    {
      id:'AD-BOT-002', name:'Botín Skateboarding Elite', brand:'Adidas', category:'calzado',
      basePrice:45.00,
      image:'../assets/img/botin_skateboarding.jpg',
      description:'Botín especializado para skateboarding con soporte lateral reforzado y suela vulcanizada. Cuero sintético premium con protección en puntos de desgaste para máxima durabilidad.',
      specs:{ material:'Cuero sintético + TPU', suela:'Goma vulcanizada', peso:'320 g (talla 42)', drop:'5 mm', amortiguacion:'Espuma EVA', tipoUso:'Skateboarding', durabilidad:'300–500 km', tipoPie:'Normal', tecnologia:'VULC Construction', nivelUsuario:'Principiante → Avanzado' },
      sizes:['36','37','38','39','40','41','42','43','44'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Blanco',hex:'#FFFFFF'},{name:'Gris',hex:'#808080'}],
      rating:4.5, reviews:89,
    },
    {
      id:'NK-MOCH-003', name:'Mochila Yoga Premium', brand:'Nike', category:'ropa',
      basePrice:35.99,
      image:'../assets/img/mochila de yoga.jpg',
      description:'Mochila premium para yoga y fitness. Poliéster reciclado 100% con 5 compartimentos especializados, correas ergonómicas acolchadas y bolsillo aislante para hidratación.',
      specs:{ material:'Poliéster reciclado 100%', capacidad:'20 L', peso:'480 g', resistenciaAgua:'Sí — DWR', compartimentos:'5 bolsillos', correas:'Ergonómicas acolchadas', ventilacion:'Malla transpirable', tecnologia:'Nike Dry', tipoPie:'N/A', nivelUsuario:'Todos' },
      sizes:['Única'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Rojo',hex:'#EF4444'},{name:'Azul',hex:'#3B82F6'}],
      rating:4.8, reviews:156,
    },
    {
      id:'PU-CAM-004', name:'Camiseta Deportiva DryCell', brand:'Puma', category:'ropa',
      basePrice:29.99,
      image:'../assets/img/main_produc_camiseta.jpg',
      description:'Camiseta 100% poliéster con tecnología DryCell que evacúa la humedad hacia el exterior. Costuras planas para evitar rozaduras. Corte regular sin restricciones.',
      specs:{ material:'Poliéster 100%', peso:'150 g', corte:'Regular fit', tecnologia:'DryCell — gestión humedad', costuras:'Planas', transpirabilidad:'Alta', elasticidad:'4 direcciones', tipoPie:'N/A', durabilidad:'2–3 años', nivelUsuario:'Todos' },
      sizes:['XS','S','M','L','XL','XXL'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Blanco',hex:'#FFFFFF'},{name:'Azul',hex:'#3B82F6'},{name:'Rojo',hex:'#EF4444'}],
      rating:3.9, reviews:102,
    },
    {
      id:'AD-BAL-005', name:'Balón Fútbol Telstar Pro', brand:'Adidas', category:'balones',
      basePrice:35.99,
      image:'../assets/img/balon de futbol.jpg',
      description:'Balón de fútbol oficial con 32 paneles termosellados para vuelo predecible y durabilidad superior. Vejiga de butilo con excelente retención de presión.',
      specs:{ material:'Cuero sintético PU', peso:'410–450 g', circunferencia:'68–70 cm', paneles:'32 — termosellados', presion:'0.6–1.1 bar', superficie:'Natural y artificial', tecnologia:'Termo-bonding', tipoPie:'N/A', durabilidad:'1–2 temporadas', nivelUsuario:'Amateur → Pro' },
      sizes:['Único'],
      colors:[{name:'Blanco/Negro',hex:'#FFFFFF'},{name:'Blanco/Azul',hex:'#DBEAFE'}],
      rating:4.2, reviews:201,
    },
    {
      id:'NK-MANC-006', name:'Mancuerna Ajustable FlexPro', brand:'Nike', category:'fitness',
      basePrice:120.00,
      image:'../assets/img/mancuerna ajustable.jpg',
      description:'Mancuerna ajustable de 2.5 a 20 kg con sistema de clip rápido (3 segundos). Agarre ergonómico de neopreno antideslizante. Reemplaza un juego completo de 8 mancuernas.',
      specs:{ material:'Hierro fundido + neopreno', pesoRango:'2.5–20 kg', incremento:'Pasos 2.5 kg', ajuste:'Clip rápido', dimensions:'Compactas', balance:'Perfecta', tecnologia:'DialTech Adjust', tipoPie:'N/A', durabilidad:'5+ años', nivelUsuario:'Todos' },
      sizes:['2.5kg','5kg','7.5kg','10kg','12.5kg','15kg','17.5kg','20kg'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Gris',hex:'#808080'}],
      rating:4.1, reviews:78,
    },
    {
      id:'HM-BAND-007', name:'Banda Entrenamiento ResistPro', brand:'Hummel', category:'gimnasio',
      basePrice:24.99,
      image:'../assets/img/banda entrenamiento.jpg',
      description:'Banda elástica de látex natural (sin ftalatos) con 4 niveles de resistencia. Ultra portátil, 200 g. Compatible con 100+ ejercicios para rehabilitación, yoga y fitness funcional.',
      specs:{ material:'Látex natural sin ftalatos', resistencia:'4 niveles', largo:'120 cm', ancho:'15 cm', ejercicios:'+100 posibles', portabilidad:'200 g', tecnologia:'NaturalFlex', tipoPie:'N/A', durabilidad:'2–3 años', nivelUsuario:'Todos' },
      sizes:['Única'],
      colors:[{name:'Rojo',hex:'#EF4444'},{name:'Verde',hex:'#10B981'},{name:'Azul',hex:'#3B82F6'},{name:'Púrpura',hex:'#8B5CF6'}],
      rating:4.5, reviews:134,
    },
    {
      id:'PU-GAF-008', name:'Gafas Natación Aqua Pro', brand:'Puma', category:'natacion',
      basePrice:24.99,
      image:'../assets/img/gafas natacion.jpg',
      description:'Gafas profesionales con lentes de policarbonato UV 400 y revestimiento anti-empañamiento permanente DualCoat. Montura de silicona hipoalergénica y campo visual de 180°.',
      specs:{ lente:'Policarbonato UV 400', antiEmpañamiento:'DualCoat permanente', montura:'Silicona hipoalergénica', campVisual:'180°', sumergible:'Sí', resistenciaCloro:'Alta', tecnologia:'SwimTech Anti-Fog', tipoPie:'N/A', durabilidad:'2 años', nivelUsuario:'Principiante → Pro' },
      sizes:['Ajustable'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Blanco',hex:'#FFFFFF'},{name:'Azul',hex:'#3B82F6'}],
      rating:4.3, reviews:95,
    },
    {
      id:'NK-ZAP-009', name:'Zapatillas Training Crossfit', brand:'Nike', category:'calzado',
      basePrice:75.00,
      image:'../assets/img/zapatillas running.jpg',
      description:'Zapatillas versátiles para crossfit, gym y deportes de alta intensidad. Soporte lateral reforzado con React Foam y suela de goma multidireccional. Drop de 8 mm.',
      specs:{ material:'Malla reforzada + sintético', suela:'Goma multidireccional', peso:'280 g (talla 42)', drop:'8 mm', amortiguacion:'React Foam', tipoUso:'Crossfit, Gym, Multideporte', durabilidad:'600–900 h', tipoPie:'Neutro', tecnologia:'Metcon React', nivelUsuario:'Todos' },
      sizes:['36','37','38','39','40','41','42','43','44','45'],
      colors:[{name:'Negro',hex:'#000000'},{name:'Gris',hex:'#808080'},{name:'Azul',hex:'#1E40AF'},{name:'Rojo',hex:'#EF4444'}],
      rating:4.7, reviews:167,
    },
    {
      id:'SP-BAL-010', name:'Balón Baloncesto All Court', brand:'Spalding', category:'balones',
      basePrice:45.00,
      image:'../assets/img/main_produc_basquet.jpg',
      description:'Balón oficial Spalding con cuero sintético premium y tecnología Neverflat. Grip excepcional en piso duro y al aire libre. Vejiga de butilo para retención óptima de presión.',
      specs:{ material:'Cuero sintético premium', peso:'600 g', circunferencia:'75.5–78 cm', vejiga:'Butilo', superficie:'Interior y exterior', presion:'7–9 PSI', tecnologia:'Neverflat', tipoPie:'N/A', durabilidad:'2–3 temporadas', nivelUsuario:'Recreativo → Competitivo' },
      sizes:['Único'],
      colors:[{name:'Naranja/Negro',hex:'#F59E0B'},{name:'Rojo/Negro',hex:'#EF4444'}],
      rating:4.8, reviews:156,
    },
    {
      id:'MK-ESTER-011', name:'Esterilla Yoga Pro Lite', brand:'Manduka', category:'fitness',
      basePrice:35.99,
      image:'../assets/img/main_produc_estirilla.jpg',
      description:'Esterilla de poliuretano de célula cerrada con 4.7 mm de amortiguación. Superficie reversible antideslizante, 180×61 cm. Garantía de por vida con uso adecuado.',
      specs:{ material:'Poliuretano célula cerrada', grosor:'4.7 mm', peso:'1.6 kg', dimensiones:'180×61 cm', agarre:'Doble cara', amortiguacion:'Superior', tecnologia:'PROlite Closed-Cell', tipoPie:'N/A', durabilidad:'5–10 años', nivelUsuario:'Principiante → Experto' },
      sizes:['Única'],
      colors:[{name:'Púrpura',hex:'#8B5CF6'},{name:'Azul Océano',hex:'#0369A1'},{name:'Verde',hex:'#16A34A'},{name:'Rosa',hex:'#EC4899'}],
      rating:4.7, reviews:189,
    },
  ];

  function enrichFallback(p) {
    const sp = makeFallbackPrices(p.basePrice);
    const ok = sp.filter(s => s.stockPill !== 'out');
    return {
      ...p,
      price:        sp[0].price,
      storePrices:  sp,
      bestPrice:    sp[0].price,
      worstPrice:   sp[sp.length - 1].price,
      avgPrice:     parseFloat((ok.reduce((a,b) => a + b.price, 0) / ok.length).toFixed(2)),
      savings:      parseFloat((sp[sp.length-1].price - sp[0].price).toFixed(2)),
      storesTotal:  sp.length,
      storesInStock:ok.length,
      priceHistory: makePriceHistory(p.basePrice),
      updatedAgo:   `Hace ${Math.floor(Math.random()*50)+2} min`,
      scrapedAt:    new Date().toISOString(),
    };
  }

  /* ── Fetch helper con timeout ──────────── */
  async function fetchJSON(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ── Obtener todos los productos ──────── */
  async function getAll(params = {}) {
    if (_cache && Date.now() - _cacheTime < CACHE_TTL && !params.q && !params.category) {
      return _applyClientFilters(_cache, params);
    }
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await fetchJSON(`${API_BASE}${qs ? '?' + qs : ''}`);
      if (data.ok) {
        _cache = data.products;
        _cacheTime = Date.now();
        return data.products;
      }
    } catch { /* servidor no disponible → usar fallback */ }

    const fallback = FALLBACK_PRODUCTS.map(enrichFallback);
    _cache = fallback;
    _cacheTime = Date.now();
    return _applyClientFilters(fallback, params);
  }

  function _applyClientFilters(products, params) {
    let result = [...products];
    if (params.category && params.category !== 'todos') {
      result = result.filter(p => p.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.q) {
      const q = params.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      result = result.filter(p =>
        [p.name, p.brand, p.category].some(f =>
          f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)
        )
      );
    }
    if (params.maxPrice) result = result.filter(p => p.price <= +params.maxPrice);
    return result;
  }

  /* ── Obtener un producto por ID ────────── */
  async function getById(id) {
    // Primero intentar desde caché
    if (_cache) {
      const cached = _cache.find(p => p.id === id);
      if (cached) return cached;
    }
    // Luego API
    try {
      const data = await fetchJSON(`${API_BASE}/${id}`);
      if (data.ok) return data.product;
    } catch { /* fallback */ }
    // Fallback
    const base = FALLBACK_PRODUCTS.find(p => p.id === id);
    return base ? enrichFallback(base) : null;
  }

  /* ── Búsqueda ────────────────────────── */
  async function search(q) {
    try {
      const data = await fetchJSON(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      if (data.ok) return data.products;
    } catch { /* fallback */ }
    return _applyClientFilters(FALLBACK_PRODUCTS.map(enrichFallback), { q });
  }

  /* ── Por categoría ─────────────────────── */
  async function getByCategory(cat) {
    return getAll({ category: cat });
  }

  /* ── Invalidar caché ─────────────────── */
  function refreshCache() {
    _cache = null;
    _cacheTime = 0;
  }

  /* ── Compatibilidad con código legacy ─── */
  function getProductById(id) {
    // Versión síncrona para compatibilidad — usa fallback
    if (_cache) return _cache.find(p => p.id === id) || null;
    const base = FALLBACK_PRODUCTS.find(p => p.id === id);
    return base ? enrichFallback(base) : null;
  }

  function getAllProducts() {
    return _cache || FALLBACK_PRODUCTS.map(enrichFallback);
  }

  /* ── Exponer como API global ─────────── */
  window.SportDataProducts = {
    getAll,
    getById,
    search,
    getByCategory,
    refreshCache,
    // Compatibilidad legacy
    getProductById,
    getAllProducts,
    FALLBACK_PRODUCTS,
  };

  // Compatibilidad legacy: funciones globales que usa catalog.js y product.js
  window.getProductById    = getProductById;
  window.getAllProducts     = getAllProducts;
  window.searchProducts    = (q) => _applyClientFilters(getAllProducts(), { q });
  window.filterByCategory  = (c) => _applyClientFilters(getAllProducts(), { category: c });
  window.sortProducts      = (arr, by) => {
    const sorted = [...arr];
    if (by === 'price-asc')  sorted.sort((a,b) => a.price - b.price);
    if (by === 'price-desc') sorted.sort((a,b) => b.price - a.price);
    if (by === 'rating')     sorted.sort((a,b) => b.rating - a.rating);
    if (by === 'newest')     sorted.reverse();
    return sorted;
  };

})();
