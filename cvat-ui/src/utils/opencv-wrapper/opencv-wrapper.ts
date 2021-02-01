// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import waitFor from '../wait-for';

import IntelligentScissorsImplementation, { IntelligentScissors } from './intelligent-scissors';

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

export interface Segmentation {
    intelligentScissorsFactory: () => IntelligentScissors;
}

export class OpenCVWrapper {
    private initialized: boolean;
    private cv: any;

    public constructor() {
        this.initialized = false;
        this.cv = null;
    }

    public async initialize(onProgress: (percent: number) => void): Promise<void> {
        const response = await fetch(`${baseURL}/opencv/opencv.js`);
        if (response.status !== 200) {
            throw new Error(`Response status ${response.status}. ${response.statusText}`);
        }

        const contentLength = response.headers.get('Content-Length');
        const { body } = response;

        if (contentLength === null) {
            throw new Error('Content length is null, but necessary');
        }

        if (body === null) {
            throw new Error('Response body is null, but necessary');
        }

        const decoder = new TextDecoder('utf-8');
        const reader = (body as ReadableStream<Uint8Array>).getReader();
        let recieved = false;
        let receivedLength = 0;
        let decodedScript = '';

        while (!recieved) {
            // await in the loop is necessary here
            // eslint-disable-next-line
            const { done, value } = await reader.read();
            recieved = done;

            if (value instanceof Uint8Array) {
                decodedScript += decoder.decode(value);
                receivedLength += value.length;
                const percentage = (receivedLength * 100) / +(contentLength as string);
                onProgress(+percentage.toFixed(0));
            }
        }

        // Inject opencv to DOM
        const scriptElement = window.document.createElement('script');
        scriptElement.text = decodedScript;
        scriptElement.type = 'text/javascript';

        let injectionError: null | Error = null;
        const errorListener = (event: ErrorEvent): void => {
            injectionError = event.error;
        };

        // need check if appending new script dinamically doesn't throw any error
        // if it does, need rethrow it to main thread via listener & closure variable
        window.addEventListener('error', errorListener);
        try {
            window.document.body.appendChild(scriptElement);
        } finally {
            // Wait while injecting, there is not any events, so we just watching for window object
            const global = window as any;
            await waitFor(
                100,
                () =>
                    injectionError ||
                    (typeof global.cv !== 'undefined' &&
                        typeof global.cv.segmentation_IntelligentScissorsMB !== 'undefined'),
            );

            window.removeEventListener('error', errorListener);

            if (!injectionError) {
                this.cv = global.cv;
                this.initialized = true;
            }
        }

        if (injectionError) {
            throw injectionError as Error;
        }
    }

    public get isInitialized(): boolean {
        return this.initialized;
    }

    public get segmentation(): Segmentation {
        if (!this.initialized) {
            throw new Error('Need to initialize OpenCV first');
        }

        return {
            intelligentScissorsFactory: () => new IntelligentScissorsImplementation(this.cv),
        };
    }
}

export default new OpenCVWrapper();
