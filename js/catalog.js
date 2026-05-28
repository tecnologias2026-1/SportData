/**
 * ================================================
 * SportData — Catalog Page JavaScript (ML-aware)
 * ================================================
 * Carga productos desde la API (scraper MercadoLibre),
 * los renderiza con datos enriquecidos: precio real,
 * ahorro vs precio más alto, tiendas monitoreadas,
 * indicador "en vivo" si los datos son frescos.
 */

(function () {
  'use strict';

  /* ── Estado ─────────────────────────────────── */
  const state = {
    search:     '',
    categories: [],
    brands:     [],
    stores:     [],
    maxPrice:   500,
    sortBy:     'relevance',
    favorites:  [],
    allProducts:[],
    loading:    true,
    dataSource: 'unknown', // 'local' | 'netlify' | 'fallback'
  };

  /* ── Init ────────────────────────────────────── */
  async function init() {
    if (typeof window.SportDataProducts === 'undefined') {
      console.error('SportDataProducts no está cargado.');
      renderProducts([]);
      return;
    }

    loadFavoritesFromStorage();
    setupHamburger();
    setupSidebar();
    setupSearch();
    setupSort();
    setupCategoryFilters();
    setupBrandFilters();
    setupStoreFilters();
    setupPriceRange();
    setupResetFilters();
    checkURLCategory();
    showSkeleton();

    try {
      state.allProducts = await window.SportDataProducts.getAll();
      const info = window.SportDataProducts.getSourceInfo();
      state.dataSource = info.source;
      updateNotificationBar(info);
      console.log(`[Catalog] ${state.allProducts.length} productos cargados (fuente: ${info.source})`);
    } catch (err) {
      console.warn('[Catalog] Error cargando productos:', err.message);
      state.allProducts = window.SportDataProducts.getAllProducts();
      state.dataSource  = 'fallback';
    }
 
    // ── NUEVO: si no hay productos, reintentar en 5 segundos ──────────────
    if (state.allProducts.length === 0) {
      updateNotificationBar({ source: 'retrying' });
      console.log('[Catalog] Sin productos, reintentando en 5s...');
      setTimeout(async () => {
        try {
          window.SportDataProducts.refreshCache();
          state.allProducts = await window.SportDataProducts.getAll();
          const info = window.SportDataProducts.getSourceInfo();
          state.dataSource = info.source;
          state.loading = false;
          updateNotificationBar(info);
          applyFilters();
          setupFavoriteButtons();
          setupProductNavigation();
          console.log(`[Catalog] Reintento exitoso: ${state.allProducts.length} productos`);
        } catch (e) {
          console.warn('[Catalog] Reintento fallido:', e.message);
        }
      }, 5000);
    }
    // Actualizar precio máximo del slider según datos reales
    const maxPriceReal = Math.max(...state.allProducts.map(p => p.worstPrice || p.price || 200));
    const sliderMax    = Math.ceil(maxPriceReal / 50) * 50 + 50;
    const slider = document.getElementById('priceRange');
    if (slider) {
      slider.max   = sliderMax;
      slider.value = sliderMax;
      state.maxPrice = sliderMax;
      const lbl = document.getElementById('priceValue');
      if (lbl) lbl.textContent = sliderMax;
    }

    state.loading = false;
    applyFilters();
    setupFavoriteButtons();
    setupProductNavigation();
  }

/* ── Actualizar barra de notificación ────────── */
function updateNotificationBar(info) {
  const bar = document.querySelector('.notification-bar');
  if (!bar) return;

  const leftEl  = bar.querySelector('.notification-bar__left span');
  const rightEl = bar.querySelector('.notification-bar__right');

  if (info.source === 'local' || info.source === 'netlify') {

    const count   = state.allProducts.length;
    const latency = info.latency ? ` · ${info.latency}ms` : '';

    if (leftEl) {
      leftEl.innerHTML =
        `<strong>● Datos en vivo desde MercadoLibre:</strong>
         ${count} productos scrapeados,
         precios actualizados en tiempo real${latency}`;
    }

    if (rightEl) {
      rightEl.textContent =
        `Fuente: API ${info.source === 'local' ? 'local' : 'Netlify'}
         · ${new Date().toLocaleTimeString('es', {
           hour:'2-digit',
           minute:'2-digit'
         })}`;
    }

    bar.style.background  = '#ecfdf5';
    bar.style.borderColor = '#a7f3d0';
    bar.style.color       = '#065f46';

  } else if (info.source === 'retrying') {

    if (leftEl) {
      leftEl.innerHTML =
        `<strong>⏳ Conectando con el servidor...</strong>
         Reintentando en 5 segundos`;
    }

    if (rightEl) {
      rightEl.textContent = 'Espera un momento';
    }

    bar.style.background  = '#eff6ff';
    bar.style.borderColor = '#bfdbfe';
    bar.style.color       = '#1e40af';

  } else {

    if (leftEl) {
      leftEl.innerHTML =
        `<strong>⚠ Datos de respaldo:</strong>
         Inicia el backend para obtener precios scrapeados de MercadoLibre`;
    }

    if (rightEl) {
      rightEl.textContent = 'Backend offline';
    }

    bar.style.background  = '#fefce8';
    bar.style.borderColor = '#fde68a';
    bar.style.color       = '#92400e';
  }
}

  /* ── Skeleton loader ────────────────────────── */
  function showSkeleton() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 6 }, () => `
      <article class="product-card product-card--skeleton" aria-hidden="true">
        <div class="product-card__image-container skeleton-box" style="height:200px"></div>
        <div class="product-card__content" style="gap:.75rem;padding:1rem">
          <div class="skeleton-box" style="height:11px;width:55%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:18px;width:85%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:11px;width:40%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:11px;width:65%;border-radius:4px;margin-top:4px"></div>
          <div class="skeleton-box" style="height:26px;width:48%;border-radius:4px;margin-top:6px"></div>
        </div>
        <div class="product-card__actions" style="padding:.75rem 1rem .875rem">
          <div class="skeleton-box" style="height:42px;border-radius:8px"></div>
        </div>
      </article>`).join('');
    injectStyles();
  }

  /* ── Inyectar estilos dinámicos ─────────────── */
  function injectStyles() {
    if (document.getElementById('sd-catalog-dyn-styles')) return;
    const s = document.createElement('style');
    s.id = 'sd-catalog-dyn-styles';
    s.textContent = `
      /* Skeleton */
      .skeleton-box {
        background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);
        background-size: 200% 100%;
        animation: sd-shimmer 1.4s infinite;
        border-radius: 6px;
      }
      @keyframes sd-shimmer {
        0%   { background-position: 200% 0 }
        100% { background-position: -200% 0 }
      }

      /* Live indicator */
      .sd-live-dot {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.68rem;
        font-weight: 600;
        color: #059669;
        vertical-align: middle;
        margin-left: 4px;
      }
      .sd-live-dot::before {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        animation: sd-pulse 2s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes sd-pulse {
        0%,100% { opacity: 1; transform: scale(1) }
        50%      { opacity: .45; transform: scale(1.15) }
      }

      /* Savings badge */
      .sd-savings {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 999px;
        margin-top: 2px;
      }

      /* Stores badge */
      .sd-stores-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
        color: #6a7282;
        margin-top: 2px;
      }
      .sd-stores-badge svg { flex-shrink: 0; }

      /* ML source badge */
      .sd-ml-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: #fff7ed;
        color: #c2410c;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
        letter-spacing: .02em;
        margin-left: 4px;
      }

      /* Price row with best/worst */
      .sd-price-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        flex-wrap: wrap;
      }
      .sd-price-worst {
        font-size: 0.75rem;
        color: #9ca3af;
        text-decoration: line-through;
      }

      /* Card bottom meta row */
      .sd-card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding: 0 1rem .5rem;
      }

      /* Source info chip in notification bar */
      .sd-source-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: .75rem;
        font-weight: 600;
      }
    `;
    document.head.appendChild(s);
  }

  /* ────────────────────────────────────────────────
     RENDER DINÁMICO DE TARJETAS
  ──────────────────────────────────────────────── */
  function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `
        <div class="no-results" style="grid-column:1/-1">
          <p style="font-size:1rem;font-weight:600;color:#4a5565;margin-bottom:.5rem">No se encontraron productos</p>
          <p style="font-size:.875rem;color:#9ca3af">Intenta ajustar tus filtros o búsqueda</p>
        </div>`;
      updateCount(0);
      return;
    }

    grid.innerHTML = products.map(p => buildCard(p)).join('');
    updateCount(products.length);
    setupFavoriteButtons();
    setupProductNavigation();
  }

  /* ── Construir tarjeta con datos ML ─────────── */
  function buildCard(p) {
    const isFav     = state.favorites.includes(p.id);
    const isLive    = !!p.scrapedAt;          // solo true si vino del scraper real
    const hasML     = p.mlResultsCount > 0;   // hubo resultados reales de ML
    const stock     = p.storePrices && p.storePrices[0] ? p.storePrices[0] : null;
    const storeName = stock ? stock.storeName : 'Amazon Sports';
    const stockLbl  = stock ? stock.stock     : 'En Stock';
    const stockPill = stock ? stock.stockPill : 'ok';
    const stockCls  = stockPill === 'low' ? 'product-card__stock--limited' : '';
    const storeUrl  = (stock && stock.url && stock.url !== '#')
                        ? stock.url
                        : `product.html?id=${p.id}`;

    // Precio e imagen
    const price     = p.price ?? p.bestPrice ?? p.basePrice;
    const worst     = p.worstPrice;
    const savings   = p.savings && p.savings > 0.5 ? p.savings : null;
    const imgPath   = resolveImage(p.image);
    const storesIn  = p.storesInStock || 0;
    const storesTotal = p.storesTotal || 0;

    // Tiempo de actualización
    const updAt = p.updatedAgo || 'Hace 5 min';

    // Stars
    const stars = generateStarHTML(p.rating || 0);

    // Badges
    const liveBadge = isLive
      ? `<span class="sd-live-dot">En vivo</span>`
      : '';
    const mlBadge = hasML
      ? `<span class="sd-ml-badge">ML</span>`
      : '';

    // Worst price (tachado)
    const worstHTML = (worst && worst > price + 0.5)
      ? `<span class="sd-price-worst">$${worst.toFixed(2)}</span>`
      : '';

    // Savings
    const savingsHTML = savings
      ? `<span class="sd-savings">−$${savings.toFixed(2)}</span>`
      : '';

    // Stores badge
    const storesHTML = storesTotal > 0
      ? `<span class="sd-stores-badge">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
           </svg>
           ${storesIn}/${storesTotal} tiendas
         </span>`
      : '';

    return `
      <article class="product-card"
        data-category="${(p.category||'').toLowerCase()}"
        data-brand="${(p.brand||'').toLowerCase()}"
        data-store="${storeName}"
        data-product-id="${p.id}"
        data-is-live="${isLive}">

        <div class="product-card__image-container">
          <img src="${imgPath}"
               alt="${p.name}"
               class="product-card__image"
               loading="lazy"
               onerror="this.src='../assets/img/main_produc_zapatillas.jpg'">

          <span class="product-card__store">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            ${storeName}${mlBadge}
          </span>

          <span class="product-card__stock ${stockCls}">${stockLbl}</span>

          <button type="button"
            class="product-card__favorite"
            aria-label="Añadir ${p.name} a favoritos"
            data-favorite="${isFav}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div class="product-card__content">
          <p class="product-card__category">${p.brand}</p>
          <h3 class="product-card__title">${p.name}</h3>

          <div class="product-card__rating">
            <div class="star-rating" aria-label="${p.rating} de 5 estrellas">${stars}</div>
            <span class="product-card__reviews">(${p.rating})</span>
          </div>

          <p class="product-card__updated">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            ${updAt}${liveBadge}
          </p>

          <div class="sd-price-row">
            <p class="product-card__price" style="margin:0">$${price.toFixed(2)}</p>
            ${worstHTML}
          </div>

          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px">
            ${savingsHTML}
            ${storesHTML}
          </div>
        </div>

        <div class="product-card__actions">
          <a href="${storeUrl}"
             ${storeUrl.startsWith('http') ? 'target="_blank"' : ''}
             class="product-card__btn"
             aria-label="Ver tienda de ${p.name}"
             style="text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
            </svg>
            Ver en Tienda
          </a>
        </div>
      </article>`;
  }

  /* ── Resolver ruta de imagen ─────────────────── */
  function resolveImage(img) {
    if (!img) return '../assets/img/main_produc_zapatillas.jpg';
    if (img.startsWith('http')) return img;
    if (img.startsWith('../')) return img;
    if (img.startsWith('assets/')) return '../' + img;
    return img;
  }

  function generateStarHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating))               html += '<span class="star star--filled"></span>';
      else if (i - rating < 1 && rating % 1)     html += '<span class="star star--half"></span>';
      else                                        html += '<span class="star"></span>';
    }
    return html;
  }

  /* ────────────────────────────────────────────────
     FILTROS Y BÚSQUEDA
  ──────────────────────────────────────────────── */
  function applyFilters() {
    if (state.loading) return;

    let filtered = [...state.allProducts];

    if (state.search) {
      const q = state.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      filtered = filtered.filter(p =>
        [p.name, p.brand, p.category, p.description].some(f =>
          f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)
        )
      );
    }
    if (state.categories.length) {
      filtered = filtered.filter(p => state.categories.includes(p.category.toLowerCase()));
    }
    if (state.brands.length) {
      filtered = filtered.filter(p => state.brands.includes(p.brand.toLowerCase()));
    }
    if (state.stores.length) {
      filtered = filtered.filter(p => {
        const s = p.storePrices && p.storePrices[0] ? p.storePrices[0].storeName : '';
        return state.stores.map(x => x.toLowerCase()).includes(s.toLowerCase());
      });
    }
    filtered = filtered.filter(p => (p.price ?? p.bestPrice ?? p.basePrice ?? 0) <= state.maxPrice);
    filtered = sortArr(filtered, state.sortBy);

    renderProducts(filtered);
  }

  function sortArr(arr, by) {
    const s = [...arr];
    const price = p => p.price ?? p.bestPrice ?? p.basePrice ?? 0;
    if (by === 'price-asc')  s.sort((a,b) => price(a) - price(b));
    if (by === 'price-desc') s.sort((a,b) => price(b) - price(a));
    if (by === 'rating')     s.sort((a,b) => (b.rating||0) - (a.rating||0));
    if (by === 'newest')     s.reverse();
    return s;
  }

  /* ── URL param: ?cat=calzado ──────────── */
  function checkURLCategory() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (!cat) return;
    const box = document.querySelector(`.category-filter[value="${cat}"]`);
    const todosBox = document.querySelector('.category-filter[value="todos"]');
    if (box) {
      box.checked = true;
      if (todosBox) todosBox.checked = false;
      state.categories = [cat.toLowerCase()];
    }
  }

  /* ── Hamburger ────────────────────────── */
  function setupHamburger() {
    const btn  = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('navMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const exp = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!exp));
      menu.classList.toggle('active');
    });
    document.querySelectorAll('.nav-list__link').forEach(l =>
      l.addEventListener('click', () => { btn.setAttribute('aria-expanded','false'); menu.classList.remove('active'); })
    );
    document.addEventListener('click', e => {
      if (!menu.contains(e.target) && !btn.contains(e.target) && menu.classList.contains('active')) {
        btn.setAttribute('aria-expanded','false'); menu.classList.remove('active');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        btn.setAttribute('aria-expanded','false'); menu.classList.remove('active'); btn.focus();
      }
    });
  }

  /* ── Sidebar ─────────────────────────── */
  function setupSidebar() {
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const sidebar   = document.getElementById('catalogFilters');
    const closeBtn  = document.getElementById('closeSidebarBtn');
    function checkW() {
      if (!toggleBtn) return;
      if (window.innerWidth <= 768) {
        toggleBtn.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'block';
      } else {
        toggleBtn.style.display = 'none';
        if (sidebar)  sidebar.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
    window.addEventListener('resize', checkW); checkW();
    if (toggleBtn && sidebar) toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    });
    if (closeBtn && sidebar) closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('active'); document.body.style.overflow = '';
    });
    document.addEventListener('click', e => {
      if (!sidebar || !toggleBtn || window.innerWidth > 768) return;
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active'); document.body.style.overflow = '';
      }
    });
  }

  /* ── Search ──────────────────────────── */
  function setupSearch() {
    const inp = document.getElementById('productSearch');
    if (!inp) return;
    let debounceTimer;
    inp.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.search = e.target.value.trim().toLowerCase();
        applyFilters();
      }, 250);
    });
  }

  /* ── Sort ────────────────────────────── */
  function setupSort() {
    const sel = document.getElementById('sortBy');
    if (!sel) return;
    sel.addEventListener('change', e => { state.sortBy = e.target.value; applyFilters(); });
  }

  /* ── Category filters ─────────────────── */
  function setupCategoryFilters() {
    const todosBox  = document.querySelector('.category-filter[value="todos"]');
    const specifics = document.querySelectorAll('.category-filter:not([value="todos"])');
    if (!todosBox) return;
    todosBox.addEventListener('change', () => {
      if (todosBox.checked) { specifics.forEach(cb => cb.checked = false); state.categories = []; applyFilters(); }
      else todosBox.checked = true;
    });
    specifics.forEach(cb => cb.addEventListener('change', () => {
      state.categories = Array.from(specifics).filter(c => c.checked).map(c => c.value.toLowerCase());
      todosBox.checked = state.categories.length === 0;
      applyFilters();
    }));
  }

  /* ── Brand filters ─────────────────────── */
  function setupBrandFilters() {
    const todas     = document.querySelector('.brand-filter[value="todas"]');
    const specifics = document.querySelectorAll('.brand-filter:not([value="todas"])');
    if (!todas) return;
    todas.addEventListener('change', () => {
      if (todas.checked) { specifics.forEach(cb => cb.checked = false); state.brands = []; applyFilters(); }
      else todas.checked = true;
    });
    specifics.forEach(cb => cb.addEventListener('change', () => {
      state.brands = Array.from(specifics).filter(c => c.checked).map(c => c.value.toLowerCase());
      todas.checked = state.brands.length === 0;
      applyFilters();
    }));
  }

  /* ── Store filters ─────────────────────── */
  function setupStoreFilters() {
    const todas     = document.querySelector('.store-filter[value="todas"]');
    const specifics = document.querySelectorAll('.store-filter:not([value="todas"])');
    if (!todas) return;
    todas.addEventListener('change', () => {
      if (todas.checked) { specifics.forEach(cb => cb.checked = false); state.stores = []; applyFilters(); }
      else todas.checked = true;
    });
    specifics.forEach(cb => cb.addEventListener('change', () => {
      state.stores = Array.from(specifics).filter(c => c.checked).map(c => c.value);
      todas.checked = state.stores.length === 0;
      applyFilters();
    }));
  }

  /* ── Price range ──────────────────────── */
  function setupPriceRange() {
    const sl  = document.getElementById('priceRange');
    const lbl = document.getElementById('priceValue');
    if (!sl) return;
    sl.addEventListener('input', () => {
      state.maxPrice = parseFloat(sl.value);
      if (lbl) lbl.textContent = sl.value;
      applyFilters();
    });
  }

  /* ── Reset filters ─────────────────────── */
  function setupResetFilters() {
    const btn = document.getElementById('resetFiltersBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.search = ''; state.categories = []; state.brands = []; state.stores = [];
      state.sortBy = 'relevance';

      // Restablecer slider al máximo real
      const maxReal = Math.max(...state.allProducts.map(p => p.worstPrice || p.price || 200));
      const sliderMax = Math.ceil(maxReal / 50) * 50 + 50;
      state.maxPrice = sliderMax;

      document.querySelectorAll('.category-filter').forEach(cb => cb.checked = cb.value === 'todos');
      document.querySelectorAll('.brand-filter').forEach(cb  => cb.checked = cb.value === 'todas');
      document.querySelectorAll('.store-filter').forEach(cb  => cb.checked = cb.value === 'todas');
      const sl  = document.getElementById('priceRange');
      if (sl)  { sl.max = sliderMax; sl.value = sliderMax; }
      const lbl = document.getElementById('priceValue');
      if (lbl) lbl.textContent = sliderMax;
      const sinp = document.getElementById('productSearch');
      if (sinp) sinp.value = '';
      const ssel = document.getElementById('sortBy');
      if (ssel) ssel.value = 'relevance';
      applyFilters();
    });
  }

  /* ── Count ───────────────────────────── */
  function updateCount(n) {
    const el = document.getElementById('catalogCount');
    if (!el) return;
    const src = state.dataSource === 'local'   ? ' · Datos en vivo ML'
              : state.dataSource === 'netlify' ? ' · Datos scrapeados'
              : '';
    el.textContent = `${n} producto${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}${src}`;
  }

  /* ── Favorites ───────────────────────── */
  function setupFavoriteButtons() {
    document.querySelectorAll('.product-card__favorite').forEach(btn => {
      const id = btn.closest('.product-card')?.dataset.productId;
      if (id && state.favorites.includes(id)) btn.setAttribute('data-favorite','true');

      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const fav = btn.getAttribute('data-favorite') === 'true';
        const cid = btn.closest('.product-card')?.dataset.productId;
        btn.setAttribute('data-favorite', String(!fav));
        if (fav) {
          state.favorites = state.favorites.filter(f => f !== cid);
          // Sincronizar con ambas claves de favoritos
          syncFavoriteStorages(state.favorites);
        } else if (cid && !state.favorites.includes(cid)) {
          state.favorites.push(cid);
          syncFavoriteStorages(state.favorites);
        }
      });
    });
  }

  function loadFavoritesFromStorage() {
    try {
      // Intentar con ambas claves posibles
      const v1 = JSON.parse(localStorage.getItem('sportdata_favorites') || '[]');
      const v2 = JSON.parse(localStorage.getItem('sd_favorites') || '[]');
      state.favorites = [...new Set([...v1, ...v2])];
    } catch { state.favorites = []; }
  }

  function syncFavoriteStorages(favs) {
    localStorage.setItem('sportdata_favorites', JSON.stringify(favs));
    localStorage.setItem('sd_favorites', JSON.stringify(favs));
  }

  /* ── Product navigation ──────────────── */
  function setupProductNavigation() {
    document.querySelectorAll('.product-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('.product-card__favorite') || e.target.closest('.product-card__btn') || e.target.closest('a')) return;
        const id = card.dataset.productId;
        if (id) {
          const inHtml = window.location.pathname.includes('/html/');
          window.location.href = (inHtml ? '' : 'html/') + 'product.html?id=' + id;
        }
      });
    });
  }

  /* ── Boot ─────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
