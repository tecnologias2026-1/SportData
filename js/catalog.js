/**
 *========================================
 * SportData - Catalog Page JavaScript
 * ========================================
 * Handles filters, search, sorting, and product interactions
 */

(function() {
    'use strict';

    // State
    const state = {
        activeFilters: {
            categories: [],
            brands: [],
            maxPrice: 500
        },
        searchTerm: '',
        sortBy: 'relevance',
        favorites: JSON.parse(localStorage.getItem('favorites')) || []
    };

    /**
     * Initialize the application
     */
    function init() {
        setupHamburgerMenu();
        setupNavigation();
        setupFilters();
        setupSearch();
        setupSort();
        setupFavorites();
        setupProducts();
        setupSidebarToggle();
        loadFavorites();
        trackPageView();
    }

    /**
     * Setup hamburger menu for mobile
     */
    function setupHamburgerMenu() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-list__link');

        if (!hamburgerBtn || !navMenu) return;

        // Toggle menu on hamburger click
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
            
            hamburgerBtn.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const isClickInsideNav = navMenu.contains(e.target);
            const isClickOnHamburger = hamburgerBtn.contains(e.target);

            if (!isClickInsideNav && !isClickOnHamburger && navMenu.classList.contains('active')) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });

        // Close menu with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
                hamburgerBtn.focus();
            }
        });
    }

    /**
     * Setup navigation highlighting based on current page
     */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-list__link');
        
        navLinks.forEach(link => {
            link.classList.remove('nav-list__link--active');
            const href = link.getAttribute('href');
            const currentPath = window.location.pathname;
            
            if (href === currentPath || (href === '/catalog' && currentPath.includes('catalog'))) {
                link.classList.add('nav-list__link--active');
            }
        });
    }

    /**
     * Setup filters
     */
    function setupFilters() {
        const categoryFilters = document.querySelectorAll('.category-filter');
        const brandFilters = document.querySelectorAll('.brand-filter');
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        const resetBtn = document.getElementById('resetFiltersBtn');

        // Category filters
        categoryFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateCategoryFilters();
                filterProducts();
            });
        });

        // Brand filters
        brandFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateBrandFilters();
                filterProducts();
            });
        });

        // Price range
        priceRange?.addEventListener('input', (e) => {
            state.activeFilters.maxPrice = parseInt(e.target.value);
            priceValue.textContent = e.target.value;
            filterProducts();
        });

        // Reset filters
        resetBtn?.addEventListener('click', () => {
            categoryFilters.forEach(checkbox => checkbox.checked = false);
            brandFilters.forEach(checkbox => checkbox.checked = false);
            document.querySelector('.category-filter[value="todos"]').checked = true;
            priceRange.value = 500;
            priceValue.textContent = '500';
            state.activeFilters = {
                categories: [],
                brands: [],
                maxPrice: 500
            };
            state.searchTerm = '';
            document.getElementById('productSearch').value = '';
            filterProducts();
        });
    }

    /**
     * Update category filters state
     */
    function updateCategoryFilters() {
        const checkedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
            .filter(cb => cb.value !== 'todos')
            .map(cb => cb.value);
        
        state.activeFilters.categories = checkedCategories;
    }

    /**
     * Update brand filters state
     */
    function updateBrandFilters() {
        const checkedBrands = Array.from(document.querySelectorAll('.brand-filter:checked'))
            .map(cb => cb.value);
        
        state.activeFilters.brands = checkedBrands;
    }

    /**
     * Setup search functionality
     */
    function setupSearch() {
        const searchInput = document.getElementById('productSearch');

        searchInput?.addEventListener('input', (e) => {
            state.searchTerm = e.target.value.toLowerCase();
            filterProducts();
        });
    }

    /**
     * Setup sort functionality
     */
    function setupSort() {
        const sortSelect = document.getElementById('sortBy');

        sortSelect?.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            applySort();
        });
    }

    /**
     * Setup favorite button functionality
     */
    function setupFavorites() {
        const favoriteButtons = document.querySelectorAll('.product-card__favorite');

        favoriteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(btn);
            });
        });
    }

    /**
     * Toggle favorite status
     */
    function toggleFavorite(btn) {
        const productCard = btn.closest('.product-card');
        const productTitle = productCard.querySelector('.product-card__title').textContent;
        const isFavorite = btn.getAttribute('data-favorite') === 'true';

        if (isFavorite) {
            btn.setAttribute('data-favorite', 'false');
            state.favorites = state.favorites.filter(fav => fav !== productTitle);
        } else {
            btn.setAttribute('data-favorite', 'true');
            state.favorites.push(productTitle);
        }

        saveFavorites();
    }

    /**
     * Load favorites from localStorage
     */
    function loadFavorites() {
        const favoriteButtons = document.querySelectorAll('.product-card__favorite');

        favoriteButtons.forEach(btn => {
            const productCard = btn.closest('.product-card');
            const productTitle = productCard.querySelector('.product-card__title').textContent;

            if (state.favorites.includes(productTitle)) {
                btn.setAttribute('data-favorite', 'true');
            }
        });
    }

    /**
     * Save favorites to localStorage
     */
    function saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
    }

    /**
     * Setup product button functionality
     */
    function setupProducts() {
        const productCards = document.querySelectorAll('.product-card');
        const addCartButtons = document.querySelectorAll('.product-card__btn');

        // Add click listeners to navigate to product detail page
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking the favorite or add to cart button
                if (e.target.closest('.product-card__favorite') || e.target.closest('.product-card__btn')) {
                    return;
                }
                
                const productTitle = card.querySelector('.product-card__title').textContent;
                const product = PRODUCTS.find(p => p.name === productTitle);
                
                if (product) {
                    navigateToProductDetail(product.id);
                }
            });

            // Make the card cursor indicate it's clickable
            card.style.cursor = 'pointer';
        });

        // Keep add to cart functionality
        addCartButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(btn);
            });
        });
    }

    /**
     * Navigate to product detail page
     */
    function navigateToProductDetail(productId) {
        window.location.href = `product.html?id=${productId}`;
    }

    /**
     * Add product to cart
     */
    function addToCart(btn) {
        const productCard = btn.closest('.product-card');
        const productId = productCard.getAttribute('data-product-id');
        const productTitle = productCard.querySelector('.product-card__title').textContent;
        const productPrice = productCard.querySelector('.product-card__price').textContent;
        const productImg = productCard.querySelector('.product-card__image').src;

        // Get product info from PRODUCTS array
        const product = productId ? getProductById(productId) : null;

        // Create cart item object
        const cartItem = {
            id: productId || 'unknown-' + Date.now(),
            name: productTitle,
            price: product ? product.price : parseFloat(productPrice.replace('$', '')),
            quantity: 1,
            image: productImg,
            addedAt: new Date().toISOString()
        };

        // Store in localStorage
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Check if product already in cart and increase quantity
        const existingItem = cart.find(item => item.id === cartItem.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push(cartItem);
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));

        // Visual feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ ¡Agregado!';
        btn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    }

    /**
     * Setup sidebar toggle for mobile
     */
    function setupSidebarToggle() {
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        const sidebar = document.getElementById('catalogFilters');
        const closeBtn = document.querySelector('.filters-header__close');

        if (!toggleBtn || !sidebar) {
            // Show toggle button on mobile
            const viewport = window.innerWidth;
            if (viewport <= 768) {
                const btn = document.querySelector('.toggle-sidebar-btn');
                if (btn) btn.style.display = 'flex';
            }
            return;
        }

        // Toggle sidebar
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebar.classList.contains('active')) {
                closeBtn.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });

        // Close sidebar
        closeBtn?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            closeBtn.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                closeBtn.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    /**
     * Filter products based on active filters and search
     */
    function filterProducts() {
        const productCards = document.querySelectorAll('.product-card');
        let visibleCount = 0;

        productCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const brand = card.getAttribute('data-brand');
            const title = card.querySelector('.product-card__title').textContent.toLowerCase();
            const price = parseFloat(card.querySelector('.product-card__price').textContent.replace('$', ''));

            // Check search term
            const matchesSearch = title.includes(state.searchTerm);

            // Check category filter
            const matchesCategory = state.activeFilters.categories.length === 0 || 
                                  state.activeFilters.categories.includes(category);

            // Check brand filter
            const matchesBrand = state.activeFilters.brands.length === 0 || 
                               state.activeFilters.brands.includes(brand);

            // Check price filter
            const matchesPrice = price <= state.activeFilters.maxPrice;

            // Show or hide card
            const shouldShow = matchesSearch && matchesCategory && matchesBrand && matchesPrice;

            if (shouldShow) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide no results message
        showNoResultsIfNeeded(visibleCount);
    }

    /**
     * Show no results message if needed
     */
    function showNoResultsIfNeeded(visibleCount) {
        const grid = document.querySelector('.products-grid');
        let noResults = grid.querySelector('.no-results');

        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    background-color: #f3f4f6;
                    border-radius: 0.75rem;
                `;
                noResults.innerHTML = `
                    <p style="font-size: 1.1rem; color: #4a5565; margin-bottom: 0.5rem;">
                        No se encontraron productos
                    </p>
                    <p style="font-size: 0.9rem; color: #9ca3af;">
                        Intenta ajustar tus filtros o búsqueda
                    </p>
                `;
                grid.appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    /**
     * Apply sorting to products
     */
    function applySort() {
        const grid = document.querySelector('.products-grid');
        const cards = Array.from(grid.querySelectorAll('.product-card'));

        cards.sort((a, b) => {
            const priceA = parseFloat(a.querySelector('.product-card__price').textContent.replace('$', ''));
            const priceB = parseFloat(b.querySelector('.product-card__price').textContent.replace('$', ''));
            const titleA = a.querySelector('.product-card__title').textContent;
            const titleB = b.querySelector('.product-card__title').textContent;

            switch(state.sortBy) {
                case 'price-asc':
                    return priceA - priceB;
                case 'price-desc':
                    return priceB - priceA;
                case 'newest':
                    return cards.indexOf(b) - cards.indexOf(a);
                case 'rating':
                    const reviewsA = a.querySelector('.product-card__reviews').textContent;
                    const reviewsB = b.querySelector('.product-card__reviews').textContent;
                    return parseFloat(reviewsB) - parseFloat(reviewsA);
                default:
                    return 0;
            }
        });

        // Re-append sorted cards
        cards.forEach(card => grid.appendChild(card));
    }

    /**
     * Track page view (analytics)
     */
    function trackPageView() {
        console.log('Catalog page loaded');
    }

    /**
     * Handle window resize for responsive sidebar
     */
    window.addEventListener('resize', () => {
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        const sidebar = document.getElementById('catalogFilters');

        if (!toggleBtn) return;

        if (window.innerWidth > 768) {
            toggleBtn.style.display = 'none';
            if (sidebar) sidebar.classList.remove('active');
        } else {
            toggleBtn.style.display = 'flex';
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
