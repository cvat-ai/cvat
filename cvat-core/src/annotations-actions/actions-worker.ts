// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

import { initializeOpenCVInWorker } from '../worker-utils';
import type { OpenCVInterface, SimplifyPolyOptions } from '../opencv/opencv-interface';

export enum WorkerAction {
    INITIALIZE = 'initialize',
    SIMPLIFY_POLYGONS = 'simplify_polygons',
}

export interface SimplifyShape {
    clientID: number;
    points: number[];
    shapeType: 'polygon' | 'polyline';
}

export interface WorkerRequest {
    command: WorkerAction;
    opencvPath?: string;
    shapes?: SimplifyShape[];
    options?: SimplifyPolyOptions;
}

export interface WorkerResponse {
    shapes?: SimplifyShape[];
    error?: string;
}

class ActionsWorkerManager {
    private cvInterface: OpenCVInterface | null = null;
    private initialized = false;

    public async initialize(): Promise<void> {
        this.cvInterface = await initializeOpenCVInWorker();
        this.initialized = true;
    }

    public simplifyShapes(shapes: SimplifyShape[], options: SimplifyPolyOptions): SimplifyShape[] {
        if (!this.initialized || !this.cvInterface) {
            throw new Error('Worker not initialized');
        }

        return shapes.map((shape) => {
            try {
                if (!shape.points || shape.points.length < 6) {
                    return shape;
                }

                const closed = shape.shapeType === 'polygon';
                const simplifiedPoints = this.cvInterface!.contours.simplifyPolygon(shape.points, {
                    accuracy: options.accuracy,
                    closed,
                });

                return {
                    ...shape,
                    points: simplifiedPoints,
                };
            } catch (error: unknown) {
                // If simplification fails, return original shape
                console.error(`Failed to simplify shape ${shape.clientID}:`, error);
                return shape;
            }
        });
    }

    public get isInitialized(): boolean {
        return this.initialized;
    }
}

if ((self as any).importScripts) {
    const manager = new ActionsWorkerManager();

    onmessage = (event: MessageEvent<WorkerRequest>) => {
        const { command } = event.data;

        if (command === WorkerAction.INITIALIZE) {
            const { opencvPath } = event.data;
            if (opencvPath) {
                (self as any).OPENCV_PATH = opencvPath;
            }

            manager.initialize()
                .then(() => {
                    postMessage({} as WorkerResponse);
                })
                .catch((error: unknown) => {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    postMessage({
                        error: `Could not initialize OpenCV in worker: ${errorMessage}`,
                    } as WorkerResponse);
                });
        } else if (command === WorkerAction.SIMPLIFY_POLYGONS) {
            const { shapes, options } = event.data;

            if (!shapes || !options) {
                postMessage({
                    error: 'Missing shapes or options for simplification',
                } as WorkerResponse);
                return;
            }

            try {
                const simplifiedShapes = manager.simplifyShapes(shapes, options);
                postMessage({
                    shapes: simplifiedShapes,
                } as WorkerResponse);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                postMessage({
                    error: `Error during simplification: ${errorMessage}`,
                } as WorkerResponse);
            }
        } else {
            postMessage({
                error: `Unknown command: ${command}`,
            } as WorkerResponse);
        }
    };
}
