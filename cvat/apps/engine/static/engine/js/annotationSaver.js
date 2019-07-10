/* exported buildAnnotationSaver */

/* global
    showOverlay:false
    showMessage:false
    Listener:false
    Logger:false
    Mousetrap:false
*/


class AnnotationSaverModel extends Listener {
    constructor(initialData, shapeCollection) {
        super('onAnnotationSaverUpdate', () => this._state);

        this._state = {
            status: null,
            message: null,
        };

        this._version = initialData.version;
        this._shapeCollection = shapeCollection;
        this._initialObjects = [];

        this._hash = this._getHash();

        // We need use data from export instead of initialData
        // Otherwise we have differ keys order and JSON comparison code incorrect
        const data = this._shapeCollection.export()[0];
        for (const shape of data.shapes) {
            this._initialObjects[shape.id] = shape;
        }

        for (const track of data.tracks) {
            this._initialObjects[track.id] = track;
        }
    }

    async _request(data, action) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}/annotations?action=${action}`,
                type: 'PATCH',
                data: JSON.stringify(data),
                contentType: 'application/json',
            }).done((savedData) => {
                resolve(savedData);
            }).fail((errorData) => {
                const message = `Could not make ${action} annotations. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    async _put(data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}/annotations`,
                type: 'PUT',
                data: JSON.stringify(data),
                contentType: 'application/json',
            }).done((savedData) => {
                resolve(savedData);
            }).fail((errorData) => {
                const message = `Could not put annotations. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    async _create(created) {
        return this._request(created, 'create');
    }

    async _update(updated) {
        return this._request(updated, 'update');
    }

    async _delete(deleted) {
        return this._request(deleted, 'delete');
    }

    async _logs() {
        Logger.addEvent(Logger.EventType.saveJob);
        const totalStat = this._shapeCollection.collectStatistic()[1];
        Logger.addEvent(Logger.EventType.sendTaskInfo, {
            'track count': totalStat.boxes.annotation + totalStat.boxes.interpolation
                + totalStat.polygons.annotation + totalStat.polygons.interpolation
                + totalStat.polylines.annotation + totalStat.polylines.interpolation
                + totalStat.points.annotation + totalStat.points.interpolation,
            'frame count': window.cvat.player.frames.stop - window.cvat.player.frames.start + 1,
            'object count': totalStat.total,
            'box count': totalStat.boxes.annotation + totalStat.boxes.interpolation,
            'polygon count': totalStat.polygons.annotation + totalStat.polygons.interpolation,
            'polyline count': totalStat.polylines.annotation + totalStat.polylines.interpolation,
            'points count': totalStat.points.annotation + totalStat.points.interpolation,
        });

        const annotationLogs = Logger.getLogs();

        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/api/v1/server/logs',
                type: 'POST',
                data: JSON.stringify(annotationLogs.export()),
                contentType: 'application/json',
            }).done(() => {
                resolve();
            }).fail((errorData) => {
                annotationLogs.save();
                const message = `Could not send logs. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    _split(exported) {
        const exportedIDs = Array.from(exported.shapes, shape => +shape.id)
            .concat(Array.from(exported.tracks, track => +track.id));

        const created = {
            version: this._version,
            shapes: [],
            tracks: [],
            tags: [],
        };

        const updated = {
            version: this._version + 1,
            shapes: [],
            tracks: [],
            tags: [],
        };

        const deleted = {
            version: this._version + 2,
            shapes: [],
            tracks: [],
            tags: [],
        };

        // Compare initial state objects and export state objects
        // in order to get updated and created objects
        for (const obj of exported.shapes.concat(exported.tracks)) {
            if (obj.id in this._initialObjects) {
                const exportedHash = JSON.stringify(obj);
                const initialSash = JSON.stringify(this._initialObjects[obj.id]);
                if (exportedHash !== initialSash) {
                    const target = 'shapes' in obj ? updated.tracks : updated.shapes;
                    target.push(obj);
                }
            } else if (typeof obj.id === 'undefined') {
                const target = 'shapes' in obj ? created.tracks : created.shapes;
                target.push(obj);
            } else {
                throw Error(`Bad object ID found: ${obj.id}. `
                    + 'It is not contained in initial state and have server ID');
            }
        }

        // Compare initial state indexes and export state indexes
        // in order to get removed objects
        for (const shapeID in this._initialObjects) {
            if (!exportedIDs.includes(+shapeID)) {
                const initialShape = this._initialObjects[shapeID];
                const target = 'shapes' in initialShape ? deleted.tracks : deleted.shapes;
                target.push(initialShape);
            }
        }

        return [created, updated, deleted];
    }

    _getHash() {
        const exported = this._shapeCollection.export()[0];
        return JSON.stringify(exported);
    }

    _updateCreatedObjects(objectsToSave, savedObjects, mapping) {
        // Method setups IDs of created objects after saving on a server
        const allSavedObjects = savedObjects.shapes.concat(savedObjects.tracks);
        const allObjectsToSave = objectsToSave.shapes.concat(objectsToSave.tracks);
        if (allSavedObjects.length !== allObjectsToSave.length) {
            throw Error('Number of saved objects and objects to save is not match');
        }

        for (let idx = 0; idx < allSavedObjects.length; idx += 1) {
            const objectModel = mapping.filter(el => el[0] === allObjectsToSave[idx])[0][1];
            const { id } = allSavedObjects[idx];
            objectModel.serverID = id;
            allObjectsToSave[idx].id = id;
        }

        this._shapeCollection.update();
    }

    notify(status, message = null) {
        this._state.status = status;
        this._state.message = message;
        Listener.prototype.notify.call(this);
    }

    hasUnsavedChanges() {
        return this._getHash() !== this._hash;
    }

    async save() {
        this.notify('saveStart');
        try {
            const [exported, mapping] = this._shapeCollection.export();
            const { flush } = this._shapeCollection;
            if (flush) {
                const data = Object.assign({}, exported, {
                    version: this._version,
                    tags: [],
                });

                this._version += 1;

                this.notify('saveCreated');
                const savedObjects = await this._put(data);
                this._updateCreatedObjects(exported, savedObjects, mapping);
                this._shapeCollection.flush = false;
                this._version = savedObjects.version;
                for (const object of savedObjects.shapes.concat(savedObjects.tracks)) {
                    this._initialObjects[object.id] = object;
                }

                this._version = savedObjects.version;
            } else {
                const [created, updated, deleted] = this._split(exported);
                this.notify('saveCreated');
                const savedCreated = await this._create(created);
                this._updateCreatedObjects(created, savedCreated, mapping);
                this._version = savedCreated.version;
                for (const object of created.shapes.concat(created.tracks)) {
                    this._initialObjects[object.id] = object;
                }

                this.notify('saveUpdated');
                const savedUpdated = await this._update(updated);
                this._version = savedUpdated.version;
                for (const object of updated.shapes.concat(updated.tracks)) {
                    if (object.id in this._initialObjects) {
                        this._initialObjects[object.id] = object;
                    }
                }

                this.notify('saveDeleted');
                const savedDeleted = await this._delete(deleted);
                this._version = savedDeleted.version;
                for (const object of savedDeleted.shapes.concat(savedDeleted.tracks)) {
                    if (object.id in this._initialObjects) {
                        delete this._initialObjects[object.id];
                    }
                }

                this._version = savedDeleted.version;
            }

            await this._logs();
        } catch (error) {
            this.notify('saveUnlocked');
            this.notify('saveError', error.message);
            this._state = {
                status: null,
                message: null,
            };
            throw Error(error);
        }

        this._hash = this._getHash();
        this.notify('saveDone');

        setTimeout(() => {
            this.notify('saveUnlocked');
            this._state = {
                status: null,
                message: null,
            };
        }, 1000);
    }

    get state() {
        return JSON.parse(JSON.stringify(this._state));
    }
}

class AnnotationSaverController {
    constructor(model) {
        this._model = model;
        this._autoSaveInterval = null;

        const { shortkeys } = window.cvat.config;
        Mousetrap.bind(shortkeys.save_work.value, () => {
            this.save();
            return false;
        }, 'keydown');
    }

    autoSave(enabled, time) {
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = null;
        }

        if (enabled) {
            this._autoSaveInterval = setInterval(() => {
                this.save();
            }, time * 1000 * 60);
        }
    }

    hasUnsavedChanges() {
        return this._model.hasUnsavedChanges();
    }

    save() {
        if (this._model.state.status === null) {
            this._model.save().catch((error) => {
                setTimeout(() => {
                    throw error;
                });
            });
        }
    }
}


class AnnotationSaverView {
    constructor(model, controller) {
        model.subscribe(this);

        this._controller = controller;
        this._overlay = null;

        const { shortkeys } = window.cvat.config;
        const saveHelp = `${shortkeys.save_work.view_value} - ${shortkeys.save_work.description}`;

        this._saveButton = $('#saveButton').on('click', () => {
            this._controller.save();
        }).attr('title', saveHelp);

        this._autoSaveBox = $('#autoSaveBox').on('change', (e) => {
            const enabled = e.target.checked;
            const time = +this._autoSaveTime.prop('value');
            this._controller.autoSave(enabled, time);
        });

        this._autoSaveTime = $('#autoSaveTime').on('change', (e) => {
            e.target.value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            this._autoSaveBox.trigger('change');
        });

        window.onbeforeunload = (e) => {
            if (this._controller.hasUnsavedChanges()) { // eslint-disable-line react/no-this-in-sfc
                const message = 'You have unsaved changes. Leave this page?';
                e.returnValue = message;
                return message;
            }
            return null;
        };
    }

    onAnnotationSaverUpdate(state) {
        if (state.status === 'saveStart') {
            this._overlay = showOverlay('Annotations are being saved..');
            this._saveButton.prop('disabled', true).text('Saving..');
        } else if (state.status === 'saveDone') {
            this._saveButton.text('Successful save');
            this._overlay.remove();
        } else if (state.status === 'saveError') {
            this._saveButton.prop('disabled', false).text('Save Work');
            const message = `Couldn't to save the job. Errors occured: ${state.message}. `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
            this._overlay.remove();
        } else if (state.status === 'saveCreated') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Created objects are being saved..`);
        } else if (state.status === 'saveUpdated') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Updated objects are being saved..`);
        } else if (state.status === 'saveDeleted') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Deleted objects are being saved..`);
        } else if (state.status === 'saveUnlocked') {
            this._saveButton.prop('disabled', false).text('Save Work');
        } else {
            const message = `Unknown state has been reached during annotation saving: ${state.status} `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
        }
    }
}


function buildAnnotationSaver(initialData, shapeCollection) {
    const model = new AnnotationSaverModel(initialData, shapeCollection);
    const controller = new AnnotationSaverController(model);
    new AnnotationSaverView(model, controller);
}
