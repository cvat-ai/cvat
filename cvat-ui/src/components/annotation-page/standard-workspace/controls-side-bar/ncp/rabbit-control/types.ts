// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/** Geometry mode resolved for a label from the `_geom` project tag. */
export type LabelMode = 'polygon' | 'line' | 'circle';

/** How labels are presented inside the rabbit-tool popover. */
export type LabelSelectorMode = 'list' | 'dropdown';

export interface Props {
    /**
     * Controls how labels are presented inside the popover.
     *
     * - `'list'`     (default) → flat list of one-click label buttons; clicking
     *                            a label starts the annotation immediately.
     * - `'dropdown'` → classic dropdown selector + "Start" button.
     */
    labelSelectorMode?: LabelSelectorMode;
}
