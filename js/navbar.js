/**
 * SportData - Navbar injector + behavior
 * Inserts a unified navbar into pages that use <header id="site-header"> or enhances an existing static navbar.
 */
(function () {
  'use strict';

  const LOGO_URL = 'https://www.figma.com/api/mcp/asset/4333c8d7-1c2f-46d4-be97-b4d5b794feb3';

  function buildLinks() {
    const path = window.location.pathname || '';
    if (path.indexOf('/html/') !== -1) {
      return {
        home: '../index.html',
        catalog: 'catalog.html',
        favorites: 'favorites.html',        register: 'register.html'
      };
    }
    return {
      home: 'index.html',
      catalog: 'html/catalog.html',
      favorites: 'html/favorites.html',      register: 'html/register.html'
    };
  }

  const links = buildLinks();

  const headerInner = `
    <div class="header__container">
        <div class="header__logo">
            <a href="${links.home}" aria-label="Ir al inicio">
                <img src="${LOGO_URL}" alt="SportData" class="logo-image logo-image--home">
            </a>
        </div>
        <button class="hamburger-menu" id="hamburgerBtn" aria-label="Menú de navegación" aria-expanded="false">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
        <nav class="header__nav" id="navMenu" aria-label="Navegación principal">
            <ul class="nav-list">
                <li class="nav-list__item">
                  <a href="${links.home}" class="nav-list__link">Inicio</a>
                </li>
                <li class="nav-list__item">
                  <a href="${links.catalog}" class="nav-list__link">Buscar Productos</a>
                </li>
                <li class="nav-list__item">
                  <a href="${links.favorites}" class="nav-list__link">Favoritos</a>
                </li>                <li class="nav-list__item nav-list__item--auth-mobile">
                  <a href="${links.register}" class="nav-list__link">Ingresar</a>
                </li>
            </ul>
        </nav>
        <button class="login-btn login-btn--home" type="button" aria-label="Ingresar a tu cuenta" data-href="${links.register}">
            <svg class="login-btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Ingresar</span>
        </button>
    </div>
  `;

  function initHeader(mount) {
    if (!mount) return;
    const hamburger = mount.querySelector('.hamburger-menu');
    const navMenu = mount.querySelector('.header__nav');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function () {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        navMenu.classList.toggle('active');
      });
    }

    // set active link based on data-active or pathname
    const activeKey = (mount.dataset && mount.dataset.active) || '';
    const linksEls = mount.querySelectorAll('.nav-list__link');
    linksEls.forEach(function (a) {
      a.classList.remove('nav-list__link--active');
      try {
        const href = a.getAttribute('href') || '';
        if (activeKey && href.indexOf(activeKey) !== -1) {
          a.classList.add('nav-list__link--active');
        }
      } catch (e) { /* ignore */ }
    });

    if (!activeKey) {
      const cur = window.location.pathname || '';
      linksEls.forEach(function (a) {
        try {
          const linkPath = new URL(a.href, window.location.href).pathname;
          if (cur.endsWith(linkPath) || linkPath.endsWith(cur.split('/').pop())) {
            a.classList.add('nav-list__link--active');
          }
        } catch (e) { /* ignore */ }
      });
    }

    // login button navigation
    const loginBtn = mount.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        const href = loginBtn.getAttribute('data-href');
        if (href) window.location.href = href;
      });
    }
  }

  function mountHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;
    if (!mount.classList.contains('header')) mount.classList.add('header', 'site-header');
    // inject only if empty
    if (!mount.innerHTML || !mount.innerHTML.trim()) {
      mount.innerHTML = headerInner;
    }
    initHeader(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHeader);
  } else {
    mountHeader();
  }

})();
