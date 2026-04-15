/**
 *========================================
 * SportData - Cart Page JavaScript
 * ========================================
 * Handles mobile menu and navigation
 */

(function() {
    'use strict';

    /**
     * Initialize the application
     */
    function init() {
        setupHamburgerMenu();
        setupNavigation();
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
            if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                navMenu.classList.remove('active');
            }
        });
    }

    /**
     * Setup navigation active state
     */
    function setupNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-list__link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('nav-list__link--active');
            } else {
                link.classList.remove('nav-list__link--active');
            }
        });
    }

    /**
     * Track page view for analytics
     */
    function trackPageView() {
        // Placeholder for analytics
        console.log('Page view tracked: Cart');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
