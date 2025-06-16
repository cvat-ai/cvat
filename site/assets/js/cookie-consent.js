/**
 * Cookie Consent Banner JavaScript
 * Copyright (C) 2024 CVAT.ai Corporation
 * SPDX-License-Identifier: MIT
 *
 * Note: Banner visibility is controlled by Hugo production mode.
 * This script only loads in production environments.
 */

(function() {
    'use strict';

    /**
     * Simple check for localhost/development to prevent analytics pollution
     * @returns {boolean} True if running on localhost or with custom port
     */
    function isLocalhost() {
        return location.hostname.includes('localhost') ||
               location.hostname === '127.0.0.1' ||
               location.port !== '';
    }

    /**
     * Inject Google Analytics script into the page
     */
    function injectGAScript() {
        // Defense in depth: prevent analytics on localhost even in production builds
        if (isLocalhost()) {
            console.log('Analytics disabled for localhost');
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
        } else if (consent === 'true') {
            // Load analytics if user previously consented
            injectGAScript();
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCookieConsent);
    } else {
        initializeCookieConsent();
    }

})();
