import { useCallback, useEffect, useRef } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { ActiveControl, AudioRegion, ColorBy } from 'reducers';
import { Attribute, Label } from 'cvat-core-wrapper';

import { getAudioRegionColor } from '../audio-region-colors';
import { pickInstanceColor } from '../utils/create-audio-region';

const MIN_RECORDING_DURATION = 0.05;

function generatePhantomId(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `audio-recording-${Date.now()}-${rand}`;
}

interface Params {
    regionsPluginRef: React.MutableRefObject<RegionsPlugin | null>;
    wavesurfer: WaveSurfer | null;
    activeControl: ActiveControl;
    isPlaying: boolean;
    regions: AudioRegion[];
    labels: Label[];
    activeLabelId: number | null;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    phantomRegionIdsRef: React.MutableRefObject<Set<string>>;
    onSetRegions(regions: AudioRegion[]): void;
    onSetActiveRegion(regionId: string | null): void;
    onUpdateActiveControl(activeControl: ActiveControl): void;
}

export function useAudioRecording(params: Params): void {
    const {
        regionsPluginRef, wavesurfer, activeControl, isPlaying,
        regions, labels, activeLabelId, colorBy, opacity, selectedOpacity,
        phantomRegionIdsRef,
        onSetRegions, onSetActiveRegion, onUpdateActiveControl,
    } = params;

    const recordingIdRef = useRef<string | null>(null);
    const recordingStartRef = useRef<number>(0);
    const recordingLabelIdRef = useRef<number | null>(null);
    const cancelledRef = useRef<boolean>(false);

    const regionsRef = useRef(regions);
    const labelsRef = useRef(labels);
    const activeLabelIdRef = useRef(activeLabelId);
    const colorByRef = useRef(colorBy);
    const opacityRef = useRef(opacity);
    const selectedOpacityRef = useRef(selectedOpacity);
    const onSetRegionsRef = useRef(onSetRegions);
    const onSetActiveRegionRef = useRef(onSetActiveRegion);
    const onUpdateActiveControlRef = useRef(onUpdateActiveControl);

    useEffect(() => { regionsRef.current = regions; }, [regions]);
    useEffect(() => { labelsRef.current = labels; }, [labels]);
    useEffect(() => { activeLabelIdRef.current = activeLabelId; }, [activeLabelId]);
    useEffect(() => { colorByRef.current = colorBy; }, [colorBy]);
    useEffect(() => { opacityRef.current = opacity; }, [opacity]);
    useEffect(() => { selectedOpacityRef.current = selectedOpacity; }, [selectedOpacity]);
    useEffect(() => { onSetRegionsRef.current = onSetRegions; }, [onSetRegions]);
    useEffect(() => { onSetActiveRegionRef.current = onSetActiveRegion; }, [onSetActiveRegion]);
    useEffect(() => { onUpdateActiveControlRef.current = onUpdateActiveControl; }, [onUpdateActiveControl]);

    const finalizeRecording = useCallback((): void => {
        const id = recordingIdRef.current;
        if (id === null) return;

        const plugin = regionsPluginRef.current;
        const ws = wavesurfer;

        let endTime = recordingStartRef.current;
        if (ws) endTime = ws.getCurrentTime();

        const start = recordingStartRef.current;
        const end = Math.max(start, endTime);
        const labelId = recordingLabelIdRef.current;

        recordingIdRef.current = null;
        recordingStartRef.current = 0;
        recordingLabelIdRef.current = null;

        if (plugin) {
            const wsRegion = plugin.getRegions().find((r: Region) => r.id === id);
            if (wsRegion) wsRegion.remove();
            phantomRegionIdsRef.current.delete(id);
        }

        if (cancelledRef.current) {
            cancelledRef.current = false;
            return;
        }

        if (end - start < MIN_RECORDING_DURATION) return;

        const currentRegions = regionsRef.current;
        const currentLabels = labelsRef.current;
        const label = labelId != null ? currentLabels.find((l) => l.id === labelId) : null;
        const defaultAttrs: Record<number, string> = {};
        if (label) {
            label.attributes.forEach((attr: Attribute) => {
                if (attr.id !== undefined) defaultAttrs[attr.id] = attr.defaultValue;
            });
        }
        const maxZ = currentRegions.length > 0 ?
            Math.max(...currentRegions.map((r) => r.zOrder)) : 0;
        const newRegion: AudioRegion = {
            id: `audio-region-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            start,
            end,
            labelId,
            attributes: defaultAttrs,
            source: 'manual',
            color: pickInstanceColor(currentRegions),
            zOrder: maxZ + 1,
        };
        onSetRegionsRef.current([...currentRegions, newRegion]);
        onSetActiveRegionRef.current(newRegion.id);
    }, [wavesurfer, regionsPluginRef, phantomRegionIdsRef]);

    useEffect(() => {
        const plugin = regionsPluginRef.current;
        const ws = wavesurfer;
        if (!plugin || !ws) return;

        const isRecord = activeControl === ActiveControl.AUDIO_REGION_RECORD;
        const wasRecording = recordingIdRef.current !== null;

        if (isRecord && !wasRecording) {
            cancelledRef.current = false;
            const start = ws.getCurrentTime();
            const phantomId = generatePhantomId();
            phantomRegionIdsRef.current.add(phantomId);
            recordingIdRef.current = phantomId;
            recordingStartRef.current = start;
            recordingLabelIdRef.current = activeLabelIdRef.current;

            const colorRegion: AudioRegion = {
                id: phantomId,
                start,
                end: start,
                labelId: activeLabelIdRef.current,
                attributes: {},
                zOrder: 0,
            };
            const color = getAudioRegionColor(
                colorRegion,
                labelsRef.current,
                colorByRef.current,
                opacityRef.current,
                selectedOpacityRef.current,
                true,
            );
            const duration = ws.getDuration() || 0;
            const initialEnd = duration > 0 ? Math.min(start + 0.001, duration) : start + 0.001;

            plugin.addRegion({
                id: phantomId,
                start,
                end: initialEnd,
                color,
                drag: false,
                resize: false,
            });
        } else if (!isRecord && wasRecording) {
            finalizeRecording();
        }
    }, [activeControl, wavesurfer, regionsPluginRef, phantomRegionIdsRef, finalizeRecording]);

    useEffect(() => {
        if (!isPlaying && recordingIdRef.current !== null) {
            onUpdateActiveControlRef.current(ActiveControl.CURSOR);
        }
    }, [isPlaying]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            if (recordingIdRef.current === null) return;
            cancelledRef.current = true;
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, []);

    useEffect(() => {
        if (!wavesurfer) return undefined;
        const onTimeupdate = (): void => {
            const id = recordingIdRef.current;
            if (!id) return;
            const plugin = regionsPluginRef.current;
            if (!plugin) return;
            const wsRegion = plugin.getRegions().find((r: Region) => r.id === id);
            if (!wsRegion) return;
            const time = wavesurfer.getCurrentTime();
            const start = recordingStartRef.current;
            if (time <= start) return;
            if (Math.abs(time - wsRegion.end) < 0.001) return;
            wsRegion.setOptions({ start, end: time });
        };
        wavesurfer.on('timeupdate', onTimeupdate);
        return () => {
            wavesurfer.un('timeupdate', onTimeupdate);
        };
    }, [wavesurfer, regionsPluginRef]);
}
