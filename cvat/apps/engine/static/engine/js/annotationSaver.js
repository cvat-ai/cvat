/* exported buildAnnotationSaver */

/* global
    showOverlay:false
    showMessage:false
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
        this._hash = objectHash(shapeCollection.export());

        for (let shape of initialData.shapes) {
            this._initialObjects[shape.id] = shape;
        }

        for (let track of initialData.tracks) {
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
            }).done((data) => {
                resolve(data);
            }).fail((errorData) => {
                const message = `Could not make ${action} annotation. Code: ${errorData.status}. ` +
                    `Message: ${errorData.responseText || errorData.statusText}`;
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
            'track count': totalStat.boxes.annotation + totalStat.boxes.interpolation +
                totalStat.polygons.annotation + totalStat.polygons.interpolation +
                totalStat.polylines.annotation + totalStat.polylines.interpolation +
                totalStat.points.annotation + totalStat.points.interpolation,
            'frame count': window.cvat.player.frames.stop - window.cvat.player.frames.start + 1,
            'object count': totalStat.total,
            'box count': totalStat.boxes.annotation + totalStat.boxes.interpolation,
            'polygon count': totalStat.polygons.annotation + totalStat.polygons.interpolation,
            'polyline count': totalStat.polylines.annotation + totalStat.polylines.interpolation,
            'points count': totalStat.points.annotation + totalStat.points.interpolation,
        });

        const annotationLogs = Logger.getLogs();

        // TODO: Save logs
    }

    _split(exported) {
        const exportedIDs = Array.from(exported.shapes, (shape) => +shape.id)
            .concat(Array.from(exported.tracks, (track) => +track.id));

        const created = {
            version: this._version,
            shapes: [],
            tracks: [],
            tags: [],
        }

        const updated = {
            version: this._version + 1,
            shapes: [],
            tracks: [],
            tags: [],
        }

        const deleted = {
            version: this._version + 2,
            shapes: [],
            tracks: [],
            tags: [],
        }

        // Compare initial state objects and export state objects
        // in order to get updated and created objects
        for (let obj of exported.shapes.concat(exported.tracks)) {
            if (obj.id in this._initialObjects) {
                const exportedHash = objectHash(obj);
                const initialSash = objectHash(this._initialObjects[obj.id]);
                if (exportedHash != initialSash) {
                    const target = 'shapes' in obj ? updated.tracks : updated.shapes;
                    target.push(obj);
                }
            } else if (typeof(obj.id) === 'undefined') {
                const target = 'shapes' in obj ? created.tracks : created.shapes;
                target.push(obj);
            } else {
                throw Error(`Bad object ID found: ${obj.id}. `
                    + 'It is not contained in initial state and have server ID');
            }
        }

        // Compare initial state indexes and export state indexes
        // in order to get removed objects
        for (let shapeID in this._initialObjects) {
            if (!exportedIDs.includes(+shapeID)) {
                const initialShape = this._initialObjects[shapeID];
                const target = 'shapes' in initialShape ? deleted.tracks : deleted.shapes;
                target.push(initialShape);
            }
        }

        return [created, updated, deleted];
    }

    notify(status, message = null) {
        this._state.status = status;
        this._state.message = message;
        Listener.prototype.notify.call(this);
    }

    hasUnsavedChanges() {
        return objectHash(this._shapeCollection.export()) != this._hash;
    }

    async save() {
        this.notify('saveStart');
        try {
            const exported = this._shapeCollection.export();
            const [created, updated, deleted] = this._split(exported);

            this.notify('saveCreated');
            const savedCreatedObjects = await this._create(created);
            for (let object of savedCreatedObjects.shapes.concat(savedCreatedObjects.tracks)) {
                this._initialObjects[object.id] = object;
            }

            this.notify('saveUpdated');
            const savedUpdatedObjects = await this._update(updated);
            for (let object of savedUpdatedObjects.shapes.concat(savedUpdatedObjects.tracks)) {
                if (object.id in this._initialObjects) {
                    this._initialObjects[object.id] = object;
                }
            }

            this.notify('saveDeleted');
            const savedDeletedObjects = await this._delete(deleted);
            for (let object of savedDeletedObjects.shapes.concat(savedDeletedObjects.tracks)) {
                if (object.id in this._initialObjects) {
                    delete this._initialObjects[object.id];
                }
            }

            this._version = savedDeletedObjects.version;
            this._hash = objectHash(this._shapeCollection.export());
            this.notify('saveDone');
        } catch (error) {
            this.notify('saveError', error);
            throw Error(error);
        } finally {
            this._state = {
                status: null,
                message: null,
            }
        }
    }

    get state() {
        return JSON.parse(JSON.stringify(this._state));
    }
}


class AnnotationSaverController {
    constructor(model) {
        this._model = model;
        this._autoSaveInterval = null;

        const shortkeys = window.cvat.config.shortkeys;
        Mousetrap.bind(shortkeys["save_work"].value, () => {
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
            this._model.save();
        }
    }
}


class AnnotationSaverView {
    constructor(model, controller) {
        model.subscribe(this);

        this._controller = controller;
        this._overlay = null;

        const shortkeys = window.cvat.config.shortkeys;
        const saveHelp = `${shortkeys['save_work'].view_value} - ${shortkeys['save_work'].description}`;

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
            if (this._controller.hasUnsavedChanges()) {
                let message = "You have unsaved changes. Leave this page?";
                e.returnValue = message;
                return message;
            }
            return;
        };
    }

    onAnnotationSaverUpdate(state) {
        if (state.status === 'saveStart') {
            this._overlay = showOverlay('Annotations are being saved..');
            this._saveButton.prop('disabled', true).text('Saving..');
        } else if (state.status === 'saveDone') {
            this._saveButton.text('Successful save');
            setTimeout(() => {
                this._saveButton.prop('disabled', false).text('Save Work');
            }, 10000);
            this._overlay.remove();
        } else if (state.status === 'saveError') {
            this._saveButton.prop('disabled', false).text('Save Work');
            const message = `Couldn't to save the job. Errors occured: ${state.message}. `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
            this._overlay.remove();
        } else if (state.status === 'saveCreated') {
            this._overlay.setMessage(`${this._overlay.getMessage()}` + '<br /> - Created objects are being saved..');
        } else if (state.status === 'saveUpdated') {
            this._overlay.setMessage(`${this._overlay.getMessage()}` + '<br /> - Updated objects are being saved..');
        } else if (state.status === 'saveDeleted') {
            this._overlay.setMessage(`${this._overlay.getMessage()}` + '<br /> - Deleted objects are being saved..');
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