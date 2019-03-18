class AnnotationSaver extends Listener {
    constructor(initialData, shapeCollection) {
        super('onAnnotationSaverUpdate', () => this._state);

        this._state = {
            status: null,
            message: null,
        };

        this._version = initialData.version;
        this._shapeCollection = shapeCollection;
        this._initialObjects = [];

        for (let shape of initialData.shapes) {
            this._objects[shape.id] = shape;
        }

        for (let track of initialData.tracks) {
            this._objects[track.id] = track;
        }
    }

    async _request(data, action) {
        return $.ajax({
            url: `/api/v1/jobs/${window.cvat.job.id}/annotations`,
            type: 'PATCH',
            action: action,
            data: JSON.stringify(data),
            contentType: 'application/json',
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
        // TODO: Get actual version from responce
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

        // TODO: split

        return [created, updated, deleted];
    }

    notify(status, message = null) {
        this._state.status = status;
        this._state.message = message;
        Listener.prototype.notify.call(this);
    }

    async save() {
        this.notify('saveStart');
        try {
            const exported = this._collection.export();
            [created, updated, deleted] = this._split(exported);

            this.notify('saveCreate');
            const createdResponse = await this._create(created);
            // update created

            this.notify('saveUpdated');
            const updatedResponse = await this._update(updated);
            // update updated

            this.notify('saveDelete');
            const deletedResponse = await this._delete(deleted);
            // updated deleted
        } catch (error) {
            this.notify('saveError', error);
        }

        this._state = {
            status: null,
            message: null,
        }
        this.notify('saveDone');
    }

    get state() {
        return JSON.parse(JSON.stringify(this._state));
    }
}


class AnnotationSaverController {
    constructor(model) {
        this._model = model;
        this._autoSaveInterval = null;

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
    }

    onAnnotationSaverUpdate(state) {
        if (state.status === 'saveStart') {
            this._saveButton.prop('disabled', true).text('Saving..');
        } else if (state.status === 'saveDone') {
            this._saveButton.text('Successful save');
            setTimeout(() => {
                saveButton.prop('disabled', false).text('Save Work');
            }, 10000);
        } else if (state.status === 'saveError') {
            this._saveButton.prop('disabled', false).text('Save Work');
            const message = `Couldn't to save the job. Errors occured: ${state.message}. `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
            throw Error(message);
        } else if (state.status === 'saveCreate') {
            // TODO: add actions
        } else if (state.status === 'saveUpdate') {

        } else if (state.status === 'saveDelete') {

        } else {
            const message = `Unknown state has been reached during annotation saving: ${state.status} `
                + 'Please report the problem to support team immediately.';
            throw Error(message);
        }
    }
}
