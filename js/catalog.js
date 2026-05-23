/**
 * ================================================
 * SportData — Catalog Page JavaScript
 * Handles: search, category/brand/store/price
 * filters, sorting, favorites, navigation, mobile
 * ================================================
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────── */
  const state = {
    search: '',
    categories: [],   // empty = "todos" (show all)
    brands: [],       // empty = "todas" (show all)
    stores: [],       // empty = "todas" (show all)
    maxPrice: 200,
    sortBy: 'relevance',
    favorites: []
  };

  /* ── Init ───────────────────────────────────── */
  function init () {
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
    setupFavoriteButtons();
    setupProductNavigation();
    applyFilters();             // render initial state
  }

  /* ════════════════════════════════════════════
     HAMBURGER MENU
  ════════════════════════════════════════════ */
  function setupHamburger () {
    const btn  = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('navMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-list__link').forEach(link => {
      link.addEventListener('click', () => {
        btn.setAttribute('aria-expanded', 'false');
        menu.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target) && menu.classList.contains('active')) {
        btn.setAttribute('aria-expanded', 'false');
        menu.classList.remove('active');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        btn.setAttribute('aria-expanded', 'false');
        menu.classList.remove('active');
        btn.focus();
      }
    });
  }

  /* ════════════════════════════════════════════
     SIDEBAR TOGGLE (MOBILE)
  ════════════════════════════════════════════ */
  function setupSidebar () {
    const toggleBtn  = document.getElementById('toggleSidebarBtn');
    const sidebar    = document.getElementById('catalogFilters');
    const closeBtn   = document.getElementById('closeSidebarBtn');

    /* Show toggle button on mobile widths */
    function checkWidth () {
      if (!toggleBtn) return;
      if (window.innerWidth <= 768) {
        toggleBtn.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'block';
      } else {
        toggleBtn.style.display = 'none';
        if (sidebar)  sidebar.classList.remove('active');
        if (closeBtn) closeBtn.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    window.addEventListener('resize', checkWidth);
    checkWidth();

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
      });
    }

    if (closeBtn && sidebar) {
      closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    /* Close when clicking outside sidebar on mobile */
    document.addEventListener('click', (e) => {
      if (!sidebar || !toggleBtn) return;
      if (window.innerWidth > 768) return;
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  /* ════════════════════════════════════════════
     SEARCH
  ════════════════════════════════════════════ */
  function setupSearch () {
    const input = document.getElementById('productSearch');
    if (!input) return;
    input.addEventListener('input', (e) => {
      state.search = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  /* ════════════════════════════════════════════
     SORT
  ════════════════════════════════════════════ */
  function setupSort () {
    const select = document.getElementById('sortBy');
    if (!select) return;
    select.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFilters();
    });
  }

  /* ════════════════════════════════════════════
     CATEGORY FILTERS
     "Todos" acts as "select all / clear all"
  ════════════════════════════════════════════ */
  function setupCategoryFilters () {
    const todosBox    = document.querySelector('.category-filter[value="todos"]');
    const specificBoxes = document.querySelectorAll('.category-filter:not([value="todos"])');

    if (!todosBox) return;

    /* Clicking "Todos" → uncheck all specifics, clear state */
    todosBox.addEventListener('change', () => {
      if (todosBox.checked) {
        specificBoxes.forEach(cb => { cb.checked = false; });
        state.categories = [];
        applyFilters();
      } else {
        /* prevent unchecking if nothing else is checked */
        todosBox.checked = true;
      }
    });

    /* Clicking a specific category */
    specificBoxes.forEach(cb => {
      cb.addEventListener('change', () => {
        updateCheckedList(specificBoxes, state.categories = []);
        state.categories = getCheckedValues(specificBoxes);

        if (state.categories.length === 0) {
          /* nothing selected → back to "Todos" */
          todosBox.checked = true;
        } else {
          todosBox.checked = false;
        }
        applyFilters();
      });
    });
  }

  /* ════════════════════════════════════════════
     BRAND FILTERS
  ════════════════════════════════════════════ */
  function setupBrandFilters () {
    const todasBox      = document.querySelector('.brand-filter[value="todas"]');
    const specificBoxes = document.querySelectorAll('.brand-filter:not([value="todas"])');

    if (!todasBox) return;

    todasBox.addEventListener('change', () => {
      if (todasBox.checked) {
        specificBoxes.forEach(cb => { cb.checked = false; });
        state.brands = [];
        applyFilters();
      } else {
        todasBox.checked = true;
      }
    });

    specificBoxes.forEach(cb => {
      cb.addEventListener('change', () => {
        state.brands = getCheckedValues(specificBoxes);
        if (state.brands.length === 0) {
          todasBox.checked = true;
        } else {
          todasBox.checked = false;
        }
        applyFilters();
      });
    });
  }

  /* ════════════════════════════════════════════
     STORE FILTERS
  ════════════════════════════════════════════ */
  function setupStoreFilters () {
    const todasBox      = document.querySelector('.store-filter[value="todas"]');
    const specificBoxes = document.querySelectorAll('.store-filter:not([value="todas"])');

    if (!todasBox) return;

    todasBox.addEventListener('change', () => {
      if (todasBox.checked) {
        specificBoxes.forEach(cb => { cb.checked = false; });
        state.stores = [];
        applyFilters();
      } else {
        todasBox.checked = true;
      }
    });

    specificBoxes.forEach(cb => {
      cb.addEventListener('change', () => {
        state.stores = Array.from(specificBoxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value); // keep original case to match data-store
        if (state.stores.length === 0) {
          todasBox.checked = true;
        } else {
          todasBox.checked = false;
        }
        applyFilters();
      });
    });
  }

  /* ════════════════════════════════════════════
     PRICE RANGE
  ════════════════════════════════════════════ */
  function setupPriceRange () {
    const slider = document.getElementById('priceRange');
    const label  = document.getElementById('priceValue');
    if (!slider) return;

    slider.addEventListener('input', () => {
      state.maxPrice = parseFloat(slider.value);
      if (label) label.textContent = slider.value;
      applyFilters();
    });
  }

  /* ════════════════════════════════════════════
     RESET FILTERS
  ════════════════════════════════════════════ */
  function setupResetFilters () {
    const btn = document.getElementById('resetFiltersBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      /* Reset state */
      state.search     = '';
      state.categories = [];
      state.brands     = [];
      state.stores     = [];
      state.maxPrice   = 200;
      state.sortBy     = 'relevance';

      /* Reset UI — checkboxes */
      document.querySelectorAll('.category-filter').forEach(cb => {
        cb.checked = cb.value === 'todos';
      });
      document.querySelectorAll('.brand-filter').forEach(cb => {
        cb.checked = cb.value === 'todas';
      });
      document.querySelectorAll('.store-filter').forEach(cb => {
        cb.checked = cb.value === 'todas';
      });

      /* Reset price slider */
      const slider = document.getElementById('priceRange');
      const label  = document.getElementById('priceValue');
      if (slider) slider.value = 200;
      if (label)  label.textContent = '200';

      /* Reset search input */
      const searchInput = document.getElementById('productSearch');
      if (searchInput) searchInput.value = '';

      /* Reset sort */
      const sortSelect = document.getElementById('sortBy');
      if (sortSelect) sortSelect.value = 'relevance';

      applyFilters();
    });
  }

  /* ════════════════════════════════════════════
     APPLY FILTERS + SORT
  ════════════════════════════════════════════ */
  function applyFilters () {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    let visibleCards = [];

    cards.forEach(card => {
      const category = (card.dataset.category || '').toLowerCase();
      const brand    = (card.dataset.brand    || '').toLowerCase();
      const store    = (card.dataset.store    || '');
      const title    = (card.querySelector('.product-card__title')?.textContent || '').toLowerCase();
      const priceEl  = card.querySelector('.product-card__price');
      const price    = priceEl ? parseFloat(priceEl.textContent.replace('$', '')) : 0;

      const matchesSearch   = !state.search || title.includes(state.search);
      const matchesCategory = state.categories.length === 0 || state.categories.includes(category);
      const matchesBrand    = state.brands.length    === 0 || state.brands.includes(brand);
      const matchesStore    = state.stores.length    === 0 || state.stores.map(s => s.toLowerCase()).includes(store.toLowerCase());
      const matchesPrice    = price <= state.maxPrice;

      const visible = matchesSearch && matchesCategory && matchesBrand && matchesStore && matchesPrice;
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCards.push(card);
    });

    /* Sort visible cards */
    sortCards(visibleCards);

    /* Update count */
    updateCount(visibleCards.length);

    /* Show/hide empty state */
    toggleEmptyState(visibleCards.length === 0);
  }

  /* ════════════════════════════════════════════
     SORT CARDS IN DOM
  ════════════════════════════════════════════ */
  function sortCards (visibleCards) {
    if (state.sortBy === 'relevance') return; // keep original DOM order

    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    /* Get original index for "newest" sort */
    const allCards = Array.from(grid.querySelectorAll('.product-card'));

    visibleCards.sort((a, b) => {
      switch (state.sortBy) {
        case 'price-asc': {
          const pa = parseFloat(a.querySelector('.product-card__price').textContent.replace('$', ''));
          const pb = parseFloat(b.querySelector('.product-card__price').textContent.replace('$', ''));
          return pa - pb;
        }
        case 'price-desc': {
          const pa = parseFloat(a.querySelector('.product-card__price').textContent.replace('$', ''));
          const pb = parseFloat(b.querySelector('.product-card__price').textContent.replace('$', ''));
          return pb - pa;
        }
        case 'rating': {
          const ra = parseFloat(a.querySelector('.product-card__reviews')?.textContent.replace(/[()]/g, '') || 0);
          const rb = parseFloat(b.querySelector('.product-card__reviews')?.textContent.replace(/[()]/g, '') || 0);
          return rb - ra;
        }
        case 'newest': {
          return allCards.indexOf(b) - allCards.indexOf(a);
        }
        default:
          return 0;
      }
    });

    /* Re-append in sorted order (hidden cards stay in place) */
    visibleCards.forEach(card => grid.appendChild(card));
  }

  /* ════════════════════════════════════════════
     EMPTY STATE
  ════════════════════════════════════════════ */
  function toggleEmptyState (isEmpty) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    let empty = grid.querySelector('.no-results');

    if (isEmpty) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'no-results';
        empty.innerHTML = `
          <p style="font-size:1rem;font-weight:600;color:#4a5565;margin-bottom:.5rem;">
            No se encontraron productos
          </p>
          <p style="font-size:.875rem;color:#9ca3af;">
            Intenta ajustar tus filtros o búsqueda
          </p>`;
        grid.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  /* ════════════════════════════════════════════
     COUNT
  ════════════════════════════════════════════ */
  function updateCount (n) {
    const el = document.getElementById('catalogCount');
    if (el) el.textContent = n + ' producto' + (n !== 1 ? 's' : '') + ' encontrado' + (n !== 1 ? 's' : '');
  }

  /* ════════════════════════════════════════════
     FAVORITE BUTTONS
  ════════════════════════════════════════════ */
  function setupFavoriteButtons () {
    document.querySelectorAll('.product-card__favorite').forEach(btn => {
      /* Sync initial state from storage */
      const card      = btn.closest('.product-card');
      const productId = card?.dataset.productId;
      if (productId && state.favorites.includes(productId)) {
        btn.setAttribute('data-favorite', 'true');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id  = btn.closest('.product-card')?.dataset.productId;
        const fav = btn.getAttribute('data-favorite') === 'true';

        if (fav) {
          btn.setAttribute('data-favorite', 'false');
          state.favorites = state.favorites.filter(f => f !== id);
        } else {
          btn.setAttribute('data-favorite', 'true');
          if (id && !state.favorites.includes(id)) state.favorites.push(id);
        }
        saveFavoritesToStorage();
      });
    });
  }

  function loadFavoritesFromStorage () {
    try { state.favorites = JSON.parse(localStorage.getItem('sportdata_favorites') || '[]'); }
    catch { state.favorites = []; }
  }

  function saveFavoritesToStorage () {
    localStorage.setItem('sportdata_favorites', JSON.stringify(state.favorites));
  }

  /* ════════════════════════════════════════════
     PRODUCT CARD NAVIGATION
  ════════════════════════════════════════════ */
  function setupProductNavigation () {
    document.querySelectorAll('.product-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        /* Ignore clicks on favorite button or "Ver en Tienda" button */
        if (e.target.closest('.product-card__favorite') || e.target.closest('.product-card__btn')) return;
        const id = card.dataset.productId;
        if (id) {
          const inHtml = window.location.pathname.includes('/html/');
          window.location.href = (inHtml ? '' : 'html/') + 'product.html?id=' + id;
        }
      });
    });
  }

  /* ════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════ */
  function getCheckedValues (nodeList) {
    return Array.from(nodeList)
      .filter(cb => cb.checked)
      .map(cb => cb.value.toLowerCase());
  }

  // eslint-disable-next-line no-unused-vars
  function updateCheckedList (nodeList, arr) {
    arr.length = 0;
    nodeList.forEach(cb => { if (cb.checked) arr.push(cb.value.toLowerCase()); });
  }

  /* ── Boot ───────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();