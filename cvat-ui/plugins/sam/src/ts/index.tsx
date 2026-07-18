// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { LRUCache } from 'lru-cache';
import {
    type CVATCore,
    type MLModel,
    type Job,
    type InteractorResults,
    Source,
    ShapeType,
} from 'cvat-core-wrapper';
import { PluginEntryPoint, APIWrapperEnterOptions, ComponentBuilder } from 'components/plugins-entrypoint';
import {
    InitBody, DecodeBody, WorkerAction, SAMOutputItem,
} from './inference.worker';

interface SAMPlugin {
    name: string;
    description: string;
    cvat: {
        lambda: {
            call: {
                enter: (
                    plugin: SAMPlugin,
                    taskID: number,
                    model: MLModel,
                    args: any,
                ) => Promise<null | APIWrapperEnterOptions>;
                leave: (
                    plugin: SAMPlugin,
                    result: object,
                    taskID: number,
                    model: MLModel,
                    args: any,
                ) => Promise<any>;
            };
        };
        jobs: {
            get: {
                leave: (
                    plugin: SAMPlugin,
                    results: any[],
                    query: { jobID?: number }
                ) => Promise<any>;
            };
        };
    };
    data: {
        initialized: boolean;
        worker: Worker;
        core: CVATCore | null;
        jobs: Record<number, Job>;
        modelID: string;
        modelURL: string;
        embeddings: LRUCache<string, Float32Array>;
        lowResMasks: LRUCache<string, Float32Array>;
        lastROIs: Record<string, string>;
        lastClicks: ClickType[];
    };
    callbacks: {
        mask2Rle: ((points: Uint8ClampedArray) => number[]) | null;
    };
}

interface ClickType {
    clickType: 0 | 1 | 2 | 3;
    x: number;
    y: number;
}

type ROI = [number, number, number, number]; // [xtl, ytl, xbr, ybr]

function buildROISignature(roi?: ROI): string {
    return roi ? `${roi[0]}_${roi[1]}_${roi[2]}_${roi[3]}` : 'full';
}

function optTranslatePrompts(points: number[][], roi?: ROI): number[][] {
    return roi ? points.map((point) => [point[0] - roi[0], point[1] - roi[1]]) : points;
}

function getModelScale(w: number, h: number): number {
    // Input images to SAM must be resized so the longest side is 1024
    const LONG_SIDE_LENGTH = 1024;
    const scale = LONG_SIDE_LENGTH / Math.max(h, w);
    return scale;
}

function modelData({
    clicks, imageEmbeddings, modelScale, lowResMask,
}: {
    clicks: ClickType[];
    imageEmbeddings: Float32Array;
    modelScale: { height: number; width: number; scale: number };
    lowResMask: Float32Array | null;
}): DecodeBody {
    const pointCoords = new Float32Array(2 * clicks.length);
    const pointLabels = new Float32Array(clicks.length);

    // Scale and add clicks
    for (let i = 0; i < clicks.length; i++) {
        pointCoords[2 * i] = clicks[i].x * modelScale.scale;
        pointCoords[2 * i + 1] = clicks[i].y * modelScale.scale;
        pointLabels[i] = clicks[i].clickType;
    }

    return {
        imageEmbeddings,
        pointCoords,
        pointLabels,
        width: modelScale.width,
        height: modelScale.height,
        maskInput: lowResMask ?? null,
    };
}

const samPlugin: SAMPlugin = {
    name: 'Segment Anything',
    description: 'Handles non-default SAM serverless function output',
    cvat: {
        jobs: {
            get: {
                async leave(
                    plugin: SAMPlugin,
                    results: any[],
                    query: { jobID?: number; },
                ): Promise<any> {
                    if (typeof query.jobID === 'number') {
                        [plugin.data.jobs[query.jobID]] = results;
                    }
                    return results;
                },
            },
        },
        lambda: {
            call: {
                async enter(
                    plugin: SAMPlugin,
                    taskID: number,
                    model: MLModel, { frame, roi }: { frame: number; roi?: ROI },
                ): Promise<null | APIWrapperEnterOptions> {
                    return new Promise((resolve, reject) => {
                        function resolvePromise(): void {
                            const key = `${taskID}_${frame}`;

                            if (plugin.data.lastROIs[key] !== buildROISignature(roi)) {
                                plugin.data.embeddings.delete(key);
                                plugin.data.lowResMasks.delete(key);
                                plugin.data.lastClicks = [];
                                delete plugin.data.lastROIs[key];
                            }

                            if (plugin.data.embeddings.has(key)) {
                                resolve({ preventMethodCall: true });
                            } else {
                                resolve(null);
                            }
                        }

                        if (model.id === plugin.data.modelID) {
                            if (!plugin.data.initialized) {
                                samPlugin.data.worker.postMessage({
                                    action: WorkerAction.INIT,
                                    payload: {
                                        decoderURL: samPlugin.data.modelURL,
                                    } as InitBody,
                                });

                                samPlugin.data.worker.onmessage = (e: MessageEvent) => {
                                    if (e.data.action !== WorkerAction.INIT) {
                                        reject(new Error(
                                            `Caught unexpected action response from worker: ${e.data.action}`,
                                        ));
                                    }

                                    if (!e.data.error) {
                                        samPlugin.data.initialized = true;
                                        resolvePromise();
                                    } else {
                                        reject(new Error(`SAM worker was not initialized. ${e.data.error}`));
                                    }
                                };
                            } else {
                                resolvePromise();
                            }
                        } else {
                            resolve(null);
                        }
                    });
                },

                async leave(
                    plugin: SAMPlugin,
                    result: unknown,
                    taskID: number,
                    model: MLModel,
                    {
                        frame, pos_points, neg_points, obj_bbox, roi,
                    }: {
                        frame: number;
                        pos_points: number[][];
                        neg_points: number[][];
                        obj_bbox: number[][];
                        roi?: ROI;
                    },
                ): Promise<{
                    mask: number[][];
                    bounds: [number, number, number, number];
                } | unknown> {
                    return new Promise((resolve, reject) => {
                        if (model.id !== plugin.data.modelID) {
                            resolve(result);
                            return;
                        }

                        const job = Object.values(plugin.data.jobs).find((_job) => (
                            _job.taskId === taskID && frame >= _job.startFrame && frame <= _job.stopFrame
                        )) as Job;

                        if (!job) {
                            throw new Error('Could not find a job corresponding to the request');
                        }

                        plugin.data.jobs = {
                            // we do not need to store old job instances
                            [job.id]: job,
                        };

                        job.frames.get(frame)
                            .then(({ height: imHeight, width: imWidth }: { height: number; width: number }) => {
                                const key = `${taskID}_${frame}`;
                                const inputWidth = roi ? roi[2] - roi[0] : imWidth;
                                const inputHeight = roi ? roi[3] - roi[1] : imHeight;
                                const inputPosPoints = optTranslatePrompts(pos_points, roi);
                                const inputNegPoints = optTranslatePrompts(neg_points, roi);
                                const inputObjBbox = optTranslatePrompts(obj_bbox, roi);

                                if (result) {
                                    const bin = window.atob((result as { blob: string }).blob);
                                    const bytes = new Uint8Array(bin.length);
                                    for (let i = 0; i < bin.length; i++) {
                                        bytes[i] = bin.charCodeAt(i);
                                    }

                                    plugin.data.lastROIs[key] = buildROISignature(roi);
                                    plugin.data.embeddings.set(key, new Float32Array(bytes.buffer));
                                }

                                const clicks: ClickType[] = [];
                                if (inputObjBbox.length) {
                                    clicks.push({ clickType: 2, x: inputObjBbox[0][0], y: inputObjBbox[0][1] });
                                    clicks.push({ clickType: 3, x: inputObjBbox[1][0], y: inputObjBbox[1][1] });
                                }

                                inputPosPoints.forEach((point) => {
                                    clicks.push({ clickType: 1, x: point[0], y: point[1] });
                                });

                                inputNegPoints.forEach((point) => {
                                    clicks.push({ clickType: 0, x: point[0], y: point[1] });
                                });

                                const isLowResMaskRelevant = JSON
                                    .stringify(clicks.slice(0, -1)) === JSON.stringify(plugin.data.lastClicks);

                                plugin.data.worker.postMessage({
                                    action: WorkerAction.DECODE,
                                    payload: modelData({
                                        imageEmbeddings: plugin.data.embeddings.get(key)!,
                                        lowResMask: isLowResMaskRelevant ?
                                            plugin.data.lowResMasks.get(key) ?? null : null,
                                        modelScale: {
                                            width: inputWidth,
                                            height: inputHeight,
                                            scale: getModelScale(inputWidth, inputHeight),
                                        },
                                        clicks,
                                    }),
                                });

                                plugin.data.worker.onmessage = ((e) => {
                                    if (e.data.action !== WorkerAction.DECODE) {
                                        const msg = 'Caught unexpected action response from worker: ' +
                                                `${e.data.action}, while "${WorkerAction.DECODE}" expected`;
                                        reject(new Error(msg));
                                    }

                                    if (!e.data.error) {
                                        const payload = e.data.payload as SAMOutputItem[];
                                        plugin.data.lastClicks = clicks;

                                        resolve({
                                            shapes: payload.map((item) => {
                                                const { mask_input: maskInput, bounds } = item;
                                                let rle = plugin.callbacks.mask2Rle!(item.points);
                                                if (rle.length < 2) {
                                                    rle = [0, 0, 0, 0, 0];
                                                } else {
                                                    if (roi) {
                                                        bounds[0] += roi[0];
                                                        bounds[1] += roi[1];
                                                        bounds[2] += roi[0];
                                                        bounds[3] += roi[1];
                                                    }
                                                    rle.push(...bounds);
                                                }

                                                plugin.data.lowResMasks.set(key, maskInput);
                                                return {
                                                    points: rle,
                                                    group: 0,
                                                    source: Source.SEMI_AUTO,
                                                    occluded: false,
                                                    rotation: 0,
                                                    type: ShapeType.MASK,
                                                    attributes: [],
                                                };
                                            }),
                                        } as InteractorResults);
                                    } else {
                                        reject(new Error(`Decoder error. ${e.data.error}`));
                                    }
                                });

                                plugin.data.worker.onerror = ((error) => {
                                    reject(error);
                                });
                            });
                    });
                },
            },
        },
    },
    data: {
        initialized: false,
        core: null,
        worker: new Worker(new URL('./inference.worker', import.meta.url)),
        jobs: {},
        modelID: 'pth-facebookresearch-sam-vit-h',
        modelURL: '/assets/decoder.onnx',
        embeddings: new LRUCache({
            // float32 tensor [256, 64, 64] is 4 MB, max 128 MB
            max: 32,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        lowResMasks: new LRUCache({
            // float32 tensor [1, 256, 256] is 0.25 MB, max 8 MB
            max: 32,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        lastROIs: {},
        lastClicks: [],
    },
    callbacks: {
        mask2Rle: null,
    },
};

const builder: ComponentBuilder = ({ core }) => {
    samPlugin.data.core = core;
    samPlugin.callbacks.mask2Rle = core.utils.mask2Rle;
    core.plugins.register(samPlugin);

    return {
        name: samPlugin.name,
        destructor: () => {
            samPlugin.data.embeddings.clear();
            samPlugin.data.lowResMasks.clear();
            samPlugin.data.worker.terminate();
            samPlugin.data.lastClicks = [];
            samPlugin.data.lastROIs = {};
            samPlugin.data.jobs = {};
            samPlugin.data.core = null;
            samPlugin.data.initialized = false;
        },
    };
};

function register(): void {
    if (Object.prototype.hasOwnProperty.call(window, 'cvatUI')) {
        (window as any as { cvatUI: { registerComponent: PluginEntryPoint } })
            .cvatUI.registerComponent(builder);
    }
}

window.addEventListener('plugins.ready', register, { once: true });
