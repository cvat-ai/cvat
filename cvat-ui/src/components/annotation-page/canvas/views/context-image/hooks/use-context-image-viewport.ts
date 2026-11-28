// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import type {
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';

import { clamp } from 'utils/math';
import type { Size } from 'utils/geometry';

export interface ContextImageViewport {
    left: number;
    top: number;
    scale: number;
}

interface Params {
    imageSize: Size | undefined;
    viewportElement: HTMLDivElement | null;
}

interface MoveState {
    pointerID: number;
    clientX: number;
    clientY: number;
    left: number;
    top: number;
    engaged: boolean;
}

interface ContextImageViewportController {
    viewport: ContextImageViewport | null;
    onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void;
    onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void;
    onClickCapture(event: ReactMouseEvent<HTMLDivElement>): void;
    onDoubleClick(event: ReactMouseEvent<HTMLDivElement>): void;
}

const MIN_ZOOM_FACTOR = 0.5;
const MAX_ZOOM_FACTOR = 50;
const MAX_WHEEL_DELTA = 8;
const ZOOM_SPEED = 4 / 1000;
const MOVE_THRESHOLD = 3;

function getFittedViewport(imageSize: Size, width: number, height: number): ContextImageViewport {
    const scale = Math.min(width / imageSize.width, height / imageSize.height);

    return {
        left: (width - imageSize.width * scale) / 2,
        top: (height - imageSize.height * scale) / 2,
        scale,
    };
}

function clampViewport(
    viewport: ContextImageViewport,
    imageSize: Size,
    viewportSize: Size,
): ContextImageViewport {
    const { width, height } = viewportSize;
    const leftOffset = width - imageSize.width * viewport.scale;
    const topOffset = height - imageSize.height * viewport.scale;
    const horizontalMargin = (width * (1 - MIN_ZOOM_FACTOR)) / 2;
    const verticalMargin = (height * (1 - MIN_ZOOM_FACTOR)) / 2;
    const left = clamp(
        viewport.left,
        Math.min(leftOffset, 0) - horizontalMargin,
        Math.max(leftOffset, 0) + horizontalMargin,
    );
    const top = clamp(
        viewport.top,
        Math.min(topOffset, 0) - verticalMargin,
        Math.max(topOffset, 0) + verticalMargin,
    );

    return {
        ...viewport,
        left,
        top,
    };
}

function resizeViewport(
    viewport: ContextImageViewport,
    imageSize: Size,
    previousViewportSize: Size,
    viewportSize: Size,
    scaleFactor: number,
): ContextImageViewport {
    const scale = viewport.scale * scaleFactor;
    const imageX = (previousViewportSize.width / 2 - viewport.left) / viewport.scale;
    const imageY = (previousViewportSize.height / 2 - viewport.top) / viewport.scale;

    return clampViewport({
        scale,
        left: viewportSize.width / 2 - imageX * scale,
        top: viewportSize.height / 2 - imageY * scale,
    }, imageSize, viewportSize);
}

function getResizeZoomFactor(viewportSize: Size, referenceViewportSize: Size): number {
    const widthRatio = viewportSize.width / referenceViewportSize.width;
    const heightRatio = viewportSize.height / referenceViewportSize.height;

    if (widthRatio > 1 && heightRatio > 1) {
        return Math.min(widthRatio, heightRatio);
    }

    if (widthRatio < 1 && heightRatio < 1) {
        return Math.max(widthRatio, heightRatio);
    }

    return 1;
}

function areViewportsEqual(first: ContextImageViewport, second: ContextImageViewport): boolean {
    return first.left === second.left && first.top === second.top && first.scale === second.scale;
}

export default function useContextImageViewport({
    imageSize,
    viewportElement,
}: Params): ContextImageViewportController {
    const [viewportSize, setViewportSize] = useState<Size | null>(null);
    const [viewport, setViewport] = useState<ContextImageViewport | null>(null);
    const moveRef = useRef<MoveState | null>(null);
    const ignoreNextClickRef = useRef(false);
    const isFittedRef = useRef(true);
    const previousImageSizeRef = useRef<Size | undefined>(undefined);
    const previousViewportSizeRef = useRef<Size | null>(null);
    const zoomReferenceViewportSizeRef = useRef<Size | null>(null);

    // Updates viewport size when the viewport element is resized
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

    // Keeps viewport fitted by default when no adjustments have been made by the user.
    // Adjusts the viewport when the image or viewport size changes.
    // Clamps the viewport to the image boundaries accounting for margins.
    useLayoutEffect(() => {
        moveRef.current = null;
        const imageChanged = previousImageSizeRef.current !== imageSize;
        const previousViewportSize = previousViewportSizeRef.current;
        const zoomReferenceViewportSize = zoomReferenceViewportSizeRef.current;

        previousImageSizeRef.current = imageSize;
        previousViewportSizeRef.current = viewportSize;
        if (imageChanged) {
            isFittedRef.current = true;
        }

        if (!imageSize || !viewportSize?.width || !viewportSize.height) {
            isFittedRef.current = true;
            zoomReferenceViewportSizeRef.current = null;
            setViewport(null);
            return;
        }

        // Calculate if we want to adjust zoom based on this change in viewport size.
        const resizeZoomFactor = !isFittedRef.current && zoomReferenceViewportSize ?
            getResizeZoomFactor(viewportSize, zoomReferenceViewportSize) : 1;
        if (isFittedRef.current || resizeZoomFactor !== 1) {
            zoomReferenceViewportSizeRef.current = viewportSize;
        }

        setViewport((currentViewport) => {
            if (!currentViewport || isFittedRef.current) {
                return getFittedViewport(imageSize, viewportSize.width, viewportSize.height);
            }

            const adjustedViewport = previousViewportSize ? resizeViewport(
                currentViewport,
                imageSize,
                previousViewportSize,
                viewportSize,
                resizeZoomFactor,
            ) : clampViewport(currentViewport, imageSize, viewportSize);

            return areViewportsEqual(currentViewport, adjustedViewport) ? currentViewport : adjustedViewport;
        });
    }, [imageSize, viewportSize]);

    const finishMoving = useCallback((pointerID: number): void => {
        const move = moveRef.current;
        if (!move || move.pointerID !== pointerID) {
            return;
        }

        moveRef.current = null;
        if (!move.engaged) {
            return;
        }

        if (viewportElement?.hasPointerCapture(pointerID)) {
            viewportElement.releasePointerCapture(pointerID);
        }

        ignoreNextClickRef.current = true;
    }, [viewportElement]);

    const onWheel = useCallback((event: WheelEvent): void => {
        if (!imageSize || !viewportSize) {
            return;
        }

        event.preventDefault();

        const deltaY = clamp(event.deltaY, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
        const fittedViewport = getFittedViewport(imageSize, viewportSize.width, viewportSize.height);
        const rect = viewportElement?.getBoundingClientRect();
        if (!rect) {
            return;
        }

        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;

        setViewport((currentViewport) => {
            if (!currentViewport) {
                return currentViewport;
            }

            // Symmetric and equally responsive in/out zooming at every zoom level.
            const scaleFactor = Math.exp(-deltaY * ZOOM_SPEED);
            const scale = clamp(
                currentViewport.scale * scaleFactor,
                fittedViewport.scale * MIN_ZOOM_FACTOR,
                fittedViewport.scale * MAX_ZOOM_FACTOR,
            );

            if (scale === currentViewport.scale) {
                return currentViewport;
            }

            isFittedRef.current = false;
            zoomReferenceViewportSizeRef.current = viewportSize;
            const imageX = (pointerX - currentViewport.left) / currentViewport.scale;
            const imageY = (pointerY - currentViewport.top) / currentViewport.scale;

            return clampViewport({
                scale,
                left: pointerX - imageX * scale,
                top: pointerY - imageY * scale,
            }, imageSize, viewportSize);
        });
    }, [imageSize, viewportElement, viewportSize]);

    useEffect(() => {
        if (!viewportElement) {
            return undefined;
        }

        viewportElement.addEventListener('wheel', onWheel);

        return (): void => {
            viewportElement.removeEventListener('wheel', onWheel);
        };
    }, [onWheel, viewportElement]);

    useEffect(() => {
        const onPointerEnd = (event: PointerEvent): void => {
            finishMoving(event.pointerId);
        };

        document.addEventListener('pointerup', onPointerEnd);
        document.addEventListener('pointercancel', onPointerEnd);

        return (): void => {
            document.removeEventListener('pointerup', onPointerEnd);
            document.removeEventListener('pointercancel', onPointerEnd);
        };
    }, [finishMoving]);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
        ignoreNextClickRef.current = false;
        moveRef.current = null;
        if (!viewportSize || !viewport || event.button !== 0) {
            return;
        }

        moveRef.current = {
            pointerID: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            left: viewport.left,
            top: viewport.top,
            engaged: false,
        };
    }, [viewport, viewportSize]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
        const move = moveRef.current;
        if (!imageSize || !viewportSize || !move || move.pointerID !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - move.clientX;
        const deltaY = event.clientY - move.clientY;
        if (!move.engaged && (Math.abs(deltaX) >= MOVE_THRESHOLD || Math.abs(deltaY) >= MOVE_THRESHOLD)) {
            move.engaged = true;
            isFittedRef.current = false;
            zoomReferenceViewportSizeRef.current = viewportSize;
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        if (!move.engaged) {
            return;
        }

        setViewport((currentViewport) => {
            if (!currentViewport) {
                return currentViewport;
            }

            return clampViewport({
                ...currentViewport,
                left: move.left + deltaX,
                top: move.top + deltaY,
            }, imageSize, viewportSize);
        });
    }, [imageSize, viewportSize]);

    const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>): void => {
        if (ignoreNextClickRef.current) {
            ignoreNextClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }, []);

    const onDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>): void => {
        if (!imageSize || !viewportSize) {
            return;
        }

        event.preventDefault();
        isFittedRef.current = true;
        zoomReferenceViewportSizeRef.current = viewportSize;
        setViewport(getFittedViewport(imageSize, viewportSize.width, viewportSize.height));
    }, [imageSize, viewportSize]);

    return {
        viewport,
        onPointerDown,
        onPointerMove,
        onClickCapture,
        onDoubleClick,
    };
}
