/**
 * ========================================
 * SportData — Register / Login Page JS
 * ========================================
 * Conecta con el backend Node.js en /api/auth
 */

(function () {
  'use strict';

  // URL base de la API — en desarrollo apunta al servidor local
  const API_BASE = 'http://localhost:3000/api/auth';

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    setupHamburgerMenu();
    setupTabNavigation();
    setupLoginForm();
    setupRegisterForm();
    checkAlreadyLoggedIn();
  }

  // ─── Si ya hay sesión activa, redirigir al inicio ─────────────────────────
  function checkAlreadyLoggedIn() {
    const token = localStorage.getItem('sd_token');
    if (token) {
      // Verificar que el token siga siendo válido consultando /me
      fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) window.location.href = getHomePath();
        })
        .catch(() => {
          // Token inválido o servidor caído → limpiar y seguir en la página
          localStorage.removeItem('sd_token');
          localStorage.removeItem('sd_user');
        });
    }
  }

  function getHomePath() {
    return window.location.pathname.includes('/html/') ? '../index.html' : 'index.html';
  }

  // ─── Hamburger menu ───────────────────────────────────────────────────────
  function setupHamburgerMenu() {
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

  // ─── Tab navigation ───────────────────────────────────────────────────────
  function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels  = document.querySelectorAll('.tab-panel');

    tabButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => {
          b.classList.remove('tab-button--active');
          b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(p => p.classList.remove('tab-panel--active'));

        btn.classList.add('tab-button--active');
        btn.setAttribute('aria-selected', 'true');
        tabPanels[i].classList.add('tab-panel--active');

        // Limpiar mensajes de error al cambiar de tab
        clearAllErrors();
        clearGlobalMessage();
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const next = e.key === 'ArrowRight'
            ? (i + 1) % tabButtons.length
            : (i - 1 + tabButtons.length) % tabButtons.length;
          tabButtons[next].focus();
          tabButtons[next].click();
        }
      });
    });
  }

  // ─── Validadores ─────────────────────────────────────────────────────────
  const validators = {
    fullName(v) {
      if (!v || v.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
      if (!/^[a-záéíóúñüÁÉÍÓÚÑÜ\s]+$/i.test(v.trim())) return 'Solo letras y espacios.';
      return null;
    },
    email(v) {
      if (!v || !v.trim()) return 'El correo es requerido.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Ingresa un correo válido.';
      return null;
    },
    password(v) {
      if (!v) return 'La contraseña es requerida.';
      if (v.length < 8)       return 'Mínimo 8 caracteres.';
      if (!/[a-z]/.test(v))   return 'Debe incluir una letra minúscula.';
      if (!/[A-Z]/.test(v))   return 'Debe incluir una letra mayúscula.';
      if (!/[0-9]/.test(v))   return 'Debe incluir un número.';
      return null;
    },
    passwordLogin(v) {
      if (!v) return 'La contraseña es requerida.';
      return null;
    },
    confirmPassword(pass, confirm) {
      if (!confirm) return 'Confirma tu contraseña.';
      if (pass !== confirm) return 'Las contraseñas no coinciden.';
      return null;
    }
  };

  function showError(inputEl, errorId, message) {
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.textContent = message || '';
    if (inputEl) inputEl.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.form-input').forEach(el => { el.removeAttribute('aria-invalid'); });
  }

  // ─── Mensaje global (éxito / error) ──────────────────────────────────────
  function showGlobalMessage(container, message, type = 'error') {
    clearGlobalMessage();

    const div = document.createElement('div');
    div.id = 'global-msg';
    div.setAttribute('role', 'alert');
    div.setAttribute('aria-live', 'polite');

    const colors = {
      error:   { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
      success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      info:    { bg: '#e0f2fe', border: '#38a8c7', text: '#0c4a6e' }
    };
    const c = colors[type] || colors.error;

    div.style.cssText = `
      padding: .875rem 1rem;
      background: ${c.bg};
      border-left: 4px solid ${c.border};
      border-radius: .375rem;
      margin-bottom: 1rem;
      font-size: .875rem;
      color: ${c.text};
      font-weight: 500;
    `;
    div.textContent = message;

    container.insertBefore(div, container.firstChild);
  }

  function clearGlobalMessage() {
    const el = document.getElementById('global-msg');
    if (el) el.remove();
  }

  // ─── Botón de carga ───────────────────────────────────────────────────────
  function setLoading(btn, loading, originalText) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Cargando...' : originalText;
    btn.style.opacity = loading ? '0.75' : '1';
  }

  // ─── Guardar sesión en localStorage ──────────────────────────────────────
  function saveSession(token, user) {
    localStorage.setItem('sd_token', token);
    localStorage.setItem('sd_user', JSON.stringify(user));
  }

  // ─── FORMULARIO DE LOGIN ──────────────────────────────────────────────────
  function setupLoginForm() {
    const form     = document.getElementById('loginForm');
    const emailIn  = document.getElementById('login-email');
    const passIn   = document.getElementById('login-password');
    if (!form) return;

    // Validación en tiempo real
    emailIn?.addEventListener('blur', () =>
      showError(emailIn, 'login-email-error', validators.email(emailIn.value))
    );
    passIn?.addEventListener('blur', () =>
      showError(passIn, 'login-password-error', validators.passwordLogin(passIn.value))
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailErr = validators.email(emailIn.value);
      const passErr  = validators.passwordLogin(passIn.value);

      showError(emailIn, 'login-email-error', emailErr);
      showError(passIn,  'login-password-error', passErr);

      if (emailErr || passErr) {
        emailErr ? emailIn.focus() : passIn.focus();
        return;
      }

      const submitBtn = form.querySelector('.submit-button');
      const origText  = submitBtn.textContent;
      setLoading(submitBtn, true, origText);
      clearGlobalMessage();

      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:    emailIn.value.trim().toLowerCase(),
            password: passIn.value
          })
        });

        const data = await response.json();

        if (!response.ok) {
          // Errores de campo
          if (data.fields) {
            if (data.fields.email)    showError(emailIn, 'login-email-error',    data.fields.email);
            if (data.fields.password) showError(passIn,  'login-password-error', data.fields.password);
          }
          showGlobalMessage(form.parentElement, data.error || 'Error al iniciar sesión.', 'error');
          setLoading(submitBtn, false, origText);
          return;
        }

        // ── Éxito ──
        saveSession(data.token, data.user);
        showGlobalMessage(form.parentElement, `¡Bienvenido, ${data.user.fullName}! Redirigiendo...`, 'success');

        setTimeout(() => {
          window.location.href = getHomePath();
        }, 1500);

      } catch (err) {
        showGlobalMessage(
          form.parentElement,
          'No se pudo conectar con el servidor. Verifica que el backend esté activo.',
          'error'
        );
        setLoading(submitBtn, false, origText);
      }
    });
  }

  // ─── FORMULARIO DE REGISTRO ───────────────────────────────────────────────
  function setupRegisterForm() {
    const form      = document.getElementById('registerForm');
    const nameIn    = document.getElementById('register-name');
    const emailIn   = document.getElementById('register-email');
    const passIn    = document.getElementById('register-password');
    const confirmIn = document.getElementById('register-confirm');
    if (!form) return;

    // Validación en tiempo real (blur)
    nameIn?.addEventListener('blur', () =>
      showError(nameIn, 'name-error', validators.fullName(nameIn.value))
    );
    emailIn?.addEventListener('blur', () =>
      showError(emailIn, 'email-error', validators.email(emailIn.value))
    );
    passIn?.addEventListener('blur', () =>
      showError(passIn, 'password-error', validators.password(passIn.value))
    );
    confirmIn?.addEventListener('blur', () =>
      showError(confirmIn, 'confirm-error', validators.confirmPassword(passIn.value, confirmIn.value))
    );
    // Re-validar confirmación si cambia la contraseña
    passIn?.addEventListener('input', () => {
      if (confirmIn.value) {
        showError(confirmIn, 'confirm-error', validators.confirmPassword(passIn.value, confirmIn.value));
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameErr    = validators.fullName(nameIn.value);
      const emailErr   = validators.email(emailIn.value);
      const passErr    = validators.password(passIn.value);
      const confirmErr = validators.confirmPassword(passIn.value, confirmIn.value);

      showError(nameIn,    'name-error',    nameErr);
      showError(emailIn,   'email-error',   emailErr);
      showError(passIn,    'password-error', passErr);
      showError(confirmIn, 'confirm-error', confirmErr);

      if (nameErr || emailErr || passErr || confirmErr) {
        (nameErr ? nameIn : emailErr ? emailIn : passErr ? passIn : confirmIn).focus();
        return;
      }

      const submitBtn = form.querySelector('.submit-button');
      const origText  = submitBtn.textContent;
      setLoading(submitBtn, true, origText);
      clearGlobalMessage();

      try {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: nameIn.value.trim(),
            email:    emailIn.value.trim().toLowerCase(),
            password: passIn.value
          })
        });

        const data = await response.json();

        if (!response.ok) {
          // Errores de campo específicos devueltos por el backend
          if (data.fields) {
            if (data.fields.fullName) showError(nameIn,  'name-error',  data.fields.fullName);
            if (data.fields.email)    showError(emailIn, 'email-error', data.fields.email);
            if (data.fields.password) showError(passIn,  'password-error', data.fields.password);
          }
          showGlobalMessage(form.parentElement, data.error || 'Error al registrar.', 'error');
          setLoading(submitBtn, false, origText);
          return;
        }

        // ── Éxito ──
        saveSession(data.token, data.user);
        form.reset();
        showGlobalMessage(
          form.parentElement,
          `¡Cuenta creada! Bienvenido, ${data.user.fullName}. Redirigiendo...`,
          'success'
        );

        setTimeout(() => {
          window.location.href = getHomePath();
        }, 2000);

      } catch (err) {
        showGlobalMessage(
          form.parentElement,
          'No se pudo conectar con el servidor. Verifica que el backend esté activo en localhost:3000.',
          'error'
        );
        setLoading(submitBtn, false, origText);
      }
    });
  }

  // ─── Arrancar ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
