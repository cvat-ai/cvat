// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { InferenceSession, env, Tensor } from 'onnxruntime-web';

let decoder: InferenceSession | null = null;

env.wasm.wasmPaths = '/assets/';

export enum WorkerAction {
    INIT = 'init',
    DECODE = 'decode',
}

export interface InitBody {
    decoderURL: string;
}

export interface DecodeBody {
    imageEmbeddings: Float32Array;
    pointCoords: Float32Array;
    pointLabels: Float32Array;
    maskInput: Float32Array | null;
    width: number;
    height: number;
}

export interface WorkerOutput {
    action: WorkerAction;
    error?: string;
}

export interface WorkerInput {
    action: WorkerAction;
    payload: InitBody | DecodeBody;
}

const errorToMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }

    console.error(error);
    return 'Unknown error, please check console';
};

// eslint-disable-next-line no-restricted-globals
if ((self as any).importScripts) {
    onmessage = (e: MessageEvent<WorkerInput>) => {
        if (e.data.action === WorkerAction.INIT) {
            if (decoder) {
                return;
            }

            const body = e.data.payload as InitBody;
            InferenceSession.create(body.decoderURL).then((decoderSession) => {
                decoder = decoderSession;
                postMessage({ action: WorkerAction.INIT });
            }).catch((error: unknown) => {
                postMessage({ action: WorkerAction.INIT, error: errorToMessage(error) });
            });
        } else if (!decoder) {
            postMessage({
                action: e.data.action,
                error: 'Worker was not initialized',
            });
        } else if (e.data.action === WorkerAction.DECODE) {
            const body = e.data.payload as DecodeBody;
            const inputs: Record<string, Tensor> = {
                image_embeddings: new Tensor('float32', body.imageEmbeddings, [1, 256, 64, 64]),
                point_coords: new Tensor('float32', body.pointCoords, [1, body.pointCoords.length / 2, 2]),
                point_labels: new Tensor('float32', body.pointLabels, [1, body.pointLabels.length]),
                orig_im_size: new Tensor('float32', [body.height, body.width]),
                mask_input: body.maskInput ?
                    new Tensor('float32', body.maskInput, [1, 1, 256, 256]) :
                    new Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
                has_mask_input: new Tensor('float32', [body.maskInput ? 1 : 0]),
            };

            decoder.run(inputs).then((results) => (
                Promise.all([
                    results.xtl.getData(),
                    results.ytl.getData(),
                    results.xbr.getData(),
                    results.ybr.getData(),
                    results.masks.getData(),
                    results.low_res_masks.getData(),
                ])
            )).then(([xtl, ytl, xbr, ybr, mask, lowResMask]) => {
                postMessage({
                    action: WorkerAction.DECODE,
                    payload: {
                        mask,
                        lowResMask,
                        xtl: Number(xtl[0]),
                        ytl: Number(ytl[0]),
                        xbr: Number(xbr[0]),
                        ybr: Number(ybr[0]),
                    },
                });
            }).catch((error: unknown) => {
                postMessage({ action: WorkerAction.DECODE, error: errorToMessage(error) });
            });
        }
    };
}
