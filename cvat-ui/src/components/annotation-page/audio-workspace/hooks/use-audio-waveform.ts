import { useEffect, useMemo, useRef } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type { GenericPlugin } from 'wavesurfer.js/dist/base-plugin';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import Minimap from 'wavesurfer.js/dist/plugins/minimap';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';

type MinimapInstance = InstanceType<typeof Minimap>;

interface UseAudioWaveformResult {
    plugins: GenericPlugin[];
    regionsPluginRef: React.MutableRefObject<RegionsPlugin | null>;
    minimapPluginRef: React.MutableRefObject<MinimapInstance | null>;
}

export function useAudioWaveform(
    wavesurfer: WaveSurfer | null,
    zoom: number,
): UseAudioWaveformResult {
    const regionsPluginRef = useRef<RegionsPlugin | null>(null);
    const minimapPluginRef = useRef<MinimapInstance | null>(null);

    const plugins = useMemo(
        () => [
            TimelinePlugin.create({
                container: wavesurfer?.getWrapper(),
            }),
            (() => {
                const minimap = Minimap.create({
                    container: '#minimap',
                    waveColor: '#9CA3AF',
                    progressColor: '#3e3a3a',
                    cursorColor: '#ff0000',
                    cursorWidth: 2,
                    height: 50,
                    overlayColor: 'rgba(0, 85, 255, 0.3)',
                });
                minimapPluginRef.current = minimap;
                return minimap;
            })(),
            HoverPlugin.create({
                lineColor: '#C084FC',
                lineWidth: 1,
                labelColor: '#4B5563',
                labelBackground: '#ffffff',
            }),
            (() => {
                const plugin = RegionsPlugin.create();
                regionsPluginRef.current = plugin;
                return plugin;
            })(),
        ],
        [],
    );

    useEffect(() => {
        const minimap = minimapPluginRef.current;
        const overlay = (minimap as unknown as { overlay?: HTMLElement } | null)?.overlay;
        if (!overlay) return;
        overlay.style.opacity = zoom > 1 ? '1' : '0';
    }, [zoom]);

    return { plugins, regionsPluginRef, minimapPluginRef };
}
