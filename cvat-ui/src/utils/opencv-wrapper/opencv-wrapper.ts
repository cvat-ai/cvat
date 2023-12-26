// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ShapeType, getCore } from 'cvat-core-wrapper';
import waitFor from 'utils/wait-for';
import config from 'config';
import HistogramEqualizationImplementation, { HistogramEqualization } from './histogram-equalization';
import TrackerMImplementation from './tracker-mil';
import IntelligentScissorsImplementation, { IntelligentScissors } from './intelligent-scissors';
import { OpenCVTracker } from './opencv-interfaces';

const core = getCore();

export interface Segmentation {
    intelligentScissorsFactory: (onChangeToolsBlockerState:(event:string)=>void) => IntelligentScissors;
}

export interface MatSpace {
    fromData: (width: number, height: number, type: MatType, data: number[]) => any;
}

export interface MatVectorSpace {
    empty: () => any;
}

export interface Contours {
    convexHull: (src: any) => number[];
    findContours: (src: any, findLongest: boolean) => number[][];
    approxPoly: (points: number[] | any, threshold: number, closed?: boolean) => number[][];
}

export interface ImgProc {
    hist: () => HistogramEqualization;
}

export interface Tracking {
    trackerMIL: OpenCVTracker;
}

export enum MatType {
    CV_8UC1,
    CV_8UC3,
    CV_8UC4,
}

export class OpenCVWrapper {
    private initialized: boolean;
    private cv: any;
    private onProgress: ((percent: number) => void) | null;
    private injectionProcess: Promise<void> | null;

    public constructor() {
        this.initialized = false;
        this.cv = null;
        this.onProgress = null;
        this.injectionProcess = null;
    }

    private checkInitialization(): void {
        if (!this.initialized) {
            throw new Error('Need to initialize OpenCV first');
        }
    }

    private async inject(): Promise<void> {
        const response = await fetch(config.OPENCV_PATH);
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
                if (this.onProgress) this.onProgress(+percentage.toFixed(0));
            }
        }

        let runtimeInitialized = false;
        (window as any).Module = {
            onRuntimeInitialized: () => {
                runtimeInitialized = true;
                delete (window as any).Module;
            },
        };
        // Inject opencv to DOM
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const OpenCVConstructor = new Function(decodedScript);
        OpenCVConstructor();
        this.cv = (window as any).cv;
        await waitFor(2, () => runtimeInitialized);
    }

    public async initialize(onProgress: (percent: number) => void): Promise<void> {
        this.onProgress = onProgress;

        if (!this.injectionProcess) {
            this.injectionProcess = this.inject();
        }
        await this.injectionProcess;

        this.injectionProcess = null;
        this.initialized = true;
    }

    public removeProgressCallback(): void {
        this.onProgress = null;
    }

    public get isInitialized(): boolean {
        return this.initialized;
    }

    public get initializationInProgress(): boolean {
        return !!this.injectionProcess;
    }

    public get mat(): MatSpace {
        this.checkInitialization();
        const { cv } = this;
        return {
            fromData: (width: number, height: number, type: MatType, data: number[]) => {
                const typeToCVType = {
                    [MatType.CV_8UC1]: cv.CV_8UC1,
                    [MatType.CV_8UC3]: cv.CV_8UC3,
                    [MatType.CV_8UC4]: cv.CV_8UC4,
                };

                const mat = cv.matFromArray(height, width, typeToCVType[type], data);
                return mat;
            },
        };
    }

    public get matVector(): MatVectorSpace {
        this.checkInitialization();
        const { cv } = this;
        return {
            empty: () => new cv.MatVector(),
        };
    }

    public get contours(): Contours {
        this.checkInitialization();
        const { cv } = this;
        return {
            convexHull: (contours: number[][]): number[] => {
                const points = contours.flat();
                const input = cv.matFromArray(points.length / 2, 1, cv.CV_32SC2, points);
                const output = new cv.Mat();
                try {
                    cv.convexHull(input, output, false, true);
                    return Array.from(output.data32S);
                } finally {
                    output.delete();
                    input.delete();
                }
            },
            findContours: (src: any, findLongest: boolean): number[][] => {
                const contours = this.matVector.empty();
                const hierarchy = new cv.Mat();
                const expanded = new cv.Mat();
                const kernel = cv.Mat.ones(2, 2, cv.CV_8U);
                const anchor = new cv.Point(-1, -1);
                const jsContours: number[][] = [];
                try {
                    cv.copyMakeBorder(src, expanded, 1, 1, 1, 1, cv.BORDER_CONSTANT);
                    // morpth transform to get better contour including all the pixels
                    cv.dilate(
                        expanded,
                        expanded,
                        kernel,
                        anchor,
                        1,
                        cv.BORDER_CONSTANT,
                        cv.morphologyDefaultBorderValue(),
                    );
                    cv.findContours(expanded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
                    for (let i = 0; i < contours.size(); i++) {
                        const contour = contours.get(i);
                        // substract offset we created when copied source image
                        jsContours.push(Array.from(contour.data32S as number[]).map((el) => el - 1));
                        contour.delete();
                    }
                } finally {
                    kernel.delete();
                    expanded.delete();
                    hierarchy.delete();
                    contours.delete();
                }

                if (findLongest) {
                    return [jsContours.sort((arr1, arr2) => arr2.length - arr1.length)[0]];
                }

                return jsContours;
            },
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

    public getContoursFromState = async (state: ObjectState): Promise<number[][]> => {
        const points = state.points as number[];
        if (state.shapeType === ShapeType.MASK) {
            if (!this.isInitialized) {
                try {
                    await this.initialize(() => {});
                } catch (error: any) {
                    throw new Error('Could not initialize OpenCV');
                }
            }

            const [left, top, right, bottom] = points.slice(-4);
            const width = right - left + 1;
            const height = bottom - top + 1;

            const mask = core.utils.rle2Mask(points.slice(0, -4), width, height);
            const src = this.mat.fromData(width, height, MatType.CV_8UC1, mask);

            try {
                const contours = this.contours.findContours(src, false);
                if (contours.length) {
                    return contours.map((contour) => contour.map((val, idx) => {
                        if (idx % 2) {
                            return val + top;
                        }
                        return val + left;
                    }));
                }
                throw new Error('Empty contour received from state');
            } finally {
                src.delete();
            }
        } else if (state.shapeType === ShapeType.POLYGON) {
            return [points];
        }

        throw new Error(`Not implemented getContour for ${state.shapeType}`);
    };

    public getContourFromState = async (state: ObjectState): Promise<number[]> => {
        const contours = await this.getContoursFromState(state);
        return contours.length > 1 ? this.contours.convexHull(contours) : contours[0];
    };

    public get segmentation(): Segmentation {
        this.checkInitialization();
        return {
            intelligentScissorsFactory:
            (onChangeToolsBlockerState:
            (event:string)=>void) => new IntelligentScissorsImplementation(this.cv, onChangeToolsBlockerState),
        };
    }

    public get imgproc(): ImgProc {
        this.checkInitialization();
        return {
            hist: () => new HistogramEqualizationImplementation(this.cv),
        };
    }

    public get tracking(): Tracking {
        this.checkInitialization();
        return {
            trackerMIL: {
                model: () => new TrackerMImplementation(this.cv),
                name: 'TrackerMIL',
                description: 'Light client-side model useful to track simple objects',
                kind: 'opencv_tracker_mil',
            },
        };
    }
}

export default new OpenCVWrapper();
