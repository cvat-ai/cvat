// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import platform from 'platform';

const engine = platform.layout || 'unknown';
const name = platform.name || 'unknown';
const version = platform.version || 'unknown';
const os = platform.os ? platform.os.toString() : 'unknown';
let platformNotificationShown = window.localStorage.getItem('platformNotiticationShown') !== null;
let featuresNotificationShown = false;

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

export function stopNotifications(): void {
    window.localStorage.setItem('platformNotiticationShown', 'shown');
}

export default function showPlatformNotification(): boolean {
    // Blick is engine of Chrome, Microsoft Edge >= v79
    // Gecko is engine of Firefox, supported but works worse than in Chrome (let's show the message)
    // WebKit is engine of Apple Safary, not supported
    const unsupportedPlatform = !['Blink'].includes(engine);
    try {
        return !platformNotificationShown && unsupportedPlatform;
    } finally {
        platformNotificationShown = true;
    }
}

export function showUnsupportedNotification(): boolean {
    const necessaryFeatures = [window.ResizeObserver, Object.fromEntries];

    const unsupportedFeatures = necessaryFeatures.some((feature) => typeof feature === 'undefined');
    try {
        return !featuresNotificationShown && unsupportedFeatures;
    } finally {
        featuresNotificationShown = true;
    }
}
