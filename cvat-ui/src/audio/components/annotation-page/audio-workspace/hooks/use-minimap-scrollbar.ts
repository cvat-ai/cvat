// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useLayoutEffect } from 'react';

import { clamp } from 'utils/math';

import type { WaveSurferRuntime } from './use-audio-waveform';
import type { WaveformViewport } from './use-waveform-viewport';

const MINIMAP_SCROLLBAR_CLASS = 'cvat-audio-minimap-scrollbar';
const MINIMAP_SCROLLBAR_DRAG_CLASS = 'cvat-audio-minimap-scrollbar-drag';
const MINIMAP_DRAG_THRESHOLD = 3;

interface MinimapPluginInternals {
    overlay?: HTMLElement;
}

function getMinimapOverlay(runtime: WaveSurferRuntime): HTMLElement | null {
    const minimapPlugin = runtime.minimap.plugin as unknown as MinimapPluginInternals;
    return minimapPlugin.overlay ?? null;
}

function getScrollContainer(runtime: WaveSurferRuntime): HTMLElement | null {
    return runtime.instanceRef.current?.getWrapper().parentElement ?? null;
}

/**
 * Makes the minimap's visible-area overlay behave as a horizontal scrollbar thumb.
 * The minimap plugin owns the overlay rendering, while this hook owns its pointer interaction.
 */
export function useMinimapScrollbar(runtime: WaveSurferRuntime, viewport: WaveformViewport): void {
    useLayoutEffect(() => {
        if (!runtime.ready) return undefined;

        const overlay = getMinimapOverlay(runtime);
        if (!overlay) return undefined;

        const scrollContainer = getScrollContainer(runtime);
        const isScrollable = !!scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth;
        overlay.style.opacity = isScrollable ? '1' : '0';
        overlay.style.pointerEvents = isScrollable ? 'auto' : 'none';
        return undefined;
    }, [runtime.ready, viewport.pixelsPerSecond, viewport.overviewPixelsPerSecond]);

    useEffect(() => {
        if (!runtime.ready) return undefined;

        const overlay = getMinimapOverlay(runtime);
        const minimapWrapper = overlay?.parentElement;
        if (!overlay || !minimapWrapper) return undefined;

        const originalTransition = overlay.style.transition;
        const originalZIndex = overlay.style.zIndex;
        let draggedPointerID: number | null = null;
        let grabOffset = 0;
        let dragStartX = 0;
        let hasDragged = false;

        overlay.classList.add(MINIMAP_SCROLLBAR_CLASS);
        overlay.style.zIndex = '3';

        const finishDrag = (pointerID: number): void => {
            if (draggedPointerID !== pointerID) return;

            draggedPointerID = null;
            overlay.classList.remove(MINIMAP_SCROLLBAR_DRAG_CLASS);
            overlay.style.transition = originalTransition;
        };

        const onPointerDown = (event: PointerEvent): void => {
            const scrollContainer = getScrollContainer(runtime);
            const isScrollable = !!scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth;
            if (!isScrollable || !event.isPrimary || event.button !== 0) return;

            const overlayRect = overlay.getBoundingClientRect();
            draggedPointerID = event.pointerId;
            grabOffset = event.clientX - overlayRect.left;
            dragStartX = event.clientX;
            hasDragged = false;
            overlay.setPointerCapture(event.pointerId);
            overlay.classList.add(MINIMAP_SCROLLBAR_DRAG_CLASS);
            overlay.style.transition = 'none';
            event.preventDefault();
            event.stopPropagation();
        };

        const onPointerMove = (event: PointerEvent): void => {
            if (draggedPointerID !== event.pointerId) return;
            if (event.buttons === 0) {
                finishDrag(event.pointerId);
                return;
            }
            if (Math.abs(event.clientX - dragStartX) < MINIMAP_DRAG_THRESHOLD) return;

            hasDragged = true;

            const scrollContainer = getScrollContainer(runtime);
            const transform = viewport.getTransform();
            if (!scrollContainer || !transform) return;

            // Calculate as it's the start of the overlay being dragged
            const minimapRect = minimapWrapper.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            const draggableWidth = minimapRect.width - overlayRect.width;
            const maximumScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            if (draggableWidth <= 0 || maximumScroll <= 0) return;

            const overlayLeft = clamp(
                event.clientX - minimapRect.left - grabOffset,
                0,
                draggableWidth,
            );
            const targetScroll = (overlayLeft / draggableWidth) * maximumScroll;
            viewport.scrollBy(targetScroll - transform.scrollLeft);
            event.preventDefault();
            event.stopPropagation();
        };

        const onPointerUp = (event: PointerEvent): void => {
            if (draggedPointerID !== event.pointerId) return;

            if (!hasDragged) {
                const minimapRect = minimapWrapper.getBoundingClientRect();
                const relativeX = clamp((event.clientX - minimapRect.left) / minimapRect.width, 0, 1);
                runtime.instanceRef.current?.seekTo(relativeX);
            }
            finishDrag(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
        };

        const onPointerCancel = (event: PointerEvent): void => {
            finishDrag(event.pointerId);
        };

        const onLostPointerCapture = (event: PointerEvent): void => {
            finishDrag(event.pointerId);
        };

        overlay.addEventListener('pointerdown', onPointerDown);
        overlay.addEventListener('pointermove', onPointerMove);
        overlay.addEventListener('pointerup', onPointerUp);
        overlay.addEventListener('pointercancel', onPointerCancel);
        overlay.addEventListener('lostpointercapture', onLostPointerCapture);

        return () => {
            if (draggedPointerID !== null) finishDrag(draggedPointerID);
            overlay.removeEventListener('pointerdown', onPointerDown);
            overlay.removeEventListener('pointermove', onPointerMove);
            overlay.removeEventListener('pointerup', onPointerUp);
            overlay.removeEventListener('pointercancel', onPointerCancel);
            overlay.removeEventListener('lostpointercapture', onLostPointerCapture);
            overlay.classList.remove(MINIMAP_SCROLLBAR_CLASS, MINIMAP_SCROLLBAR_DRAG_CLASS);
            overlay.style.transition = originalTransition;
            overlay.style.zIndex = originalZIndex;
        };
    }, [runtime.ready]);
}
