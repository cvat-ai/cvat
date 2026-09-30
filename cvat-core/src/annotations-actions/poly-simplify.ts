// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { ShapeType, ObjectType } from '../enums';
import config from '../config';

import { ActionParameterType, ActionParameters } from './base-action';
import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';
import { WorkerAction } from './actions-worker';
import type { SimplifyShape, WorkerRequest, WorkerResponse } from './actions-worker';

export class PolySimplify extends BaseShapesAction {
    #threshold = 1.0;
    #worker: Worker | null = null;

    public async init(_instance: any, parameters: Record<string, any>): Promise<void> {
        this.#threshold = parameters.Distance as number;

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
                opencvPath: config.opencvPath,
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
                shapeType: shape.type as ShapeType.POLYGON | ShapeType.POLYLINE,
                frame: shape.frame,
            }));

            this.#worker!.postMessage({
                command: WorkerAction.SIMPLIFY_POLYGONS,
                shapes,
                threshold: this.#threshold,
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
            Distance: {
                type: ActionParameterType.NUMBER,
                values: ['0.1', '64', '0.1'], // min, max, step
                defaultValue: '1.0',
                tooltip: {
                    type: 'table',
                    content: {
                        columns: [
                            {
                                title: 'Distance',
                                dataIndex: 'distance',
                                key: 'distance',
                            },
                            {
                                title: 'Detail',
                                dataIndex: 'detail',
                                key: 'detail',
                            },
                            {
                                title: 'Reduction',
                                dataIndex: 'reduction',
                                key: 'reduction',
                            },
                            {
                                title: 'Use Case',
                                dataIndex: 'useCase',
                                key: 'useCase',
                            },
                        ],
                        data: [
                            {
                                distance: '0.5', detail: 'High detail', reduction: '~10%', useCase: 'Precise imaging',
                            },
                            {
                                distance: '1.0', detail: 'Balanced', reduction: '~30-50%', useCase: 'General annotations',
                            },
                            {
                                distance: '2.0', detail: 'Simplified', reduction: '~60-80%', useCase: 'High optimization',
                            },
                            {
                                distance: '5.0+', detail: 'Very simple', reduction: '~90%', useCase: 'Rough shapes',
                            },
                        ],
                    },
                },
            },
        };
    }
}
