// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    created: Omit<SerializedCollection, 'version'>;
    updated: Omit<SerializedCollection, 'version'>;
    deleted: Omit<SerializedCollection, 'version'>;
}

type CollectionObject = SerializedShape | SerializedTrack | SerializedTag;

const COLLECTION_KEYS: ('shapes' | 'tracks' | 'tags')[] = ['shapes', 'tracks', 'tags'];
const JSON_SERIALIZER_KEYS = [
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

function removeIDFromObject<T extends SerializedShape | SerializedTag | SerializedTrack>(
    object: T,
    property: 'id' | 'clientID',
): T {
    delete object[property];
    if ('shapes' in object && Array.isArray(object.shapes)) {
        for (const shape of object.shapes) {
            delete shape[property];
        }
    }

    if ('elements' in object && Array.isArray(object.elements)) {
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

    async _request(data: SerializedCollection, action: 'put' | 'create' | 'update' | 'delete'): Promise<SerializedCollection> {
        const result = await serverProxy.annotations.updateAnnotations(this.sessionType, this.id, data, action);
        return result;
    }

    async _put(data: SerializedCollection): Promise<SerializedCollection> {
        const result = await this._request(data, 'put');
        return result;
    }

    async _create(created: SerializedCollection): Promise<SerializedCollection> {
        const result = await this._request(created, 'create');
        return result;
    }

    async _update(updated: SerializedCollection): Promise<SerializedCollection> {
        const result = await this._request(updated, 'update');
        return result;
    }

    async _delete(deleted: SerializedCollection): Promise<SerializedCollection> {
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

        // Find created and updated objects
        for (const type of COLLECTION_KEYS) {
            for (const object of exported[type]) {
                if (typeof object.id === 'undefined') {
                    splitted.created[type].push(object as any);
                } else if (object.id in this.initialObjects[type]) {
                    const exportedHash = JSON.stringify(object, JSON_SERIALIZER_KEYS);
                    const initialHash = JSON.stringify(this.initialObjects[type][object.id], JSON_SERIALIZER_KEYS);
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

    _updateCreatedObjects(saved: SerializedCollection, indexes: ExtractedIDs): void {
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
                this.collection.objects[clientID].updateFromServerResponse(saved[type][i]);
            }
        }
    }

    _extractClientIDs(exported: Omit<SerializedCollection, 'version'>): ExtractedIDs {
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

    _updateInitialObjects(responseBody: SerializedCollection): void {
        this.version = responseBody.version;
        for (const type of COLLECTION_KEYS) {
            for (const object of responseBody[type]) {
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

            const mutateForCompare = (
                object: CollectionObject | SerializedTrack['shapes'][0],
            ): CollectionObject | SerializedTrack['shapes'][0] => ({
                ...object,
                ...('attributes' in object ? {
                    attributes: object.attributes
                        .sort(({ spec_id: specID1 }, { spec_id: specID2 }) => specID1 - specID2),
                } : {}),
                ...('points' in object && Array.isArray(object.points) ? {
                    points: object.points.map((coord) => +coord.toFixed(4)),
                } : {}),
                ...('elements' in object && Array.isArray(object.elements) ? {
                    elements: object.elements
                        .sort(({ label_id: labelID1 }, { label_id: labelID2 }) => labelID1 - labelID2)
                        .map((element) => mutateForCompare(element)),
                } : {}),
                ...('shapes' in object && Array.isArray(object.shapes) ? {
                    shapes: object.shapes
                        .map((shape) => mutateForCompare(shape)),
                } : {}),
            });

            const findPair = (
                key: typeof COLLECTION_KEYS[0],
                objectToSave: CollectionObject,
                serverCollection: SerializedCollection,
            ): CollectionObject | null => {
                const collection = serverCollection[key];
                const existingIDs = Object.keys(this.initialObjects[key]).map((id) => +id);
                const { frame, label_id: labelID } = objectToSave;

                // optimization to avoid stringifying each object in collection
                const potentialObjects = collection.filter(
                    (object) => object.frame === frame &&
                    object.label_id === labelID &&
                    !existingIDs.includes(object.id), // exclude objects that client knows
                );

                const comparedKeys = JSON_SERIALIZER_KEYS.filter((_key) => !['id', 'attributes'].includes(_key));
                const stringifiedObjectToSave = JSON.stringify(mutateForCompare(objectToSave), comparedKeys);
                return potentialObjects.find((object) => {
                    const stringifiedObject = JSON.stringify(mutateForCompare(object), comparedKeys);
                    return stringifiedObject === stringifiedObjectToSave;
                }) || null;
            };

            const retryIf504Status = async (
                error: unknown,
                requestBody: SerializedCollection,
                action: 'update' | 'delete' | 'create',
            ): Promise<SerializedCollection> => {
                if (error instanceof ServerError && error.code === 504) {
                    setTimeout(() => {
                        // just for logging
                        throw new Error(
                            `Code 504 received from the server when ${action} objects, running workaround`,
                        );
                    });

                    const RETRY_PERIOD = 10000;
                    let retryCount = 10;
                    while (retryCount) {
                        try {
                            await sleep(RETRY_PERIOD);
                            switch (action) {
                                case 'update': {
                                    return await this._update(requestBody);
                                }
                                case 'delete': {
                                    return await this._delete(requestBody);
                                }
                                case 'create': {
                                    const serverCollection = await serverProxy.annotations
                                        .getAnnotations(this.sessionType, this.id);
                                    const foundPairs: SerializedCollection = {
                                        shapes: [],
                                        tracks: [],
                                        tags: [],
                                        version: serverCollection.version,
                                    };
                                    for (const type of COLLECTION_KEYS) {
                                        for (const obj of requestBody[type]) {
                                            const pair = findPair(type, obj, serverCollection);
                                            if (pair === null) {
                                                throw new Error('Pair not found this iteration');
                                            }
                                            foundPairs[type].push(pair as any);
                                        }
                                    }

                                    return foundPairs;
                                }
                                default:
                                    throw new Error('Unknown action');
                            }
                        } catch (_: unknown) {
                            retryCount--;
                        }
                    }
                }

                throw error;
            };

            const { created, updated, deleted } = this._split(exported);

            if (updated.shapes.length || updated.tags.length || updated.tracks.length) {
                onUpdate('Updated objects are being saved on the server');
                const updatedIndexes = this._extractClientIDs(updated);
                const requestBody = { ...updated, version: this.version };
                let updatedData = null;
                try {
                    updatedData = await this._update(requestBody);
                } catch (error: unknown) {
                    updatedData = await retryIf504Status(error, requestBody, 'update');
                }

                this.version = updatedData.version;
                this._updateCreatedObjects(updatedData, updatedIndexes);
                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of updatedData[type]) {
                        this.initialObjects[type][object.id] = object;
                    }
                }
            }

            if (deleted.shapes.length || deleted.tags.length || deleted.tracks.length) {
                onUpdate('Deleted objects are being deleted from the server');
                this._extractClientIDs(deleted);
                const requestBody = { ...deleted, version: this.version };
                let deletedData = null;
                try {
                    deletedData = await this._delete(requestBody);
                } catch (error: unknown) {
                    deletedData = await retryIf504Status(error, requestBody, 'delete');
                }

                this.version = deletedData.version;
                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of deletedData[type]) {
                        delete this.initialObjects[type][object.id];
                    }
                }
            }

            if (created.shapes.length || created.tags.length || created.tracks.length) {
                onUpdate('Created objects are being saved on the server');
                const createdIndexes = this._extractClientIDs(created);
                const requestBody = { ...created, version: this.version };
                let createdData = null;
                try {
                    createdData = await this._create(requestBody);
                } catch (error: unknown) {
                    createdData = await retryIf504Status(error, requestBody, 'create');
                }

                this.version = createdData.version;
                this._updateCreatedObjects(createdData, createdIndexes);
                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of createdData[type]) {
                        this.initialObjects[type][object.id] = object;
                    }
                }
            }
        }

        this.hash = this._getHash();
    }

    hasUnsavedChanges(): boolean {
        return this._getHash() !== this.hash;
    }
}
