/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const serverProxy = require('./server-proxy');

    class AnnotationsSaver {
        constructor(version, collection, session) {
            this.sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
            this.id = session.id;
            this.version = version;
            this.collection = collection;
            this.initialObjects = [];
            this.hash = this._getHash();

            // We need use data from export instead of initialData
            // Otherwise we have differ keys order and JSON comparison code incorrect
            const exported = this.collection.export();
            for (const shape of exported.shapes) {
                this.initialObjects[shape.id] = shape;
            }

            for (const track of exported.tracks) {
                this.initialObjects[track.id] = track;
            }

            for (const tag of exported.tags) {
                this.initialObjects[tag.id] = tag;
            }
        }

        _getHash() {
            const exported = this.collection.export();
            return JSON.stringify(exported);
        }

        async _request(data, action) {
            const result = await serverProxy.annotations.updateAnnotations(
                this.sessionType,
                this.id,
                data,
                action,
            );

            return result;
        }

        async _put(data) {
            const result = await this._request(data, 'put');
            return result;
        }

        async _create(created) {
            const result = await this._request(created, 'create');
            return result;
        }

        async _update(updated) {
            const result = await this._request(updated, 'update');
            return result;
        }

        async _delete(deleted) {
            const result = await this._request(deleted, 'delete');
            return result;
        }

        _split(exported) {
            const splitted = {
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
            for (const type of Object.keys(exported)) {
                for (const object of exported[type]) {
                    if (object.id in this.initialObjects) {
                        const exportedHash = JSON.stringify(object);
                        const initialHash = JSON.stringify(this.initialObjects[object.id]);
                        if (exportedHash !== initialHash) {
                            splitted.updated[type].push(object);
                        }
                    } else if (typeof (object.id) === 'undefined') {
                        splitted.created[type].push(object);
                    } else {
                        throw new window.cvat.exceptions.ScriptingError(
                            `Id of object is defined "${object.id}"`
                            + 'but it absents in initial state',
                        );
                    }
                }
            }

            // Now find deleted objects
            const indexes = exported.tracks.concat(exported.shapes)
                .concat(exported.tags).map(object => object.id);

            for (const id of Object.keys(this.initialObjects)) {
                if (!indexes.includes(+id)) {
                    const object = this.initialObjects[id];
                    let type = null;
                    if ('shapes' in object) {
                        type = 'tracks';
                    } else if ('points' in object) {
                        type = 'shapes';
                    } else {
                        type = 'tags';
                    }
                    splitted.deleted[type].push(object);
                }
            }

            return splitted;
        }

        _updateCreatedObjects(saved, indexes) {
            const savedLength = saved.tracks.length
                + saved.shapes.length + saved.tags.length;

            const indexesLength = indexes.tracks.length
                + indexes.shapes.length + indexes.tags.length;

            if (indexesLength !== savedLength) {
                throw new window.cvat.exception.ScriptingError(
                    'Number of indexes is differed by number of saved objects'
                        + `${indexesLength} vs ${savedLength}`,
                );
            }

            // Updated IDs of created objects
            for (const type of Object.keys(indexes)) {
                for (let i = 0; i < indexes[type].length; i++) {
                    const clientID = indexes[type][i];
                    this.collection.objects[clientID].serverID = saved[type][i].id;
                    if (type === 'tracks') {
                        // We have to reset cache because of old value of serverID was saved there
                        this.collection.objects[clientID].resetCache();
                    }
                }
            }
        }

        _receiveIndexes(exported) {
            // Receive client indexes before saving
            const indexes = {
                tracks: exported.tracks.map(track => track.clientID),
                shapes: exported.shapes.map(shape => shape.clientID),
                tags: exported.tags.map(tag => tag.clientID),
            };

            // Remove them from the request body
            exported.tracks.concat(exported.shapes).concat(exported.tags)
                .map((value) => {
                    delete value.clientID;
                    return value;
                });

            return indexes;
        }

        async save(onUpdate) {
            if (typeof onUpdate !== 'function') {
                onUpdate = (message) => {
                    console.log(message);
                };
            }

            try {
                const exported = this.collection.export();
                const { flush } = this.collection;
                if (flush) {
                    onUpdate('New objects are being saved..');
                    const indexes = this._receiveIndexes(exported);
                    const savedData = await this._put(Object.assign({}, exported, {
                        version: this.version,
                    }));
                    this.version = savedData.version;
                    this.collection.flush = false;

                    onUpdate('Saved objects are being updated in the client');
                    this._updateCreatedObjects(savedData, indexes);

                    onUpdate('Initial state is being updated');
                    for (const object of savedData.shapes
                        .concat(savedData.tracks).concat(savedData.tags)) {
                        this.initialObjects[object.id] = object;
                    }
                } else {
                    const {
                        created,
                        updated,
                        deleted,
                    } = this._split(exported);

                    onUpdate('New objects are being saved..');
                    const indexes = this._receiveIndexes(created);
                    const createdData = await this._create(Object.assign({}, created, {
                        version: this.version,
                    }));
                    this.version = createdData.version;

                    onUpdate('Saved objects are being updated in the client');
                    this._updateCreatedObjects(createdData, indexes);

                    onUpdate('Initial state is being updated');
                    for (const object of createdData.shapes
                        .concat(createdData.tracks).concat(createdData.tags)) {
                        this.initialObjects[object.id] = object;
                    }

                    onUpdate('Changed objects are being saved..');
                    this._receiveIndexes(updated);
                    const updatedData = await this._update(Object.assign({}, updated, {
                        version: this.version,
                    }));
                    this.version = createdData.version;

                    onUpdate('Initial state is being updated');
                    for (const object of updatedData.shapes
                        .concat(updatedData.tracks).concat(updatedData.tags)) {
                        this.initialObjects[object.id] = object;
                    }

                    onUpdate('Changed objects are being saved..');
                    this._receiveIndexes(deleted);
                    const deletedData = await this._delete(Object.assign({}, deleted, {
                        version: this.version,
                    }));
                    this._version = deletedData.version;

                    onUpdate('Initial state is being updated');
                    for (const object of deletedData.shapes
                        .concat(deletedData.tracks).concat(deletedData.tags)) {
                        delete this.initialObjects[object.id];
                    }
                }

                this.hash = this._getHash();
                onUpdate('Saving is done');
            } catch (error) {
                onUpdate(`Can not save annotations: ${error.message}`);
                throw error;
            }
        }

        hasUnsavedChanges() {
            return this._getHash() !== this.hash;
        }
    }

    module.exports = AnnotationsSaver;
})();
