/**
 *========================================
 * SportData - Favorites Page JavaScript
 * ========================================
 * Handles interactivity and user interactions
 */

(function() {
    'use strict';

    /**
     * Initialize the application
     */
    function init() {
        setupHamburgerMenu();
        setupNavigation();
        setupButtons();
        setupEventListeners();
        trackPageView();
    }

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
            // Remove previous active state
            link.classList.remove('nav-list__link--active');
            
            // Check if link matches current page
            const href = link.getAttribute('href');
            const currentPath = window.location.pathname;
            
            if (href === currentPath || (href === '/favorites' && currentPath.includes('favorites'))) {
                link.classList.add('nav-list__link--active');
            }
        });
    }

    /**
     * Setup button interactions
     */
    function setupButtons() {
        // Login button
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLoginClick);
            loginBtn.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLoginClick();
                }
            });
        }

        // CTA Button (Explore catalog)
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.addEventListener('click', handleCTAClick);
            ctaButton.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCTAClick();
                }
            });
        }

        // Footer links
        const footerLinks = document.querySelectorAll('.footer-links__item');
        footerLinks.forEach(link => {
            link.addEventListener('click', handleLinkClick);
        });
    }

    /**
     * Setup global event listeners
     */
    function setupEventListeners() {
        // Handle responsive behavior
        setupResponsiveMenu();
        
        // Analytics events
        document.addEventListener('click', trackEvent);
    }

    /**
     * Handle login button click
     */
    function handleLoginClick() {
        const isClicked = this.getAttribute('aria-pressed') === 'true';
        
        console.log('Login button clicked');
        
        // Simulate navigation to login page (in real app, use router)
        // window.location.href = '/login';
        
        // For demo: show a message
        showNotification('Redirigiendo a página de ingreso...', 'info');
    }

    /**
     * Handle CTA button click
     */
    function handleCTAClick(e) {
        e.preventDefault();
        
        console.log('Explore catalog button clicked');
        
        // Add ripple effect
        addRippleEffect(this, e);
        
        // Simulate navigation
        const href = this.getAttribute('href');
        if (href) {
            // In a real app with routing, use: router.push(href)
            showNotification('Redirigiendo al catálogo...', 'info');
            
            // Simulate delay then navigate
            setTimeout(() => {
                window.location.href = href;
            }, 500);
        }
    }

    /**
     * Handle footer link click
     */
    function handleLinkClick(e) {
        const target = e.target.closest('a');
        if (target) {
            const href = target.getAttribute('href');
            console.log('Navigation to:', href);
        }
    }

    /**
     * Add ripple effect to buttons
     */
    function addRippleEffect(button, event) {
        const rippleContainer = document.createElement('span');
        rippleContainer.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        rippleContainer.style.width = rippleContainer.style.height = size + 'px';
        rippleContainer.style.left = x + 'px';
        rippleContainer.style.top = y + 'px';
        
        button.appendChild(rippleContainer);
        
        // Remove ripple after animation
        setTimeout(() => {
            rippleContainer.remove();
        }, 600);
    }

    /**
     * Show notification message
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.classList.add('notification', `notification--${type}`);
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('notification--visible');
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('notification--visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Setup responsive menu behavior
     */
    function setupResponsiveMenu() {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        function handleMediaChange(e) {
            if (e.matches) {
                // Mobile mode
                console.log('Mobile mode activated');
            } else {
                // Desktop mode
                console.log('Desktop mode activated');
            }
        }
        
        mediaQuery.addEventListener('change', handleMediaChange);
    }

    /**
     * Track page view (analytics)
     */
    function trackPageView() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_path: window.location.pathname
            });
        }
    }

    /**
     * Track events (analytics)
     */
    function trackEvent(e) {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        const eventLabel = target.textContent.trim() || target.getAttribute('aria-label');
        const eventCategory = target.classList[0];
        
        console.log('Event tracked:', {
            category: eventCategory,
            label: eventLabel,
            action: e.type
        });
        
        // Send to analytics (if available)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventCategory, {
                event_label: eventLabel
            });
        }
    }

    /**
     * Store user preference (cart, favorites, etc.)
     */
    function saveFavorite(productId) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (!favorites.includes(productId)) {
            favorites.push(productId);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            return true;
        }
        return false;
    }

    /**
     * Remove favorite
     */
    function removeFavorite(productId) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const index = favorites.indexOf(productId);
        if (index > -1) {
            favorites.splice(index, 1);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            return true;
        }
        return false;
    }

    /**
     * Get all favorites
     */
    function getFavorites() {
        return JSON.parse(localStorage.getItem('favorites') || '[]');
    }

    /**
     * Check if product is favorite
     */
    function isFavorite(productId) {
        return getFavorites().includes(productId);
    }

    /**
     * Update cart count in navigation
     */
    function updateCartCount(count) {
        const cartLink = document.querySelector('.nav-list__link--badge');
        if (cartLink) {
            let countBadge = cartLink.querySelector('.cart-count');
            if (!countBadge) {
                countBadge = document.createElement('span');
                countBadge.classList.add('cart-count');
                cartLink.appendChild(countBadge);
            }
            countBadge.textContent = count;
            countBadge.setAttribute('aria-label', `${count} productos en el carrito`);
        }
    }

    /**
     * Get cart items
     */
    function getCartItems() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    }

    /**
     * Add item to cart
     */
    function addToCart(productId) {
        const cart = getCartItems();
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity += 1;
        } else {
            cart.push({ id: productId, quantity: 1 });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount(cart.length);
        return true;
    }

    /**
     * Remove item from cart
     */
    function removeFromCart(productId) {
        const cart = getCartItems();
        const filteredCart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(filteredCart));
        updateCartCount(filteredCart.length);
        return true;
    }

    /**
     * Public API
     */
    window.SportData = {
        favorites: {
            save: saveFavorite,
            remove: removeFavorite,
            getAll: getFavorites,
            isFavorite: isFavorite
        },
        cart: {
            add: addToCart,
            remove: removeFromCart,
            getItems: getCartItems,
            updateCount: updateCartCount
        },
        utils: {
            showNotification: showNotification,
            trackEvent: trackEvent
        }
    };

    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/**
 * ========================================
 * CSS for Notifications (injected)
 * ========================================
 */
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transform: translateY(2rem);
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .notification--visible {
            opacity: 1;
            transform: translateY(0);
        }

        .notification--info {
            background-color: #38a8c7;
            color: #ffffff;
        }

        .notification--success {
            background-color: #10b981;
            color: #ffffff;
        }

        .notification--error {
            background-color: #ef4444;
            color: #ffffff;
        }

        .notification--warning {
            background-color: #f59e0b;
            color: #ffffff;
        }

        @media (max-width: 480px) {
            .notification {
                bottom: 1rem;
                right: 1rem;
                left: 1rem;
            }
        }

        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }

        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        .cart-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.25rem;
            height: 1.25rem;
            background-color: #ef4444;
            color: white;
            border-radius: 50%;
            font-size: 0.625rem;
            font-weight: 700;
            margin-left: 0.25rem;
        }
    `;
    document.head.appendChild(style);
})();
