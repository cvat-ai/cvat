// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

import { MIN_INTERVAL_DURATION, INTERVAL_BOUNDARY_EPSILON } from 'audio/utils/waveform-geometry';
import { audioActions, createAudioIntervalAsync, updateAudioIntervalAsync } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import {
    clientIDFromWaveRegionId, intervalEndSeconds, intervalStartSeconds,
} from '../utils/audio-interval';
import { attachRegionResizeAutoScroll } from '../utils/region-resize-auto-scroll';
import { WaveformRegionRuntime } from './use-audio-waveform';
import { WaveformViewport } from './use-waveform-viewport';

const REGION_DRAG_BOUNDS_CONSTRAINT = Symbol('regionDragBoundsConstraint');
const RESIZE_CURSOR_CLASS = 'cvat-audio-waveform-interaction-resize';
const AUTO_SCROLL_CLASS = 'cvat-audio-waveform-interaction-auto-scroll';

interface RegionInteraction {
    pointerID: number;
    clientID: number;
}

interface ResizeMeta {
    region: Region;
    side: UpdateSide;
    startTime: number;
    start: number;
    end: number;
    grabOffsetX: number;
    clientX: number;
}

interface Params {
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    isPreviewRegion(region: Region): boolean;
    durationRef: React.MutableRefObject<number>;
    ready: boolean;
}

/**
 * Installs a constraint on the region's drag behavior to ensure that
 * it cannot be dragged outside of the waveform's bounds.
 */
function installRegionDragBoundsConstraint(region: Region): void {
    /* eslint-disable no-underscore-dangle */
    const internal = region as any;
    if (internal[REGION_DRAG_BOUNDS_CONSTRAINT]) return;

    const original = internal._onUpdate.bind(internal) as (
        dx: number, side?: UpdateSide, startTime?: number,
    ) => void;
    internal[REGION_DRAG_BOUNDS_CONSTRAINT] = true;
    internal._onUpdate = (deltaPx: number, side?: UpdateSide, startTime?: number): void => {
        if (side) {
            original(deltaPx, side, startTime);
            return;
        }
        const width = internal.element?.parentElement?.getBoundingClientRect().width ?? 0;
        const total = internal.totalDuration as number;
        if (!width || !total) {
            original(deltaPx, side, startTime);
            return;
        }
        const deltaSeconds = (deltaPx / width) * total;
        const clampedSeconds = Math.max(-region.start, Math.min(total - region.end, deltaSeconds));
        original((clampedSeconds / total) * width, side, startTime);
    };
    /* eslint-enable no-underscore-dangle */
}

/**
 * Persists user-created and user-edited waveform regions as audio intervals.
 */
export function useRegionEditing({
    regionRuntime, viewport, isPreviewRegion, durationRef, ready,
}: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const { intervals, activeLabelId, activeControl } = useSelector(
        (state: CombinedState) => ({
            intervals: state.audio.player.intervals,
            activeLabelId: state.audio.player.activeLabelId,
            activeControl: state.annotation.canvas.activeControl,
        }),
        shallowEqual,
    );
    const latestRef = useRef({ intervals, activeLabelId, activeControl });
    latestRef.current = { intervals, activeLabelId, activeControl };

    // setup when runtime is ready
    useEffect(() => {
        if (!ready) return undefined;

        const { regionsPlugin } = regionRuntime;

        // convert newly created regions in wavesurfer into redux intervals
        const onRegionCreated = (region: Region): void => {
            if (isPreviewRegion(region)) return;
            installRegionDragBoundsConstraint(region);
            const clientID = clientIDFromWaveRegionId(region.id);
            const exists =
                clientID !== null && latestRef.current.intervals.some((interval) => interval.clientID === clientID);
            if (exists) return;

            const start = Math.max(0, region.start);
            const end = Math.max(start, region.end);
            // remove the source region to get it re-created from redux
            region.remove();
            if (end - start > MIN_INTERVAL_DURATION) {
                dispatch(createAudioIntervalAsync(start, end, latestRef.current.activeLabelId));
            }
        };

        // convert adjustments of regions in wavesurfer into adjustments of redux intervals
        const onRegionUpdated = (region: Region, side?: UpdateSide): void => {
            // Custom resize persists directly on pointer release below.
            // WaveSurfer still emits this event for its disabled handle drag.
            if (side) return;

            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;
            const interval = latestRef.current.intervals.find((item) => item.clientID === clientID);
            if (!interval) return;
            if (
                Math.abs(intervalStartSeconds(interval) - region.start) < INTERVAL_BOUNDARY_EPSILON &&
                Math.abs(intervalEndSeconds(interval) - region.end) < INTERVAL_BOUNDARY_EPSILON
            ) {
                return;
            }

            dispatch(
                updateAudioIntervalAsync(clientID, {
                    start: Math.round(region.start * 1000),
                    stop: Math.round(region.end * 1000),
                }),
            );
        };

        regionsPlugin.getRegions().forEach((region) => {
            if (clientIDFromWaveRegionId(region.id) !== null) {
                installRegionDragBoundsConstraint(region);
            }
        });

        regionsPlugin.on('region-created', onRegionCreated);
        regionsPlugin.on('region-updated', onRegionUpdated);
        return () => {
            regionsPlugin.un('region-created', onRegionCreated);
            regionsPlugin.un('region-updated', onRegionUpdated);
        };
    }, [ready]);

    const isCreating = activeControl === ActiveControl.AUDIO_REGION_CREATE;
    useEffect(() => {
        if (!ready || !isCreating) return undefined;
        return regionRuntime.regionsPlugin.enableDragSelection({});
    }, [isCreating, ready]);

    // Own resize interactions so the handle position is always derived from
    // the original range and pointer time, rather than accumulated deltas.
    useEffect(() => {
        if (!ready) return undefined;

        let interaction: RegionInteraction | null = null;
        let resizeMeta: ResizeMeta | null = null;
        let hasResized = false;
        let resizeCursorViewport: HTMLElement | null = null;
        let autoScrollViewport: HTMLElement | null = null;

        const setAutoScrolling = (isAutoScrolling: boolean): void => {
            if (isAutoScrolling) {
                autoScrollViewport = viewport.containerRef.current;
                autoScrollViewport?.classList.add(AUTO_SCROLL_CLASS);
            } else {
                autoScrollViewport?.classList.remove(AUTO_SCROLL_CLASS);
                autoScrollViewport = null;
            }
        };

        const autoScroll = attachRegionResizeAutoScroll(
            regionRuntime.regionsPlugin,
            viewport.scrollBy,
            () => viewport.containerRef.current,
            setAutoScrolling,
        );

        const restoreResizeCursor = (): void => {
            resizeCursorViewport?.classList.remove(RESIZE_CURSOR_CLASS);
            resizeCursorViewport = null;
            document.body.style.cursor = '';
        };

        const setResizeCursor = (): void => {
            restoreResizeCursor();
            resizeCursorViewport = viewport.containerRef.current;
            resizeCursorViewport?.classList.add(RESIZE_CURSOR_CLASS);
            document.body.style.cursor = 'ew-resize';
        };

        const updateResize = (resize: ResizeMeta): boolean => {
            const time = viewport.clientXToTime(resize.clientX + resize.grabOffsetX);
            const duration = durationRef.current;
            if (time === null || duration <= 0) return false;

            const delta = time - resize.startTime;
            const start = resize.side === 'start' ? Math.max(
                0,
                Math.min(resize.start + delta, resize.end - MIN_INTERVAL_DURATION),
            ) : resize.start;
            const end = resize.side === 'end' ? Math.min(
                duration,
                Math.max(resize.end + delta, resize.start + MIN_INTERVAL_DURATION),
            ) : resize.end;
            if (start === resize.region.start && end === resize.region.end) {
                return false;
            }

            resize.region.setOptions({ start, end });
            return true;
        };

        const refreshResize = (): void => {
            if (resizeMeta && updateResize(resizeMeta)) {
                hasResized = true;
            }
        };

        const unsubscribeTransformChange = viewport.onTransformChange(refreshResize);

        const onPointerDown = (event: PointerEvent): void => {
            if (
                interaction ||
                event.button !== 0 ||
                latestRef.current.activeControl !== ActiveControl.CURSOR
            ) return;

            const path = event.composedPath();
            const region = regionRuntime.regionsPlugin.getRegions().find(
                (item) => item.element && path.includes(item.element),
            );
            if (!region) return;

            // WaveSurfer documents the handles' part attribute as public API.
            const handle = path.find((item): item is HTMLElement => (
                item instanceof HTMLElement && !!item.getAttribute('part')?.includes('region-handle')
            ));
            const handlePart = handle?.getAttribute('part');
            let side: UpdateSide | null = null;
            if (handlePart?.includes('region-handle-left')) {
                side = 'start';
            } else if (handlePart?.includes('region-handle-right')) {
                side = 'end';
            }
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;

            const regionElement = region.element;

            if (side === null && !region.drag) return;
            if (side !== null && (!region.resize || !regionElement)) return;

            interaction = { pointerID: event.pointerId, clientID };
            dispatch(audioActions.setAudioInteractingInterval(clientID));
            if (side === null || !regionElement) return;

            const regionBoundingBox = regionElement.getBoundingClientRect();
            const visualBoundaryX = side === 'start' ? regionBoundingBox.left : regionBoundingBox.right;
            const grabOffsetX = visualBoundaryX - event.clientX;
            const startTime = side === 'start' ? region.start : region.end;

            resizeMeta = {
                region,
                side,
                startTime,
                start: region.start,
                end: region.end,
                grabOffsetX,
                clientX: event.clientX,
            };
            hasResized = false;
            setResizeCursor();
            autoScroll.start((): number | null => {
                const transform = viewport.getTransform();
                const viewportElement = viewport.containerRef.current;
                if (!transform || !viewportElement) return null;

                // WaveSurfer virtualizes regions outside of the viewport by detaching their element.
                // Its bounding rectangle then reports both left and right as zero, which would make
                // a right-side resize incorrectly auto-scroll to the left instead.
                const boundaryTime = side === 'start' ? region.start : region.end;
                return viewportElement.getBoundingClientRect().left +
                    boundaryTime * transform.pixelsPerSecond - transform.scrollLeft;
            }, refreshResize);
        };

        const onPointerMove = (event: PointerEvent): void => {
            const resize = resizeMeta;
            if (!interaction || !resize || interaction.pointerID !== event.pointerId) return;

            let movementDirection: -1 | 1 | null = null;
            if (event.clientX < resize.clientX) {
                movementDirection = -1;
            } else if (event.clientX > resize.clientX) {
                movementDirection = 1;
            }
            resizeMeta = { ...resize, clientX: event.clientX };
            refreshResize();

            if (movementDirection !== null) {
                autoScroll.arm(movementDirection);
            }
        };

        const onPointerUp = (event: PointerEvent): void => {
            const currInteraction = interaction;
            if (!currInteraction || currInteraction.pointerID !== event.pointerId) return;
            const currResize = resizeMeta;

            interaction = null;
            resizeMeta = null;
            if (!currResize) {
                dispatch(audioActions.setAudioInteractingInterval(null));
                return;
            }

            autoScroll.stop();
            restoreResizeCursor();
            dispatch(audioActions.setAudioInteractingInterval(null));
            if (!hasResized) return;

            dispatch(updateAudioIntervalAsync(currInteraction.clientID, {
                start: Math.round(currResize.region.start * 1000),
                stop: Math.round(currResize.region.end * 1000),
            }));
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
        return () => {
            interaction = null;
            resizeMeta = null;
            hasResized = false;
            dispatch(audioActions.setAudioInteractingInterval(null));
            autoScroll.destroy();
            setAutoScrolling(false);
            restoreResizeCursor();
            unsubscribeTransformChange();
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
    }, [ready]);
}
