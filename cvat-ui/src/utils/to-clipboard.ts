// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function toClipboard(text: string): void {
    const fallback = (): void => {
        // eslint-disable-next-line
        window.prompt('Browser Clipboard API not allowed, please copy manually', text);
    };

    if (window.isSecureContext) {
        window.navigator.clipboard.writeText(text).catch(fallback);
    } else {
        fallback();
    }
}
