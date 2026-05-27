                /**
     * Public API
     */
(function () {

    window.SportData = {
        favorites: {
            save: saveFavorite,
            remove: removeFavorite,
            getAll: getFavorites,
            isFavorite: isFavorite
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
        }    `;
    document.head.appendChild(style);
})();
