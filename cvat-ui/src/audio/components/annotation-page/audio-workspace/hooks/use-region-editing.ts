// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

import { MIN_INTERVAL_DURATION, INTERVAL_BOUNDARY_EPSILON } from 'audio/utils/waveform-geometry';
import { audioActions, createAudioIntervalAsync, updateAudioIntervalAsync } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { clamp } from 'utils/math';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import { getAudioLabelPreviewColor } from '../audio-region-colors';
import {
    clientIDFromWaveRegionId, intervalEndSeconds, intervalStartSeconds,
} from '../utils/audio-interval';
import { attachRegionResizeAutoScroll } from '../utils/region-resize-auto-scroll';
import { WaveformRegionRuntime } from './use-audio-waveform';
import { useBulkBoundariesEditing } from './use-bulk-boundaries-editing';
import type { RegionHighlighting } from './use-region-projection';
import type { RegionSelection } from './use-region-selection';
import type { RegionPreviewHandle, RegionPreviewOptions } from './use-waveform-regions';
import { WaveformViewport } from './use-waveform-viewport';

const REGION_DRAG_BOUNDS_CONSTRAINT = Symbol('regionDragBoundsConstraint');
const RESIZE_CURSOR_CLASS = 'cvat-audio-waveform-interaction-resize';
const AUTO_SCROLL_CLASS = 'cvat-audio-waveform-interaction-auto-scroll';

interface RegionPointerInteraction {
    pointerID: number;
    clientID: number;
}

interface ResizeInteraction {
    pointerID: number;
    clientID: number;
    region: Region;
    side: UpdateSide;
    startTime: number;
    start: number;
    end: number;
    grabOffsetX: number;
    clientX: number;
}

interface DrawInteraction {
    pointerID: number;
    startTime: number;
    labelID: number | null;
    preview: RegionPreviewHandle;
}

interface Params {
    regionRuntime: WaveformRegionRuntime;
    regionHighlighting: RegionHighlighting;
    regionSelection: RegionSelection;
    viewport: WaveformViewport;
    createPreview(options: RegionPreviewOptions): RegionPreviewHandle | null;
    durationRef: React.MutableRefObject<number>;
    ready: boolean;
}

export interface RegionEditing {
    wrapperClassName: string;
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
        const clampedSeconds = clamp(deltaSeconds, -region.start, total - region.end);
        original((clampedSeconds / total) * width, side, startTime);
    };
    /* eslint-enable no-underscore-dangle */
}

/**
 * Persists user-created and user-edited waveform regions as audio intervals.
 */
export function useRegionEditing({
    regionRuntime, regionHighlighting, regionSelection, viewport,
    createPreview, durationRef, ready,
}: Params): RegionEditing {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        intervals, activeLabelId, activeControl, labels, opacity,
    } = useSelector(
        (state: CombinedState) => ({
            intervals: state.audio.player.intervals,
            activeLabelId: state.audio.player.activeLabelId,
            activeControl: state.annotation.canvas.activeControl,
            labels: state.annotation.job.labels,
            opacity: state.settings.intervals.opacity,
        }),
        shallowEqual,
    );
    const labelPreviewColor = getAudioLabelPreviewColor(activeLabelId, labels, opacity);
    const latestRef = useRef({
        intervals, activeLabelId, activeControl, labelPreviewColor,
    });
    latestRef.current = {
        intervals, activeLabelId, activeControl, labelPreviewColor,
    };
    const cancelCustomInteractionRef = useRef<(() => void) | null>(null);
    useBulkBoundariesEditing({
        regionRuntime, regionHighlighting, regionSelection, viewport, durationRef, ready,
    });

    useLayoutEffect(() => {
        cancelCustomInteractionRef.current?.();
    }, [activeControl]);

    // setup when runtime is ready
    useEffect(() => {
        if (!ready) return undefined;

        const { regionsPlugin } = regionRuntime;

        const onRegionCreated = (region: Region): void => {
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;

            installRegionDragBoundsConstraint(region);
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

            dispatch(updateAudioIntervalAsync(clientID, {
                start: Math.round(region.start * 1000),
                stop: Math.round(region.end * 1000),
            }));
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

    // Own pointer interactions so their boundaries are always derived from the
    // original range and pointer time, rather than accumulated deltas.
    useEffect(() => {
        if (!ready) return undefined;

        let regionInteraction: RegionPointerInteraction | null = null;
        let resizing: ResizeInteraction | null = null;
        let drawing: DrawInteraction | null = null;
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

        const applyResize = (resize: ResizeInteraction): boolean => {
            const time = viewport.clientXToTime(resize.clientX + resize.grabOffsetX);
            const duration = durationRef.current;
            if (time === null || duration <= 0) return false;

            const delta = time - resize.startTime;
            const start = resize.side === 'start' ? clamp(
                resize.start + delta, 0, resize.end - MIN_INTERVAL_DURATION,
            ) : resize.start;
            const end = resize.side === 'end' ? clamp(
                resize.end + delta, resize.start + MIN_INTERVAL_DURATION, duration,
            ) : resize.end;
            if (start === resize.region.start && end === resize.region.end) {
                return false;
            }

            resize.region.setOptions({ start, end });
            return true;
        };

        const refreshResizing = (): void => {
            if (resizing && applyResize(resizing)) {
                hasResized = true;
            }
        };

        const unsubscribeTransformChange = viewport.onTransformChange(refreshResizing);

        const isPointerOverWaveform = (event: PointerEvent): boolean => {
            const waveform = viewport.containerRef.current;
            return !!waveform && event.composedPath().includes(waveform);
        };

        const startDrawing = (event: PointerEvent): void => {
            if (regionInteraction || drawing || event.button !== 0 || !isPointerOverWaveform(event)) return;

            const startTime = viewport.clientXToTime(event.clientX);
            if (startTime === null) return;

            event.preventDefault();

            const preview = createPreview({
                range: { start: startTime, end: startTime },
                color: latestRef.current.labelPreviewColor,
            });
            if (!preview) return;

            drawing = {
                pointerID: event.pointerId,
                startTime,
                labelID: latestRef.current.activeLabelId,
                preview,
            };
        };

        const updateDrawing = (event: PointerEvent): void => {
            if (!drawing || drawing.pointerID !== event.pointerId) return;

            const time = viewport.clientXToTime(event.clientX);
            if (time === null) return;

            drawing.preview.updateRange({
                start: Math.min(drawing.startTime, time),
                end: Math.max(drawing.startTime, time),
            });
        };

        const finishDrawing = (event: PointerEvent, shouldPersist: boolean): void => {
            const currentDrawing = drawing;
            if (!currentDrawing || currentDrawing.pointerID !== event.pointerId) return;

            const endTime = viewport.clientXToTime(event.clientX);
            drawing = null;
            currentDrawing.preview.remove();
            if (endTime === null || !shouldPersist) return;

            const start = Math.min(currentDrawing.startTime, endTime);
            const end = Math.max(currentDrawing.startTime, endTime);
            if (end - start <= MIN_INTERVAL_DURATION) return;

            dispatch(createAudioIntervalAsync(start, end, currentDrawing.labelID));
        };

        const startResizing = (event: PointerEvent): void => {
            if (
                regionInteraction ||
                drawing ||
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

            regionInteraction = { pointerID: event.pointerId, clientID };
            dispatch(audioActions.setAudioInteractingInterval(clientID));
            if (side === null || !regionElement) return;

            const regionBoundingBox = regionElement.getBoundingClientRect();
            const visualBoundaryX = side === 'start' ? regionBoundingBox.left : regionBoundingBox.right;
            const grabOffsetX = visualBoundaryX - event.clientX;
            const startTime = side === 'start' ? region.start : region.end;

            resizing = {
                pointerID: event.pointerId,
                clientID,
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
            }, refreshResizing);
        };

        const updateResizing = (event: PointerEvent): void => {
            const currentResizing = resizing;
            if (!currentResizing || currentResizing.pointerID !== event.pointerId) return;

            let movementDirection: -1 | 1 | null = null;
            if (event.clientX < currentResizing.clientX) {
                movementDirection = -1;
            } else if (event.clientX > currentResizing.clientX) {
                movementDirection = 1;
            }
            resizing = { ...currentResizing, clientX: event.clientX };
            refreshResizing();

            if (movementDirection !== null) {
                autoScroll.arm(movementDirection);
            }
        };

        const finishResizing = (event: PointerEvent, preserveReleasedIntervalHover: boolean): void => {
            const currentRegionInteraction = regionInteraction;
            if (!currentRegionInteraction || currentRegionInteraction.pointerID !== event.pointerId) return;
            const currentResizing = resizing;

            regionInteraction = null;
            resizing = null;
            if (!currentResizing) {
                if (preserveReleasedIntervalHover) {
                    dispatch(audioActions.setAudioHoveredInterval(currentRegionInteraction.clientID));
                }
                dispatch(audioActions.setAudioInteractingInterval(null));
                return;
            }

            autoScroll.stop();
            restoreResizeCursor();
            if (preserveReleasedIntervalHover) {
                dispatch(audioActions.setAudioHoveredInterval(currentRegionInteraction.clientID));
            }
            dispatch(audioActions.setAudioInteractingInterval(null));
            if (!hasResized) return;

            dispatch(updateAudioIntervalAsync(currentRegionInteraction.clientID, {
                start: Math.round(currentResizing.region.start * 1000),
                stop: Math.round(currentResizing.region.end * 1000),
            }));
        };

        const cancelCustomInteraction = (): void => {
            if (drawing) {
                drawing.preview.remove();
                drawing = null;
                return;
            }

            const currentResizing = resizing;
            if (!currentResizing) return;

            regionInteraction = null;
            resizing = null;
            hasResized = false;
            autoScroll.stop();
            restoreResizeCursor();
            currentResizing.region.setOptions({
                start: currentResizing.start,
                end: currentResizing.end,
            });
            dispatch(audioActions.setAudioInteractingInterval(null));
        };

        cancelCustomInteractionRef.current = cancelCustomInteraction;

        const onPointerDown = (event: PointerEvent): void => {
            if (latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                startDrawing(event);
            } else {
                startResizing(event);
            }
        };

        const onPointerMove = (event: PointerEvent): void => {
            if (drawing) {
                if (latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                    updateDrawing(event);
                } else {
                    finishDrawing(event, false);
                }
                return;
            }

            updateResizing(event);
        };

        const suppressReleasedDrawClick = (): void => {
            const onClick = (event: MouseEvent): void => {
                document.removeEventListener('click', onClick, true);
                event.preventDefault();
                event.stopPropagation();
            };

            document.addEventListener('click', onClick, true);
        };

        const onPointerUp = (event: PointerEvent): void => {
            if (drawing) {
                suppressReleasedDrawClick();
                finishDrawing(event, latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE);
                return;
            }

            finishResizing(event, isPointerOverWaveform(event));
        };

        const onPointerCancel = (event: PointerEvent): void => {
            if (drawing) {
                finishDrawing(event, false);
                return;
            }

            finishResizing(event, false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerCancel);
        return () => {
            if (cancelCustomInteractionRef.current === cancelCustomInteraction) {
                cancelCustomInteractionRef.current = null;
            }
            regionInteraction = null;
            resizing = null;
            drawing?.preview.remove();
            drawing = null;
            hasResized = false;
            dispatch(audioActions.setAudioInteractingInterval(null));
            autoScroll.destroy();
            setAutoScrolling(false);
            restoreResizeCursor();
            unsubscribeTransformChange();
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerCancel);
        };
    }, [ready]);

    return {
        wrapperClassName: isCreating ? 'cvat-audio-waveform-interaction-create' : '',
    };
}
