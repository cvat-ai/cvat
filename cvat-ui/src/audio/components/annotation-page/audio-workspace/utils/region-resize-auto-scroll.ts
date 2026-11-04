// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

// Start scrolling when the active region boundary enters this edge zone.
const AUTO_SCROLL_EDGE_ZONE = 40;
const AUTO_SCROLL_MAX_STEP = 16;
// Increase the auto-scroll velocity over several frames instead of jumping to full speed.
const AUTO_SCROLL_VELOCITY_SCALE_INCREMENT = 0.02;
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

function scrollStepForBoundary(boundaryX: number, viewportRect: DOMRect, velocityScale: number): number {
    const leftEdge = viewportRect.left + AUTO_SCROLL_EDGE_ZONE;
    if (boundaryX < leftEdge) {
        return -Math.ceil((AUTO_SCROLL_MAX_STEP * (leftEdge - boundaryX) * velocityScale) / AUTO_SCROLL_EDGE_ZONE);
    }

    const rightEdge = viewportRect.right - AUTO_SCROLL_EDGE_ZONE;
    if (boundaryX > rightEdge) {
        return Math.ceil((AUTO_SCROLL_MAX_STEP * (boundaryX - rightEdge) * velocityScale) / AUTO_SCROLL_EDGE_ZONE);
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
    let velocityScale = 0;
    const restoreWaveSurferAutoScroll = disableWaveSurferAutoScroll(plugin);

    const setAutoScrolling = (nextIsAutoScrolling: boolean): void => {
        if (nextIsAutoScrolling === isAutoScrolling) return;

        isAutoScrolling = nextIsAutoScrolling;
        onAutoScrollChange(isAutoScrolling);
    };

    const stop = (): void => {
        autoScroll = null;
        armedDirections.clear();
        velocityScale = 0;
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

            const deltaX = scrollStepForBoundary(targetX, viewport.getBoundingClientRect(), velocityScale);
            const direction = Math.sign(deltaX) as ScrollDirection;
            let didAutoScroll = false;
            if (deltaX !== 0 && armedDirections.has(direction)) {
                const actualDeltaX = scrollBy(deltaX);
                if (actualDeltaX !== 0) {
                    activeAutoScroll.onScroll(actualDeltaX);
                    didAutoScroll = true;
                    // Velocity is shared by both directions and never decreases during a resize.
                    // It's only needed to slow down the initial acceleration of auto-scroll when the boundary
                    // is within the edge zone so the user has time to react.
                    // Getting to full speed in about 1s.
                    velocityScale = Math.min(1, velocityScale + AUTO_SCROLL_VELOCITY_SCALE_INCREMENT);
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
        velocityScale = AUTO_SCROLL_VELOCITY_SCALE_INCREMENT;
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
