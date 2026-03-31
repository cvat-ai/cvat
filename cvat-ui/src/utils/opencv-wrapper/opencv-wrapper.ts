// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ShapeType, getCore } from 'cvat-core-wrapper';
import config from 'config';
import HistogramEqualizationImplementation, { HistogramEqualization } from './histogram-equalization';
import TrackerMImplementation from './tracker-mil';
import IntelligentScissorsImplementation, { IntelligentScissors } from './intelligent-scissors';
import { OpenCVTracker } from './opencv-interfaces';
import TrackerMILAction from './annotations-actions/tracker-mil';

const core = getCore();

export interface Segmentation {
    intelligentScissorsFactory: () => IntelligentScissors;
}

export interface MatSpace {
    fromData: (width: number, height: number, type: MatType, data: ArrayLike<number>) => any;
}

export interface MatVectorSpace {
    empty: () => any;
}

export interface Contours {
    convexHull: (src: [number, number][][]) => [number, number][];
    findContours: (src: any) => [number, number][][];
    approxPoly: (points: [number, number][], threshold: number, closed?: boolean) => [number, number][];
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
        let cacheStore: Cache | null = null;
        try {
            const CACHE_NAME = 'cached_assets';
            cacheStore = 'caches' in window ? await caches?.open(CACHE_NAME) : null;
        } catch (_) {
            // cache not available, do nothing
        }

        let response = await cacheStore?.match(config.OPENCV_PATH);
        const fromCache = !!response;

        if (!response) {
            response = await fetch(config.OPENCV_PATH);

            if (!response.ok) {
                throw new Error(`Could not fetch data from the server: ${response.status} ${response.statusText}`);
            }
        }

        let bytes: Uint8Array;
        if (fromCache) {
            bytes = new Uint8Array(await response.arrayBuffer());
            this.onProgress?.(100);
        } else {
            const contentLengthHeader = response.headers.get('Content-Length');
            const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
            let received = false;
            let receivedLength = 0;

            if (response.body === null) {
                throw new Error('Unexpected response body');
            }

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            while (!received) {
                const { done, value } = await reader.read();
                received = done;

                if (value instanceof Uint8Array) {
                    chunks.push(value);
                    receivedLength += value.length;

                    // Cypress workaround: content-length is always zero in cypress, it is done optional here
                    // Just progress bar will be disabled
                    const percentage = contentLength ? (receivedLength * 100) / contentLength : 0;
                    this.onProgress?.(+percentage.toFixed(0));
                }
            }

            let offset = 0;
            bytes = new Uint8Array(receivedLength);
            for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.length;
            }

            if (cacheStore) {
                try {
                    // content may be gzip-encoded, but we store decoded version
                    // so, need to remove irrelevant headers
                    const headers = new Headers(response.headers);
                    headers.delete('Content-Encoding');
                    headers.delete('Content-Length');
                    headers.set('Content-Length', bytes.length.toString());
                    const cachedResponse = new Response(bytes.slice(), { headers });
                    await cacheStore.put(config.OPENCV_PATH, cachedResponse);
                } catch (_) {
                    // could not write to cache, but ok, do nothing
                }
            }
        }

        const decodedScript = new TextDecoder('utf-8').decode(bytes!);
        await new Promise<void>((resolve, reject) => {
            (window as any).Module = {
                onRuntimeInitialized: () => {
                    delete (window as any).Module;
                    resolve();
                },
            };

            try {
                // Inject OpenCV to DOM
                // eslint-disable-next-line @typescript-eslint/no-implied-eval
                const OpenCVConstructor = new Function(decodedScript);
                OpenCVConstructor();
            } catch (error: unknown) {
                delete (window as any).Module;
                reject(new Error(`Initialization error: ${error instanceof Error ? error.message : 'unknown'}`));
            }
        });

        this.cv = (window as any).cv;
    }

    public async initialize(onProgress: (percent: number) => void): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.onProgress = onProgress;
        this.injectionProcess = this.injectionProcess ?? this.inject();

        try {
            await this.injectionProcess;
        } finally {
            this.onProgress = null;
            this.injectionProcess = null;
        }

        this.initialized = true;
    }

    public get isInitialized(): boolean {
        return this.initialized;
    }

    public get initializationInProgress(): boolean {
        return !!this.injectionProcess;
    }

    public get mat(): MatSpace {
        const { cv } = this;
        return {
            fromData: (width: number, height: number, type: MatType, data: ArrayLike<number>) => {
                this.checkInitialization();
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
        const { cv } = this;
        return {
            empty: () => {
                this.checkInitialization();
                return new cv.MatVector();
            },
        };
    }

    public get contours(): Contours {
        const { cv } = this;
        return {
            convexHull: (contours: [number, number][][]): [number, number][] => {
                this.checkInitialization();

                const points = contours.flat(2) as number[];
                const input = cv.matFromArray(points.length / 2, 1, cv.CV_32SC2, points);
                const output = new cv.Mat();
                try {
                    cv.convexHull(input, output, false, true);
                    const result = Array.from(output.data32S as number[]);
                    const converted: [number, number][] = [];
                    for (let i = 0; i < result.length; i += 2) {
                        converted.push([result[i], result[i + 1]]);
                    }
                    return converted;
                } finally {
                    output.delete();
                    input.delete();
                }
            },
            findContours: (src: any): [number, number][][] => {
                type ArrayWithPixelLength = Array<Array<[number, number]> & { pixelLength?: number }>;
                this.checkInitialization();

                const contours = this.matVector.empty();
                const hierarchy = new cv.Mat();
                const expanded = new cv.Mat();
                const kernel = cv.Mat.ones(2, 2, cv.CV_8U);
                const anchor = new cv.Point(-1, -1);
                const jsContours: ArrayWithPixelLength = [];
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
                        const converted: [number, number][] = [];

                        let prevX = contour.data32S[0] - 1;
                        let prevY = contour.data32S[1] - 1;
                        let contourLength = 0;
                        for (let j = 0; j < contour.data32S.length; j += 2) {
                            // subtract offset we created when copied source image
                            const x = contour.data32S[j] - 1;
                            const y = contour.data32S[j + 1] - 1;
                            converted.push([x, y]);
                            contourLength += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
                            prevX = x;
                            prevY = y;
                        }

                        Object.defineProperty(converted, 'pixelLength', {
                            value: contourLength,
                            writable: false,
                        });

                        jsContours.push(converted);
                        contour.delete();
                    }
                } finally {
                    kernel.delete();
                    expanded.delete();
                    hierarchy.delete();
                    contours.delete();
                }

                return jsContours.sort((arr1, arr2) => (arr2.pixelLength || 0) - (arr1.pixelLength || 0));
            },
            approxPoly: (points: [number, number][], threshold: number, closed = true): [number, number][] => {
                this.checkInitialization();

                if (points.length < 3) {
                    // nothing to approximate
                    return points;
                }

                const rows = points.length;
                const cols = 2;
                const approx = new cv.Mat();
                const contour = cv.matFromArray(rows, cols, cv.CV_32FC1, points.flat());
                try {
                    cv.approxPolyDP(contour, approx, threshold, closed); // approx output type is CV_32F
                    const result: [number, number][] = [];
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

    public getContoursFromStateSync = (
        state: { points: Int32Array; shapeType: ShapeType },
    ): [number, number][][] => {
        if (state.shapeType === ShapeType.MASK) {
            const { length } = state.points;
            const left = state.points[length - 4];
            const top = state.points[length - 3];
            const right = state.points[length - 2];
            const bottom = state.points[length - 1];
            const width = right - left + 1;
            const height = bottom - top + 1;

            const mask = core.utils.rle2Mask(state.points.subarray(0, -4), width, height);
            const src = this.mat.fromData(width, height, MatType.CV_8UC1, mask);

            try {
                const contours = this.contours.findContours(src);
                if (contours.length) {
                    return contours.map((contour) => contour.map((val) => (
                        [val[0] + left, val[1] + top]
                    )));
                }
                throw new Error('Empty contour received from state');
            } finally {
                src.delete();
            }
        }

        throw new Error(`Not implemented getContour for ${state.shapeType}`);
    };

    public getContoursFromState = async (
        state: { points: Int32Array; shapeType: ShapeType },
    ): Promise<[number, number][][]> => {
        if (!this.isInitialized) {
            try {
                await this.initialize(() => {});
            } catch (error: any) {
                throw new Error('Could not initialize OpenCV');
            }
        }

        return this.getContoursFromStateSync(state);
    };

    public getContourFromState = async (state: ObjectState): Promise<[number, number][]> => {
        const contours = await this.getContoursFromState({
            points: Int32Array.from(state.points!),
            shapeType: state.shapeType,
        });
        return contours.length > 1 ? this.contours.convexHull(contours) : contours[0];
    };

    public get segmentation(): Segmentation {
        return {
            intelligentScissorsFactory: () => {
                this.checkInitialization();
                return new IntelligentScissorsImplementation(this.cv);
            },
        };
    }

    public get imgproc(): ImgProc {
        return {
            hist: () => {
                this.checkInitialization();
                return new HistogramEqualizationImplementation(this.cv);
            },
        };
    }

    public get tracking(): Tracking {
        return {
            trackerMIL: {
                model: () => {
                    this.checkInitialization();
                    return new TrackerMImplementation(this.cv);
                },
                name: 'TrackerMIL',
                description: 'Lightweight client-side algorithm, useful to track simple objects',
                kind: 'opencv_tracker_mil',
            },
        };
    }
}

const openCVWrapper = new OpenCVWrapper();
await core.actions.register(new TrackerMILAction(openCVWrapper));
export default openCVWrapper;
