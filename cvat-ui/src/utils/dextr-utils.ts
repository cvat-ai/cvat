// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { ShapeType, RQStatus, CombinedState } from 'reducers/interfaces';
import { getCVATStore } from 'cvat-store';

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
        canceled: boolean;
        enabled: boolean;
    };
}

interface Point {
    x: number;
    y: number;
}

const antModalRoot = document.createElement('div');
const antModalMask = document.createElement('div');
antModalMask.classList.add('ant-modal-mask');
const antModalWrap = document.createElement('div');
antModalWrap.classList.add('ant-modal-wrap');
antModalWrap.setAttribute('role', 'dialog');
const antModal = document.createElement('div');
antModal.classList.add('ant-modal');
antModal.style.width = '300px';
antModal.style.top = '40%';
antModal.setAttribute('role', 'document');
const antModalContent = document.createElement('div');
antModalContent.classList.add('ant-modal-content');
const antModalBody = document.createElement('div');
antModalBody.classList.add('ant-modal-body');
antModalBody.style.textAlign = 'center';
const antModalSpan = document.createElement('span');
antModalSpan.innerText = 'Segmentation request is being processed';
antModalSpan.style.display = 'block';
const antModalButton = document.createElement('button');
antModalButton.disabled = true;
antModalButton.classList.add('ant-btn', 'ant-btn-primary');
antModalButton.style.width = '100px';
antModalButton.style.margin = '10px auto';
const antModalButtonSpan = document.createElement('span');
antModalButtonSpan.innerText = 'Cancel';

antModalBody.append(antModalSpan, antModalButton);
antModalButton.append(antModalButtonSpan);
antModalContent.append(antModalBody);
antModal.append(antModalContent);
antModalWrap.append(antModal);
antModalRoot.append(antModalMask, antModalWrap);


function serverRequest(
    plugin: DEXTRPlugin,
    jid: number,
    frame: number,
    points: number[],
): Promise<number[]> {
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
                        if (status === RQStatus.queued) {
                            antModalButton.disabled = false;
                        }
                        if (!plugin.data.canceled) {
                            setTimeout(timeoutCallback, 1000);
                        } else {
                            core.server.request(
                                `${baseURL}/dextr/cancel/${jid}`, {
                                    method: 'GET',
                                },
                            ).then(() => {
                                resolve(points);
                            }).catch((error: Error) => {
                                reject(error);
                            });
                        }
                    }
                }).catch((error: Error) => {
                    reject(error);
                });
            };

            setTimeout(timeoutCallback, 1000);
        }).catch((error: Error) => {
            reject(error);
        });
    });
}

async function enter(this: any, self: DEXTRPlugin, objects: any[]): Promise<void> {
    try {
        if (self.data.enabled && objects.length === 1) {
            const state = (getCVATStore().getState() as CombinedState);
            const isPolygon = state.annotation
                .drawing.activeShapeType === ShapeType.POLYGON;
            if (!isPolygon) return;

            document.body.append(antModalRoot);
            const promises: Record<number, Promise<number[]>> = {};
            for (let i = 0; i < objects.length; i++) {
                if (objects[i].points.length >= 8) {
                    promises[i] = serverRequest(
                        self,
                        this.id,
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
    } finally {
        // eslint-disable-next-line no-param-reassign
        self.data.canceled = false;
        antModalButton.disabled = true;
        if (antModalRoot.parentElement === document.body) {
            document.body.removeChild(antModalRoot);
        }
    }
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
                            enter,
                        },
                    },
                },
            },
        },
    },
    data: {
        canceled: false,
        enabled: false,
    },
};


antModalButton.onclick = () => {
    plugin.data.canceled = true;
};

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
