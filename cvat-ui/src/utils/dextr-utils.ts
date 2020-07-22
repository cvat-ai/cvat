// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { ShapeType, CombinedState } from 'reducers/interfaces';
import { getCVATStore } from 'cvat-store';

const core = getCore();

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

async function serverRequest(
    taskInstance: any,
    frame: number,
    points: number[],
): Promise<number[]> {
    const reducer = (acc: number[][],
        _: number, index: number,
        array: number[]): number[][] => {
        if (!(index % 2)) { // 0, 2, 4
            acc.push([
                array[index],
                array[index + 1],
            ]);
        }
        return acc;
    };

    const reducedPoints = points.reduce(reducer, []);
    const models = await core.lambda.list();
    const model = models.filter((func: any): boolean => func.id === 'openvino.dextr')[0];
    const result = await core.lambda.call(taskInstance, model, {
        task: taskInstance,
        frame,
        points: reducedPoints,
    });

    return result.flat();
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
                        this.task,
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
