// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region, UpdateSide } from 'wavesurfer.js/dist/plugins/regions';

const FOLLOW_MARGIN_PX = 0;

type Side = UpdateSide | undefined;

export function attachRegionAutoScroll(
    plugin: RegionsPlugin,
    getWavesurfer: () => WaveSurfer | null,
): () => void {
    let activeRegion: Region | null = null;
    let activeSide: Side;
    let lockRequested = false;

    const getScrollContainer = (): HTMLElement | null => {
        const ws = getWavesurfer();
        return ws?.getWrapper()?.parentElement ?? null;
    };

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

    const followRegion = (
        region: Region,
        sc: HTMLElement,
        direction: number,
        side: Side,
    ): void => {
        const ws = getWavesurfer();
        const total = ws?.getDuration() ?? 0;
        if (!total) return;
        const { scrollWidth, clientWidth: viewportWidth } = sc;
        if (scrollWidth <= viewportWidth) return;
        const maxScroll = scrollWidth - viewportWidth;

        const startScreen = (region.start / total) * scrollWidth - sc.scrollLeft;
        const endScreen = (region.end / total) * scrollWidth - sc.scrollLeft;

        let scrollDelta = 0;
        if (direction > 0 && side !== 'start') {
            const overshoot = endScreen + FOLLOW_MARGIN_PX - viewportWidth;
            if (overshoot > 0) scrollDelta = overshoot;
        } else if (direction < 0 && side !== 'end') {
            const undershoot = startScreen - FOLLOW_MARGIN_PX;
            if (undershoot < 0) scrollDelta = undershoot;
        }
        if (scrollDelta === 0) return;
        sc.scrollTo({ left: Math.max(0, Math.min(maxScroll, sc.scrollLeft + scrollDelta)) });
    };

    const onPointerMoveCapture = (e: PointerEvent): void => {
        if (!activeRegion || !isLocked()) return;
        const sc = getScrollContainer();
        if (!sc) return;
        // eslint-disable-next-line no-underscore-dangle
        activeRegion._onUpdate(e.movementX, activeSide, undefined);
        followRegion(activeRegion, sc, e.movementX, activeSide);
        e.stopImmediatePropagation();
    };

    const requestLock = (): void => {
        if (lockRequested) return;
        lockRequested = true;
        const sc = getScrollContainer();
        const target: Element = sc ?? document.body;
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
