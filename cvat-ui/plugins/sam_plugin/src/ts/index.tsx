// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { InferenceSession, Tensor } from 'onnxruntime-web';
import { LRUCache } from 'lru-cache';
import { PluginEntryPoint, APIWrapperEnterOptions, ComponentBuilder } from 'components/plugins-entrypoint';

interface SAMPlugin {
    name: string;
    description: string;
    cvat: {
        lambda: {
            call: {
                enter: (
                    plugin: SAMPlugin,
                    taskID: number,
                    model: any,
                    args: any,
                ) => Promise<null | APIWrapperEnterOptions>;
                leave: (
                    plugin: SAMPlugin,
                    result: any,
                    taskID: number,
                    model: any,
                    args: any,
                ) => Promise<any>;
            };
        };
    };
    data: {
        core: any;
        task: any;
        modelID: string;
        modelURL: string;
        embeddings: LRUCache<string, Tensor>;
        lowResMasks: LRUCache<string, Tensor>;
        session: InferenceSession | null;
    };
    callbacks: {
        onStatusChange: ((status: string) => void) | null;
    };
}

interface ONNXInput {
    image_embeddings: Tensor;
    point_coords: Tensor;
    point_labels: Tensor;
    orig_im_size: Tensor;
    mask_input: Tensor;
    has_mask_input: Tensor;
    readonly [name: string]: Tensor;
}

interface ClickType {
    clickType: -1 | 0 | 1,
    height: number | null,
    width: number | null,
    x: number,
    y: number,
}

function getModelScale(w: number, h: number): number {
    // Input images to SAM must be resized so the longest side is 1024
    const LONG_SIDE_LENGTH = 1024;
    const samScale = LONG_SIDE_LENGTH / Math.max(h, w);
    return samScale;
}

function modelData(
    {
        clicks, tensor, modelScale, maskInput,
    }: {
        clicks: ClickType[];
        tensor: Tensor;
        modelScale: { height: number; width: number; samScale: number };
        maskInput: Tensor | null;
    },
): ONNXInput {
    const imageEmbedding = tensor;

    const n = clicks.length;
    // If there is no box input, a single padding point with
    // label -1 and coordinates (0.0, 0.0) should be concatenated
    // so initialize the array to support (n + 1) points.
    const pointCoords = new Float32Array(2 * (n + 1));
    const pointLabels = new Float32Array(n + 1);

    // Add clicks and scale to what SAM expects
    for (let i = 0; i < n; i++) {
        pointCoords[2 * i] = clicks[i].x * modelScale.samScale;
        pointCoords[2 * i + 1] = clicks[i].y * modelScale.samScale;
        pointLabels[i] = clicks[i].clickType;
    }

    // Add in the extra point/label when only clicks and no box
    // The extra point is at (0, 0) with label -1
    pointCoords[2 * n] = 0.0;
    pointCoords[2 * n + 1] = 0.0;
    pointLabels[n] = -1.0;

    // Create the tensor
    const pointCoordsTensor = new Tensor('float32', pointCoords, [1, n + 1, 2]);
    const pointLabelsTensor = new Tensor('float32', pointLabels, [1, n + 1]);
    const imageSizeTensor = new Tensor('float32', [
        modelScale.height,
        modelScale.width,
    ]);

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
    name: 'Segmeny Anything',
    description: 'Plugin handles non-default SAM serverless function output',
    cvat: {
        lambda: {
            call: {
                async enter(
                    plugin: SAMPlugin,
                    taskID: number,
                    model: any, { frame }: { frame: number },
                ): Promise<null | APIWrapperEnterOptions> {
                    if (model.id === plugin.data.modelID) {
                        if (!plugin.data.session) {
                            throw new Error('SAM plugin is not ready, session was not initialized');
                        }

                        const key = `${taskID}_${frame}`;
                        if (plugin.data.embeddings.has(key)) {
                            return { preventMethodCall: true };
                        }
                    }

                    return null;
                },

                async leave(
                    plugin: SAMPlugin,
                    result: any,
                    taskID: number,
                    model: any,
                    { frame, pos_points, neg_points }: {
                        frame: number, pos_points: number[][], neg_points: number[][],
                    },
                ): Promise<
                    {
                        mask: number[][];
                        bounds: [number, number, number, number];
                    }> {
                    if (!plugin.data.task || plugin.data.task.id !== taskID) {
                        [plugin.data.task] = await plugin.data.core.tasks.get({ id: taskID });
                    }
                    const { height: imHeight, width: imWidth } = await plugin.data.task.frames.get(frame);
                    const key = `${taskID}_${frame}`;
                    if (model.id !== plugin.data.modelID) {
                        return result;
                    }

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
                        samScale: getModelScale(imWidth, imHeight),
                    };

                    const composedClicks = [...pos_points, ...neg_points].map(([x, y], index) => ({
                        clickType: index < pos_points.length ? 1 : 0 as 0 | 1 | -1,
                        height: null,
                        width: null,
                        x,
                        y,
                    }));

                    const feeds = modelData({
                        clicks: composedClicks,
                        tensor: plugin.data.embeddings.get(key) as Tensor,
                        modelScale,
                        maskInput: plugin.data.lowResMasks.has(key) ? plugin.data.lowResMasks.get(key) as Tensor : null,
                    });

                    function toMatImage(input: number[], width: number, height: number): number[][] {
                        const image = Array(height).fill(0);
                        for (let i = 0; i < image.length; i++) {
                            image[i] = Array(width).fill(0);
                        }

                        for (let i = 0; i < input.length; i++) {
                            const row = Math.floor(i / width);
                            const col = i % width;
                            image[row][col] = input[i] * 255;
                        }

                        return image;
                    }

                    function onnxToImage(input: any, width: number, height: number): number[][] {
                        return toMatImage(input, width, height);
                    }

                    const data = await (plugin.data.session as InferenceSession).run(feeds);
                    const { masks, low_res_masks: lowResMasks } = data;
                    const imageData = onnxToImage(masks.data, masks.dims[3], masks.dims[2]);
                    plugin.data.lowResMasks.set(key, lowResMasks);

                    const xtl = Number(data.xtl.data[0]);
                    const xbr = Number(data.xbr.data[0]);
                    const ytl = Number(data.ytl.data[0]);
                    const ybr = Number(data.ybr.data[0]);

                    return {
                        mask: imageData,
                        bounds: [xtl, ytl, xbr, ybr],
                    };
                },
            },
        },
    },
    data: {
        core: null,
        task: null,
        modelID: 'pth-facebookresearch-sam-vit-h',
        modelURL: '/api/lambda/sam_detector.onnx',
        embeddings: new LRUCache({
            // float32 tensor [256, 64, 64] is 4 MB, max 512 MB
            max: 128,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        lowResMasks: new LRUCache({
            // float32 tensor [1, 256, 256] is 0.25 MB, max 32 MB
            max: 128,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        }),
        session: null,
    },
    callbacks: {
        onStatusChange: null,
    },
};

const SAMModelPlugin: ComponentBuilder = ({ core }) => {
    samPlugin.data.core = core;
    InferenceSession.create(samPlugin.data.modelURL).then((session) => {
        samPlugin.data.session = session;
        core.plugins.register(samPlugin);
    });

    return {
        name: 'Segment Anything model',
        destructor: () => {},
    };
};

function register(): void {
    if (Object.prototype.hasOwnProperty.call(window, 'cvatUI')) {
        (window as any as { cvatUI: { registerComponent: PluginEntryPoint } })
            .cvatUI.registerComponent(SAMModelPlugin);
    }
}

window.addEventListener('plugins.ready', register, { once: true });
