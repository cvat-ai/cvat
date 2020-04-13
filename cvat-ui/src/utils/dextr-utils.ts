// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core';
import { Canvas } from 'cvat-canvas';
import { ShapeType, RQStatus } from 'reducers/interfaces';

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

interface DEXTRPlugin {
    name: string;
    description: string;
    cvat: {
        classes: {
            Job: {
                prototype: {
                    annotations: {
                        put: {
                            enter(self: any, objects: any[]): Promise<void>;
                        };
                    };
                };
            };
        };
    };
    data: {
        enabled: boolean;
    };
}

interface Point {
    x: number;
    y: number;
}

function serverRequest(jid: number, frame: number, points: number[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
        const reducer = (acc: Point[], _: number, index: number, array: number[]): Point[] => {
            if (!(index % 2)) { // 0, 2, 4
                acc.push({
                    x: array[index],
                    y: array[index + 1],
                });
            }

            return acc;
        };

        const reducedPoints = points.reduce(reducer, []);
        core.server.request(
            `${baseURL}/dextr/create/${jid}`, {
                method: 'POST',
                data: JSON.stringify({
                    frame,
                    points: reducedPoints,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        ).then(() => {
            const timeoutCallback = (): void => {
                core.server.request(
                    `${baseURL}/dextr/check/${jid}`, {
                        method: 'GET',
                    },
                ).then((response: any) => {
                    const { status } = response;
                    if (status === RQStatus.finished) {
                        resolve(response.result.split(/\s|,/).map((coord: string) => +coord));
                    } else if (status === RQStatus.failed) {
                        reject(new Error(response.stderr));
                    } else if (status === RQStatus.unknown) {
                        reject(new Error('Unknown DEXTR status has been received'));
                    } else {
                        setTimeout(timeoutCallback, 1000);
                    }
                });
            };

            setTimeout(timeoutCallback, 1000);
        });
    });

    // start checking
}

const plugin: DEXTRPlugin = {
    name: 'Deep extreme cut',
    description: 'Plugin allows to get a polygon from extreme points using AI',
    cvat: {
        classes: {
            Job: {
                prototype: {
                    annotations: {
                        put: {
                            async enter(self: DEXTRPlugin, objects: any[]): Promise<void> {
                                try {
                                    if (self.data.enabled) {
                                        const promises: Record<number, Promise<number[]>> = {};
                                        for (let i = 0; i < objects.length; i++) {
                                            if (objects[i].points.length >= 8) {
                                                promises[i] = serverRequest(
                                                    (this as any).id,
                                                    objects[i].frame,
                                                    objects[i].points,
                                                );
                                            } else {
                                                promises[i] = new Promise((resolve) => {
                                                    resolve(objects[i].points);
                                                });
                                            }
                                        }

                                        const transformed = await Promise
                                            .all(Object.values(promises));
                                        for (let i = 0; i < objects.length; i++) {
                                            // eslint-disable-next-line no-param-reassign
                                            objects[i] = new core.classes.ObjectState({
                                                frame: objects[i].frame,
                                                objectType: objects[i].objectType,
                                                label: objects[i].label,
                                                shapeType: ShapeType.POLYGON,
                                                points: transformed[i],
                                                occluded: objects[i].occluded,
                                                zOrder: objects[i].zOrder,
                                            });
                                        }
                                    }

                                    return;
                                } catch (error) {
                                    throw new core.exceptions.PluginError(error.toString());
                                }
                            },
                        },
                    },
                },
            },
        },
    },
    data: {
        enabled: false,
    },
};

export function cancel(): void {
    // todo: cancel
}

export function activate(canvasInstance: Canvas): void {
    if (!plugin.data.enabled) {
        // eslint-disable-next-line no-param-reassign
        canvasInstance.draw = (drawData: any): void => {
            if (drawData.enabled && drawData.shapeType === ShapeType.POLYGON
                && (typeof (drawData.numberOfPoints) === 'undefined' || drawData.numberOfPoints >= 4)
                && (typeof (drawData.initialState) === 'undefined')
            ) {
                const patchedData = { ...drawData };
                patchedData.shapeType = ShapeType.POINTS;
                patchedData.crosshair = true;
                Object.getPrototypeOf(canvasInstance)
                    .draw.call(canvasInstance, patchedData);
            } else {
                Object.getPrototypeOf(canvasInstance)
                    .draw.call(canvasInstance, drawData);
            }
        };
        plugin.data.enabled = true;
    }
}

export function deactivate(canvasInstance: Canvas): void {
    if (plugin.data.enabled) {
        // eslint-disable-next-line no-param-reassign
        canvasInstance.draw = Object.getPrototypeOf(canvasInstance).draw;
        plugin.data.enabled = false;
    }
}

export function registerDEXTRPlugin(): void {
    core.plugins.register(plugin);
}
