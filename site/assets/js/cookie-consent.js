/**
 * Cookie Consent Banner JavaScript
 * Copyright (C) 2024 CVAT.ai Corporation
 * SPDX-License-Identifier: MIT
 */

(function() {
    'use strict';

    /**
     * Check if the current environment is local development
     * @returns {boolean} True if running in local development environment
     */
    function isLocalDevelopment() {
        // Check for common local development indicators
        return location.hostname === 'localhost' ||
               location.hostname === '127.0.0.1' ||
               location.hostname === '0.0.0.0' ||
               location.hostname.startsWith('192.168.') ||
               location.hostname.startsWith('10.') ||
               location.hostname.includes('.local') ||
               location.port !== '' ||
               location.protocol === 'file:';
    }

    /**
     * Inject Google Analytics script into the page
     */
    function injectGAScript() {
        // Prevent analytics injection in local development
        if (isLocalDevelopment()) {
            console.log('Analytics disabled for local development');
            return;
        }

        if (document.getElementById('ga-script')) return;

        var s = document.createElement('script');
        s.id = 'ga-script';
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=G-GVSBK1DNK5';
        document.head.appendChild(s);

        var inline = document.createElement('script');
        inline.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GVSBK1DNK5');
        `;
        document.head.appendChild(inline);
    }

    /**
     * Handle cookie acceptance
     */
    window.acceptCookies = function() {
        // Prevent analytics in local development even if user accepts
        if (isLocalDevelopment()) {
            localStorage.setItem('cookieConsent', 'true-dev');
            document.getElementById('cookieConsentBanner').style.display = 'none';
            console.log('Cookies accepted for development environment (analytics disabled)');
            return;
        }

        localStorage.setItem('cookieConsent', 'true');
        document.getElementById('cookieConsentBanner').style.display = 'none';
        injectGAScript();
    };

    /**
     * Handle cookie rejection
     */
    window.rejectCookies = function() {
        localStorage.setItem('cookieConsent', 'rejected');
        document.getElementById('cookieConsentBanner').style.display = 'none';
    };

    /**
     * Initialize cookie consent banner on page load
     */
    function initializeCookieConsent() {
        var consent = localStorage.getItem('cookieConsent');

        // Show banner if no consent given yet
        if (!consent) {
            document.getElementById('cookieConsentBanner').style.display = 'flex';
        } else if (consent === 'true' && !isLocalDevelopment()) {
            // Only inject analytics if not in local development
            injectGAScript();
        }

        // Add development environment indicator
        if (isLocalDevelopment()) {
            var banner = document.getElementById('cookieConsentBanner');
            if (banner && banner.style.display === 'flex') {
                var devIndicator = document.createElement('div');
                devIndicator.style.cssText = 'font-size: 0.8em; color: #ffeb3b; margin-bottom: 1em; order: -1;';
                devIndicator.textContent = '🔧 Development mode: Analytics will be disabled';
                banner.appendChild(devIndicator);
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCookieConsent);
    } else {
        initializeCookieConsent();
    }

})();
