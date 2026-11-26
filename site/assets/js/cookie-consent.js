// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

(() => {
    const measurementId = document.currentScript.dataset.gaTrackingId;
    const disableKey = `ga-disable-${measurementId}`;
    const denied = {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
    };
    let started = false;
    let permitted = false;

    function isAccepted() {
        return window.CVATCookieConsent?.getState().analytics === true;
    }

    function clearAnalyticsCookies() {
        const domains = ['', location.hostname];
        if (location.hostname.endsWith('.cvat.ai')) domains.push('cvat.ai');
        for (const cookie of document.cookie.split(';')) {
            const name = cookie.split('=')[0].trim();
            if (!/^_(?:(?:ga|gat)(?:_|$)|gid$)/.test(name)) continue;
            for (const domain of domains) {
                document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ''}`;
            }
        }
    }

    document.querySelector('[data-cookie-settings]').addEventListener('click', (event) => {
        event.preventDefault();
        window.CVATCookieConsent?.show().catch(console.error);
    });

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port) return;

    window.dataLayer = window.dataLayer || [];
    function command() {
        window.dataLayer.push(arguments);
    }

    window.gtag = function () {
        if (isAccepted()) command.apply(null, arguments);
    };

    function updateConsent() {
        const accepted = isAccepted();
        window[disableKey] = !accepted;
        if (!accepted) {
            if (permitted) command('consent', 'update', denied);
            if (permitted || window.CVATCookieConsent?.getState().choice === 'rejected') clearAnalyticsCookies();
            permitted = false;
            return;
        }

        if (permitted) return;
        permitted = true;
        if (started) {
            command('consent', 'update', { analytics_storage: 'granted' });
            return;
        }

        started = true;
        command('consent', 'default', denied);
        command('consent', 'update', { analytics_storage: 'granted' });
        command('js', new Date());
        command('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.append(script);
    }

    window.addEventListener('cvat:cookie-consent', updateConsent);
    updateConsent();
})();
