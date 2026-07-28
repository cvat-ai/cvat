// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function getTabFromHash(supportedTabs: string[]): string {
    const tab = window.location.hash.slice(1);
    return supportedTabs.includes(tab) ? tab : supportedTabs[0];
}
