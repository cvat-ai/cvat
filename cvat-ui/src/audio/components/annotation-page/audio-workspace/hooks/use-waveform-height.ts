// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useRef, useState,
} from 'react';

import { MINIMAP_HEIGHT } from 'audio/utils/waveform-geometry';
import { clamp } from 'utils/math';

const WAVEFORM_PANEL_HEIGHT_STORAGE_KEY = 'audioWaveformPanelHeight';
const DEFAULT_WAVEFORM_PANEL_HEIGHT = 140 + MINIMAP_HEIGHT;
const MIN_WAVEFORM_PANEL_HEIGHT = 80 + MINIMAP_HEIGHT;
const MAX_WAVEFORM_PANEL_HEIGHT = 320 + MINIMAP_HEIGHT;

interface ResizeStart {
    pointerId: number;
    pointerY: number;
    height: number;
}

function getStoredWaveformPanelHeight(): number {
    const storedHeight = localStorage.getItem(WAVEFORM_PANEL_HEIGHT_STORAGE_KEY);
    if (storedHeight === null) {
        return DEFAULT_WAVEFORM_PANEL_HEIGHT;
    }

    const parsedHeight = Number(storedHeight);
    if (!Number.isFinite(parsedHeight) ||
        parsedHeight < MIN_WAVEFORM_PANEL_HEIGHT || parsedHeight > MAX_WAVEFORM_PANEL_HEIGHT) {
        localStorage.removeItem(WAVEFORM_PANEL_HEIGHT_STORAGE_KEY);
        return DEFAULT_WAVEFORM_PANEL_HEIGHT;
    }

    return parsedHeight;
}

export interface WaveformHeight {
    waveformHeight: number;
    resizeHandleProps: {
        onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
        onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
        onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
        onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
    };
}

export function useWaveformHeight(): WaveformHeight {
    const resizeStartRef = useRef<ResizeStart | null>(null);
    const [waveformPanelHeight, setWaveformPanelHeight] = useState(getStoredWaveformPanelHeight);
    const waveformPanelHeightRef = useRef(waveformPanelHeight);

    const onResizeHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        resizeStartRef.current = {
            pointerId: event.pointerId,
            pointerY: event.clientY,
            height: waveformPanelHeight,
        };
    };

    const saveWaveformPanelHeight = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!resizeStartRef.current || event.pointerId !== resizeStartRef.current.pointerId) {
            return;
        }

        resizeStartRef.current = null;
        localStorage.setItem(WAVEFORM_PANEL_HEIGHT_STORAGE_KEY, `${waveformPanelHeightRef.current}`);
    };

    const onResizeHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!resizeStartRef.current || event.pointerId !== resizeStartRef.current.pointerId) {
            return;
        }

        // There was a problem reproducible with quick and jerky DnD of the resize handle
        // where the pointerup event was not fired, leaving the resizeStartRef.current in a non-null state.
        if (event.buttons === 0) {
            saveWaveformPanelHeight(event);
            return;
        }

        const nextWaveformPanelHeight = clamp(
            resizeStartRef.current.height + event.clientY - resizeStartRef.current.pointerY,
            MIN_WAVEFORM_PANEL_HEIGHT,
            MAX_WAVEFORM_PANEL_HEIGHT,
        );
        waveformPanelHeightRef.current = nextWaveformPanelHeight;
        setWaveformPanelHeight(nextWaveformPanelHeight);
    };

    return {
        waveformHeight: waveformPanelHeight - MINIMAP_HEIGHT,
        resizeHandleProps: {
            onPointerCancel: saveWaveformPanelHeight,
            onPointerDown: onResizeHandlePointerDown,
            onPointerMove: onResizeHandlePointerMove,
            onPointerUp: saveWaveformPanelHeight,
        },
    };
}
