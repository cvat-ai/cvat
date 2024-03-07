// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import {
    FrameDecoder, BlockType, DimensionType, ChunkQuality, decodeContextImages, RequestOutdatedError,
} from 'cvat-data';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { SerializedFramesMetaData } from './server-response-types';
import { Exception, ArgumentError, DataError } from './exceptions';
import { FieldUpdateTrigger } from './common';

// frame storage by job id
const frameDataCache: Record<string, {
    meta: FramesMetaData;
    chunkSize: number;
    mode: 'annotation' | 'interpolation';
    startFrame: number;
    stopFrame: number;
    decodeForward: boolean;
    forwardStep: number;
    latestFrameDecodeRequest: number | null;
    latestContextImagesRequest: number | null;
    provider: FrameDecoder;
    prefetchAnalizer: PrefetchAnalyzer;
    decodedBlocksCacheSize: number;
    activeChunkRequest: Promise<void> | null;
    activeContextRequest: Promise<Record<number, ImageBitmap>> | null;
    contextCache: Record<number, {
        data: Record<number, ImageBitmap>;
        timestamp: number;
        size: number;
    }>;
    getChunk: (chunkNumber: number, quality: ChunkQuality) => Promise<ArrayBuffer>;
}> = {};

// frame meta data storage by job id
const frameMetaCache: Record<string, Promise<FramesMetaData>> = {};

export class FramesMetaData {
    public chunkSize: number;
    public deletedFrames: Record<number, boolean>;
    public includedFrames: number[];
    public frameFilter: string;
    public frames: {
        width: number;
        height: number;
        name: string;
        related_files: number;
    }[];
    public imageQuality: number;
    public size: number;
    public startFrame: number;
    public stopFrame: number;

    #updateTrigger: FieldUpdateTrigger;

    constructor(initialData: Omit<SerializedFramesMetaData, 'deleted_frames'> & { deleted_frames: Record<number, boolean> }) {
        const data: typeof initialData = {
            chunk_size: undefined,
            deleted_frames: {},
            included_frames: [],
            frame_filter: undefined,
            frames: [],
            image_quality: undefined,
            size: undefined,
            start_frame: undefined,
            stop_frame: undefined,
        };

        this.#updateTrigger = new FieldUpdateTrigger();

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                if (property === 'deleted_frames') {
                    const update = (frame: string, remove: boolean): void => {
                        if (this.#updateTrigger.get(`deletedFrames:${frame}:${!remove}`)) {
                            this.#updateTrigger.resetField(`deletedFrames:${frame}:${!remove}`);
                        } else {
                            this.#updateTrigger.update(`deletedFrames:${frame}:${remove}`);
                        }
                    };

                    const handler = {
                        set: (target, prop, value) => {
                            update(prop, value);
                            return Reflect.set(target, prop, value);
                        },
                        deleteProperty: (target, prop) => {
                            if (prop in target) {
                                update(prop, false);
                            }
                            return Reflect.deleteProperty(target, prop);
                        },
                    };
                    data[property] = new Proxy(initialData[property], handler);
                } else {
                    data[property] = initialData[property];
                }
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                chunkSize: {
                    get: () => data.chunk_size,
                },
                deletedFrames: {
                    get: () => data.deleted_frames,
                },
                includedFrames: {
                    get: () => data.included_frames,
                },
                frameFilter: {
                    get: () => data.frame_filter,
                },
                frames: {
                    get: () => data.frames,
                },
                imageQuality: {
                    get: () => data.image_quality,
                },
                size: {
                    get: () => data.size,
                },
                startFrame: {
                    get: () => data.start_frame,
                },
                stopFrame: {
                    get: () => data.stop_frame,
                },
            }),
        );
    }

    getUpdated(): Record<string, unknown> {
        return this.#updateTrigger.getUpdated(this);
    }

    resetUpdated(): void {
        this.#updateTrigger.reset();
    }
}

export class FrameData {
    public readonly filename: string;
    public readonly width: number;
    public readonly height: number;
    public readonly number: number;
    public readonly relatedFiles: number;
    public readonly deleted: boolean;
    public readonly jobID: number;

    constructor({
        width,
        height,
        name,
        jobID,
        frameNumber,
        deleted,
        related_files: relatedFiles,
    }) {
        Object.defineProperties(
            this,
            Object.freeze({
                filename: {
                    value: name,
                    writable: false,
                },
                width: {
                    value: width,
                    writable: false,
                },
                height: {
                    value: height,
                    writable: false,
                },
                jobID: {
                    value: jobID,
                    writable: false,
                },
                number: {
                    value: frameNumber,
                    writable: false,
                },
                relatedFiles: {
                    value: relatedFiles,
                    writable: false,
                },
                deleted: {
                    value: deleted,
                    writable: false,
                },
            }),
        );
    }

    async data(onServerRequest = () => {}): Promise<ImageBitmap | Blob> {
        const result = await PluginRegistry.apiWrapper.call(this, FrameData.prototype.data, onServerRequest);
        return result;
    }
}

class PrefetchAnalyzer {
    #chunkSize: number;
    #requestedFrames: number[];

    constructor(chunkSize) {
        this.#chunkSize = chunkSize;
        this.#requestedFrames = [];
    }

    shouldPrefetchNext(current: number, isPlaying: boolean, isChunkCached: (chunk) => boolean): boolean {
        if (isPlaying) {
            return true;
        }

        const currentChunk = Math.floor(current / this.#chunkSize);
        const { length } = this.#requestedFrames;
        const isIncreasingOrder = this.#requestedFrames
            .every((val, index) => index === 0 || val > this.#requestedFrames[index - 1]);
        if (
            length && (isIncreasingOrder && current > this.#requestedFrames[length - 1]) &&
            (current % this.#chunkSize) >= Math.ceil(this.#chunkSize / 2) &&
            !isChunkCached(currentChunk + 1)
        ) {
            // is increasing order including the current frame
            // if current is in the middle+ of the chunk
            // if the next chunk was not cached yet
            return true;
        }

        return false;
    }

    addRequested(frame: number): void {
        // latest requested frame is bubbling (array is unique)
        const indexOf = this.#requestedFrames.indexOf(frame);
        if (indexOf !== -1) {
            this.#requestedFrames.splice(indexOf, 1);
        }

        this.#requestedFrames.push(frame);

        // only half of chunk size is considered in this logic
        const limit = Math.ceil(this.#chunkSize / 2);
        if (this.#requestedFrames.length > limit) {
            this.#requestedFrames.shift();
        }
    }
}

Object.defineProperty(FrameData.prototype.data, 'implementation', {
    value(this: FrameData, onServerRequest) {
        return new Promise<{
            renderWidth: number;
            renderHeight: number;
            imageData: ImageBitmap | Blob;
        } | Blob>((resolve, reject) => {
            const {
                provider, prefetchAnalizer, chunkSize, stopFrame, decodeForward, forwardStep, decodedBlocksCacheSize,
            } = frameDataCache[this.jobID];

            const requestId = +_.uniqueId();
            const chunkNumber = Math.floor(this.number / chunkSize);
            const frame = provider.frame(this.number);

            function findTheNextNotDecodedChunk(searchFrom: number): number {
                let firstFrameInNextChunk = searchFrom + forwardStep;
                let nextChunkNumber = Math.floor(firstFrameInNextChunk / chunkSize);
                while (nextChunkNumber === chunkNumber) {
                    firstFrameInNextChunk += forwardStep;
                    nextChunkNumber = Math.floor(firstFrameInNextChunk / chunkSize);
                }

                if (provider.isChunkCached(nextChunkNumber)) {
                    return findTheNextNotDecodedChunk(firstFrameInNextChunk);
                }

                return nextChunkNumber;
            }

            if (frame) {
                if (
                    prefetchAnalizer.shouldPrefetchNext(
                        this.number,
                        decodeForward,
                        (chunk) => provider.isChunkCached(chunk),
                    ) && decodedBlocksCacheSize > 1 && !frameDataCache[this.jobID].activeChunkRequest
                ) {
                    const nextChunkNumber = findTheNextNotDecodedChunk(this.number);
                    const predecodeChunksMax = Math.floor(decodedBlocksCacheSize / 2);
                    if (nextChunkNumber * chunkSize <= stopFrame &&
                        nextChunkNumber <= chunkNumber + predecodeChunksMax) {
                        provider.cleanup(1);
                        frameDataCache[this.jobID].activeChunkRequest = new Promise((resolveForward) => {
                            const releasePromise = (): void => {
                                resolveForward();
                                frameDataCache[this.jobID].activeChunkRequest = null;
                            };

                            frameDataCache[this.jobID].getChunk(
                                nextChunkNumber, ChunkQuality.COMPRESSED,
                            ).then((chunk: ArrayBuffer) => {
                                provider.requestDecodeBlock(
                                    chunk,
                                    nextChunkNumber * chunkSize,
                                    Math.min(stopFrame, (nextChunkNumber + 1) * chunkSize - 1),
                                    () => {},
                                    releasePromise,
                                    releasePromise,
                                );
                            }).catch(() => {
                                releasePromise();
                            });
                        });
                    }
                }

                resolve({
                    renderWidth: this.width,
                    renderHeight: this.height,
                    imageData: frame,
                });
                prefetchAnalizer.addRequested(this.number);
                return;
            }

            onServerRequest();
            frameDataCache[this.jobID].latestFrameDecodeRequest = requestId;
            (frameDataCache[this.jobID].activeChunkRequest || Promise.resolve()).finally(() => {
                if (frameDataCache[this.jobID].latestFrameDecodeRequest !== requestId) {
                    // not relevant request anymore
                    reject(this.number);
                    return;
                }

                // it might appear during decoding, so, check again
                const currentFrame = provider.frame(this.number);
                if (currentFrame) {
                    resolve({
                        renderWidth: this.width,
                        renderHeight: this.height,
                        imageData: currentFrame,
                    });
                    prefetchAnalizer.addRequested(this.number);
                    return;
                }

                frameDataCache[this.jobID].activeChunkRequest = new Promise<void>((
                    resolveLoadAndDecode,
                ) => {
                    let wasResolved = false;
                    frameDataCache[this.jobID].getChunk(
                        chunkNumber, ChunkQuality.COMPRESSED,
                    ).then((chunk: ArrayBuffer) => {
                        try {
                            provider
                                .requestDecodeBlock(
                                    chunk,
                                    chunkNumber * chunkSize,
                                    Math.min(stopFrame, (chunkNumber + 1) * chunkSize - 1),
                                    (_frame: number, bitmap: ImageBitmap | Blob) => {
                                        if (decodeForward) {
                                            // resolve immediately only if is not playing
                                            return;
                                        }

                                        if (frameDataCache[this.jobID].latestFrameDecodeRequest === requestId &&
                                            this.number === _frame
                                        ) {
                                            wasResolved = true;
                                            resolve({
                                                renderWidth: this.width,
                                                renderHeight: this.height,
                                                imageData: bitmap,
                                            });
                                            prefetchAnalizer.addRequested(this.number);
                                        }
                                    }, () => {
                                        frameDataCache[this.jobID].activeChunkRequest = null;
                                        resolveLoadAndDecode();
                                        const decodedFrame = provider.frame(this.number);
                                        if (decodeForward) {
                                            // resolve after decoding everything if playing
                                            resolve({
                                                renderWidth: this.width,
                                                renderHeight: this.height,
                                                imageData: decodedFrame,
                                            });
                                        } else if (!wasResolved) {
                                            reject(this.number);
                                        }
                                    }, (error: Error | RequestOutdatedError) => {
                                        frameDataCache[this.jobID].activeChunkRequest = null;
                                        resolveLoadAndDecode();
                                        if (error instanceof RequestOutdatedError) {
                                            reject(this.number);
                                        } else {
                                            reject(error);
                                        }
                                    },
                                );
                        } catch (error) {
                            reject(error);
                        }
                    }).catch((error) => {
                        reject(error);
                        resolveLoadAndDecode(error);
                    });
                });
            });
        });
    },
    writable: false,
});

async function getJobMeta(jobID: number): Promise<FramesMetaData> {
    if (!frameMetaCache[jobID]) {
        frameMetaCache[jobID] = serverProxy.frames.getMeta('job', jobID)
            .then((serverMeta) => new FramesMetaData({
                ...serverMeta,
                deleted_frames: Object.fromEntries(serverMeta.deleted_frames.map((_frame) => [_frame, true])),
            }))
            .catch((error) => {
                delete frameMetaCache[jobID];
                throw error;
            });
    }
    return frameMetaCache[jobID];
}

async function saveJobMeta(meta: FramesMetaData, jobID: number): Promise<FramesMetaData> {
    frameMetaCache[jobID] = serverProxy.frames.saveMeta('job', jobID, {
        deleted_frames: Object.keys(meta.deletedFrames).map((frame) => +frame),
    })
        .then((serverMeta) => new FramesMetaData({
            ...serverMeta,
            deleted_frames: Object.fromEntries(serverMeta.deleted_frames.map((_frame) => [_frame, true])),
        }))
        .catch((error) => {
            delete frameMetaCache[jobID];
            throw error;
        });
    return frameMetaCache[jobID];
}

function getFrameMeta(jobID, frame): SerializedFramesMetaData['frames'][0] {
    const { meta, mode, startFrame } = frameDataCache[jobID];
    let frameMeta = null;
    if (mode === 'interpolation' && meta.frames.length === 1) {
        // video tasks have 1 frame info, but image tasks will have many infos
        [frameMeta] = meta.frames;
    } else if (mode === 'annotation' || (mode === 'interpolation' && meta.frames.length > 1)) {
        if (frame > meta.stopFrame) {
            throw new ArgumentError(`Meta information about frame ${frame} can't be received from the server`);
        }
        frameMeta = meta.frames[frame - startFrame];
    } else {
        throw new DataError(`Invalid mode is specified ${mode}`);
    }

    return frameMeta;
}

export function getContextImage(jobID: number, frame: number): Promise<Record<string, ImageBitmap>> {
    return new Promise<Record<string, ImageBitmap>>((resolve, reject) => {
        if (!(jobID in frameDataCache)) {
            reject(new Error(
                'Frame data was not initialized for this job. Try first requesting any frame.',
            ));
        }
        const frameData = frameDataCache[jobID];
        const requestId = frame;
        const { startFrame } = frameData;
        const { related_files: relatedFiles } = frameData.meta.frames[frame - startFrame];

        if (relatedFiles === 0) {
            resolve({});
        } else if (frame in frameData.contextCache) {
            resolve(frameData.contextCache[frame].data);
        } else {
            frameData.latestContextImagesRequest = requestId;
            const executor = (): void => {
                if (frameData.latestContextImagesRequest !== requestId) {
                    reject(frame);
                } else if (frame in frameData.contextCache) {
                    resolve(frameData.contextCache[frame].data);
                } else {
                    frameData.activeContextRequest = serverProxy.frames.getImageContext(jobID, frame)
                        .then((encodedImages) => decodeContextImages(encodedImages, 0, relatedFiles));
                    frameData.activeContextRequest.then((images) => {
                        const size = Object.values(images)
                            .reduce((acc, image) => acc + image.width * image.height * 4, 0);
                        const totalSize = Object.values(frameData.contextCache)
                            .reduce((acc, item) => acc + item.size, 0);
                        if (totalSize > 512 * 1024 * 1024) {
                            const [leastTimestampFrame] = Object.entries(frameData.contextCache)
                                .sort(([, item1], [, item2]) => item1.timestamp - item2.timestamp)[0];
                            delete frameData.contextCache[leastTimestampFrame];
                        }

                        frameData.contextCache[frame] = {
                            data: images,
                            timestamp: Date.now(),
                            size,
                        };

                        if (frameData.latestContextImagesRequest !== requestId) {
                            reject(frame);
                        } else {
                            resolve(images);
                        }
                    }).finally(() => {
                        frameData.activeContextRequest = null;
                    });
                }
            };

            if (!frameData.activeContextRequest) {
                executor();
            } else {
                const checkAndExecute = (): void => {
                    if (frameData.activeContextRequest) {
                        // if we just execute in finally
                        // it might raise multiple server requests for context images
                        // if the promise was pending before and several requests came for the same frame
                        // all these requests will stuck on "finally"
                        // and when the promise fullfilled, it will run all the microtasks
                        // since they all have the same request id, all they will perform in executor()
                        frameData.activeContextRequest.finally(() => setTimeout(checkAndExecute));
                    } else {
                        executor();
                    }
                };

                setTimeout(checkAndExecute);
            }
        }
    });
}

export function decodePreview(preview: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(preview);
    });
}

export async function getFrame(
    jobID: number,
    chunkSize: number,
    chunkType: 'video' | 'imageset',
    mode: 'interpolation' | 'annotation', // todo: obsolete, need to remove
    frame: number,
    startFrame: number,
    stopFrame: number,
    isPlaying: boolean,
    step: number,
    dimension: DimensionType,
    getChunk: (chunkNumber: number, quality: ChunkQuality) => Promise<ArrayBuffer>,
): Promise<FrameData> {
    if (!(jobID in frameDataCache)) {
        const blockType = chunkType === 'video' ? BlockType.MP4VIDEO : BlockType.ARCHIVE;
        const meta = await getJobMeta(jobID);

        const mean = meta.frames.reduce((a, b) => a + b.width * b.height, 0) / meta.frames.length;
        const stdDev = Math.sqrt(
            meta.frames.map((x) => (x.width * x.height - mean) ** 2).reduce((a, b) => a + b) /
            meta.frames.length,
        );

        // limit of decoded frames cache by 2GB
        const decodedBlocksCacheSize = Math.min(
            Math.floor((2048 * 1024 * 1024) / ((mean + stdDev) * 4 * chunkSize)) || 1, 10,
        );
        frameDataCache[jobID] = {
            meta,
            chunkSize,
            mode,
            startFrame,
            stopFrame,
            decodeForward: isPlaying,
            forwardStep: step,
            provider: new FrameDecoder(
                blockType,
                chunkSize,
                decodedBlocksCacheSize,
                dimension,
            ),
            prefetchAnalizer: new PrefetchAnalyzer(chunkSize),
            decodedBlocksCacheSize,
            activeChunkRequest: null,
            activeContextRequest: null,
            latestFrameDecodeRequest: null,
            latestContextImagesRequest: null,
            contextCache: {},
            getChunk,
        };
    }

    const frameMeta = getFrameMeta(jobID, frame);
    frameDataCache[jobID].provider.setRenderSize(frameMeta.width, frameMeta.height);
    frameDataCache[jobID].decodeForward = isPlaying;
    frameDataCache[jobID].forwardStep = step;

    return new FrameData({
        width: frameMeta.width,
        height: frameMeta.height,
        name: frameMeta.name,
        related_files: frameMeta.related_files,
        frameNumber: frame,
        deleted: frame in frameDataCache[jobID].meta.deletedFrames,
        jobID,
    });
}

export async function getDeletedFrames(instanceType: 'job' | 'task', id): Promise<Record<number, boolean>> {
    if (instanceType === 'job') {
        const { meta } = frameDataCache[id];
        return meta.deletedFrames;
    }

    if (instanceType === 'task') {
        const meta = await serverProxy.frames.getMeta('task', id);
        return Object.fromEntries(meta.deleted_frames.map((_frame) => [_frame, true]));
    }

    throw new Exception(`getDeletedFrames is not implemented for ${instanceType}`);
}

export function deleteFrame(jobID: number, frame: number): void {
    const { meta } = frameDataCache[jobID];
    meta.deletedFrames[frame] = true;
}

export function restoreFrame(jobID: number, frame: number): void {
    const { meta } = frameDataCache[jobID];
    delete meta.deletedFrames[frame];
}

export async function patchMeta(jobID: number): Promise<void> {
    const { meta } = frameDataCache[jobID];
    const updatedFields = meta.getUpdated();

    if (Object.keys(updatedFields).length) {
        const newMeta = await saveJobMeta(meta, jobID);
        frameDataCache[jobID].meta = newMeta;
    }
}

export async function findFrame(
    jobID: number, frameFrom: number, frameTo: number, filters: { offset?: number, notDeleted: boolean },
): Promise<number | null> {
    const offset = filters.offset || 1;
    const meta = await getJobMeta(jobID);

    const sign = Math.sign(frameTo - frameFrom);
    const predicate = sign > 0 ? (frame) => frame <= frameTo : (frame) => frame >= frameTo;
    const update = sign > 0 ? (frame) => frame + 1 : (frame) => frame - 1;
    let framesCounter = 0;
    let lastUndeletedFrame = null;
    const check = (frame): boolean => {
        if (meta.includedFrames) {
            return (meta.includedFrames.includes(frame)) &&
            (!filters.notDeleted || !(frame in meta.deletedFrames));
        }
        if (filters.notDeleted) {
            return !(frame in meta.deletedFrames);
        }
        return true;
    };
    for (let frame = frameFrom; predicate(frame); frame = update(frame)) {
        if (check(frame)) {
            lastUndeletedFrame = frame;
            framesCounter++;
            if (framesCounter === offset) {
                return lastUndeletedFrame;
            }
        }
    }

    return lastUndeletedFrame;
}

export function getCachedChunks(jobID): number[] {
    if (!(jobID in frameDataCache)) {
        return [];
    }

    return frameDataCache[jobID].provider.cachedChunks(true);
}

export function clear(jobID: number): void {
    if (jobID in frameDataCache) {
        delete frameDataCache[jobID];
        delete frameMetaCache[jobID];
    }
}
