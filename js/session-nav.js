/**
 * ============================================
 * SportData — Session Nav Manager
 * Maneja el botón de usuario en el header
 * Incluir en todas las páginas ANTES de cerrar </body>
 * ============================================
 */
(function () {
  'use strict';

  const API_BASE = 'https://sportdata-1.onrender.com/api/auth';

  function getHomePath() {
    return window.location.pathname.includes('/html/') ? '../index.html' : 'index.html';
  }

  function getRegisterPath() {
    return window.location.pathname.includes('/html/') ? 'register.html' : 'html/register.html';
  }

  // ── Obtener usuario de localStorage ──────────────────────────────────────
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('sd_user') || 'null');
    } catch { return null; }
  }

  function getToken() {
    return localStorage.getItem('sd_token') || null;
  }

  // ── Renderizar botón según estado de sesión ───────────────────────────────
  function renderAuthButton() {
    const btn = document.querySelector('.login-btn');
    if (!btn) return;

    const user = getUser();
    const token = getToken();

    if (user && token) {
      // Usuario logueado — mostrar nombre + avatar inicial
      const initial = (user.fullName || user.full_name || 'U')[0].toUpperCase();
      const firstName = (user.fullName || user.full_name || '').split(' ')[0];

      btn.innerHTML = `
        <span class="sd-avatar">${initial}</span>
        <span class="sd-username">${firstName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      `;
      btn.classList.add('sd-btn--logged');
      btn.setAttribute('aria-label', `Menú de ${firstName}`);
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-haspopup', 'true');
      btn.onclick = null;
      btn.addEventListener('click', toggleDropdown);
    } else {
      // No logueado — botón normal
      btn.innerHTML = `
        <svg class="login-btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Ingresar</span>
      `;
      btn.classList.remove('sd-btn--logged');
      btn.setAttribute('aria-label', 'Ingresar a tu cuenta');
      btn.removeAttribute('aria-expanded');
      btn.removeAttribute('aria-haspopup');
      btn.onclick = () => { window.location.href = getRegisterPath(); };
    }
  }

  // ── Dropdown menú ─────────────────────────────────────────────────────────
  function toggleDropdown(e) {
    e.stopPropagation();
    let dropdown = document.getElementById('sd-user-dropdown');

    if (dropdown) {
      closeDropdown();
      return;
    }

    const btn = document.querySelector('.login-btn.sd-btn--logged');
    const user = getUser();
    if (!btn || !user) return;

    const fullName = user.fullName || user.full_name || 'Usuario';
    const email    = user.email || '';
    const initial  = fullName[0].toUpperCase();

    dropdown = document.createElement('div');
    dropdown.id = 'sd-user-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.innerHTML = `
      <div class="sd-drop__header">
        <div class="sd-drop__avatar">${initial}</div>
        <div class="sd-drop__info">
          <p class="sd-drop__name">${fullName}</p>
          <p class="sd-drop__email">${email}</p>
        </div>
      </div>
      <div class="sd-drop__divider"></div>
      <nav class="sd-drop__nav">
        <a href="${getHomePath()}" class="sd-drop__item" role="menuitem">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </a>
        <a href="${window.location.pathname.includes('/html/') ? 'favorites.html' : 'html/favorites.html'}" class="sd-drop__item" role="menuitem">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Mis Favoritos
        </a>
      </nav>
      <div class="sd-drop__divider"></div>
      <button class="sd-drop__logout" id="sd-logout-btn" role="menuitem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Cerrar sesión
      </button>
    `;

    // Posicionar relativo al botón
    const rect = btn.getBoundingClientRect();
    dropdown.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 8}px;
      right: ${window.innerWidth - rect.right}px;
      z-index: 9999;
    `;

    document.body.appendChild(dropdown);

    // Animación de entrada
    requestAnimationFrame(() => {
      dropdown.classList.add('sd-drop--visible');
    });

    btn.setAttribute('aria-expanded', 'true');

    // Logout
    document.getElementById('sd-logout-btn').addEventListener('click', handleLogout);

    // Cerrar al click fuera
    setTimeout(() => {
      document.addEventListener('click', closeDropdown, { once: true });
    }, 10);

    // Cerrar con Escape
    document.addEventListener('keydown', onEscClose);
  }

  function closeDropdown() {
    const dropdown = document.getElementById('sd-user-dropdown');
    if (!dropdown) return;

    dropdown.classList.remove('sd-drop--visible');
    setTimeout(() => { dropdown.remove(); }, 200);

    const btn = document.querySelector('.login-btn.sd-btn--logged');
    if (btn) btn.setAttribute('aria-expanded', 'false');

    document.removeEventListener('keydown', onEscClose);
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeDropdown();
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  function handleLogout() {
    const token = getToken();

    // Llamar al backend (si hay token)
    if (token) {
      fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    localStorage.removeItem('sd_token');
    localStorage.removeItem('sd_user');

    closeDropdown();

    // Feedback visual breve
    showToast('Sesión cerrada. ¡Hasta pronto!');

    setTimeout(() => {
      window.location.href = getHomePath();
    }, 1200);
  }

  // ── Toast notification ────────────────────────────────────────────────────
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'sd-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.classList.add('sd-toast--visible'); });

    setTimeout(() => {
      toast.classList.remove('sd-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 1000);
  }

  // ── Inyectar estilos ──────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('sd-session-styles')) return;

    const style = document.createElement('style');
    style.id = 'sd-session-styles';
    style.textContent = `
      /* ── Botón logueado ── */
      .login-btn.sd-btn--logged {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 10px 5px 5px;
        border-radius: 999px;
        border: 1.5px solid #e5e7eb;
        background: #fff;
        cursor: pointer;
        transition: border-color .2s, box-shadow .2s, background .2s;
        font-size: 0.825rem;
        font-weight: 600;
        color: #0a0a0a;
      }
      .login-btn.sd-btn--logged:hover {
        border-color: #38a8c7;
        box-shadow: 0 2px 8px rgba(56,168,199,.15);
        background: #f0fafd;
      }

      .sd-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #38a8c7 0%, #2a8ca8 100%);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        letter-spacing: 0;
      }

      .sd-username {
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ── Dropdown ── */
      #sd-user-dropdown {
        width: 240px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
        overflow: hidden;
        opacity: 0;
        transform: translateY(-6px) scale(.97);
        transition: opacity .18s ease, transform .18s ease;
      }
      #sd-user-dropdown.sd-drop--visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .sd-drop__header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        background: linear-gradient(135deg, #f0fafd 0%, #e8f7fb 100%);
      }
      .sd-drop__avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, #38a8c7 0%, #2a8ca8 100%);
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(56,168,199,.3);
      }
      .sd-drop__info { min-width: 0; }
      .sd-drop__name {
        font-size: 0.875rem;
        font-weight: 700;
        color: #101828;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sd-drop__email {
        font-size: 0.72rem;
        color: #6a7282;
        margin: 2px 0 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sd-drop__divider {
        height: 1px;
        background: #f3f4f6;
      }

      .sd-drop__nav {
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sd-drop__item {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 0.825rem;
        font-weight: 500;
        color: #374151;
        text-decoration: none;
        transition: background .15s, color .15s;
      }
      .sd-drop__item:hover {
        background: #f0fafd;
        color: #38a8c7;
      }
      .sd-drop__item svg { flex-shrink: 0; opacity: .7; }

      .sd-drop__logout {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 10px 16px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.825rem;
        font-weight: 600;
        color: #dc2626;
        transition: background .15s;
        font-family: inherit;
        margin: 2px 0 4px;
      }
      .sd-drop__logout:hover {
        background: #fef2f2;
      }
      .sd-drop__logout svg { flex-shrink: 0; }

      /* ── Toast ── */
      .sd-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: #101828;
        color: #fff;
        font-size: 0.825rem;
        font-weight: 500;
        padding: 10px 20px;
        border-radius: 999px;
        box-shadow: 0 4px 16px rgba(0,0,0,.2);
        opacity: 0;
        transition: opacity .25s, transform .25s;
        z-index: 99999;
        white-space: nowrap;
        pointer-events: none;
      }
      .sd-toast--visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    renderAuthButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
