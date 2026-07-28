/**
 * Cookie Consent Banner JavaScript
 * Copyright (C) CVAT.ai Corporation
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

        // Check if GA tracking ID is available
        if (!window.GOOGLE_TAG_ID) {
            console.log('GA tracking ID not configured');
            return;
        }

        if (document.getElementById('ga-script')) return;

        // Re-enable Google Analytics tracking if it was previously disabled
        delete window['ga-disable-' + window.GOOGLE_TAG_ID];

        // Load the external Google Analytics script
        var s = document.createElement('script');
        s.id = 'ga-script';
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.GOOGLE_TAG_ID;
        document.head.appendChild(s);

        // Initialize Google Analytics directly
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', window.GOOGLE_TAG_ID);
    }

    /**
     * Clear all analytics-related cookies and data
     */
    function clearAnalyticsCookies() {
        // Clear Google Analytics cookies
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            var cookieName = cookie.split('=')[0];

            // Remove GA cookies
            if (cookieName.startsWith('_ga') ||
                cookieName.startsWith('_gid') ||
                cookieName.startsWith('_gat')) {

                // Clear for current domain
                document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                // Clear for domain with leading dot
                document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname + ';';
                document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname + ';';
            }
        }

        // Clear dataLayer
        if (window.dataLayer) {
            window.dataLayer = [];
        }

        // Properly disable Google Analytics tracking
        if (window.GOOGLE_TAG_ID) {
            window['ga-disable-' + window.GOOGLE_TAG_ID] = true;
        }

        // Remove GA script if present
        var gaScript = document.getElementById('ga-script');
        if (gaScript) {
            gaScript.remove();
        }

        console.log('Analytics cookies and scripts cleared');
    }

    /**
     * Handle cookie acceptance
     */
    window.acceptCookies = function() {
        localStorage.setItem('cookieConsent', 'true');
        document.getElementById('cookie-consent-banner').style.display = 'none';
        injectGAScript();
    };

    /**
     * Handle cookie rejection
     */
    window.rejectCookies = function() {
        var previousConsent = localStorage.getItem('cookieConsent');
        localStorage.setItem('cookieConsent', 'false');
        document.getElementById('cookie-consent-banner').style.display = 'none';

        // If user previously accepted but now rejects, clear analytics cookies
        if (previousConsent === 'true') {
            clearAnalyticsCookies();
        }
    };

    /**
     * Show cookie settings banner (called from footer link)
     */
    window.showCookieSettings = function() {
        document.getElementById('cookie-consent-banner').style.display = 'flex';
    };

    /**
     * Initialize cookie consent banner on page load
     */
    function initializeCookieConsent() {
        var consent = localStorage.getItem('cookieConsent');

        // Show banner if no consent given yet
        if (!consent) {
            document.getElementById('cookie-consent-banner').style.display = 'flex';
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
