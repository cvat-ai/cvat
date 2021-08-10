// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import waitFor from '../wait-for';
import HistogramEqualizationImplementation, { HistogramEqualization } from './histogram-equalization';

import IntelligentScissorsImplementation, { IntelligentScissors } from './intelligent-scissors';

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

export interface Segmentation {
    intelligentScissorsFactory: () => IntelligentScissors;
}

export interface Contours {
    approxPoly: (points: number[] | any, threshold: number, closed?: boolean) => number[][];
}

export interface ImgProc {
    hist: () => HistogramEqualization;
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

        if (body === null) {
            throw new Error('Response body is null, but necessary');
        }

        const decoder = new TextDecoder('utf-8');
        const reader = (body as ReadableStream<Uint8Array>).getReader();
        let received = false;
        let receivedLength = 0;
        let decodedScript = '';

        while (!received) {
            // await in the loop is necessary here
            // eslint-disable-next-line
            const { done, value } = await reader.read();
            received = done;

            if (value instanceof Uint8Array) {
                decodedScript += decoder.decode(value);
                receivedLength += value.length;
                // Cypress workaround: content-length is always zero in cypress, it is done optional here
                // Just progress bar will be disabled
                const percentage = contentLength ? (receivedLength * 100) / +(contentLength as string) : 0;
                onProgress(+percentage.toFixed(0));
            }
        }

        // Inject opencv to DOM
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const OpenCVConstructor = new Function(decodedScript);
        OpenCVConstructor();

        const global = window as any;
        await waitFor(
            100,
            () =>
                typeof global.cv !== 'undefined' && typeof global.cv.segmentation_IntelligentScissorsMB !== 'undefined',
        );

        this.cv = global.cv;
        this.initialized = true;
    }

    public get isInitialized(): boolean {
        return this.initialized;
    }

    public get contours(): Contours {
        if (!this.initialized) {
            throw new Error('Need to initialize OpenCV first');
        }

        const { cv } = this;
        return {
            approxPoly: (points: number[] | number[][], threshold: number, closed = true): number[][] => {
                const isArrayOfArrays = Array.isArray(points[0]);
                if (points.length < 3) {
                    // one pair of coordinates [x, y], approximation not possible
                    return (isArrayOfArrays ? points : [points]) as number[][];
                }
                const rows = isArrayOfArrays ? points.length : points.length / 2;
                const cols = 2;

                const approx = new cv.Mat();
                const contour = cv.matFromArray(rows, cols, cv.CV_32FC1, points.flat());
                try {
                    cv.approxPolyDP(contour, approx, threshold, closed); // approx output type is CV_32F
                    const result = [];
                    for (let row = 0; row < approx.rows; row++) {
                        result.push([approx.floatAt(row, 0), approx.floatAt(row, 1)]);
                    }
                    return result;
                } finally {
                    approx.delete();
                    contour.delete();
                }
            },
        };
    }

    public get segmentation(): Segmentation {
        if (!this.initialized) {
            throw new Error('Need to initialize OpenCV first');
        }

        return {
            intelligentScissorsFactory: () => new IntelligentScissorsImplementation(this.cv),
        };
    }

    public get imgproc(): ImgProc {
        if (!this.initialized) {
            throw new Error('Need to initialize OpenCV first');
        }
        return {
            hist: () => new HistogramEqualizationImplementation(this.cv),
        };
    }
}

export default new OpenCVWrapper();
