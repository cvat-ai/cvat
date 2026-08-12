// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

// Start scrolling when the active region boundary enters this edge zone.
const AUTO_SCROLL_EDGE_ZONE = 40;
const AUTO_SCROLL_MAX_STEP = 24;
type ScrollDirection = -1 | 1;

interface RegionsPluginInternals {
    adjustScroll?: () => void;
}

interface RegionResizeAutoScroll {
    getTargetX(): number | null;
    onScroll(deltaX: number): void;
}

export interface RegionResizeAutoScrollController {
    start(
        getTargetX: () => number | null,
        onScroll: (deltaX: number) => void,
    ): void;
    arm(direction: ScrollDirection): void;
    stop(): void;
    destroy(): void;
}

function disableWaveSurferAutoScroll(plugin: RegionsPlugin): () => void {
    // WaveSurfer has no public hook to replace region auto-scroll behavior.
    const internal = plugin as unknown as RegionsPluginInternals;
    const originalAdjustScroll = internal.adjustScroll?.bind(plugin);
    internal.adjustScroll = () => undefined;

    return (): void => {
        internal.adjustScroll = originalAdjustScroll;
    };
}

function scrollStepForBoundary(boundaryX: number, viewportRect: DOMRect): number {
    const leftEdge = viewportRect.left + AUTO_SCROLL_EDGE_ZONE;
    if (boundaryX < leftEdge) {
        return -Math.ceil((AUTO_SCROLL_MAX_STEP * (leftEdge - boundaryX)) / AUTO_SCROLL_EDGE_ZONE);
    }

    const rightEdge = viewportRect.right - AUTO_SCROLL_EDGE_ZONE;
    if (boundaryX > rightEdge) {
        return Math.ceil((AUTO_SCROLL_MAX_STEP * (boundaryX - rightEdge)) / AUTO_SCROLL_EDGE_ZONE);
    }

    return 0;
}

/**
 * Auto-scrolls the waveform while an active resize boundary remains inside a viewport edge zone.
 */
export function attachRegionResizeAutoScroll(
    plugin: RegionsPlugin,
    scrollBy: (deltaX: number) => number,
    getViewportElement: () => HTMLElement | null,
    onAutoScrollChange: (isAutoScrolling: boolean) => void,
): RegionResizeAutoScrollController {
    let autoScroll: RegionResizeAutoScroll | null = null;
    let animationFrameHandle: number | null = null;
    let isAutoScrolling = false;
    const armedDirections = new Set<ScrollDirection>();
    const restoreWaveSurferAutoScroll = disableWaveSurferAutoScroll(plugin);

    const setAutoScrolling = (nextIsAutoScrolling: boolean): void => {
        if (nextIsAutoScrolling === isAutoScrolling) return;

        isAutoScrolling = nextIsAutoScrolling;
        onAutoScrollChange(isAutoScrolling);
    };

    const stop = (): void => {
        autoScroll = null;
        armedDirections.clear();
        setAutoScrolling(false);
        if (animationFrameHandle !== null) {
            cancelAnimationFrame(animationFrameHandle);
            animationFrameHandle = null;
        }
    };

    const schedule = (): void => {
        if (animationFrameHandle !== null) return;
        animationFrameHandle = requestAnimationFrame(() => {
            animationFrameHandle = null;
            const activeAutoScroll = autoScroll;
            const viewport = getViewportElement();
            if (!activeAutoScroll || !viewport) {
                setAutoScrolling(false);
                return;
            }

            const targetX = activeAutoScroll.getTargetX();
            if (targetX === null) {
                setAutoScrolling(false);
                schedule();
                return;
            }

            const deltaX = scrollStepForBoundary(targetX, viewport.getBoundingClientRect());
            const direction = Math.sign(deltaX) as ScrollDirection;
            let didAutoScroll = false;
            if (deltaX !== 0 && armedDirections.has(direction)) {
                const actualDeltaX = scrollBy(deltaX);
                if (actualDeltaX !== 0) {
                    activeAutoScroll.onScroll(actualDeltaX);
                    didAutoScroll = true;
                }
            }
            setAutoScrolling(didAutoScroll);
            schedule();
        });
    };

    const start = (
        getTargetX: () => number | null,
        onScroll: (deltaX: number) => void,
    ): void => {
        armedDirections.clear();
        autoScroll = {
            getTargetX, onScroll,
        };
        schedule();
    };

    return {
        start,
        arm: (direction: ScrollDirection): void => {
            armedDirections.add(direction);
        },
        stop,
        destroy: (): void => {
            stop();
            restoreWaveSurferAutoScroll();
        },
    };
}
