// Copyright (C) 2024 CVAT.ai Corporation
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
    image_embeddings: Tensor;
    point_coords: Tensor;
    point_labels: Tensor;
    orig_im_size: Tensor;
    mask_input: Tensor;
    has_mask_input: Tensor;
    readonly [name: string]: Tensor;
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
            decoder.run((e.data.payload as DecodeBody)).then((results) => {
                postMessage({
                    action: WorkerAction.DECODE,
                    payload: {
                        masks: results.masks,
                        lowResMasks: results.low_res_masks,
                        xtl: Number(results.xtl.data[0]),
                        ytl: Number(results.ytl.data[0]),
                        xbr: Number(results.xbr.data[0]),
                        ybr: Number(results.ybr.data[0]),
                    },
                });
            }).catch((error: unknown) => {
                postMessage({ action: WorkerAction.DECODE, error: errorToMessage(error) });
            });
        }
    };
}
