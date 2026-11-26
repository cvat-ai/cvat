// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum DatabaseStore {
    PROJECTS_PREVIEW = 'projects_preview',
    TASKS_PREVIEW = 'tasks_preview',
    JOBS_PREVIEW = 'jobs_preview',
    CLOUDSTORAGES_PREVIEW = 'cloudstorages_preview',
    FUNCTIONS_PREVIEW = 'functions_preview',
    COMPRESSED_JOB_CHUNKS = 'compressed_job_chunks',
    CONTEXT_IMAGES = 'context_images',
}

enum IDBTransactionMode {
    READONLY = 'readonly',
    READWRITE = 'readwrite',
}

interface IObject {
    id: string;
    ts: number;
    payload: any;
}

const isInstance = (
    val: unknown, constructor: (abstract new (...args: never[]) => object) | string, store: DatabaseStore,
): void => {
    if (typeof constructor === 'string') {
        if (typeof val !== constructor) {
            throw new Error(`Store ${store}: validation error, object is not of type ${constructor}`);
        }
    } else if (!(val instanceof constructor)) {
        throw new Error(`Store ${store}: validation error, object is not of type ${constructor.name}`);
    }
};

export type ContextImages = Record<string, ImageBitmap>;

export interface LoggingCallbacks {
    onQuotaExceeded?: (error: Error) => void;
    onPartialClear?: (info: { reason: string; usage: number; quota: number }) => void;
}

export type IsProtectedRecordCallback = (store: DatabaseStore, key: string) => boolean;

class CVATIndexedStorage {
    #dbName = 'cvat_cache';
    #version = 6;
    #db: IDBDatabase | null = null;
    #dbUpgradedAnotherTab = false;
    #isQuotaExceed: boolean = false;
    #initializationPromise: Promise<void> | null = null;
    #spaceWatcherThreshold = 0.7;
    #spaceWatcherKeysToRemove = 0.1;
    #loggingCallbacks: LoggingCallbacks = {};
    #isProtectedRecord: IsProtectedRecordCallback | null = null;
    #storeConfiguration = {
        [DatabaseStore.PROJECTS_PREVIEW]: {
            options: { keyPath: 'id' },
            validator: (el: string) => isInstance(el, 'string', DatabaseStore.PROJECTS_PREVIEW),
            serialize: async (el: string) => Promise.resolve(el),
            deserialize: async (el: string) => Promise.resolve(el),
        },
        [DatabaseStore.TASKS_PREVIEW]: {
            options: { keyPath: 'id' },
            validator: (el: string) => isInstance(el, 'string', DatabaseStore.TASKS_PREVIEW),
            serialize: async (el: string) => Promise.resolve(el),
            deserialize: async (el: string) => Promise.resolve(el),
        },
        [DatabaseStore.JOBS_PREVIEW]: {
            options: { keyPath: 'id' },
            validator: (el: string) => isInstance(el, 'string', DatabaseStore.JOBS_PREVIEW),
            serialize: async (el: string) => Promise.resolve(el),
            deserialize: async (el: string) => Promise.resolve(el),
        },
        [DatabaseStore.CLOUDSTORAGES_PREVIEW]: {
            options: { keyPath: 'id' },
            validator: (el: string) => isInstance(el, 'string', DatabaseStore.CLOUDSTORAGES_PREVIEW),
            serialize: async (el: string) => Promise.resolve(el),
            deserialize: async (el: string) => Promise.resolve(el),
        },
        [DatabaseStore.FUNCTIONS_PREVIEW]: {
            options: { keyPath: 'id' },
            validator: (el: string) => isInstance(el, Blob, DatabaseStore.FUNCTIONS_PREVIEW),
            serialize: async (el: string) => Promise.resolve(el),
            deserialize: async (el: string) => Promise.resolve(el),
        },
        [DatabaseStore.COMPRESSED_JOB_CHUNKS]: {
            options: { keyPath: 'id' },
            validator: (el: { buffer: ArrayBuffer; updatedDate: string }) => {
                isInstance(el, Object, DatabaseStore.COMPRESSED_JOB_CHUNKS);
                isInstance(el.buffer, ArrayBuffer, DatabaseStore.COMPRESSED_JOB_CHUNKS);
                isInstance(el.updatedDate, 'string', DatabaseStore.COMPRESSED_JOB_CHUNKS);
            },
            serialize: (el: { buffer: ArrayBuffer; updatedDate: string }) => Promise.resolve(el),
            deserialize: (el: { buffer: ArrayBuffer; updatedDate: string }) => Promise.resolve(el),
        },
        [DatabaseStore.CONTEXT_IMAGES]: {
            options: { keyPath: 'id' },
            validator: (el: { buffer: ArrayBuffer; updatedDate: string }) => {
                isInstance(el, 'object', DatabaseStore.CONTEXT_IMAGES);
                isInstance(el.buffer, ArrayBuffer, DatabaseStore.CONTEXT_IMAGES);
                isInstance(el.updatedDate, 'string', DatabaseStore.CONTEXT_IMAGES);
            },
            serialize: (el: { buffer: ArrayBuffer; updatedDate: string }) => Promise.resolve(el),
            deserialize: (el: { buffer: ArrayBuffer; updatedDate: string }) => Promise.resolve(el),
        },
    };

    #performSetItem<T>(
        storeName: DatabaseStore,
        id: string, object: T,
        resolve: (value: boolean) => void,
    ): void {
        this.load().then(() => {
            const { validator, serialize } = this.#storeConfiguration[storeName];
            validator(object as any);
            serialize(object as any).then((serialized) => {
                const transaction = (this.#db as IDBDatabase)
                    .transaction(storeName, IDBTransactionMode.READWRITE);
                transaction.onabort = (event: Event) => {
                    // if request errored, it bubbles to the transaction object
                    // if not prevented in transaction.onerror, the event bubbles to transaction.onabort
                    const { error } = (event.target as IDBTransaction);
                    if (error && error.name === 'QuotaExceededError') {
                        this.#isQuotaExceed = true;
                        this.#loggingCallbacks.onQuotaExceeded?.(error);
                        resolve(false);
                    } else {
                        console.warn(error);
                        resolve(false);
                    }
                };

                const indexedStore = transaction.objectStore(storeName);
                const request = indexedStore.put({
                    id,
                    ts: Date.now(),
                    payload: serialized,
                });
                request.onsuccess = () => resolve(true);
            }).catch(() => resolve(false));
        }).catch((error) => {
            console.warn(error);
            resolve(false);
        });
    }

    setLoggingCallbacks(callbacks: LoggingCallbacks): void {
        this.#loggingCallbacks = callbacks;
    }

    setProtectedRecordCallback(callback: IsProtectedRecordCallback): void {
        this.#isProtectedRecord = callback;
    }

    load(): Promise<void> {
        if (!indexedDB || this.#dbUpgradedAnotherTab) {
            return Promise.reject();
        }

        if (this.#db) {
            return Promise.resolve();
        }

        if (!this.#initializationPromise) {
            this.#initializationPromise = new Promise<void>((resolve, reject) => {
                const request = indexedDB.open(this.#dbName, this.#version);
                request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                    const db = request.result;

                    if (event.oldVersion === 0) {
                        Object.entries(this.#storeConfiguration).forEach(([storeName, conf]) => {
                            if (!db.objectStoreNames.contains(storeName)) {
                                const store = db.createObjectStore(storeName, conf.options);
                                store.createIndex('ts', 'ts');
                            }
                        });
                    }

                    if (event.oldVersion === 1) {
                        // recreate because it contains not correct values
                        db.deleteObjectStore(DatabaseStore.CLOUDSTORAGES_PREVIEW);
                        const conf = this.#storeConfiguration[DatabaseStore.CLOUDSTORAGES_PREVIEW];
                        const store = db.createObjectStore(DatabaseStore.CLOUDSTORAGES_PREVIEW, conf.options);
                        store.createIndex('ts', 'ts');
                    }

                    if ([1, 2, 3].includes(event.oldVersion)) {
                        // recreate because it contains outdated data
                        db.deleteObjectStore(DatabaseStore.COMPRESSED_JOB_CHUNKS);
                        const conf = this.#storeConfiguration[DatabaseStore.COMPRESSED_JOB_CHUNKS];
                        const store = db.createObjectStore(DatabaseStore.COMPRESSED_JOB_CHUNKS, conf.options);
                        store.createIndex('ts', 'ts');
                    }

                    if (event.oldVersion === 4) {
                        // recreate because db schema has changed
                        for (const storeName of [DatabaseStore.COMPRESSED_JOB_CHUNKS, DatabaseStore.CONTEXT_IMAGES]) {
                            db.deleteObjectStore(storeName);
                            const conf = this.#storeConfiguration[storeName];
                            const store = db.createObjectStore(storeName, conf.options);
                            store.createIndex('ts', 'ts');
                        }
                    }

                    if (event.oldVersion === 5) {
                        // recreate because db schema has changed
                        db.deleteObjectStore(DatabaseStore.CONTEXT_IMAGES);
                        const conf = this.#storeConfiguration[DatabaseStore.CONTEXT_IMAGES];
                        const store = db.createObjectStore(DatabaseStore.CONTEXT_IMAGES, conf.options);
                        store.createIndex('ts', 'ts');
                    }
                };

                request.onsuccess = () => {
                    this.#initializationPromise = null;
                    this.#db = request.result;
                    this.#db.onversionchange = () => {
                        if (this.#db) {
                            this.#db.close();
                        }

                        this.#db = null;
                        this.#dbUpgradedAnotherTab = true;
                        // a user upgraded (with new version in js code) or deleted the db in another tab
                        // we close connection and remove the database in current one

                        if (alert) {
                            // eslint-disable-next-line
                            alert('App was updated. Please, reload the browser page, otherwise further correct work is not guaranteed');
                        }
                    };

                    resolve();
                };

                request.onerror = (event: Event) => {
                    this.#initializationPromise = null;
                    const error = (event.target as any).error as Error;
                    console.warn(error);
                    reject(request.error);
                };
            });
        }

        return this.#initializationPromise;
    }

    setItem<T>(storeName: DatabaseStore, id: string, object: T): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.#isQuotaExceed) {
                resolve(false);
                return;
            }

            this.estimate().then((estimation) => {
                if (estimation && (estimation.usage / estimation.quota >= this.#spaceWatcherThreshold)) {
                    this.#loggingCallbacks.onPartialClear?.({
                        reason: `Storage threshold - ${this.#spaceWatcherThreshold} exceeded`,
                        usage: estimation.usage,
                        quota: estimation.quota,
                    });
                    return this.partialClear(
                        this.#spaceWatcherKeysToRemove,
                    ).catch((error: Error) => {
                        console.log(error);
                    });
                }
                return Promise.resolve();
            }).finally(() => {
                this.#performSetItem(storeName, id, object, resolve);
            });
        });
    }

    getItem<T>(storeName: DatabaseStore, id: string): Promise<T | null> {
        return new Promise((resolve) => {
            const { deserialize } = this.#storeConfiguration[storeName];

            this.load().then(() => {
                const transaction = (this.#db as IDBDatabase)
                    .transaction(storeName, IDBTransactionMode.READONLY);
                transaction.onabort = (event: Event) => {
                    // if request errored, it bubbles to the transaction object
                    // if not prevented in transaction.onerror, the event bubbles to transaction.onabort
                    const { error } = (event.target as IDBTransaction);
                    console.warn(error);
                    resolve(null);
                };

                const indexedStore = transaction.objectStore(storeName);
                const request = indexedStore.get(id);

                request.onsuccess = (event: Event) => {
                    const result = (event.target as any).result as IObject;
                    if (typeof result === 'undefined') {
                        resolve(null);
                    } else {
                        deserialize(result.payload).then((deserialized: any) => {
                            resolve(deserialized as T);
                        }).catch(() => {
                            resolve(null);
                        });
                    }
                };
            }).catch((error) => {
                console.warn(error);
                resolve(null);
            });
        });
    }

    deleteItem(storeName: DatabaseStore, id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.load().then(() => {
                const transaction = (this.#db as IDBDatabase)
                    .transaction(storeName, IDBTransactionMode.READWRITE);
                transaction.onabort = (event: Event) => {
                    // if request errored, it bubbles to the transaction object
                    // if not prevented in transaction.onerror, the event bubbles to transaction.onabort
                    const { error } = (event.target as IDBTransaction);
                    console.warn(error);
                    resolve();
                };

                const indexedStore = transaction.objectStore(storeName);
                const request = indexedStore.delete(id);

                request.onsuccess = () => resolve();
            }).catch((error) => {
                console.warn(error);
                reject(error);
            });
        });
    }

    hasItem(storeName: DatabaseStore, id: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.load().then(() => {
                const transaction = (this.#db as IDBDatabase)
                    .transaction(storeName, IDBTransactionMode.READONLY);
                transaction.onabort = (event: Event) => {
                    // if request errored, it bubbles to the transaction object
                    // if not prevented in transaction.onerror, the event bubbles to transaction.onabort
                    const { error } = (event.target as IDBTransaction);
                    console.warn(error);
                    resolve(false);
                };

                const indexedStore = transaction.objectStore(storeName);
                const countRequest = indexedStore.count(id);
                countRequest.onsuccess = () => {
                    resolve(countRequest.result !== 0);
                };
            }).catch((error) => {
                console.warn(error);
                resolve(false);
            });
        });
    }

    estimate(): Promise<{ quota: number; usage: number } | null> {
        return new Promise((resolve) => {
            if (navigator?.storage && typeof navigator.storage.estimate === 'function') {
                navigator.storage.estimate().then((estimation: StorageEstimate) => {
                    if (typeof estimation.quota === 'number' && typeof estimation.usage === 'number') {
                        resolve({
                            quota: estimation.quota,
                            usage: estimation.usage,
                        });
                    } else {
                        resolve(null);
                    }
                }).catch(() => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    }

    partialClear(percentage: number): Promise<void> {
        return new Promise((resolveClear, rejectClear) => {
            this.load().then(() => {
                try {
                    const storages = Object.values(DatabaseStore);
                    const transaction = (this.#db as IDBDatabase)
                        .transaction(storages, IDBTransactionMode.READWRITE);
                    transaction.onabort = () => rejectClear(transaction.error);
                    transaction.onerror = () => rejectClear(transaction.error);

                    const clearByStoragePromises = storages.map((storeName) => new Promise<void>((resolve, reject) => {
                        const store = transaction.objectStore(storeName);

                        new Promise<string[]>((resolveKeys, rejectKeys) => {
                            const timestampIndex = store.index('ts');
                            const keysRequest = timestampIndex.getAllKeys();
                            keysRequest.onsuccess = () => resolveKeys(keysRequest.result as string[]);
                            keysRequest.onerror = () => rejectKeys(keysRequest.error);
                        }).then((keys) => {
                            // Filter out protected keys using callback
                            const keysToConsider = this.#isProtectedRecord ?
                                keys.filter((key) => !this.#isProtectedRecord!(storeName, key)) :
                                keys;

                            const removeCount = Math.ceil(keysToConsider.length * percentage);
                            if (removeCount > 0) {
                                // Remove oldest non-protected keys
                                const keysToRemove = keysToConsider.slice(0, removeCount);
                                const promises = keysToRemove.map(
                                    (key: string) => (
                                        new Promise<void>((resolveDelete, rejectDelete) => {
                                            const deleteRequest = store.delete(key);
                                            deleteRequest.onsuccess = () => resolveDelete();
                                            deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
                                        })),
                                );

                                Promise.all(promises).then(() => {
                                    resolve();
                                }).catch((error) => {
                                    reject(error);
                                });
                            } else {
                                resolve();
                            }
                        }).catch((error: Error) => {
                            reject(error);
                        });
                    }),
                    );

                    Promise.all(clearByStoragePromises).then(() => {
                        this.#isQuotaExceed = false;
                        resolveClear();
                    }).catch((error: Error) => {
                        rejectClear(error);
                    });
                } catch (error) {
                    rejectClear(error);
                }
            }).catch((error) => {
                rejectClear(error);
            });
        });
    }

    clear(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.#db) {
                this.#db.close();
                this.#db = null;
            }
            const request = indexedDB.deleteDatabase(this.#dbName);

            request.onerror = (event) => {
                reject((event.target as any).error ?? new Error('Could not delete the database'));
            };

            request.onsuccess = () => {
                this.#isQuotaExceed = false;
                this.load().finally(() => resolve());
            };
        });
    }

    getKeysInStore(store: DatabaseStore): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.load().then(() => {
                try {
                    const transaction = (this.#db as IDBDatabase)
                        .transaction(store, IDBTransactionMode.READONLY);

                    transaction.onabort = (event: Event) => {
                        // if request errored, it bubbles to the transaction object
                        // if not prevented in transaction.onerror, the event bubbles to transaction.onabort
                        const { error } = (event.target as IDBTransaction);
                        reject(error);
                    };

                    const indexedStore = transaction.objectStore(store);
                    const request = indexedStore.getAllKeys();
                    request.onsuccess = () => resolve(request.result as string[]);
                } catch (error) {
                    reject(error);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }
}

export default new CVATIndexedStorage();
