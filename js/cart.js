/**
 *========================================
 * SportData - Cart Page JavaScript
 * ========================================
 * Handles cart display, quantity changes, and checkout
 */

(function() {
    'use strict';

    // State
    const cartState = {
        items: [],
        subtotal: 0,
        taxRate: 0.10,
        freeShippingThreshold: 50
    };

    /**
     * Initialize the application
     */
    function init() {
        setupHamburgerMenu();
        setupNavigation();
        loadCart();
        renderCart();
        setupEventListeners();
    }

    /**
     * Setup hamburger menu for mobile
     */
    function setupHamburgerMenu() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-list__link');

        if (!hamburgerBtn || !navMenu) return;

        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
            hamburgerBtn.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header') && navMenu.classList.contains('active')) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });
    }

    /**
     * Setup navigation active states
     */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-list__link');
        navLinks.forEach(link => {
            link.classList.remove('nav-list__link--active');
            if (link.getAttribute('href') === 'cart.html') {
                link.classList.add('nav-list__link--active');
            }
        });
    }

    /**
     * Load cart from localStorage
     */
    function loadCart() {
        const stored = localStorage.getItem('cart');
        if (stored) {
            try {
                cartState.items = JSON.parse(stored);
            } catch (e) {
                cartState.items = [];
            }
        }
    }

    /**
     * Render cart
     */
    function renderCart() {
        const cartSection = document.getElementById('cartSection');
        const emptyCart = document.getElementById('emptyCart');

        if (cartState.items.length === 0) {
            // Show empty cart
            cartSection.style.display = 'none';
            emptyCart.style.display = 'block';
        } else {
            // Show cart with items
            emptyCart.style.display = 'none';
            cartSection.style.display = 'block';
            renderCartItems();
            calculateTotals();
            updateCartSummary();
        }
    }

    /**
     * Render cart items
     */
    function renderCartItems() {
        const cartItemsList = document.getElementById('cartItemsList');
        cartItemsList.innerHTML = '';

        cartState.items.forEach((item, index) => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            
            // Parse price if it's a string
            const price = typeof item.price === 'string' 
                ? parseFloat(item.price.replace('$', '')) 
                : item.price;

            const itemTotal = price * item.quantity;

            cartItem.innerHTML = `
                <div class="cart-item__image">
                    <img src="${item.image}" alt="${item.name}">
                </div>

                <div class="cart-item__details">
                    <h3 class="cart-item__name">${item.name}</h3>
                    <p class="cart-item__price">$${price.toFixed(2)}</p>
                    
                    ${item.size ? `<p class="cart-item__spec"><strong>Talla:</strong> ${item.size}</p>` : ''}
                    ${item.color ? `<p class="cart-item__spec"><strong>Color:</strong> ${item.color}</p>` : ''}
                </div>

                <div class="cart-item__quantity">
                    <label for="qty-${index}" class="quantity-label">Cantidad:</label>
                    <div class="quantity-control">
                        <button class="quantity-btn decrease-qty" data-index="${index}" aria-label="Disminuir cantidad">−</button>
                        <input type="number" id="qty-${index}" class="quantity-input" value="${item.quantity}" min="1" max="99" data-index="${index}">
                        <button class="quantity-btn increase-qty" data-index="${index}" aria-label="Aumentar cantidad">+</button>
                    </div>
                </div>

                <div class="cart-item__total">
                    <p class="cart-item__total-price">$${itemTotal.toFixed(2)}</p>
                </div>

                <button class="cart-item__remove" data-index="${index}" aria-label="Eliminar ${item.name} del carrito">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            cartItemsList.appendChild(cartItem);
        });
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const cartItemsList = document.getElementById('cartItemsList');

        // Event delegation for quantity buttons and inputs
        if (cartItemsList) {
            cartItemsList.addEventListener('click', (e) => {
                if (e.target.classList.contains('increase-qty')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    updateQuantity(index, cartState.items[index].quantity + 1);
                } else if (e.target.classList.contains('decrease-qty')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    updateQuantity(index, Math.max(1, cartState.items[index].quantity - 1));
                } else if (e.target.classList.contains('cart-item__remove')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    removeItem(index);
                }
            });

            cartItemsList.addEventListener('change', (e) => {
                if (e.target.classList.contains('quantity-input')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    let value = parseInt(e.target.value) || 1;
                    value = Math.max(1, Math.min(99, value));
                    e.target.value = value;
                    updateQuantity(index, value);
                }
            });
        }
    }

    /**
     * Update item quantity
     */
    function updateQuantity(index, newQuantity) {
        if (index >= 0 && index < cartState.items.length) {
            cartState.items[index].quantity = newQuantity;
            saveCart();
            renderCart();
            setupEventListeners();
        }
    }

    /**
     * Remove item from cart
     */
    function removeItem(index) {
        if (index >= 0 && index < cartState.items.length) {
            cartState.items.splice(index, 1);
            saveCart();
            renderCart();
            setupEventListeners();
        }
    }

    /**
     * Calculate totals
     */
    function calculateTotals() {
        cartState.subtotal = 0;

        cartState.items.forEach(item => {
            const price = typeof item.price === 'string' 
                ? parseFloat(item.price.replace('$', '')) 
                : item.price;
            cartState.subtotal += price * item.quantity;
        });
    }

    /**
     * Update cart summary
     */
    function updateCartSummary() {
        const taxes = cartState.subtotal * cartState.taxRate;
        const shipping = cartState.subtotal >= cartState.freeShippingThreshold ? 0 : 10;
        const total = cartState.subtotal + taxes + shipping;

        const subtotalEl = document.getElementById('subtotal');
        const taxesEl = document.getElementById('taxes');
        const shippingEl = document.getElementById('shipping');
        const totalEl = document.getElementById('total');

        if (subtotalEl) subtotalEl.textContent = `$${cartState.subtotal.toFixed(2)}`;
        if (taxesEl) taxesEl.textContent = `$${taxes.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = shipping === 0 ? '¡Gratis!' : `$${shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    /**
     * Save cart to localStorage
     */
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cartState.items));
    }

    /**
     * Track page view
     */
    function trackPageView() {
        console.log('Cart page viewed');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose some functions globally for debugging
    window.cartDebug = {
        getCart: () => cartState.items,
        clearCart: () => {
            cartState.items = [];
            saveCart();
            renderCart();
            setupEventListeners();
        }
    };
})();
