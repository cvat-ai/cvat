// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Tensor } from 'onnxruntime-web';
import { LRUCache } from 'lru-cache';
import { CVATCore, MLModel, Job } from 'cvat-core-wrapper';
import { PluginEntryPoint, APIWrapperEnterOptions, ComponentBuilder } from 'components/plugins-entrypoint';
import { InitBody, DecodeBody, WorkerAction } from './inference.worker';

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
        embeddings: LRUCache<string, Tensor>;
        lowResMasks: LRUCache<string, Tensor>;
        lastClicks: ClickType[];
    };
    callbacks: {
        onStatusChange: ((status: string) => void) | null;
    };
}

interface ClickType {
    clickType: 0 | 1;
    x: number;
    y: number;
}

function getModelScale(w: number, h: number): number {
    // Input images to SAM must be resized so the longest side is 1024
    const LONG_SIDE_LENGTH = 1024;
    const scale = LONG_SIDE_LENGTH / Math.max(h, w);
    return scale;
}

function modelData(
    {
        clicks, tensor, modelScale, maskInput,
    }: {
        clicks: ClickType[];
        tensor: Tensor;
        modelScale: { height: number; width: number; scale: number };
        maskInput: Tensor | null;
    },
): DecodeBody {
    const imageEmbedding = tensor;

    const n = clicks.length;
    const pointCoords = new Float32Array(2 * n);
    const pointLabels = new Float32Array(n);

    // Scale and add clicks
    for (let i = 0; i < n; i++) {
        pointCoords[2 * i] = clicks[i].x * modelScale.scale;
        pointCoords[2 * i + 1] = clicks[i].y * modelScale.scale;
        pointLabels[i] = clicks[i].clickType;
    }

    // Create the tensor
    const pointCoordsTensor = new Tensor('float32', pointCoords, [1, n, 2]);
    const pointLabelsTensor = new Tensor('float32', pointLabels, [1, n]);
    const imageSizeTensor = new Tensor('float32', [modelScale.height, modelScale.width]);

    const prevMask = maskInput ||
        new Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
    const hasMaskInput = new Tensor('float32', [maskInput ? 1 : 0]);

    return {
        image_embeddings: imageEmbedding,
        point_coords: pointCoordsTensor,
        point_labels: pointLabelsTensor,
        orig_im_size: imageSizeTensor,
        mask_input: prevMask,
        has_mask_input: hasMaskInput,
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
                    query: { jobID?: number },
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
                    model: MLModel, { frame }: { frame: number },
                ): Promise<null | APIWrapperEnterOptions> {
                    return new Promise((resolve, reject) => {
                        function resolvePromise(): void {
                            const key = `${taskID}_${frame}`;
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
                    result: any,
                    taskID: number,
                    model: MLModel,
                    { frame, pos_points, neg_points }: {
                        frame: number, pos_points: number[][], neg_points: number[][],
                    },
                ): Promise<
                    {
                        mask: number[][];
                        bounds: [number, number, number, number];
                    }> {
                    return new Promise((resolve, reject) => {
                        if (model.id !== plugin.data.modelID) {
                            resolve(result);
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

                                if (result) {
                                    const bin = window.atob(result.blob);
                                    const uint8Array = new Uint8Array(bin.length);
                                    for (let i = 0; i < bin.length; i++) {
                                        uint8Array[i] = bin.charCodeAt(i);
                                    }
                                    const float32Arr = new Float32Array(uint8Array.buffer);
                                    plugin.data.embeddings.set(key, new Tensor('float32', float32Arr, [1, 256, 64, 64]));
                                }

                                const modelScale = {
                                    width: imWidth,
                                    height: imHeight,
                                    scale: getModelScale(imWidth, imHeight),
                                };

                                const composedClicks = [...pos_points, ...neg_points].map(([x, y], index) => ({
                                    clickType: index < pos_points.length ? 1 : 0 as 0 | 1,
                                    x,
                                    y,
                                }));

                                const isLowResMaskSuitable = JSON
                                    .stringify(composedClicks.slice(0, -1)) === JSON.stringify(plugin.data.lastClicks);
                                const feeds = modelData({
                                    clicks: composedClicks,
                                    tensor: plugin.data.embeddings.get(key) as Tensor,
                                    modelScale,
                                    maskInput: isLowResMaskSuitable ? plugin.data.lowResMasks.get(key) || null : null,
                                });

                                function toMatImage(input: number[], width: number, height: number): number[][] {
                                    const image = Array(height).fill(0);
                                    for (let i = 0; i < image.length; i++) {
                                        image[i] = Array(width).fill(0);
                                    }

                                    for (let i = 0; i < input.length; i++) {
                                        const row = Math.floor(i / width);
                                        const col = i % width;
                                        image[row][col] = input[i] > 0 ? 255 : 0;
                                    }

                                    return image;
                                }

                                function onnxToImage(input: any, width: number, height: number): number[][] {
                                    return toMatImage(input, width, height);
                                }

                                plugin.data.worker.postMessage({
                                    action: WorkerAction.DECODE,
                                    payload: feeds,
                                });

                                plugin.data.worker.onmessage = ((e) => {
                                    if (e.data.action !== WorkerAction.DECODE) {
                                        const error = 'Caught unexpected action response from worker: ' +
                                                `${e.data.action}, while "${WorkerAction.DECODE}" was expected`;
                                        reject(new Error(error));
                                    }

                                    if (!e.data.error) {
                                        const {
                                            masks, lowResMasks, xtl, ytl, xbr, ybr,
                                        } = e.data.payload;
                                        const imageData = onnxToImage(masks.data, masks.dims[3], masks.dims[2]);
                                        plugin.data.lowResMasks.set(key, lowResMasks);
                                        plugin.data.lastClicks = composedClicks;

                                        resolve({
                                            mask: imageData,
                                            bounds: [xtl, ytl, xbr, ybr],
                                        });
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
        lastClicks: [],
    },
    callbacks: {
        onStatusChange: null,
    },
};

const builder: ComponentBuilder = ({ core }) => {
    samPlugin.data.core = core;
    core.plugins.register(samPlugin);

    return {
        name: samPlugin.name,
        destructor: () => {},
    };
};

function register(): void {
    if (Object.prototype.hasOwnProperty.call(window, 'cvatUI')) {
        (window as any as { cvatUI: { registerComponent: PluginEntryPoint } })
            .cvatUI.registerComponent(builder);
    }
}

window.addEventListener('plugins.ready', register, { once: true });
