// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import platform from 'platform';

const engine = platform.layout || 'unknown';
const name = platform.name || 'unknown';
const version = platform.version || 'unknown';
const os = platform.os ? platform.os.toString() : 'unknown';
let platformNotificationShown = window.localStorage.getItem('platformNotiticationShown') !== null;
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
        window.localStorage.setItem('platformNotiticationShown', 'shown');
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
