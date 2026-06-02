import { AudioRegion, ColorBy } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { hexToRgba } from 'utils/hex-color';

const DEFAULT_COLOR = '#6366F1';
const AUDIO_MIN_OPACITY = 20;

function resolveAudioHex(
    region: AudioRegion,
    labels: Label[],
    colorBy: ColorBy,
): string {
    if (colorBy === ColorBy.INSTANCE) {
        return region.color || DEFAULT_COLOR;
    }
    const label = labels.find((l) => l.id === region.labelId);
    return (label?.color as string) || DEFAULT_COLOR;
}

export function getAudioRegionColor(
    region: AudioRegion,
    labels: Label[],
    colorBy: ColorBy,
    opacity: number,
    selectedOpacity: number,
    isActive: boolean,
): string {
    const hex = resolveAudioHex(region, labels, colorBy);
    const alpha = Math.max(isActive ? selectedOpacity : opacity, AUDIO_MIN_OPACITY);
    return hexToRgba(hex, alpha);
}

export function getRegionItemColor(
    region: AudioRegion,
    labels: Label[],
    colorBy: ColorBy,
): string {
    return resolveAudioHex(region, labels, colorBy);
}
