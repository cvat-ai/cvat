/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeBufferModel ShapeBufferController ShapeBufferView */
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

    _makeObject(bbRect, polyPoints, trackedObj) {
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
        object.group_id = 0;
        object.frame = window.cvat.player.frames.current;
        object.attributes = attributes;

        if (this._shape.type === 'box') {
            let box = {};

            box.xtl = Math.max(bbRect.x, 0);
            box.ytl = Math.max(bbRect.y, 0);
            box.xbr = Math.min(bbRect.x + bbRect.width, window.cvat.player.geometry.frameWidth);
            box.ybr = Math.min(bbRect.y + bbRect.height, window.cvat.player.geometry.frameHeight);
            box.occluded = this._shape.position.occluded;
            box.frame = window.cvat.player.frames.current;
            box.z_order = this._collection.zOrder(box.frame).max;


            if (trackedObj) {
                object.shapes = [];
                object.shapes.push(Object.assign(box, {
                    outside: false,
                    attributes: []
                }));
            }
            else {
                Object.assign(object, box);
            }
        }
        else {
            let position = {};

            position.points = polyPoints;
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

    pasteToFrame(bbRect, polyPoints) {
        if (!this._shape.type) {
            return;
        }

        Logger.addEvent(Logger.EventType.pasteObject);
        let object = this._makeObject(bbRect, polyPoints, this._shape.mode === 'interpolation');
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

    propagateToFrames() {
        let numOfFrames = this._propagateFrames;
        if (this._shape.type && Number.isInteger(numOfFrames)) {
            let bbRect = null;
            let polyPoints = null;
            if (this._shape.type === 'box') {
                bbRect = {
                    x: this._shape.position.xtl,
                    y: this._shape.position.ytl,
                    height: this._shape.position.ybr - this._shape.position.ytl,
                    width: this._shape.position.xbr - this._shape.position.xtl,
                };
            }
            else {
                polyPoints = this._shape.position.points;
            }

            let object = this._makeObject(bbRect, polyPoints, false);
            Logger.addEvent(Logger.EventType.propagateObject, {
                count: numOfFrames,
            });

            let addedObjects = [];
            while (numOfFrames > 0 && (object.frame + 1 <= window.cvat.player.frames.stop)) {
                object.frame ++;
                object.z_order = this._collection.zOrder(object.frame).max;
                this._collection.add(object, `annotation_${this._shape.type}`);
                addedObjects.push(this._collection.shapes.slice(-1)[0]);
                numOfFrames --;
            }

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
                    if (this._model.copyToBuffer()) {
                        propagateDialogShowed = true;
                        confirm(`Propagate to ${this._model.propagateFrames} frames. Are you sure?`, () => {
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
            this._model.pasteToFrame(bbRect, polyPoints);
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

        switch (this._shape.type) {
        case 'box': {
            let width = this._shape.position.xbr - this._shape.position.xtl;
            let height = this._shape.position.ybr - this._shape.position.ytl;
            this._shapeView = this._frameContent.rect(width, height)
                .move(this._shape.position.xtl, this._shape.position.ytl)
                .addClass('shapeCreation').attr({
                    'stroke-width': STROKE_WIDTH / scale,
                });
            break;
        }
        case 'polygon':
            this._shapeView = this._frameContent.polygon(this._shape.position.points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'polyline':
            this._shapeView = this._frameContent.polyline(this._shape.position.points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'points':
            this._shapeView = this._frameContent.polyline(this._shape.position.points).addClass('shapeCreation').attr({
                'stroke-width': 0,
            });

            this._shapeViewGroup = this._frameContent.group();
            for (let point of PolyShapeModel.convertStringToNumberArray(this._shape.position.points)) {
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
            let pos = translateSVGPos(this._frameContent.node, e.clientX, e.clientY);
            this._shapeView.style('visibility', '');
            this._moveShapeView(pos);
        });

        this._frameContent.on('mousedown.buffer', (e) => {
            if (e.which != 1) return;
            let rect = this._shapeView.node.getBBox();
            if (this._shape.type != 'box') {
                let points = PolyShapeModel.convertStringToNumberArray(this._shapeView.attr('points'));
                for (let point of points) {
                    point.x = Math.clamp(point.x, 0, window.cvat.player.geometry.frameWidth);
                    point.y = Math.clamp(point.y, 0, window.cvat.player.geometry.frameHeight);
                }
                points = PolyShapeModel.convertNumberArrayToString(points);
                this._controller.pasteToFrame(e, rect, points);
            }
            else {
                this._controller.pasteToFrame(e, rect);
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
