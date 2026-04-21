import {
    useCallback, useEffect, useRef,
} from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { ActiveControl, AudioRegion, ColorBy } from 'reducers';
import { Label } from 'cvat-core-wrapper';

import { applyAudioControlMode, DragSelectionCleanup } from '../utils/apply-audio-control-mode';
import { injectScrollbarStyle } from '../utils/inject-scrollbar-style';
import { createAudioRegion } from '../utils/create-audio-region';
import { getAudioRegionColor, getRegionItemColor } from '../audio-region-colors';

const ACTIVE_BORDER_FALLBACK = '#6366F1';
const ACTIVE_Z_OFFSET = 10000;

interface Params {
    regionsPluginRef: React.MutableRefObject<RegionsPlugin | null>;
    wavesurfer: WaveSurfer | null;
    lastWsTimeRef: React.MutableRefObject<number>;
    activeControl: ActiveControl;
    regions: AudioRegion[];
    activeRegionId: string | null;
    hoveredRegionId: string | null;
    labels: Label[];
    activeLabelId: number | null;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    loop: boolean;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onSetDuration(duration: number): void;
    onSetRegions(regions: AudioRegion[]): void;
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onUpdateActiveControl(activeControl: ActiveControl): void;
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
        regionsPluginRef, wavesurfer, lastWsTimeRef,
        activeControl, regions, activeRegionId, hoveredRegionId,
        labels, activeLabelId, colorBy, opacity, selectedOpacity, loop,
        onSwitchPlay, onSetCurrentTime, onSetDuration,
        onSetRegions, onSetActiveRegion, onSetHoveredRegion,
        onUpdateActiveControl, onWaveformReady, onWavesurferReady,
    } = params;

    const dragSelectionCleanupRef = useRef<DragSelectionCleanup>(null);
    const regionsHandlersInitializedRef = useRef(false);
    const silentRemoveIdsRef = useRef<Set<string>>(new Set());
    const wiredRegionIdsRef = useRef<Set<string>>(new Set());

    const regionPlaybackStartRef = useRef<number | null>(null);
    const regionPlaybackEndRef = useRef<number | null>(null);

    const activeControlRef = useRef(activeControl);
    const regionsRef = useRef(regions);
    const activeRegionIdRef = useRef(activeRegionId);
    const activeLabelIdRef = useRef(activeLabelId);
    const labelsRef = useRef(labels);
    const loopRef = useRef(loop);
    const onSetRegionsRef = useRef(onSetRegions);
    const onSetActiveRegionRef = useRef(onSetActiveRegion);
    const onSetHoveredRegionRef = useRef(onSetHoveredRegion);
    const onUpdateActiveControlRef = useRef(onUpdateActiveControl);

    useEffect(() => { activeControlRef.current = activeControl; }, [activeControl]);
    useEffect(() => { regionsRef.current = regions; }, [regions]);
    useEffect(() => { activeRegionIdRef.current = activeRegionId; }, [activeRegionId]);
    useEffect(() => { activeLabelIdRef.current = activeLabelId; }, [activeLabelId]);
    useEffect(() => { labelsRef.current = labels; }, [labels]);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    useEffect(() => { onSetRegionsRef.current = onSetRegions; }, [onSetRegions]);
    useEffect(() => { onSetActiveRegionRef.current = onSetActiveRegion; }, [onSetActiveRegion]);
    useEffect(() => { onSetHoveredRegionRef.current = onSetHoveredRegion; }, [onSetHoveredRegion]);
    useEffect(() => { onUpdateActiveControlRef.current = onUpdateActiveControl; }, [onUpdateActiveControl]);

    const wireRegionHoverEvents = useCallback((region: Region): void => {
        if (wiredRegionIdsRef.current.has(region.id)) return;
        wiredRegionIdsRef.current.add(region.id);
        region.on('over', () => onSetHoveredRegionRef.current(region.id));
        region.on('leave', () => {
            if (onSetHoveredRegionRef.current) onSetHoveredRegionRef.current(null);
        });
    }, []);

    const registerRegionHandlers = useCallback((plugin: RegionsPlugin): void => {
        if (regionsHandlersInitializedRef.current) return;

        plugin.on('region-created', (region: Region) => {
            wireRegionHoverEvents(region);
            const prev = regionsRef.current;
            const exists = prev.find((r) => r.id === region.id);

            if (exists) {
                onSetRegionsRef.current(prev.map((r) => (r.id === region.id ? {
                    ...r,
                    start: region.start,
                    end: region.end,
                } : r)));
            } else {
                const base = createAudioRegion(region, labelsRef.current, activeLabelIdRef.current, prev);
                onSetRegionsRef.current([...prev, base]);
            }

            onSetActiveRegionRef.current(region.id);
            onUpdateActiveControlRef.current(ActiveControl.CURSOR);
        });

        plugin.on('region-updated', (region: Region) => {
            onSetRegionsRef.current(
                regionsRef.current.map((r) => (
                    r.id === region.id ? { ...r, start: region.start, end: region.end } : r
                )),
            );
        });

        plugin.on('region-removed', (region: Region) => {
            wiredRegionIdsRef.current.delete(region.id);
            if (silentRemoveIdsRef.current.delete(region.id)) return;
            if (!regionsRef.current.find((r) => r.id === region.id)) return;

            onSetRegionsRef.current(regionsRef.current.filter((r) => r.id !== region.id));
            if (activeRegionIdRef.current === region.id) {
                onSetActiveRegionRef.current(null);
            }
        });

        plugin.on('region-clicked', (region: Region, e?: MouseEvent) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }

            regionPlaybackStartRef.current = null;
            regionPlaybackEndRef.current = null;

            if (activeControlRef.current === ActiveControl.CURSOR) {
                if (e && e.ctrlKey) {
                    const clickTime = (region.start + region.end) / 2;
                    const overlapping = regionsRef.current
                        .filter((r) => (
                            !r.hidden && r.start <= clickTime && r.end >= clickTime
                        ))
                        .sort((a, b) => a.zOrder - b.zOrder);

                    if (overlapping.length > 1) {
                        const currentIdx = overlapping.findIndex(
                            (r) => r.id === activeRegionIdRef.current,
                        );
                        const nextIdx = (currentIdx + 1) % overlapping.length;
                        onSetActiveRegionRef.current(overlapping[nextIdx].id);
                    } else {
                        onSetActiveRegionRef.current(region.id);
                    }
                } else {
                    onSetActiveRegionRef.current(region.id);
                }
            }

            if (e && e.detail >= 2) {
                const safeStart = Math.max(0, region.start || 0);
                onSetCurrentTime(safeStart);
                onSwitchPlay(true);
                regionPlaybackStartRef.current = safeStart;
                regionPlaybackEndRef.current = region.end ?? null;
            }
        });

        regionsHandlersInitializedRef.current = true;
    }, [wireRegionHoverEvents, onSetCurrentTime, onSwitchPlay]);

    const handleReady = useCallback((ws: WaveSurfer): void => {
        onSetDuration(ws.getDuration());
        onWaveformReady(true);
        onWavesurferReady(ws);

        injectScrollbarStyle(ws.getWrapper());

        const plugin = regionsPluginRef.current;
        if (plugin) {
            applyAudioControlMode(activeControl, plugin, dragSelectionCleanupRef, regionsRef.current);
            registerRegionHandlers(plugin);
        }
    }, [activeControl, onSetDuration, onWaveformReady, onWavesurferReady, regionsPluginRef, registerRegionHandlers]);

    const handleFinish = useCallback((): void => {
        onSwitchPlay(false);
        onSetCurrentTime(0);
    }, [onSwitchPlay, onSetCurrentTime]);

    const handleTimeupdate = useCallback((ws: WaveSurfer): void => {
        const time = ws.getCurrentTime();
        lastWsTimeRef.current = time;
        onSetCurrentTime(time);
        if (regionPlaybackEndRef.current !== null && time >= regionPlaybackEndRef.current) {
            if (loopRef.current && regionPlaybackStartRef.current !== null) {
                ws.setTime(regionPlaybackStartRef.current);
            } else {
                ws.pause();
                onSwitchPlay(false);
                regionPlaybackEndRef.current = null;
                regionPlaybackStartRef.current = null;
            }
        }
    }, [lastWsTimeRef, onSetCurrentTime, onSwitchPlay]);

    useEffect(() => {
        applyAudioControlMode(activeControl, regionsPluginRef.current, dragSelectionCleanupRef, regions);
    }, [activeControl, regions, regionsPluginRef]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin) return;

        const wsRegions = plugin.getRegions();
        const reduxById = new Map(regions.map((r) => [r.id, r]));

        wsRegions.forEach((wsRegion: Region) => {
            const reduxRegion = reduxById.get(wsRegion.id);
            if (reduxRegion?.hidden) {
                silentRemoveIdsRef.current.add(wsRegion.id);
                wsRegion.remove();
                return;
            }
            const isActive = wsRegion.id === activeRegionId;
            const color = reduxRegion ?
                getAudioRegionColor(reduxRegion, labels, colorBy, opacity, selectedOpacity, isActive) :
                getAudioRegionColor(
                    {
                        id: wsRegion.id, start: 0, end: 0, labelId: null, attributes: {}, zOrder: 0,
                    },
                    labels,
                    colorBy,
                    opacity,
                    selectedOpacity,
                    isActive,
                );
            const isLocked = reduxRegion?.locked;
            const isEdit = activeControl === ActiveControl.AUDIO_REGION_EDIT;
            wsRegion.setOptions({
                color,
                drag: isEdit && !isLocked,
                resize: isEdit && !isLocked,
            });
            if (wsRegion.element) {
                const baseZ = reduxRegion?.zOrder ?? 0;
                const isHovered = wsRegion.id === hoveredRegionId;
                wsRegion.element.style.zIndex = isActive || isHovered ?
                    String(baseZ + ACTIVE_Z_OFFSET) : String(baseZ);

                const borderColor = reduxRegion ?
                    getRegionItemColor(reduxRegion, labels, colorBy) : ACTIVE_BORDER_FALLBACK;

                wsRegion.element.style.border = isActive || isHovered ?
                    `2px solid ${borderColor}` : '';
            }
        });
    }, [
        activeRegionId, hoveredRegionId, regions, colorBy, opacity, selectedOpacity,
        labels, activeControl, regionsPluginRef,
    ]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !wavesurfer) return;

        const wsRegions = plugin.getRegions();

        regions.forEach((region) => {
            if (region.hidden) return;
            const wsRegion = wsRegions.find((r: Region) => r.id === region.id);
            if (!wsRegion) {
                const isEdit = activeControl === ActiveControl.AUDIO_REGION_EDIT;
                const isActive = region.id === activeRegionId;
                const isLocked = region.locked;
                const added = plugin.addRegion({
                    id: region.id,
                    start: region.start,
                    end: region.end,
                    color: getAudioRegionColor(region, labels, colorBy, opacity, selectedOpacity, isActive),
                    drag: isEdit && !isLocked,
                    resize: isEdit && !isLocked,
                });
                wireRegionHoverEvents(added);
            } else if (wsRegion.start !== region.start || wsRegion.end !== region.end) {
                wsRegion.setOptions({ start: region.start, end: region.end });
            }
        });

        const reduxIds = new Set(regions.filter((r) => !r.hidden).map((r) => r.id));
        wsRegions.forEach((wsRegion: Region) => {
            if (!reduxIds.has(wsRegion.id)) {
                silentRemoveIdsRef.current.add(wsRegion.id);
                wsRegion.remove();
            }
        });
    }, [
        regions, wavesurfer, activeControl, colorBy, opacity, selectedOpacity,
        labels, activeRegionId, wireRegionHoverEvents, regionsPluginRef,
    ]);

    return { handleReady, handleFinish, handleTimeupdate };
}
