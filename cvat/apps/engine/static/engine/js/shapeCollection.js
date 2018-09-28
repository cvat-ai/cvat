/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeCollectionModel ShapeCollectionController ShapeCollectionView */
"use strict";

class ShapeCollectionModel extends Listener {
    constructor() {
        super('onCollectionUpdate', () => this);
        this._annotationShapes = {};
        this._groups = {};
        this._interpolationShapes = [];
        this._shapes = [];
        this._showAllInterpolation = false;
        this._hash = null;
        this._currentShapes = [];
        this._idx = 0;
        this._groupIdx = 0;
        this._frame = null;
        this._activeShape = null;
        this._activeAAMShape = null;
        this._lastPos = {
            x: 0,
            y: 0,
        };
        this._z_order =  {
            max: 0,
            min: 0,
        };
        this._colors = [
            "#0066FF", "#AF593E", "#01A368", "#FF861F", "#ED0A3F", "#FF3F34", "#76D7EA",
            "#8359A3", "#FBE870", "#C5E17A", "#03BB85", "#FFDF00", "#8B8680", "#0A6B0D",
            "#8FD8D8", "#A36F40", "#F653A6", "#CA3435", "#FFCBA4", "#FF99CC", "#FA9D5A",
            "#FFAE42", "#A78B00", "#788193", "#514E49", "#1164B4", "#F4FA9F", "#FED8B1",
            "#C32148", "#01796F", "#E90067", "#FF91A4", "#404E5A", "#6CDAE7", "#FFC1CC",
            "#006A93", "#867200", "#E2B631", "#6EEB6E", "#FFC800", "#CC99BA", "#FF007C",
            "#BC6CAC", "#DCCCD7", "#EBE1C2", "#A6AAAE", "#B99685", "#0086A7", "#5E4330",
            "#C8A2C8", "#708EB3", "#BC8777", "#B2592D", "#497E48", "#6A2963", "#E6335F",
            "#00755E", "#B5A895", "#0048ba", "#EED9C4", "#C88A65", "#FF6E4A", "#87421F",
            "#B2BEB5", "#926F5B", "#00B9FB", "#6456B7", "#DB5079", "#C62D42", "#FA9C44",
            "#DA8A67", "#FD7C6E", "#93CCEA", "#FCF686", "#503E32", "#FF5470", "#9DE093",
            "#FF7A00", "#4F69C6", "#A50B5E", "#F0E68C", "#FDFF00", "#F091A9", "#FFFF66",
            "#6F9940", "#FC74FD", "#652DC1", "#D6AEDD", "#EE34D2", "#BB3385", "#6B3FA0",
            "#33CC99", "#FFDB00", "#87FF2A", "#6EEB6E", "#FFC800", "#CC99BA", "#7A89B8",
            "#006A93", "#867200", "#E2B631", "#D9D6CF"
        ];

        this._colorIdx = 0;
        this._filter = new FilterModel(() => this.update());
        this._splitter = new ShapeSplitter();
    }

    _nextIdx() {
        return this._idx++;
    }

    _nextGroupIdx() {
        return ++this._groupIdx;
    }

    nextColor() {
        // Step used for more color variability
        let idx = ++this._colorIdx % this._colors.length;
        let color = this._colors[idx];

        return {
            shape: color,
            ui: color,
        };
    }

    _computeInterpolation(frame) {
        let interpolated = [];
        for (let shape of (this._annotationShapes[frame] || []).concat(this._interpolationShapes) ) {
            if (!shape.removed) {
                let interpolation = shape.interpolate(frame);
                if (!interpolation.position.outside || shape.isKeyFrame(frame) ||
                    (shape.type.split('_')[0] === 'interpolation' && this._showAllInterpolation)) {
                    interpolated.push({
                        model: shape,
                        interpolation: shape.interpolate(frame),
                    });
                }
            }
        }

        return interpolated;
    }

    _clear() {
        this._z_order.max = 0;
        this._z_order.min = 0;

        if (this._activeShape) {
            this._activeShape.active = false;
        }

        if (this._activeAAMShape) {
            this._activeAAMShape.activeAAM = {
                shape: false,
                attribute: null
            };
        }

        this._currentShapes = [];
    }

    _interpolate() {
        this._clear();
        this._currentShapes = this._computeInterpolation(this._frame);
        for (let shape of this._currentShapes) {
            let z_order = shape.interpolation.position.z_order;
            if (z_order > this._z_order.max) {
                this._z_order.max = z_order;
            }
            if (z_order < this._z_order.min) {
                this._z_order.min = z_order;
            }
        }

        this._currentShapes = this._filter.filter(this._currentShapes).reverse();
        this.notify();
    }

    _removeFromGroup(elem) {
        let groupId = elem.groupId;

        // Check if elem in group
        if (groupId) {
            if (groupId in this._groups) {
                // Remove from group
                let idx = this._groups[groupId].indexOf(elem);
                if (idx != -1) {
                    this._groups[groupId].splice(idx, 1);
                }

                // Now remove group if it empty
                if (!this._groups[groupId].length) {
                    delete this._groups[groupId];
                }
            }
            elem.groupId = 0;
        }
    }

    colorsByGroup(groupId) {
        // If group id of shape is 0 (default value), then shape not contained in a group
        if (!groupId) {
            return '#ffffff';
        }

        return this._colors[groupId % this._colors.length];
    }

    joinToGroup(elements) {
        let groupIdx = this._nextGroupIdx();
        this._groups[groupIdx] = [];

        for (let elem of elements) {
            // Clear old group
            this._removeFromGroup(elem);
            this._groups[groupIdx].push(elem);
            elem.groupId = groupIdx;
        }
    }

    resetGroupFor(elements) {
        for (let elem of elements) {
            this._removeFromGroup(elem);
        }
    }

    updateGroupIdx(groupId) {
        if (groupId in this._groups) {
            let newGroupId = this._nextGroupIdx();
            this._groups[newGroupId] = this._groups[groupId];
            delete this._groups[groupId];
            for (let elem of this._groups[newGroupId]) {
                elem.groupId = newGroupId;
            }
        }
    }

    import(data) {
        for (let box of data.boxes) {
            this.add(box, 'annotation_box');
        }

        for (let box_path of data.box_paths) {
            this.add(box_path, 'interpolation_box');
        }

        for (let points of data.points) {
            this.add(points, 'annotation_points');
        }

        for (let points_path of data.points_paths) {
            this.add(points_path, 'interpolation_points');
        }

        for (let polygon of data.polygons) {
            this.add(polygon, 'annotation_polygon');
        }

        for (let polygon_path of data.polygon_paths) {
            this.add(polygon_path, 'interpolation_polygon');
        }

        for (let polyline of data.polylines) {
            this.add(polyline, 'annotation_polyline');
        }

        for (let polyline_path of data.polyline_paths) {
            this.add(polyline_path, 'interpolation_polyline');
        }

        this.notify();
        return this;
    }


    export() {
        let response = {
            "boxes": [],
            "box_paths": [],
            "points": [],
            "points_paths": [],
            "polygons": [],
            "polygon_paths": [],
            "polylines": [],
            "polyline_paths": [],
        };

        for (let shape of this._shapes) {
            if (shape.removed) continue;
            switch (shape.type) {
            case 'annotation_box':
                response.boxes.push(shape.export());
                break;
            case 'interpolation_box':
                response.box_paths.push(shape.export());
                break;
            case 'annotation_points':
                response.points.push(shape.export());
                break;
            case 'interpolation_points':
                response.points_paths.push(shape.export());
                break;
            case 'annotation_polygon':
                response.polygons.push(shape.export());
                break;
            case 'interpolation_polygon':
                response.polygon_paths.push(shape.export());
                break;
            case 'annotation_polyline':
                response.polylines.push(shape.export());
                break;
            case 'interpolation_polyline':
                response.polyline_paths.push(shape.export());
            }
        }

        return JSON.stringify(response);
    }

    find(direction) {
        if (Math.sign(direction) > 0) {
            let frame = this._frame + 1;
            while (frame <= window.cvat.player.frames.stop) {
                let shapes = this._computeInterpolation(frame);
                shapes = this._filter.filter(shapes);
                if (shapes.length) {
                    return frame;
                }
                frame ++;
            }
        }
        else {
            let frame = this._frame - 1;
            while (frame >= window.cvat.player.frames.start) {
                let shapes = this._computeInterpolation(frame);
                shapes = this._filter.filter(shapes);
                if (shapes.length) {
                    return frame;
                }
                frame --;
            }
        }
        return null;
    }

    zOrder(frame) {
        if (frame === this._frame) {
            this._z_order.max ++;
            this._z_order.min --;
            return {
                max: this._z_order.max,
                min: this._z_order.min,
            };
        }
        else {
            let interpolation = this._computeInterpolation(frame);
            let max = 0;
            let min = 0;
            for (let shape of interpolation) {
                let z_order = shape.interpolation.position.z_order;
                if (z_order > max) {
                    max = z_order;
                }
                if (z_order < min) {
                    min = z_order;
                }
            }
            return {
                max: max + 1,
                min: min - 1,
            };
        }
    }

    hasUnsavedChanges() {
        return md5(this.export()) !== this._hash;
    }

    updateHash() {
        this._hash = md5(this.export());
        return this;
    }

    empty() {
        this._annotationShapes = {};
        this._interpolationShapes = [];
        this._shapes = [];
        this._idx = 0;
        this._colorIdx = 0;
        this._interpolate();
    }

    add(data, type) {
        let model = buildShapeModel(data, type, this._nextIdx(), this.nextColor());
        if (type.startsWith('interpolation')) {
            this._interpolationShapes.push(model);
        }
        else {
            this._annotationShapes[model.frame] = this._annotationShapes[model.frame] || [];
            this._annotationShapes[model.frame].push(model);
        }
        this._shapes.push(model);
        model.subscribe(this);

        // Update collection groups & group index
        let groupIdx = model.groupId;
        this._groupIdx = Math.max(this._groupIdx, groupIdx);
        if (groupIdx) {
            this._groups[groupIdx] = this._groups[groupIdx] || [];
            this._groups[groupIdx].push(model);
        }
    }

    selectShape(pos, noActivation) {
        let closedShape = {
            minDistance: Number.MAX_SAFE_INTEGER,
            shape: null,
        };

        let openShape = {
            minDistance: 5 / window.cvat.player.geometry.scale,
            shape: null,
        };

        for (let shape of this._currentShapes) {
            if (shape.model.hiddenShape) continue;
            if (shape.model.removed) continue;
            switch (shape.model.type.split('_')[1]) {
            case 'box':
            case 'polygon':
                if (shape.model.contain(pos, this._frame)) {
                    let distance = shape.model.distance(pos, this._frame);
                    if (distance < closedShape.minDistance) {
                        closedShape.minDistance = distance;
                        closedShape.shape = shape.model;
                    }
                }
                break;
            case 'polyline':
            case 'points': {
                let distance = shape.model.distance(pos, this._frame);
                if (distance < openShape.minDistance) {
                    openShape.minDistance = distance;
                    openShape.shape = shape.model;
                }
                break;
            }
            }
        }

        let active = closedShape.shape;
        if (openShape.shape) {
            active = openShape.shape;
        }

        if (noActivation) {
            return active;
        }

        if (active && active != this._activeShape) {
            if (this._activeShape) {
                this._activeShape.active = false;
                this._activeShape = null;
            }
            this._activeShape = active;
            this._activeShape.active = true;
        }
    }

    update() {
        this._interpolate();
    }

    resetActive() {
        if (this._activeShape) {
            this._activeShape.active = false;
            this._activeShape = null;
        }
    }

    onPlayerUpdate(player) {
        if (player.ready()) {
            let frame = player.frames.current;

            // If frame was not changed and collection already interpolated (for example after pause() call)
            if (frame === this._frame && this._currentShapes.length) return;
            if (this._activeShape) {
                this._activeShape.active = false;
                this._activeShape = null;
            }
            if (this._activeAAMShape) {
                this._activeAAMShape.activeAAM = {
                    shape: false,
                    attribute: null,
                };
            }
            this._frame = frame;
            this._interpolate();
        }
        else {
            this._clear();
            this.notify();
        }
    }

    onShapeUpdate(model) {
        switch (model.updateReason) {
        case 'activeAAM':
            if (model.activeAAM.shape) {
                this._activeAAMShape = model;
            }
            else if (this._activeAAMShape === model) {
                this._activeAAMShape = null;
            }
            break;
        case 'activation': {
            let active = model.active;
            if (active) {
                if (this._activeShape != model) {
                    if (this._activeShape) {
                        this._activeShape.active = false;
                        // Now loop occure -> active(false) -> notify -> onShapeUpdate
                        // But it will go on 'else' branch and this._activeShape will set to null
                    }
                    this._activeShape = model;
                }
            }
            else {
                if (this._activeShape === model) {
                    this._activeShape = null;
                }
            }
            break;
        }
        case 'remove':
            if (model.removed) {
                if (this._activeShape === model) {
                    this._activeShape = null;
                }
                break;
            }
            this.update();
            break;
        case 'keyframe':
        case 'outside':
            this.update();
            break;
        }
    }

    onShapeCreatorUpdate(shapeCreator) {
        if (shapeCreator.createMode) {
            this.resetActive();
        }
    }

    collectStatistic() {
        let statistic = {};
        let labels = window.cvat.labelsInfo.labels();
        for (let labelId in labels) {
            statistic[labelId] = {
                boxes: {
                    annotation: 0,
                    interpolation: 0,
                },
                polygons: {
                    annotation: 0,
                    interpolation: 0,
                },
                polylines: {
                    annotation: 0,
                    interpolation: 0,
                },
                points: {
                    annotation: 0,
                    interpolation: 0,
                },
                manually: 0,
                interpolated: 0,
                total: 0,
            };
        }

        let totalForLabels = {
            boxes: {
                annotation: 0,
                interpolation: 0,
            },
            polygons: {
                annotation: 0,
                interpolation: 0,
            },
            polylines: {
                annotation: 0,
                interpolation: 0,
            },
            points: {
                annotation: 0,
                interpolation: 0,
            },
            manually: 0,
            interpolated: 0,
            total: 0,
        };

        for (let shape of this._shapes) {
            if (shape.removed) continue;
            let statShape = shape.collectStatistic();
            statistic[statShape.labelId].manually += statShape.manually;
            statistic[statShape.labelId].interpolated += statShape.interpolated;
            statistic[statShape.labelId].total += statShape.total;
            switch (statShape.type) {
            case 'box':
                statistic[statShape.labelId].boxes[statShape.mode] ++;
                break;
            case 'polygon':
                statistic[statShape.labelId].polygons[statShape.mode] ++;
                break;
            case 'polyline':
                statistic[statShape.labelId].polylines[statShape.mode] ++;
                break;
            case 'points':
                statistic[statShape.labelId].points[statShape.mode] ++;
                break;
            default:
                throw Error(`Unknown shape type found: ${statShape.type}`);
            }
        }

        for (let labelId in labels) {
            totalForLabels.boxes.annotation += statistic[labelId].boxes.annotation;
            totalForLabels.boxes.interpolation += statistic[labelId].boxes.interpolation;
            totalForLabels.polygons.annotation += statistic[labelId].polygons.annotation;
            totalForLabels.polygons.interpolation += statistic[labelId].polygons.interpolation;
            totalForLabels.polylines.annotation += statistic[labelId].polylines.annotation;
            totalForLabels.polylines.interpolation += statistic[labelId].polylines.interpolation;
            totalForLabels.points.annotation += statistic[labelId].points.annotation;
            totalForLabels.points.interpolation += statistic[labelId].points.interpolation;
            totalForLabels.manually += statistic[labelId].manually;
            totalForLabels.interpolated += statistic[labelId].interpolated;
            totalForLabels.total += statistic[labelId].total;
        }

        return [statistic, totalForLabels];
    }

    switchActiveLock() {
        let shape = null;
        if (this._activeAAMShape) {
            shape = this._activeAAMShape;
        }
        else {
            this.selectShape(this._lastPos, false);
            if (this._activeShape) {
                shape = this._activeShape;
            }
        }

        if (shape) {
            shape.switchLock();
            Logger.addEvent(Logger.EventType.lockObject, {
                count: 1,
                value: !shape.lock
            });
        }
    }

    switchAllLock() {
        this.resetActive();
        let value = true;
        for (let shape of this._currentShapes) {
            if (shape.model.removed) continue;
            value = value && shape.model.lock;
            if (!value) break;
        }

        Logger.addEvent(Logger.EventType.lockObject, {
            count: this._currentShapes.length,
            value: !value,
        });

        for (let shape of this._currentShapes) {
            if (shape.model.removed) continue;
            if (shape.model.lock === value) {
                shape.model.switchLock();
            }
        }
    }

    switchActiveOccluded() {
        let shape = null;
        if (this._activeAAMShape) {
            shape = this._activeAAMShape;
        }
        else {
            this.selectShape(this._lastPos, false);
            if (this._activeShape && !this._activeShape.lock) {
                shape = this._activeShape;
            }
        }

        if (shape) {
            shape.switchOccluded(window.cvat.player.frames.current);
        }
    }

    switchActiveHide() {
        if (this._activeAAMShape) {
            return;
        }

        this.selectShape(this._lastPos, false);
        if (this._activeShape) {
            this._activeShape.switchHide();
        }
    }

    switchAllHide() {
        this.resetActive();
        let hiddenShape = true;
        let hiddenText = true;

        for (let shape of this._shapes) {
            if (shape.removed) continue;
            hiddenShape = hiddenShape && shape.hiddenShape;

            if (!hiddenShape) {
                break;
            }
        }

        if (!hiddenShape) {
            // any shape visible
            for (let shape of this._shapes) {
                if (shape.removed) continue;
                hiddenText = hiddenText && shape.hiddenText;

                if (!hiddenText) {
                    break;
                }
            }

            if (!hiddenText) {
                // any shape text visible
                for (let shape of this._shapes) {
                    if (shape.removed) continue;
                    while (shape.hiddenShape || !shape.hiddenText) {
                        shape.switchHide();
                    }
                }
            }
            else {
                // all shape text invisible
                for (let shape of this._shapes) {
                    if (shape.removed) continue;
                    while (!shape.hiddenShape) {
                        shape.switchHide();
                    }
                }
            }
        }
        else {
            // all shapes invisible
            for (let shape of this._shapes) {
                if (shape.removed) continue;
                while (shape.hiddenShape || shape.hiddenText) {
                    shape.switchHide();
                }
            }
        }
    }

    removePointFromActiveShape(idx) {
        if (this._activeShape && !this._activeShape.lock) {
            this._activeShape.removePoint(idx);
        }
    }

    split() {
        if (this._activeShape) {
            if (!this._activeShape.lock && this._activeShape.type.split('_')[0] === 'interpolation') {
                let list = this._splitter.split(this._activeShape, this._frame);
                let type = this._activeShape.type;
                for (let item of list) {
                    this.add(item, type);
                }

                // Undo/redo code
                let newShapes = this._shapes.slice(-list.length);
                let originalShape = this._activeShape;
                window.cvat.addAction('Split Object', () => {
                    for (let shape of newShapes) {
                        shape.removed = true;
                        shape.unsubscribe(this);
                    }
                    originalShape.removed = false;
                }, () => {
                    for (let shape of newShapes) {
                        shape.removed = false;
                        shape.subscribe(this);
                    }
                    originalShape.removed = true;
                    this.update();
                }, this._frame);
                // End of undo/redo code

                this._activeShape.removed = true;
                this.update();
            }
        }
    }

    selectAllWithLabel(labelId) {
        for (let shape of this.currentShapes) {
            if (shape.model.label === labelId) {
                shape.model.select();
            }
        }
    }

    deselectAll() {
        for (let shape of this.currentShapes) {
            shape.model.deselect();
        }
    }

    get activeShape() {
        return this._activeShape;
    }

    get currentShapes() {
        return this._currentShapes;
    }

    get lastPosition() {
        return this._lastPos;
    }

    set lastPosition(pos) {
        this._lastPos = pos;
    }

    set showAllInterpolation(value) {
        this._showAllInterpolation = value;
        this.update();
    }

    get filter() {
        return this._filter;
    }

    get shapes() {
        return this._shapes;
    }
}

class ShapeCollectionController {
    constructor(collectionModel) {
        this._model = collectionModel;
        this._filterController = new FilterController(collectionModel.filter);
        setupCollectionShortcuts.call(this);

        function setupCollectionShortcuts() {
            let switchLockHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveLock();
            }.bind(this));

            let switchAllLockHandler = Logger.shortkeyLogDecorator(function() {
                this.switchAllLock();
            }.bind(this));

            let switchOccludedHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveOccluded();
            }.bind(this));

            let switchHideHandler = Logger.shortkeyLogDecorator(function() {
                if (!window.cvat.mode || window.cvat.mode === 'aam') {
                    this._model.switchActiveHide();
                }
            }.bind(this));

            let switchAllHideHandler = Logger.shortkeyLogDecorator(function() {
                if (!window.cvat.mode || window.cvat.mode === 'aam') {
                    this._model.switchAllHide();
                }
            }.bind(this));

            let removeActiveHandler = Logger.shortkeyLogDecorator(function(e) {
                this.removeActiveShape(e);
            }.bind(this));

            let switchLabelHandler = Logger.shortkeyLogDecorator(function(e) {
                let activeShape = this._model.activeShape;
                if (activeShape) {
                    let labels = Object.keys(window.cvat.labelsInfo.labels());
                    let key = e.keyCode - '1'.charCodeAt(0);
                    if (key in labels) {
                        let labelId = +labels[key];
                        activeShape.changeLabel(labelId);
                    }
                }
                e.preventDefault();
            }.bind(this));

            let switchDefaultLabelHandler = Logger.shortkeyLogDecorator(function(e) {
                $('#shapeLabelSelector option').eq(e.keyCode - '1'.charCodeAt(0)).prop('selected', true);
                $('#shapeLabelSelector').trigger('change');
            });

            let changeShapeColorHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveColor();
            }.bind(this));

            let incZHandler = Logger.shortkeyLogDecorator(function() {
                if (window.cvat.mode === null) {
                    let activeShape = this._model.activeShape;
                    if (activeShape) {
                        activeShape.z_order = this._model.zOrder(window.cvat.player.frames.current).max;
                    }
                }
            }.bind(this));

            let decZHandler = Logger.shortkeyLogDecorator(function() {
                if (window.cvat.mode === null) {
                    let activeShape = this._model.activeShape;
                    if (activeShape) {
                        activeShape.z_order = this._model.zOrder(window.cvat.player.frames.current).min;
                    }
                }
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["switch_lock_property"].value, switchLockHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_all_lock_property"].value, switchAllLockHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_occluded_property"].value, switchOccludedHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_hide_mode"].value, switchHideHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_all_hide_mode"].value, switchAllHideHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_default_label"].value, switchDefaultLabelHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_shape_label"].value, switchLabelHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["delete_shape"].value, removeActiveHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_shape_color"].value, changeShapeColorHandler.bind(this), 'keydown');

            if (window.cvat.job.z_order) {
                Mousetrap.bind(shortkeys["inc_z"].value, incZHandler.bind(this), 'keydown');
                Mousetrap.bind(shortkeys["dec_z"].value, decZHandler.bind(this), 'keydown');
            }
        }
    }

    switchActiveOccluded() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchActiveOccluded();
        }
    }

    switchAllLock() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchAllLock();
        }
    }

    switchActiveLock() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchActiveLock();
        }
    }

    switchActiveColor() {
        let colorByInstanceInput = $('#colorByInstanceRadio');
        let colorByGroupInput = $('#colorByGroupRadio');
        let colorByLabelInput = $('#colorByLabelRadio');

        let activeShape = this._model.activeShape;
        if (activeShape) {
            if (colorByInstanceInput.prop('checked')) {
                activeShape.changeColor(this._model.nextColor());
            }
            else if (colorByGroupInput.prop('checked')) {
                if (activeShape.groupId) {
                    this._model.updateGroupIdx(activeShape.groupId);
                    colorByGroupInput.trigger('change');
                }
            }
            else {
                let labelId = +activeShape.label;
                window.cvat.labelsInfo.updateLabelColorIdx(labelId);
                $(`.labelContentElement[label_id="${labelId}"`).css('background-color',
                    this._model.colorsByGroup(window.cvat.labelsInfo.labelColorIdx(labelId)));
                colorByLabelInput.trigger('change');
            }
        }
    }

    switchDraggableForActive() {
        let activeShape = this._model.activeShape;
        if (activeShape && typeof(activeShape.draggable) != 'undefined') {
            activeShape.draggable = !activeShape.draggable;
        }
    }

    removeActiveShape(e) {
        if (window.cvat.mode === null) {
            this._model.selectShape(this._model.lastPosition, false);
            let activeShape = this._model.activeShape;
            if (activeShape && (!activeShape.lock || e && e.shiftKey)) {
                activeShape.remove();
            }
        }
    }

    removePointFromActiveShape(idx) {
        this._model.removePointFromActiveShape(idx);
    }

    splitForActive() {
        this._model.split();
    }

    selectShape(pos, noActivation) {
        this._model.selectShape(pos, noActivation);
    }

    resetActive() {
        this._model.resetActive();
    }

    setLastPosition(pos) {
        this._model.lastPosition = pos;
    }

    setShowAllInterpolation(value) {
        this._model.showAllInterpolation = value;
    }

    colorsByGroup(groupId) {
        return this._model.colorsByGroup(groupId);
    }

    get filterController() {
        return this._filterController;
    }
}

class ShapeCollectionView {
    constructor(collectionModel, collectionController) {
        collectionModel.subscribe(this);
        this._controller = collectionController;
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._UIContent = $('#uiContent');
        this._labelsContent = $('#labelsContent');
        this._showAllInterpolationBox = $('#showAllInterBox');
        this._fillOpacityRange = $('#fillOpacityRange');
        this._selectedFillOpacityRange = $('#selectedFillOpacityRange');
        this._blackStrokeCheckbox = $('#blackStrokeCheckbox');
        this._colorByInstanceRadio = $('#colorByInstanceRadio');
        this._colorByGroupRadio = $('#colorByGroupRadio');
        this._colorByLabelRadio = $('#colorByLabelRadio');
        this._colorByGroupCheckbox = $('#colorByGroupCheckbox');
        this._filterView = new FilterView(this._controller.filterController);
        this._currentViews = [];
        this._activeShapeUI = null;
        this._scale = 1;
        this._colorSettings = {
            "fill-opacity": 0
        };

        this._showAllInterpolationBox.on('change', (e) => {
            this._controller.setShowAllInterpolation(e.target.checked);
        });

        this._fillOpacityRange.on('input', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            if (value >= 0) {
                this._colorSettings["fill-opacity"] = value;
                delete this._colorSettings['white-opacity'];

                for (let view of this._currentViews) {
                    view.updateColorSettings(this._colorSettings);
                }
            }
            else {
                value *= -1;
                this._colorSettings["white-opacity"] = value;

                for (let view of this._currentViews) {
                    view.updateColorSettings(this._colorSettings);
                }
            }
        });

        this._selectedFillOpacityRange.on('input', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._colorSettings["selected-fill-opacity"] = value;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._blackStrokeCheckbox.on('click', (e) => {
            this._colorSettings["black-stroke"] = e.target.checked;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByInstanceRadio.on('change', () => {
            this._colorSettings['color-by-group'] = false;
            this._colorSettings['color-by-label'] = false;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByGroupRadio.on('change', () => {
            this._colorSettings['color-by-group'] = true;
            this._colorSettings['color-by-label'] = false;
            this._colorSettings['colors-by-group'] = this._controller.colorsByGroup.bind(this._controller);

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByLabelRadio.on('change', () => {
            this._colorSettings['color-by-label'] = true;
            this._colorSettings['color-by-group'] = false;

            this._colorSettings['colors-by-label'] = this._controller.colorsByGroup.bind(this._controller);

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._frameContent.on('mousedown', (e) => {
            if (e.target === this._frameContent.node) {
                this._controller.resetActive();
            }
        });

        $('#playerFrame').on('mouseleave', () => {
            if (!window.cvat.mode) {
                this._controller.resetActive();
            }
        });

        this._frameContent.on('mousemove', function(e) {
            if (e.ctrlKey || e.which === 2 || e.target.classList.contains('svg_select_points')) {
                return;
            }

            let pos = translateSVGPos(this._frameContent.node, e.clientX, e.clientY);
            if (!window.cvat.mode) {
                this._controller.selectShape(pos, false);
            }

            this._controller.setLastPosition(pos);
        }.bind(this));

        $('#shapeContextMenu li').click((e) => {
            let menu = $('#shapeContextMenu');
            menu.hide(100);

            switch($(e.target).attr("action")) {
            case "change_color":
                this._controller.switchActiveColor();
                break;
            case "remove_shape":
                this._controller.removeActiveShape();
                break;
            case "switch_occluded":
                this._controller.switchActiveOccluded();
                break;
            case "switch_lock":
                this._controller.switchActiveLock();
                break;
            case "split_track":
                this._controller.splitForActive();
                break;
            case "drag_polygon":
                this._controller.switchDraggableForActive();
                break;
            }
        });

        let shortkeys = window.cvat.config.shortkeys;
        for (let button of $('#shapeContextMenu li')) {
            switch(button.getAttribute('action')) {
            case "change_color":
                button.innerText = `Change Color (${shortkeys['change_shape_color'].view_value})`;
                break;
            case "remove_shape":
                button.innerText = `Remove Shape (${shortkeys['delete_shape'].view_value})`;
                break;
            case "switch_occluded":
                button.innerText = `Switch Occluded (${shortkeys['switch_occluded_property'].view_value})`;
                break;
            case "switch_lock":
                button.innerText = `Switch Lock (${shortkeys['switch_lock_property'].view_value})`;
                break;
            }
        }

        $('#pointContextMenu li').click((e) => {
            let menu = $('#pointContextMenu');
            let idx = +menu.attr('point_idx');
            menu.hide(100);

            switch($(e.target).attr("action")) {
            case "remove_point":
                this._controller.removePointFromActiveShape(idx);
                break;
            }
        });

        let labels = window.cvat.labelsInfo.labels();
        for (let labelId in labels) {
            let div = $('<div></div>').addClass('labelContentElement h2 regular hidden').css({
                'background-color': collectionController.colorsByGroup(+window.cvat.labelsInfo.labelColorIdx(+labelId)),
            }).attr({
                'label_id': labelId,
            }).on('mouseover mouseup', () => {
                div.addClass('highlightedUI');
                collectionModel.selectAllWithLabel(+labelId);
            }).on('mouseout mousedown', () => {
                div.removeClass('highlightedUI');
                collectionModel.deselectAll();
            }).append( $(`<label> ${labels[labelId]} </label>`) );
            div.appendTo(this._labelsContent);
        }

        let sidePanelObjectsButton = $('#sidePanelObjectsButton');
        let sidePanelLabelsButton = $('#sidePanelLabelsButton');

        sidePanelObjectsButton.on('click', () => {
            sidePanelObjectsButton.addClass('activeTabButton');
            sidePanelLabelsButton.removeClass('activeTabButton');
            this._UIContent.removeClass('hidden');
            this._labelsContent.addClass('hidden');
        });

        sidePanelLabelsButton.on('click', () => {
            sidePanelLabelsButton.addClass('activeTabButton');
            sidePanelObjectsButton.removeClass('activeTabButton');
            this._labelsContent.removeClass('hidden');
            this._UIContent.addClass('hidden');
        });
    }

    onCollectionUpdate(collection) {
        this._labelsContent.find('.labelContentElement').addClass('hidden');
        for (let view of this._currentViews) {
            view.unsubscribe(this);
            view.controller().model().unsubscribe(view);
            view.erase();
        }

        // Save parents and detach elements from DOM
        // in order to increase performance in the buildShapeView function
        let parents = {
            uis: this._UIContent.parent(),
            shapes: this._frameContent.node.parentNode
        };

        this._frameContent.node.parent = null;
        this._UIContent.detach();

        this._currentViews = [];
        for (let shape of collection.currentShapes) {
            let model = shape.model;
            let view = buildShapeView(model, buildShapeController(model), this._frameContent, this._UIContent);
            view.draw(shape.interpolation);
            view.updateColorSettings(this._colorSettings);
            this._currentViews.push(view);
            model.subscribe(view);
            view.subscribe(this);
            this._labelsContent.find(`.labelContentElement[label_id="${model.label}"]`).removeClass('hidden');
        }

        parents.shapes.append(this._frameContent.node);
        parents.uis.prepend(this._UIContent);

        ShapeCollectionView.sortByZOrder();
    }

    onPlayerUpdate(player) {
        if (!player.ready())  this._frameContent.addClass('hidden');
        else this._frameContent.removeClass('hidden');

        if (this._scale === player.geometry.scale) return;

        this._scale = player.geometry.scale;
        let scaledR = POINT_RADIUS / this._scale;
        let scaledStroke = STROKE_WIDTH / this._scale;
        let scaledPointStroke = SELECT_POINT_STROKE_WIDTH / this._scale;
        $('.svg_select_points').each(function() {
            this.instance.radius(scaledR, scaledR);
            this.instance.attr('stroke-width', scaledPointStroke);
        });

        $('.tempMarker').each(function() {
            this.instance.radius(scaledR, scaledR);
            this.instance.attr('stroke-width', scaledStroke);
        });

        for (let view of this._currentViews) {
            view.updateShapeTextPosition();
        }
    }

    onShapeViewUpdate(view) {
        if (view.dragging) {
            window.cvat.mode = 'drag';
        }
        else if (window.cvat.mode === 'drag') {
            window.cvat.mode = null;
        }

        if (view.resize) {
            window.cvat.mode = 'resize';
        }
        else if (window.cvat.mode === 'resize') {
            window.cvat.mode = null;
        }
    }

    // If ShapeGrouperModel was disabled, need to update shape appearence
    // In order to don't dublicate function, I simulate checkbox change event
    onGrouperUpdate(grouper) {
        if (!grouper.active && this._colorByGroupRadio.prop('checked')) {
            this._colorByGroupRadio.trigger('change');
        }
    }

    static sortByZOrder() {
        if (window.cvat.job.z_order) {
            let content = $('#frameContent');
            let shapes = $(content.find('.shape, .pointTempGroup, .shapeCreation, .aim').toArray().sort(
                (a,b) => (+a.attributes.z_order.nodeValue - +b.attributes.z_order.nodeValue)
            ));
            let children = content.children().not(shapes);

            for (let shape of shapes) {
                content.append(shape);
            }

            for (let child of children) {
                content.append(child);
            }
        }
    }
}
