// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _, { range, sortedIndexOf } from 'lodash';
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
    prefetchAnalyzer: PrefetchAnalyzer;
    decodedBlocksCacheSize: number;
    activeChunkRequest: Promise<void> | null;
    activeContextRequest: Promise<Record<number, ImageBitmap>> | null;
    contextCache: Record<number, {
        data: Record<number, ImageBitmap>;
        timestamp: number;
        size: number;
    }>;
    getChunk: (chunkIndex: number, quality: ChunkQuality) => Promise<ArrayBuffer>;
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
    public frameStep: number;
    public chunkCount: number;

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

        const frameStep: number = (() => {
            if (data.frame_filter) {
                const frameStepParts = data.frame_filter.split('=', 2);
                if (frameStepParts.length !== 2) {
                    throw new ArgumentError(`Invalid frame filter '${data.frame_filter}'`);
                }
                return +frameStepParts[1];
            }
            return 1;
        })();

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
                frameStep: {
                    get: () => frameStep,
                },
            }),
        );

        const chunkCount: number = Math.ceil(this.getDataFrameNumbers().length / this.chunkSize);

        Object.defineProperties(
            this,
            Object.freeze({
                chunkCount: {
                    get: () => chunkCount,
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

    getFrameIndex(dataFrameNumber: number): number {
        // Here we use absolute (task source data) frame numbers.
        // TODO: migrate from data frame numbers to local frame numbers to simplify code.
        // Requires server changes in api/jobs/{id}/data/meta/
        // for included_frames, start_frame, stop_frame fields

        if (dataFrameNumber < this.startFrame || dataFrameNumber > this.stopFrame) {
            throw new ArgumentError(`Frame number ${dataFrameNumber} doesn't belong to the job`);
        }

        let frameIndex = null;
        if (this.includedFrames) {
            frameIndex = sortedIndexOf(this.includedFrames, dataFrameNumber);
            if (frameIndex === -1) {
                throw new ArgumentError(`Frame number ${dataFrameNumber} doesn't belong to the job`);
            }
        } else {
            frameIndex = Math.floor((dataFrameNumber - this.startFrame) / this.frameStep);
        }
        return frameIndex;
    }

    getFrameChunkIndex(dataFrameNumber: number): number {
        return Math.floor(this.getFrameIndex(dataFrameNumber) / this.chunkSize);
    }

    getDataFrameNumbers(): number[] {
        if (this.includedFrames) {
            return this.includedFrames;
        }

        return range(this.startFrame, this.stopFrame + 1, this.frameStep);
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
    #requestedFrames: number[];
    #meta: FramesMetaData;
    #getDataFrameNumber: (frameNumber: number) => number;

    constructor(meta: FramesMetaData, dataFrameNumberGetter: (frameNumber: number) => number) {
        this.#requestedFrames = [];
        this.#meta = meta;
        this.#getDataFrameNumber = dataFrameNumberGetter;
    }

    shouldPrefetchNext(current: number, isPlaying: boolean, isChunkCached: (chunk) => boolean): boolean {
        if (isPlaying) {
            return true;
        }

        const currentDataFrameNumber = this.#getDataFrameNumber(current);
        const currentChunk = this.#meta.getFrameChunkIndex(currentDataFrameNumber);
        const { length } = this.#requestedFrames;
        const isIncreasingOrder = this.#requestedFrames
            .every((val, index) => index === 0 || val > this.#requestedFrames[index - 1]);
        if (
            length && (isIncreasingOrder && current > this.#requestedFrames[length - 1]) &&
            (
                this.#meta.getFrameIndex(currentDataFrameNumber) % this.#meta.chunkSize
            ) >= Math.ceil(this.#meta.chunkSize / 2) &&
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
        const limit = Math.ceil(this.#meta.chunkSize / 2);
        if (this.#requestedFrames.length > limit) {
            this.#requestedFrames.shift();
        }
    }
}

function getDataStartFrame(meta: FramesMetaData, localStartFrame: number): number {
    return meta.startFrame - localStartFrame * meta.frameStep;
}

function getDataFrameNumber(frameNumber: number, dataStartFrame: number, step: number): number {
    return frameNumber * step + dataStartFrame;
}

function getFrameNumber(dataFrameNumber: number, dataStartFrame: number, step: number): number {
    return (dataFrameNumber - dataStartFrame) / step;
}

Object.defineProperty(FrameData.prototype.data, 'implementation', {
    value(this: FrameData, onServerRequest) {
        return new Promise<{
            renderWidth: number;
            renderHeight: number;
            imageData: ImageBitmap | Blob;
        } | Blob>((resolve, reject) => {
            const {
                meta, provider, prefetchAnalyzer, chunkSize, startFrame,
                decodeForward, forwardStep, decodedBlocksCacheSize,
            } = frameDataCache[this.jobID];

            const requestId = +_.uniqueId();
            const dataStartFrame = getDataStartFrame(meta, startFrame);
            const requestedDataFrameNumber = getDataFrameNumber(
                this.number, dataStartFrame, meta.frameStep,
            );
            const chunkIndex = meta.getFrameChunkIndex(requestedDataFrameNumber);
            const segmentFrameNumbers = meta.getDataFrameNumbers().map(
                (dataFrameNumber: number) => getFrameNumber(
                    dataFrameNumber, dataStartFrame, meta.frameStep,
                ),
            );
            const frame = provider.frame(this.number);

            function findTheNextNotDecodedChunk(currentFrameIndex: number): number | null {
                const { chunkCount } = meta;
                let nextFrameIndex = currentFrameIndex + forwardStep;
                let nextChunkIndex = Math.floor(nextFrameIndex / chunkSize);
                while (nextChunkIndex === chunkIndex) {
                    nextFrameIndex += forwardStep;
                    nextChunkIndex = Math.floor(nextFrameIndex / chunkSize);
                }

                if (nextChunkIndex < 0 || chunkCount <= nextChunkIndex) {
                    return null;
                }

                if (provider.isChunkCached(nextChunkIndex)) {
                    return findTheNextNotDecodedChunk(nextFrameIndex);
                }

                return nextChunkIndex;
            }

            if (frame) {
                if (
                    prefetchAnalyzer.shouldPrefetchNext(
                        this.number,
                        decodeForward,
                        (chunk) => provider.isChunkCached(chunk),
                    ) && decodedBlocksCacheSize > 1 && !frameDataCache[this.jobID].activeChunkRequest
                ) {
                    const nextChunkIndex = findTheNextNotDecodedChunk(
                        meta.getFrameIndex(requestedDataFrameNumber),
                    );
                    const predecodeChunksMax = Math.floor(decodedBlocksCacheSize / 2);
                    if (nextChunkIndex !== null &&
                        nextChunkIndex <= chunkIndex + predecodeChunksMax
                    ) {
                        frameDataCache[this.jobID].activeChunkRequest = new Promise((resolveForward) => {
                            const releasePromise = (): void => {
                                resolveForward();
                                frameDataCache[this.jobID].activeChunkRequest = null;
                            };

                            frameDataCache[this.jobID].getChunk(
                                nextChunkIndex, ChunkQuality.COMPRESSED,
                            ).then((chunk: ArrayBuffer) => {
                                if (!(this.jobID in frameDataCache)) {
                                    // check if frameDataCache still exist
                                    // as it may be released during chunk request
                                    resolveForward();
                                    return;
                                }

                                provider.cleanup(1);
                                provider.requestDecodeBlock(
                                    chunk,
                                    nextChunkIndex,
                                    segmentFrameNumbers.slice(
                                        nextChunkIndex * chunkSize,
                                        (nextChunkIndex + 1) * chunkSize,
                                    ),
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
                prefetchAnalyzer.addRequested(this.number);
                return;
            }

            onServerRequest();
            frameDataCache[this.jobID].latestFrameDecodeRequest = requestId;
            (frameDataCache[this.jobID].activeChunkRequest || Promise.resolve()).finally(() => {
                if (frameDataCache[this.jobID]?.latestFrameDecodeRequest !== requestId) {
                    // not relevant request anymore
                    reject(this.number);
                    return;
                }

                // it might appear during previous decoding, so, check again
                const currentFrame = provider.frame(this.number);
                if (currentFrame) {
                    resolve({
                        renderWidth: this.width,
                        renderHeight: this.height,
                        imageData: currentFrame,
                    });
                    prefetchAnalyzer.addRequested(this.number);
                    return;
                }

                frameDataCache[this.jobID].activeChunkRequest = new Promise<void>((
                    resolveLoadAndDecode,
                ) => {
                    let wasResolved = false;
                    frameDataCache[this.jobID].getChunk(
                        chunkIndex, ChunkQuality.COMPRESSED,
                    ).then((chunk: ArrayBuffer) => {
                        try {
                            if (!(this.jobID in frameDataCache)) {
                                // check if frameDataCache still exist
                                // as it may be released during chunk request
                                resolveLoadAndDecode();
                                reject(this.number);
                                return;
                            }

                            provider
                                .requestDecodeBlock(
                                    chunk,
                                    chunkIndex,
                                    segmentFrameNumbers.slice(
                                        chunkIndex * chunkSize,
                                        (chunkIndex + 1) * chunkSize,
                                    ),
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
                                            prefetchAnalyzer.addRequested(this.number);
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

export async function getFramesMeta(type: 'job' | 'task', id: number, forceReload = false): Promise<FramesMetaData> {
    if (type === 'task') {
        // we do not cache task meta currently. So, each new call will results to the server request
        const result = await serverProxy.frames.getMeta('task', id);
        return new FramesMetaData({
            ...result,
            deleted_frames: Object.fromEntries(result.deleted_frames.map((_frame) => [_frame, true])),
        });
    }
    if (!(id in frameMetaCache) || forceReload) {
        frameMetaCache[id] = serverProxy.frames.getMeta('job', id)
            .then((serverMeta) => new FramesMetaData({
                ...serverMeta,
                deleted_frames: Object.fromEntries(serverMeta.deleted_frames.map((_frame) => [_frame, true])),
            }))
            .catch((error) => {
                delete frameMetaCache[id];
                throw error;
            });
    }
    return frameMetaCache[id];
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
    getChunk: (chunkIndex: number, quality: ChunkQuality) => Promise<ArrayBuffer>,
): Promise<FrameData> {
    if (!(jobID in frameDataCache)) {
        const blockType = chunkType === 'video' ? BlockType.MP4VIDEO : BlockType.ARCHIVE;
        const meta = await getFramesMeta('job', jobID);

        const mean = meta.frames.reduce((a, b) => a + b.width * b.height, 0) / meta.frames.length;
        const stdDev = Math.sqrt(
            meta.frames.map((x) => (x.width * x.height - mean) ** 2).reduce((a, b) => a + b) /
            meta.frames.length,
        );

        // limit of decoded frames cache by 2GB
        const decodedBlocksCacheSize = Math.min(
            Math.floor((2048 * 1024 * 1024) / ((mean + stdDev) * 4 * chunkSize)) || 1, 10,
        );

        // TODO: migrate to local frame numbers
        const dataStartFrame = getDataStartFrame(meta, startFrame);
        const dataFrameNumberGetter = (frameNumber: number): number => (
            getDataFrameNumber(frameNumber, dataStartFrame, meta.frameStep)
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
                decodedBlocksCacheSize,
                (frameNumber: number): number => (
                    meta.getFrameChunkIndex(dataFrameNumberGetter(frameNumber))
                ),
                dimension,
            ),
            prefetchAnalyzer: new PrefetchAnalyzer(meta, dataFrameNumberGetter),
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

export async function deleteFrame(jobID: number, frame: number): Promise<void> {
    const meta = await frameMetaCache[jobID];
    meta.deletedFrames[frame] = true;
}

export async function restoreFrame(jobID: number, frame: number): Promise<void> {
    const meta = await frameMetaCache[jobID];
    delete meta.deletedFrames[frame];
}

export async function patchMeta(jobID: number): Promise<FramesMetaData> {
    const meta = await frameMetaCache[jobID];
    const updatedFields = meta.getUpdated();

    if (Object.keys(updatedFields).length) {
        frameMetaCache[jobID] = saveJobMeta(meta, jobID);
    }
    const newMeta = await frameMetaCache[jobID];
    return newMeta;
}

export async function findFrame(
    jobID: number, frameFrom: number, frameTo: number, filters: { offset?: number, notDeleted: boolean },
): Promise<number | null> {
    const offset = filters.offset || 1;
    const meta = await getFramesMeta('job', jobID);

    const sign = Math.sign(frameTo - frameFrom);
    const predicate = sign > 0 ? (frame) => frame <= frameTo : (frame) => frame >= frameTo;
    const update = sign > 0 ? (frame) => frame + 1 : (frame) => frame - 1;
    let framesCounter = 0;
    let lastUndeletedFrame = null;
    const check = (frame): boolean => {
        if (meta.includedFrames) {
            // meta.includedFrames contains input frame numbers now
            const dataStartFrame = meta.startFrame; // this is only true when includedFrames is set
            return (meta.includedFrames.includes(
                getDataFrameNumber(frame, dataStartFrame, meta.frameStep))
            ) && (!filters.notDeleted || !(frame in meta.deletedFrames));
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

export function getJobFrameNumbers(jobID): number[] {
    if (!(jobID in frameDataCache)) {
        return [];
    }

    const { meta, startFrame } = frameDataCache[jobID];
    const dataStartFrame = getDataStartFrame(meta, startFrame);
    return meta.getDataFrameNumbers().map((dataFrameNumber: number): number => (
        getFrameNumber(dataFrameNumber, dataStartFrame, meta.frameStep)
    ));
}

export function clear(jobID: number): void {
    if (jobID in frameDataCache) {
        frameDataCache[jobID].provider.close();
        for (const contextImagesByFrame of Object.values(frameDataCache[jobID].contextCache)) {
            for (const image of Object.values(contextImagesByFrame.data)) {
                image.close();
            }
        }

        delete frameDataCache[jobID];
        delete frameMetaCache[jobID];
    }
}
