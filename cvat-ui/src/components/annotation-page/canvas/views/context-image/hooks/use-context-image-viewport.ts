// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useLayoutEffect, useState } from 'react';

export interface ContextImageViewport {
    left: number;
    top: number;
    scale: number;
}

interface Params {
    image: ImageBitmap | undefined;
    viewportElement: HTMLDivElement | null;
}

interface ViewportSize {
    width: number;
    height: number;
}

function getFittedViewport(image: ImageBitmap, width: number, height: number): ContextImageViewport {
    const scale = Math.min(width / image.width, height / image.height);

    return {
        left: (width - image.width * scale) / 2,
        top: (height - image.height * scale) / 2,
        scale,
    };
}

export default function useContextImageViewport({
    image,
    viewportElement,
}: Params): ContextImageViewport | null {
    const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);

    useLayoutEffect(() => {
        if (!viewportElement) {
            setViewportSize(null);
            return undefined;
        }

        const updateViewportSize = (): void => {
            const { width, height } = viewportElement.getBoundingClientRect();
            setViewportSize((currentSize) => {
                if (currentSize?.width === width && currentSize.height === height) {
                    return currentSize;
                }

                return { width, height };
            });
        };

        const observer = new ResizeObserver(updateViewportSize);
        observer.observe(viewportElement);
        updateViewportSize();

        return (): void => {
            observer.disconnect();
        };
    }, [viewportElement]);

    if (!image || !viewportElement || !viewportSize?.width || !viewportSize.height) {
        return null;
    }

    return getFittedViewport(image, viewportSize.width, viewportSize.height);
}
