// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai corp
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef,
} from 'react';
import { Canvas } from 'cvat-canvas-wrapper';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState, ImageFilter } from 'reducers';
import notification from 'antd/lib/notification';
import { changeFrameAsync } from 'actions/annotation-actions';

export default function ImageProcessingComponent(): JSX.Element | null {
    const filtersRef = useRef<ImageFilter[]>([]);
    const frame = useRef<number | null>(null);
    useSelector((state: CombinedState) => {
        filtersRef.current = state.settings.imageProcessing.filters;
        frame.current = state.annotation.player.frame.number;
    });

    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance) as Canvas;
    const states = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const curZOrder = useSelector((state: CombinedState) => state.annotation.annotations.zLayer.cur);
    const frameData = useSelector((state: CombinedState) => state.annotation.player.frame.data);
    const filters = useSelector((state: CombinedState) => state.settings.imageProcessing.filters);

    const dispatch = useDispatch();

    const getCanvasImageData = ():ImageData => {
        const canvas: HTMLCanvasElement | null = window.document.getElementById('cvat_canvas_background') as
        | HTMLCanvasElement
        | null;
        if (!canvas) {
            throw new Error('Element #cvat_canvas_background was not found');
        }
        const { width, height } = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas context is empty');
        }
        return context.getImageData(0, 0, width, height);
    };

    const runImageModifier = useCallback(async (): Promise<void> => {
        try {
            const currentFilters = filtersRef.current;
            const currentFrame = frame.current;
            console.log('run image modifier', currentFilters);
            if (currentFilters.length === 0 || currentFrame === null) {
                return;
            }
            const imageIsNotProcessed = currentFilters.some((imageFilter: ImageFilter) => (
                imageFilter.modifier.currentProcessedImage !== currentFrame
            ));
            if (imageIsNotProcessed) {
                canvasInstance.configure({ forceFrameUpdate: true });
                const imageData = getCanvasImageData();
                const newImageData = currentFilters
                    .reduce((oldImageData, activeImageModifier) => activeImageModifier
                        .modifier.processImage(oldImageData, currentFrame), imageData);
                const imageBitmap = await createImageBitmap(newImageData);
                const proxy = new Proxy(frameData, {
                    get: (_frameData, prop, receiver) => {
                        if (prop === 'data') {
                            return async () => ({
                                renderWidth: imageData.width,
                                renderHeight: imageData.height,
                                imageData: imageBitmap,
                            });
                        }

                        return Reflect.get(_frameData, prop, receiver);
                    },
                });
                canvasInstance.setup(proxy, states, curZOrder);
            }
        } catch (error: any) {
            notification.error({
                description: error.toString(),
                message: 'OpenCV.js processing error occurred',
                className: 'cvat-notification-notice-opencv-processing-error',
            });
        } finally {
            // canvasInstance.configure({ forceFrameUpdate: false });
        }
    }, [canvasInstance]);

    useEffect(() => {
        if (canvasInstance) {
            canvasInstance.configure({ forceFrameUpdate: true });
            canvasInstance.html().addEventListener('canvas.setup', runImageModifier);
        }
        return () => {
            canvasInstance.html().removeEventListener('canvas.setup', runImageModifier);
        };
    }, []);

    useEffect(() => {
        if (frame.current !== null && filters.length !== 0) {
            // runImageModifier();
            // canvasInstance.configure({ forceFrameUpdate: true });
            dispatch(changeFrameAsync(frame.current, false, 1, true));
        } else if (frame.current !== null) {
            // filter disabled -> change frame and runImageModifier applies other filters by 'canvas.setup'
            // canvasInstance.configure({ forceFrameUpdate: true });
            dispatch(changeFrameAsync(frame.current, false, 1, true));
        }
    }, [filters]);
    return null;
}
