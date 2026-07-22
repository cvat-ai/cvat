// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useRef } from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { clientIDFromWaveRegionId } from '../utils/audio-interval';

type RegionContextMenuCleanup = () => void;

interface UseRegionContextMenuResult {
    attachRegionContextMenu(region: Region): void;
    cleanupRegionContextMenu(regionID: string): void;
}

export function useRegionContextMenu(
    onContextMenuOpen: (clientID: number | null, event: MouseEvent, region: Region) => void,
): UseRegionContextMenuResult {
    const cleanupsRef = useRef(new Map<string, RegionContextMenuCleanup>());
    const onContextMenuOpenRef = useRef(onContextMenuOpen);
    onContextMenuOpenRef.current = onContextMenuOpen;

    // Perform cleanup of all context menu event listeners on unmount
    useEffect(() => () => {
        Array.from(cleanupsRef.current.values()).forEach((cleanup) => cleanup());
    }, []);

    const attachRegionContextMenu = useCallback((region: Region): void => {
        const { element } = region;
        if (!element || cleanupsRef.current.has(region.id)) return;

        const onRegionContextMenuOpen = (event: MouseEvent): void => {
            event.preventDefault();
            event.stopPropagation();
            onContextMenuOpenRef.current(clientIDFromWaveRegionId(region.id), event, region);
        };

        element.addEventListener('contextmenu', onRegionContextMenuOpen);
        cleanupsRef.current.set(region.id, () => {
            element.removeEventListener('contextmenu', onRegionContextMenuOpen);
            cleanupsRef.current.delete(region.id);
        });
    }, []);

    const cleanupRegionContextMenu = useCallback((regionID: string): void => {
        cleanupsRef.current.get(regionID)?.();
    }, []);

    return { attachRegionContextMenu, cleanupRegionContextMenu };
}
