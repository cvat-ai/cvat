// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { PluginEntryPoint, ComponentBuilder } from 'components/plugins-entrypoint';
import { Job } from 'cvat-core-wrapper';
import { logError, EventScope } from 'cvat-logger';
import indexedStorage, { DatabaseStore, LoggingCallbacks } from './indexed-storage';
import {
    CachePlugin, PreviewEnterFactory, PreviewFor, PreviewLeaveFactory, Quality,
} from './types';
import SettingsComponent from './components/settings-component';
import { createProtectedJobRecordCallback } from './utils';

const previewEnter: PreviewEnterFactory = (
    store: DatabaseStore,
) => async function (this: PreviewFor, plugin: CachePlugin) {
    if (plugin.data.enabled) {
        const item = await indexedStorage.getItem<string>(store, `${this.id}`);
        if (item) {
            return { preventMethodCallWithReturn: item };
        }
    }

    return undefined;
};

const previewLeave: PreviewLeaveFactory = (store: DatabaseStore) => async function (
    this: PreviewFor, plugin: CachePlugin, result: string,
): Promise<string> {
    if (plugin.data.enabled && result) {
        await indexedStorage.setItem<string>(store, `${this.id}`, result);
    }
    return result;
};

async function getChunksUpdatedDate(
    core: NonNullable<CachePlugin['data']['core']>,
    jobId: number,
): Promise<string | undefined> {
    try {
        const metadata = await core.frames.getMeta('job', jobId);
        return metadata.chunksUpdatedDate;
    } catch (_: unknown) {
        // Skip cache reads and writes when the current job data version is unknown.
        return undefined;
    }
}

async function contextImageDataEnter(
    this: Job, plugin: CachePlugin, frameNumber: number,
): Promise<undefined | { preventMethodCallWithReturn: ArrayBuffer }> {
    if (plugin.data.enabled) {
        const key = `${this.id}_${frameNumber}`;
        const item = await indexedStorage
            .getItem<{ buffer: ArrayBuffer; updatedDate: string }>(DatabaseStore.CONTEXT_IMAGES, key);
        if (item) {
            const chunksUpdatedDate = await getChunksUpdatedDate(plugin.data.core!, this.id);
            if (chunksUpdatedDate === undefined) {
                return undefined;
            }

            if (chunksUpdatedDate !== item.updatedDate) {
                const keys = await indexedStorage.getKeysInStore(DatabaseStore.CONTEXT_IMAGES);
                const cachedContextImages = keys.filter((cachedKey: string) => +cachedKey.split('_')[0] === this.id);
                for await (const keyToDelete of cachedContextImages) {
                    await indexedStorage.deleteItem(DatabaseStore.CONTEXT_IMAGES, keyToDelete);
                }
                return undefined;
            }

            return { preventMethodCallWithReturn: item.buffer };
        }
    }

    return undefined;
}

async function contextImageDataLeave(
    this: Job, plugin: CachePlugin, result: ArrayBuffer, frameNumber: number,
): Promise<ArrayBuffer> {
    if (plugin.data.enabled && result && result.byteLength > 0) {
        const key = `${this.id}_${frameNumber}`;
        if (!await indexedStorage.hasItem(DatabaseStore.CONTEXT_IMAGES, key)) {
            const chunksUpdatedDate = await getChunksUpdatedDate(plugin.data.core!, this.id);
            if (!chunksUpdatedDate) {
                return result;
            }

            await indexedStorage
                .setItem<{ buffer: ArrayBuffer; updatedDate: string }>(DatabaseStore.CONTEXT_IMAGES, key, {
                    buffer: result,
                    updatedDate: chunksUpdatedDate,
                });
        }
    }

    return result;
}

async function chunkEnter(
    this: Job, plugin: CachePlugin, chunkIndex: number, quality: Quality,
): Promise<undefined | { preventMethodCallWithReturn: ArrayBuffer }> {
    if (plugin.data.enabled && quality === 'compressed') {
        const key = `${this.id}_${chunkIndex}`;
        const item = await indexedStorage
            .getItem<{ buffer: ArrayBuffer, updatedDate: string }>(DatabaseStore.COMPRESSED_JOB_CHUNKS, key);

        if (item) {
            // make sure cached chunks still valid. Remove them if not valid
            const chunksUpdatedDate = await getChunksUpdatedDate(plugin.data.core!, this.id);
            if (chunksUpdatedDate === undefined) {
                return undefined;
            }

            if (chunksUpdatedDate !== item.updatedDate) {
                const keys = await indexedStorage.getKeysInStore(DatabaseStore.COMPRESSED_JOB_CHUNKS);
                const cachedChunks = keys.filter((cachedKey: string) => +cachedKey.split('_')[0] === this.id);
                for await (const keyToDelete of cachedChunks) {
                    await indexedStorage.deleteItem(DatabaseStore.COMPRESSED_JOB_CHUNKS, keyToDelete);
                }
                plugin.data.cachedChunksByJob[this.id] = [];
                return undefined;
            }

            return { preventMethodCallWithReturn: item.buffer };
        }
    }

    return undefined;
}

async function chunkLeave(
    this: Job, plugin: CachePlugin, result: ArrayBuffer, chunkIndex: number, quality: Quality,
): Promise<ArrayBuffer> {
    if (plugin.data.enabled && quality === 'compressed' && result) {
        const { id } = this;
        const key = `${id}_${chunkIndex}`;
        if (!await indexedStorage.hasItem(DatabaseStore.COMPRESSED_JOB_CHUNKS, key)) {
            const chunksUpdatedDate = await getChunksUpdatedDate(plugin.data.core!, this.id);
            if (!chunksUpdatedDate) {
                return result;
            }

            const appended = await indexedStorage
                .setItem<{ buffer: ArrayBuffer, updatedDate: string }>(DatabaseStore.COMPRESSED_JOB_CHUNKS, key, {
                    buffer: result,
                    updatedDate: chunksUpdatedDate,
                });
            if (appended && id in plugin.data.cachedChunksByJob &&
                !plugin.data.cachedChunksByJob[id].includes(chunkIndex)
            ) {
                plugin.data.cachedChunksByJob[id].push(chunkIndex);
            }
        }
    }

    return result;
}

async function cachedChunksLeave(this: Job, plugin: CachePlugin, result: number[]): Promise<number[]> {
    if (!plugin.data.enabled) {
        return result;
    }

    const { id } = this;
    if (id in plugin.data.cachedChunksByJob) {
        const totalCachedChunks = Array.from(
            new Set(plugin.data.cachedChunksByJob[id].concat(result)),
        ).sort((a, b) => a - b);
        return totalCachedChunks;
    }

    // remove old data if user've changed the job
    plugin.data.cachedChunksByJob = {};
    try {
        // get chunk numbers from the cache, and keep them in memory
        const keys = await indexedStorage.getKeysInStore(DatabaseStore.COMPRESSED_JOB_CHUNKS);
        plugin.data.cachedChunksByJob[id] = keys.map((key: string) => {
            const [jobID, chunk] = key.split('_');
            return [+jobID, +chunk];
        }).filter(([jobID]) => jobID === id).map(([, chunk]) => chunk);
        const totalCachedChunks = Array.from(
            new Set(plugin.data.cachedChunksByJob[id].concat(result)),
        ).sort((a, b) => a - b);
        return totalCachedChunks;
    } catch (error) {
        console.error(error);
        return result;
    }
}

const protectedJobIdsByWrite = new Set<number[]>();

const plugin: CachePlugin = {
    name: 'Cache',
    description: 'Enables cache for some static data',
    data: {
        core: null,
        enabled: window.isSecureContext && ['true', null].includes(window.localStorage.getItem('cvatEnableCacheFeature')),
        cachedChunksByJob: {},
        storeJobData: async ({
            jobId, index, kind, buffer, updatedDate, protectedJobIds,
        }) => {
            // This write can trigger eviction. Protect the worker's open jobs until it settles.
            const writeProtectedJobIds = [...protectedJobIds];
            protectedJobIdsByWrite.add(writeProtectedJobIds);
            try {
                return await indexedStorage.setItem(
                    kind === 'chunk' ? DatabaseStore.COMPRESSED_JOB_CHUNKS : DatabaseStore.CONTEXT_IMAGES,
                    `${jobId}_${index}`,
                    { buffer, updatedDate },
                );
            } finally {
                protectedJobIdsByWrite.delete(writeProtectedJobIds);
            }
        },
    },
    cvat: {
        classes: {
            Project: {
                prototype: {
                    preview: {
                        enter: previewEnter(DatabaseStore.PROJECTS_PREVIEW),
                        leave: previewLeave(DatabaseStore.PROJECTS_PREVIEW),
                    },
                },
            },
            Task: {
                prototype: {
                    frames: {
                        preview: {
                            enter: previewEnter(DatabaseStore.TASKS_PREVIEW),
                            leave: previewLeave(DatabaseStore.TASKS_PREVIEW),
                        },
                    },
                },
            },
            Job: {
                prototype: {
                    frames: {
                        preview: {
                            enter: previewEnter(DatabaseStore.JOBS_PREVIEW),
                            leave: previewLeave(DatabaseStore.JOBS_PREVIEW),
                        },
                        contextImageData: {
                            enter: contextImageDataEnter,
                            leave: contextImageDataLeave,
                        },
                        chunk: {
                            enter: chunkEnter,
                            leave: chunkLeave,
                        },
                        cachedChunks: {
                            leave: cachedChunksLeave,
                        },
                    },
                },
            },
            CloudStorage: {
                prototype: {
                    preview: {
                        enter: previewEnter(DatabaseStore.CLOUDSTORAGES_PREVIEW),
                        leave: previewLeave(DatabaseStore.CLOUDSTORAGES_PREVIEW),
                    },
                },
            },
            MLModel: {
                prototype: {
                    preview: {
                        enter: previewEnter(DatabaseStore.FUNCTIONS_PREVIEW),
                        leave: previewLeave(DatabaseStore.FUNCTIONS_PREVIEW),
                    },
                },
            },
        },
    },
};

const builder: ComponentBuilder = ({ core, actionCreators, store }) => {
    const SettingsComponentWrapper = (): JSX.Element => <SettingsComponent plugin={plugin} />;
    store.dispatch(actionCreators.addUIComponent('settings.player', SettingsComponentWrapper, { weight: -1 }));

    const removeSettings = (): void => {
        store.dispatch(actionCreators.removeUIComponent('settings.player', SettingsComponentWrapper));
    };

    if (!window.isSecureContext) {
        return { name: plugin.name, destructor: removeSettings };
    }

    plugin.data.core = core;
    core.plugins.register(plugin);

    const loggingCallbacks: LoggingCallbacks = {
        onQuotaExceeded: (error: Error) => {
            logError(error, false, { type: 'storage_quota_exceeded' });
        },
        onPartialClear: (info: { reason: string; usage: number; quota: number }) => {
            const job = store.getState().annotation?.job?.instance;
            if (job) {
                job.logger.log(EventScope.debugInfo, info);
            }
        },
    };

    indexedStorage.setLoggingCallbacks(loggingCallbacks);

    indexedStorage.setProtectedRecordCallback(
        createProtectedJobRecordCallback(() => {
            const job = store.getState().annotation?.job?.instance;
            const protectedJobIds = Array.from(protectedJobIdsByWrite).flat();
            if (job) {
                protectedJobIds.push(job.id);
            }
            return protectedJobIds;
        }),
    );

    return { name: plugin.name, destructor: removeSettings };
};

function register(): void {
    if (Object.prototype.hasOwnProperty.call(window, 'cvatUI')) {
        (window as any as { cvatUI: { registerComponent: PluginEntryPoint } })
            .cvatUI.registerComponent(builder);
    }
}

window.addEventListener('plugins.ready', register, { once: true });
