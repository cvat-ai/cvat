// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useState, RefObject } from 'react';

interface UseDialogPositioningParams {
    ref: RefObject<HTMLDivElement>;
    top: number;
    left: number;
    scale: number;
    angle: number;
    clientCoordinates: [number, number];
    canvasRect: DOMRect | null;
}

interface UseDialogPositioningResult {
    top: number;
    left: number;
}

export function useDialogPositioning({
    ref,
    top,
    left,
    scale,
    angle,
    clientCoordinates,
    canvasRect,
}: UseDialogPositioningParams): UseDialogPositioningResult {
    const [position, setPosition] = useState({ top, left });

    useEffect(() => {
        if (ref.current && clientCoordinates && canvasRect) {
            const dialogRect = ref.current.getBoundingClientRect();
            const margin = 8;
            const dialogWidth = dialogRect.width;
            const dialogHeight = dialogRect.height;

            let newTop = top;
            let newLeft = left;
            const clickRelativeX = clientCoordinates[0] - canvasRect.left;
            const clickRelativeY = clientCoordinates[1] - canvasRect.top;

            const angleRad = (-angle * Math.PI) / 180;

            let totalDeltaX = 0;
            let totalDeltaY = 0;

            // Check if dialog extends beyond bottom edge
            if (clickRelativeY + dialogHeight > canvasRect.height) {
                const overflow = (clickRelativeY + dialogHeight) - canvasRect.height + margin;
                const deltaX = overflow * Math.sin(angleRad);
                const deltaY = overflow * Math.cos(angleRad);
                totalDeltaX -= deltaX;
                totalDeltaY -= deltaY;
            }

            // Check if dialog extends beyond right edge
            if (clickRelativeX + dialogWidth > canvasRect.width) {
                const overflow = (clickRelativeX + dialogWidth) - canvasRect.width + margin;
                const deltaX = overflow * Math.cos(angleRad);
                const deltaY = -overflow * Math.sin(angleRad);
                totalDeltaX -= deltaX;
                totalDeltaY -= deltaY;
            }

            newLeft = left + (totalDeltaX * scale);
            newTop = top + (totalDeltaY * scale);

            setPosition({ top: newTop, left: newLeft });
        }
    }, [ref.current, top, left, scale, angle, clientCoordinates, canvasRect]);

    return position;
}
