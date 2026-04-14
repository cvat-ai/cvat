// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { ShapeType, ObjectType } from '../enums';

import { ActionParameterType, ActionParameters } from './base-action';
import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';
import { WorkerAction } from './actions-worker';
import type { SimplifyShape, WorkerRequest, WorkerResponse } from './actions-worker';

export class PolySimplify extends BaseShapesAction {
    #accuracy = 0;
    #worker: Worker | null = null;
    #opencvPath: string = '';

    public async init(_instance: any, parameters: Record<string, any>): Promise<void> {
        this.#accuracy = parameters.Threshold as number;
        // Get the OPENCV_PATH from window.cvat.config if available
        this.#opencvPath = (window as any)?.cvat?.config?.OPENCV_PATH || '/assets/opencv_4.8.0.js';

        return new Promise((resolve, reject) => {
            this.#worker = new Worker(new URL('./actions-worker.ts', import.meta.url));

            this.#worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                const result = event.data;
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve();
                }
            };

            this.#worker.onerror = (event: ErrorEvent) => {
                reject(new Error(event.message));
            };

            this.#worker.postMessage({
                command: WorkerAction.INITIALIZE,
                opencvPath: this.#opencvPath,
            } as WorkerRequest);
        });
    }

    public async destroy(): Promise<void> {
        if (this.#worker) {
            this.#worker.terminate();
            this.#worker = null;
        }
    }

    public async run(input: ShapesActionInput): Promise<ShapesActionOutput> {
        const { onProgress, cancelled } = input;

        if (!this.#worker) {
            throw new Error('Worker not initialized');
        }

        if (!input.collection.shapes.length) {
            return {
                created: { shapes: [] },
                deleted: { shapes: [] },
            };
        }

        return new Promise((resolve, reject) => {
            if (cancelled()) {
                resolve({
                    created: { shapes: [] },
                    deleted: { shapes: [] },
                });
                return;
            }

            onProgress('Simplifying polygons', 0);

            this.#worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
                const result = event.data;
                if (result.error) {
                    reject(new Error(result.error));
                } else if (result.shapes) {
                    onProgress('Simplifying polygons', 100);

                    const simplifiedShapes = result.shapes.map((simplifiedShape) => {
                        const originalShape = input.collection.shapes.find(
                            (s) => s.clientID === simplifiedShape.clientID,
                        );
                        return {
                            ...originalShape,
                            points: simplifiedShape.points,
                        };
                    });

                    resolve({
                        created: { shapes: simplifiedShapes },
                        deleted: { shapes: input.collection.shapes },
                    });
                }
            };

            this.#worker!.onerror = (event: ErrorEvent) => {
                reject(new Error(event.message));
            };

            const shapes: SimplifyShape[] = input.collection.shapes.map((shape) => ({
                clientID: shape.clientID,
                points: shape.points,
                shapeType: shape.type as 'polygon' | 'polyline',
            }));

            this.#worker!.postMessage({
                command: WorkerAction.SIMPLIFY_POLYGONS,
                shapes,
                options: {
                    accuracy: this.#accuracy,
                    closed: true,
                },
            } as WorkerRequest);
        });
    }

    public applyFilter(input: ShapesActionInput): ShapesActionInput['collection'] {
        return {
            shapes: input.collection.shapes.filter(
                (shape) => shape.type === ShapeType.POLYGON || shape.type === ShapeType.POLYLINE,
            ),
        };
    }

    public isApplicableForObject(objectState: ObjectState): boolean {
        return (
            objectState.objectType === ObjectType.SHAPE &&
            (objectState.shapeType === ShapeType.POLYGON || objectState.shapeType === ShapeType.POLYLINE)
        );
    }

    public get name(): string {
        return 'Simplify polygons and polylines';
    }

    public get parameters(): ActionParameters | null {
        return {
            Threshold: {
                type: ActionParameterType.SLIDER,
                values: ['0', '13', '1'], // min, max, step
                defaultValue: '7',
                tooltip: 'Lower values create simpler shapes with fewer points. Higher values preserve more detail and points.',
            },
        };
    }
}
