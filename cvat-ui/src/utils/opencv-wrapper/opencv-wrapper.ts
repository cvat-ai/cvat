// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ShapeType, getCore } from 'cvat-core-wrapper';
import config from 'config';
import TrackerMILAction from './annotations-actions/tracker-mil';

const core = getCore();

type OpenCVInterface = ReturnType<typeof core.opencv.createOpenCVInterface>;
export type IntelligentScissors = ReturnType<OpenCVInterface['segmentation']['intelligentScissorsFactory']>;

type OpenCVTrackingWrapper = OpenCVInterface['tracking'] & {
    trackerMIL: {
        model: () => ReturnType<OpenCVInterface['tracking']['trackerMIL']['model']>,
        name: string,
        description: string,
        kind: string,
    }
};
export type OpenCVTracker = OpenCVTrackingWrapper['trackerMIL'];

export class OpenCVWrapper {
    private initialized: boolean;
    private onProgress: ((percent: number) => void) | null;
    private injectionProcess: Promise<void> | null;
    private cvInterface: OpenCVInterface | null;

    public constructor() {
        this.initialized = false;
        this.onProgress = null;
        this.injectionProcess = null;
        this.cvInterface = null;
    }

    private getCVInterface(): OpenCVInterface {
        if (!this.cvInterface) {
            throw new Error('OpenCV is not initialized. Please call initialize() method first.');
        }
        return this.cvInterface;
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

        this.cvInterface = core.opencv.createOpenCVInterface((window as any).cv);
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

    public get mat(): OpenCVInterface['mat'] {
        return this.getCVInterface().mat;
    }

    public get matVector(): OpenCVInterface['matVector'] {
        return this.getCVInterface().matVector;
    }

    public get contours(): OpenCVInterface['contours'] {
        return this.getCVInterface().contours;
    }

    public get enums(): OpenCVInterface['enums'] {
        return this.getCVInterface().enums;
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
            const src = this.mat.fromData(width, height, this.enums.MatType.CV_8UC1, mask);

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

    public get segmentation(): OpenCVInterface['segmentation'] {
        return this.getCVInterface().segmentation;
    }

    public get imgproc(): OpenCVInterface['imgproc'] {
        return this.getCVInterface().imgproc;
    }

    public get utils(): OpenCVInterface['utils'] {
        return this.getCVInterface().utils;
    }

    public get tracking(): OpenCVTrackingWrapper {
        return {
            trackerMIL: {
                model: () => this.getCVInterface().tracking.trackerMIL.model(),
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
