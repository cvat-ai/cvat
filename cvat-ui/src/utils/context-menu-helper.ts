// Copyright (C) 2025 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function dispatchContextMenuEvent(element: HTMLElement, clickEvent: React.MouseEvent): void {
    setTimeout(() => {
        clickEvent.preventDefault();
        element.dispatchEvent(
            new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                button: 2,
                clientX: clickEvent.clientX,
                clientY: clickEvent.clientY,
            }),
        );
    });
}
