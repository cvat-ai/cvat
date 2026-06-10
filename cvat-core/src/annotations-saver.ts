// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import serverProxy, { sleep } from './server-proxy';
import { Job, Task } from './session';
import { DataError, ServerError } from './exceptions';
import { SerializedCollection, SerializedTrack } from './server-response-types';

interface ExtractedIDs {
    shapes: number[];
    tracks: number[];
    tags: number[];
    intervals: number[];
}

interface SplittedCollection {
    created: SerializedCollection;
    updated: SerializedCollection;
    deleted: SerializedCollection;
}

type CollectionObject = SerializedCollection[keyof SerializedCollection][number];

const COLLECTION_KEYS = ['shapes', 'tracks', 'tags', 'intervals'] as const;
const JSON_SERIALIZER_KEYS = [
    'id',
    'label_id',
    'group',
    'frame',
    'start',
    'stop',
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

const sortAttributes = (attributes: { spec_id: number }[]): { spec_id: number }[] => (
    attributes.sort(({ spec_id: specID1 }, { spec_id: specID2 }) => specID1 - specID2)
);

const sortTrackedShapes = (shapes: SerializedTrack['shapes']): SerializedTrack['shapes'] => (
    shapes.sort(({ frame: frame1 }, { frame: frame2 }) => frame1 - frame2)
);

const isTheSameAttributes = (
    a: { spec_id: number }[],
    b: { spec_id: number }[],
): boolean => (
    JSON.stringify(sortAttributes(a)) === JSON.stringify(sortAttributes(b))
);

const isTheSamePoints = (
    a: number[] | undefined,
    b: number[] | undefined,
): boolean => (
    (a === undefined && b === undefined) ||
    (a.length === b.length && a.every((coord, index) => coord.toFixed(1) === b[index].toFixed(1)))
);

const isTheSameTrackedShapes = (
    a: SerializedTrack['shapes'],
    b: SerializedTrack['shapes'],
): boolean => {
    const sortedA = sortTrackedShapes(a);
    const sortedB = sortTrackedShapes(b);

    return sortedA.length === sortedB.length &&
        sortedA.every((shape, index) => {
            // The server can extend tracked shape attributes with defaults or previous mutable values.
            // During 504 recovery, only attributes sent by the client must be preserved for matching.
            const receivedAttributes = sortedB[index].attributes.filter((attr) => (
                shape.attributes.some((sentAttr) => sentAttr.spec_id === attr.spec_id)
            ));

            return shape.frame === sortedB[index].frame &&
                shape.type === sortedB[index].type &&
                shape.occluded === sortedB[index].occluded &&
                shape.outside === sortedB[index].outside &&
                shape.z_order === sortedB[index].z_order &&
                shape.rotation === sortedB[index].rotation &&
                isTheSamePoints(shape.points, sortedB[index].points) &&
                isTheSameAttributes(shape.attributes, receivedAttributes);
        });
};

const isTheSameTag = (
    a: SerializedCollection['tags'][number],
    b: SerializedCollection['tags'][number],
): boolean => (
    a.label_id === b.label_id &&
    a.frame === b.frame &&
    a.group === b.group &&
    a.source === b.source &&
    isTheSameAttributes(a.attributes, b.attributes)
);

const isTheSameInterval = (
    a: SerializedCollection['intervals'][number],
    b: SerializedCollection['intervals'][number],
): boolean => (
    a.label_id === b.label_id &&
    a.start === b.start &&
    a.stop === b.stop &&
    a.group === b.group &&
    a.source === b.source &&
    isTheSameAttributes(a.attributes, b.attributes)
);

const isTheSameShape = (
    a: Omit<SerializedCollection['shapes'][number], 'elements'>,
    b: Omit<SerializedCollection['shapes'][number], 'elements'>,
): boolean => {
    const isSame = a.label_id === b.label_id &&
        a.frame === b.frame &&
        a.group === b.group &&
        a.source === b.source &&
        a.occluded === b.occluded &&
        a.z_order === b.z_order &&
        a.rotation === b.rotation &&
        a.type === b.type &&
        isTheSameAttributes(a.attributes, b.attributes) &&
        isTheSamePoints(a.points, b.points);

    if ('elements' in a && Array.isArray(a.elements) && 'elements' in b && Array.isArray(b.elements)) {
        return isSame && a.elements.length === b.elements.length &&
            a.elements.every((element, index) => isTheSameShape(element, b.elements[index]));
    }

    return isSame;
};

type SerializedTrackLike = Omit<SerializedTrack, 'elements'> & {
    elements?: SerializedTrackLike[];
};
const isTheSameTrack = (
    a: SerializedTrackLike,
    b: SerializedTrackLike,
): boolean => {
    const isSame = a.label_id === b.label_id &&
        a.group === b.group &&
        a.source === b.source &&
        isTheSameAttributes(a.attributes, b.attributes) &&
        isTheSameTrackedShapes(a.shapes, b.shapes);

    if ('elements' in a && Array.isArray(a.elements) && 'elements' in b && Array.isArray(b.elements)) {
        return isSame && a.elements.length === b.elements.length &&
            a.elements.every((element, index) => isTheSameTrack(element, b.elements[index]));
    }

    return isSame;
};

const isTheSameObject = (
    type: typeof COLLECTION_KEYS[number],
    left: CollectionObject,
    right: CollectionObject,
): boolean => {
    switch (type) {
        case 'shapes':
            return isTheSameShape(
                left as SerializedCollection['shapes'][number],
                right as SerializedCollection['shapes'][number],
            );
        case 'tracks':
            return isTheSameTrack(
                left as SerializedCollection['tracks'][number],
                right as SerializedCollection['tracks'][number],
            );
        case 'tags':
            return isTheSameTag(
                left as SerializedCollection['tags'][number],
                right as SerializedCollection['tags'][number],
            );
        case 'intervals':
            return isTheSameInterval(
                left as SerializedCollection['intervals'][number],
                right as SerializedCollection['intervals'][number],
            );
        default:
            throw new Error(`Unknown collection type: ${type}`);
    }
};

function removeIDFromObject<T extends CollectionObject>(
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
    private collection: any;
    private hash: string;
    private initialObjects: {
        shapes: Map<number, SerializedCollection['shapes'][0]>,
        tracks: Map<number, SerializedCollection['tracks'][0]>,
        tags: Map<number, SerializedCollection['tags'][0]>,
        intervals: Map<number, SerializedCollection['intervals'][0]>,
    };

    constructor(collection, session: Task | Job) {
        this.sessionType = session instanceof Task ? 'task' : 'job';
        this.id = session.id;
        this.collection = collection;
        this.hash = this._getHash();
        this.initialObjects = {
            shapes: new Map<number, SerializedCollection['shapes'][number]>(),
            tracks: new Map<number, SerializedCollection['tracks'][number]>(),
            tags: new Map<number, SerializedCollection['tags'][number]>(),
            intervals: new Map<number, SerializedCollection['intervals'][number]>(),
        };

        // We need use data from export instead of initialData
        // Otherwise we have differ keys order and JSON comparison code works incorrectly
        const exported = this.collection.export();
        for (const key of COLLECTION_KEYS) {
            for (const object of exported[key]) {
                this.initialObjects[key].set(object.id, object);
            }
        }
    }

    _getHash(): string {
        const exported = this.collection.export();
        return JSON.stringify(exported);
    }

    async _request(data: SerializedCollection, action: 'put' | 'create' | 'update' | 'delete'): Promise<SerializedCollection> {
        const collection = await serverProxy.annotations.updateAnnotations(this.sessionType, this.id, data, action);
        return collection;
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
                intervals: [],
            },
            updated: {
                shapes: [],
                tracks: [],
                tags: [],
                intervals: [],
            },
            deleted: {
                shapes: [],
                tracks: [],
                tags: [],
                intervals: [],
            },
        };

        // Find created and updated objects
        for (const objectType of COLLECTION_KEYS) {
            for (const object of exported[objectType]) {
                if (Number.isInteger(object.id) && this.initialObjects[objectType].has(object.id)) {
                    const exportedHash = JSON.stringify(object, JSON_SERIALIZER_KEYS);
                    const initialHash = JSON.stringify(
                        this.initialObjects[objectType].get(object.id), JSON_SERIALIZER_KEYS,
                    );

                    if (exportedHash !== initialHash) {
                        splitted.updated[objectType].push(object as any);
                    }
                } else {
                    removeIDFromObject(object, 'id');
                    splitted.created[objectType].push(object as any);
                }
            }
        }

        // Now find deleted objects
        const exportedServerIds = {
            shapes: new Set(exported.shapes.map((object) => +object.id)),
            tracks: new Set(exported.tracks.map((object) => +object.id)),
            tags: new Set(exported.tags.map((object) => +object.id)),
            intervals: new Set(exported.intervals.map((object) => +object.id)),
        };

        for (const type of COLLECTION_KEYS) {
            for (const id of this.initialObjects[type].keys()) {
                if (!exportedServerIds[type].has(id)) {
                    const object = this.initialObjects[type].get(id);
                    splitted.deleted[type].push(object as any);
                }
            }
        }

        return splitted;
    }

    _updateSavedObjects(saved: SerializedCollection, indexes: ExtractedIDs): void {
        const savedLength = COLLECTION_KEYS.reduce((acc, type) => acc + saved[type].length, 0);
        const indexesLength = COLLECTION_KEYS.reduce((acc, type) => acc + indexes[type].length, 0);
        if (indexesLength !== savedLength) {
            throw new DataError(
                'Server returned different number of objects than client sent ' +
                `(${savedLength} vs ${indexesLength}).`,
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

    _extractClientIDs(exported: SerializedCollection): ExtractedIDs {
        // Receive client IDs before saving
        const indexes = {
            tracks: exported.tracks.map((track) => track.clientID),
            shapes: exported.shapes.map((shape) => shape.clientID),
            tags: exported.tags.map((tag) => tag.clientID),
            intervals: exported.intervals.map((interval) => interval.clientID),
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
        for (const type of COLLECTION_KEYS) {
            for (const object of responseBody[type]) {
                this.initialObjects[type].set(object.id, object as any);
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
            onUpdate('Collection is being saved on the server');
            // remove server IDs if there are any, annotations will be rewritten
            const indexes = this._extractClientIDs(exported);
            for (const type of COLLECTION_KEYS) {
                for (const object of exported[type]) {
                    removeIDFromObject(object, 'id');
                }
            }

            const savedData = await this._put(exported);
            this.collection.flush = false;

            this._updateSavedObjects(savedData, indexes);
            this.initialObjects = {
                shapes: new Map(),
                tracks: new Map(),
                tags: new Map(),
                intervals: new Map(),
            };

            for (const type of COLLECTION_KEYS) {
                for (const object of savedData[type]) {
                    this.initialObjects[type].set(object.id, object as any);
                }
            }
        } else {
            // with using ASGI server it is possible to get 504 (RequestTimeout)
            // from nginx proxy, when the request is still being processed by the server
            // that is not good that client knows about the server details
            // but we implemented a workaround here

            const findPair = (
                key: typeof COLLECTION_KEYS[number],
                objectToSave: CollectionObject,
                serverCollection: SerializedCollection,
            ): CollectionObject | null => {
                const serverObjects = serverCollection[key];
                const existingIDs = Array.from(this.initialObjects[key].keys());
                const { label_id: labelID } = objectToSave;

                // optimization to avoid stringifying each object in collection
                const potentialObjects = serverObjects.filter(
                    (object) => {
                        const isPotential = object.label_id === labelID && !existingIDs.includes(object.id);
                        if (key === 'intervals') {
                            return isPotential && ['start', 'stop'].every((property) => object[property] === objectToSave[property]);
                        }

                        if (key === 'shapes' || key === 'tags') {
                            return isPotential && ['frame'].every((property) => object[property] === objectToSave[property]);
                        }

                        return isPotential;
                    },
                );

                return potentialObjects.find((object) => isTheSameObject(key, objectToSave, object)) ?? null;
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

                    const RETRY_PERIOD = 30000;
                    let retryCount = 3;
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
                                        intervals: [],
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
                        } catch {
                            retryCount--;
                        }
                    }
                }

                throw error;
            };

            const { created, updated, deleted } = this._split(exported);

            if (COLLECTION_KEYS.some((type) => updated[type].length)) {
                onUpdate('Updated objects are being saved on the server');
                const updatedIndexes = this._extractClientIDs(updated);
                let updatedData = null;
                try {
                    updatedData = await this._update(updated);
                } catch (error: unknown) {
                    updatedData = await retryIf504Status(error, updated, 'update');
                }

                this._updateSavedObjects(updatedData, updatedIndexes);
                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of updatedData[type]) {
                        this.initialObjects[type].set(object.id, object as any);
                    }
                }
            }

            if (COLLECTION_KEYS.some((type) => deleted[type].length)) {
                onUpdate('Deleted objects are being deleted from the server');
                this._extractClientIDs(deleted);
                let deletedData = null;
                try {
                    deletedData = await this._delete(deleted);
                } catch (error: unknown) {
                    deletedData = await retryIf504Status(error, deleted, 'delete');
                }

                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of deletedData[type]) {
                        this.initialObjects[type].delete(object.id);
                    }
                }
            }

            if (COLLECTION_KEYS.some((type) => created[type].length)) {
                onUpdate('Created objects are being saved on the server');
                const createdIndexes = this._extractClientIDs(created);
                let createdData = null;
                try {
                    createdData = await this._create(created);
                } catch (error: unknown) {
                    createdData = await retryIf504Status(error, created, 'create');
                }

                this._updateSavedObjects(createdData, createdIndexes);
                for (const type of Object.keys(this.initialObjects)) {
                    for (const object of createdData[type]) {
                        this.initialObjects[type].set(object.id, object as any);
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
