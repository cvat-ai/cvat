// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const STYLE_ID = 'cvat-scrollbar-style';

const SCROLLBAR_CSS = `
    .scroll { overflow-x: scroll !important; }
    .scroll::-webkit-scrollbar { height: 12px; }
    .scroll::-webkit-scrollbar-button { display: none; }
    .scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
    .scroll::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
`;

export function injectScrollbarStyle(wrapperEl: HTMLElement | null): void {
    if (!wrapperEl) return;
    const shadowRoot = wrapperEl.getRootNode();
    if (!(shadowRoot instanceof ShadowRoot)) return;
    if (shadowRoot.querySelector(`#${STYLE_ID}`)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = SCROLLBAR_CSS;
    shadowRoot.appendChild(style);
}
