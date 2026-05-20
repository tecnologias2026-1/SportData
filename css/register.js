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
     * Setup form submission
     */
    function setupFormSubmit() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
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
            submitForm({
                fullName: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value
            });
        });
    }

    /**
     * Submit the form
     */
    function submitForm(formData) {
        const submitBtn = document.querySelector('.submit-button');
        const originalText = submitBtn.textContent;

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        // Simulate server request
        setTimeout(() => {
            console.log('Form submitted:', formData);
            
            // Show success message
            showSuccessMessage();
            
            // Reset form
            document.getElementById('registerForm').reset();
            
            // Restore button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

        }, 1500);
    }

    /**
     * Show success message
     */
    function showSuccessMessage() {
        const form = document.getElementById('registerForm');
        const successDiv = document.createElement('div');
        
        successDiv.setAttribute('role', 'alert');
        successDiv.setAttribute('aria-live', 'polite');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <p style="margin: 0; color: #10b981; font-weight: 600;">
                ¡Registro exitoso! Serás redirigido en 3 segundos...
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
