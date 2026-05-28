/**
 * ============================================
 * SportData — Forgot Password Flow
 * Guardar como: js/forgot-password.js
 * Agregar en register.html antes de </body>:
 *   <script src="../js/forgot-password.js"></script>
 * ============================================
 */

(function () {
  'use strict';

  const API_BASE = (window.SPORTDATA_API_URL || 'http://localhost:3000') + '/api/auth';

  const resetState = {
    email: '',
    resetToken: ''
  };

  function initForgotPassword() {
    const link = document.querySelector('.forgot-password-link');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  function openModal() {
    if (document.getElementById('sd-reset-modal')) return;
    injectModalStyles();

    const overlay = document.createElement('div');
    overlay.id = 'sd-reset-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sd-modal-title');
    overlay.innerHTML = buildStep1HTML();
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('sd-modal--visible'));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', onModalEsc);
    bindStep1Events();
  }

  function closeModal() {
    const overlay = document.getElementById('sd-reset-modal');
    if (!overlay) return;
    overlay.classList.remove('sd-modal--visible');
    setTimeout(() => overlay.remove(), 250);
    document.removeEventListener('keydown', onModalEsc);
    resetState.email = '';
    resetState.resetToken = '';
  }

  function onModalEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  // ── PASO 1: email ─────────────────────────────────────────────────────────
  function buildStep1HTML() {
    return `
      <div class="sd-modal__box" role="document">
        <button class="sd-modal__close" aria-label="Cerrar" id="sd-modal-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="sd-modal__icon sd-modal__icon--blue">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <h2 class="sd-modal__title" id="sd-modal-title">Recuperar contraseña</h2>
        <p class="sd-modal__desc">Ingresa tu correo y te enviaremos un código de verificación.</p>
        <div class="sd-modal__steps">
          <div class="sd-step sd-step--active"></div>
          <div class="sd-step"></div>
          <div class="sd-step"></div>
        </div>
        <div class="sd-modal__field">
          <label class="sd-modal__label" for="sd-reset-email">Correo electrónico</label>
          <input type="email" id="sd-reset-email" class="sd-modal__input"
            placeholder="tu@email.com" autocomplete="email" autofocus>
          <span class="sd-modal__error" id="sd-reset-email-err"></span>
        </div>
        <div id="sd-dev-hint" class="sd-modal__dev-hint" style="display:none"></div>
        <button class="sd-modal__btn" id="sd-step1-submit">
          <span>Enviar código</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>`;
  }

  function bindStep1Events() {
    document.getElementById('sd-modal-close').addEventListener('click', closeModal);

    const emailInput = document.getElementById('sd-reset-email');
    const submitBtn  = document.getElementById('sd-step1-submit');

    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });

    submitBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const errEl = document.getElementById('sd-reset-email-err');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Ingresa un correo válido.';
        emailInput.focus();
        return;
      }
      errEl.textContent = '';
      setButtonLoading(submitBtn, true, 'Enviando...');

      try {
        const res  = await fetch(`${API_BASE}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        resetState.email = email;

        if (data.dev_code) {
          const hint = document.getElementById('sd-dev-hint');
          hint.style.display = 'flex';
          hint.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <span><strong>Modo desarrollo:</strong> Tu código es
              <strong class="sd-code-preview">${data.dev_code}</strong>
            </span>`;
        }

        setTimeout(() => goToStep2(), data.dev_code ? 1400 : 400);

      } catch {
        document.getElementById('sd-reset-email-err').textContent =
          'No se pudo conectar con el servidor.';
        setButtonLoading(submitBtn, false, 'Enviar código');
      }
    });
  }

  // ── PASO 2: código ────────────────────────────────────────────────────────
  function goToStep2() {
    const box = document.querySelector('.sd-modal__box');
    if (!box) return;

    box.innerHTML = `
      <button class="sd-modal__close" aria-label="Cerrar" id="sd-modal-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="sd-modal__icon sd-modal__icon--teal">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 class="sd-modal__title" id="sd-modal-title">Verificar código</h2>
      <p class="sd-modal__desc">
        Ingresa el código de 6 dígitos enviado a<br>
        <strong>${resetState.email}</strong>
      </p>
      <div class="sd-modal__steps">
        <div class="sd-step sd-step--done"></div>
        <div class="sd-step sd-step--active"></div>
        <div class="sd-step"></div>
      </div>
      <div class="sd-code-inputs" id="sd-code-inputs">
        ${[0,1,2,3,4,5].map(i => `
          <input type="text" maxlength="1" class="sd-code-digit"
            data-index="${i}" inputmode="numeric" pattern="[0-9]"
            aria-label="Dígito ${i+1} del código">
        `).join('')}
      </div>
      <span class="sd-modal__error" id="sd-reset-code-err"></span>
      <button class="sd-modal__btn" id="sd-step2-submit" disabled>
        <span>Verificar código</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <button class="sd-modal__link" id="sd-resend-btn">
        ¿No recibiste el código? <strong>Reenviar</strong>
      </button>`;

    document.getElementById('sd-modal-close').addEventListener('click', closeModal);
    bindStep2Events();

    setTimeout(() => {
      const first = document.querySelector('.sd-code-digit');
      if (first) first.focus();
    }, 50);
  }

  function bindStep2Events() {
    const digits    = document.querySelectorAll('.sd-code-digit');
    const submitBtn = document.getElementById('sd-step2-submit');
    const errEl     = document.getElementById('sd-reset-code-err');

    function checkComplete() {
      const code = Array.from(digits).map(d => d.value).join('');
      submitBtn.disabled = code.length < 6;
      errEl.textContent  = '';
      digits.forEach(d => {
        d.classList.toggle('sd-code-digit--filled', d.value.length === 1);
      });
    }

    digits.forEach((input, idx) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value && idx < digits.length - 1) digits[idx + 1].focus();
        checkComplete();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && idx > 0) {
          digits[idx - 1].focus();
          digits[idx - 1].value = '';
          checkComplete();
        }
        if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
          .getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        pasted.split('').forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
        const last = Math.min(pasted.length, digits.length - 1);
        digits[last].focus();
        checkComplete();
      });
    });

    submitBtn.addEventListener('click', async () => {
      const code = Array.from(digits).map(d => d.value).join('');
      errEl.textContent = '';
      setButtonLoading(submitBtn, true, 'Verificando...');

      try {
        const res  = await fetch(`${API_BASE}/verify-reset-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetState.email, code })
        });
        const data = await res.json();

        if (!res.ok) {
          errEl.textContent = data.error || 'Código inválido.';
          digits.forEach(d => { d.value = ''; d.classList.add('sd-code-digit--error'); });
          setTimeout(() => digits.forEach(d => d.classList.remove('sd-code-digit--error')), 600);
          digits[0].focus();
          setButtonLoading(submitBtn, false, 'Verificar código');
          return;
        }

        resetState.resetToken = data.reset_token;
        goToStep3();

      } catch {
        errEl.textContent = 'Error de conexión.';
        setButtonLoading(submitBtn, false, 'Verificar código');
      }
    });

    document.getElementById('sd-resend-btn').addEventListener('click', async () => {
      const btn = document.getElementById('sd-resend-btn');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        await fetch(`${API_BASE}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetState.email })
        });
        btn.textContent = '¡Código reenviado!';
      } catch {
        btn.textContent = 'Error al reenviar';
      }
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '¿No recibiste el código? <strong>Reenviar</strong>';
      }, 3000);
    });
  }

  // ── PASO 3: nueva contraseña ──────────────────────────────────────────────
  function goToStep3() {
    const box = document.querySelector('.sd-modal__box');
    if (!box) return;

    box.innerHTML = `
      <button class="sd-modal__close" aria-label="Cerrar" id="sd-modal-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="sd-modal__icon sd-modal__icon--green">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h2 class="sd-modal__title" id="sd-modal-title">Nueva contraseña</h2>
      <p class="sd-modal__desc">Elige una contraseña segura para tu cuenta.</p>
      <div class="sd-modal__steps">
        <div class="sd-step sd-step--done"></div>
        <div class="sd-step sd-step--done"></div>
        <div class="sd-step sd-step--active"></div>
      </div>

      <div class="sd-modal__field">
        <label class="sd-modal__label" for="sd-new-pass">Nueva contraseña</label>
        <div class="sd-pass-wrap">
          <input type="password" id="sd-new-pass" class="sd-modal__input"
            placeholder="Mínimo 8 caracteres" autocomplete="new-password" autofocus>
          <button type="button" class="sd-pass-toggle" id="sd-toggle1" aria-label="Mostrar contraseña">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="sd-strength">
          <div class="sd-strength__bar"><div class="sd-strength__fill" id="sd-sfill"></div></div>
          <span class="sd-strength__label" id="sd-slabel"></span>
        </div>
        <span class="sd-modal__error" id="sd-new-pass-err"></span>
      </div>

      <div class="sd-modal__field">
        <label class="sd-modal__label" for="sd-confirm-pass">Confirmar contraseña</label>
        <div class="sd-pass-wrap">
          <input type="password" id="sd-confirm-pass" class="sd-modal__input"
            placeholder="Repite la contraseña" autocomplete="new-password">
          <button type="button" class="sd-pass-toggle" id="sd-toggle2" aria-label="Mostrar contraseña">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <span class="sd-modal__error" id="sd-confirm-pass-err"></span>
      </div>

      <button class="sd-modal__btn" id="sd-step3-submit">
        <span>Cambiar contraseña</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>`;

    document.getElementById('sd-modal-close').addEventListener('click', closeModal);
    bindStep3Events();
  }

  function bindStep3Events() {
    const passIn    = document.getElementById('sd-new-pass');
    const confIn    = document.getElementById('sd-confirm-pass');
    const submitBtn = document.getElementById('sd-step3-submit');

    document.getElementById('sd-toggle1').addEventListener('click', () => {
      passIn.type = passIn.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('sd-toggle2').addEventListener('click', () => {
      confIn.type = confIn.type === 'password' ? 'text' : 'password';
    });

    passIn.addEventListener('input', () => {
      const v = passIn.value;
      let score = 0;
      if (v.length >= 8)           score++;
      if (/[a-z]/.test(v))         score++;
      if (/[A-Z]/.test(v))         score++;
      if (/[0-9]/.test(v))         score++;
      if (/[^a-zA-Z0-9]/.test(v))  score++;

      const colors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
      const labels = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
      const fill   = document.getElementById('sd-sfill');
      const label  = document.getElementById('sd-slabel');

      fill.style.width      = `${score * 20}%`;
      fill.style.background = colors[score] || '#e5e7eb';
      label.textContent     = labels[score] || '';
      label.style.color     = colors[score] || '';

      document.getElementById('sd-new-pass-err').textContent = '';
    });

    submitBtn.addEventListener('click', async () => {
      const pass = passIn.value;
      const conf = confIn.value;
      const passErr = document.getElementById('sd-new-pass-err');
      const confErr = document.getElementById('sd-confirm-pass-err');
      passErr.textContent = '';
      confErr.textContent = '';

      if (!pass || pass.length < 8 || !/[a-z]/.test(pass) ||
          !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) {
        passErr.textContent = 'Mínimo 8 caracteres con mayúsculas, minúsculas y números.';
        passIn.focus();
        return;
      }
      if (pass !== conf) {
        confErr.textContent = 'Las contraseñas no coinciden.';
        confIn.focus();
        return;
      }

      setButtonLoading(submitBtn, true, 'Guardando...');

      try {
        const res  = await fetch(`${API_BASE}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reset_token: resetState.resetToken, new_password: pass })
        });
        const data = await res.json();

        if (!res.ok) {
          passErr.textContent = data.error || 'Error al cambiar contraseña.';
          setButtonLoading(submitBtn, false, 'Cambiar contraseña');
          return;
        }

        showSuccess();

      } catch {
        passErr.textContent = 'Error de conexión.';
        setButtonLoading(submitBtn, false, 'Cambiar contraseña');
      }
    });
  }

  // ── Pantalla éxito ────────────────────────────────────────────────────────
  function showSuccess() {
    const box = document.querySelector('.sd-modal__box');
    if (!box) return;

    box.innerHTML = `
      <div class="sd-modal__success">
        <div class="sd-success-circle">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 class="sd-modal__title">¡Contraseña actualizada!</h2>
        <p class="sd-modal__desc">
          Tu contraseña ha sido cambiada correctamente.<br>Ya puedes iniciar sesión.
        </p>
        <button class="sd-modal__btn" id="sd-success-close">Iniciar sesión</button>
      </div>`;

    document.getElementById('sd-success-close').addEventListener('click', () => {
      closeModal();
      const loginTab = document.querySelector('.tab-button[data-tab="login"]');
      if (loginTab) loginTab.click();
    });
  }

  // ── Helper loading ────────────────────────────────────────────────────────
  function setButtonLoading(btn, loading, loadingText) {
    btn.disabled = loading;
    const span = btn.querySelector('span');
    if (!btn.dataset.origText && span) btn.dataset.origText = span.textContent;
    if (span) span.textContent = loading ? loadingText : btn.dataset.origText;
    btn.style.opacity = loading ? '0.7' : '1';
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  function injectModalStyles() {
    if (document.getElementById('sd-reset-styles')) return;
    const style = document.createElement('style');
    style.id = 'sd-reset-styles';
    style.textContent = `
      #sd-reset-modal {
        position:fixed;inset:0;
        background:rgba(10,10,10,.55);
        backdrop-filter:blur(4px);
        display:flex;align-items:center;justify-content:center;
        z-index:99999;padding:16px;
        opacity:0;transition:opacity .25s;
      }
      #sd-reset-modal.sd-modal--visible{opacity:1;}

      .sd-modal__box {
        background:#fff;border-radius:20px;
        padding:32px 28px 28px;width:100%;max-width:400px;
        position:relative;
        box-shadow:0 24px 64px rgba(0,0,0,.18);
        transform:translateY(12px) scale(.97);
        transition:transform .25s;
        max-height:90vh;overflow-y:auto;
      }
      #sd-reset-modal.sd-modal--visible .sd-modal__box{transform:translateY(0) scale(1);}

      .sd-modal__close {
        position:absolute;top:14px;right:14px;
        width:32px;height:32px;border-radius:50%;
        background:#f3f4f6;border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        color:#6a7282;transition:background .15s,color .15s;
      }
      .sd-modal__close:hover{background:#e5e7eb;color:#0a0a0a;}

      .sd-modal__icon {
        width:56px;height:56px;border-radius:14px;
        display:flex;align-items:center;justify-content:center;
        margin:0 auto 16px;
      }
      .sd-modal__icon--blue  {background:#eff6ff;color:#2563eb;}
      .sd-modal__icon--teal  {background:#ecfeff;color:#0891b2;}
      .sd-modal__icon--green {background:#f0fdf4;color:#16a34a;}

      .sd-modal__title {
        text-align:center;font-size:1.2rem;font-weight:700;
        color:#101828;margin-bottom:6px;
      }
      .sd-modal__desc {
        text-align:center;font-size:0.85rem;
        color:#6a7282;line-height:1.5;margin-bottom:20px;
      }

      .sd-modal__steps {
        display:flex;gap:6px;justify-content:center;margin-bottom:20px;
      }
      .sd-step {
        height:4px;width:40px;border-radius:2px;
        background:#e5e7eb;transition:background .3s;
      }
      .sd-step--active{background:#38a8c7;}
      .sd-step--done  {background:#10b981;}

      .sd-modal__field{margin-bottom:14px;}
      .sd-modal__label {
        display:block;font-size:0.8rem;font-weight:600;
        color:#374151;margin-bottom:5px;
      }
      .sd-modal__input {
        width:100%;padding:10px 12px;
        border:1.5px solid #e5e7eb;border-radius:8px;
        font-size:0.875rem;font-family:inherit;color:#0a0a0a;
        background:#f9fafb;outline:none;
        transition:border-color .2s,background .2s,box-shadow .2s;
      }
      .sd-modal__input:focus {
        border-color:#38a8c7;background:#fff;
        box-shadow:0 0 0 3px rgba(56,168,199,.12);
      }
      .sd-modal__error {
        display:block;font-size:0.75rem;
        color:#ef4444;margin-top:4px;min-height:16px;
      }

      .sd-pass-wrap{position:relative;}
      .sd-pass-wrap .sd-modal__input{padding-right:38px;}
      .sd-pass-toggle {
        position:absolute;right:10px;top:50%;transform:translateY(-50%);
        background:none;border:none;cursor:pointer;
        color:#9ca3af;display:flex;align-items:center;
        transition:color .15s;
      }
      .sd-pass-toggle:hover{color:#38a8c7;}

      .sd-strength{display:flex;align-items:center;gap:8px;margin-top:6px;}
      .sd-strength__bar {
        flex:1;height:4px;background:#e5e7eb;
        border-radius:2px;overflow:hidden;
      }
      .sd-strength__fill {
        height:100%;border-radius:2px;width:0;
        transition:width .3s,background .3s;
      }
      .sd-strength__label{font-size:0.72rem;font-weight:600;min-width:64px;}

      .sd-code-inputs {
        display:flex;gap:8px;justify-content:center;margin-bottom:6px;
      }
      .sd-code-digit {
        width:44px;height:52px;border-radius:10px;
        border:1.5px solid #e5e7eb;background:#f9fafb;
        text-align:center;font-size:1.4rem;font-weight:700;
        color:#101828;outline:none;
        transition:border-color .2s,background .2s,box-shadow .2s,transform .15s;
      }
      .sd-code-digit:focus {
        border-color:#38a8c7;background:#fff;
        box-shadow:0 0 0 3px rgba(56,168,199,.12);
        transform:translateY(-1px);
      }
      .sd-code-digit--filled{border-color:#10b981;background:#f0fdf4;}
      .sd-code-digit--error {
        border-color:#ef4444;background:#fef2f2;
        animation:sd-shake .4s ease;
      }
      @keyframes sd-shake {
        0%,100%{transform:translateX(0)}
        20%{transform:translateX(-4px)}
        40%{transform:translateX(4px)}
        60%{transform:translateX(-3px)}
        80%{transform:translateX(3px)}
      }

      .sd-modal__btn {
        width:100%;padding:12px;
        background:linear-gradient(135deg,#38a8c7 0%,#2a8ca8 100%);
        color:#fff;border:none;border-radius:10px;
        font-size:0.9rem;font-weight:600;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:8px;
        transition:opacity .2s,transform .15s,box-shadow .2s;
        font-family:inherit;margin-top:4px;
      }
      .sd-modal__btn:hover:not(:disabled) {
        opacity:.9;transform:translateY(-1px);
        box-shadow:0 4px 16px rgba(56,168,199,.35);
      }
      .sd-modal__btn:disabled{opacity:.6;cursor:not-allowed;}

      .sd-modal__link {
        display:block;width:100%;text-align:center;
        margin-top:10px;font-size:0.8rem;color:#6a7282;
        background:none;border:none;cursor:pointer;
        font-family:inherit;transition:color .15s;
      }
      .sd-modal__link:hover{color:#38a8c7;}
      .sd-modal__link strong{color:#38a8c7;}

      .sd-modal__dev-hint {
        display:flex;align-items:center;gap:8px;
        background:#fff7ed;border:1px solid #fed7aa;
        border-radius:8px;padding:10px 12px;
        font-size:0.8rem;color:#92400e;margin-bottom:12px;
      }
      .sd-code-preview {
        font-size:1rem;letter-spacing:3px;
        color:#c2410c;font-family:monospace;
      }

      .sd-modal__success {
        display:flex;flex-direction:column;
        align-items:center;padding:8px 0 4px;text-align:center;
      }
      .sd-success-circle {
        width:72px;height:72px;border-radius:50%;
        background:linear-gradient(135deg,#10b981 0%,#059669 100%);
        display:flex;align-items:center;justify-content:center;
        margin-bottom:20px;
        box-shadow:0 8px 24px rgba(16,185,129,.35);
        animation:sd-pop .4s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes sd-pop {
        from{transform:scale(0);opacity:0;}
        to  {transform:scale(1);opacity:1;}
      }
    `;
    document.head.appendChild(style);
  }

  // ── Arrancar ──────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForgotPassword);
  } else {
    initForgotPassword();
  }

})();
