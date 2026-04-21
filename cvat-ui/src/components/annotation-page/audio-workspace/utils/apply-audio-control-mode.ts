import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';
import { ActiveControl, AudioRegion } from 'reducers';

export type DragSelectionCleanup = (() => void) | null;

export function applyAudioControlMode(
    control: ActiveControl,
    plugin: RegionsPlugin | null,
    dragSelectionCleanupRef: React.MutableRefObject<DragSelectionCleanup>,
    reduxRegions: AudioRegion[],
): void {
    if (!plugin) return;

    const isCreate = control === ActiveControl.AUDIO_REGION_CREATE;
    const isEdit = control === ActiveControl.AUDIO_REGION_EDIT;

    if (isCreate && !dragSelectionCleanupRef.current) {
        dragSelectionCleanupRef.current = plugin.enableDragSelection({});
    } else if (!isCreate && dragSelectionCleanupRef.current) {
        dragSelectionCleanupRef.current();
        dragSelectionCleanupRef.current = null;
    }

    plugin.getRegions().forEach((region: Region) => {
        const reduxRegion = reduxRegions.find((r) => r.id === region.id);
        const isLocked = reduxRegion?.locked;
        const canDrag = isEdit && !isLocked;
        region.setOptions({ drag: canDrag, resize: canDrag });
        if (region.element) {
            region.element.style.pointerEvents = isCreate ? 'none' : 'all';
        }
    });
}
