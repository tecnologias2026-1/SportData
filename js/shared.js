/**
 * ========================================
 * SHARED UTILITIES - SportData
 * Common functions used across all pages
 * ========================================
 */

/**
 * Setup hamburger menu for mobile navigation
 * Should be called in each page's init function
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
 * Initialize document based on DOM state
 * Use this wrapper in all page scripts
 */
function initializeApp(initCallback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCallback);
    } else {
        initCallback();
    }
}
