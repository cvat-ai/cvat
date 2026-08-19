// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

import { MIN_INTERVAL_DURATION } from 'audio/utils/waveform-geometry';
import { findAudioIntervalBoundariesAsync, updateAudioIntervalsAsync } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import { AudioTimeRange, clampRange } from '../utils/audio-interval';
import { addPart, removePart } from '../utils/shadow-dom';
import { getIntervalRegionsByClientID } from '../utils/wave-regions';
import { WaveformRegionRuntime } from './use-audio-waveform';
import type { RegionHighlighting } from './use-region-projection';
import type { SelectionInteraction } from './use-region-selection';
import { WaveformViewport } from './use-waveform-viewport';

const BOUNDARY_TOLERANCE_MS = 50;
const BULK_EDIT_BOUNDARY_PART = 'cvat-audio-bulk-edit-boundary';
const RESIZE_CURSOR_CLASS = 'cvat-audio-waveform-interaction-resize';

interface Boundary {
    regionClientID: number;
    region: Region;
    side: UpdateSide;
    value: number;
}

interface RegionUpdate extends AudioTimeRange {
    region: Region;
    affectedSides: Set<UpdateSide>;
}

interface HoveredBoundaries {
    boundaries: Boundary[];
    time: number | null;
}

interface BulkDragCommon {
    pointerID: number;
    startTime: number;
    latestTime: number;
}

interface PendingBulkDrag extends BulkDragCommon {
    guard: object;
}

interface EngagedBulkDrag extends BulkDragCommon {
    boundaries: Boundary[];
    affectedRegions: Array<{ regionClientID: number; region: Region }>;
}

type BulkDragStatus = { status: 'pending'; value: PendingBulkDrag } | { status: 'engaged'; value: EngagedBulkDrag };

interface Params {
    regionRuntime: WaveformRegionRuntime;
    regionHighlighting: RegionHighlighting;
    selectionInteraction: SelectionInteraction;
    viewport: WaveformViewport;
    durationRef: React.MutableRefObject<number>;
    ready: boolean;
}

function boundaryElement(region: Region, side: Boundary['side']): HTMLElement | null {
    return region.element?.querySelector(`[part*="region-handle-${side === 'start' ? 'left' : 'right'}"]`) ?? null;
}

function isBulkEvent(event: PointerEvent): boolean {
    return event.shiftKey;
}

function isBulkEditingAllowed(activeControl: ActiveControl): boolean {
    return activeControl === ActiveControl.CURSOR;
}

function boundaryKey(boundary: Boundary): string {
    return `${boundary.regionClientID}:${boundary.side}`;
}

function setBoundaryIndicator(boundary: Boundary, active: boolean): void {
    const element = boundaryElement(boundary.region, boundary.side);
    if (!element) return;

    if (active) {
        addPart(element, BULK_EDIT_BOUNDARY_PART);
    } else {
        removePart(element, BULK_EDIT_BOUNDARY_PART);
    }
}

/**
 * Moves every unlocked boundary close to the Shift-hovered cursor together.
 * This bypasses WaveSurfer dragging entirely: it keeps the selection symmetric,
 * and prevents its drag auto-scroll/pointer-lock behavior from taking over.
 */
export function useBulkBoundariesEditing({
    regionRuntime, regionHighlighting, selectionInteraction, viewport, durationRef, ready,
}: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const { activeControl } = useSelector(
        (state: CombinedState) => ({
            activeControl: state.annotation.canvas.activeControl,
        }),
        shallowEqual,
    );
    const activeControlRef = useRef(activeControl);
    const hoveredRef = useRef<HoveredBoundaries>({ boundaries: [], time: null });
    const bulkDragRef = useRef<BulkDragStatus | null>(null);
    const previousCursorRef = useRef('');
    activeControlRef.current = activeControl;

    const clearHoveredBoundaries = (): void => {
        viewport.containerRef.current?.classList.remove(RESIZE_CURSOR_CLASS);
        hoveredRef.current.boundaries.forEach((boundary) => setBoundaryIndicator(boundary, false));
        regionHighlighting.removeHighlightedRegionIDs(
            new Set(hoveredRef.current.boundaries.map((boundary) => boundary.regionClientID)),
        );
        hoveredRef.current = { boundaries: [], time: null };
        document.body.style.cursor = previousCursorRef.current;
    };

    const setHoveredBoundaries = (boundaries: Boundary[], time: number | null): void => {
        viewport.containerRef.current?.classList.toggle(RESIZE_CURSOR_CLASS, !!boundaries.length);
        document.body.style.cursor = previousCursorRef.current;
        if (boundaries.length) {
            previousCursorRef.current = document.body.style.cursor;
            document.body.style.cursor = 'ew-resize';
        }
        const previousRegionIDs = new Set(hoveredRef.current.boundaries.map((boundary) => boundary.regionClientID));
        const nextRegionIDs = new Set(boundaries.map((boundary) => boundary.regionClientID));
        regionHighlighting.removeHighlightedRegionIDs(
            [...previousRegionIDs].filter((regionID) => !nextRegionIDs.has(regionID)),
        );
        regionHighlighting.addHighlightedRegionIDs(
            [...nextRegionIDs].filter((regionID) => !previousRegionIDs.has(regionID)),
        );

        const previousBoundariesByKey = new Map(
            hoveredRef.current.boundaries.map((boundary) => [boundaryKey(boundary), boundary]),
        );
        const nextBoundariesByKey = new Map(boundaries.map((boundary) => [boundaryKey(boundary), boundary]));
        previousBoundariesByKey.forEach((boundary, key) => {
            if (!nextBoundariesByKey.has(key)) {
                setBoundaryIndicator(boundary, false);
            }
        });
        nextBoundariesByKey.forEach((boundary, key) => {
            if (!previousBoundariesByKey.has(key)) {
                setBoundaryIndicator(boundary, true);
            }
        });

        hoveredRef.current = { boundaries, time };
    };

    useLayoutEffect(() => {
        hoveredRef.current.boundaries
            .filter((boundary) => regionHighlighting.highlightedRegionIDs.has(boundary.regionClientID))
            .forEach((boundary) => setBoundaryIndicator(boundary, true));
    }, [regionHighlighting.highlightedRegionIDs]);

    useEffect(() => {
        if (!ready) return undefined;

        const findNearBoundaries = async (timeSec: number): Promise<Boundary[]> => {
            const semanticBoundaries = await dispatch(
                findAudioIntervalBoundariesAsync(
                    timeSec * 1000,
                    BOUNDARY_TOLERANCE_MS,
                ),
            );
            const regionsByID = getIntervalRegionsByClientID(regionRuntime.regionsPlugin);

            return semanticBoundaries.flatMap(({ state, side }) => {
                if (state.clientID === null || state.lock) return [];

                const region = regionsByID.get(state.clientID);
                if (!region?.element) return [];

                return [
                    {
                        regionClientID: state.clientID,
                        region,
                        side,
                        value: side === 'start' ? state.start / 1000 : (state.stop ?? state.start) / 1000,
                    },
                ];
            });
        };

        const moveBoundariesToTime = (pointerID: number, time: number): void => {
            const drag = bulkDragRef.current;
            if (drag?.status !== 'engaged' || drag.value.pointerID !== pointerID) return;

            const { boundaries, startTime } = drag.value;
            const updates = new Map<number, RegionUpdate>();
            boundaries.forEach((boundary) => {
                let update = updates.get(boundary.regionClientID);
                if (!update) {
                    update = {
                        region: boundary.region,
                        start: boundary.region.start,
                        end: boundary.region.end,
                        affectedSides: new Set(),
                    };
                    updates.set(boundary.regionClientID, update);
                }
                update.affectedSides.add(boundary.side);
                const delta = time - startTime;
                if (boundary.side === 'start') {
                    update.start = boundary.value + delta;
                } else {
                    update.end = boundary.value + delta;
                }
            });

            updates.forEach(({
                region, start, end, affectedSides,
            }) => {
                const movesStart = affectedSides.has('start');
                const movesEnd = affectedSides.has('end');
                let constrainedStart = start;
                let constrainedEnd = end;
                if (movesStart && !movesEnd) {
                    constrainedStart = Math.min(constrainedStart, constrainedEnd - MIN_INTERVAL_DURATION);
                } else if (movesEnd && !movesStart) {
                    constrainedEnd = Math.max(constrainedEnd, constrainedStart + MIN_INTERVAL_DURATION);
                }

                let { start: nextStart, end: nextEnd } = clampRange({
                    start: constrainedStart,
                    end: constrainedEnd,
                }, durationRef.current);
                if (nextEnd - nextStart < MIN_INTERVAL_DURATION) {
                    if (movesStart) {
                        nextStart = nextEnd - MIN_INTERVAL_DURATION;
                    } else {
                        nextEnd = nextStart + MIN_INTERVAL_DURATION;
                    }
                }

                region.setOptions({ start: nextStart, end: nextEnd });
            });
        };

        const engage = (pointerID: number, boundaries: Boundary[], startTime: number, latestTime: number): void => {
            if (!boundaries.length) return;

            selectionInteraction.disableSelectionInteraction();

            const affectedRegions = [
                ...new Map(boundaries.map((boundary) => [boundary.regionClientID, boundary.region])),
            ].map(([regionClientID, region]) => ({ regionClientID, region }));
            bulkDragRef.current = {
                status: 'engaged',
                value: {
                    pointerID,
                    boundaries,
                    affectedRegions,
                    startTime,
                    latestTime,
                },
            };
            setHoveredBoundaries(boundaries, startTime);
            moveBoundariesToTime(pointerID, latestTime);
        };

        let hoverGuard: object | null = null;
        let lastPointerX: number | null = null;
        // Prevents the WS from seeking to the DnD release position
        // Also, enables our selection after its non-capture pointer events are handled
        // TODO: find better solution for this
        let suppressReleaseClick = false;
        const updateHoveredBoundaries = (time: number | null): void => {
            if (time === null) {
                hoverGuard = null;
                clearHoveredBoundaries();
                return;
            }

            const guard = {};
            hoverGuard = guard;
            findNearBoundaries(time)
                .then((boundaries) => {
                    if (hoverGuard !== guard) return;

                    setHoveredBoundaries(boundaries, time);
                })
                .catch(() => {});
        };

        const onPointerMove = (event: PointerEvent): void => {
            const drag = bulkDragRef.current;
            if (drag) {
                if (drag.value.pointerID !== event.pointerId) {
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                const time = viewport.clientXToTime(event.clientX);
                if (time !== null) {
                    drag.value.latestTime = time;
                    if (drag.status === 'engaged') {
                        moveBoundariesToTime(event.pointerId, time);
                    }
                }
            } else {
                lastPointerX = event.clientX;
                const time = isBulkEditingAllowed(activeControlRef.current) && isBulkEvent(event) ?
                    viewport.clientXToTime(event.clientX) : null;
                updateHoveredBoundaries(time);
            }
        };

        const onShiftKeyChange = (event: KeyboardEvent): void => {
            if (event.key !== 'Shift' || event.repeat || bulkDragRef.current) return;

            const time = event.type === 'keydown' && lastPointerX !== null && isBulkEditingAllowed(activeControlRef.current) ?
                viewport.clientXToTime(lastPointerX) : null;
            updateHoveredBoundaries(time);
        };

        const onPointerDown = (event: PointerEvent): void => {
            if (suppressReleaseClick) {
                suppressReleaseClick = false;
                selectionInteraction.enableSelectionInteraction();
            }

            if (!isBulkEditingAllowed(activeControlRef.current) || !isBulkEvent(event) || event.button !== 0) return;
            if (bulkDragRef.current) return;

            const time = viewport.clientXToTime(event.clientX);
            if (time === null) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            hoverGuard = null;

            const { boundaries: hoveredBoundaries, time: hoveredTime } = hoveredRef.current;
            const isHoverUpToDate =
                hoveredTime !== null &&
                Math.abs(time - hoveredTime) <= BOUNDARY_TOLERANCE_MS / 1000;
            const boundaries = isHoverUpToDate ? hoveredBoundaries : [];

            if (isHoverUpToDate) {
                if (boundaries.length) {
                    engage(event.pointerId, boundaries, time, time);
                }

                return;
            }

            const dragGuard = {};
            bulkDragRef.current = {
                status: 'pending',
                value: {
                    pointerID: event.pointerId,
                    startTime: time,
                    latestTime: time,
                    guard: dragGuard,
                },
            };
            findNearBoundaries(time)
                .then((resolvedBoundaries) => {
                    const drag = bulkDragRef.current;
                    if (drag?.status !== 'pending' || drag.value.guard !== dragGuard) return;

                    engage(drag.value.pointerID, resolvedBoundaries, drag.value.startTime, drag.value.latestTime);
                })
                .catch(() => {
                    if (bulkDragRef.current?.status === 'pending' && bulkDragRef.current.value.guard === dragGuard) {
                        bulkDragRef.current = null;
                    }
                });
        };

        const applyBulkChanges = (event: PointerEvent): void => {
            const drag = bulkDragRef.current;
            if (!drag || drag.value.pointerID !== event.pointerId) return;

            event.stopImmediatePropagation();
            bulkDragRef.current = null;
            if (drag.status !== 'engaged') return;

            if (event.type === 'pointercancel') {
                selectionInteraction.enableSelectionInteraction();
            } else {
                suppressReleaseClick = true;
            }

            const updates = drag.value.affectedRegions.map(({ regionClientID, region }) => ({
                regionClientID,
                start: region.start,
                end: region.end,
            }));
            clearHoveredBoundaries();
            if (!updates.length) return;

            const updatesByID = new Map(updates.map((update) => [update.regionClientID, update]));
            dispatch(updateAudioIntervalsAsync(
                updates.map((update) => update.regionClientID),
                (interval) => {
                    const update = updatesByID.get(interval.clientID as number) as AudioTimeRange;
                    return { start: Math.round(update.start * 1000), stop: Math.round(update.end * 1000) };
                },
            ));
        };

        const onClick = (event: MouseEvent): void => {
            if (!suppressReleaseClick) return;

            suppressReleaseClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
            selectionInteraction.enableSelectionInteraction();
        };

        document.addEventListener('pointermove', onPointerMove, { capture: true });
        document.addEventListener('pointerdown', onPointerDown, { capture: true });
        document.addEventListener('pointerup', applyBulkChanges, { capture: true });
        document.addEventListener('pointercancel', applyBulkChanges, { capture: true });
        document.addEventListener('click', onClick, { capture: true });
        document.addEventListener('keydown', onShiftKeyChange);
        document.addEventListener('keyup', onShiftKeyChange);
        return () => {
            hoverGuard = null;
            bulkDragRef.current = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: true });
            document.removeEventListener('pointerdown', onPointerDown, { capture: true });
            document.removeEventListener('pointerup', applyBulkChanges, { capture: true });
            document.removeEventListener('pointercancel', applyBulkChanges, { capture: true });
            document.removeEventListener('click', onClick, { capture: true });
            document.removeEventListener('keydown', onShiftKeyChange);
            document.removeEventListener('keyup', onShiftKeyChange);
            selectionInteraction.enableSelectionInteraction();
            clearHoveredBoundaries();
        };
    }, [ready]);
}
