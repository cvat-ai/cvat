// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Tensor } from 'onnxruntime-web';
import { LRUCache } from 'lru-cache';
import { CVATCore, MLModel, Job } from 'cvat-core-wrapper';
import { PluginEntryPoint, APIWrapperEnterOptions, ComponentBuilder } from 'components/plugins-entrypoint';
import { InitBody, DecodeBody, WorkerAction } from './inference.worker';

interface SAM2Plugin {
    name: string;
    description: string;
    cvat: {
        lambda: {
            call: {
                enter: (
                    plugin: SAM2Plugin,
                    taskID: number,
                    model: MLModel,
                    args: any,
                ) => Promise<null | APIWrapperEnterOptions>;
                leave: (
                    plugin: SAM2Plugin,
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
                    plugin: SAM2Plugin,
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
        features0: LRUCache<string, Tensor>;
        features1: LRUCache<string, Tensor>;
        lowResMasks: LRUCache<string, Tensor>;
        lastClicks: ClickType[];
    };
    callbacks: {
        onStatusChange: ((status: string) => void) | null;
    };
}

interface ClickType {
    clickType: 0 | 1 | 2 | 3;
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
        clicks, imageEmbedTensor, highResFeats0Tensor, highResFeats1Tensor, modelScale, maskInput,
    }: {
        clicks: ClickType[];
        imageEmbedTensor: Tensor;
        highResFeats0Tensor: Tensor;
        highResFeats1Tensor: Tensor;
        modelScale: { height: number; width: number; scale: number };
        maskInput: Tensor | null;
    },
): DecodeBody {
    const imageEmbed = imageEmbedTensor;
    const highResFeats0 = highResFeats0Tensor;
    const highResFeats1 = highResFeats1Tensor;

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
    const imageSizeTensor = new Tensor('int32', [modelScale.height, modelScale.width]);

    const prevMask = maskInput ||
        new Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
    const hasMaskInput = new Tensor('float32', [maskInput ? 1 : 0]);

    return {
        image_embed: imageEmbed,
        high_res_feats_0: highResFeats0,
        high_res_feats_1: highResFeats1,
        point_coords: pointCoordsTensor,
        point_labels: pointLabelsTensor,
        orig_im_size: imageSizeTensor,
        mask_input: prevMask,
        has_mask_input: hasMaskInput,
    };
}

const sam2Plugin: SAM2Plugin = {
    name: 'Segment Anything 2.1',
    description: 'Handles non-default SAM2 serverless function output',
    cvat: {
        jobs: {
            get: {
                async leave(
                    plugin: SAM2Plugin,
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
                    plugin: SAM2Plugin,
                    taskID: number,
                    model: MLModel, { frame }: { frame: number },
                ): Promise<null | APIWrapperEnterOptions> {
                    return new Promise((resolve, reject) => {
                        function resolvePromise(): void {
                            const key = `${taskID}_${frame}`;
                            const hasAllFeatures = (
                                plugin.data.embeddings.has(key) &&
                                plugin.data.features0.has(key) &&
                                plugin.data.features1.has(key)
                            );
                            if (hasAllFeatures) {
                                resolve({ preventMethodCall: true });
                            } else {
                                resolve(null);
                            }
                        }

                        if (model.id === plugin.data.modelID) {
                            if (!plugin.data.initialized) {
                                sam2Plugin.data.worker.postMessage({
                                    action: WorkerAction.INIT,
                                    payload: {
                                        decoderURL: sam2Plugin.data.modelURL,
                                    } as InitBody,
                                });

                                sam2Plugin.data.worker.onmessage = (e: MessageEvent) => {
                                    if (e.data.action !== WorkerAction.INIT) {
                                        reject(new Error(
                                            `Caught unexpected action response from worker: ${e.data.action}`,
                                        ));
                                    }

                                    if (!e.data.error) {
                                        sam2Plugin.data.initialized = true;
                                        resolvePromise();
                                    } else {
                                        reject(new Error(`SAM 2.1 worker was not initialized. ${e.data.error}`));
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
                    plugin: SAM2Plugin,
                    result: any,
                    taskID: number,
                    model: MLModel,
                    {
                        frame, pos_points, neg_points, obj_bbox,
                    }: {
                        frame: number, pos_points: number[][], neg_points: number[][], obj_bbox: number[][],
                    },
                ): Promise<
                    {
                        mask: number[][];
                        bounds: [number, number, number, number];
                    }> {
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

                                if (result) {
                                    const encodedImageEmbed = window.atob(result.image_embed);
                                    const encodedFeat0 = window.atob(result.high_res_feats_0);
                                    const encodedFeat1 = window.atob(result.high_res_feats_1);

                                    const uint8ArrayImageEmbed = new Uint8Array(encodedImageEmbed.length);
                                    const uint8ArrayFeat0 = new Uint8Array(encodedFeat0.length);
                                    const uint8ArrayFeat1 = new Uint8Array(encodedFeat1.length);

                                    for (let i = 0; i < encodedImageEmbed.length; i++) {
                                        uint8ArrayImageEmbed[i] = encodedImageEmbed.charCodeAt(i);
                                    }

                                    for (let i = 0; i < encodedFeat0.length; i++) {
                                        uint8ArrayFeat0[i] = encodedFeat0.charCodeAt(i);
                                    }

                                    for (let i = 0; i < encodedFeat1.length; i++) {
                                        uint8ArrayFeat1[i] = encodedFeat1.charCodeAt(i);
                                    }

                                    const float32ArrImageEmbed = new Float32Array(uint8ArrayImageEmbed.buffer);
                                    const float32ArrFeat0 = new Float32Array(uint8ArrayFeat0.buffer);
                                    const float32ArrFeat1 = new Float32Array(uint8ArrayFeat1.buffer);

                                    plugin.data.embeddings.set(key, new Tensor('float32', float32ArrImageEmbed, [1, 256, 64, 64]));
                                    plugin.data.features0.set(key, new Tensor('float32', float32ArrFeat0, [1, 32, 256, 256]));
                                    plugin.data.features1.set(key, new Tensor('float32', float32ArrFeat1, [1, 64, 128, 128]));
                                }

                                const modelScale = {
                                    width: imWidth,
                                    height: imHeight,
                                    scale: getModelScale(imWidth, imHeight),
                                };

                                const clicks: ClickType[] = [];
                                if (obj_bbox.length) {
                                    clicks.push({ clickType: 2, x: obj_bbox[0][0], y: obj_bbox[0][1] });
                                    clicks.push({ clickType: 3, x: obj_bbox[1][0], y: obj_bbox[1][1] });
                                }

                                pos_points.forEach((point) => {
                                    clicks.push({ clickType: 1, x: point[0], y: point[1] });
                                });

                                neg_points.forEach((point) => {
                                    clicks.push({ clickType: 0, x: point[0], y: point[1] });
                                });

                                const isLowResMaskSuitable = JSON
                                    .stringify(clicks.slice(0, -1)) === JSON.stringify(plugin.data.lastClicks);
                                const feeds = modelData({
                                    clicks,
                                    imageEmbedTensor: plugin.data.embeddings.get(key) as Tensor,
                                    highResFeats0Tensor: plugin.data.features0.get(key) as Tensor,
                                    highResFeats1Tensor: plugin.data.features1.get(key) as Tensor,
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
                                        plugin.data.lastClicks = clicks;

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
        modelID: 'pth-facebookresearch-sam2-hiera-large',
        modelURL: '/assets/sam2.1_hiera_large.decoder.onnx',
        embeddings: new LRUCache({
            // float32 tensor [256, 64, 64] is 4 MB, max 128 MB
            max: 32,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        features0: new LRUCache({
            // float32 tensor [32, 256, 256] is 8 MB, max 128 MB
            max: 32,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        features1: new LRUCache({
            // float32 tensor [64, 128, 128] is 4 MB, max 128 MB
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
    sam2Plugin.data.core = core;
    core.plugins.register(sam2Plugin);

    return {
        name: sam2Plugin.name,
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
