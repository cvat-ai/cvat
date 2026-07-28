// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function handleDropdownKeyDown(event: React.KeyboardEvent): void {
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.stopPropagation();
    }
}
