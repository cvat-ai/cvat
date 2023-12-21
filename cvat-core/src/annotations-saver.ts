// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy, { sleep } from './server-proxy';
import { Job, Task } from './session';
import { DataError, ServerError } from './exceptions';
import {
    SerializedCollection, SerializedShape,
    SerializedTag, SerializedTrack,
} from './server-response-types';

interface ExtractedIDs {
    shapes: number[];
    tracks: number[];
    tags: number[];
}

interface SplittedCollection {
    created: SerializedCollection;
    updated: SerializedCollection;
    deleted: SerializedCollection;
}

type ResponseBody = Awaited<ReturnType<typeof serverProxy['annotations']['updateAnnotations']>>;
type RequestBody = ResponseBody;

const COLLECTION_KEYS: (keyof SerializedCollection)[] = ['shapes', 'tracks', 'tags'];

function removeIDFromObject<T extends SerializedShape | SerializedTag | SerializedTrack>(
    object: T,
    property: 'id' | 'clientID',
): T {
    delete object[property];
    if ('shapes' in object) {
        for (const shape of object.shapes) {
            delete shape[property];
        }
    }

    if ('elements' in object) {
        object.elements = object.elements.map((element) => removeIDFromObject(element, property));
    }

    return object;
}

export default class AnnotationsSaver {
    private sessionType: 'task' | 'job';
    private id: number;
    private version: number;
    private collection: any;
    private hash: string;
    private initialObjects: {
        shapes: Record<number, SerializedCollection['shapes'][0]>,
        tracks: Record<number, SerializedCollection['tracks'][0]>,
        tags: Record<number, SerializedCollection['tags'][0]>,
    };

    constructor(version: number, collection, session: Task | Job) {
        this.sessionType = session instanceof Task ? 'task' : 'job';
        this.id = session.id;
        this.version = version;
        this.collection = collection;
        this.hash = this._getHash();
        this.initialObjects = { shapes: {}, tracks: {}, tags: {} };

        // We need use data from export instead of initialData
        // Otherwise we have differ keys order and JSON comparison code works incorrectly
        const exported = this.collection.export();
        for (const key of COLLECTION_KEYS) {
            for (const object of exported[key]) {
                this.initialObjects[key][object.id] = object;
            }
        }
    }

    _getHash(): string {
        const exported = this.collection.export();
        return JSON.stringify(exported);
    }

    async _request(data: RequestBody, action: 'put' | 'create' | 'update' | 'delete'): Promise<ResponseBody> {
        const result = await serverProxy.annotations.updateAnnotations(this.sessionType, this.id, data, action);
        return result;
    }

    async _put(data: RequestBody): Promise<ResponseBody> {
        const result = await this._request(data, 'put');
        return result;
    }

    async _create(created: RequestBody): Promise<ResponseBody> {
        const result = await this._request(created, 'create');
        return result;
    }

    async _update(updated: RequestBody): Promise<ResponseBody> {
        const result = await this._request(updated, 'update');
        return result;
    }

    async _delete(deleted: RequestBody): Promise<ResponseBody> {
        const result = await this._request(deleted, 'delete');
        return result;
    }

    _split(exported: SerializedCollection): SplittedCollection {
        const splitted: SplittedCollection = {
            created: {
                shapes: [],
                tracks: [],
                tags: [],
            },
            updated: {
                shapes: [],
                tracks: [],
                tags: [],
            },
            deleted: {
                shapes: [],
                tracks: [],
                tags: [],
            },
        };

        const keys = [
            'id',
            'label_id',
            'group',
            'frame',
            'occluded',
            'z_order',
            'points',
            'rotation',
            'type',
            'shapes',
            'elements',
            'attributes',
            'value',
            'spec_id',
            'source',
            'outside',
        ];

        // Find created and updated objects
        for (const type of COLLECTION_KEYS) {
            for (const object of exported[type]) {
                if (typeof object.id === 'undefined') {
                    splitted.created[type].push(object as any);
                } else if (object.id in this.initialObjects[type]) {
                    const exportedHash = JSON.stringify(object, keys);
                    const initialHash = JSON.stringify(this.initialObjects[type][object.id], keys);
                    if (exportedHash !== initialHash) {
                        splitted.updated[type].push(object as any);
                    }
                }
            }
        }

        // Now find deleted objects
        const indexes = {
            shapes: exported.shapes.map((object) => +object.id),
            tracks: exported.tracks.map((object) => +object.id),
            tags: exported.tags.map((object) => +object.id),
        };

        for (const type of COLLECTION_KEYS) {
            for (const id of Object.keys(this.initialObjects[type])) {
                if (!indexes[type].includes(+id)) {
                    const object = this.initialObjects[type][id];
                    splitted.deleted[type].push(object);
                }
            }
        }

        return splitted;
    }

    _updateCreatedObjects(saved: ResponseBody, indexes: ExtractedIDs): void {
        const savedLength = saved.tracks.length + saved.shapes.length + saved.tags.length;
        const indexesLength = indexes.tracks.length + indexes.shapes.length + indexes.tags.length;
        if (indexesLength !== savedLength) {
            throw new DataError(
                `Number of indexes is differed by number of saved objects ${indexesLength} vs ${savedLength}`,
            );
        }

        // Updated IDs of created objects
        for (const type of Object.keys(indexes)) {
            for (let i = 0; i < indexes[type].length; i++) {
                const clientID = indexes[type][i];
                this.collection.objects[clientID].updateServerID(saved[type][i]);
            }
        }
    }

    _extractClientIDs(exported: SerializedCollection): ExtractedIDs {
        // Receive client IDs before saving
        const indexes = {
            tracks: exported.tracks.map((track) => track.clientID),
            shapes: exported.shapes.map((shape) => shape.clientID),
            tags: exported.tags.map((tag) => tag.clientID),
        };

        // Remove them from the request body
        for (const type of COLLECTION_KEYS) {
            for (const object of exported[type]) {
                removeIDFromObject(object, 'clientID');
            }
        }

        return indexes;
    }

    _updateInitialObjects(ResponseBody: ResponseBody): void {
        this.version = ResponseBody.version;
        for (const type of COLLECTION_KEYS) {
            for (const object of ResponseBody[type]) {
                this.initialObjects[type][object.id] = object;
            }
        }
    }

    async save(onUpdateArg?: (message: string) => void): Promise<void> {
        const onUpdate = typeof onUpdateArg === 'function' ? onUpdateArg : (message) => {
            console.log(message);
        };

        const exported = this.collection.export();
        const { flush } = this.collection;
        if (flush) {
            onUpdate('All collection is being saved on the server');
            // remove server IDs if there are any, annotations will be rewritten
            const indexes = this._extractClientIDs(exported);
            for (const type of COLLECTION_KEYS) {
                for (const object of exported[type]) {
                    removeIDFromObject(object, 'id');
                }
            }

            const savedData = await this._put({ ...exported, version: this.version });
            this.version = savedData.version;
            this.collection.flush = false;

            this._updateCreatedObjects(savedData, indexes);
            this.initialObjects = { shapes: {}, tracks: {}, tags: {} };

            for (const type of COLLECTION_KEYS) {
                for (const object of savedData[type]) {
                    this.initialObjects[type][object.id] = object;
                }
            }
        } else {
            // with using ASGI server it is possible to get 504 (RequestTimeout)
            // from nginx proxy, when the request is still being processed by the server
            // that is not good that client knows about the server details
            // but we implemented a workaround here
            const retryIf504Status = async (
                error: unknown,
                requestBody: RequestBody,
                action: 'update' | 'delete' | 'create',
            ): Promise<ResponseBody> => {
                if (error instanceof ServerError && error.code === 504) {
                    const RETRY_PERIOD = 5000;
                    this.collection.flush = true;

                    let retryCount = 10;
                    while (retryCount) {
                        try {
                            if (action === 'update') {
                                return await this._update(requestBody);
                            }

                            if (action === 'delete') {
                                return await this._update(requestBody);
                            }

                            // todo: implement for create
                            return await this._create(requestBody);
                        } catch (_: unknown) {
                            retryCount--;
                            await sleep(RETRY_PERIOD);
                        }
                    }
                }

                throw error;
            };

            const { created, updated, deleted } = this._split(exported);

            onUpdate('Updated objects are being saved on the server');
            this._extractClientIDs(updated);
            let requestBody = { ...updated, version: this.version };
            let updatedData = null;
            try {
                updatedData = await this._update(requestBody);
            } catch (error: unknown) {
                updatedData = await retryIf504Status(error, requestBody, 'update');
            }

            this.version = updatedData.version;
            for (const type of Object.keys(this.initialObjects)) {
                for (const object of updatedData[type]) {
                    this.initialObjects[type][object.id] = object;
                }
            }

            onUpdate('Deleted objects are being deleted from the server');
            this._extractClientIDs(deleted);
            requestBody = { ...deleted, version: this.version };
            let deletedData = null;
            try {
                deletedData = await this._delete(requestBody);
            } catch (error: unknown) {
                await retryIf504Status(error, requestBody, 'delete');
                return;
            }

            this.version = deletedData.version;
            for (const type of Object.keys(this.initialObjects)) {
                for (const object of deletedData[type]) {
                    delete this.initialObjects[type][object.id];
                }
            }

            onUpdate('Created objects are being saved on the server');
            const indexes = this._extractClientIDs(created);
            requestBody = { ...created, version: this.version };
            let createdData = null;
            try {
                createdData = await this._create(requestBody);
            } catch (error: unknown) {
                await retryIf504Status(error, requestBody, 'create');
                return;
            }

            this.version = createdData.version;
            this._updateCreatedObjects(createdData, indexes);
            for (const type of Object.keys(this.initialObjects)) {
                for (const object of createdData[type]) {
                    this.initialObjects[type][object.id] = object;
                }
            }
        }

        this.hash = this._getHash();
    }

    hasUnsavedChanges(): boolean {
        return this._getHash() !== this.hash;
    }
}
