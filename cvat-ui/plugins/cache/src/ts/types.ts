// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    CloudStorage, CVATCore, Job, MLModel, Project, Task,
} from 'cvat-core-wrapper';
import { DatabaseStore } from './indexed-storage';

export type PreviewFor = Project | Task | Job | CloudStorage | MLModel;
export type Quality = 'compressed' | 'original';

export type PreviewEnterFactory = (store: DatabaseStore) => (
    (this: PreviewFor, _: CachePlugin) => Promise<{ preventMethodCallWithReturn: string } | undefined>
);
export type PreviewLeaveFactory = (store: DatabaseStore) => (
    (this: PreviewFor, _: CachePlugin, result: string) => Promise<string>
);

export interface CachePlugin {
    name: string;
    description: string;
    data: {
        core: CVATCore | null;
        enabled: boolean;
        cachedChunksByJob: Record<number, number[]>;
        storeJobData(entry: {
            jobId: number;
            index: number;
            kind: 'chunk' | 'context-image';
            buffer: ArrayBuffer;
            updatedDate: string;
            protectedJobIds: number[];
        }): Promise<boolean>;
    };
    cvat: {
        classes: {
            Project: {
                prototype: {
                    preview: {
                        enter: ReturnType<PreviewEnterFactory>;
                        leave: ReturnType<PreviewLeaveFactory>;
                    };
                };
            };
            Task: {
                prototype: {
                    frames: {
                        preview: {
                            enter: ReturnType<PreviewEnterFactory>;
                            leave: ReturnType<PreviewLeaveFactory>;
                        };
                    };
                };
            };
            Job: {
                prototype: {
                    frames: {
                        preview: {
                            enter: ReturnType<PreviewEnterFactory>;
                            leave: ReturnType<PreviewLeaveFactory>;
                        };
                        contextImageData: {
                            enter: (
                                this: Job,
                                plugin: CachePlugin,
                                frameNumber: number,
                            ) => Promise<{ preventMethodCallWithReturn: ArrayBuffer } | undefined>;
                            leave: (
                                this: Job,
                                plugin: CachePlugin,
                                result: ArrayBuffer,
                                frameNumber: number,
                            ) => Promise<ArrayBuffer>;
                        };
                        chunk: {
                            enter: (
                                this: Job,
                                plugin: CachePlugin,
                                chunkIndex: number,
                                quality: Quality,
                            ) => Promise<{ preventMethodCallWithReturn: ArrayBuffer } | undefined>;
                            leave: (
                                this: Job,
                                plugin: CachePlugin,
                                result: ArrayBuffer,
                                chunkIndex: number,
                                quality: Quality,
                            ) => Promise<ArrayBuffer>
                        };
                        cachedChunks: {
                            leave: (this: Job, plugin: CachePlugin, result: number[]) => Promise<number[]>;
                        };
                    };
                };
            };
            CloudStorage: {
                prototype: {
                    preview: {
                        enter: ReturnType<PreviewEnterFactory>;
                        leave: ReturnType<PreviewLeaveFactory>;
                    };
                };
            };
            MLModel: {
                prototype: {
                    preview: {
                        enter: ReturnType<PreviewEnterFactory>;
                        leave: ReturnType<PreviewLeaveFactory>;
                    };
                };
            };
        };
    };
}
