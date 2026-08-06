// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

import { MIN_INTERVAL_DURATION } from 'audio/utils/waveform-geometry';

type Side = UpdateSide | undefined;
type LockDirection = -1 | 1;

// Start locking when the moving region edge reaches the viewport edge.
const POINTER_LOCK_EDGE_THRESHOLD = 2;
const MIN_LENGTH_EPSILON = 1e-6;
const DRAG_CURSOR_CLASS = 'cvat-audio-waveform-interaction-drag';
const RESIZE_CURSOR_CLASS = 'cvat-audio-waveform-interaction-resize';

interface RegionsPluginInternals {
    adjustScroll?: () => void;
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

interface PointerLockController {
    request(target: HTMLElement, direction: LockDirection): void;
    isEngaged(): boolean;
    release(): void;
    destroy(): void;
}

/** Pointer lock is maintained for a certain direction. When direction changes it is automatically released. */
function createPointerLockController(onMove: (deltaX: number) => void): PointerLockController {
    let target: HTMLElement | null = null;
    let direction: LockDirection | null = null;
    let mode: 'idle' | 'locking' | 'locked' = 'idle';

    const isLocked = (): boolean => target !== null && document.pointerLockElement === target;

    const release = (): void => {
        mode = 'idle';
        direction = null;
        if (isLocked()) {
            try { document.exitPointerLock(); } catch { /* ignore */ }
        }
    };

    const onPointerMoveCapture = (event: PointerEvent): void => {
        if (!isLocked()) return;
        event.stopImmediatePropagation();
        if (mode !== 'locked' || direction === null) return;

        if (event.movementX * direction < 0) {
            release();
        } else {
            onMove(event.movementX);
        }
    };

    const onPointerLockChange = (): void => {
        if (isLocked()) {
            if (mode === 'locking') {
                mode = 'locked';
            } else {
                release();
            }
        } else if (mode !== 'idle') {
            release();
        }
    };

    const onPointerLockError = (): void => {
        if (mode === 'locking') {
            release();
        }
    };

    document.addEventListener('pointermove', onPointerMoveCapture, { capture: true });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);

    return {
        request: (nextTarget: HTMLElement, nextDirection: LockDirection): void => {
            if (mode !== 'idle') return;
            target = nextTarget;
            direction = nextDirection;
            mode = 'locking';
            try {
                nextTarget.requestPointerLock();
            } catch {
                release();
            }
        },
        isEngaged: (): boolean => mode !== 'idle',
        release,
        destroy: (): void => {
            document.removeEventListener('pointermove', onPointerMoveCapture, { capture: true });
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            document.removeEventListener('pointerlockerror', onPointerLockError);
            release();
        },
    };
}

interface InteractionCursorController {
    set(isResize: boolean): void;
    restore(): void;
}

function createInteractionCursorController(
    getViewportElement: () => HTMLElement | null,
): InteractionCursorController {
    let viewportWithCursor: HTMLElement | null = null;

    const restore = (): void => {
        viewportWithCursor?.classList.remove(
            DRAG_CURSOR_CLASS,
            RESIZE_CURSOR_CLASS,
        );
        viewportWithCursor = null;
    };

    return {
        set: (isResize: boolean): void => {
            const viewport = getViewportElement();
            if (!viewport) return;
            restore();
            viewportWithCursor = viewport;
            viewport.classList.add(isResize ? RESIZE_CURSOR_CLASS : DRAG_CURSOR_CLASS);
        },
        restore,
    };
}

/**
 * Custom region auto-scroll functionality.
 * It allows resizing and dragging regions beyond the viewport edges, while keeping the active edge visible.
 */
export function attachRegionAutoScroll(
    plugin: RegionsPlugin,
    ensureTimeVisible: (time: number) => void,
    getViewportElement: () => HTMLElement | null,
): () => void {
    let trackedRegion: Region | null = null;
    /** "undefined" means the region is being dragged, not resized */
    let trackedSide: Side;
    let previousStart: number | null = null;
    let previousEnd: number | null = null;

    // Disable WaveSurfer's built-in auto-scroll behavior and implement our own.
    const restoreWaveSurferAutoScroll = disableWaveSurferAutoScroll(plugin);
    const interactionCursor = createInteractionCursorController(getViewportElement);

    const followActiveEdge = (deltaX: number): void => {
        if (!trackedRegion) return;

        if (deltaX > 0 && trackedSide !== 'start') {
            ensureTimeVisible(trackedRegion.end);
        } else if (deltaX < 0 && trackedSide !== 'end') {
            ensureTimeVisible(trackedRegion.start);
        }
    };

    const updateLockedRegion = (deltaX: number): void => {
        if (!trackedRegion || deltaX === 0) return;

        // eslint-disable-next-line no-underscore-dangle
        trackedRegion._onUpdate(deltaX, trackedSide, undefined);
        followActiveEdge(deltaX);
    };

    const pointerLock = createPointerLockController(updateLockedRegion);

    const lockIfRegionReachesViewportEdge = (
        region: Region,
        side: Side,
        delta: number,
    ): void => {
        if (pointerLock.isEngaged() || delta === 0 || !region.element) return;

        const viewport = getViewportElement();
        if (!viewport) return;

        const viewportRect = viewport.getBoundingClientRect();
        const regionRect = region.element.getBoundingClientRect();

        let direction: LockDirection | null = null;
        if (
            delta < 0 && side !== 'end' &&
            regionRect.left <= viewportRect.left + POINTER_LOCK_EDGE_THRESHOLD
        ) {
            direction = -1;
        } else if (
            delta > 0 && side !== 'start' &&
            regionRect.right >= viewportRect.right - POINTER_LOCK_EDGE_THRESHOLD
        ) {
            direction = 1;
        }
        if (direction === null) return;

        pointerLock.request(viewport, direction);
    };

    const lockIfResizeIsAtMinimumLength = (
        region: Region,
        side: Side,
        deltaX: number,
    ): void => {
        if (pointerLock.isEngaged()) return;

        const isShrinking = (side === 'start' && deltaX > 0) ||
            (side === 'end' && deltaX < 0);
        if (!isShrinking) return;

        if (region.end - region.start > MIN_INTERVAL_DURATION + MIN_LENGTH_EPSILON) return;

        const viewport = getViewportElement();
        if (!viewport) return;

        pointerLock.request(viewport, deltaX > 0 ? 1 : -1);
    };

    const onPointerDownCapture = (event: PointerEvent): void => {
        // Start tracking here instead of in onRegionUpdate because WaveSurfer emits
        // no region-update for rejected minLength resizes.
        // Otherwise, the cursor cannot lock at the boundary in certain cases.
        // The problem is reproducible on min-length intervals that are resized inwards and then outwards.
        const path = event.composedPath();
        const region = plugin.getRegions().find((item) => item.element && path.includes(item.element));
        if (!region) return;

        // NOTE: part attribute is publicly documented in WaveSurfer docs so can be considered
        // as a public API. See https://wavesurfer.xyz/docs/plugins/regions/#css-content-and-borders
        const handle = path.find((item): item is HTMLElement => (
            item instanceof HTMLElement && !!item.getAttribute('part')?.includes('region-handle')
        ));
        const handlePart = handle?.getAttribute('part');
        let side: Side;
        if (handlePart?.includes('region-handle-left')) {
            side = 'start';
        } else if (handlePart?.includes('region-handle-right')) {
            side = 'end';
        }
        if (side && !region.resize) return;
        if (!side && !region.drag) return;

        trackedRegion = region;
        trackedSide = side;
        interactionCursor.set(!!side);
        previousStart = region.start;
        previousEnd = region.end;
    };

    const onPointerMoveCapture = (event: PointerEvent): void => {
        if (!trackedRegion || !trackedSide) return;
        lockIfResizeIsAtMinimumLength(trackedRegion, trackedSide, event.movementX);
    };

    const onRegionUpdate = (region: Region, side?: UpdateSide): void => {
        if (trackedRegion !== region || trackedSide !== side) return;

        let delta: number;
        if (side === 'end') {
            delta = region.end - (previousEnd ?? region.end);
        } else {
            delta = region.start - (previousStart ?? region.start);
        }
        followActiveEdge(delta);
        lockIfRegionReachesViewportEdge(region, trackedSide, delta);
        previousStart = region.start;
        previousEnd = region.end;
    };

    const resetDrag = (): void => {
        interactionCursor.restore();
        trackedRegion = null;
        trackedSide = undefined;
        previousStart = null;
        previousEnd = null;
        pointerLock.release();
    };

    const onRegionRemoved = (region: Region): void => {
        if (trackedRegion?.id === region.id) resetDrag();
    };

    plugin.on('region-update', onRegionUpdate);
    plugin.on('region-updated', resetDrag);
    plugin.on('region-removed', onRegionRemoved);
    document.addEventListener('pointerdown', onPointerDownCapture, { capture: true });
    document.addEventListener('pointermove', onPointerMoveCapture, { capture: true });
    document.addEventListener('pointerup', resetDrag);
    document.addEventListener('pointercancel', resetDrag);

    return () => {
        plugin.un('region-update', onRegionUpdate);
        plugin.un('region-updated', resetDrag);
        plugin.un('region-removed', onRegionRemoved);
        document.removeEventListener('pointerdown', onPointerDownCapture, { capture: true });
        document.removeEventListener('pointermove', onPointerMoveCapture, { capture: true });
        document.removeEventListener('pointerup', resetDrag);
        document.removeEventListener('pointercancel', resetDrag);
        pointerLock.destroy();
        restoreWaveSurferAutoScroll();
    };
}
