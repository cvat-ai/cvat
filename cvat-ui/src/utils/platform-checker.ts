// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import platform from 'platform';

const engine = platform.layout || 'unknown';
const name = platform.name || 'unknown';
const version = platform.version || 'unknown';
const os = platform.os ? platform.os.toString() : 'unknown';
let platformNotificationShown = window.localStorage.getItem('platformNotificationShown') !== null;
let featuresNotificationShown = window.localStorage.getItem('featuresNotificationShown') !== null;

interface PlatformInfo {
    engine: string;
    name: string;
    version: string;
    os: string;
}

export function platformInfo(): PlatformInfo {
    return {
        engine,
        name,
        version,
        os,
    };
}

export function stopNotifications(saveInStorage: boolean): void {
    platformNotificationShown = true;
    featuresNotificationShown = true;
    if (saveInStorage) {
        window.localStorage.setItem('platformNotificationShown', 'shown');
        window.localStorage.setItem('featuresNotificationShown', 'shown');
    }
}

export default function showPlatformNotification(): boolean {
    // Blick is engine of Chrome, Microsoft Edge >= v79
    // Gecko is engine of Firefox, supported but works worse than in Chrome (let's show the message)
    // WebKit is engine of Apple Safary, not supported
    const unsupportedPlatform = !['Blink'].includes(engine);
    return !platformNotificationShown && unsupportedPlatform;
}

export function showUnsupportedNotification(): boolean {
    const necessaryFeatures = [window.ResizeObserver, Object.fromEntries, Object.hasOwn];

    const unsupportedFeatures = necessaryFeatures.some((feature) => typeof feature === 'undefined');
    return !featuresNotificationShown && unsupportedFeatures;
}

// The 'platform' package is no longer maintained and relies on User-Agent string,
// which is not really trusted source of information. This function uses new experimental browser API
export function platformInfoV2(): string {
    if (window.isSecureContext && 'userAgentData' in navigator) {
        // Use the new User-Agent Client Hints API when available in secure context
        return (navigator as any).userAgentData?.platform || navigator.platform;
    }
    // Fallback to the navigator.platform
    // It is still in specs https://html.spec.whatwg.org/multipage/system-state.html#dom-navigator-platform-dev
    return navigator.platform;
}
