// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function platform(): string {
    let platformName = 'unknown';

    if (window.isSecureContext && 'userAgentData' in navigator) {
        // Use the new User-Agent Client Hints API when available in secure context
        platformName = (navigator as any).userAgentData?.platform || navigator.platform;
    } else {
        // Fallback to the navigator.platform
        // It is still in specs https://html.spec.whatwg.org/multipage/system-state.html#dom-navigator-platform-dev
        platformName = navigator.platform;
    }

    return platformName.toLowerCase();
}
