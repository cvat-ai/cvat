/*
 * Copyright (C) 2018-2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeMergerModel ShapeMergerController ShapeMergerView*/

/* global
    Listener:false
    Logger:false
    Mousetrap:false
*/

"use strict";

class ShapeMergerModel extends Listener {
    constructor(collectionModel) {
        super('onShapeMergerUpdate', () => this);
        this._collectionModel = collectionModel;
        this._shapesForMerge = [];
        this._mergeMode = false;
        this._shapeType = null;
    }

    _pushForMerge(shape) {
        if (!this._shapesForMerge.length) {
            this._shapeType = shape.type.split('_')[1];
            this._shapesForMerge.push(shape);
            shape.merge = true;
        }
        else if (shape.type.split('_')[1] == this._shapeType) {
            let idx = this._shapesForMerge.indexOf(shape);
            if (idx != -1) {
                this._shapesForMerge.splice(idx, 1);
                shape.merge = false;
            }
            else {
                this._shapesForMerge.push(shape);
                shape.merge = true;
            }
        }
    }

    start() {
        if (!window.cvat.mode) {
            window.cvat.mode = 'merge';
            this._mergeMode = true;
            this._collectionModel.resetActive();
            this.notify();
        }
    }

    done() {
        if (this._shapesForMerge.length > 1) {
            let shapeDict = {};

            for (let shape of this._shapesForMerge) {
                let keyframes = shape.keyframes;
                for (let keyframe of keyframes) {
                    keyframe = +keyframe;
                    let interpolation = shape.interpolate(keyframe);
                    if (keyframe in shapeDict && !interpolation.position.outside) {
                        shapeDict[keyframe] = {
                            shape: shape,
                            interpolation: interpolation
                        };
                    }
                    else if (!(keyframe in shapeDict)) {
                        shapeDict[keyframe] = {
                            shape: shape,
                            interpolation: interpolation
                        };
                    }
                }
            }

            let sortedFrames = Object.keys(shapeDict).map(x => +x).sort((a,b) => a - b);

            // remove all outside in begin of the track
            while (shapeDict[sortedFrames[0]].interpolation.position.outside) {
                delete shapeDict[sortedFrames[0]];
                sortedFrames.splice(0, 1);
            }

            // if several shapes placed on single frame, do not merge
            if (Object.keys(shapeDict).length <= 1) {
                this.cancel();
                return;
            }

            let label = shapeDict[sortedFrames[0]].shape.label;

            let object = {
                label_id: label,
                group: 0,
                frame: sortedFrames[0],
                attributes: [],
                shapes: [],
            };

            let lastMutableAttr = {};
            let attributes = shapeDict[sortedFrames[0]].interpolation.attributes;
            for (let attrId in attributes) {
                if (!window.cvat.labelsInfo.attrInfo(attrId).mutable) {
                    object.attributes.push({
                        id: attrId,
                        value: attributes[attrId].value,
                    });
                }
                else {
                    lastMutableAttr[attrId] = null;
                }
            }

            for (let frame of sortedFrames) {

                // Not save continiously attributes. Only updates.
                let shapeAttributes = [];
                if (shapeDict[frame].shape.label === label) {
                    let attributes = shapeDict[frame].interpolation.attributes;
                    for (let attrId in attributes) {
                        if (window.cvat.labelsInfo.attrInfo(attrId).mutable) {
                            if (attributes[attrId].value != lastMutableAttr[attrId]) {
                                lastMutableAttr[attrId] = attributes[attrId].value;
                                shapeAttributes.push({
                                    id: attrId,
                                    value: attributes[attrId].value,
                                });
                            }
                        }
                    }
                }

                object.shapes.push(
                    Object.assign(shapeDict[frame].interpolation.position,
                        {
                            frame: frame,
                            attributes: shapeAttributes
                        }
                    )
                );

                // push an outsided box after each annotation box if next frame is empty
                let nextFrame = frame + 1;
                let stopFrame = window.cvat.player.frames.stop;
                let type = shapeDict[frame].shape.type;
                if (type.startsWith('annotation_') && !(nextFrame in shapeDict) && nextFrame <= stopFrame) {
                    let copy = Object.assign({}, object.shapes[object.shapes.length - 1]);
                    copy.outside = true;
                    copy.frame += 1;
                    copy.z_order = 0;
                    copy.attributes = [];
                    object.shapes.push(copy);
                }
            }

            Logger.addEvent(Logger.EventType.mergeObjects, {
                count: this._shapesForMerge.length,
            });

            this._collectionModel.add(object, `interpolation_${this._shapeType}`);
            this._collectionModel.update();

            let model = this._collectionModel.shapes.slice(-1)[0];
            let shapes = this._shapesForMerge;

            // Undo/redo code
            window.cvat.addAction('Merge Objects', () => {
                model.unsubscribe(this._collectionModel);
                model.removed = true;
                for (let shape of shapes) {
                    shape.removed = false;
                    shape.subscribe(this._collectionModel);
                }
                this._collectionModel.update();
            }, () => {
                for (let shape of shapes) {
                    shape.removed = true;
                    shape.unsubscribe(this._collectionModel);
                }
                model.subscribe(this._collectionModel);
                model.removed = false;
            }, window.cvat.player.frames.current);
            // End of undo/redo code

            this.cancel();
            for (let shape of shapes) {
                shape.removed = true;
                shape.unsubscribe(this._collectionModel);
            }
        }
        else {
            this.cancel();
        }
    }

    cancel() {
        if (window.cvat.mode == 'merge') {
            window.cvat.mode = null;
            this._mergeMode = false;

            for (let shape of this._shapesForMerge) {
                shape.merge = false;
            }
            this._shapesForMerge = [];

            this.notify();
        }
    }

    click() {
        if (this._mergeMode) {
            const active = this._collectionModel.selectShape(
                this._collectionModel.lastPosition,
                true,
            );
            if (active) {
                this._pushForMerge(active);
            }
        }
    }

    get mergeMode() {
        return this._mergeMode;
    }
}

class ShapeMergerController {
    constructor(model) {
        this._model = model;

        setupMergeShortkeys.call(this);
        function setupMergeShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchMergeHandler = Logger.shortkeyLogDecorator(function() {
                this.switch();
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_merge_mode"].value, switchMergeHandler.bind(this), 'keydown');
        }
    }

    switch() {
        if (this._model.mergeMode) {
            this._model.done();
        }
        else {
            this._model.start();
        }
    }

    click() {
        this._model.click();
    }
}

class ShapeMergerView {
    constructor(model, controller) {
        this._controller = controller;
        this._frameContent = $('#frameContent');
        this._mergeButton = $('#mergeTracksButton');
        this._mergeButton.on('click', () => controller.switch());

        let shortkeys = window.cvat.config.shortkeys;
        this._mergeButton.attr('title', `
            ${shortkeys['switch_merge_mode'].view_value} - ${shortkeys['switch_merge_mode'].description}`);

        model.subscribe(this);
    }

    onShapeMergerUpdate(shapeMerger) {
        if (shapeMerger.mergeMode) {
            this._mergeButton.text('Apply Merge');
            this._frameContent.on('click.merger', () => {
                this._controller.click();
            });
        }
        else {
            this._frameContent.off('click.merger');
            this._mergeButton.text('Merge Shapes');
        }
    }
}
