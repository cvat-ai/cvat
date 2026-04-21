import type { Region } from 'wavesurfer.js/dist/plugins/regions';
import { AudioRegion } from 'reducers';
import { Attribute, Label } from 'cvat-core-wrapper';

const DEFAULT_REGION_COLOR = '#9CA3AF';

export function createAudioRegion(
    wsRegion: Region,
    labels: Label[],
    activeLabelId: number | null,
    existingRegions: AudioRegion[],
): AudioRegion {
    const currentLabel = activeLabelId != null ?
        labels.find((l) => l.id === activeLabelId) : null;

    const defaultAttrs: Record<number, string> = {};
    if (currentLabel) {
        currentLabel.attributes.forEach((attr: Attribute) => {
            defaultAttrs[attr.id!] = attr.defaultValue;
        });
    }

    const maxZ = existingRegions.length > 0 ?
        Math.max(...existingRegions.map((r) => r.zOrder)) : 0;

    return {
        id: wsRegion.id,
        start: wsRegion.start,
        end: wsRegion.end,
        labelId: activeLabelId,
        attributes: defaultAttrs,
        source: 'manual',
        color: currentLabel?.color || DEFAULT_REGION_COLOR,
        zOrder: maxZ + 1,
    };
}
