/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeBufferModel ShapeBufferController ShapeBufferView */

/* global
    AREA_TRESHOLD:false
    userConfirm:false
    Listener:false
    Logger:false
    Mousetrap:false
    POINT_RADIUS:false
    PolyShapeModel:false
    STROKE_WIDTH:false
    SVG:false
*/

"use strict";

class ShapeBufferModel extends Listener  {
    constructor(collection) {
        super('onShapeBufferUpdate', () => this);
        this._collection = collection;
        this._pasteMode = false;
        this._propagateFrames = 50;
        this._shape = {
            type: null,
            mode: null,
            position: null,
            attributes: null,
            label: null,
            clear: function() {
                this.type = null;
                this.mode = null;
                this.position = null;
                this.attributes = null;
                this.label = null;
            },
        };
    }

    _startPaste() {
        if (!this._pasteMode && this._shape.type) {
            if (!window.cvat.mode) {
                this._collection.resetActive();
                window.cvat.mode = 'paste';
                this._pasteMode = true;
                this.notify();
            }
        }
    }

    _cancelPaste() {
        if (this._pasteMode) {
            if (window.cvat.mode === 'paste') {
                window.cvat.mode = null;
                this._pasteMode = false;
                this.notify();
            }
        }
    }

    _makeObject(box, points, isTracked) {
        if (!this._shape.type) {
            return null;
        }

        let attributes = [];
        let object = {};

        for (let attrId in this._shape.attributes) {
            attributes.push({
                id: attrId,
                value: this._shape.attributes[attrId].value,
            });
        }

        object.label_id = this._shape.label;
        object.group = 0;
        object.frame = window.cvat.player.frames.current;
        object.attributes = attributes;

        if (this._shape.type === 'box') {
            const position = {
                xtl: box.xtl,
                ytl: box.ytl,
                xbr: box.xbr,
                ybr: box.ybr,
                occluded: this._shape.position.occluded,
                frame: window.cvat.player.frames.current,
                z_order: this._collection.zOrder(window.cvat.player.frames.current).max,
            };

            if (isTracked) {
                object.shapes = [];
                object.shapes.push(Object.assign(position, {
                    outside: false,
                    attributes: [],
                }));
            } else {
                Object.assign(object, position);
            }
        } else {
            const position = {};
            position.points = points;
            position.occluded = this._shape.position.occluded;
            position.frame = window.cvat.player.frames.current;
            position.z_order = this._collection.zOrder(position.frame).max;

            Object.assign(object, position);
        }

        return object;
    }

    switchPaste() {
        if (this._pasteMode) {
            this._cancelPaste();
        }
        else {
            this._startPaste();
        }
    }

    copyToBuffer() {
        let activeShape = this._collection.activeShape;
        if (activeShape) {
            Logger.addEvent(Logger.EventType.copyObject, {
                count: 1,
            });
            let interpolation = activeShape.interpolate(window.cvat.player.frames.current);
            if (!interpolation.position.outsided) {
                this._shape.type = activeShape.type.split('_')[1];
                this._shape.mode = activeShape.type.split('_')[0];
                this._shape.label = activeShape.label;
                this._shape.attributes = interpolation.attributes;
                this._shape.position = interpolation.position;
            }
            return true;
        }
        return false;
    }

    pasteToFrame(box, polyPoints) {
        let object = this._makeObject(box, polyPoints, this._shape.mode === 'interpolation');

        if (object) {
            if (this._shape.type === 'cuboid'
                && !CuboidModel.isWithinFrame(PolyShapeModel.convertStringToNumberArray(polyPoints))) {
                return
            }

            Logger.addEvent(Logger.EventType.pasteObject);
            if (this._shape.type === 'box') {
                this._collection.add(object, `${this._shape.mode}_${this._shape.type}`);
            }
            else {
                this._collection.add(object, `annotation_${this._shape.type}`);
            }

            // Undo/redo code
            let model = this._collection.shapes.slice(-1)[0];
            window.cvat.addAction('Paste Object', () => {
                model.removed = true;
                model.unsubscribe(this._collection);
            }, () => {
                model.subscribe(this._collection);
                model.removed = false;
            }, window.cvat.player.frames.current);
            // End of undo/redo code

            this._collection.update();
        }
    }

    propagateToFrames() {
        let numOfFrames = this._propagateFrames;
        if (this._shape.type && Number.isInteger(numOfFrames)) {
            let object = null;
            if (this._shape.type === 'box') {
                let box = {
                    xtl: this._shape.position.xtl,
                    ytl: this._shape.position.ytl,
                    xbr: this._shape.position.xbr,
                    ybr: this._shape.position.ybr,
                };
                object = this._makeObject(box, null, false);
            } else {
                object = this._makeObject(null, this._shape.position.points, false);
            }

            if (object) {
                Logger.addEvent(Logger.EventType.propagateObject, {
                    count: numOfFrames,
                });

                let imageSizes = window.cvat.job.images;
                let startFrame = window.cvat.player.frames.start;
                let originalImageSize = imageSizes[object.frame - startFrame] || imageSizes[0];

                // Getting normalized coordinates [0..1]
                let normalized = {};
                if (this._shape.type === 'box') {
                    normalized.xtl = object.xtl / originalImageSize.width;
                    normalized.ytl = object.ytl / originalImageSize.height;
                    normalized.xbr = object.xbr / originalImageSize.width;
                    normalized.ybr = object.ybr / originalImageSize.height;
                }
                else {
                    normalized.points = [];
                    for (let point of PolyShapeModel.convertStringToNumberArray(object.points)) {
                        normalized.points.push({
                            x: point.x / originalImageSize.width,
                            y: point.y / originalImageSize.height,
                        });
                    }
                }

                let addedObjects = [];
                while (numOfFrames > 0 && (object.frame + 1 <= window.cvat.player.frames.stop)) {
                    object.frame ++;
                    numOfFrames --;

                    object.z_order = this._collection.zOrder(object.frame).max;
                    let imageSize = imageSizes[object.frame - startFrame] || imageSizes[0];
                    let position = {};
                    if (this._shape.type === 'box') {
                        position.xtl = normalized.xtl * imageSize.width;
                        position.ytl = normalized.ytl * imageSize.height;
                        position.xbr = normalized.xbr * imageSize.width;
                        position.ybr = normalized.ybr * imageSize.height;
                    }
                    else {
                        position.points = [];
                        for (let point of normalized.points) {
                            position.points.push({
                                x: point.x * imageSize.width,
                                y: point.y * imageSize.height,
                            });
                        }
                        position.points = PolyShapeModel.convertNumberArrayToString(position.points);
                    }
                    Object.assign(object, position);
                    this._collection.add(object, `annotation_${this._shape.type}`);
                    addedObjects.push(this._collection.shapes.slice(-1)[0]);
                }

                if (addedObjects.length) {
                    // Undo/redo code
                    window.cvat.addAction('Propagate Object', () => {
                        for (let object of addedObjects) {
                            object.removed = true;
                            object.unsubscribe(this._collection);
                        }
                    }, () => {
                        for (let object of addedObjects) {
                            object.removed = false;
                            object.subscribe(this._collection);
                        }
                    }, window.cvat.player.frames.current);
                    // End of undo/redo code
                }
            }
        }
    }

    get pasteMode() {
        return this._pasteMode;
    }

    get shape() {
        return this._shape;
    }

    set propagateFrames(value) {
        this._propagateFrames = value;
    }

    get propagateFrames() {
        return this._propagateFrames;
    }
}


class ShapeBufferController {
    constructor(model) {
        this._model = model;
        setupBufferShortkeys.call(this);

        function setupBufferShortkeys() {
            let copyHandler = Logger.shortkeyLogDecorator(function() {
                this._model.copyToBuffer();
            }.bind(this));

            let switchHandler = Logger.shortkeyLogDecorator(function() {
                this._model.switchPaste();
            }.bind(this));

            let propagateDialogShowed = false;
            let propagateHandler = Logger.shortkeyLogDecorator(function() {
                if (!propagateDialogShowed) {
                    blurAllElements();
                    if (this._model.copyToBuffer()) {
                        let curFrame = window.cvat.player.frames.current;
                        let startFrame = window.cvat.player.frames.start;
                        let endFrame = Math.min(window.cvat.player.frames.stop, curFrame + this._model.propagateFrames);
                        let imageSizes = window.cvat.job.images;

                        let message = `Propagate up to ${endFrame} frame. `;
                        let refSize = imageSizes[curFrame - startFrame] || imageSizes[0];
                        for (let _frame = curFrame + 1; _frame <= endFrame; _frame ++) {
                            let size = imageSizes[_frame - startFrame] || imageSizes[0];
                            if ((size.width != refSize.width) || (size.height != refSize.height) ) {
                                message += 'Some covered frames have another resolution. Shapes in them can differ from reference. ';
                                break;
                            }
                        }
                        message += 'Are you sure?';

                        propagateDialogShowed = true;
                        userConfirm(message, () => {
                            this._model.propagateToFrames();
                            propagateDialogShowed = false;
                        }, () => propagateDialogShowed = false);
                    }
                }
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["copy_shape"].value, copyHandler, 'keydown');
            Mousetrap.bind(shortkeys["propagate_shape"].value, propagateHandler, 'keydown');
            Mousetrap.bind(shortkeys["switch_paste"].value, switchHandler, 'keydown');
        }
    }

    pasteToFrame(e, bbRect, polyPoints) {
        if (this._model.pasteMode) {
            if (bbRect || polyPoints) {
                this._model.pasteToFrame(bbRect, polyPoints);
            }

            if (!e.ctrlKey) {
                this._model.switchPaste();
            }
        }
    }

    set propagateFrames(value) {
        this._model.propagateFrames = value;
    }
}



class ShapeBufferView {
    constructor(model, controller) {
        model.subscribe(this);
        this._controller = controller;
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._propagateFramesInput = $('#propagateFramesInput');
        this._shape = null;
        this._shapeView = null;
        this._shapeViewGroup = null;

        this._controller.propagateFrames = +this._propagateFramesInput.prop('value');
        this._propagateFramesInput.on('change', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._controller.propagateFrames = value;
        });
    }

    _drawShapeView() {
        let scale = window.cvat.player.geometry.scale;
        let points = this._shape.position.points ?
            window.cvat.translate.points.actualToCanvas(this._shape.position.points) : null;

        switch (this._shape.type) {
        case 'box': {
            let width = this._shape.position.xbr - this._shape.position.xtl;
            let height = this._shape.position.ybr - this._shape.position.ytl;
            this._shape.position = window.cvat.translate.box.actualToCanvas(this._shape.position);
            this._shapeView = this._frameContent.rect(width, height)
                .move(this._shape.position.xtl, this._shape.position.ytl).addClass('shapeCreation').attr({
                    'stroke-width': STROKE_WIDTH / scale,
                });
            break;
        }
        case 'polygon':
            this._shapeView = this._frameContent.polygon(points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'cuboid':
            points = window.cvat.translate.points.canvasToActual(points);
            points = PolylineModel.convertStringToNumberArray(points);
            let view_model = new Cuboid2PointViewModel(points);
            this._shapeView = this._frameContent.polyline(points).addClass('shapeCreation').attr({
                'stroke-width': 0,
            });

            this._shapeViewGroup = this._frameContent.cube(view_model).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });

            break;
        case 'polyline':
            this._shapeView = this._frameContent.polyline(points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'points':
            this._shapeView = this._frameContent.polyline(points).addClass('shapeCreation').attr({
                'stroke-width': 0,
            });

            this._shapeViewGroup = this._frameContent.group();
            for (let point of PolyShapeModel.convertStringToNumberArray(points)) {
                let radius = POINT_RADIUS * 2 / window.cvat.player.geometry.scale;
                let scaledStroke = STROKE_WIDTH / window.cvat.player.geometry.scale;
                this._shapeViewGroup.circle(radius).move(point.x - radius / 2, point.y - radius / 2)
                    .fill('white').stroke('black').attr('stroke-width', scaledStroke).addClass('pasteTempMarker');
            }
            break;
        default:
            throw Error(`Unknown shape type found: ${this._shape.type}`);
        }

        this._shapeView.attr({
            'z_order': Number.MAX_SAFE_INTEGER,
        });
    }

    _moveShapeView(pos) {
        let rect = this._shapeView.node.getBBox();

        this._shapeView.move(pos.x - rect.width / 2, pos.y - rect.height / 2);
        if (this._shapeViewGroup) {
            let rect = this._shapeViewGroup.node.getBBox();
            this._shapeViewGroup.move(pos.x - rect.x - rect.width / 2, pos.y - rect.y - rect.height / 2);
        }
    }

    _removeShapeView() {
        this._shapeView.remove();
        this._shapeView = null;
        if (this._shapeViewGroup) {
            this._shapeViewGroup.remove();
            this._shapeViewGroup = null;
        }
    }

    _enableEvents() {
        this._frameContent.on('mousemove.buffer', (e) => {
            let pos = window.cvat.translate.point.clientToCanvas(this._frameContent.node, e.clientX, e.clientY);
            this._shapeView.style('visibility', '');
            this._moveShapeView(pos);
        });

        this._frameContent.on('mousedown.buffer', (e) => {
            if (e.which != 1) return;
            if (this._shape.type != 'box') {
                let actualPoints = window.cvat.translate.points.canvasToActual(this._shapeView.attr('points'));
                let frameWidth = window.cvat.player.geometry.frameWidth;
                let frameHeight = window.cvat.player.geometry.frameHeight;

                if (this.clipToFrame) {
                    actualPoints = PolyShapeModel.convertStringToNumberArray(actualPoints);
                    for (let point of actualPoints) {
                        point.x = Math.clamp(point.x, 0, frameWidth);
                        point.y = Math.clamp(point.y, 0, frameHeight);
                    }
                    actualPoints = PolyShapeModel.convertNumberArrayToString(actualPoints);
                }

                // Set clamped points to a view in order to get an updated bounding box for a poly shape
                this._shapeView.attr('points', window.cvat.translate.points.actualToCanvas(actualPoints));

                // Get an updated bounding box for check it area
                let polybox = this._shapeView.node.getBBox();
                let w = polybox.width;
                let h = polybox.height;
                let area = w * h;
                let type = this._shape.type;

                if (area >= AREA_TRESHOLD || type === 'points' || type === 'polyline' && (w >= AREA_TRESHOLD || h >= AREA_TRESHOLD)) {
                    this._controller.pasteToFrame(e, null, actualPoints);
                }
                else {
                    this._controller.pasteToFrame(e, null, null);
                }
            }
            else {
                let frameWidth = window.cvat.player.geometry.frameWidth;
                let frameHeight = window.cvat.player.geometry.frameHeight;
                let rect = window.cvat.translate.box.canvasToActual(this._shapeView.node.getBBox());
                let box = {};
                box.xtl = Math.clamp(rect.x, 0, frameWidth);
                box.ytl = Math.clamp(rect.y, 0, frameHeight);
                box.xbr = Math.clamp(rect.x + rect.width, 0, frameWidth);
                box.ybr = Math.clamp(rect.y + rect.height, 0, frameHeight);

                if ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD) {
                    this._controller.pasteToFrame(e, box, null);
                }
                else {
                    this._controller.pasteToFrame(e, null, null);
                }
            }
        });

        this._frameContent.on('mouseleave.buffer', () => {
            this._shapeView.style('visibility', 'hidden');
        });
    }

    _disableEvents() {
        this._frameContent.off('mousemove.buffer');
        this._frameContent.off('mousedown.buffer');
        this._frameContent.off('mouseleave.buffer');
    }

    onShapeBufferUpdate(buffer) {
        if (buffer.pasteMode) {
            this._shape = buffer.shape;
            this._drawShapeView();
            this._enableEvents();
        }
        else {
            if (this._shapeView) {
                this._disableEvents();
                this._removeShapeView();
            }
        }
    }

    onBufferUpdate(buffer) {
        if (buffer.pasteMode && !this._pasteMode) {
            this._pasteMode = true;
            this._shape = buffer.shape;
            this.enableMouseEvents();
        }
        else if (!buffer.pasteMode) {
            this.disableMouseEvents();
            if (this._viewShape) {
                this._viewShape.remove();
            }
            this._viewShape = null;
            this._shape = null;
            this._pasteMode = false;
        }
    }

    onPlayerUpdate(player) {
        if (!player.ready()) return;
        if (this._shapeView != null && this._shape.type != 'points') {
            this._shapeView.attr('stroke-width', STROKE_WIDTH / player.geometry.scale);
        }
    }
}
