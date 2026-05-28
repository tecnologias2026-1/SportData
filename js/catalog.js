/**
 * ================================================
 * SportData — Catalog Page JavaScript (Dinámico)
 * ================================================
 * Carga productos desde la API (o fallback local),
 * los renderiza dinámicamente y gestiona todos
 * los filtros, búsqueda, favoritos y navegación.
 */

(function () {
  'use strict';

  /* ── Estado ─────────────────────────────────── */
  const state = {
    search:     '',
    categories: [],
    brands:     [],
    stores:     [],
    maxPrice:   200,
    sortBy:     'relevance',
    favorites:  [],
    allProducts:[],
    loading:    true,
  };

  /* ── Init ────────────────────────────────────── */
  async function init() {

    // Guard: esperar a que products.js esté disponible
  if (typeof window.SportDataProducts === 'undefined') {
    console.error('SportDataProducts no está cargado. Verifica el orden de scripts.');
    // Intentar cargar igual con fallback
    state.allProducts = [];
    state.loading = false;
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
      // Cargar productos desde API / fallback
      state.allProducts = await window.SportDataProducts.getAll();
    } catch {
      state.allProducts = window.SportDataProducts.getAllProducts();
    }

    state.loading = false;
    renderProducts(state.allProducts);
    setupFavoriteButtons();
    setupProductNavigation();
    applyFilters();
  }

  /* ── Skeleton loader ────────────────────────── */
  function showSkeleton() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 6 }, () => `
      <article class="product-card product-card--skeleton" aria-hidden="true">
        <div class="product-card__image-container skeleton-box" style="height:200px"></div>
        <div class="product-card__content" style="gap:.75rem">
          <div class="skeleton-box" style="height:12px;width:60%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:18px;width:85%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:12px;width:40%;border-radius:4px"></div>
          <div class="skeleton-box" style="height:24px;width:50%;border-radius:4px;margin-top:.5rem"></div>
        </div>
        <div class="product-card__actions">
          <div class="skeleton-box" style="height:42px;border-radius:8px"></div>
        </div>
      </article>`).join('');
    injectSkeletonStyles();
  }

  function injectSkeletonStyles() {
    if (document.getElementById('sd-skeleton-styles')) return;
    const s = document.createElement('style');
    s.id = 'sd-skeleton-styles';
    s.textContent = `
      .skeleton-box {
        background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.4s infinite;
        border-radius: 6px;
      }
      @keyframes skeleton-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
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

  function buildCard(p) {
    const isFav    = state.favorites.includes(p.id);
    const stock    = p.storePrices && p.storePrices[0] ? p.storePrices[0] : null;
    const storeName= stock ? stock.storeName   : 'Amazon Sports';
    const stockLbl = stock ? stock.stock       : 'En Stock';
    const stockPill= stock ? stock.stockPill   : 'ok';
    const stockCls = stockPill === 'out' ? 'product-card__stock--limited' : '';
    const storeUrl = stock && stock.url !== '#' ? stock.url : `product.html?id=${p.id}`;
    const stars    = generateStarHTML(p.rating);
    const updAt    = p.updatedAgo || 'Hace 5 min';
    const savings  = p.savings ? `<span class="card-savings">Ahorras $${p.savings.toFixed(2)}</span>` : '';
    const imgPath  = (p.image || '').replace(/^\.\.\//,'../');

    return `
      <article class="product-card"
        data-category="${(p.category||'').toLowerCase()}"
        data-brand="${(p.brand||'').toLowerCase()}"
        data-store="${storeName}"
        data-product-id="${p.id}">

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
            ${storeName}
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
            <div class="star-rating" aria-label="${p.rating} de 5 estrellas">
              ${stars}
            </div>
            <span class="product-card__reviews">(${p.rating})</span>
          </div>

          <p class="product-card__updated">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Actualizado: ${updAt}
          </p>

          <p class="product-card__price">$${p.price.toFixed(2)}</p>
          ${savings}
        </div>

        <div class="product-card__actions">
          <a href="${storeUrl}" target="_blank" class="product-card__btn" aria-label="Ver tienda de ${p.name}" style="text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
            </svg>
            Ver en Tienda
          </a>
        </div>
      </article>`;
  }

  function generateStarHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating))      html += '<span class="star star--filled"></span>';
      else if (i - rating < 1 && rating % 1 !== 0) html += '<span class="star star--half"></span>';
      else                               html += '<span class="star"></span>';
    }
    return html;
  }

  /* ────────────────────────────────────────────────
     FILTROS Y BÚSQUEDA
  ──────────────────────────────────────────────── */
  function applyFilters() {
    if (state.loading) return;

    let filtered = [...state.allProducts];

    // Búsqueda
    if (state.search) {
      const q = state.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      filtered = filtered.filter(p =>
        [p.name, p.brand, p.category, p.description].some(f =>
          f && f.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)
        )
      );
    }

    // Categoría
    if (state.categories.length) {
      filtered = filtered.filter(p => state.categories.includes(p.category.toLowerCase()));
    }

    // Marca
    if (state.brands.length) {
      filtered = filtered.filter(p => state.brands.includes(p.brand.toLowerCase()));
    }

    // Tienda
    if (state.stores.length) {
      filtered = filtered.filter(p => {
        const s = p.storePrices && p.storePrices[0] ? p.storePrices[0].storeName : '';
        return state.stores.map(x => x.toLowerCase()).includes(s.toLowerCase());
      });
    }

    // Precio
    filtered = filtered.filter(p => p.price <= state.maxPrice);

    // Ordenar
    filtered = sortArr(filtered, state.sortBy);

    renderProducts(filtered);
  }

  function sortArr(arr, by) {
    const s = [...arr];
    if (by === 'price-asc')  s.sort((a,b) => a.price - b.price);
    if (by === 'price-desc') s.sort((a,b) => b.price - a.price);
    if (by === 'rating')     s.sort((a,b) => b.rating - a.rating);
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
    inp.addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); applyFilters(); });
  }

  /* ── Sort ────────────────────────────── */
  function setupSort() {
    const sel = document.getElementById('sortBy');
    if (!sel) return;
    sel.addEventListener('change', e => { state.sortBy = e.target.value; applyFilters(); });
  }

  /* ── Category filters ─────────────────── */
  function setupCategoryFilters() {
    const todosBox = document.querySelector('.category-filter[value="todos"]');
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
    const todas = document.querySelector('.brand-filter[value="todas"]');
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
    const todas = document.querySelector('.store-filter[value="todas"]');
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
    const sl = document.getElementById('priceRange');
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
      state.maxPrice = 200; state.sortBy = 'relevance';
      document.querySelectorAll('.category-filter').forEach(cb => cb.checked = cb.value === 'todos');
      document.querySelectorAll('.brand-filter').forEach(cb => cb.checked = cb.value === 'todas');
      document.querySelectorAll('.store-filter').forEach(cb => cb.checked = cb.value === 'todas');
      const sl = document.getElementById('priceRange'); if (sl) sl.value = 200;
      const lbl = document.getElementById('priceValue'); if (lbl) lbl.textContent = '200';
      const sinp = document.getElementById('productSearch'); if (sinp) sinp.value = '';
      const ssel = document.getElementById('sortBy'); if (ssel) ssel.value = 'relevance';
      applyFilters();
    });
  }

  /* ── Count ───────────────────────────── */
  function updateCount(n) {
    const el = document.getElementById('catalogCount');
    if (el) el.textContent = n + ' producto' + (n !== 1 ? 's' : '') + ' encontrado' + (n !== 1 ? 's' : '');
  }

  /* ── Favorites ───────────────────────── */
  function setupFavoriteButtons() {
    document.querySelectorAll('.product-card__favorite').forEach(btn => {
      const card = btn.closest('.product-card');
      const id   = card && card.dataset.productId;
      if (id && state.favorites.includes(id)) btn.setAttribute('data-favorite','true');

      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const fav = btn.getAttribute('data-favorite') === 'true';
        const cid = btn.closest('.product-card')?.dataset.productId;
        btn.setAttribute('data-favorite', String(!fav));
        if (fav) state.favorites = state.favorites.filter(f => f !== cid);
        else if (cid && !state.favorites.includes(cid)) state.favorites.push(cid);
        saveFavoritesToStorage();
      });
    });
  }

  function loadFavoritesFromStorage() {
    try { state.favorites = JSON.parse(localStorage.getItem('sportdata_favorites') || '[]'); }
    catch { state.favorites = []; }
  }
  function saveFavoritesToStorage() {
    localStorage.setItem('sportdata_favorites', JSON.stringify(state.favorites));
  }

  /* ── Product navigation ──────────────── */
  function setupProductNavigation() {
    document.querySelectorAll('.product-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('.product-card__favorite') || e.target.closest('.product-card__btn')) return;
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
