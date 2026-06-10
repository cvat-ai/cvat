// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback, useEffect, useRef,
} from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { ActiveControl, ColorBy } from 'reducers';
import { AudioIntervalState, Job, Label } from 'cvat-core-wrapper';

import { applyAudioControlMode, DragSelectionCleanup } from '../utils/apply-audio-control-mode';
import { injectScrollbarStyle } from '../utils/inject-scrollbar-style';
import { getAudioRegionColor, getRegionItemColor } from '../audio-region-colors';
import { getPlayOnceRegionId, setPlayOnceRegionId } from '../utils/play-once-region';
import { attachRegionAutoScroll } from '../utils/region-auto-scroll';
import {
    clientIDFromWaveRegionId,
    intervalEndSeconds,
    intervalID,
    intervalStartSeconds,
    waveRegionId,
} from '../utils/audio-interval';

const ACTIVE_BORDER_FALLBACK = '#6366F1';
const HOVER_DELTA_THRESHOLD = 2;

function clampRegionDragToBounds(region: Region): void {
    /* eslint-disable no-underscore-dangle */
    const r = region as any;
    const original = r._onUpdate.bind(r) as (
        dx: number, side?: 'start' | 'end', startTime?: number,
    ) => void;
    r._onUpdate = (deltaPx: number, side?: 'start' | 'end', startTime?: number): void => {
        if (side) {
            original(deltaPx, side, startTime);
            return;
        }
        const width = r.element?.parentElement?.getBoundingClientRect().width ?? 0;
        const total = r.totalDuration as number;
        if (!width || !total) {
            original(deltaPx, side, startTime);
            return;
        }
        const deltaSec = (deltaPx / width) * total;
        const clampedSec = Math.max(-region.start, Math.min(total - region.end, deltaSec));
        original((clampedSec / total) * width, side, startTime);
    };
    /* eslint-enable no-underscore-dangle */
}

interface Params {
    jobInstance: Job | null;
    regionsPluginRef: React.MutableRefObject<RegionsPlugin | null>;
    wavesurfer: WaveSurfer | null;
    lastWsTimeRef: React.MutableRefObject<number>;
    phantomRegionIdsRef: React.MutableRefObject<Set<string>>;
    activeControl: ActiveControl;
    intervals: AudioIntervalState[];
    activeIntervalID: number | null;
    hoveredIntervalID: number | null;
    labels: Label[];
    activeLabelId: number | null;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    loop: boolean;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onSetDuration(duration: number): void;
    onCreateInterval(start: number, stop: number, labelID: number | null): void;
    onUpdateIntervalPosition(clientID: number, start: number, stop: number): void;
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onWaveformReady(ready: boolean): void;
    onWavesurferReady(ws: WaveSurfer): void;
}

interface Result {
    handleReady: (ws: WaveSurfer) => void;
    handleFinish: () => void;
    handleTimeupdate: (ws: WaveSurfer) => void;
}

export function useAudioRegions(params: Params): Result {
    const {
        jobInstance,
        regionsPluginRef, wavesurfer, lastWsTimeRef, phantomRegionIdsRef,
        activeControl, intervals, activeIntervalID, hoveredIntervalID,
        labels, activeLabelId, colorBy, opacity, selectedOpacity, loop,
        onSwitchPlay, onSetCurrentTime, onSetDuration,
        onCreateInterval, onUpdateIntervalPosition, onSetActiveInterval, onSetHoveredInterval,
        onWaveformReady, onWavesurferReady,
    } = params;

    const dragSelectionCleanupRef = useRef<DragSelectionCleanup>(null);
    const regionsHandlersInitializedRef = useRef(false);
    const silentRemoveIdsRef = useRef<Set<string>>(new Set());
    const silentUpdateIdsRef = useRef<Set<string>>(new Set());

    const intervalSelectionDisabled = (
        activeControl === ActiveControl.AUDIO_REGION_CREATE ||
        activeControl === ActiveControl.AUDIO_REGION_RECORD
    );

    const activeControlRef = useRef(activeControl);
    const intervalsRef = useRef(intervals);
    const activeIntervalIDRef = useRef(activeIntervalID);
    const hoveredIntervalIDRef = useRef(hoveredIntervalID);
    const activeLabelIdRef = useRef(activeLabelId);
    const loopRef = useRef(loop);
    const wavesurferRef = useRef<WaveSurfer | null>(wavesurfer);
    const jobInstanceRef = useRef<Job | null>(jobInstance);
    const lastHoverPointRef = useRef<{ x: number; y: number } | null>(null);
    const hoverSelectTokenRef = useRef(0);
    const onCreateIntervalRef = useRef(onCreateInterval);
    const onUpdateIntervalPositionRef = useRef(onUpdateIntervalPosition);
    const onSetActiveIntervalRef = useRef(onSetActiveInterval);
    const onSetHoveredIntervalRef = useRef(onSetHoveredInterval);

    useEffect(() => { activeControlRef.current = activeControl; }, [activeControl]);
    useEffect(() => { intervalsRef.current = intervals; }, [intervals]);
    useEffect(() => {
        if (getPlayOnceRegionId() && Number(getPlayOnceRegionId()) !== activeIntervalID) {
            setPlayOnceRegionId(null);
        }
        activeIntervalIDRef.current = activeIntervalID;
    }, [activeIntervalID]);
    useEffect(() => { hoveredIntervalIDRef.current = hoveredIntervalID; }, [hoveredIntervalID]);
    useEffect(() => { activeLabelIdRef.current = activeLabelId; }, [activeLabelId]);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    useEffect(() => { wavesurferRef.current = wavesurfer; }, [wavesurfer]);
    useEffect(() => { jobInstanceRef.current = jobInstance; }, [jobInstance]);
    useEffect(() => { onCreateIntervalRef.current = onCreateInterval; }, [onCreateInterval]);
    useEffect(() => { onUpdateIntervalPositionRef.current = onUpdateIntervalPosition; }, [onUpdateIntervalPosition]);
    useEffect(() => { onSetActiveIntervalRef.current = onSetActiveInterval; }, [onSetActiveInterval]);
    useEffect(() => { onSetHoveredIntervalRef.current = onSetHoveredInterval; }, [onSetHoveredInterval]);

    const computeClickTime = useCallback((e: MouseEvent): number | null => {
        const ws = wavesurferRef.current;
        if (!ws) return null;
        const wrapper = ws.getWrapper();
        const scrollContainer = wrapper?.parentElement;
        if (!scrollContainer) return null;
        const duration = ws.getDuration();
        if (!duration) return null;
        const rect = scrollContainer.getBoundingClientRect();
        const totalWidth = scrollContainer.scrollWidth || rect.width;
        if (totalWidth <= 0) return null;
        const xWithinScroll = (e.clientX - rect.left) + ws.getScroll();
        const clamped = Math.max(0, Math.min(totalWidth, xWithinScroll));
        return (clamped / totalWidth) * duration;
    }, []);

    const centerViewportOnInterval = useCallback((clientID: number): void => {
        const ws = wavesurferRef.current;
        if (!ws) return;
        const interval = intervalsRef.current.find((_interval) => _interval.clientID === clientID);
        if (!interval) return;
        const duration = ws.getDuration();
        if (!duration) return;
        const scrollContainer = ws.getWrapper()?.parentElement;
        if (!scrollContainer) return;
        const totalWidth = scrollContainer.scrollWidth;
        const visibleWidth = ws.getWidth();
        if (totalWidth <= visibleWidth) return;

        const startPx = (intervalStartSeconds(interval) / duration) * totalWidth;
        const endPx = (intervalEndSeconds(interval) / duration) * totalWidth;
        const midPx = (startPx + endPx) / 2;
        const targetScroll = Math.max(
            0,
            Math.min(totalWidth - visibleWidth, midPx - visibleWidth / 2),
        );
        ws.setScroll(targetScroll);
    }, []);

    const pickIntervalAtPosition = useCallback(async (positionMs: number): Promise<number | null> => {
        const job = jobInstanceRef.current;
        if (!job) {
            return null;
        }

        const { state } = await job.annotations.selectInterval(intervalsRef.current, positionMs);
        return state?.clientID ?? null;
    }, []);

    const registerRegionHandlers = useCallback((plugin: RegionsPlugin): void => {
        if (regionsHandlersInitializedRef.current) return;

        plugin.on('region-created', (region: Region) => {
            if (phantomRegionIdsRef.current.has(region.id)) {
                return;
            }
            clampRegionDragToBounds(region);

            const clientID = clientIDFromWaveRegionId(region.id);
            const exists = clientID !== null && intervalsRef.current.some((interval) => interval.clientID === clientID);
            if (exists) {
                return;
            }

            const start = Math.max(0, region.start);
            const stop = Math.max(start, region.end);
            if (stop - start <= 0.001) {
                silentRemoveIdsRef.current.add(region.id);
                region.remove();
                return;
            }

            silentRemoveIdsRef.current.add(region.id);
            region.remove();
            onCreateIntervalRef.current(start, stop, activeLabelIdRef.current);
        });

        plugin.on('region-updated', (region: Region) => {
            if (silentUpdateIdsRef.current.delete(region.id)) return;
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;
            const interval = intervalsRef.current.find((_interval) => _interval.clientID === clientID);
            if (!interval) return;
            if (
                Math.abs(intervalStartSeconds(interval) - region.start) < 0.001 &&
                Math.abs(intervalEndSeconds(interval) - region.end) < 0.001
            ) {
                return;
            }

            onUpdateIntervalPositionRef.current(clientID, region.start, region.end);
        });

        plugin.on('region-removed', (region: Region) => {
            if (silentRemoveIdsRef.current.delete(region.id)) return;
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID !== null && activeIntervalIDRef.current === clientID) {
                onSetActiveIntervalRef.current(null);
            }
        });

        plugin.on('region-clicked', async (region: Region, e?: MouseEvent) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }

            const isCursor = activeControlRef.current === ActiveControl.CURSOR;
            const isDoubleClick = !!(e && e.detail >= 2);
            const clickTime = e ? computeClickTime(e) : null;
            let pickedClientID = clientIDFromWaveRegionId(region.id);

            if (isCursor && clickTime !== null) {
                pickedClientID = await pickIntervalAtPosition(clickTime * 1000) ?? pickedClientID;
            }

            if (isCursor) {
                onSetActiveIntervalRef.current(pickedClientID);
            }

            if (isDoubleClick) {
                const safeStart = Math.max(0, region.start || 0);
                if (pickedClientID !== null) {
                    setPlayOnceRegionId(String(pickedClientID));
                    centerViewportOnInterval(pickedClientID);
                }
                onSetCurrentTime(safeStart);
                const ws = wavesurferRef.current;
                if (ws) ws.setTime(safeStart);
                onSwitchPlay(true);
                return;
            }

            if (isCursor && clickTime !== null) {
                onSetCurrentTime(clickTime);
                const ws = wavesurferRef.current;
                if (ws) ws.setTime(clickTime);
            }
        });

        regionsHandlersInitializedRef.current = true;
    }, [
        computeClickTime, pickIntervalAtPosition,
        centerViewportOnInterval, onSetCurrentTime, onSwitchPlay,
    ]);

    const handleReady = useCallback((ws: WaveSurfer): void => {
        onSetDuration(ws.getDuration());
        onWaveformReady(true);
        onWavesurferReady(ws);

        injectScrollbarStyle(ws.getWrapper());

        const plugin = regionsPluginRef.current;
        if (plugin) {
            applyAudioControlMode(activeControl, plugin, dragSelectionCleanupRef, intervalsRef.current);
            registerRegionHandlers(plugin);
        }
    }, [activeControl, onSetDuration, onWaveformReady, onWavesurferReady, regionsPluginRef, registerRegionHandlers]);

    const handleFinish = useCallback((): void => {
        if (loopRef.current && activeIntervalIDRef.current !== null && wavesurfer) {
            const activeInterval = intervalsRef.current.find(
                (interval) => interval.clientID === activeIntervalIDRef.current,
            );
            if (activeInterval) {
                wavesurfer.setTime(Math.max(0, intervalStartSeconds(activeInterval)));
                wavesurfer.play();
                return;
            }
        }
        onSwitchPlay(false);
        onSetCurrentTime(0);
    }, [onSwitchPlay, onSetCurrentTime, wavesurfer]);

    const handleTimeupdate = useCallback((ws: WaveSurfer): void => {
        const time = ws.getCurrentTime();
        lastWsTimeRef.current = time;
        onSetCurrentTime(time);

        const activeID = activeIntervalIDRef.current;
        if (activeID === null) return;
        const activeInterval = intervalsRef.current.find((interval) => interval.clientID === activeID);
        if (!activeInterval) return;
        if (time < intervalEndSeconds(activeInterval)) return;

        if (loopRef.current) {
            ws.setTime(Math.max(0, intervalStartSeconds(activeInterval)));
            return;
        }

        if (getPlayOnceRegionId() === String(activeID)) {
            ws.pause();
            onSwitchPlay(false);
            setPlayOnceRegionId(null);
        }
    }, [lastWsTimeRef, onSetCurrentTime, onSwitchPlay]);

    useEffect(() => {
        applyAudioControlMode(activeControl, regionsPluginRef.current, dragSelectionCleanupRef, intervals);
    }, [activeControl, intervals, regionsPluginRef]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !wavesurfer) return undefined;
        return attachRegionAutoScroll(plugin, () => wavesurferRef.current);
    }, [wavesurfer, regionsPluginRef]);

    useEffect(() => {
        if (!wavesurfer) return undefined;

        const scrollContainer = wavesurfer.getWrapper()?.parentElement;
        if (!scrollContainer) return undefined;

        const selectHoveredInterval = async (event: MouseEvent): Promise<void> => {
            if (activeControlRef.current !== ActiveControl.CURSOR) {
                return;
            }

            const lastPoint = lastHoverPointRef.current;
            if (lastPoint) {
                const dx = event.clientX - lastPoint.x;
                const dy = event.clientY - lastPoint.y;
                const delta = Math.sqrt(dx ** 2 + dy ** 2);
                if (delta <= HOVER_DELTA_THRESHOLD) return;
            }
            lastHoverPointRef.current = { x: event.clientX, y: event.clientY };

            const clickTime = computeClickTime(event);
            if (clickTime === null) return;

            const token = hoverSelectTokenRef.current + 1;
            hoverSelectTokenRef.current = token;
            const clientID = await pickIntervalAtPosition(clickTime * 1000);
            if (!Object.is(token, hoverSelectTokenRef.current)) return;
            if (clientID !== hoveredIntervalIDRef.current) {
                onSetHoveredIntervalRef.current(clientID);
            }
        };

        const onMouseMove = (event: MouseEvent): void => {
            selectHoveredInterval(event).catch(() => {});
        };
        const onMouseLeave = (): void => {
            lastHoverPointRef.current = null;
            hoverSelectTokenRef.current += 1;
            if (hoveredIntervalIDRef.current !== null) {
                onSetHoveredIntervalRef.current(null);
            }
        };

        scrollContainer.addEventListener('mousemove', onMouseMove);
        scrollContainer.addEventListener('mouseleave', onMouseLeave);

        return () => {
            scrollContainer.removeEventListener('mousemove', onMouseMove);
            scrollContainer.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [wavesurfer, computeClickTime, pickIntervalAtPosition]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin) return;

        const wsRegions = plugin.getRegions();
        const intervalsById = new Map(intervals.map((interval) => [waveRegionId(interval), interval]));

        wsRegions.forEach((wsRegion: Region) => {
            if (phantomRegionIdsRef.current.has(wsRegion.id)) return;
            const interval = intervalsById.get(wsRegion.id);
            const id = interval ? intervalID(interval) : null;
            if (interval?.hidden) {
                silentRemoveIdsRef.current.add(wsRegion.id);
                wsRegion.remove();
                return;
            }
            const isActive = id === activeIntervalID;
            const color = interval ?
                getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, isActive) :
                ACTIVE_BORDER_FALLBACK;
            const isEdit = activeControl === ActiveControl.AUDIO_REGION_EDIT;
            wsRegion.setOptions({
                color,
                drag: isEdit && !interval?.lock,
                resize: isEdit && !interval?.lock,
            });
            const { element } = wsRegion;
            if (element) {
                const isHovered = id === hoveredIntervalID;
                const borderColor = interval ? getRegionItemColor(interval, labels, colorBy) : ACTIVE_BORDER_FALLBACK;
                element.style.border = isActive || isHovered ? `2px solid ${borderColor}` : '';
            }
        });
    }, [
        activeIntervalID, hoveredIntervalID, intervals, colorBy, opacity, selectedOpacity,
        labels, activeControl, regionsPluginRef,
    ]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !wavesurfer) return;

        const wsRegions = plugin.getRegions();

        intervals.forEach((interval) => {
            const id = intervalID(interval);
            if (interval.hidden) return;
            const regionId = waveRegionId(interval);
            const wsRegion = wsRegions.find((region: Region) => region.id === regionId);
            const start = intervalStartSeconds(interval);
            const end = intervalEndSeconds(interval);
            if (!wsRegion) {
                const isEdit = activeControl === ActiveControl.AUDIO_REGION_EDIT;
                const isActive = id === activeIntervalID;
                const added = plugin.addRegion({
                    id: regionId,
                    start,
                    end,
                    color: getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, isActive),
                    drag: isEdit && !interval.lock,
                    resize: isEdit && !interval.lock,
                });
                if (added.element && intervalSelectionDisabled) {
                    added.element.style.pointerEvents = 'none';
                }
            } else if (Math.abs(wsRegion.start - start) >= 0.001 || Math.abs(wsRegion.end - end) >= 0.001) {
                silentUpdateIdsRef.current.add(wsRegion.id);
                wsRegion.setOptions({ start, end });
            }
        });

        const intervalIds = new Set(
            intervals.filter((interval) => !interval.hidden)
                .map((interval) => waveRegionId(interval)),
        );
        wsRegions.forEach((wsRegion: Region) => {
            if (phantomRegionIdsRef.current.has(wsRegion.id)) return;
            if (!intervalIds.has(wsRegion.id)) {
                silentRemoveIdsRef.current.add(wsRegion.id);
                wsRegion.remove();
            }
        });
    }, [
        intervals, wavesurfer, activeControl, colorBy, opacity, selectedOpacity,
        labels, activeIntervalID, intervalSelectionDisabled, regionsPluginRef,
    ]);

    return { handleReady, handleFinish, handleTimeupdate };
}
