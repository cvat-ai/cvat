// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

type Side = UpdateSide | undefined;

export function attachRegionAutoScroll(
    plugin: RegionsPlugin,
    ensureTimeVisible: (time: number) => void,
): () => void {
    let activeRegion: Region | null = null;
    let activeSide: Side;
    let lockRequested = false;

    const isLocked = (): boolean => document.pointerLockElement !== null;

    const releaseLock = (): void => {
        if (isLocked()) {
            try { document.exitPointerLock(); } catch { /* ignore */ }
        }
    };

    const stopLoop = (): void => {
        activeRegion = null;
        activeSide = undefined;
        lockRequested = false;
        releaseLock();
    };

    const onPointerMoveCapture = (e: PointerEvent): void => {
        if (!activeRegion || !isLocked()) return;
        // eslint-disable-next-line no-underscore-dangle
        activeRegion._onUpdate(e.movementX, activeSide, undefined);
        const boundary = e.movementX < 0 && activeSide !== 'end' ? activeRegion.start : activeRegion.end;
        ensureTimeVisible(boundary);
        e.stopImmediatePropagation();
    };

    const requestLock = (): void => {
        if (lockRequested) return;
        lockRequested = true;
        const target: Element = activeRegion?.element?.parentElement ?? document.body;
        try {
            (target as HTMLElement).requestPointerLock?.();
        } catch { /* ignore — fall back to no-lock mode */ }
    };

    const onRegionUpdate = (region: Region, side?: UpdateSide): void => {
        const startingNew = activeRegion !== region;
        activeRegion = region;
        activeSide = side;
        if (startingNew) requestLock();
    };

    const onRegionUpdated = (): void => stopLoop();
    const onRegionRemoved = (region: Region): void => {
        if (activeRegion?.id === region.id) stopLoop();
    };
    const onPointerUp = (): void => stopLoop();
    const onPointerCancel = (): void => stopLoop();
    const onPointerLockChange = (): void => {
        if (!isLocked() && activeRegion) stopLoop();
    };

    plugin.on('region-update', onRegionUpdate);
    plugin.on('region-updated', onRegionUpdated);
    plugin.on('region-removed', onRegionRemoved);
    document.addEventListener('pointermove', onPointerMoveCapture, { capture: true });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const pluginAny = plugin as any;
    const originalAdjustScroll = pluginAny.adjustScroll?.bind(plugin);
    pluginAny.adjustScroll = () => undefined;

    return () => {
        plugin.un('region-update', onRegionUpdate);
        plugin.un('region-updated', onRegionUpdated);
        plugin.un('region-removed', onRegionRemoved);
        document.removeEventListener('pointermove', onPointerMoveCapture, { capture: true });
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        if (originalAdjustScroll) {
            (plugin as any).adjustScroll = originalAdjustScroll;
        }
        releaseLock();
    };
}
