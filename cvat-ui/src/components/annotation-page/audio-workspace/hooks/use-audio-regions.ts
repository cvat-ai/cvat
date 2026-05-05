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
import { getPlayOnceRegionId, setPlayOnceRegionId } from '../utils/play-once-region';
import { attachRegionAutoScroll } from '../utils/region-auto-scroll';

const ACTIVE_BORDER_FALLBACK = '#6366F1';
const ACTIVE_Z_OFFSET = 10000;

// Wavesurfer's drag handler clamps the new start/end independently, so a drag past
// an edge shrinks the region instead of stopping it. Re-clamp the delta itself when
// no side is given (i.e. whole-region drag) so length is preserved at the boundary.
function clampRegionDragToBounds(region: Region): void {
    /* eslint-disable @typescript-eslint/no-explicit-any, no-underscore-dangle */
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
    /* eslint-enable @typescript-eslint/no-explicit-any, no-underscore-dangle */
}

interface Params {
    regionsPluginRef: React.MutableRefObject<RegionsPlugin | null>;
    wavesurfer: WaveSurfer | null;
    lastWsTimeRef: React.MutableRefObject<number>;
    activeControl: ActiveControl;
    regions: AudioRegion[];
    visibleRegionIds: Set<string>;
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
        activeControl, regions, visibleRegionIds, activeRegionId, hoveredRegionId,
        labels, activeLabelId, colorBy, opacity, selectedOpacity, loop,
        onSwitchPlay, onSetCurrentTime, onSetDuration,
        onSetRegions, onSetActiveRegion, onSetHoveredRegion,
        onUpdateActiveControl, onWaveformReady, onWavesurferReady,
    } = params;

    const dragSelectionCleanupRef = useRef<DragSelectionCleanup>(null);
    const regionsHandlersInitializedRef = useRef(false);
    const silentRemoveIdsRef = useRef<Set<string>>(new Set());
    const wiredRegionIdsRef = useRef<Set<string>>(new Set());

    const activeControlRef = useRef(activeControl);
    const regionsRef = useRef(regions);
    const activeRegionIdRef = useRef(activeRegionId);
    const activeLabelIdRef = useRef(activeLabelId);
    const labelsRef = useRef(labels);
    const loopRef = useRef(loop);
    const wavesurferRef = useRef<WaveSurfer | null>(wavesurfer);
    const onSetRegionsRef = useRef(onSetRegions);
    const onSetActiveRegionRef = useRef(onSetActiveRegion);
    const onSetHoveredRegionRef = useRef(onSetHoveredRegion);
    const onUpdateActiveControlRef = useRef(onUpdateActiveControl);

    useEffect(() => { activeControlRef.current = activeControl; }, [activeControl]);
    useEffect(() => { regionsRef.current = regions; }, [regions]);
    useEffect(() => {
        if (getPlayOnceRegionId() && getPlayOnceRegionId() !== activeRegionId) {
            setPlayOnceRegionId(null);
        }
        activeRegionIdRef.current = activeRegionId;
    }, [activeRegionId]);
    useEffect(() => { activeLabelIdRef.current = activeLabelId; }, [activeLabelId]);
    useEffect(() => { labelsRef.current = labels; }, [labels]);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    useEffect(() => { wavesurferRef.current = wavesurfer; }, [wavesurfer]);
    useEffect(() => { onSetRegionsRef.current = onSetRegions; }, [onSetRegions]);
    useEffect(() => { onSetActiveRegionRef.current = onSetActiveRegion; }, [onSetActiveRegion]);
    useEffect(() => { onSetHoveredRegionRef.current = onSetHoveredRegion; }, [onSetHoveredRegion]);
    useEffect(() => { onUpdateActiveControlRef.current = onUpdateActiveControl; }, [onUpdateActiveControl]);

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

    const centerViewportOnRegion = useCallback((regionId: string): void => {
        const ws = wavesurferRef.current;
        if (!ws) return;
        const region = regionsRef.current.find((r) => r.id === regionId);
        if (!region) return;
        const duration = ws.getDuration();
        if (!duration) return;
        const scrollContainer = ws.getWrapper()?.parentElement;
        if (!scrollContainer) return;
        const totalWidth = scrollContainer.scrollWidth;
        const visibleWidth = ws.getWidth();
        if (totalWidth <= visibleWidth) return;

        const startPx = (region.start / duration) * totalWidth;
        const endPx = (region.end / duration) * totalWidth;
        const midPx = (startPx + endPx) / 2;
        const targetScroll = Math.max(
            0,
            Math.min(totalWidth - visibleWidth, midPx - visibleWidth / 2),
        );
        ws.setScroll(targetScroll);
    }, []);

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
            clampRegionDragToBounds(region);
            const prev = regionsRef.current;
            const exists = prev.find((r) => r.id === region.id);

            if (exists) {
                // Programmatic re-sync of an already-known region (e.g. after load).
                // Skip the dispatch when start/end are unchanged so we don't flip
                // hasUnsavedChanges or steal the active region selection.
                if (exists.start === region.start && exists.end === region.end) {
                    return;
                }
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

            const isCursor = activeControlRef.current === ActiveControl.CURSOR;
            const isDoubleClick = !!(e && e.detail >= 2);
            const isCtrlClick = !!(e && (e.ctrlKey || e.metaKey));
            const clickTime = e ? computeClickTime(e) : null;

            if (isCursor) {
                let pickedId = region.id;
                if (clickTime !== null) {
                    const overlapping = regionsRef.current.filter((r) => (
                        !r.hidden && r.start <= clickTime && r.end >= clickTime
                    ));
                    if (overlapping.length > 1) {
                        const distance = (r: { start: number; end: number }): number => (
                            Math.min(Math.abs(clickTime - r.start), Math.abs(clickTime - r.end))
                        );
                        pickedId = overlapping.reduce((best, r) => (
                            distance(r) < distance(best) ? r : best
                        )).id;
                    }
                }
                onSetActiveRegionRef.current(pickedId);
            }

            if (isDoubleClick) {
                const safeStart = Math.max(0, region.start || 0);
                setPlayOnceRegionId(region.id);
                onSetCurrentTime(safeStart);
                const ws = wavesurferRef.current;
                if (ws) ws.setTime(safeStart);
                onSwitchPlay(true);
                centerViewportOnRegion(region.id);
                return;
            }

            // Ctrl/Cmd + click moves the playback head; bare single click
            // only changes selection. Mirrors the image editor convention.
            if (isCtrlClick && isCursor && clickTime !== null) {
                onSetCurrentTime(clickTime);
                const ws = wavesurferRef.current;
                if (ws) ws.setTime(clickTime);
            }
        });

        regionsHandlersInitializedRef.current = true;
    }, [wireRegionHoverEvents, onSetCurrentTime, onSwitchPlay, computeClickTime, centerViewportOnRegion]);

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
        if (loopRef.current && activeRegionIdRef.current && wavesurfer) {
            const activeRegion = regionsRef.current.find((r) => r.id === activeRegionIdRef.current);
            if (activeRegion) {
                wavesurfer.setTime(Math.max(0, activeRegion.start));
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

        const activeId = activeRegionIdRef.current;
        if (!activeId) return;
        const activeRegion = regionsRef.current.find((r) => r.id === activeId);
        if (!activeRegion) return;
        if (time < activeRegion.end) return;

        if (loopRef.current) {
            ws.setTime(Math.max(0, activeRegion.start));
            return;
        }

        if (getPlayOnceRegionId() === activeId) {
            ws.pause();
            onSwitchPlay(false);
            setPlayOnceRegionId(null);
        }
    }, [lastWsTimeRef, onSetCurrentTime, onSwitchPlay]);

    useEffect(() => {
        applyAudioControlMode(activeControl, regionsPluginRef.current, dragSelectionCleanupRef, regions);
    }, [activeControl, regions, regionsPluginRef]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !wavesurfer) return undefined;
        return attachRegionAutoScroll(plugin, () => wavesurferRef.current);
    }, [wavesurfer, regionsPluginRef]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin) return;

        const wsRegions = plugin.getRegions();
        const reduxById = new Map(regions.map((r) => [r.id, r]));

        wsRegions.forEach((wsRegion: Region) => {
            const reduxRegion = reduxById.get(wsRegion.id);
            if (reduxRegion?.hidden || (reduxRegion && !visibleRegionIds.has(reduxRegion.id))) {
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
        activeRegionId, hoveredRegionId, regions, visibleRegionIds, colorBy, opacity, selectedOpacity,
        labels, activeControl, regionsPluginRef,
    ]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !wavesurfer) return;

        const wsRegions = plugin.getRegions();

        regions.forEach((region) => {
            if (region.hidden || !visibleRegionIds.has(region.id)) return;
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

        const reduxIds = new Set(
            regions.filter((r) => !r.hidden && visibleRegionIds.has(r.id)).map((r) => r.id),
        );
        wsRegions.forEach((wsRegion: Region) => {
            if (!reduxIds.has(wsRegion.id)) {
                silentRemoveIdsRef.current.add(wsRegion.id);
                wsRegion.remove();
            }
        });
    }, [
        regions, visibleRegionIds, wavesurfer, activeControl, colorBy, opacity, selectedOpacity,
        labels, activeRegionId, wireRegionHoverEvents, regionsPluginRef,
    ]);

    return { handleReady, handleFinish, handleTimeupdate };
}
