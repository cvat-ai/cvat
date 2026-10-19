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

const DRAG_CURSOR_CLASS = 'cvat-audio-waveform-interaction-drag';
const RESIZE_CURSOR_CLASS = 'cvat-audio-waveform-interaction-resize';
const AUTO_SCROLL_CLASS = 'cvat-audio-waveform-interaction-auto-scroll';
const SNAP_HOVER_CLASS = 'cvat-audio-waveform-interaction-snap-hover';
const SNAP_BOUNDARY_TOLERANCE_PX = 15;

interface RegionInteraction {
    pointerID: number;
    clientID: number;
    region: Region;
    startTime: number;
    start: number;
    end: number;
    clientX: number;
}

type MoveInteraction = RegionInteraction;

interface ResizeInteraction extends RegionInteraction {
    side: UpdateSide;
    grabOffsetX: number;
}

interface DrawInteraction {
    pointerID: number;
    clientX: number;
    startTime: number;
    startSnapTime: number | null;
    labelID: number | null;
    preview: RegionPreviewHandle;
}

interface DrawStartSnapGuide {
    time: number;
    preview: RegionPreviewHandle;
}

interface SnapSearchOptions {
    excludedClientID?: number;
    excludedTime?: number | null;
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
            opacity: state.settings.shapes.opacity,
        }),
        shallowEqual,
    );
    const labelPreviewColor = getAudioLabelPreviewColor(activeLabelId, labels, opacity);
    const labelSnapGuideColor = getAudioLabelPreviewColor(activeLabelId, labels, 100);
    const latestRef = useRef({
        intervals, activeLabelId, activeControl, labelPreviewColor, labelSnapGuideColor,
    });
    latestRef.current = {
        intervals, activeLabelId, activeControl, labelPreviewColor, labelSnapGuideColor,
    };
    const cancelCustomInteractionRef = useRef<(() => void) | null>(null);
    useBulkBoundariesEditing({
        regionRuntime, regionHighlighting, regionSelection, viewport, durationRef, ready,
    });

    useLayoutEffect(() => {
        cancelCustomInteractionRef.current?.();
    }, [activeControl]);

    const isCreating = activeControl === ActiveControl.AUDIO_REGION_CREATE;

    // Own pointer interactions so their boundaries are always derived from the
    // original range and pointer time, rather than accumulated deltas.
    useEffect(() => {
        if (!ready) return undefined;

        let moving: MoveInteraction | null = null;
        let resizing: ResizeInteraction | null = null;
        let drawing: DrawInteraction | null = null;
        let hasChanged = false;
        let interactionCursorViewport: HTMLElement | null = null;
        let interactionCursorClass: string | null = null;
        let autoScrollViewport: HTMLElement | null = null;
        let isAltPressed = false;
        // Track clientX to be able to display snapped start region border position
        // when the modifier key is pressed in Draw mode
        let lastWaveformPointerClientX: number | null = null;
        let drawStartSnapGuide: DrawStartSnapGuide | null = null;

        const findSnapTime = (clientX: number, options: SnapSearchOptions = {}): number | null => {
            const pointerTime = viewport.clientXToTime(clientX);
            const transform = viewport.getTransform();
            if (pointerTime === null || !transform?.pixelsPerSecond) return null;

            let closestTime: number | null = null;
            let closestDistance = SNAP_BOUNDARY_TOLERANCE_PX / transform.pixelsPerSecond;

            latestRef.current.intervals.forEach((interval) => {
                const clientID = interval.clientID as number;
                if (interval.hidden || clientID === options.excludedClientID) return;

                (['start', 'end'] as UpdateSide[]).forEach((side) => {
                    const time = side === 'start' ? intervalStartSeconds(interval) : intervalEndSeconds(interval);
                    if (
                        options.excludedTime != null &&
                        Math.abs(time - options.excludedTime) < INTERVAL_BOUNDARY_EPSILON
                    ) return;

                    const distance = Math.abs(pointerTime - time);
                    if (distance > closestDistance) return;

                    closestDistance = distance;
                    closestTime = time;
                });
            });

            return closestTime;
        };

        const findMoveSnapDelta = (move: MoveInteraction, delta: number, duration: number): number | null => {
            const transform = viewport.getTransform();
            if (!transform?.pixelsPerSecond) return null;

            const movedBoundaries = [move.start + delta, move.end + delta];
            const minimumDelta = -move.start;
            const maximumDelta = duration - move.end;
            let closestAdjustment: number | null = null;
            const tolerance = SNAP_BOUNDARY_TOLERANCE_PX / transform.pixelsPerSecond;

            latestRef.current.intervals.forEach((interval) => {
                const clientID = interval.clientID as number;
                if (interval.hidden || clientID === move.clientID) return;

                (['start', 'end'] as UpdateSide[]).forEach((side) => {
                    const snapTime = side === 'start' ? intervalStartSeconds(interval) : intervalEndSeconds(interval);
                    movedBoundaries.forEach((boundary) => {
                        const adjustment = snapTime - boundary;
                        const candidateDelta = delta + adjustment;
                        if (candidateDelta < minimumDelta || candidateDelta > maximumDelta) return;

                        const distance = Math.abs(adjustment);
                        if (
                            distance > tolerance ||
                            (closestAdjustment !== null && distance > Math.abs(closestAdjustment))
                        ) return;

                        closestAdjustment = adjustment;
                    });
                });
            });

            return closestAdjustment === null ? null : delta + closestAdjustment;
        };

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

        const restoreInteractionCursor = (): void => {
            if (interactionCursorClass) {
                interactionCursorViewport?.classList.remove(interactionCursorClass);
            }
            interactionCursorViewport = null;
            interactionCursorClass = null;
            document.body.style.cursor = '';
        };

        const setInteractionCursor = (className: string, cursor: string): void => {
            restoreInteractionCursor();
            interactionCursorViewport = viewport.containerRef.current;
            interactionCursorClass = className;
            interactionCursorViewport?.classList.add(className);
            document.body.style.cursor = cursor;
        };

        const applyResize = (resize: ResizeInteraction): boolean => {
            const boundaryClientX = resize.clientX + resize.grabOffsetX;
            const otherBoundary = resize.side === 'start' ? resize.end : resize.start;
            const snapTime = isAltPressed ? findSnapTime(boundaryClientX, {
                excludedClientID: resize.clientID,
                excludedTime: otherBoundary,
            }) : null;
            const time = snapTime ?? viewport.clientXToTime(boundaryClientX);
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

        const applyMove = (move: MoveInteraction): boolean => {
            const pointerTime = viewport.clientXToTime(move.clientX);
            const duration = durationRef.current;
            if (pointerTime === null || duration <= 0) return false;

            let delta = clamp(
                pointerTime - move.startTime, -move.start, duration - move.end,
            );
            if (isAltPressed) {
                delta = findMoveSnapDelta(move, delta, duration) ?? delta;
            }
            const start = move.start + delta;
            const end = move.end + delta;
            if (start === move.region.start && end === move.region.end) {
                return false;
            }

            move.region.setOptions({ start, end });
            return true;
        };

        const refreshResizing = (): void => {
            if (resizing && applyResize(resizing)) {
                hasChanged = true;
            }
        };

        const refreshMoving = (): void => {
            if (moving && applyMove(moving)) {
                hasChanged = true;
            }
        };

        const unsubscribeTransformChange = viewport.onTransformChange(() => {
            refreshResizing();
            refreshMoving();
        });

        const isPointerOverWaveform = (event: PointerEvent): boolean => {
            const waveform = viewport.containerRef.current;
            return !!waveform && event.composedPath().includes(waveform);
        };

        const clearDrawStartSnapGuide = (): void => {
            drawStartSnapGuide?.preview.remove();
            drawStartSnapGuide = null;
            viewport.containerRef.current?.classList.remove(SNAP_HOVER_CLASS);
        };

        const setDrawStartSnapGuide = (time: number): void => {
            if (drawStartSnapGuide) {
                if (drawStartSnapGuide.time !== time) {
                    drawStartSnapGuide.preview.updateRange({ start: time, end: time });
                    drawStartSnapGuide.time = time;
                }

                return;
            }

            const preview = createPreview({
                range: { start: time, end: time },
                color: latestRef.current.labelSnapGuideColor,
            });
            if (!preview) return;

            drawStartSnapGuide = { time, preview };
            viewport.containerRef.current?.classList.add(SNAP_HOVER_CLASS);
        };

        const refreshDrawStartSnapGuide = (): void => {
            const snapTime = isAltPressed && lastWaveformPointerClientX !== null ?
                findSnapTime(lastWaveformPointerClientX) : null;
            if (snapTime === null) {
                clearDrawStartSnapGuide();
            } else {
                setDrawStartSnapGuide(snapTime);
            }
        };

        const startDrawing = (event: PointerEvent): void => {
            if (moving || resizing || drawing || event.button !== 0 || !isPointerOverWaveform(event)) return;

            const startSnapTime = isAltPressed ? findSnapTime(event.clientX) : null;
            const pointerTime = viewport.clientXToTime(event.clientX);
            const startTime = startSnapTime ?? pointerTime;
            if (startTime === null || pointerTime === null) return;

            event.preventDefault();

            const preview = createPreview({
                range: {
                    start: Math.min(startTime, pointerTime),
                    end: Math.max(startTime, pointerTime),
                },
                color: latestRef.current.labelPreviewColor,
            });
            if (!preview) return;

            clearDrawStartSnapGuide();

            drawing = {
                pointerID: event.pointerId,
                clientX: event.clientX,
                startTime,
                startSnapTime,
                labelID: latestRef.current.activeLabelId,
                preview,
            };
        };

        const refreshDrawing = (): void => {
            if (!drawing) return;

            const endSnapTime = isAltPressed ? findSnapTime(drawing.clientX, {
                excludedTime: drawing.startSnapTime,
            }) : null;
            const time = endSnapTime ?? viewport.clientXToTime(drawing.clientX);
            if (time === null) return;

            drawing.preview.updateRange({
                start: Math.min(drawing.startTime, time),
                end: Math.max(drawing.startTime, time),
            });
        };

        const updateDrawing = (event: PointerEvent): void => {
            if (!drawing || drawing.pointerID !== event.pointerId) return;

            drawing = { ...drawing, clientX: event.clientX };
            refreshDrawing();
        };

        const finishDrawing = (event: PointerEvent, shouldPersist: boolean): void => {
            const currentDrawing = drawing;
            if (!currentDrawing || currentDrawing.pointerID !== event.pointerId) return;

            const endSnapTime = isAltPressed ? findSnapTime(event.clientX, {
                excludedTime: currentDrawing.startSnapTime,
            }) : null;
            const endTime = endSnapTime ?? viewport.clientXToTime(event.clientX);
            drawing = null;
            currentDrawing.preview.remove();
            if (endTime === null || !shouldPersist) return;

            const start = Math.min(currentDrawing.startTime, endTime);
            const end = Math.max(currentDrawing.startTime, endTime);
            if (end - start <= MIN_INTERVAL_DURATION) return;

            dispatch(createAudioIntervalAsync(start, end, currentDrawing.labelID));
        };

        const startRegionInteraction = (event: PointerEvent): void => {
            if (
                moving ||
                resizing ||
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
            const interval = latestRef.current.intervals.find((item) => item.clientID === clientID);
            if (!interval) return;
            const canMove = !interval.lock && !interval.pinned;

            if (side === null && !canMove) return;
            if (side !== null && !region.resize) return;
            if (!regionElement) return;

            let startTime: number | null = side === 'start' ? region.start : region.end;
            if (side === null) {
                startTime = viewport.clientXToTime(event.clientX);
            }
            if (startTime === null) return;

            const interaction: RegionInteraction = {
                pointerID: event.pointerId,
                clientID,
                region,
                startTime,
                start: region.start,
                end: region.end,
                clientX: event.clientX,
            };
            dispatch(audioActions.setAudioInteractingInterval(clientID));
            hasChanged = false;
            if (side === null) {
                moving = interaction;
                setInteractionCursor(DRAG_CURSOR_CLASS, 'grabbing');
                return;
            }

            const regionBoundingBox = regionElement.getBoundingClientRect();
            const visualBoundaryX = side === 'start' ? regionBoundingBox.left : regionBoundingBox.right;
            resizing = {
                ...interaction,
                side,
                grabOffsetX: visualBoundaryX - event.clientX,
            };
            setInteractionCursor(RESIZE_CURSOR_CLASS, 'ew-resize');
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
            resizing = {
                ...currentResizing,
                clientX: event.clientX,
            };
            refreshResizing();

            if (movementDirection !== null) {
                autoScroll.arm(movementDirection);
            }
        };

        const updateMoving = (event: PointerEvent): void => {
            const currentMoving = moving;
            if (!currentMoving || currentMoving.pointerID !== event.pointerId) return;

            moving = {
                ...currentMoving,
                clientX: event.clientX,
            };
            refreshMoving();
        };

        const finishRegionInteraction = (event: PointerEvent, preserveReleasedIntervalHover: boolean): void => {
            const currentResizing = resizing;
            const currentMoving = moving;
            const currentInteraction = currentResizing ?? currentMoving;
            if (!currentInteraction || currentInteraction.pointerID !== event.pointerId) return;

            resizing = null;
            moving = null;

            if (currentResizing) {
                autoScroll.stop();
            }
            restoreInteractionCursor();
            if (preserveReleasedIntervalHover) {
                dispatch(audioActions.setAudioHoveredInterval(currentInteraction.clientID));
            }
            dispatch(audioActions.setAudioInteractingInterval(null));
            if (!hasChanged) return;

            dispatch(updateAudioIntervalAsync(currentInteraction.clientID, {
                start: Math.round(currentInteraction.region.start * 1000),
                stop: Math.round(currentInteraction.region.end * 1000),
            }));
        };

        const cancelCustomInteraction = (): void => {
            lastWaveformPointerClientX = null;
            clearDrawStartSnapGuide();
            if (drawing) {
                drawing.preview.remove();
                drawing = null;
                return;
            }

            const currentResizing = resizing;
            const currentMoving = moving;
            const currentInteraction = currentResizing ?? currentMoving;
            if (!currentInteraction) return;

            resizing = null;
            moving = null;
            hasChanged = false;
            if (currentResizing) {
                autoScroll.stop();
            }
            restoreInteractionCursor();
            currentInteraction.region.setOptions({
                start: currentInteraction.start,
                end: currentInteraction.end,
            });
            dispatch(audioActions.setAudioInteractingInterval(null));
        };

        cancelCustomInteractionRef.current = cancelCustomInteraction;

        const onPointerDown = (event: PointerEvent): void => {
            isAltPressed = event.altKey;
            if (latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                startDrawing(event);
            } else {
                lastWaveformPointerClientX = null;
                clearDrawStartSnapGuide();
                startRegionInteraction(event);
            }
        };

        const onPointerMove = (event: PointerEvent): void => {
            isAltPressed = event.altKey;
            if (drawing) {
                if (latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                    updateDrawing(event);
                } else {
                    finishDrawing(event, false);
                }
                return;
            }

            if (latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                lastWaveformPointerClientX = isPointerOverWaveform(event) ? event.clientX : null;
                refreshDrawStartSnapGuide();
                return;
            }

            lastWaveformPointerClientX = null;
            clearDrawStartSnapGuide();
            updateResizing(event);
            updateMoving(event);
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
            isAltPressed = event.altKey;
            if (drawing) {
                suppressReleasedDrawClick();
                finishDrawing(event, latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE);
                return;
            }

            finishRegionInteraction(event, isPointerOverWaveform(event));
        };

        const onPointerCancel = (event: PointerEvent): void => {
            isAltPressed = event.altKey;
            if (drawing) {
                finishDrawing(event, false);
                return;
            }

            finishRegionInteraction(event, false);
        };

        const onAltKeyChange = (event: KeyboardEvent): void => {
            if (event.key !== 'Alt') return;

            if (event.type === 'keydown') {
                isAltPressed = true;
            } else if (event.type === 'keyup') {
                isAltPressed = false;
            } else {
                return;
            }

            if (resizing) refreshResizing();
            if (moving) refreshMoving();
            if (drawing) refreshDrawing();
            if (!drawing && latestRef.current.activeControl === ActiveControl.AUDIO_REGION_CREATE) {
                refreshDrawStartSnapGuide();
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerCancel);
        document.addEventListener('keydown', onAltKeyChange);
        document.addEventListener('keyup', onAltKeyChange);
        return () => {
            if (cancelCustomInteractionRef.current === cancelCustomInteraction) {
                cancelCustomInteractionRef.current = null;
            }
            resizing = null;
            moving = null;
            drawing?.preview.remove();
            drawing = null;
            drawStartSnapGuide?.preview.remove();
            drawStartSnapGuide = null;
            lastWaveformPointerClientX = null;
            viewport.containerRef.current?.classList.remove(SNAP_HOVER_CLASS);
            hasChanged = false;
            dispatch(audioActions.setAudioInteractingInterval(null));
            autoScroll.destroy();
            setAutoScrolling(false);
            restoreInteractionCursor();
            unsubscribeTransformChange();
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerCancel);
            document.removeEventListener('keydown', onAltKeyChange);
            document.removeEventListener('keyup', onAltKeyChange);
        };
    }, [ready]);

    return {
        wrapperClassName: isCreating ? 'cvat-audio-waveform-interaction-create' : '',
    };
}
