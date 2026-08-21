// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef, useLayoutEffect, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { audioActions } from 'actions/audio-actions';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { clamp } from 'utils/math';
import { AudioTimeRange } from '../utils/audio-interval';
import {
    computeWaveformZoom, centeredScrollOffsetForTime, limitZoom, ZOOM_MIN,
} from '../../../../utils/waveform-geometry';
import type { WaveSurferRuntime } from './use-audio-waveform';

const ZOOM_BASIC_COEF = 6 / 5;
const ZOOM_ADJUST_COEF = 1 / 10;
const ZOOM_DELTA_LIMIT = 8;

export interface ViewportTransform {
    pixelsPerSecond: number;
    scrollLeft: number;
}

export interface WaveformViewport {
    /** Bound in AudioCanvas view rendering */
    containerRef: React.RefObject<HTMLDivElement>;

    /** Current reactive zoom expressed in pixels per second. */
    pixelsPerSecond: number;
    /** Full-duration scale in pixels per second, independent of the current zoom. */
    overviewPixelsPerSecond: number;
    /**
     * Converts clientX coordinate from viewport to semantic timestamp on the current track.
     * Returns the track boundary (start/end correspondingly) if clientX is outside of the container's BB.
     */
    clientXToTime(clientX: number): number | null;
    /**
     * Centers the canvas on the given time range by scrolling.
     */
    centerTimeRange(range: AudioTimeRange): void;
    /** Centers the canvas on the current playback position. */
    centerPlaybackPosition(): void;
    /**
     * Ensures that the given time is visible in the viewport. If it's not, scrolls the canvas to make it visible.
     */
    ensureTimeVisible(time: number): void;
    /** Scrolls the canvas horizontally and returns the actual applied offset in pixels. */
    scrollBy(deltaX: number): number;
    /** Returns the current semantic-to-client horizontal transform. */
    getTransform(): ViewportTransform | null;
    /** Subscribes to changes in the client-coordinate-to-time transform. */
    onTransformChange(listener: (transform: ViewportTransform) => void): () => void;
}

/**
 * Responsible for viewport interactions. Exposes a stable API for the rest of the waveform hooks to use.
 */
export function useWaveformViewport(
    runtime: WaveSurferRuntime,
    containerRef: React.RefObject<HTMLDivElement>,
): WaveformViewport {
    const dispatch = useDispatch<ThunkDispatch>();
    const { zoom, duration } = useSelector((state: CombinedState) => ({
        zoom: state.audio.player.zoom,
        duration: state.audio.player.duration,
    }), shallowEqual);
    const { ready } = runtime;
    const [containerWidth, setContainerWidth] = useState(0);
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const zoomAnchorRef = useRef<{ time: number; x: number } | null>(null);
    const pixelsPerSecond = computeWaveformZoom(zoom, duration, containerWidth);
    const overviewPixelsPerSecond = duration > 0 ? containerWidth / duration : 0;
    const pixelsPerSecondRef = useRef(pixelsPerSecond);
    pixelsPerSecondRef.current = pixelsPerSecond;
    const transformListenersRef = useRef(new Set<(transform: ViewportTransform) => void>());
    const previousTransformRef = useRef<ViewportTransform | null>(null);

    const getScrollContainer = useCallback((): HTMLElement | null => (
        runtime.instanceRef.current?.getWrapper()?.parentElement ?? null
    ), [/* must have no deps as almost every hook depends on it and they should be stable */]);

    const getTransform = useCallback((): ViewportTransform | null => {
        const scrollContainer = getScrollContainer();
        if (!scrollContainer) return null;

        return {
            pixelsPerSecond: pixelsPerSecondRef.current,
            scrollLeft: scrollContainer.scrollLeft,
        };
    }, []);

    const emitTransformChange = useCallback((): void => {
        const transform = getTransform();
        if (!transform) return;

        const previousTransform = previousTransformRef.current;
        if (
            previousTransform?.pixelsPerSecond === transform.pixelsPerSecond &&
            previousTransform.scrollLeft === transform.scrollLeft
        ) return;

        previousTransformRef.current = transform;
        transformListenersRef.current.forEach((listener) => listener(transform));
    }, []);

    const onTransformChange = useCallback((listener: (transform: ViewportTransform) => void): (() => void) => {
        transformListenersRef.current.add(listener);
        return (): void => {
            transformListenersRef.current.delete(listener);
        };
    }, []);

    const clientXToTime = useCallback((clientX: number): number | null => {
        const scrollContainer = getScrollContainer();
        if (!scrollContainer || runtime.durationRef.current <= 0) return null;
        const rect = scrollContainer.getBoundingClientRect();
        const x = clamp(clientX - rect.left, 0, scrollContainer.clientWidth);
        return clamp(
            (scrollContainer.scrollLeft + x) / pixelsPerSecondRef.current,
            0,
            runtime.durationRef.current,
        );
    }, []);

    const centerTimeRange = useCallback((range: AudioTimeRange): void => {
        const currInstance = runtime.instanceRef.current;
        const scrollContainer = getScrollContainer();
        if (!currInstance || !scrollContainer) return;

        const maximumScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
        const rangeMiddleTime = (range.start + range.end) / 2;
        currInstance.setScroll(centeredScrollOffsetForTime(
            rangeMiddleTime,
            pixelsPerSecondRef.current,
            scrollContainer.clientWidth,
            maximumScroll,
        ));
    }, []);

    const centerPlaybackPosition = useCallback((): void => {
        const currentTime = runtime.instanceRef.current?.getCurrentTime();
        if (currentTime === undefined) return;

        centerTimeRange({ start: currentTime, end: currentTime });
    }, []);

    const ensureTimeVisible = useCallback((time: number): void => {
        const currInstance = runtime.instanceRef.current;
        const scrollContainer = getScrollContainer();
        if (!currInstance || !scrollContainer) return;

        const x = time * pixelsPerSecondRef.current;
        const start = scrollContainer.scrollLeft;
        const end = start + scrollContainer.clientWidth;
        if (x < start) currInstance.setScroll(x);
        else if (x > end) currInstance.setScroll(x - scrollContainer.clientWidth);
    }, []);

    const scrollBy = useCallback((deltaX: number): number => {
        const currInstance = runtime.instanceRef.current;
        const scrollContainer = getScrollContainer();
        if (!currInstance || !scrollContainer || deltaX === 0) return 0;

        const maximumScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
        const nextScroll = clamp(scrollContainer.scrollLeft + deltaX, 0, maximumScroll);
        const actualDeltaX = nextScroll - scrollContainer.scrollLeft;
        if (actualDeltaX !== 0) currInstance.setScroll(nextScroll);
        return actualDeltaX;
    }, []);

    useEffect(() => {
        if (!ready) return undefined;

        const scrollContainer = getScrollContainer();
        if (!scrollContainer) return undefined;

        scrollContainer.addEventListener('scroll', emitTransformChange);
        emitTransformChange();
        return () => scrollContainer.removeEventListener('scroll', emitTransformChange);
    }, [ready]);

    // Container width participates in the reactive pixels-per-second calculation below.
    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;

        const updateContainerWidth = (): void => setContainerWidth(element.clientWidth);
        updateContainerWidth();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateContainerWidth) : null;
        observer?.observe(element);
        return () => observer?.disconnect();
    }, []);

    // Handle zoom by wheel
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;

        const onWheel = (event: WheelEvent): void => {
            event.preventDefault();
            const scrollContainer = getScrollContainer();
            // Handle horizontal scroll when shift is pressed
            if (event.shiftKey) {
                zoomAnchorRef.current = null;
                if (!scrollContainer) return;
                const maximumScroll = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
                runtime.instanceRef.current?.setScroll(clamp(
                    scrollContainer.scrollLeft + (event.deltaX || event.deltaY),
                    0,
                    maximumScroll,
                ));
                return;
            }

            // Handle zoom otherwise
            const deltaY = clamp(event.deltaY, -ZOOM_DELTA_LIMIT, ZOOM_DELTA_LIMIT);
            const scaleFactor = ZOOM_BASIC_COEF ** (-deltaY * ZOOM_ADJUST_COEF);
            const nextZoom = limitZoom(zoomRef.current * scaleFactor);
            if (nextZoom === zoomRef.current) return;
            if (scrollContainer) {
                const rect = scrollContainer.getBoundingClientRect();
                const x = clamp(event.clientX - rect.left, 0, scrollContainer.clientWidth);
                // sets the anchor for the next zoom sync from redux
                // to keep the event X position as invariant
                zoomAnchorRef.current = {
                    time: (scrollContainer.scrollLeft + x) / pixelsPerSecondRef.current,
                    x,
                };
            }
            dispatch(audioActions.setAudioZoom(nextZoom));
        };

        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
    }, []);

    const previousZoomRef = useRef(pixelsPerSecond);
    const previousContainerWidthRef = useRef(containerWidth);
    // A resize changes pixels-per-second because it is derived from the container width.
    // During resize, preserve the leftmost visible timestamp.
    // Slider and programmatic zoom retain the playback cursor's screen position
    // when it is visible; otherwise retain the current viewport's left edge.
    // Wheel zoom retain the timestamp under the pointer.
    useLayoutEffect(() => {
        const instance = runtime.instanceRef.current;
        const scrollContainer = getScrollContainer();
        if (!instance || !scrollContainer) return;

        const previousZoom = previousZoomRef.current;
        const previousContainerWidth = previousContainerWidthRef.current;
        previousZoomRef.current = pixelsPerSecond;
        previousContainerWidthRef.current = containerWidth;
        const maximumScroll = Math.max(0, runtime.durationRef.current * pixelsPerSecond - scrollContainer.clientWidth);
        const anchor = zoomAnchorRef.current;
        zoomAnchorRef.current = null;
        const containerResized = previousContainerWidth > 0 && containerWidth !== previousContainerWidth;
        const visibleStartTime = previousZoom > 0 ? scrollContainer.scrollLeft / previousZoom : 0;
        const currentTime = instance.getCurrentTime();
        const cursorOffset = currentTime * previousZoom - scrollContainer.scrollLeft;
        const cursorIsVisible = cursorOffset >= 0 && cursorOffset <= scrollContainer.clientWidth;
        instance.zoom(pixelsPerSecond);
        if (anchor) {
            instance.setScroll(clamp(anchor.time * pixelsPerSecond - anchor.x, 0, maximumScroll));
        } else if (containerResized) {
            instance.setScroll(clamp(visibleStartTime * pixelsPerSecond, 0, maximumScroll));
        } else if (pixelsPerSecond !== previousZoom) {
            let scrollOffset = visibleStartTime * pixelsPerSecond;
            if (cursorIsVisible) {
                scrollOffset = currentTime * pixelsPerSecond - cursorOffset;
            }
            instance.setScroll(clamp(scrollOffset, 0, maximumScroll));
        }
        emitTransformChange();
    }, [pixelsPerSecond, ready]);

    useLayoutEffect(() => {
        if (!ready) return;

        const minimapPlugin = runtime.minimap?.plugin;
        if (!minimapPlugin) return;

        const { overlay } = minimapPlugin as unknown as { overlay?: HTMLElement };
        if (overlay) overlay.style.opacity = zoom > ZOOM_MIN ? '1' : '0';
    }, [ready, zoom]);

    return {
        containerRef,
        pixelsPerSecond,
        overviewPixelsPerSecond,
        clientXToTime,
        centerTimeRange,
        centerPlaybackPosition,
        ensureTimeVisible,
        scrollBy,
        getTransform,
        onTransformChange,
    };
}
