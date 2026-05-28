/**
 *========================================
 * SportData - Register Page JavaScript
 * ========================================
 * Handles form validation and interactivity
 */

(function() {
    'use strict';

    /**
     * Initialize the application
     */
    function init() {
        setupHamburgerMenu();
        setupNavigation();
        setupTabNavigation();
        setupFormValidation();
        setupFormSubmit();
        setupLoginFormSubmit();
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
            
            if (href === currentPath || (href === '/register' && currentPath.includes('register'))) {
                link.classList.add('nav-list__link--active');
            }
        });
    }

    /**
     * Setup tab navigation functionality
     */
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                // Remove active state from all buttons and panels
                tabButtons.forEach(btn => {
                    btn.classList.remove('tab-button--active');
                    btn.setAttribute('aria-selected', 'false');
                });
                tabPanels.forEach(panel => {
                    panel.classList.remove('tab-panel--active');
                });

                // Add active state to clicked button and corresponding panel
                button.classList.add('tab-button--active');
                button.setAttribute('aria-selected', 'true');
                tabPanels[index].classList.add('tab-panel--active');
            });

            // Keyboard navigation for tabs
            button.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    let nextIndex = index;
                    
                    if (e.key === 'ArrowRight') {
                        nextIndex = (index + 1) % tabButtons.length;
                    } else {
                        nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
                    }
                    
                    tabButtons[nextIndex].focus();
                    tabButtons[nextIndex].click();
                }
            });
        });
    }

    /**
     * Validation functions
     */
    const validators = {
        fullName: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return { valid: false, message: 'El nombre completo es requerido' };
            }
            if (trimmed.length < 3) {
                return { valid: false, message: 'El nombre debe tener al menos 3 caracteres' };
            }
            if (!/^[a-záéíóúñ\s]+$/i.test(trimmed)) {
                return { valid: false, message: 'El nombre solo debe contener letras y espacios' };
            }
            return { valid: true, message: '' };
        },

        email: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return { valid: false, message: 'El correo electrónico es requerido' };
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                return { valid: false, message: 'Ingresa un correo electrónico válido' };
            }
            return { valid: true, message: '' };
        },

        password: (value) => {
            if (!value) {
                return { valid: false, message: 'La contraseña es requerida' };
            }
            if (value.length < 8) {
                return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
            }
            if (!/[a-z]/.test(value)) {
                return { valid: false, message: 'Debe contener letras minúsculas' };
            }
            if (!/[A-Z]/.test(value)) {
                return { valid: false, message: 'Debe contener letras mayúsculas' };
            }
            if (!/[0-9]/.test(value)) {
                return { valid: false, message: 'Debe contener números' };
            }
            return { valid: true, message: '' };
        },

        confirmPassword: (password, confirm) => {
            if (!confirm) {
                return { valid: false, message: 'Confirma tu contraseña' };
            }
            if (password !== confirm) {
                return { valid: false, message: 'Las contraseñas no coinciden' };
            }
            return { valid: true, message: '' };
        }
    };

    /**
     * Setup real-time form validation
     */
    function setupFormValidation() {
        const form = document.getElementById('registerForm');
        const fullNameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmInput = document.getElementById('register-confirm');

        // Full Name validation
        fullNameInput?.addEventListener('blur', () => {
            const validation = validators.fullName(fullNameInput.value);
            updateFieldError(fullNameInput, 'name-error', validation);
        });

        // Email validation
        emailInput?.addEventListener('blur', () => {
            const validation = validators.email(emailInput.value);
            updateFieldError(emailInput, 'email-error', validation);
        });

        // Password validation
        passwordInput?.addEventListener('blur', () => {
            const validation = validators.password(passwordInput.value);
            updateFieldError(passwordInput, 'password-error', validation);
        });

        // Confirm password validation
        confirmInput?.addEventListener('blur', () => {
            const validation = validators.confirmPassword(passwordInput.value, confirmInput.value);
            updateFieldError(confirmInput, 'confirm-error', validation);
        });

        // Re-validate confirm password when password changes
        passwordInput?.addEventListener('change', () => {
            if (confirmInput.value) {
                const validation = validators.confirmPassword(passwordInput.value, confirmInput.value);
                updateFieldError(confirmInput, 'confirm-error', validation);
            }
        });
    }

    /**
     * Update field error display
     */
    function updateFieldError(input, errorId, validation) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return;

        if (validation.valid) {
            input.setAttribute('aria-invalid', 'false');
            errorElement.textContent = '';
        } else {
            input.setAttribute('aria-invalid', 'true');
            errorElement.textContent = validation.message;
        }
    }

    /**
     * Display server-side feedback above the form
     */
    function showFormMessage(type, message) {
        if (!message) return;

        const form = document.getElementById('registerForm');
        if (!form) return;

        let messageDiv = document.getElementById('register-form-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'register-form-message';
            messageDiv.setAttribute('role', 'alert');
            messageDiv.setAttribute('aria-live', 'assertive');
            form.parentElement.insertBefore(messageDiv, form);
        }

        messageDiv.textContent = message;
        messageDiv.style.cssText = type === 'success'
            ? 'padding: 1rem; background-color: #d1fae5; color: #065f46; border-radius: 0.375rem; margin-bottom: 1rem; border-left: 4px solid #10b981;'
            : 'padding: 1rem; background-color: #fee2e2; color: #991b1b; border-radius: 0.375rem; margin-bottom: 1rem; border-left: 4px solid #991b1b;';
    }

    /**
     * Setup form submission
     */
    function setupFormSubmit() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullNameInput = document.getElementById('register-name');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const confirmInput = document.getElementById('register-confirm');

            // Validate all fields
            const validations = {
                fullName: validators.fullName(fullNameInput.value),
                email: validators.email(emailInput.value),
                password: validators.password(passwordInput.value),
                confirm: validators.confirmPassword(passwordInput.value, confirmInput.value)
            };

            // Update error displays
            updateFieldError(fullNameInput, 'name-error', validations.fullName);
            updateFieldError(emailInput, 'email-error', validations.email);
            updateFieldError(passwordInput, 'password-error', validations.password);
            updateFieldError(confirmInput, 'confirm-error', validations.confirm);

            // Check if all fields are valid
            const allValid = Object.values(validations).every(v => v.valid);

            if (!allValid) {
                // Focus first invalid field
                if (!validations.fullName.valid) {
                    fullNameInput.focus();
                } else if (!validations.email.valid) {
                    emailInput.focus();
                } else if (!validations.password.valid) {
                    passwordInput.focus();
                } else if (!validations.confirm.valid) {
                    confirmInput.focus();
                }
                return;
            }

            // Submit form
            await submitForm({
                fullName: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value
            });
        });
    }

    /**
     * Submit the form to PHP backend
     */
    async function submitForm(formData) {
        const submitBtn = document.querySelector('.submit-button');
        if (!submitBtn) return;

        const originalText = submitBtn.textContent;
        const endpoint = new URL('../php/register.php', window.location.href).toString();

        // Disable button while sending
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        const body = new FormData();
        body.append('fullName', formData.fullName);
        body.append('email', formData.email);
        body.append('password', formData.password);

        try {
            console.log('POST endpoint:', endpoint);
            const response = await fetch(endpoint, {
                method: 'POST',
                body
            });

            console.log('Response status:', response.status);
            // Read raw text first to avoid "body already used" errors
            const raw = await response.text().catch(() => '');
            let result = null;
            try {
                result = raw ? JSON.parse(raw) : null;
            } catch (e) {
                result = null;
            }

            if (!response.ok || !result || !result.success) {
                console.warn('Register failed. status:', response.status, 'json:', result, 'raw:', raw);

                const errorMessage = result?.message || raw || 'Error en el registro. Intenta de nuevo.';
                showFormMessage('error', errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            console.log('Register success:', result);
            showSuccessMessage(result.message || '¡Registro exitoso! Serás redirigido en 3 segundos...');
            document.getElementById('registerForm').reset();
        } catch (error) {
            console.error('Registro fallido (fetch):', error);
            showFormMessage('error', 'No se pudo conectar con el servidor. Verifica tu conexión.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Show success message
     */
    function showSuccessMessage(message) {
        const form = document.getElementById('registerForm');
        const previousMessage = document.getElementById('register-form-message');
        if (previousMessage) {
            previousMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.setAttribute('role', 'alert');
        successDiv.setAttribute('aria-live', 'polite');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <p style="margin: 0; color: #10b981; font-weight: 600;">
                ${message}
            </p>
        `;
        successDiv.style.cssText = `
            padding: 1rem;
            background-color: #d1fae5;
            border-radius: 0.375rem;
            margin-bottom: 1rem;
            border-left: 4px solid #10b981;
        `;

        form.parentElement.insertBefore(successDiv, form);

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    /**
     * Setup login form submission
     */
    function setupLoginFormSubmit() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');

            // Validate inputs
            const emailError = validateLoginEmail(emailInput.value);
            const passwordError = validateLoginPassword(passwordInput.value);

            updateLoginFieldError(emailInput, 'login-email-error', emailError);
            updateLoginFieldError(passwordInput, 'login-password-error', passwordError);

            if (emailError || passwordError) {
                if (emailError) {
                    emailInput.focus();
                } else if (passwordError) {
                    passwordInput.focus();
                }
                return;
            }

            // Submit login
            await submitLogin({
                email: emailInput.value.trim(),
                password: passwordInput.value
            });
        });
    }

    /**
     * Validate login email
     */
    function validateLoginEmail(value) {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'El correo electrónico es requerido';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            return 'Ingresa un correo electrónico válido';
        }
        return null;
    }

    /**
     * Validate login password
     */
    function validateLoginPassword(value) {
        if (!value) {
            return 'La contraseña es requerida';
        }
        return null;
    }

    /**
     * Update login field error display
     */
    function updateLoginFieldError(input, errorId, error) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return;

        if (error) {
            input.setAttribute('aria-invalid', 'true');
            errorElement.textContent = error;
        } else {
            input.setAttribute('aria-invalid', 'false');
            errorElement.textContent = '';
        }
    }

    /**
     * Submit login to PHP backend
     */
    async function submitLogin(formData) {
        const submitBtn = document.querySelector('#loginForm .submit-button');
        if (!submitBtn) return;

        const originalText = submitBtn.textContent;
        const endpoint = new URL('../php/login.php', window.location.href).toString();

        // Disable button while sending
        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';

        const body = new FormData();
        body.append('email', formData.email);
        body.append('password', formData.password);

        try {
            console.log('POST endpoint:', endpoint);
            const response = await fetch(endpoint, {
                method: 'POST',
                body
            });

            console.log('Response status:', response.status);
            const raw = await response.text().catch(() => '');
            let result = null;
            try {
                result = raw ? JSON.parse(raw) : null;
            } catch (e) {
                result = null;
            }

            if (!response.ok || !result || !result.success) {
                console.warn('Login failed. status:', response.status, 'json:', result, 'raw:', raw);

                const errorMessage = result?.message || raw || 'Error en el inicio de sesión. Intenta de nuevo.';
                showLoginMessage('error', errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            console.log('Login success:', result);
            showLoginSuccessMessage(result.message || '¡Bienvenido! Serás redirigido en 3 segundos...');
        } catch (error) {
            console.error('Login fallido (fetch):', error);
            showLoginMessage('error', 'No se pudo conectar con el servidor. Verifica tu conexión.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Display login message
     */
    function showLoginMessage(type, message) {
        if (!message) return;

        const form = document.getElementById('loginForm');
        if (!form) return;

        let messageDiv = document.getElementById('login-form-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'login-form-message';
            messageDiv.setAttribute('role', 'alert');
            messageDiv.setAttribute('aria-live', 'assertive');
            form.parentElement.insertBefore(messageDiv, form);
        }

        messageDiv.textContent = message;
        messageDiv.style.cssText = type === 'success'
            ? 'padding: 1rem; background-color: #d1fae5; color: #065f46; border-radius: 0.375rem; margin-bottom: 1rem; border-left: 4px solid #10b981;'
            : 'padding: 1rem; background-color: #fee2e2; color: #991b1b; border-radius: 0.375rem; margin-bottom: 1rem; border-left: 4px solid #991b1b;';
    }

    /**
     * Show login success message
     */
    function showLoginSuccessMessage(message) {
        const form = document.getElementById('loginForm');
        const previousMessage = document.getElementById('login-form-message');
        if (previousMessage) {
            previousMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.setAttribute('role', 'alert');
        successDiv.setAttribute('aria-live', 'polite');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <p style="margin: 0; color: #10b981; font-weight: 600;">
                ${message}
            </p>
        `;
        successDiv.style.cssText = `
            padding: 1rem;
            background-color: #d1fae5;
            border-radius: 0.375rem;
            margin-bottom: 1rem;
            border-left: 4px solid #10b981;
        `;

        form.parentElement.insertBefore(successDiv, form);

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    /**
     * Track page view (analytics)
     */
    function trackPageView() {
        // Add analytics tracking here if needed
        console.log('Register page loaded');
    }


    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
